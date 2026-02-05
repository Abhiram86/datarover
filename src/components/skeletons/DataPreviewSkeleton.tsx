export const DataPreviewSkeleton = () => (
  <div className="h-full w-full flex flex-col bg-slate-800 p-4">
    <div className="flex items-center justify-between mb-3">
      <div className="h-4 w-32 bg-slate-700/30 rounded animate-pulse" />
      <div className="h-5 bg-blue-400/5 px-2 py-1 rounded border border-blue-400/10 w-16 animate-pulse" />
    </div>
    <div className="flex-1 overflow-hidden rounded-lg border border-white/10 p-2">
      <div className="h-full w-full space-y-2">
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-9 bg-slate-700/20 rounded animate-pulse"
            />
          ))}
        </div>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((j) => (
              <div
                key={j}
                className="h-8 bg-slate-700/10 rounded border border-slate-600/20"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);
