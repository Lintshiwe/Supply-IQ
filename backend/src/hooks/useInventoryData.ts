import { useMemo } from "react";
import { useDemo } from "@/hooks/useDemo";
import { useAuth } from "@/hooks/useAuth";
import type {
  Item,
  Category,
  Supplier,
  Location,
  StockMovement,
  PurchaseOrder,
  InventoryRequest,
} from "@/types/inventory";
import type { ItemFilters, StockSummary } from "@/lib/demo-store";

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Data hooks that bridge DemoStore (unauthenticated demo) and PostgreSQL (authenticated).
 * When authenticated with a workspace, these will call server functions.
 * Otherwise, they fall back to the in-memory DemoStore.
 */

export function useItems(filters?: ItemFilters): QueryResult<Item[]> {
  const { isDemo, demoStore, version } = useDemo();
  const { isAuthenticated } = useAuth();

  return useMemo(() => {
    // Authenticated mode: data comes from server (loaded via React Query elsewhere)
    // Demo mode: data comes from in-memory DemoStore
    if (isDemo && demoStore) return { data: demoStore.getItems(filters), isLoading: false, error: null };
    if (isAuthenticated) return { data: [] as Item[], isLoading: true, error: null };
    return { data: [] as Item[], isLoading: false, error: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, isAuthenticated, demoStore, version, filters?.categoryId, filters?.supplierId, filters?.status, filters?.search, filters?.locationId]);
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
  const { isAuthenticated } = useAuth();

  return useMemo(() => {
    if (isDemo && demoStore) return { data: [...demoStore.getSuppliers()], isLoading: false, error: null };
    if (isAuthenticated) return { data: [] as Supplier[], isLoading: true, error: null };
    return { data: [] as Supplier[], isLoading: false, error: null };
  }, [isDemo, isAuthenticated, demoStore, version]);
}

export function useLocations(): QueryResult<Location[]> {
  const { isDemo, demoStore, version } = useDemo();
  const { isAuthenticated } = useAuth();

  return useMemo(() => {
    if (isDemo && demoStore) return { data: demoStore.getLocations(), isLoading: false, error: null };
    if (isAuthenticated) return { data: [] as Location[], isLoading: true, error: null };
    return { data: [] as Location[], isLoading: false, error: null };
  }, [isDemo, isAuthenticated, demoStore, version]);
}

export function useMovements(limit?: number): QueryResult<StockMovement[]> {
  const { isDemo, demoStore, version } = useDemo();
  const { isAuthenticated } = useAuth();

  return useMemo(() => {
    if (isDemo && demoStore) {
      const data = limit ? demoStore.getRecentMovements(limit) : demoStore.getMovements();
      return { data, isLoading: false, error: null };
    }
    if (isAuthenticated) return { data: [] as StockMovement[], isLoading: true, error: null };
    return { data: [] as StockMovement[], isLoading: false, error: null };
  }, [isDemo, isAuthenticated, demoStore, version, limit]);
}

export function useStockSummary(): QueryResult<StockSummary> {
  const { isDemo, demoStore, version } = useDemo();
  const { isAuthenticated } = useAuth();

  return useMemo(() => {
    if (isDemo && demoStore) return { data: demoStore.getStockSummary(), isLoading: false, error: null };
    if (isAuthenticated) return { data: { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 }, isLoading: true, error: null };
    return { data: { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 }, isLoading: false, error: null };
  }, [isDemo, isAuthenticated, demoStore, version]);
}

export function usePurchaseOrders(): QueryResult<PurchaseOrder[]> {
  const { isDemo, demoStore, version } = useDemo();
  const { isAuthenticated } = useAuth();

  return useMemo(() => {
    if (isDemo && demoStore) return { data: [...demoStore.getPurchaseOrders()], isLoading: false, error: null };
    if (isAuthenticated) return { data: [] as PurchaseOrder[], isLoading: true, error: null };
    return { data: [] as PurchaseOrder[], isLoading: false, error: null };
  }, [isDemo, isAuthenticated, demoStore, version]);
}

export function useRequests(): QueryResult<InventoryRequest[]> {
  const { isDemo, demoStore, version } = useDemo();
  const { isAuthenticated } = useAuth();

  return useMemo(() => {
    if (isDemo && demoStore) return { data: [...demoStore.getRequests()], isLoading: false, error: null };
    if (isAuthenticated) return { data: [] as InventoryRequest[], isLoading: true, error: null };
    return { data: [] as InventoryRequest[], isLoading: false, error: null };
  }, [isDemo, isAuthenticated, demoStore, version]);
}
