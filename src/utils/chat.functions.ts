import OpenAI from "openai";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { db } from "./db.server";
import { conversationsTable, messagesTable } from "@/db/schema";
import { systemPrompt } from "@/lib/systemPrompt";
import { eq, or } from "drizzle-orm";
import { getCurrentUserFromCookie } from "./jwt.server";
import { tools } from "@/tools/runpython";

const client = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY,
});

export const generalChatStream = createServerFn({ method: "POST" })
  .inputValidator((body: unknown) => {
    if (typeof body !== "object" || body === null || !("messages" in body)) {
      throw new Error("Invalid request body");
    }
    return body as {
      messages: OpenAI.Chat.ChatCompletionMessageParam[];
    };
  })
  .handler(async function* ({ data }) {
    const { messages } = data;

    const completion = await client.chat.completions.create({
      model: "z-ai/glm4.7",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      tools,
      tool_choice: "auto",
      stream: true,
      stream_options: { include_usage: true },
      temperature: 1,
      top_p: 1,
      max_tokens: 16384,
    });

    let reasoningBatch = "";
    let contentBatch = "";
    let lastFlush = Date.now();

    let promptTokens = 0;
    let completionTokens = 0;

    const toolCalls: Record<
      number,
      {
        id: string;
        name: string;
        arguments: string;
      }
    > = {};

    try {
      for await (const chunk of completion) {
        if (!chunk.choices || chunk.choices.length === 0) {
          if (chunk.usage) {
            promptTokens = chunk.usage.prompt_tokens ?? 0;
            completionTokens = chunk.usage.completion_tokens ?? 0;
          }
          continue;
        }

        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        const reasoning = (delta as { reasoning_content?: string })
          .reasoning_content;
        if (reasoning) reasoningBatch += reasoning;

        if (delta.content) contentBatch += delta.content;

        if (delta.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            const index = toolCall.index;
            if (index === undefined || index === null) continue;

            if (!toolCalls[index]) {
              toolCalls[index] = {
                id: toolCall.id ?? `call_${index}`,
                name: toolCall.function?.name ?? "",
                arguments: "",
              };
            } else if (toolCall.id) {
              toolCalls[index].id = toolCall.id;
            }

            if (toolCall.function?.name) {
              toolCalls[index].name = toolCall.function.name;
            }

            if (toolCall.function?.arguments) {
              toolCalls[index].arguments += toolCall.function.arguments;
            }
          }
        }

        const now = Date.now();
        if (now - lastFlush > 100) {
          if (reasoningBatch) {
            yield JSON.stringify({ type: "reasoning", text: reasoningBatch }) +
              "\n";
            reasoningBatch = "";
          }
          if (contentBatch) {
            yield JSON.stringify({ type: "content", text: contentBatch }) +
              "\n";
            contentBatch = "";
          }

          for (const [index, call] of Object.entries(toolCalls)) {
            const rawArgs = call.arguments ?? "";
            if (!rawArgs.trim()) continue;
            try {
              JSON.parse(rawArgs);
              yield JSON.stringify({
                type: "tool_call",
                id: call.id,
                name: call.name,
                arguments: rawArgs,
              }) + "\n";
              delete toolCalls[parseInt(index)];
            } catch {}
          }

          lastFlush = now;
        }
      }
    } finally {
      if (reasoningBatch) {
        yield JSON.stringify({ type: "reasoning", text: reasoningBatch }) +
          "\n";
      }
      if (contentBatch) {
        yield JSON.stringify({ type: "content", text: contentBatch }) + "\n";
      }

      for (const call of Object.values(toolCalls)) {
        const rawArgs = call.arguments ?? "";
        if (!rawArgs || !rawArgs.trim()) {
          yield JSON.stringify({
            type: "tool_call_error",
            id: call.id,
            name: call.name,
            raw_arguments: rawArgs,
            reason: "empty_arguments",
          }) + "\n";
          continue;
        }

        try {
          JSON.parse(rawArgs);
          yield JSON.stringify({
            type: "tool_call",
            id: call.id,
            name: call.name,
            arguments: rawArgs,
          }) + "\n";
        } catch (err) {
          yield JSON.stringify({
            type: "tool_call_error",
            id: call.id,
            name: call.name,
            raw_arguments: rawArgs,
            reason: "invalid_json",
            error_message: String(err),
          }) + "\n";
        }
      }

      yield JSON.stringify({
        type: "usage",
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
      }) + "\n";
    }
  });

const newConversationSchema = z.object({
  workspace_id: z.string(),
  title: z.string(),
});

export const newConversation = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    const parsed = newConversationSchema.safeParse(data);
    return parsed;
  })
  .handler(async ({ data }) => {
    if (data.error) {
      console.error(data.error);
      throw new Error("Invalid conversation data");
    }
    const { workspace_id, title } = data.data;
    try {
      const conversation = await db
        .insert(conversationsTable)
        .values({
          workspace_id: workspace_id,
          title: title,
        })
        .returning();
      return {
        success: true,
        data: conversation[0],
      };
    } catch (error) {
      console.error(error);
      throw new Error("Error creating conversation");
    }
  });

const toolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  arguments: z.string(),
  result: z.string().optional(),
});

const newMessageSchema = z.array(
  z.object({
    workspace_id: z.string(),
    conversation_id: z.string(),
    role: z.enum(["user", "assistant", "tool"]),
    content: z.string(),
    reasoning: z.string().optional(),
    is_complete: z.boolean().optional(),
    prompt_tokens: z.number().optional(),
    completion_tokens: z.number().optional(),
    tool_calls: z.array(toolCallSchema).optional(),
  }),
);

export const newMessage = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    const parsed = newMessageSchema.safeParse(data);
    return parsed;
  })
  .handler(async ({ data }) => {
    if (data.error) {
      return { success: false, error: data.error.message };
    }
    try {
      const messages = await db
        .insert(messagesTable)
        .values(data.data)
        .returning();
      return {
        success: true,
        data: messages,
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error:
          error instanceof Error
            ? { message: error.message }
            : { message: "Unknown error" },
      };
    }
  });

export const getConversation = createServerFn({ method: "GET" })
  .inputValidator((id: unknown) => {
    if (typeof id !== "string") throw new Error("Invalid conversation ID");
    return id;
  })
  .handler(async ({ data }) => {
    const user = getCurrentUserFromCookie();
    if (!user) {
      return {
        success: false,
        error: { message: "Unauthorized" },
      };
    }
    try {
      const conversation = await db
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.workspace_id, data));
      return {
        success: true,
        data: conversation[0],
      };
    } catch (error) {
      console.error(error);
      throw new Error("Error retrieving conversation");
    }
  });

export const getMessages = createServerFn({ method: "GET" })
  .inputValidator((id: unknown) => {
    if (typeof id !== "string")
      throw new Error("Invalid conversation/workspace ID");
    return id;
  })
  .handler(async ({ data }) => {
    const user = getCurrentUserFromCookie();
    if (!user) {
      return {
        success: false,
        error: { message: "Unauthorized" },
      };
    }
    try {
      const messages = await db
        .select()
        .from(messagesTable)
        .where(
          or(
            eq(messagesTable.conversation_id, data),
            eq(messagesTable.workspace_id, data),
          ),
        )
        .orderBy(messagesTable.created_at);
      return {
        success: true,
        data: messages,
      };
    } catch (error) {
      console.error(error);
      throw new Error("Error retrieving messages");
    }
  });
