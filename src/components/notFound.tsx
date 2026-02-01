import { Link } from "@tanstack/react-router";
import { MoveLeft, Terminal, AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="h-screen w-full flex flex-col bg-primary items-center justify-center p-6 select-none">
      {/* Background Decorative Element - Subtly matching your logo rotate-45 vibe */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.02]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-neutral-strong rotate-45" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-neutral-strong rotate-45" />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-md w-full text-center">
        {/* Error Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/5 border border-red-500/10 mb-8">
          <AlertTriangle size={12} className="text-red-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500/80">
            Error Code: 404
          </span>
        </div>

        {/* Technical Branding mimicking your Header logo */}
        <div className="w-16 h-16 bg-neutral-strong rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-neutral-strong/10">
          <div className="w-8 h-8 border-2 border-primary rotate-45 flex items-center justify-center">
            <span className="rotate-[-45deg] text-[10px] font-black text-primary">
              !
            </span>
          </div>
        </div>

        <h1 className="text-3xl font-black text-neutral-strong tracking-tighter uppercase mb-4">
          Path Not Found
        </h1>

        <p className="text-xs font-medium text-neutral-strong/40 uppercase tracking-widest leading-relaxed mb-10">
          The requested resource is either restricted <br /> or does not exist
          in the current directory.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col w-full gap-3">
          <Link
            to="/workspace"
            className="flex items-center justify-center gap-3 w-full py-4 bg-neutral-strong text-primary rounded-xl text-xs font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-neutral-strong/10"
          >
            <MoveLeft size={16} strokeWidth={3} />
            Return to Dashboard
          </Link>

          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 w-full py-4 bg-transparent border border-neutral-strong/10 text-neutral-strong/40 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-neutral-strong/5 hover:text-neutral-strong transition-all"
          >
            <Terminal size={14} />
            Retry Connection
          </button>
        </div>

        {/* Footer Meta */}
        <div className="mt-16 flex items-center gap-4">
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-bold text-neutral-strong/20 uppercase tracking-tighter">
              System Status
            </span>
            <span className="text-[10px] font-black text-green-500/50 uppercase tracking-widest">
              Operational
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
