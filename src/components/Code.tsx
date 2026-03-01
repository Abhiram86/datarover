import {
  Play,
  Terminal,
  FileCode,
  Loader2,
  ChevronRight,
  RotateCcw,
  Eraser,
} from "lucide-react";
import { useState, useRef, useMemo } from "react";
import { PanelGroup } from "./Panels/PanelGroup";
import { Panel } from "./Panels/Panel";
import { useSandboxStore } from "@/store/sandbox";
import toast from "react-hot-toast";

export const CodeEditor = () => {
  const [code, setCode] = useState(
    "# Start typing your Python analysis...\nprint('Hello World')",
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const { runPythonSafe, consoleOutput, clearConsole, reset } = useSandboxStore(
    (state) => state,
  );
  // Sync scroll between textarea and line numbers
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
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
                Environment Reset
              </span>
              <div className="text-xs font-bold text-neutral-strong/80 leading-tight">
                Clear all variables from memory?
              </div>
              <p className="text-[10px] text-neutral-strong/40 leading-relaxed mt-1">
                This will restart the Python instance. All initialized data will
                be lost.
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
              onClick={async () => {
                toast.dismiss(t.id);
                reset(); // Your reset function
                setCode("");
              }}
              className="px-3 py-1.5 bg-amber-500 text-white rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
            >
              Confirm Reset
            </button>
          </div>
        </div>
      ),
      { duration: 5000 },
    );
  };

  const handleRun = async () => {
    const output = await runPythonSafe(code);
    if (output.ok) {
      toast.success("Code executed successfully");
    } else {
      console.error(output.error);
      toast.error("Code execution failed");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    if (e.key === "Tab") {
      e.preventDefault();
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newValue = code.substring(0, start) + "    " + code.substring(end);
      setCode(newValue);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      }, 0);
    }

    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleRun();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] font-mono">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#0a0f1d] shrink-0">
        <div className="flex items-center gap-3">
          <FileCode size={14} className="text-blue-400" />
          <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
            main.py
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="p-1.5 text-yellow-500 bg-neutral rounded hover:text-yellow-300 transition-colors"
          >
            <RotateCcw size={13} />
          </button>
          <button
            onClick={() => setCode("")}
            className="p-1.5 text-blue-500 hover:text-blue-300 rounded bg-neutral transition-colors"
          >
            <Eraser size={13} />
          </button>
          <button
            onClick={handleRun}
            disabled={false}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-all active:scale-95"
          >
            {false ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <span className="flex items-center gap-1">
                F2
                <Play size={10} className="fill-current" />
              </span>
            )}
            Run
          </button>
        </div>
      </div>

      {/* Resizable Body */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="vertical">
          <Panel size={70} minSize={20}>
            <div className="relative h-full w-full flex overflow-hidden bg-neutral-strong border-b border-primary">
              {/* Line Numbers Column */}
              <div
                ref={lineNumbersRef}
                className="w-10 py-4 text-right pr-3 text-primary select-none border-r border-white/5 bg-[#020617] overflow-hidden"
                style={{ lineHeight: "1.5rem" }} // Exactly 24px to match text-sm leading-6
              >
                {Array.from({ length: useMemo(() => code.split("\n").length, [code]) }, (_, i) => (
                  <div key={i} className="text-[10px] h-6">
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Editor Input */}
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={handleKeyDown}
                onScroll={handleScroll}
                spellCheck={false}
                className="flex-1 bg-primary text-neutral-strong p-4 outline-none resize-none text-sm placeholder:text-gray-800 overflow-auto"
                style={{
                  lineHeight: "1.5rem", // Match the line numbers exactly
                  whiteSpace: "pre",
                  overflowWrap: "normal",
                }}
              />
            </div>
          </Panel>

          {/* Bottom: Console */}
          <Panel size={30} minSize={20}>
            <div className="h-full flex flex-col text-primary bg-[#050a1f] border-t border-primary overflow-hidden">
              <div className="flex items-center justify-between px-4 py-1.5 bg-white/5 shrink-0">
                <div className="flex items-center gap-2">
                  <Terminal size={12} />
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    Console
                  </span>
                </div>
                <button
                  onClick={clearConsole}
                  className="text-primary text-sm hover:underline"
                >
                  clear
                </button>
              </div>
              <div className="flex-1 p-3 overflow-y-auto text-xs space-y-1">
                {consoleOutput.length === 0 ? (
                  <span className="italic uppercase text-[9px] tracking-widest opacity-40">
                    &gt; System ready for execution
                  </span>
                ) : (
                  consoleOutput.map((line, i) => (
                    <div key={i} className="flex gap-2 text-gray-400">
                      <ChevronRight
                        size={12}
                        className="text-blue-500/40 shrink-0 mt-0.5"
                      />
                      <span className="break-all font-mono">{line}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
};
