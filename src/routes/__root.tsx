/// <reference types="vite/client" />
import {
  HeadContent,
  Scripts,
  createRootRoute,
  useMatchRoute,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import Header from "../components/Header";

import appCss from "../styles.css?url";
import Footer from "@/components/Footer";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "TanStack Start Starter",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const matchRoute = useMatchRoute();
  const isWorkspaceRoute = matchRoute({ to: "/workspace" });
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="min-h-screen bg-primary text-neutral-strong selection:bg-neutral-strong selection:text-primary">
          {!isWorkspaceRoute && <Header />}
          {children}
          <TanStackDevtools
            config={{
              position: "bottom-right",
            }}
            plugins={[
              {
                name: "Tanstack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
          <Scripts />
          {!isWorkspaceRoute && <Footer />}
        </div>
      </body>
    </html>
  );
}
