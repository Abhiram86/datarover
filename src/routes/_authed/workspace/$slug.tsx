import {
  createFileRoute,
} from "@tanstack/react-router";
import History from "@/components/Chat/History";
import DataPreview from "@/components/DataPreview";
import { Panel } from "@/components/Panels/Panel";
import { PanelGroup } from "@/components/Panels/PanelGroup";
import WorkspaceHeader from "@/components/WorkSpaceHeader";
import { getSupabaseEnv } from "@/utils/sensitive.functions";
import { createClient } from "@supabase/supabase-js";
import { useFileStore } from "@/store/file";
import { useEffect, useMemo } from "react";

export const Route = createFileRoute("/_authed/workspace/$slug")({
  loader: async ({ params }) => {
    const env = await getSupabaseEnv();
    const slug = params.slug;
    return {
      env,
      slug,
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const loaderData = Route.useLoaderData();

  const supabase = useMemo(() => {
    return createClient(
      loaderData.env.data.supabaseProjectUrl,
      loaderData.env.data.supabaseAnonKey,
    );
  }, [
    loaderData.env.data.supabaseProjectUrl,
    loaderData.env.data.supabaseAnonKey,
  ]);

  useEffect(() => {
    if (loaderData.slug === "new") {
      useFileStore.getState().reset();
    }
  }, [loaderData.slug]);

  return (
    <div className="h-screen w-full flex flex-col bg-primary overflow-hidden">
      <WorkspaceHeader supabase={supabase} />

      <div className="flex-1 overflow-hidden p-1">
        <PanelGroup
          direction="horizontal"
          className="rounded-xl overflow-hidden border border-neutral-strong/10"
        >
          <Panel size={50} minSize={33}>
            <div className="h-full bg-primary-muted/10">
              <History workspaceId={loaderData.slug} />
            </div>
          </Panel>

          <Panel size={50} minSize={33}>
            <PanelGroup direction="vertical">
              <Panel size={70}>
                <DataPreview workspaceId={loaderData.slug} />
              </Panel>
              <Panel size={30}>
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
