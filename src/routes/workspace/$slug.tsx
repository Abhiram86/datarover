import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import History from "@/components/Chat/History";
import DataPreview from "@/components/DataPreview";
import { Panel } from "@/components/Panels/Panel";
import { PanelGroup } from "@/components/Panels/PanelGroup";
import WorkspaceHeader from "@/components/WorkSpaceHeader";
import { getSupabaseEnv } from "@/utils/sensitive.functions";
import { createClient } from "@supabase/supabase-js";
import { getWorkspace } from "@/utils/workspaces.functions";
import { useFileStore } from "@/store/file";
import { useEffect } from "react";

export const Route = createFileRoute("/workspace/$slug")({
  component: RouteComponent,
  loader: async (ctx) => {
    const env = await getSupabaseEnv();
    const slug = ctx.params.slug;
    const data = await getWorkspace({ data: slug });
    console.log("slug", slug);
    return {
      env,
      slug,
      data,
    };
  },
});

function RouteComponent() {
  const loaderData = useLoaderData({ from: "/workspace/$slug" });
  const setPreview = useFileStore((s) => s.setPreview);
  console.log("render check");

  useEffect(() => {
    if (loaderData.data.success && loaderData.data.data) {
      setPreview(loaderData.data.data.preview);
    }
  }, [loaderData.data.success, loaderData.data.data]);

  if (loaderData.data.error) {
    if (loaderData.data.error instanceof String) {
      return <div>Error: {loaderData.data.error}</div>;
    } else if (loaderData.data.error instanceof Error) {
      return <div>Error: {loaderData.data.error.message}</div>;
    }
    return <div>Error: Unknown error</div>;
  }

  const supabase = createClient(
    loaderData.env.data.supabaseProjectUrl,
    loaderData.env.data.supabaseAnonKey,
  );
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
