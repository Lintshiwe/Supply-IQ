import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/contexts/AuthContext";
import { DemoProvider } from "@/contexts/DemoContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SupplyIQ" },
      { name: "description", content: "Industrial inventory management for multi-warehouse operations." },
      { property: "og:title", content: "SupplyIQ" },
      { property: "og:description", content: "Industrial inventory management for multi-warehouse operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "SupplyIQ — Inventory Command Center" },
      { name: "twitter:description", content: "Industrial inventory management for multi-warehouse operations." },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/icon.svg" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <DemoProvider>
        <RoleProvider>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
          <Toaster position="bottom-right" richColors />
        </RoleProvider>
      </DemoProvider>
    </AuthProvider>
  );
}
