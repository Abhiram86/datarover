import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import History from "@/components/Chat/History";
import DataPreview from "@/components/DataPreview";
import { Panel } from "@/components/Panels/Panel";
import { PanelGroup } from "@/components/Panels/PanelGroup";
import WorkspaceHeader from "@/components/WorkSpaceHeader";
import { getSupabaseEnv } from "@/utils/sensitive.functions";
import { getConversation, getMessages } from "@/utils/chat.functions";
import { createClient } from "@supabase/supabase-js";
import { useFileStore } from "@/store/file";
import { useEffect, useMemo } from "react";
import { WorkspaceSkeleton } from "@/components/skeletons/WorkspaceSkeleton";
import { getWorkspacePreview } from "@/utils/workspaces.functions";
import { useSandboxStore } from "@/store/sandbox";
import { CodeEditor } from "@/components/Code";

export const Route = createFileRoute("/_authed/workspace/$slug")({
  loader: async ({ params, context }) => {
    const env = await getSupabaseEnv();
    const slug = params.slug;

    // Fetch conversation, messages, and preview in parallel
    const [workspace, conversation, messages] = await Promise.all([
      slug !== "new"
        ? context.queryClient.ensureQueryData({
            queryKey: ["workspace", slug],
            queryFn: () => getWorkspacePreview({ data: slug }),
          })
        : null,
      slug !== "new"
        ? context.queryClient.ensureQueryData({
            queryKey: ["conversation", slug],
            queryFn: () => getConversation({ data: slug }),
          })
        : null,
      slug !== "new"
        ? context.queryClient.ensureQueryData({
            queryKey: ["messages", slug],
            queryFn: () => getMessages({ data: slug }),
          })
        : null,
    ]);

    return {
      env,
      slug,
      workspace,
      conversation,
      messages,
    };
  },
  pendingComponent: WorkspaceSkeleton,
  errorComponent: ({ error }) => (
    <div className="h-screen w-full flex flex-col bg-primary overflow-hidden">
      <div className="h-16 bg-primary border-b border-neutral-strong/5" />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-neutral-strong/60 text-sm">
          Error loading workspace: {error.message}
        </div>
      </div>
    </div>
  ),
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

  const initPythonSandbox = useSandboxStore((s) => s.init);

  useEffect(() => {
    if (loaderData.slug === "new") {
      useFileStore.getState().reset();
    }
  }, [loaderData.slug]);

  useEffect(() => {
    initPythonSandbox();
  }, []);

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
              <History
                workspaceId={loaderData.slug}
                initialConversation={
                  loaderData.conversation?.success
                    ? loaderData.conversation.data
                    : null
                }
                initialMessages={
                  loaderData.messages?.success ? loaderData.messages.data : []
                }
              />
            </div>
          </Panel>

          <Panel size={50} minSize={33}>
            <PanelGroup direction="vertical">
              <Panel minSize={33} size={67}>
                <ClientOnly>
                  <DataPreview
                    workspaceId={loaderData.slug}
                    signedUrl={loaderData.workspace?.data!}
                  />
                </ClientOnly>
              </Panel>
              <Panel minSize={33} size={33}>
                <ClientOnly>
                  <CodeEditor />
                </ClientOnly>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
