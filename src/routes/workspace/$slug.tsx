import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import History from "@/components/Chat/History";
import DataPreview from "@/components/DataPreview";
import { Panel } from "@/components/Panels/Panel";
import { PanelGroup } from "@/components/Panels/PanelGroup";
import WorkspaceHeader from "@/components/WorkSpaceHeader";
import { getSupabaseEnv } from "@/utils/sensitive.functions";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/workspace/$slug")({
  component: RouteComponent,
  loader: async (ctx) => {
    const env = await getSupabaseEnv();
    const slug = ctx.params.slug;
    console.log("slug", slug);
    return {
      env,
      slug,
      name: "workspace",
    };
  },
});

function RouteComponent() {
  const loaded = useLoaderData({ from: "/workspace/$slug" });
  const supabase = createClient(
    loaded.env.data.supabaseProjectUrl,
    loaded.env.data.supabaseAnonKey,
  );
  console.log("loaded", loaded);
  return (
    <div className="h-screen w-full flex flex-col bg-primary overflow-hidden">
      {/* Small Utility Header */}
      <WorkspaceHeader supabase={supabase} />

      {/* Main Resizable Workspace */}
      <div className="flex-1 overflow-hidden p-1">
        <PanelGroup
          direction="horizontal"
          className="rounded-xl overflow-hidden border border-neutral-strong/10"
        >
          <Panel size={25} minSize={20}>
            {/* Chat UI */}
            <div className="h-full bg-primary-muted/10">
              <History />
            </div>
          </Panel>

          <Panel minSize={25} size={80}>
            <PanelGroup direction="vertical">
              <Panel size={70}>
                {/* Data Grid */}
                <DataPreview />
              </Panel>
              <Panel size={30}>
                {/* Code Editor */}
                <div className="h-full bg-[#020617] p-4 font-mono text-sm text-blue-300">
                  <span className="text-gray-500">
                    # Start typing analysis...
                  </span>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
