import { createContext, useMemo, useState, type ReactNode } from "react";
import { useDemo } from "@/hooks/useDemo";
import { useAuth } from "@/hooks/useAuth";
import { getPermissionsForRole, type RolePermissions, type UserRoleType } from "@/lib/roles";

export interface RoleContextValue {
  role: UserRoleType;
  permissions: RolePermissions;
  isAdmin: boolean;
  isManager: boolean;
  isRequestor: boolean;
  setDemoRole: (role: UserRoleType) => void;
}

export const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { isDemo } = useDemo();
  const { user, isAuthenticated } = useAuth();
  const [demoRole, setDemoRole] = useState<UserRoleType>("admin");

  // Role from auth session takes precedence over demo role
  const role: UserRoleType = isAuthenticated && user
    ? (user.role as UserRoleType)
    : isDemo
    ? demoRole
    : "requestor";

  const value = useMemo<RoleContextValue>(() => {
    const permissions = getPermissionsForRole(role);
    return {
      role,
      permissions,
      isAdmin: role === "admin",
      isManager: role === "manager",
      isRequestor: role === "requestor",
      setDemoRole,
    };
  }, [role]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
