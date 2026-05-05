/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "../db";
import { movements } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function handleGetMovements(workspaceId: string, limit?: number) {
  const result = await db.select().from(movements).where(eq(movements.workspaceId, workspaceId)).orderBy(desc(movements.createdAt));
  return limit ? result.slice(0, limit) : result;
}

export async function handleGetMovementsByItem(workspaceId: string, itemId: string) {
  return db.select().from(movements).where(and(eq(movements.workspaceId, workspaceId), eq(movements.itemId, itemId))).orderBy(desc(movements.createdAt));
}

export async function handleCreateMovement(data: {
  workspaceId: string; itemId: string; type: string; quantity: number;
  fromLocationId?: string | null; toLocationId?: string | null;
  reference?: string; notes?: string; performedBy: string;
}) {
  const [m] = await db.insert(movements).values({
    workspaceId: data.workspaceId, itemId: data.itemId, type: data.type as any,
    quantity: data.quantity, fromLocationId: data.fromLocationId ?? null,
    toLocationId: data.toLocationId ?? null, reference: data.reference ?? "",
    notes: data.notes ?? "", performedBy: data.performedBy,
  }).returning();
  return m;
}
