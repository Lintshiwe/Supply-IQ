import type { UserRoleType } from "@/lib/roles";

/** Maps route paths to the minimum roles allowed */
const ROUTE_ACCESS: Record<string, UserRoleType[]> = {
  "/app/dashboard": ["admin", "manager", "requestor"],
  "/app/catalog": ["admin", "manager", "requestor"],
  "/app/requests": ["admin", "manager", "requestor"],
  "/app/movements": ["admin", "manager"],
  "/app/suppliers": ["admin", "manager"],
  "/app/purchase-orders": ["admin", "manager", "requestor"],
  "/app/analytics": ["admin", "manager"],
  "/app/ai-insights": ["admin", "manager"],
  "/app/settings": ["admin"],
  "/app/reorder-rules": ["admin", "manager"],
  "/app/locations": ["admin", "manager"],
  "/app/help": ["admin", "manager", "requestor"],
};

/**
 * Returns true if the given role can access the path.
 * Unknown paths default to admin-only.
 */
export function canAccessRoute(path: string, role: UserRoleType): boolean {
  const allowed = ROUTE_ACCESS[path];
  if (!allowed) return role === "admin";
  return allowed.includes(role);
}

/**
 * Check if subscription allows access to the app.
 * Demo mode: access is always allowed (limited features).
 * Active subscription: access is allowed.
 * Expired/Cancelled: only dashboard and help are accessible.
 */
export function canAccessWithSubscription(
  path: string,
  role: UserRoleType,
  isActive: boolean,
  isDemo: boolean,
): boolean {
  if (isDemo) return true; // Demo mode always allows access
  if (isActive) return canAccessRoute(path, role);

  // Expired/cancelled subscription: limited access
  const limitedPaths = ["/app/dashboard", "/app/help"];
  if (limitedPaths.includes(path)) return true;
  return false;
}
