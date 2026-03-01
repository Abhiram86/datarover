import { createServerFn } from "@tanstack/react-start";
import { streamText, tool, type ToolSet } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import { db } from "./db.server";
import { conversationsTable, messagesTable } from "@/db/schema";
import { systemPrompt } from "@/lib/systemPrompt";
import { eq, or } from "drizzle-orm";
import { getCurrentUserFromCookie } from "./jwt.server";
import { ToolResult } from "@/types";

// Configure NVIDIA provider via OpenAI-compatible client
const nvidia = createOpenAICompatible({
  name: "nvidia",
  baseURL: "https://integrate.api.nvidia.com/v1",
  headers: {
    Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
  },
});

// Tool definitions using AI SDK 6 pattern
const tools: ToolSet = {
  run_python: tool({
    description:
      "Execute Python code in a browser-based sandbox. Use for data analysis and transformations.",
    inputSchema: z.object({
      code: z.string().describe("Python code to execute"),
      description: z
        .string()
        .optional()
        .describe(
          "Brief explanation of what the code does. Recommended for operations that modify data or create new variables. Optional for read-only operations (analysis, visualization).",
        ),
    }),
    execute: async () => ({
      ok: true,
      message: "Tool execution handled client-side",
    }),
  }),

  run_duckdb: tool({
    description:
      "Manipulate and query dataset using DuckDB. Use this for data analysis, transformations, and calculations.",
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          "DuckDB query to execute. Can include CREATE TABLE, INSERT, SELECT, and any valid DuckDB syntax.",
        ),
      description: z
        .string()
        .optional()
        .describe(
          "Brief explanation of what the query does. Recommended for mutations (INSERT, UPDATE, DELETE, CREATE, DROP, ALTER) to inform the user and provide context. Optional for read-only queries (SELECT).",
        ),
    }),
    execute: async () => ({
      ok: true,
      message: "Tool execution handled client-side",
    }),
  }),

  search_web: tool({
    description: "Search the web for current information and news.",
    inputSchema: z.object({
      query: z.string().describe("Search query"),
      num_results: z.number().optional().default(5),
    }),
    execute: async ({
      query,
      num_results,
    }: {
      query: string;
      num_results: number;
    }) => {
      try {
        const response = await fetch(
          `https://api.duckduckgo.com/?q=${encodeURIComponent(
            query,
          )}&format=json`,
          { headers: { Accept: "application/json" } },
        );
        const data = await response.json();
        return {
          ok: true,
          result: {
            query,
            abstract: data.Abstract || "",
            results:
              data.RelatedTopics?.slice(0, num_results).map(
                (t: { Text?: string; FirstURL?: string }) => ({
                  title: t.Text?.split(" - ")[0] || "",
                  snippet: t.Text || "",
                  url: t.FirstURL || "",
                }),
              ) || [],
          },
        };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Search failed",
        };
      }
    },
  }),

  fetch_url: tool({
    description: "Fetch content from a URL. Use for reading articles and docs.",
    inputSchema: z.object({
      url: z.string().describe("URL to fetch"),
    }),
    execute: async ({ url }: { url: string }) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          return {
            ok: false,
            error: `HTTP ${response.status}`,
          };
        }
        const html = await response.text();
        const text = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 10000);
        return {
          ok: true,
          result: { url, content: text },
        };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Fetch failed",
        };
      }
    },
  }),

  read_insights: tool({
    description: `Read insights from workspace memory. Use this to recall previous findings, user goals, or important context.`,
    inputSchema: z.object({
      type: z
        .enum(["important", "general", "user_goals"])
        .optional()
        .describe("Type of insights to read. Omit to get all types."),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("Maximum number of insights to return (default: 10)"),
      id: z.number().optional().describe("Specific insight ID to retrieve"),
    }),
    execute: async () => ({
      ok: true,
      message: "Tool execution handled client-side",
    }),
  }),

  write_insight: tool({
    description: `Write an insight to workspace memory. Use this to preserve findings across conversations.`,
    inputSchema: z.object({
      type: z
        .enum(["important", "general", "user_goals"])
        .describe(
          "REQUIRED. The insight category. Must be exactly: 'important', 'general', or 'user_goals'. Use 'type' NOT 'category'.",
        ),
      context: z
        .string()
        .describe(
          "REQUIRED. The insight content/text to save. Use 'context' NOT 'content'. Be concise but specific.",
        ),
      source: z
        .string()
        .optional()
        .describe(
          "Source of the insight (e.g., 'correlation analysis', 'user request')",
        ),
      id: z
        .number()
        .optional()
        .describe("Existing insight ID to update. Omit to create new."),
    }),
    execute: async () => ({
      ok: true,
      message: "Tool execution handled client-side",
    }),
  }),

  delete_insight: tool({
    description: `Delete an insight from workspace memory. Use this when an insight is incorrect, outdated, or no longer relevant.`,
    inputSchema: z.object({
      type: z
        .enum(["important", "general", "user_goals"])
        .describe("Type/category of the insight"),
      id: z.number().describe("ID of the insight to delete"),
    }),
    execute: async () => ({
      ok: true,
      message: "Tool execution handled client-side",
    }),
  }),
};

