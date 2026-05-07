import { useCallback, useState } from "react";
import { useDemo } from "@/hooks/useDemo";
import { useAuth } from "@/hooks/useAuth";
import type {
  Item,
  Supplier,
  Location,
  StockMovement,
  PurchaseOrder,
  InventoryRequest,
} from "@/types/inventory";
import type { DemoStore } from "@/lib/demo-store";
import { generateStockAlerts } from "@/lib/notification-generators";

interface MutationResult<TData> {
  mutate: (data: TData, opts?: { onSuccess?: () => void; onError?: (e: Error) => void }) => void;
  isLoading: boolean;
  error: Error | null;
}

function useMutation<TData>(
  demoHandler: (store: DemoStore, data: TData) => void,
  apiUrl?: string,
  buildBody?: (data: TData) => Record<string, unknown>,
): MutationResult<TData> {
  const { demoStore, bumpVersion } = useDemo();
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (data: TData, opts?: { onSuccess?: () => void; onError?: (e: Error) => void }) => {
      setIsLoading(true);
      try {
        if (demoStore) {
          demoHandler(demoStore, data);
          bumpVersion();
        } else if (isAuthenticated && apiUrl) {
          const body = buildBody ? buildBody(data) : data;
          const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "Request failed");
        } else {
          throw new Error("Save failed. Please try again or use demo mode.");
        }
        setError(null);
        opts?.onSuccess?.();
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        opts?.onError?.(err);
      } finally {
        setIsLoading(false);
      }
    },
    [demoStore, bumpVersion, isAuthenticated, apiUrl, demoHandler, buildBody],
  );

  return { mutate, isLoading, error };
}

// ─── Items ─────────────────────────────────────────────────

export function useCreateItem() {
  return useMutation<Item>(
    (store, data) => store.createItem(data),
    "/api/items",
    (data) => ({
      sku: data.sku,
      name: data.name,
      barcode: data.barcode,
      description: data.description,
      categoryId: data.categoryId,
      unit: data.unit,
      currentStock: data.currentStock,
      reorderPoint: data.reorderPoint,
      reorderQuantity: data.reorderQuantity,
      costPrice: data.costPrice,
      sellingPrice: data.sellingPrice,
      locationId: data.locationId,
      supplierId: data.supplierId,
    }),
  );
}

export function useUpdateItem() {
  return useMutation<{ id: string; updates: Partial<Item> }>(
    (store, { id, updates }) => store.updateItem(id, updates),
    "/api/items/update",
    ({ id, updates }) => ({ id, updates }),
  );
}

export function useDeleteItem() {
  return useMutation<string>(
    (store, id) => store.deleteItem(id),
    "/api/items/delete",
    (id) => ({ id }),
  );
}

// ─── Movements ────────────────────────────────────────────

export function useCreateMovement() {
  return useMutation<StockMovement>(
    (store, data) => {
      store.createMovement(data);
      generateStockAlerts(store);
    },
    "/api/movements",
    (data) => ({
      itemId: data.itemId,
      type: data.type,
      quantity: data.quantity,
      fromLocationId: data.fromLocationId,
      toLocationId: data.toLocationId,
      reference: data.reference,
      notes: data.notes,
      performedBy: data.performedBy,
    }),
  );
}

// ─── Purchase Orders ──────────────────────────────────────

export function useCreatePurchaseOrder() {
  return useMutation<PurchaseOrder>(
    (store, data) => store.createPurchaseOrder(data),
    "/api/purchase-orders",
    (data) => ({
      orderNumber: data.orderNumber,
      supplierId: data.supplierId,
      status: data.status,
      items: data.items,
      totalCost: data.totalCost,
      expectedDelivery: data.expectedDelivery,
      notes: data.notes,
      createdBy: data.createdBy,
    }),
  );
}

export function useUpdatePurchaseOrder() {
  return useMutation<{ id: string; updates: Partial<PurchaseOrder> }>(
    (store, { id, updates }) => store.updatePurchaseOrder(id, updates),
    "/api/purchase-orders/update",
    ({ id, updates }) => ({ id, updates }),
  );
}

export function useDeletePurchaseOrder() {
  return useMutation<string>(
    (store, id) => store.deletePurchaseOrder(id),
    "/api/purchase-orders/delete",
    (id) => ({ id }),
  );
}

// ─── Suppliers ────────────────────────────────────────────

