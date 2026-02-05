import { useConversationStore } from "@/store/conversation";
import { PromptBox } from "./PromptBox";
import { Markdown } from "../Markdown";
import { HistorySkeleton } from "@/components/skeletons/HistorySkeleton";
import { ChevronDown, Brain } from "lucide-react";
import { useState, memo, useMemo, useEffect } from "react";
import type { Message } from "@/types";
import { useServerFn } from "@tanstack/react-start";
import { getConversation, getMessages } from "@/utils/chat.functions";
import { useQuery } from "@tanstack/react-query";

const MessageItem = memo(
  ({ msg, isLast }: { msg: Message; isLast: boolean }) => (
    <div
      className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
    >
      <span className="text-[10px] font-bold uppercase text-neutral-strong/20 mb-2">
        {msg.role}
      </span>

      {msg.role === "user" ? (
        <div className="max-w-[90%] text-sm p-3 rounded-2xl leading-relaxed bg-slate-800 text-white shadow-md shadow-slate-200/50">
          {msg.content}
        </div>
      ) : (
        <div className="w-full space-y-4">
          {msg.reasoning && (
            <ReasoningDropdown
              reasoning={msg.reasoning}
              isProcessing={isLast && msg.role === "assistant" && !msg.content}
            />
          )}

          <div className="text-neutral-strong/90">
            <Markdown className="prose-md" content={msg.content} />
          </div>
        </div>
      )}
    </div>
  ),
);
MessageItem.displayName = "MessageItem";

interface HistoryProps {
  workspaceId: string;
  initialConversation?: {
    id: string;
    workspace_id: string;
    title: string | null;
    created_at: Date | null;
    updated_at: Date | null;
  } | null;
  initialMessages?: {
    id: string;
    workspace_id: string;
    conversation_id: string;
    role: "user" | "assistant" | "tool" | "system";
    content: string;
    reasoning: string | null;
    is_complete: boolean | null;
    prompt_tokens: number | null;
    completion_tokens: number | null;
    created_at: Date | null;
  }[];
}

const History = ({
  workspaceId,
  initialConversation,
  initialMessages,
}: HistoryProps) => {
  const messages = useConversationStore((s) => s.messages);
  const setMessages = useConversationStore((s) => s.setMessages);
  const setConversations = useConversationStore((s) => s.setConversations);

  // Initialize with server-side data
  useEffect(() => {
    if (initialConversation) {
      setConversations(initialConversation);
    }
    if (initialMessages) {
      setMessages(initialMessages);
    }
  }, [workspaceId, initialConversation, initialMessages, setConversations, setMessages]);

  // Still fetch for reactivity (e.g., after mutations)
  const getConversationFn = useServerFn(getConversation);
  const getMessagesFn = useServerFn(getMessages);

  const {
    data: conversationData,
    isLoading: conversationLoading,
    error: conversationError,
  } = useQuery({
    queryKey: ["conversation", workspaceId],
    queryFn: () => getConversationFn({ data: workspaceId }),
    enabled: workspaceId !== "new" && !initialConversation,
  });

  const {
    data: messagesData,
    isLoading: messagesLoading,
    error: messagesError,
  } = useQuery({
    queryKey: ["messages", workspaceId],
    queryFn: () => getMessagesFn({ data: workspaceId }),
    enabled: workspaceId !== "new" && !initialMessages,
  });

  // Update store when fresh data comes in
  useEffect(() => {
    if (conversationData?.success && conversationData.data) {
      setConversations(conversationData.data);
    }
  }, [conversationData, setConversations]);

  useEffect(() => {
    if (messagesData?.success && messagesData.data) {
      setMessages(messagesData.data);
    }
  }, [messagesData, setMessages]);

  // Show error toast when queries fail
  useEffect(() => {
    if (conversationError) {
      console.error("Failed to load conversation:", conversationError);
    }
    if (messagesError) {
      console.error("Failed to load messages:", messagesError);
    }
  }, [conversationError, messagesError]);

  const isLoading =
    workspaceId !== "new" &&
    !initialConversation &&
    (conversationLoading || messagesLoading);
  const hasError = conversationError || messagesError;
  const memoizedMessages = useMemo(() => messages, [messages]);

  return (
    <div className="flex flex-col h-full bg-primary overflow-hidden">
      <div className="p-4 border-b border-neutral-strong/10 shrink-0">
        <h4 className="text-[10px] font-black text-neutral-strong/40 uppercase tracking-widest">
          Chat History
        </h4>
      </div>

      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <HistorySkeleton />
        ) : hasError ? (
          <ErrorState
            message="Failed to load chat history"
            onRetry={() => window.location.reload()}
          />
        ) : (
          <div
            className="h-full overflow-y-auto p-4 space-y-8 scrollbar-thin
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-neutral-strong/10
          [&::-webkit-scrollbar-thumb]:rounded-full
          hover:[&::-webkit-scrollbar-thumb]:bg-neutral-strong/60"
          >
            {memoizedMessages.map((msg, idx) => (
              <MessageItem
                key={msg.id}
                msg={msg}
                isLast={idx === memoizedMessages.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      <PromptBox workspaceId={workspaceId} />
    </div>
  );
};

export { HistorySkeleton } from "@/components/skeletons/HistorySkeleton";

const ReasoningDropdown = memo(
  ({
    reasoning,
    isProcessing = false,
  }: {
    reasoning: string;
    isProcessing?: boolean;
  }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="w-full border-l border-neutral-strong/5 ml-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1 text-[9px] font-black text-neutral-strong/30 hover:text-neutral-strong/60 transition-colors uppercase tracking-widest"
        >
          <div className="relative flex items-center justify-center">
            <Brain
              size={12}
              className={isProcessing ? "text-blue-500/50" : ""}
            />
            {isProcessing && (
              <span className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
            )}
          </div>

          <span>Thought Process</span>

          {isProcessing && (
            <span className="flex items-center gap-1 ml-1">
              <span className="w-0.5 h-0.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="w-0.5 h-0.5 rounded-full bg-blue-500 animate-pulse [animation-delay:200ms]" />
              <span className="w-0.5 h-0.5 rounded-full bg-blue-500 animate-pulse [animation-delay:400ms]" />
            </span>
          )}

          <ChevronDown
            size={12}
            className={`ml-auto transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isOpen ? "max-h-500 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="pl-3 py-1 text-[13px] italic text-neutral-strong/40 leading-relaxed">
            <Markdown
              className="prose-sm prose-neutral max-w-none! 
             prose-p:leading-relaxed prose-p:my-0 
             prose-li:my-0 prose-ul:my-0"
              content={reasoning}
            />
          </div>
        </div>
      </div>
    );
  },
);
ReasoningDropdown.displayName = "ReasoningDropdown";

const ErrorState = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) => (
  <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center">
    <div className="text-neutral-strong/40 mb-4">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" x2="12" y1="8" y2="12" />
        <line x1="12" x2="12.01" y1="16" y2="16" />
      </svg>
    </div>
    <p className="text-sm text-neutral-strong/60 mb-4">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 text-xs font-medium text-primary bg-neutral-strong/80 rounded-lg hover:bg-neutral-strong transition-colors"
      >
        Retry
      </button>
    )}
  </div>
);

export default History;
