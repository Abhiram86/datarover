interface LoadingIndicatorProps {
  message?: string;
}

export function LoadingIndicator({ message = "Processing..." }: LoadingIndicatorProps) {
  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 60%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          30% {
            opacity: 1;
            transform: scale(1.3);
          }
        }
      `}</style>
      <div className="flex items-center gap-3 text-neutral-strong/40 text-sm py-2">
        <div className="flex items-center gap-1">
          <Dot delay="0ms" />
          <Dot delay="150ms" />
          <Dot delay="300ms" />
        </div>
        <span className="text-[12px] font-medium tracking-wide uppercase">{message}</span>
      </div>
    </>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <div
      className="w-1.5 h-1.5 rounded-full bg-blue-500/60"
      style={{
        animation: `pulse 1.4s ease-in-out ${delay} infinite`,
      }}
    />
  );
}
