/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "../db";
import { items } from "../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";

export async function handleGetItems(workspaceId: string, search?: string, categoryId?: string, supplierId?: string, _status?: string) {
  let query = db.select().from(items).where(eq(items.workspaceId, workspaceId)).$dynamic();
  if (search) query = query.where(sql`(${items.name} ILIKE ${"%" + search + "%"} OR ${items.sku} ILIKE ${"%" + search + "%"})`);
  if (categoryId) query = query.where(eq(items.categoryId, categoryId));
  if (supplierId) query = query.where(eq(items.supplierId, supplierId));
  query = query.orderBy(desc(items.updatedAt));
  return query;
}

export async function handleGetItemById(id: string, workspaceId: string) {
  const [item] = await db.select().from(items).where(and(eq(items.id, id), eq(items.workspaceId, workspaceId)));
  return item ?? null;
}

export async function handleCreateItem(data: {
  workspaceId: string; sku: string; barcode?: string | null; name: string; description?: string;
  categoryId?: string | null; unit?: string; currentStock?: number;
  reorderPoint?: number; reorderQuantity?: number; costPrice?: number; sellingPrice?: number;
  locationId?: string | null; supplierId?: string | null; customFields?: Record<string, string | number | boolean>;
}) {
  const [item] = await db.insert(items).values({
    workspaceId: data.workspaceId, sku: data.sku, barcode: data.barcode ?? null,
    name: data.name, description: data.description ?? "", categoryId: data.categoryId ?? null,
    status: "active", unit: data.unit ?? "each", currentStock: data.currentStock ?? 0,
    reorderPoint: data.reorderPoint ?? 0, reorderQuantity: data.reorderQuantity ?? 0,
    costPrice: String(data.costPrice ?? 0), sellingPrice: String(data.sellingPrice ?? 0),
    locationId: data.locationId ?? null, supplierId: data.supplierId ?? null,
    customFields: data.customFields ?? {},
  }).returning();
  return item;
}

export async function handleUpdateItem(id: string, workspaceId: string, updates: Record<string, unknown>) {
  const updateData: Record<string, unknown> = { ...updates, updatedAt: new Date() };
  const [item] = await db.update(items).set(updateData as any).where(and(eq(items.id, id), eq(items.workspaceId, workspaceId))).returning();
  return item;
}

export async function handleDeleteItem(id: string, workspaceId: string) {
  await db.delete(items).where(and(eq(items.id, id), eq(items.workspaceId, workspaceId)));
  return { success: true };
}

export async function handleGetStockSummary(workspaceId: string) {
  const all = await db.select().from(items).where(eq(items.workspaceId, workspaceId));
  return {
    total: all.length,
    inStock: all.filter((i) => (i.currentStock ?? 0) > (i.reorderPoint ?? 0)).length,
    lowStock: all.filter((i) => (i.currentStock ?? 0) > 0 && (i.currentStock ?? 0) <= (i.reorderPoint ?? 0)).length,
    outOfStock: all.filter((i) => (i.currentStock ?? 0) === 0).length,
  };
}

export async function handleLookupByBarcode(workspaceId: string, barcode: string) {
  const results = await db
    .select()
    .from(items)
    .where(and(
      eq(items.workspaceId, workspaceId),
      sql`(${items.barcode} = ${barcode} OR ${items.sku} = ${barcode})`,
    ))
    .limit(1);
  if (results.length === 0) throw new Error(`Item not found for barcode: ${barcode}`);
  return results[0];
}
