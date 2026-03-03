import {
  Play,
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileCode,
  RotateCcw,
} from "lucide-react";
import { useState, useRef, useMemo } from "react";
import { useNotebookStore, type CodeBlock } from "@/store/notebook";
import { useSandboxStore } from "@/store/sandbox";
import toast from "react-hot-toast";

interface NotebookCellProps {
  block: CodeBlock;
  index: number;
  onRun: (code: string) => Promise<void>;
  onDelete: (id: string) => void;
}

const NotebookCell = ({ block, index, onRun, onDelete }: NotebookCellProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const lineCount = useMemo(() => block.code.split("\n").length, [block.code]);

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    try {
      await onRun(block.code);
    } finally {
      setIsRunning(false);
    }
  };

  const getOutputStyles = () => {
    switch (block.outputType) {
      case "error":
        return "bg-red-950/30 border-red-500/30 text-red-300";
      case "image":
        return "bg-green-950/30 border-green-500/30";
      default:
        return "bg-neutral-strong border-primary/20 text-white";
    }
  };

  return (
    <div className="flex flex-col bg-[#020617] rounded-lg border border-primary/10 overflow-hidden mb-3">
      {/* Cell Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-primary/5 border-b border-primary/10">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-primary/60 uppercase tracking-wider">
            In [{index + 1}]
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-primary/60 hover:text-primary transition-colors"
          >
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          <button
            onClick={() => onDelete(block.id)}
            className="p-1 text-red-500/60 hover:text-red-500 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Code Input */}
      <div className="flex">
        <div
          ref={lineNumbersRef}
          className="w-10 py-2 text-right pr-2 text-[10px] text-primary/40 select-none bg-primary/5 overflow-hidden"
          style={{ lineHeight: "1.5rem" }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="h-6">
              {i + 1}
            </div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={block.code}
          readOnly
          onScroll={handleScroll}
          spellCheck={false}
          className="flex-1 bg-transparent text-primary p-2 outline-none text-sm resize-none font-mono"
          style={{
            lineHeight: "1.5rem",
            whiteSpace: "pre",
            overflowWrap: "normal",
          }}
        />
      </div>

      {/* Run Button */}
      <div className="flex justify-start px-3 py-2 border-t border-primary/10">
        <button
          onClick={handleRun}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-all"
        >
          {isRunning ? (
            <Loader2 size={10} className="animate-spin" />
          ) : (
            <Play size={10} className="fill-current" />
          )}
          Run
        </button>
      </div>

      {/* Output */}
      {!isCollapsed && block.output && (
        <div className={`p-3 border-t ${getOutputStyles()}`}>
          <div className="text-[9px] font-black uppercase tracking-wider opacity-60 mb-1">
            Output
          </div>
          <pre className="text-xs font-mono whitespace-pre-wrap break-all">
            {block.output}
          </pre>
          {block.images && block.images.length > 0 && (
            <div className="mt-2 space-y-2">
              {block.images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Output ${i + 1}`}
                  className="max-w-full h-auto rounded"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const CodeNotebook = () => {
  const { blocks, addBlock, deleteBlock, getTail, clear } = useNotebookStore();
  const { runPythonSafe, ready } = useSandboxStore();
  const [newCode, setNewCode] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const displayedBlocks = getTail(20);
  const lineCount = useMemo(() => newCode.split("\n").length, [newCode]);

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newValue =
        newCode.substring(0, start) + "    " + newCode.substring(end);
      setNewCode(newValue);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      }, 0);
    }

    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleRun();
    }
  };

  const handleRun = async () => {
    if (!newCode.trim() || !ready) return;

    const codeToRun = newCode;
    setIsRunning(true);
    try {
      const result = await runPythonSafe(codeToRun);

      // Store in notebook
      const outputType = result.error
        ? "error"
        : result.images?.length
          ? "image"
          : "text";
      const outputText = result.error
        ? String(result.error)
        : result.result
          ? JSON.stringify(result.result, null, 2)
          : result.consoleOutput?.join("\n") || "";

      useNotebookStore
        .getState()
        .addBlock(codeToRun, outputText, outputType, result.images);

      if (result.ok) {
        toast.success("Code executed");
      } else {
        toast.error("Execution failed");
      }
      setNewCode("");
    } finally {
      setIsRunning(false);
    }
  };

  const handleAddBlock = () => {
    if (!newCode.trim()) return;

    const outputType = "text";
    addBlock(newCode, "Adding to notebook...", outputType);
    setNewCode("");
  };

  const handleReset = () => {
    toast.custom(
      (t) => (
        <div
          className={`
        flex flex-col gap-3 min-w-[320px] p-4 rounded-xl border shadow-2xl
        bg-primary border-amber-500/20 shadow-neutral-strong/5
        transition-all duration-300 ease-out
        ${t.visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-4 scale-95"}
      `}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <RotateCcw size={16} className="text-amber-500" />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-500/60 leading-none">
                Clear Notebook
              </span>
              <div className="text-xs font-bold text-neutral-strong/80 leading-tight">
                Clear all code blocks?
              </div>
              <p className="text-[10px] text-neutral-strong/40 leading-relaxed mt-1">
                This will remove all code blocks and their outputs from the
                notebook.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end mt-2">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1.5 text-[10px] font-bold text-neutral-strong/40 hover:text-neutral-strong uppercase tracking-widest transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                clear();
              }}
              className="px-3 py-1.5 bg-amber-500 text-white rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
            >
              Clear
            </button>
          </div>
        </div>
      ),
      { duration: 5000 },
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#0a0f1d] shrink-0">
        <div className="flex items-center gap-3">
          <FileCode size={14} className="text-blue-400" />
          <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
            Notebook
          </span>
          <span className="text-[9px] text-primary/40">
            {blocks.length} blocks
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="p-1.5 text-yellow-500 bg-neutral rounded hover:text-yellow-300 transition-colors"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Notebook Body */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Existing Blocks */}
        {displayedBlocks.map((block, idx) => (
          <NotebookCell
            key={block.id}
            block={block}
            index={displayedBlocks.length - displayedBlocks.length + idx}
            onRun={async (code) => {
              await runPythonSafe(code);
            }}
            onDelete={deleteBlock}
          />
        ))}

        {/* New Code Input */}
        <div className="flex flex-col bg-[#020617] rounded-lg border border-primary/10 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-primary/5 border-b border-primary/10">
            <span className="text-[10px] font-black text-primary/60 uppercase tracking-wider">
              In [{displayedBlocks.length + 1}]
            </span>
          </div>

          <div className="flex">
            <div
              ref={lineNumbersRef}
              className="w-10 py-2 text-right pr-2 text-[10px] text-primary/40 select-none bg-primary/5 overflow-hidden"
              style={{ lineHeight: "1.5rem" }}
            >
              {Array.from({ length: Math.max(lineCount, 3) }, (_, i) => (
                <div key={i} className="h-6">
                  {i + 1}
                </div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              onKeyDown={handleKeyDown}
              onScroll={handleScroll}
              placeholder="# Start typing your Python code..."
              spellCheck={false}
              className="flex-1 bg-transparent text-primary p-2 outline-none text-sm resize-none font-mono placeholder:text-gray-700"
              style={{
                lineHeight: "1.5rem",
                whiteSpace: "pre",
                overflowWrap: "normal",
              }}
            />
          </div>

          <div className="flex items-center justify-between px-3 py-2 border-t border-primary/10">
            <span className="text-[9px] text-primary/40">
              Ctrl+Enter to run
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddBlock}
                disabled={!newCode.trim()}
                className="flex items-center gap-1.5 px-3 py-1 bg-neutral hover:bg-neutral-strong text-primary rounded text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-all"
              >
                <Plus size={10} />
                Add
              </button>
              <button
                onClick={handleRun}
                disabled={!newCode.trim() || !ready || isRunning}
                className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-all"
              >
                {isRunning ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <Play size={10} className="fill-current" />
                )}
                Run
              </button>
            </div>
          </div>
        </div>

        {blocks.length === 0 && (
          <div className="text-center py-8 text-primary/40">
            <p className="text-xs uppercase tracking-wider">
              No code blocks yet
            </p>
            <p className="text-[10px] mt-1">
              Run code from the chat or add blocks manually
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
