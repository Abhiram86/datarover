export const HistorySkeleton = () => (
  <div className="h-full w-full p-4 space-y-8 animate-pulse overflow-hidden">
    <div className="flex flex-col items-end space-y-2">
      <div className="h-3 w-12 bg-neutral-strong/10 rounded" />
      <div className="w-[70%] h-12 bg-slate-800/40 rounded-2xl rounded-tr-none" />
    </div>

    <div className="flex flex-col items-start space-y-3">
      <div className="h-3 w-16 bg-neutral-strong/10 rounded" />
      <div className="flex items-center gap-2 ml-1">
        <div className="w-3 h-3 bg-neutral-strong/10 rounded-full" />
        <div className="h-2 w-24 bg-neutral-strong/10 rounded" />
      </div>
      <div className="space-y-2 w-full">
        <div className="h-4 w-[90%] bg-neutral-strong/5 rounded" />
        <div className="h-4 w-[85%] bg-neutral-strong/5 rounded" />
        <div className="h-4 w-[40%] bg-neutral-strong/5 rounded" />
      </div>
    </div>

    <div className="flex flex-col items-end space-y-2">
      <div className="h-3 w-10 bg-neutral-strong/10 rounded" />
      <div className="w-[50%] h-10 bg-slate-800/40 rounded-2xl rounded-tr-none" />
    </div>
  </div>
);
