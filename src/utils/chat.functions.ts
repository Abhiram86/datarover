// server/chat.ts
import { createServerFn } from "@tanstack/react-start";

export const generalChatStream = createServerFn({ method: "POST" })
  .inputValidator((prompt: unknown) => {
    if (typeof prompt !== "string") throw new Error("Invalid prompt");
    return prompt;
  })
  .handler(async function* ({ data }) {
    yield ""; // Flush headers - this is allowed here in the generator

    const response = await fetch(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "z-ai/glm4.7",
          messages: [{ role: "user", content: data }],
          stream: true,
        }),
      },
    );

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    // Buffers for batching
    let reasoningBatch = "";
    let contentBatch = "";
    let lastFlush = Date.now();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta;

            if (delta?.reasoning_content) {
              reasoningBatch += delta.reasoning_content;
            }
            if (delta?.content) {
              contentBatch += delta.content;
            }

            // Inline flush logic - check if 50ms passed
            const now = Date.now();
            if (now - lastFlush > 50) {
              if (reasoningBatch) {
                yield JSON.stringify({
                  type: "reasoning",
                  text: reasoningBatch,
                });
                reasoningBatch = "";
              }
              if (contentBatch) {
                yield JSON.stringify({ type: "content", text: contentBatch });
                contentBatch = "";
              }
              lastFlush = now;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Final flush - yield any remaining content
    if (reasoningBatch) {
      yield JSON.stringify({ type: "reasoning", text: reasoningBatch });
    }
    if (contentBatch) {
      yield JSON.stringify({ type: "content", text: contentBatch });
    }
  });