export function useCreateSupplier() {
  return useMutation<Supplier>(
    (store, data) => store.createSupplier(data),
    "/api/suppliers",
    (data) => ({
      name: data.name,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      leadTimeDays: data.leadTimeDays,
      rating: data.rating,
      notes: data.notes,
    }),
  );
}

export function useUpdateSupplier() {
  return useMutation<{ id: string; updates: Partial<Supplier> }>(
    (store, { id, updates }) => store.updateSupplier(id, updates),
    "/api/suppliers/update",
    ({ id, updates }) => ({ id, updates }),
  );
}

export function useDeleteSupplier() {
  return useMutation<string>(
    (store, id) => store.deleteSupplier(id),
    "/api/suppliers/delete",
    (id) => ({ id }),
  );
}

// ─── Requests ─────────────────────────────────────────────

export function useCreateRequest() {
  return useMutation<InventoryRequest>(
    (store, data) => store.createRequest(data),
    "/api/requests",
    (data) => ({
      requestNumber: data.requestNumber,
      title: data.title,
      priority: data.priority,
      items: data.items,
      requestedBy: data.requestedBy,
      reason: data.reason,
    }),
  );
}

export function useApproveRequest() {
  return useMutation<{ id: string; approvedBy: string }>(
    (store, data) =>
      store.updateRequest(data.id, {
        status: "approved" as const,
        approvedBy: data.approvedBy,
        updatedAt: new Date().toISOString(),
      }),
    "/api/requests/approve",
    (data) => data,
  );
}

export function useDeclineRequest() {
  return useMutation<{ id: string; declineReason: string }>(
    (store, data) =>
      store.updateRequest(data.id, {
        status: "declined" as const,
        declineReason: data.declineReason,
        updatedAt: new Date().toISOString(),
      }),
    "/api/requests/decline",
    (data) => data,
  );
}

export function useUpdateRequest() {
  return useMutation<{ id: string; updates: Partial<InventoryRequest> }>(
    (store, { id, updates }) => store.updateRequest(id, updates),
    "/api/requests/update",
    ({ id, updates }) => ({ id, updates }),
  );
}

// ─── Locations ────────────────────────────────────────────

export function useCreateLocation() {
  return useMutation<Location>(
    (store, data) => store.createLocation(data),
    "/api/locations",
    (data) => ({
      name: data.name,
      type: data.type,
      parentId: data.parentId,
      description: data.description,
      address: data.address,
    }),
  );
}

export function useUpdateLocation() {
  return useMutation<{ id: string; updates: Partial<Location> }>(
    (store, { id, updates }) => store.updateLocation(id, updates),
    "/api/locations/update",
    ({ id, updates }) => ({ id, updates }),
  );
}

export function useDeleteLocation() {
  return useMutation<string>(
    (store, id) => store.deleteLocation(id),
    "/api/locations/delete",
    (id) => ({ id }),
  );
}

// ─── Categories ───────────────────────────────────────────

export function useCreateCategory() {
  return useMutation<import("@/types/inventory").Category>(
    (store, data) => store.createCategory(data),
    "/api/categories",
    (data) => ({
      name: data.name,
      description: data.description,
      parentId: data.parentId,
    }),
  );
}

export function useUpdateCategory() {
  return useMutation<{ id: string; updates: Partial<import("@/types/inventory").Category> }>(
    (store, { id, updates }) => store.updateCategory(id, updates),
    "/api/categories/update",
    ({ id, updates }) => ({ id, updates }),
  );
}

export function useDeleteCategory() {
  return useMutation<{ id: string }>(
    (store, { id }) => store.deleteCategory(id),
    "/api/categories/delete",
    ({ id }) => ({ id }),
  );
}

// ─── User Management ─────────────────────────────────────

export function useInviteUser() {
  return useMutation<{ email: string; name?: string; role: string }>(
    (store, data) =>
      store.addUser({
        id: crypto.randomUUID(),
        name: data.name || data.email.split("@")[0],
        email: data.email,
        role: data.role as any,
        status: "active",
        joinedAt: new Date().toISOString(),
      }),
    "/api/users/invite",
    (data) => data,
  );
}

export function useUpdateUserRole() {
  return useMutation<{ id: string; role: string }>(
    (store, data) => store.updateUser(data.id, { role: data.role as any }),
    "/api/users/update-role",
    (data) => data,
  );
}

export function useToggleUserStatus() {
  return useMutation<{ id: string; isActive: boolean }>(
    (store, data) =>
      store.updateUser(data.id, { status: data.isActive ? "active" : "inactive" }),
    "/api/users/toggle-status",
    (data) => data,
  );
}
