import { useCallback } from "react";
import { generalChatStream } from "@/utils/chat.functions";
import { useSandboxStore } from "@/store/sandbox";
import { ToolCall } from "@/types";
import OpenAI from "openai";

interface StreamResult {
  reasoning: string;
  content: string;
  promptTokens: number;
  completionTokens: number;
  toolCalls: ToolCall[];
}

type ToolCallEvent = {
  type: "tool_call";
  id: string;
  name: string;
  arguments: string;
};

type StreamEvent =
  | { type: "reasoning"; text: string }
  | { type: "content"; text: string }
  | { type: "usage"; prompt_tokens: number; completion_tokens: number }
  | ToolCallEvent;

interface AddStreamMessage {
  (data: { type: "reasoning" | "content"; text: string }): void;
  (data: { type: "tool_call"; tool: ToolCall }): void;
}

export function useChatStream(addStreamMessage: AddStreamMessage) {
  const runPython = useSandboxStore((s) => s.runPythonSafe);

  async function runToolLocally(name: string, args: any): Promise<{
    ok: boolean;
    result?: unknown;
    error?: unknown;
    consoleOutput?: string[];
  }> {
    switch (name) {
      case "run_python":
        return await runPython(args.code);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  const readChatStream = useCallback(
    async (prompt: string): Promise<StreamResult> => {
      let messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "user", content: prompt },
      ];

      let finalReasoning = "";
      let finalContent = "";
      let promptTokens = 0;
      let completionTokens = 0;
      let allToolCalls: ToolCall[] = [];

      async function streamOnce(): Promise<{
        toolCalls: ToolCallEvent[];
      }> {
        const stream = await generalChatStream({ data: { messages } });

        let reasoningBuffer = "";
        let contentBuffer = "";
        let frameId: number | null = null;
        let incompleteChunk = "";
        let detectedToolCalls: ToolCallEvent[] = [];

        const flush = () => {
          if (reasoningBuffer) {
            addStreamMessage({ type: "reasoning", text: reasoningBuffer });
            finalReasoning += reasoningBuffer;
            reasoningBuffer = "";
          }
          if (contentBuffer) {
            addStreamMessage({ type: "content", text: contentBuffer });
            finalContent += contentBuffer;
            contentBuffer = "";
          }
          frameId = null;
        };

        for await (const chunk of stream) {
          const fullChunk = incompleteChunk + chunk;
          const lines = fullChunk.split("\n");
          incompleteChunk = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;

            const parsed = JSON.parse(line) as StreamEvent;

            switch (parsed.type) {
              case "reasoning":
                reasoningBuffer += parsed.text;
                break;

              case "content":
                contentBuffer += parsed.text;
                break;

              case "tool_call":
                detectedToolCalls.push(parsed);
                addStreamMessage({
                  type: "tool_call",
                  tool: {
                    id: parsed.id,
                    name: parsed.name,
                    arguments: parsed.arguments,
                  },
                });
                break;

              case "usage":
                promptTokens = parsed.prompt_tokens ?? 0;
                completionTokens = parsed.completion_tokens ?? 0;
                break;
            }
          }

          if (!frameId) {
            frameId = requestAnimationFrame(flush);
          }
        }

        if (frameId) cancelAnimationFrame(frameId);
        flush();

        return { toolCalls: detectedToolCalls };
      }

      let loopCount = 0;
      const MAX_LOOP = 10;

      while (loopCount < MAX_LOOP) {
        loopCount++;

        const { toolCalls } = await streamOnce();

        if (toolCalls.length === 0) {
          break;
        }

        for (const toolCall of toolCalls) {
          if (!toolCall.arguments?.trim()) {
            throw new Error("Tool call arguments empty");
          }

          let args;
          try {
            args = JSON.parse(toolCall.arguments);
          } catch {
            throw new Error("Tool call arguments invalid JSON");
          }

          const toolResult = await runToolLocally(toolCall.name, args);

          const toolCallWithResult: ToolCall = {
            id: toolCall.id,
            name: toolCall.name,
            arguments: toolCall.arguments,
            result: JSON.stringify({
              ok: toolResult.ok,
              result: toolResult.result,
              error: toolResult.error,
              consoleOutput: toolResult.consoleOutput || [],
            }),
          };
          allToolCalls.push(toolCallWithResult);

          messages.push({
            role: "assistant",
            tool_calls: [
              {
                id: toolCall.id,
                type: "function",
                function: {
                  name: toolCall.name,
                  arguments: toolCall.arguments,
                },
              },
            ],
          });

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });
        }
      }

      return {
        reasoning: finalReasoning,
        content: finalContent,
        promptTokens,
        completionTokens,
        toolCalls: allToolCalls,
      };
    },
    [addStreamMessage],
  );

  return readChatStream;
}
