import OpenAI from "openai";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { db } from "./db.server";
import { conversationsTable, messagesTable } from "@/db/schema";
import { systemPrompt } from "@/lib/systemPrompt";
import { eq, or } from "drizzle-orm";
import { getCurrentUserFromCookie } from "./jwt.server";

const client = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY,
});

export const generalChatStream = createServerFn({ method: "POST" })
  .inputValidator((prompt: unknown) => {
    if (typeof prompt !== "string") throw new Error("Invalid prompt");
    return prompt;
  })
  .handler(async function* ({ data }) {
    // REMOVE the initial yield "" - this causes issues
    // yield "";

    const completion = await client.chat.completions.create({
      model: "z-ai/glm4.7",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: data },
      ],
      stream: true,
      temperature: 1,
      top_p: 1,
      max_tokens: 16384,
    } as OpenAI.Chat.ChatCompletionCreateParamsStreaming & {
      extra_body: {
        chat_template_kwargs: {
          enable_thinking: boolean;
          clear_thinking: boolean;
        };
      };
    });

    let reasoningBatch = "";
    let contentBatch = "";
    let lastFlush = Date.now();

    try {
      for await (const chunk of completion) {
        if (!chunk.choices || chunk.choices.length === 0) continue;

        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        const reasoning = (delta as { reasoning_content?: string })
          .reasoning_content;
        if (reasoning) {
          reasoningBatch += reasoning;
        }
        if (delta.content) {
          contentBatch += delta.content;
        }

        const now = Date.now();
        if (now - lastFlush > 100) {
          if (reasoningBatch) {
            yield JSON.stringify({ type: "reasoning", text: reasoningBatch }) +
              "\n"; // Add newline delimiter
            reasoningBatch = "";
          }
          if (contentBatch) {
            yield JSON.stringify({ type: "content", text: contentBatch }) +
              "\n"; // Add newline delimiter
            contentBatch = "";
          }
          lastFlush = now;
        }
      }
    } finally {
      // Final flush
      if (reasoningBatch) {
        yield JSON.stringify({ type: "reasoning", text: reasoningBatch }) +
          "\n";
      }
      if (contentBatch) {
        yield JSON.stringify({ type: "content", text: contentBatch }) + "\n";
      }
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
