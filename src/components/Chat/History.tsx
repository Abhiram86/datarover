import { PromptBox } from "./PromptBox";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const History = () => {
  // Mock data - replace with your actual state/logic later
  const messages: Message[] = [
    {
      id: "1",
      role: "assistant",
      content: "Hello! How can I help you analyze your data today?",
    },
    {
      id: "2",
      role: "user",
      content: "Can you show me a summary of the sales trends?",
    },
  ];

  const handleSend = (text: string) => {
    console.log("New Message:", text);
    // Add logic to push to your message state here
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-neutral-strong/10">
        <h4 className="text-[10px] font-black text-neutral-strong/40 uppercase tracking-widest">
          Chat History
        </h4>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <span className="text-[10px] font-bold uppercase text-neutral-strong/30 mb-1">
              {msg.role}
            </span>
            <div
              className={`max-w-[90%] text-sm p-3 rounded-2xl leading-relaxed ${
                msg.role === "user"
                  ? "bg-slate-800 text-white shadow-md shadow-slate-200/50" // Softened dark
                  : "bg-neutral-strong/6 border border-neutral-strong/10 text-neutral-strong/90 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <PromptBox onSend={handleSend} />
    </div>
  );
};

export default History;
