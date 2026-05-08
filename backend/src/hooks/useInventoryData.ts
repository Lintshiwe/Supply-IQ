import { useState, useEffect, useMemo } from "react";
import { useDemo } from "@/hooks/useDemo";
import { useAuth } from "@/hooks/useAuth";
import type {
  Item, Category, Supplier, Location, StockMovement,
  PurchaseOrder, InventoryRequest,
} from "@/types/inventory";
import type { ItemFilters, StockSummary } from "@/lib/demo-store";

interface QueryResult<T> { data: T; isLoading: boolean; error: Error | null; }

// Convert snake_case keys to camelCase, and coerce numeric string values to numbers
const NUMERIC_FIELDS = new Set([
  "currentStock", "reorderPoint", "reorderQuantity",
  "costPrice", "sellingPrice", "quantity", "totalCost",
  "leadTimeDays", "rating", "maxDevices",
]);

function toCamelCase(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => (c as string).toUpperCase());
      const camelValue = toCamelCase(value);
      // Coerce numeric strings to actual numbers for known numeric fields
      // Also handle null/undefined by defaulting to 0
      if (NUMERIC_FIELDS.has(camelKey)) {
        if (camelValue === null || camelValue === undefined) {
          result[camelKey] = 0;
        } else if (typeof camelValue === "string") {
          result[camelKey] = Number(camelValue);
        } else {
          result[camelKey] = camelValue;
        }
      } else {
        result[camelKey] = camelValue;
      }
    }
    return result;
  }
  return obj;
}

// Fetch helper for authenticated API calls
function useApi<T>(url: string, defaultValue: T): QueryResult<T> {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { setData(defaultValue); return; }
    setLoading(true);
    fetch(url)
      .then(r => r.json())
      .then(d => {
        // Normalize snake_case to camelCase from production server
        const normalized = toCamelCase(d);
        // Guard: if defaultValue is an array, ensure response is also an array
        if (Array.isArray(defaultValue) && !Array.isArray(normalized)) {
          setData(defaultValue);
        } else {
          setData(normalized as T);
        }
        setLoading(false);
      })
      .catch(() => { setData(defaultValue); setLoading(false); });
  }, [url, isAuthenticated]);

  return { data, isLoading: loading, error: null };
}

export function useItems(filters?: ItemFilters): QueryResult<Item[]> {
  const { isDemo, demoStore, version } = useDemo();
  const { isAuthenticated } = useAuth();
  const apiResult = useApi<Item[]>("/api/items", []);

  return useMemo(() => {
    if (isDemo && demoStore) return { data: demoStore.getItems(filters), isLoading: false, error: null };
    if (isAuthenticated) return apiResult;
    return { data: [] as Item[], isLoading: false, error: null };
  }, [isDemo, isAuthenticated, demoStore, version, apiResult, filters?.categoryId, filters?.supplierId, filters?.status, filters?.search, filters?.locationId]);
}

export function useCategories(): QueryResult<Category[]> {
  const { isDemo, demoStore, version } = useDemo();
  const { isAuthenticated } = useAuth();
  const apiResult = useApi<Category[]>("/api/categories", []);

  return useMemo(() => {
    if (isDemo && demoStore) return { data: demoStore.getCategories(), isLoading: false, error: null };
    if (isAuthenticated && apiResult.data.length > 0) return apiResult;
    if (isAuthenticated && !apiResult.isLoading) return apiResult;
    if (isAuthenticated) return apiResult;
    return { data: [] as Category[], isLoading: false, error: null };
  }, [isDemo, isAuthenticated, demoStore, version, apiResult]);
}

export function useSuppliers(): QueryResult<Supplier[]> {
  const { isDemo, demoStore, version } = useDemo();
  const apiResult = useApi<Supplier[]>("/api/suppliers", []);

  return useMemo(() => {
    if (isDemo && demoStore) return { data: [...demoStore.getSuppliers()], isLoading: false, error: null };
    if (apiResult.data.length > 0) return apiResult;
    return { data: [] as Supplier[], isLoading: false, error: null };
  }, [isDemo, demoStore, version, apiResult]);
}

