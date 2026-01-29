import { ArrowUpIcon, Paperclip } from "lucide-react";
import { useState } from "react";

export const PromptBox = ({ onSend }: { onSend: (val: string) => void }) => {
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  return (
    <div className="p-4 bg-primary border-t border-neutral-strong/10">
      <div className="relative flex items-end gap-2 bg-neutral-strong/5 rounded-xl border border-neutral-strong/10 p-2 focus-within:border-neutral-strong/20 transition-all">
        <button className="p-2 text-neutral-strong/40 hover:text-neutral-strong/80 transition-colors">
          <Paperclip size={18} />
        </button>

        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm py-2 resize-none max-h-32"
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
};
