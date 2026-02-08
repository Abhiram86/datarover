import { Loader2 } from "lucide-react";

interface LoadingIndicatorProps {
  message?: string;
}

export function LoadingIndicator({ message = "Thinking..." }: LoadingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-neutral-strong/50 text-sm">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>{message}</span>
    </div>
  );
}
