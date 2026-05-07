/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "../db";
import { categories } from "../db/schema";
import { eq, and } from "drizzle-orm";

export async function handleGetCategories(workspaceId: string) {
  return db.select().from(categories).where(eq(categories.workspaceId, workspaceId));
}

export async function handleCreateCategory(data: {
  workspaceId: string; name: string; description?: string; parentId?: string | null;
}) {
  const [c] = await db.insert(categories).values({
    workspaceId: data.workspaceId,
    name: data.name,
    description: data.description ?? "",
    parentId: data.parentId ?? null,
  }).returning();
  return c;
}

export async function handleUpdateCategory(
  id: string, workspaceId: string, updates: Record<string, unknown>,
) {
  const d: Record<string, unknown> = { ...updates, updatedAt: new Date() };
  const [c] = await db.update(categories).set(d as any)
    .where(and(eq(categories.id, id), eq(categories.workspaceId, workspaceId)))
    .returning();
  return c;
}

export async function handleDeleteCategory(id: string, workspaceId: string) {
  await db.delete(categories)
    .where(and(eq(categories.id, id), eq(categories.workspaceId, workspaceId)));
  return { success: true };
}
