import { useState, useEffect } from "react";
import { useDemo } from "@/hooks/useDemo";
import { useAuth } from "@/hooks/useAuth";
import { X } from "lucide-react";

export function DemoBanner() {
  const { isDemo, exitDemoMode } = useDemo();
  const { isAuthenticated, subscription } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // Auto-exit demo when authenticated
  useEffect(() => {
    if (isAuthenticated && isDemo) {
      exitDemoMode();
    }
  }, [isAuthenticated, isDemo, exitDemoMode]);

  // Show subscription trial banner for authenticated but not active
  if (isAuthenticated && subscription && !subscription.isActive && !subscription.isExpired) {
    if (dismissed) return null;
    const daysLeft = subscription?.expiresAt
      ? Math.max(0, Math.ceil((new Date(subscription.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

    return (
      <div className="sticky top-0 z-50 flex h-10 w-full items-center justify-between bg-accent px-3 text-sm font-medium text-accent-foreground">
        <div className="w-8 shrink-0" />
        <div className="flex items-center gap-2">
          <span>
            {subscription?.isDemo
              ? `Trial — ${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`
              : "Subscription expired"}
          </span>
          <button
            type="button"
            onClick={() => window.open("https://supplyiq.netlify.app/subscribe", "_self")}
            className="inline-flex items-center gap-1 rounded-md border border-accent-foreground/25 bg-accent-foreground/10 px-2 py-0.5 text-xs font-semibold transition-colors hover:bg-accent-foreground/20"
          >
            Subscribe Now
          </button>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="w-8 shrink-0 flex items-center justify-center rounded p-0.5 transition-colors hover:bg-accent-foreground/20"
          aria-label="Dismiss banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // Demo mode banner (unauthenticated)
  if (!isDemo || dismissed) return null;

  return (
    <div className="sticky top-0 z-50 flex h-10 w-full items-center justify-between bg-primary px-3 text-sm font-medium text-primary-foreground">
      <div className="w-8 shrink-0" />
      <div className="flex items-center gap-1.5">
        <span className="text-primary-foreground/80 text-xs bg-primary-foreground/10 px-2 py-0.5 rounded">DEMO</span>
        <span className="hidden sm:inline text-primary-foreground/80">· Limited features · data resets each session</span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="w-8 shrink-0 flex items-center justify-center rounded p-0.5 transition-colors hover:bg-primary-foreground/20"
        aria-label="Dismiss demo banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
