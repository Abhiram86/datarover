import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentUserFn } from "@/utils/auth.functions";
import { useUserStore } from "@/store/user";
import { useEffect } from "react";

export const Route = createFileRoute("/_authed")({
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
});

function RouteComponent() {
  const { user } = Route.useRouteContext();
  const setUser = useUserStore((s) => s.actions.setUser);

  useEffect(() => {
    if (user) setUser(user);
  }, [user, setUser]);

  return <Outlet />;
}
