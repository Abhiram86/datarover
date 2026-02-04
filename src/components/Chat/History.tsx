import { useConversationStore } from "@/store/conversation";
import { PromptBox } from "./PromptBox";
import { Markdown } from "../Markdown";
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
}

const History = ({ workspaceId }: HistoryProps) => {
  const messages = useConversationStore((s) => s.messages);
  const setMessages = useConversationStore((s) => s.setMessages);
  const setConversations = useConversationStore((s) => s.setConversations);

  const getConversationFn = useServerFn(getConversation);
  const getMessagesFn = useServerFn(getMessages);

  const { data: conversationData, isLoading: conversationLoading } = useQuery({
    queryKey: ["conversation", workspaceId],
    queryFn: () => getConversationFn({ data: workspaceId }),
    enabled: workspaceId !== "new",
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ["messages", workspaceId],
    queryFn: () => getMessagesFn({ data: workspaceId }),
    enabled: workspaceId !== "new",
  });

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

  const isLoading =
    workspaceId !== "new" && (conversationLoading || messagesLoading);
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

export const HistorySkeleton = () => (
  <div className="h-full w-full p-4 space-y-8 animate-pulse overflow-hidden">
    {/* User Message Skeleton */}
    <div className="flex flex-col items-end space-y-2">
      <div className="h-3 w-12 bg-neutral-strong/10 rounded" />
      <div className="w-[70%] h-12 bg-slate-800/40 rounded-2xl rounded-tr-none" />
    </div>

    {/* Assistant Message Skeleton with Reasoning */}
    <div className="flex flex-col items-start space-y-3">
      <div className="h-3 w-16 bg-neutral-strong/10 rounded" />
      {/* Reasoning Mock */}
      <div className="flex items-center gap-2 ml-1">
        <div className="w-3 h-3 bg-neutral-strong/10 rounded-full" />
        <div className="h-2 w-24 bg-neutral-strong/10 rounded" />
      </div>
      {/* Content Mock */}
      <div className="space-y-2 w-full">
        <div className="h-4 w-[90%] bg-neutral-strong/5 rounded" />
        <div className="h-4 w-[85%] bg-neutral-strong/5 rounded" />
        <div className="h-4 w-[40%] bg-neutral-strong/5 rounded" />
      </div>
    </div>

    {/* Another User Message */}
    <div className="flex flex-col items-end space-y-2">
      <div className="h-3 w-10 bg-neutral-strong/10 rounded" />
      <div className="w-[50%] h-10 bg-slate-800/40 rounded-2xl rounded-tr-none" />
    </div>
  </div>
);

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

export default History;
