import { useConversationStore } from "@/store/conversation";
import { newConversation, newMessage } from "@/utils/chat.functions";
import { useServerFn } from "@tanstack/react-start";
import React, { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { InputHint } from "./InputHint";
import { PromptTextarea } from "./PromptTextarea";
import { useAutoResizeTextarea } from "@/hooks/useAutoResizeTextarea";
import { useChatStream, type StreamEvent, type ChatMessage, type MessageToSave, type StreamResult } from "@/hooks/useChatStream";
import type { Message } from "@/types/chat";

interface MessageSaveResult {
  savedIds: Map<number, string>;
  successCount: number;
}

export const PromptBox = React.memo(
  ({ workspaceId }: { workspaceId: string }) => {
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const conversation = useConversationStore((s) => s.conversation);
    const messages = useConversationStore((s) => s.messages);
    const addMessage = useConversationStore((s) => s.addMessage);
    const updateMessage = useConversationStore((s) => s.updateMessage);
    const resetConversation = useConversationStore((s) => s.reset);
    const setConversations = useConversationStore((s) => s.setConversations);
    const newConvo = useServerFn(newConversation);
    const addMessageServer = useServerFn(newMessage);

    const textareaRef = useAutoResizeTextarea(input);
    const readChatStream = useChatStream();

    const convertToChatMessages = useCallback((): ChatMessage[] => {
      const chatMessages: ChatMessage[] = [];
      
      for (const msg of messages) {
        // Skip incomplete or temp messages
        if (msg.is_complete !== true || msg.id.startsWith("temp-")) {
          continue;
        }

        if (msg.role === "user") {
          chatMessages.push({ role: "user" as const, content: msg.content });
        } else if (msg.role === "assistant") {
          const assistantMsg: ChatMessage = {
            role: "assistant",
            content: msg.content,
          };
          
          if (msg.tool_calls && msg.tool_calls.length > 0) {
            assistantMsg.tool_calls = msg.tool_calls.map((tc) => ({
              id: tc.id,
              type: "function" as const,
              function: {
                name: tc.name,
                arguments: tc.arguments,
              },
            }));
          }
          
          chatMessages.push(assistantMsg);
          
          // Reconstruct tool messages from tool_calls that have results
          if (msg.tool_calls && msg.tool_calls.length > 0) {
            for (const toolCall of msg.tool_calls) {
              if (toolCall.result) {
                chatMessages.push({
                  role: "tool" as const,
                  content: toolCall.result,
                  tool_call_id: toolCall.id,
                  tool_name: toolCall.name,
                });
              }
            }
          }
        }
        // Note: tool messages are reconstructed from assistant tool_calls above
      }
      
      return chatMessages;
    }, [messages]);

    const createConversationIfNeeded = useCallback(async (): Promise<string | null> => {
      if (conversation?.id) return conversation.id;

      const tempConvoId = `temp-convo-${Date.now()}`;
      const optimisticConvo = {
        id: tempConvoId,
        workspace_id: workspaceId,
        title: "New Conversation",
        updated_at: new Date(),
        created_at: new Date(),
      };
      setConversations(optimisticConvo);

      try {
        const resp = await newConvo({
          data: { workspace_id: workspaceId, title: "New Conversation" },
        });
        setConversations(resp.data);
        return resp.data.id;
      } catch (error) {
        console.error(error);
        toast.error("Error creating conversation");
        resetConversation();
        return null;
      }
    }, [conversation?.id, workspaceId, newConvo, setConversations, resetConversation]);

    const createOptimisticUserMessage = useCallback((prompt: string, conversationId: string): Message => {
      const tempUserId = `temp-user-${Date.now()}`;
      const optimisticUserMessage: Message = {
        id: tempUserId,
        workspace_id: workspaceId,
        conversation_id: conversationId,
        role: "user",
        content: prompt,
        reasoning: null,
        is_complete: false,
        prompt_tokens: null,
        completion_tokens: null,
        created_at: new Date(),
      };
      addMessage(optimisticUserMessage);
      return optimisticUserMessage;
    }, [workspaceId, addMessage]);

    const streamChatResponse = useCallback(async (
      prompt: string,
      _conversationId: string
    ): Promise<StreamResult | null> => {
      const messageHistory = convertToChatMessages();
      messageHistory.push({ role: "user", content: prompt });

      try {
        return await readChatStream(
          messageHistory,
          (event: StreamEvent) => {
            if (event.type === "error") {
              console.error("Stream event error:", event.error);
            }
          }
        );
      } catch (error) {
        console.error("Stream error:", error);
        toast.error("Error streaming response");
        return null;
      }
    }, [convertToChatMessages, readChatStream]);

    const saveMessagesToDatabase = useCallback(async (
      messagesToSave: MessageToSave[],
      conversationId: string
    ): Promise<MessageSaveResult> => {
      const savedIds = new Map<number, string>();
      let successCount = 0;

      for (let i = 0; i < messagesToSave.length; i++) {
        const msgToSave = messagesToSave[i];

        try {
          const dbMessage = {
            workspace_id: workspaceId,
            conversation_id: conversationId,
            role: msgToSave.role,
            content: msgToSave.content,
            reasoning: msgToSave.reasoning ?? null,
            tool_calls: msgToSave.tool_calls ?? null,
            is_complete: msgToSave.is_complete ?? true,
            prompt_tokens: msgToSave.prompt_tokens ?? null,
            completion_tokens: msgToSave.completion_tokens ?? null,
          };

          const result = await addMessageServer({
            data: [dbMessage],
          });

          if (result.success && result.data?.[0]) {
            savedIds.set(i, result.data[0].id);
            successCount++;
          }
        } catch (error) {
          console.error(`Error saving ${msgToSave.role} message:`, error);
        }
      }

      return { savedIds, successCount };
    }, [workspaceId, addMessageServer]);

    const updateUserMessageInStore = useCallback((
      streamResult: StreamResult,
      savedIds: Map<number, string>,
      tempUserId: string,
      conversationId: string,
      prompt: string
    ): void => {
      const userMsgIndex = streamResult.messagesToSave.findIndex(m => m.role === "user");
      if (userMsgIndex < 0) return;

      const savedUserId = savedIds.get(userMsgIndex);
      if (!savedUserId) return;

      updateMessage(tempUserId, {
        id: savedUserId,
        workspace_id: workspaceId,
        conversation_id: conversationId,
        role: "user",
        content: prompt,
        reasoning: null,
        is_complete: true,
        prompt_tokens: streamResult.promptTokens,
        completion_tokens: null,
        created_at: new Date(),
      });
    }, [workspaceId, updateMessage]);

    const updateAssistantMessagesInStore = useCallback((
      streamResult: StreamResult,
      savedIds: Map<number, string>,
      conversationId: string
    ): void => {
      if (!streamResult.stepTempIds) return;

      const assistantMessages = streamResult.messagesToSave.filter(m => m.role === "assistant");

      assistantMessages.forEach((assistantMsg, idx) => {
        const assistantIndex = streamResult.messagesToSave.indexOf(assistantMsg);
        const savedAssistantId = savedIds.get(assistantIndex);
        const tempAssistantId = streamResult.stepTempIds?.[idx];

        if (savedAssistantId && tempAssistantId) {
          updateMessage(tempAssistantId, {
            id: savedAssistantId,
            workspace_id: workspaceId,
            conversation_id: conversationId,
            role: "assistant",
            content: assistantMsg.content,
            reasoning: assistantMsg.reasoning || null,
            tool_calls: assistantMsg.tool_calls,
            is_complete: assistantMsg.is_complete ?? true,
            prompt_tokens: assistantMsg.prompt_tokens ?? null,
            completion_tokens: assistantMsg.completion_tokens ?? null,
            created_at: new Date(),
          });
        }
      });
    }, [workspaceId, updateMessage]);

    const handleSubmit = useCallback(async () => {
      if (!input.trim() || isStreaming) return;

      const prompt = input;
      setInput("");
      setIsStreaming(true);

      try {
        const conversationId = await createConversationIfNeeded();
        if (!conversationId) {
          setIsStreaming(false);
          return;
        }

        const optimisticUserMessage = createOptimisticUserMessage(prompt, conversationId);
        const tempUserId = optimisticUserMessage.id;

        const streamResult = await streamChatResponse(prompt, conversationId);
        if (!streamResult) {
          setIsStreaming(false);
          return;
        }

        const { savedIds } = await saveMessagesToDatabase(
          streamResult.messagesToSave,
          conversationId
        );

        updateUserMessageInStore(streamResult, savedIds, tempUserId, conversationId, prompt);
        updateAssistantMessagesInStore(streamResult, savedIds, conversationId);
      } catch (error) {
        console.error(error);
        toast.error("Something went wrong");
      } finally {
        setIsStreaming(false);
      }
    }, [
      input,
      isStreaming,
      createConversationIfNeeded,
      createOptimisticUserMessage,
      streamChatResponse,
      saveMessagesToDatabase,
      updateUserMessageInStore,
      updateAssistantMessagesInStore,
    ]);

    return (
      <div className="p-4 bg-primary border-t border-neutral-strong/10">
        <PromptTextarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          disabled={!input.trim() || isStreaming}
          onSubmit={handleSubmit}
        />
        <InputHint />
      </div>
    );
  }
);

PromptBox.displayName = "PromptBox";
