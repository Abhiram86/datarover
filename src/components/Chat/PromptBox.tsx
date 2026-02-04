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
    const updateMessage = useConversationStore((s) => s.updateMessage);
    const updateMessagesConversationId = useConversationStore(
      (s) => s.updateMessagesConversationId,
    );
    const removeMessage = useConversationStore((s) => s.removeMessage);
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
        let incompleteChunk = ""; // Buffer for incomplete JSON

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
          // Combine with any incomplete chunk from previous iteration
          const fullChunk = incompleteChunk + chunk;
          const lines = fullChunk.split("\n");

          // Last line might be incomplete, save it for next iteration
          incompleteChunk = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue; // Skip empty lines

            try {
              const parsed = JSON.parse(line);

              if (parsed.type === "reasoning") {
                reasoningBuffer += parsed.text;
                fullReasoning += parsed.text;
              } else if (parsed.type === "content") {
                contentBuffer += parsed.text;
                fullContent += parsed.text;
              }
            } catch (e) {
              console.error("Failed to parse line:", line, e);
            }
          }

          // Schedule update at most once per frame
          if (!frameId) {
            frameId = requestAnimationFrame(flush);
          }
        }

        // Process any remaining incomplete chunk
        if (incompleteChunk.trim()) {
          try {
            const parsed = JSON.parse(incompleteChunk);
            if (parsed.type === "reasoning") {
              reasoningBuffer += parsed.text;
              fullReasoning += parsed.text;
            } else if (parsed.type === "content") {
              contentBuffer += parsed.text;
              fullContent += parsed.text;
            }
          } catch (e) {
            console.error("Failed to parse final chunk:", incompleteChunk, e);
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
        // 1. Create conversation if needed (optimistically)
        if (!converation) {
          const tempConvoId = `temp-convo-${Date.now()}`;
          conversation_id = tempConvoId;

          // Optimistically add to UI
          const optimisticConvo = {
            id: tempConvoId,
            workspace_id: workspaceId,
            title: "New Conversation",
            updated_at: new Date(),
            created_at: new Date(),
          };
          useConversationStore.getState().setConversations(optimisticConvo);

          // Create in background and update with real ID
          newConvo({
            data: { workspace_id: workspaceId, title: "New Conversation" },
          })
            .then((resp) => {
              conversation_id = resp.data.id;
              useConversationStore.getState().setConversations(resp.data);
              // Update all temporary messages with real conversation_id
              updateMessagesConversationId(tempConvoId, resp.data.id);
            })
            .catch((error) => {
              console.error(error);
              toast.error("Error creating conversation");
              // Optionally remove optimistic updates
            });
        }

        // 2. Optimistically add user message to UI immediately
        const tempUserId = `temp-user-${Date.now()}`;
        const optimisticUserMessage = {
          id: tempUserId,
          workspace_id: workspaceId,
          conversation_id: conversation_id!,
          role: "user" as const,
          content: prompt,
          reasoning: null,
          is_complete: false,
          prompt_tokens: null,
          completion_tokens: null,
          created_at: new Date(),
        };
        addMessage(optimisticUserMessage);

        // 3. Optimistically add assistant placeholder
        const tempAssistantId = `temp-assistant-${Date.now()}`;
        const assistantPlaceholder = {
          id: tempAssistantId,
          workspace_id: workspaceId,
          conversation_id: conversation_id!,
          role: "assistant" as const,
          content: "",
          reasoning: null,
          is_complete: false,
          prompt_tokens: null,
          completion_tokens: null,
          created_at: null,
        };
        addMessage(assistantPlaceholder);

        // 4. Save user message in background
        addMessageServer({
          data: [
            {
              workspace_id: workspaceId,
              conversation_id: conversation_id!,
              role: "user",
              content: prompt,
              prompt_tokens: 0,
            },
          ],
        })
          .then((messages) => {
            // Update with real message from server
            updateMessage(tempUserId, messages.data![0]);
          })
          .catch((error) => {
            console.error(error);
            toast.error("Error saving message");
            // Mark message as failed or remove it
            removeMessage(tempUserId);
          });

        // 5. Stream assistant response
        try {
          const { reasoning, content } = await readChatStream(prompt);

          // Save assistant message
          const assistantMessage = {
            workspace_id: workspaceId,
            conversation_id: conversation_id!,
            role: "assistant",
            content: content,
            completion_tokens: 0,
            is_complete: true,
            reasoning: reasoning,
          };

          const savedMessage = await addMessageServer({
            data: [assistantMessage],
          });

          // Update placeholder with real server data
          updateMessage(tempAssistantId, savedMessage.data![0]);
        } catch (error) {
          console.error(error);
          toast.error("Error getting response");
          // Mark assistant message as failed
          updateMessage(tempAssistantId, {
            ...assistantPlaceholder,
            content: "Error: Failed to get response",
            is_complete: true,
          });
        }
      } catch (error) {
        console.error(error);
        toast.error("Something went wrong");
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
