import { useConversationStore } from "@/store/conversation";
import { PromptBox } from "./PromptBox";
import { Markdown } from "../Markdown";
import { ChevronDown, Brain } from "lucide-react";
import { useState, memo, useMemo } from "react";
import type { Message } from "@/types";

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

const History = ({ workspaceId }: { workspaceId: string }) => {
  const messages = useConversationStore((s) => s.messages);

  const memoizedMessages = useMemo(() => messages, [messages]);

  return (
    <div className="flex flex-col h-full bg-primary">
      <div className="p-4 border-b border-neutral-strong/10">
        <h4 className="text-[10px] font-black text-neutral-strong/40 uppercase tracking-widest">
          Chat History
        </h4>
      </div>

      {/* Styled Scrollbar added here */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-8 
        scrollbar-thin 
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

      <PromptBox workspaceId={workspaceId} />
    </div>
  );
};

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
