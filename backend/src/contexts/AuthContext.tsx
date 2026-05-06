import { createContext, useCallback, useMemo, useState, useEffect, type ReactNode } from "react";
import type { UserRoleType } from "@/lib/roles";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRoleType;
}

export interface AuthWorkspace {
  id: string;
  name: string;
}

export interface AuthSubscription {
  isActive: boolean;
  isDemo: boolean;
  isExpired: boolean;
  tier: string;
  expiresAt: string | Date | null;
}

export interface AuthContextValue {
  user: AuthUser | null;
  workspace: AuthWorkspace | null;
  subscription: AuthSubscription | null;
  isAuthenticated: boolean;
  isActivated: boolean;
  isDemo: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (data: { email: string; name: string; password: string; companyName: string }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  activate: (key: string) => Promise<void>;
  requestKey: (tier: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [workspace, setWorkspace] = useState<AuthWorkspace | null>(null);
  const [subscription, setSubscription] = useState<AuthSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Start false for SSR match
  const [sessionChecked, setSessionChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Auto-check session on mount
  useEffect(() => {
    setIsLoading(true);
    fetch("/api/session")
      .then(r => r.json())
      .then(data => {
        if (data.authenticated && data.user) {
          setUser(data.user);
          setWorkspace(data.workspace);
          setSubscription(data.subscription);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
        setSessionChecked(true);
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Login failed");
      if (data.sessionCookie) {
        document.cookie = data.sessionCookie;
      }
      setUser(data.user);
      setWorkspace(data.workspace);
      setSubscription(data.subscription);
      return data.user;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (regData: { email: string; name: string; password: string; companyName: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Registration failed");
      if (data.sessionCookie) {
        document.cookie = data.sessionCookie;
      }
      setUser(data.user);
      setWorkspace(data.workspace);
      setSubscription(data.subscription);
      return data.user;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try { await fetch("/api/logout", { method: "POST" }); } catch {}
    setUser(null); setWorkspace(null); setSubscription(null); setError(null);
    setSubscription(null);
    setError(null);
  }, []);

  const activate = useCallback(async (key: string) => {
    if (!workspace) throw new Error("No workspace found");
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activationKey: key, workspaceId: workspace.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Activation failed");
      setSubscription((prev) => prev ? { ...prev, ...data } : null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Activation failed";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [workspace]);

  const requestKey = useCallback(async (tier: string) => {
    if (!workspace) throw new Error("No workspace found");
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/request-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id, tier }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Request failed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to request activation key";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [workspace]);

  const cancelSubscription = useCallback(async () => {
    if (!workspace) throw new Error("No workspace found");
    setIsLoading(true);
    try {
      const response = await fetch("/api/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Cancellation failed");
      setSubscription((prev) => prev ? { ...prev, isActive: false, isExpired: false } : null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to cancel subscription";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [workspace]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    workspace,
    subscription,
    isAuthenticated: user !== null,
    isActivated: subscription?.isActive ?? false,
    isDemo: subscription?.isDemo ?? true,
    isLoading,
    error,
    login,
    register,
    logout,
    activate,
    requestKey,
    cancelSubscription,
    clearError,
  }), [user, workspace, subscription, isLoading, error, login, register, logout, activate, requestKey, cancelSubscription, clearError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