// Define message type for the API
interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
      description?: string; // Short 1-2 line description for UI display
    };
  }>;
  // AI SDK internals - not displayed in UI but required for tool result linking
  tool_call_id?: string;
  tool_name?: string;
}

// AI SDK message types
type SdkToolOutput =
  | {
      type: "json";
      value:
        | Record<string, unknown>
        | unknown[]
        | string
        | number
        | boolean
        | null;
    }
  | { type: "text"; value: string };

interface SdkMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string | Array<unknown>;
}

function parseToolOutput(content: string): SdkToolOutput {
  try {
    const parsedContent = JSON.parse(content) as
      | Record<string, unknown>
      | unknown[]
      | string
      | number
      | boolean
      | null;
    return {
      type: "json",
      value: parsedContent,
    };
  } catch {
    return {
      type: "text",
      value: content,
    };
  }
}

function convertToolMessage(msg: ChatMessage, index: number): SdkMessage {
  if (!msg.tool_call_id) {
    console.warn(`Message ${index}: Tool message missing tool_call_id`);
  }

  const toolOutput = parseToolOutput(msg.content);

  return {
    role: "tool",
    content: [
      {
        type: "tool-result",
        toolCallId: msg.tool_call_id || `call_${index}`,
        toolName: msg.tool_name || "unknown",
        output: toolOutput,
      },
    ],
  };
}

function convertAssistantMessage(msg: ChatMessage): SdkMessage {
  const contentParts: Array<
    | { type: "text"; text: string }
    | {
        type: "tool-call";
        toolCallId: string;
        toolName: string;
        input: unknown;
      }
  > = [];

  if (msg.content) {
    contentParts.push({ type: "text", text: msg.content });
  }

  msg.tool_calls?.forEach((tc) => {
    try {
      const input = JSON.parse(tc.function?.arguments || "{}");
      contentParts.push({
        type: "tool-call",
        toolCallId: tc.id,
        toolName: tc.function?.name || "unknown",
        input,
      });
    } catch {
      contentParts.push({
        type: "tool-call",
        toolCallId: tc.id,
        toolName: tc.function?.name || "unknown",
        input: {},
      });
    }
  });

  return {
    role: "assistant",
    content: contentParts,
  };
}

function convertRegularMessage(msg: ChatMessage): SdkMessage {
  const msgRole = msg.role;
  if (msgRole === "user" || msgRole === "assistant" || msgRole === "system") {
    return {
      role: msgRole,
      content: msg.content || "",
    };
  }
  return {
    role: "user",
    content: msg.content || "",
  };
}

function convertToSdkMessages(messages: ChatMessage[]): SdkMessage[] {
  return messages.map((msg, index) => {
    try {
      if (msg.role === "tool") {
        return convertToolMessage(msg, index);
      }

      if (
        msg.role === "assistant" &&
        msg.tool_calls &&
        msg.tool_calls.length > 0
      ) {
        return convertAssistantMessage(msg);
      }

      return convertRegularMessage(msg);
    } catch (err) {
      console.error(`Error converting message ${index}:`, err, msg);
      return {
        role: "user" as const,
        content: msg.content || "",
      };
    }
  });
}

async function* handleStreamChunk(chunk: {
  type: string;
  text?: string;
  toolCallId?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  error?: unknown;
}): AsyncGenerator<string> {
  switch (chunk.type) {
    case "text-delta":
      yield JSON.stringify({
        type: "content",
        text: chunk.text,
      }) + "\n";
      break;

    case "reasoning-start":
      yield JSON.stringify({
        type: "reasoning-start",
      }) + "\n";
      break;

    case "reasoning-delta":
      yield JSON.stringify({
        type: "reasoning",
        text: (chunk as { text?: string }).text || "",
      }) + "\n";
      break;

    case "reasoning-end":
      yield JSON.stringify({
        type: "reasoning-end",
      }) + "\n";
      break;

    case "tool-call":
      yield JSON.stringify({
        type: "tool_call",
        id: chunk.toolCallId,
        name: chunk.toolName,
        arguments: JSON.stringify(chunk.input),
      }) + "\n";
      break;

    case "tool-result":
      yield JSON.stringify({
        type: "tool_result",
        id: chunk.toolCallId,
        result: chunk.output,
      }) + "\n";
      break;

    case "error":
      yield JSON.stringify({
        type: "error",
        error: String(chunk.error),
      }) + "\n";
      break;
  }
}

async function* sendFinalStats(result: {
  usage: PromiseLike<{ inputTokens?: number; outputTokens?: number }>;
  finishReason: PromiseLike<string | undefined>;
}): AsyncGenerator<string> {
  const usage = await result.usage;
  yield JSON.stringify({
    type: "usage",
    prompt_tokens: usage?.inputTokens ?? 0,
    completion_tokens: usage?.outputTokens ?? 0,
  }) + "\n";

  const finishReason = await result.finishReason;
  yield JSON.stringify({
    type: "finish",
    reason: finishReason,
  }) + "\n";
}

