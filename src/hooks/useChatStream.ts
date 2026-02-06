import { useCallback } from "react";
import { generalChatStream } from "@/utils/chat.functions";

interface StreamResult {
  reasoning: string;
  content: string;
  promptTokens: number;
  completionTokens: number;
}

interface AddStreamMessage {
  (data: { type: "reasoning" | "content"; text: string }): void;
}

export function useChatStream(addStreamMessage: AddStreamMessage) {
  const readChatStream = useCallback(
    async (prompt: string): Promise<StreamResult> => {
      const stream = await generalChatStream({ data: prompt });

      let reasoningBuffer = "";
      let contentBuffer = "";
      let frameId: number | null = null;

      let fullReasoning = "";
      let fullContent = "";
      let promptTokens = 0;
      let completionTokens = 0;
      let incompleteChunk = "";

      const flush = () => {
        if (reasoningBuffer) {
          addStreamMessage({ type: "reasoning", text: reasoningBuffer });
          reasoningBuffer = "";
        }
        if (contentBuffer) {
          addStreamMessage({ type: "content", text: contentBuffer });
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

          try {
            const parsed = JSON.parse(line);

            if (parsed.type === "reasoning") {
              reasoningBuffer += parsed.text;
              fullReasoning += parsed.text;
            } else if (parsed.type === "content") {
              contentBuffer += parsed.text;
              fullContent += parsed.text;
            } else if (parsed.type === "usage") {
              promptTokens = parsed.prompt_tokens ?? 0;
              completionTokens = parsed.completion_tokens ?? 0;
            }
          } catch (e) {
            console.error("Failed to parse line:", line, e);
          }
        }

        if (!frameId) {
          frameId = requestAnimationFrame(flush);
        }
      }

      if (incompleteChunk.trim()) {
        try {
          const parsed = JSON.parse(incompleteChunk);
          if (parsed.type === "reasoning") {
            reasoningBuffer += parsed.text;
            fullReasoning += parsed.text;
          } else if (parsed.type === "content") {
            contentBuffer += parsed.text;
            fullContent += parsed.text;
          } else if (parsed.type === "usage") {
            promptTokens = parsed.prompt_tokens ?? 0;
            completionTokens = parsed.completion_tokens ?? 0;
          }
        } catch (e) {
          console.error("Failed to parse final chunk:", incompleteChunk, e);
        }
      }

      if (frameId) cancelAnimationFrame(frameId);
      flush();

      return {
        reasoning: fullReasoning,
        content: fullContent,
        promptTokens,
        completionTokens,
      };
    },
    [addStreamMessage],
  );

  return readChatStream;
}
