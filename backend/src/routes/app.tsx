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
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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
    if (!isAuthenticated && !isDemo && mounted && !isLoading) {
      navigate({ to: "/" });
    }
  }, [isAuthenticated, isDemo, navigate, isLoading, mounted]);

  // Activation enforcement
  useEffect(() => {
    if (isAuthenticated && mounted && !isLoading && subscription && !subscription.isActive && !subscription.isDemo) {
      navigate({ to: "/" });
    }
  }, [isAuthenticated, isLoading, subscription, navigate, mounted]);

  // Subscription check
  useEffect(() => {
    if (isAuthenticated && !isDemo && subscription?.isExpired) {
      window.location.href = "/subscribe";
    }
  }, [isAuthenticated, isDemo, subscription?.isExpired]);

  // Always render app shell — prevents hydration mismatch (React #310)
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
            {(!mounted || isLoading) ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Loading SupplyIQ...</p>
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <PageTransition routeKey={location.pathname}>
                  <Outlet />
                </PageTransition>
              </AnimatePresence>
            )}
          </main>
        </div>
      </div>
      <BottomNav />
      <ShortcutsHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
