import { useConversationStore } from "@/store/conversation";
import { newConversation, newMessage } from "@/utils/chat.functions";
import { useServerFn } from "@tanstack/react-start";
import React, { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { InputHint } from "./InputHint";
import { PromptTextarea } from "./PromptTextarea";
import { useAutoResizeTextarea } from "@/hooks/useAutoResizeTextarea";
import { useChatStream } from "@/hooks/useChatStream";
import { useSandbox } from "@/hooks/useSanbox";
import { useSandboxStore } from "@/store/sandbox";

export const PromptBox = React.memo(
  ({ workspaceId }: { workspaceId: string }) => {
    const [input, setInput] = useState("");
    const converation = useConversationStore((s) => s.conversation);
    const addMessage = useConversationStore((s) => s.addMessage);
    const addStreamMessage = useConversationStore((s) => s.addStreamMessage);
    const updateMessage = useConversationStore((s) => s.updateMessage);
    const removeMessage = useConversationStore((s) => s.removeMessage);
    const resetConversation = useConversationStore((s) => s.reset);
    const setConversations = useConversationStore((s) => s.setConversations);
    const newConvo = useServerFn(newConversation);
    const addMessageServer = useServerFn(newMessage);

    const textareaRef = useAutoResizeTextarea(input);
    const readChatStream = useChatStream(addStreamMessage);
    const { safePythonExec, ready: sandboxReady } = useSandbox();

    const handleSubmit = useCallback(async () => {
      safePythonExec("for i in range(10):\n  print(i)");
    }, [safePythonExec, sandboxReady]);

    // const handleSubmit = useCallback(async () => {
    //   if (!input.trim()) return;
    //   const prompt = input;
    //   setInput("");

    //   let conversation_id = converation?.id;

    //   try {
    //     if (!converation) {
    //       const tempConvoId = `temp-convo-${Date.now()}`;

    //       const optimisticConvo = {
    //         id: tempConvoId,
    //         workspace_id: workspaceId,
    //         title: "New Conversation",
    //         updated_at: new Date(),
    //         created_at: new Date(),
    //       };
    //       setConversations(optimisticConvo);

    //       try {
    //         const resp = await newConvo({
    //           data: { workspace_id: workspaceId, title: "New Conversation" },
    //         });
    //         conversation_id = resp.data.id;
    //         setConversations(resp.data);
    //       } catch (error) {
    //         console.error(error);
    //         toast.error("Error creating conversation");
    //         resetConversation();
    //         return;
    //       }
    //     }

    //     const tempUserId = `temp-user-${Date.now()}`;
    //     const optimisticUserMessage = {
    //       id: tempUserId,
    //       workspace_id: workspaceId,
    //       conversation_id: conversation_id!,
    //       role: "user" as const,
    //       content: prompt,
    //       reasoning: null,
    //       is_complete: false,
    //       prompt_tokens: null,
    //       completion_tokens: null,
    //       created_at: new Date(),
    //     };
    //     addMessage(optimisticUserMessage);

    //     const tempAssistantId = `temp-assistant-${Date.now()}`;
    //     const assistantPlaceholder = {
    //       id: tempAssistantId,
    //       workspace_id: workspaceId,
    //       conversation_id: conversation_id!,
    //       role: "assistant" as const,
    //       content: "",
    //       reasoning: null,
    //       is_complete: false,
    //       prompt_tokens: null,
    //       completion_tokens: null,
    //       created_at: null,
    //     };
    //     addMessage(assistantPlaceholder);

    //     let promptTokens = 0;
    //     let completionTokens = 0;

    //     try {
    //       const streamResult = await readChatStream(prompt);
    //       promptTokens = streamResult.promptTokens;
    //       completionTokens = streamResult.completionTokens;

    //       let savedUserMessage;
    //       try {
    //         const result = await addMessageServer({
    //           data: [
    //             {
    //               workspace_id: workspaceId,
    //               conversation_id: conversation_id!,
    //               role: "user",
    //               content: prompt,
    //               prompt_tokens: promptTokens,
    //             },
    //           ],
    //         });
    //         savedUserMessage = result.data![0];
    //         updateMessage(tempUserId, savedUserMessage);
    //       } catch (error) {
    //         console.error(error);
    //         toast.error("Error saving message");
    //         removeMessage(tempUserId);
    //       }

    //       const assistantMessage = {
    //         workspace_id: workspaceId,
    //         conversation_id: conversation_id!,
    //         role: "assistant",
    //         content: streamResult.content,
    //         completion_tokens: completionTokens,
    //         prompt_tokens: promptTokens,
    //         is_complete: true,
    //         reasoning: streamResult.reasoning,
    //       };

    //       const savedMessage = await addMessageServer({
    //         data: [assistantMessage],
    //       });

    //       updateMessage(tempAssistantId, savedMessage.data![0]);
    //     } catch (error) {
    //       console.error(error);
    //       toast.error("Error getting response");
    //       updateMessage(tempAssistantId, {
    //         ...assistantPlaceholder,
    //         content: "Error: Failed to get response",
    //         is_complete: true,
    //       });
    //     }
    //   } catch (error) {
    //     console.error(error);
    //     toast.error("Something went wrong");
    //   }
    // }, [
    //   input,
    //   converation?.id,
    //   addMessage,
    //   readChatStream,
    //   workspaceId,
    //   newConvo,
    //   addMessageServer,
    //   removeMessage,
    //   updateMessage,
    //   resetConversation,
    //   setConversations,
    // ]);

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
          disabled={!input.trim()}
          onSubmit={handleSubmit}
        />
        <InputHint />
      </div>
    );
  },
);
