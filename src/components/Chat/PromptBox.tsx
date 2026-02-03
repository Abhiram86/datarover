import { useConversationStore } from "@/store/conversation";
import {
  generalChatStream,
  newConversation,
  newMessage,
} from "@/utils/chat.functions";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpIcon, Paperclip } from "lucide-react";
import React, { useState, useRef, useEffect, useCallback } from "react";
import toast from "react-hot-toast";

export const PromptBox = React.memo(
  ({ workspaceId }: { workspaceId: string }) => {
    const [input, setInput] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const converation = useConversationStore((s) => s.conversation);
    const addMessage = useConversationStore((s) => s.addMessage);
    const addStreamMessage = useConversationStore((s) => s.addStreamMessage);
    const newConvo = useServerFn(newConversation);
    const addMessageServer = useServerFn(newMessage);

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

        let fullReasoning = "";
        let fullContent = "";

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
              fullReasoning += parsed.text;
            } else if (parsed.type === "content") {
              contentBuffer += parsed.text;
              fullContent += parsed.text;
            }
          } catch (e) {
            // Fallback: if not JSON, treat as plain content
            contentBuffer += chunk;
            fullContent += chunk;
          }

          // Schedule update at most once per frame
          if (!frameId) {
            frameId = requestAnimationFrame(flush);
          }
        }

        // Final flush
        if (frameId) cancelAnimationFrame(frameId);
        flush();

        return {
          reasoning: fullReasoning,
          content: fullContent,
        };
      },
      [addStreamMessage],
    );

    const handleSubmit = useCallback(async () => {
      if (!input.trim()) return;
      const prompt = input;
      setInput("");
      let conversation_id = converation?.id;
      try {
        if (!converation) {
          const resp = await newConvo({
            data: { workspace_id: workspaceId, title: "New Conversation" },
          });
          useConversationStore.getState().setConversations(resp.data);
          conversation_id = resp.data.id;
        }
        try {
          const userMessage = {
            workspace_id: workspaceId,
            conversation_id: conversation_id,
            role: "user",
            content: prompt,
            prompt_tokens: 0,
          };
          const messages = await addMessageServer({ data: [userMessage] });
          addMessage({ ...messages.data![0], role: "user" });
        } catch (error) {
          console.error(error);
          toast.error("Error sending message. Please try again.");
          return;
        }

        try {
          if (!conversation_id) return;
          const assistantPlaceholder = {
            id: `temp-${Date.now()}`,
            workspace_id: workspaceId,
            conversation_id: conversation_id,
            role: "assistant" as const,
            content: "",
            reasoning: null,
            is_complete: false,
            prompt_tokens: null,
            completion_tokens: null,
            created_at: null,
          };
          addMessage(assistantPlaceholder);

          const { reasoning, content } = await readChatStream(prompt);
          const assistantMessage = {
            workspace_id: workspaceId,
            conversation_id: conversation_id,
            role: "assistant",
            content: content,
            completion_tokens: 0,
            is_complete: false,
            reasoning: reasoning,
          };
          await addMessageServer({ data: [assistantMessage] });

          toast.success("Message sent!");
        } catch (error) {
          console.error(error);
          toast.error("Error sending message. Please try again.");
        }
      } catch (error) {
        console.error(error);
        toast.error("Error creating conversation. Please try again.");
      }
    }, [input, converation?.id, addMessage, readChatStream]);

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
  },
);
