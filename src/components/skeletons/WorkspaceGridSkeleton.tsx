export const WorkspaceGridSkeleton = () => (
  <div className="h-screen w-full flex flex-col bg-primary overflow-hidden">
    <div className="h-16 w-full bg-primary border-b border-neutral-strong/5 px-8">
      <div className="h-6 w-32 bg-neutral-strong/10 rounded animate-pulse mt-4" />
    </div>
    <main className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between mb-12">
        <div className="h-8 w-40 bg-neutral-strong/10 rounded animate-pulse" />
        <div className="h-10 w-36 bg-neutral-strong/10 rounded-xl animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="flex flex-col bg-neutral-strong/2 border border-neutral-strong/10 rounded-2xl p-5 h-45 animate-pulse"
          >
            <div className="flex justify-between items-start mb-8">
              <div className="w-10 h-10 rounded-xl bg-neutral-strong/5" />
              <div className="w-6 h-6 rounded-md bg-neutral-strong/5" />
            </div>
            <div className="h-5 w-32 bg-neutral-strong/5 rounded mb-2" />
            <div className="h-3 w-24 bg-neutral-strong/3 rounded" />
          </div>
        ))}
      </div>
    </main>
  </div>
);
