import {
  createFileRoute,
  useRouteContext,
  redirect,
} from "@tanstack/react-router";
import History from "@/components/Chat/History";
import DataPreview from "@/components/DataPreview";
import { Panel } from "@/components/Panels/Panel";
import { PanelGroup } from "@/components/Panels/PanelGroup";
import WorkspaceHeader from "@/components/WorkSpaceHeader";
import { getSupabaseEnv } from "@/utils/sensitive.functions";
import { createClient } from "@supabase/supabase-js";
import { getWorkspace } from "@/utils/workspaces.functions";
import { useFileStore } from "@/store/file";
import { queryOptions } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useConversationStore } from "@/store/conversation";
import { useUserStore } from "@/store/user";
import { getCurrentUserFn } from "@/utils/auth.functions";
import { getConversation, getMessages } from "@/utils/chat.functions";

const workspaceQuery = (id: string) =>
  queryOptions({
    queryKey: ["workspace", id],
    queryFn: () => getWorkspace({ data: id }),
  });

const conversationQuery = (id: string) =>
  queryOptions({
    queryKey: ["conversation", id],
    queryFn: () => getConversation({ data: id }),
  });

const messagesQuery = (id: string) =>
  queryOptions({
    queryKey: ["messages", id],
    queryFn: () => getMessages({ data: id }),
  });

export const Route = createFileRoute("/workspace/$slug")({
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUserFn();
    if (!user) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
    return { user };
  },
  component: RouteComponent,
  loader: async ({ params, context: { queryClient } }) => {
    const env = await getSupabaseEnv();
    const slug = params.slug;
    let data = null;
    if (slug !== "new") {
      const [workspace, conversation, messages] = await Promise.all([
        queryClient.ensureQueryData(workspaceQuery(slug)),
        queryClient.ensureQueryData(conversationQuery(slug)),
        queryClient.ensureQueryData(messagesQuery(slug)),
      ]);
      data = { workspace, conversation, messages };
    }
    console.log("slug", slug);
    return {
      env,
      slug,
      data,
    };
  },
});

function RouteComponent() {
  const loaderData = Route.useLoaderData();
  console.log("loaderData", loaderData);
  const { user } = useRouteContext({ from: "/workspace/$slug" });
  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    if (user) setUser(user);
  }, [user, setUser]);

  useEffect(() => {
    if (loaderData.slug === "new") {
      useFileStore.getState().reset();
      useConversationStore.getState().reset();
      return;
    }

    const workspaceRes = loaderData.data?.workspace;

    if (workspaceRes?.success && workspaceRes.data?.preview) {
      useFileStore.getState().setPreview(workspaceRes.data.preview);
    }
    if (loaderData.data?.messages?.success) {
      useConversationStore
        .getState()
        .setMessages(loaderData.data.messages!.data);
    }
    if (loaderData.data?.conversation?.success) {
      useConversationStore
        .getState()
        .setConversations(loaderData.data.conversation!.data);
    }
  }, [loaderData.slug, loaderData.data?.workspace?.success]);

  const workspaceError = loaderData.data?.workspace?.success === false;
  const messagesError = loaderData.data?.messages?.success === false;

  if (workspaceError) {
    const err = loaderData.data?.workspace.error;
    const message =
      typeof err === "string" ? err : (err?.message ?? "Unknown error");
    return <div>Error: {message}</div>;
  }

  if (messagesError) {
    const message = loaderData.data?.messages.error?.message ?? "Unknown error";
    return <div>Error: {message}</div>;
  }

  const supabase = useMemo(() => {
    return createClient(
      loaderData.env.data.supabaseProjectUrl,
      loaderData.env.data.supabaseAnonKey,
    );
  }, [
    loaderData.env.data.supabaseProjectUrl,
    loaderData.env.data.supabaseAnonKey,
  ]);

  return (
    <div className="h-screen w-full flex flex-col bg-primary overflow-hidden">
      <WorkspaceHeader supabase={supabase} />

      <div className="flex-1 overflow-hidden p-1">
        <PanelGroup
          direction="horizontal"
          className="rounded-xl overflow-hidden border border-neutral-strong/10"
        >
          <Panel size={25} minSize={20}>
            <div className="h-full bg-primary-muted/10">
              <History workspaceId={loaderData.slug} />
            </div>
          </Panel>

          <Panel minSize={25} size={80}>
            <PanelGroup direction="vertical">
              <Panel size={70}>
                <DataPreview />
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