/**
 * Stream chat completion with tool support
 */
export const generalChatStream = createServerFn({ method: "POST" })
  .inputValidator((body: unknown) => {
    if (
      typeof body !== "object" ||
      body === null ||
      !("messages" in body) ||
      !Array.isArray((body as { messages: unknown }).messages)
    ) {
      throw new Error("Invalid request body: messages array required");
    }
    return body as { messages: ChatMessage[] };
  })
  .handler(async function* ({ data }) {
    const { messages } = data;
    const CONTEXT_WINDOW_LIMIT = 30;

    try {
      const sdkMessages = convertToSdkMessages(messages);
      const messagesForAPI =
        sdkMessages.length > CONTEXT_WINDOW_LIMIT
          ? [sdkMessages[0], ...sdkMessages.slice(-CONTEXT_WINDOW_LIMIT + 1)]
          : sdkMessages;

      const result = streamText({
        model: nvidia("z-ai/glm4.7"),
        system: systemPrompt,
        messages: messagesForAPI as any,
        tools,
        toolChoice: "auto",
        temperature: 1,
      });

      for await (const chunk of result.fullStream) {
        yield* handleStreamChunk(
          chunk as {
            type: string;
            text?: string;
            toolCallId?: string;
            toolName?: string;
            input?: unknown;
            output?: unknown;
            error?: unknown;
          },
        );
      }

      yield* sendFinalStats(result);
    } catch (error) {
      console.error("[Chat Stream] Error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Stream failed";
      yield JSON.stringify({
        type: "error",
        error: errorMessage,
      }) + "\n";
    }
  });

// Schema for conversation creation
const newConversationSchema = z.object({
  workspace_id: z.string(),
  title: z.string(),
});

export const newConversation = createServerFn({ method: "POST" })
  .inputValidator((data) => newConversationSchema.safeParse(data))
  .handler(async ({ data }) => {
    if (!data.success) {
      throw new Error("Invalid conversation data: " + data.error.message);
    }

    try {
      const [conversation] = await db
        .insert(conversationsTable)
        .values({
          workspace_id: data.data.workspace_id,
          title: data.data.title,
        })
        .returning();

      return {
        success: true as const,
        data: conversation,
      };
    } catch (error) {
      console.error("Create conversation error:", error);
      throw new Error("Error creating conversation");
    }
  });

const toolResultSchema: z.ZodType<ToolResult> = z.union([
  z.object({
    type: z.literal("text"),
    value: z.string(),
    consoleOutput: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal("image"),
    images: z.array(z.object({ name: z.string(), url: z.string() })),
    consoleOutput: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal("other"),
    error: z.string().optional(),
    value: z.record(z.string(), z.any()).optional(),
    consoleOutput: z.array(z.string()).optional(),
  }),
]);

const toolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  arguments: z.string(),
  description: z.string().optional(),
  result: toolResultSchema.optional(),
});

// Schema for message creation
const newMessageSchema = z.array(
  z.object({
    workspace_id: z.string(),
    conversation_id: z.string(),
    role: z.enum(["user", "assistant", "system", "tool"]),
    content: z.string(),
    reasoning: z.string().nullable().optional(),
    is_complete: z.boolean().optional(),
    prompt_tokens: z.number().nullable().optional(),
    completion_tokens: z.number().nullable().optional(),
    tool_calls: z.array(toolCallSchema).nullable().optional(),
  }),
);

export const newMessage = createServerFn({ method: "POST" })
  .inputValidator((data) => newMessageSchema.safeParse(data))
  .handler(async ({ data }) => {
    if (!data.success) {
      return {
        success: false as const,
        error: data.error.message,
      };
    }

    try {
      const messages = await db
        .insert(messagesTable)
        .values(data.data)
        .returning();

      return {
        success: true as const,
        data: messages,
      };
    } catch (error) {
      console.error("Create message error:", error);
      return {
        success: false as const,
        error:
          error instanceof Error ? error.message : "Failed to save message",
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
        success: false as const,
        error: "Unauthorized",
      };
    }

    try {
      const [conversation] = await db
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.workspace_id, data));

      return {
        success: true as const,
        data: conversation,
      };
    } catch (error) {
      console.error("Get conversation error:", error);
      throw new Error("Error retrieving conversation");
    }
  });

export const getMessages = createServerFn({ method: "GET" })
  .inputValidator((id: unknown) => {
    if (typeof id !== "string") throw new Error("Invalid ID");
    return id;
  })
  .handler(async ({ data }) => {
    const user = getCurrentUserFromCookie();
    if (!user) {
      return {
        success: false as const,
        error: "Unauthorized",
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
        success: true as const,
        data: messages,
      };
    } catch (error) {
      console.error("Get messages error:", error);
      throw new Error("Error retrieving messages");
    }
  });
