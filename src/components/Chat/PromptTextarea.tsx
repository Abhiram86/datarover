import { ArrowUpIcon, Paperclip } from "lucide-react";
import React, { forwardRef } from "react";

interface PromptTextareaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  onSubmit?: () => void;
}

export const PromptTextarea = forwardRef<
  HTMLTextAreaElement,
  PromptTextareaProps
>(({ value, onChange, onKeyDown, disabled, onSubmit }, ref) => {
  return (
    <div className="relative flex items-end gap-2 bg-neutral-strong/5 rounded-xl border border-neutral-strong/10 p-2 focus-within:border-neutral-strong/20 transition-all">
      <button
        type="button"
        className="p-2 text-neutral-strong/40 hover:text-neutral-strong/80 transition-colors"
      >
        <Paperclip size={18} />
      </button>

      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={onChange}
        placeholder="Ask a question..."
        className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm py-2 resize-none max-h-30 overflow-y-auto 
          scrollbar-thin 
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-neutral-strong/20
          [&::-webkit-scrollbar-thumb]:rounded-full
          hover:[&::-webkit-scrollbar-thumb]:bg-neutral-strong/40"
        onKeyDown={onKeyDown}
      />

      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled}
        className="p-2 bg-neutral-strong text-primary rounded-lg disabled:opacity-30 hover:opacity-90 transition-all mb-0.5"
      >
        <ArrowUpIcon size={18} />
      </button>
    </div>
  );
});

PromptTextarea.displayName = "PromptTextarea";
