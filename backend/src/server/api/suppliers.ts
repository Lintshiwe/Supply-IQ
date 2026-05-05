import { db } from "../db";
import { suppliers } from "../db/schema";
import { eq, and } from "drizzle-orm";

export async function handleGetSuppliers(workspaceId: string) {
  return db.select().from(suppliers).where(eq(suppliers.workspaceId, workspaceId));
}

export async function handleGetSupplierById(id: string, workspaceId: string) {
  const [s] = await db.select().from(suppliers).where(and(eq(suppliers.id, id), eq(suppliers.workspaceId, workspaceId)));
  return s ?? null;
}

export async function handleCreateSupplier(data: { workspaceId: string; name: string; contactName?: string; email?: string; phone?: string; address?: string; leadTimeDays?: number; rating?: number; notes?: string }) {
  const [s] = await db.insert(suppliers).values({
    workspaceId: data.workspaceId, name: data.name, contactName: data.contactName ?? "", email: data.email ?? "",
    phone: data.phone ?? "", address: data.address ?? "", leadTimeDays: data.leadTimeDays ?? 7,
    rating: String(data.rating ?? 0), notes: data.notes ?? "",
  }).returning();
  return s;
}

export async function handleUpdateSupplier(id: string, workspaceId: string, updates: Record<string, unknown>) {
  const d: Record<string, unknown> = { ...updates, updatedAt: new Date() };
  const [s] = await db.update(suppliers).set(d as any).where(and(eq(suppliers.id, id), eq(suppliers.workspaceId, workspaceId))).returning();
  return s;
}

export async function handleDeleteSupplier(id: string, workspaceId: string) {
  await db.delete(suppliers).where(and(eq(suppliers.id, id), eq(suppliers.workspaceId, workspaceId)));
  return { success: true };
}
