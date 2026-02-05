import { HistorySkeleton } from "@/components/Chat/History";
import { DataPreviewSkeleton } from "@/components/skeletons/DataPreviewSkeleton";
import { Panel } from "@/components/Panels/Panel";
import { PanelGroup } from "@/components/Panels/PanelGroup";

export const WorkspaceSkeleton = () => (
  <div className="h-screen w-full flex flex-col bg-primary overflow-hidden">
    <div className="h-16 bg-primary border-b border-neutral-strong/5" />

    <div className="flex-1 overflow-hidden p-1">
      <PanelGroup
        direction="horizontal"
        className="rounded-xl overflow-hidden border border-neutral-strong/10"
      >
        <Panel size={50} minSize={33}>
          <div className="h-full bg-primary-muted/10">
            <HistorySkeleton />
          </div>
        </Panel>

        <Panel size={50} minSize={33}>
          <PanelGroup direction="vertical">
            <Panel size={70}>
              <DataPreviewSkeleton />
            </Panel>
            <Panel size={30}>
              <div className="h-full bg-[#020617] p-4 font-mono text-sm text-blue-300">
                <span className="text-gray-500"># Loading...</span>
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  </div>
);
