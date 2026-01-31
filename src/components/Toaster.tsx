import toast, { Toaster } from "react-hot-toast";
import { X, CheckCircle2, AlertCircle, Loader2, Info } from "lucide-react";

export const CustomToaster = () => {
  return (
    <Toaster
      position="top-center" // Moved to top-center for better visibility
      toastOptions={{
        duration: 4000,
      }}
    >
      {(t) => (
        <div
          className={`
            /* Base Styles */
            flex items-center gap-3 min-w-[320px] p-3 rounded-xl border shadow-2xl
            bg-primary border-neutral-strong/10 shadow-neutral-strong/5
            transition-all duration-300 ease-out
            
            /* Tailwind v4 Entry/Exit Logic */
            ${t.visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-4 scale-95"}
          `}
        >
          {/* Status Icon */}
          <div className="shrink-0">
            {t.type === "loading" && (
              <Loader2
                size={16}
                className="text-neutral-strong/40 animate-spin"
              />
            )}
            {t.type === "success" && (
              <CheckCircle2 size={16} className="text-green-500" />
            )}
            {t.type === "error" && (
              <AlertCircle size={16} className="text-red-500" />
            )}
            {t.type === "blank" && <Info size={16} className="text-blue-500" />}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col gap-0.5">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-strong/30 leading-none">
              {t.type === "loading" ? "Processing" : "System Notification"}
            </span>
            <div className="text-xs font-bold text-neutral-strong/80 leading-tight">
              {typeof t.message === "function" ? t.message(t) : t.message}
            </div>
          </div>

          {/* Close Button */}
          {t.type !== "loading" && (
            <button
              onClick={() => toast.dismiss(t.id)}
              className="p-1 hover:bg-neutral-strong/5 rounded-md text-neutral-strong/20 hover:text-neutral-strong transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
    </Toaster>
  );
};