export function useLocations(): QueryResult<Location[]> {
  const { isDemo, demoStore, version } = useDemo();
  const apiResult = useApi<Location[]>("/api/locations", []);

  return useMemo(() => {
    if (isDemo && demoStore) return { data: demoStore.getLocations(), isLoading: false, error: null };
    if (apiResult.data.length > 0) return apiResult;
    return { data: [] as Location[], isLoading: false, error: null };
  }, [isDemo, demoStore, version, apiResult]);
}

export function useMovements(limit?: number): QueryResult<StockMovement[]> {
  const { isDemo, demoStore, version } = useDemo();
  const apiResult = useApi<StockMovement[]>("/api/movements", []);

  return useMemo(() => {
    if (isDemo && demoStore) {
      const data = limit ? demoStore.getRecentMovements(limit) : demoStore.getMovements();
      return { data, isLoading: false, error: null };
    }
    if (apiResult.data.length > 0) return apiResult;
    return { data: [] as StockMovement[], isLoading: false, error: null };
  }, [isDemo, demoStore, version, apiResult, limit]);
}

export function useStockSummary(): QueryResult<StockSummary> {
  const { isDemo, demoStore, version } = useDemo();
  const apiResult = useApi<StockSummary>("/api/stock-summary", { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 });

  return useMemo(() => {
    if (isDemo && demoStore) return { data: demoStore.getStockSummary(), isLoading: false, error: null };
    if (apiResult.data.total > 0) return apiResult;
    return { data: { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 }, isLoading: false, error: null };
  }, [isDemo, demoStore, version, apiResult]);
}

export function usePurchaseOrders(): QueryResult<PurchaseOrder[]> {
  const { isDemo, demoStore, version } = useDemo();
  const apiResult = useApi<PurchaseOrder[]>("/api/purchase-orders", []);

  return useMemo(() => {
    if (isDemo && demoStore) return { data: [...demoStore.getPurchaseOrders()], isLoading: false, error: null };
    if (apiResult.data.length > 0) return apiResult;
    return { data: [] as PurchaseOrder[], isLoading: false, error: null };
  }, [isDemo, demoStore, version, apiResult]);
}

export function useRequests(): QueryResult<InventoryRequest[]> {
  const { isDemo, demoStore, version } = useDemo();
  const { isAuthenticated } = useAuth();
  const apiResult = useApi<InventoryRequest[]>("/api/requests", []);

  return useMemo(() => {
    if (isDemo && demoStore) return { data: [...demoStore.getRequests()], isLoading: false, error: null };
    if (isAuthenticated && apiResult.data.length > 0) return apiResult;
    if (isAuthenticated && !apiResult.isLoading) return apiResult;
    if (isAuthenticated) return apiResult;
    return { data: [] as InventoryRequest[], isLoading: false, error: null };
  }, [isDemo, isAuthenticated, demoStore, version, apiResult]);
}

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "requestor";
  isActive: boolean;
  isOwner: boolean;
  createdAt: string;
}

export function useUsers(): QueryResult<ApiUser[]> {
  const { isDemo, demoStore, version } = useDemo();
  const { isAuthenticated } = useAuth();
  const apiResult = useApi<ApiUser[]>("/api/users", []);

  return useMemo(() => {
    if (isDemo && demoStore) {
      const demoUsers = demoStore.getUsers().map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        isActive: u.status === "active",
        isOwner: u.role === "admin",
        createdAt: u.joinedAt,
      }));
      return { data: demoUsers, isLoading: false, error: null };
    }
    if (isAuthenticated && Array.isArray(apiResult.data) && apiResult.data.length > 0) {
      // Normalize field names - production returns snake_case, dev returns camelCase
      const normalized = apiResult.data.map((u: Record<string, unknown>) => ({
        id: (u.id as string) || "",
        email: (u.email as string) || "",
        name: (u.name as string) || "",
        role: (u.role as ApiUser["role"]) || "requestor",
        isActive: (u.isActive ?? u.is_active) as boolean ?? true,
        isOwner: (u.isOwner ?? u.is_owner) as boolean ?? false,
        createdAt: (u.createdAt ?? u.created_at) as string ?? new Date().toISOString(),
      }));
      return { data: normalized, isLoading: false, error: null };
    }
    if (isAuthenticated && apiResult.isLoading) return apiResult;
    return { data: [] as ApiUser[], isLoading: false, error: null };
  }, [isDemo, isAuthenticated, demoStore, version, apiResult]);
}
