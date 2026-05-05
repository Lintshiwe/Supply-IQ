/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "../db";
import { purchaseOrders } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function handleGetPurchaseOrders(workspaceId: string) {
  return db.select().from(purchaseOrders).where(eq(purchaseOrders.workspaceId, workspaceId)).orderBy(desc(purchaseOrders.createdAt));
}

export async function handleGetPOById(id: string, workspaceId: string) {
  const [po] = await db.select().from(purchaseOrders).where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.workspaceId, workspaceId)));
  return po ?? null;
}

export async function handleCreatePO(data: {
  workspaceId: string; orderNumber: string; supplierId: string; status?: string;
  items: any[]; totalCost?: number; expectedDelivery?: string | null;
  notes?: string; createdBy: string;
}) {
  const [po] = await db.insert(purchaseOrders).values({
    workspaceId: data.workspaceId, orderNumber: data.orderNumber, supplierId: data.supplierId,
    status: (data.status as any) ?? "draft", items: data.items as any,
    totalCost: String(data.totalCost ?? 0), expectedDelivery: data.expectedDelivery ? new Date(data.expectedDelivery) : null,
    notes: data.notes ?? "", createdBy: data.createdBy,
  }).returning();
  return po;
}

export async function handleUpdatePO(id: string, workspaceId: string, updates: Record<string, unknown>) {
  const d: Record<string, unknown> = { ...updates, updatedAt: new Date() };
  const [po] = await db.update(purchaseOrders).set(d as any).where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.workspaceId, workspaceId))).returning();
  return po;
}

export async function handleDeletePO(id: string, workspaceId: string) {
  await db.delete(purchaseOrders).where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.workspaceId, workspaceId)));
  return { success: true };
}
