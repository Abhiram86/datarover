import { useConversationStore } from "@/store/conversation";
import { generalChatStream } from "@/utils/chat.functions";
import { ArrowUpIcon, Paperclip } from "lucide-react";
import React, { useState, useRef, useEffect, useCallback } from "react";

export const PromptBox = React.memo(() => {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const addMessage = useConversationStore((s) => s.addMessage);
  const addStreamMessage = useConversationStore((s) => s.addStreamMessage);

  // Auto-resize logic
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [input]);

  const readChatStream = useCallback(
    async (prompt: string) => {
      const stream = await generalChatStream({ data: prompt });

      let reasoningBuffer = "";
      let contentBuffer = "";
      let frameId: number | null = null;

      const flush = () => {
        // Update store with both reasoning and content
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
        try {
          const parsed = JSON.parse(chunk);

          if (parsed.type === "reasoning") {
            reasoningBuffer += parsed.text;
          } else if (parsed.type === "content") {
            contentBuffer += parsed.text;
          }
        } catch (e) {
          // Fallback: if not JSON, treat as plain content
          contentBuffer += chunk;
        }

        // Schedule update at most once per frame
        if (!frameId) {
          frameId = requestAnimationFrame(flush);
        }
      }

      // Final flush
      if (frameId) cancelAnimationFrame(frameId);
      flush();
    },
    [addStreamMessage],
  );

  const handleSubmit = useCallback(async () => {
    if (!input.trim()) return;

    const prompt = input;
    setInput("");

    addMessage({
      id: crypto.randomUUID(),
      conversationId: "1",
      role: "user",
      content: prompt,
      createdAt: new Date(),
      promptTokens: 0,
    });

    // create assistant placeholder once
    addMessage({
      id: crypto.randomUUID(),
      conversationId: "1",
      role: "assistant",
      content: "",
      createdAt: new Date(),
      completionTokens: 0,
      isComplete: false,
    });

    await readChatStream(prompt);
  }, [input, addMessage, readChatStream]);

  return (
    <div className="p-4 bg-primary border-t border-neutral-strong/10">
      <div className="relative flex items-end gap-2 bg-neutral-strong/5 rounded-xl border border-neutral-strong/10 p-2 focus-within:border-neutral-strong/20 transition-all">
        <button className="p-2 text-neutral-strong/40 hover:text-neutral-strong/80 transition-colors">
          <Paperclip size={18} />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm py-2 resize-none max-h-30 overflow-y-auto 
    /* Custom Scrollbar Styles */
    scrollbar-thin 
    [&::-webkit-scrollbar]:w-1.5
    [&::-webkit-scrollbar-track]:bg-transparent
    [&::-webkit-scrollbar-thumb]:bg-neutral-strong/20
    [&::-webkit-scrollbar-thumb]:rounded-full
    hover:[&::-webkit-scrollbar-thumb]:bg-neutral-strong/40"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />

        <button
          onClick={handleSubmit}
          disabled={!input.trim()}
          className="p-2 bg-neutral-strong text-primary rounded-lg disabled:opacity-30 hover:opacity-90 transition-all"
        >
          <ArrowUpIcon size={18} />
        </button>
      </div>
      <p className="text-[10px] text-center mt-2 text-neutral-strong/30">
        Press Enter to send, Shift + Enter for new line
      </p>
    </div>
  );
});
