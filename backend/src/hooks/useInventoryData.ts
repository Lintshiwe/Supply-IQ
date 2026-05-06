import { useState, useEffect, useMemo } from "react";
import { useDemo } from "@/hooks/useDemo";
import { useAuth } from "@/hooks/useAuth";
import type {
  Item, Category, Supplier, Location, StockMovement,
  PurchaseOrder, InventoryRequest,
} from "@/types/inventory";
import type { ItemFilters, StockSummary } from "@/lib/demo-store";

interface QueryResult<T> { data: T; isLoading: boolean; error: Error | null; }

// Fetch helper for authenticated API calls
function useApi<T>(url: string, defaultValue: T): QueryResult<T> {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { setData(defaultValue); return; }
    setLoading(true);
    fetch(url).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => { setData(defaultValue); setLoading(false); });
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
  return useMemo(() => {
    if (isDemo && demoStore) return { data: demoStore.getCategories(), isLoading: false, error: null };
    if (isAuthenticated) return { data: [] as Category[], isLoading: true, error: null };
    return { data: [] as Category[], isLoading: false, error: null };
  }, [isDemo, isAuthenticated, demoStore, version]);
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
  return useMemo(() => {
    if (isDemo && demoStore) return { data: [...demoStore.getRequests()], isLoading: false, error: null };
    return { data: [] as InventoryRequest[], isLoading: false, error: null };
  }, [isDemo, demoStore, version]);
}
