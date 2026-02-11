import toast from "react-hot-toast";
import { AlertTriangle } from "lucide-react";

interface MutationConfirmationProps {
  toolName: string;
  description?: string;
  query?: string;
}

/**
 * Show a confirmation toast for mutation operations
 * Returns a promise that resolves to true if confirmed, false if rejected
 */
export function showMutationConfirmation({
  toolName,
  description,
  query,
}: MutationConfirmationProps): Promise<boolean> {
  return new Promise((resolve) => {
    toast.custom(
      (t) => (
        <div
          className={`
            flex flex-col gap-3 min-w-[320px] max-w-[480px] p-4 rounded-xl border shadow-2xl
            bg-primary border-amber-500/30 shadow-neutral-strong/5
            transition-all duration-300 ease-out
            ${t.visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-4 scale-95"}
          `}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <AlertTriangle size={16} className="text-amber-500" />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-500/60 leading-none">
                Data Modification Request
              </span>
              <div className="text-xs font-bold text-neutral-strong/80 leading-tight">
                {toolName === "run_duckdb"
                  ? "This query will modify the dataset"
                  : `Execute ${toolName}?`}
              </div>
              {description && (
                <p className="text-[10px] text-neutral-strong/60 mt-1 italic">
                  {description}
                </p>
              )}
              {query && (
                <code className="text-[9px] bg-neutral-strong/5 p-1.5 rounded mt-1 block overflow-x-auto font-mono text-neutral-strong/50">
                  {query.length > 100 ? query.substring(0, 100) + "..." : query}
                </code>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end mt-2">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
              className="px-3 py-1.5 text-[10px] font-bold text-neutral-strong/40 hover:text-neutral-strong uppercase tracking-widest transition-colors"
            >
              Reject
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
              className="px-3 py-1.5 bg-amber-500 text-white rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
            >
              Allow Execution
            </button>
          </div>
        </div>
      ),
      { duration: Infinity },
    );
  });
}
