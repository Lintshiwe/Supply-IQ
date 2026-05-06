import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { BottomNav } from "@/components/layout/BottomNav";
import { ShortcutsHelpDialog } from "@/components/command/ShortcutsHelpDialog";
import { PageTransition } from "@/components/shared/PageTransition";
import { useDemo } from "@/hooks/useDemo";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { canAccessRoute } from "@/lib/route-guard";
import { toast } from "sonner";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { isDemo } = useDemo();
  const { role } = useRole();
  const { isAuthenticated, isLoading, subscription, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);

  useKeyboardShortcuts({ onHelpOpen: () => setHelpOpen(true) });

  // Role-based route guard (only when authenticated or in demo)
  useEffect(() => {
    if ((isAuthenticated || isDemo) && !canAccessRoute(location.pathname, role)) {
      toast.error("You don't have permission to access that page.");
      navigate({ to: "/app/dashboard" });
    }
  }, [location.pathname, role, navigate, isAuthenticated, isDemo]);

  // Auth guard — redirect to landing if not authenticated and not in demo
  useEffect(() => {
  // Show loading while session check runs
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Loading SupplyIQ...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !isDemo) {
      navigate({ to: "/" });
    }
  }, [isAuthenticated, isDemo, navigate]);

  // Subscription check — redirect to subscribe if expired and not demo
  useEffect(() => {
    if (isAuthenticated && !isDemo && subscription?.isExpired) {
      window.location.href = "/subscribe";
    }
  }, [isAuthenticated, isDemo, subscription?.isExpired]);

  if (!isAuthenticated && !isDemo) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Loading SupplyIQ...</p>
          <a href="/" className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent/90 transition-all">
            Enter Demo
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <DemoBanner />
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-[260px] shrink-0 md:block">
          <Sidebar />
        </aside>
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-8 md:pb-8">
            <AnimatePresence mode="wait">
              <PageTransition routeKey={location.pathname}>
                <Outlet />
              </PageTransition>
            </AnimatePresence>
          </main>
        </div>
      </div>
      <BottomNav />
      <ShortcutsHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
