/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "../db";
import { locations } from "../db/schema";
import { eq, and } from "drizzle-orm";

export async function handleGetLocations(workspaceId: string) {
  return db.select().from(locations).where(eq(locations.workspaceId, workspaceId));
}

export async function handleCreateLocation(data: { workspaceId: string; name: string; type?: string; parentId?: string | null; description?: string; address?: string }) {
  const [l] = await db.insert(locations).values({
    workspaceId: data.workspaceId, name: data.name, type: (data.type as any) ?? "warehouse",
    parentId: data.parentId ?? null, description: data.description ?? "", address: data.address ?? "",
  }).returning();
  return l;
}

export async function handleUpdateLocation(id: string, workspaceId: string, updates: Record<string, unknown>) {
  const d: Record<string, unknown> = { ...updates, updatedAt: new Date() };
  const [l] = await db.update(locations).set(d as any).where(and(eq(locations.id, id), eq(locations.workspaceId, workspaceId))).returning();
  return l;
}

export async function handleDeleteLocation(id: string, workspaceId: string) {
  await db.delete(locations).where(and(eq(locations.id, id), eq(locations.workspaceId, workspaceId)));
  return { success: true };
}
