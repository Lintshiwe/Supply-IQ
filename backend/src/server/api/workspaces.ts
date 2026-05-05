/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "../db";
import { workspaces, users } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "../auth/password";

export async function handleGetWorkspace(workspaceId: string) {
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId));
  return workspace ?? null;
}

export async function handleUpdateWorkspace(workspaceId: string, updates: { name?: string; address?: string; phone?: string; industry?: string }) {
  const [w] = await db.update(workspaces).set({ ...updates, updatedAt: new Date() }).where(eq(workspaces.id, workspaceId)).returning();
  return w;
}

export async function handleGetTeamMembers(workspaceId: string) {
  return db.select().from(users).where(eq(users.workspaceId, workspaceId));
}

export async function handleAddTeamMember(data: { workspaceId: string; email: string; name: string; password: string; role: string }) {
  const { email, name, password, role, workspaceId } = data;
  const [existing] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  if (existing) throw new Error("A user with this email already exists.");

  const [user] = await db.insert(users).values({
    email: email.toLowerCase(), name, passwordHash: hashPassword(password),
    role: role as any, workspaceId, isOwner: false,
  }).returning();
  return user;
}

export async function handleRemoveTeamMember(userId: string, workspaceId: string) {
  await db.update(users).set({ isActive: false }).where(and(eq(users.id, userId), eq(users.workspaceId, workspaceId)));
  return { success: true };
}
