/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "../db";
import { users } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "../auth/password";

export async function handleGetUsers(workspaceId: string) {
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      isOwner: users.isOwner,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.workspaceId, workspaceId))
    .orderBy(users.name);
}

export async function handleInviteUser(data: {
  workspaceId: string; email: string; name?: string; role: string;
}) {
  const norm = data.email.toLowerCase();
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, norm));

  if (existing) throw new Error("User already exists");

  const displayName = data.name || norm.split("@")[0];
  const crypto = await import("node:crypto");
  const tempPw = crypto.randomBytes(8).toString("hex");
  const pwHash = hashPassword(tempPw);

  const [user] = await db
    .insert(users)
    .values({
      email: norm,
      name: displayName,
      passwordHash: pwHash,
      role: (data.role as any) || "requestor",
      workspaceId: data.workspaceId,
      isOwner: false,
      isActive: true,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      isOwner: users.isOwner,
      createdAt: users.createdAt,
    });

  return user;
}

export async function handleUpdateUserRole(
  id: string,
  workspaceId: string,
  role: string,
) {
  // Prevent demoting the last admin
  if (role !== "admin") {
    const allUsers = await db
      .select()
      .from(users)
      .where(eq(users.workspaceId, workspaceId));
    const adminCount = allUsers.filter(
      (u) => u.role === "admin" && u.isActive,
    ).length;
    if (adminCount <= 1) {
      const target = allUsers.find((u) => u.id === id);
      if (target && target.role === "admin") {
        throw new Error("Cannot change the only admin");
      }
    }
  }

  const [user] = await db
    .update(users)
    .set({ role: role as any, updatedAt: new Date() })
    .where(and(eq(users.id, id), eq(users.workspaceId, workspaceId)))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      isOwner: users.isOwner,
      createdAt: users.createdAt,
    });

  return user;
}

export async function handleToggleUserStatus(
  id: string,
  workspaceId: string,
  isActive: boolean,
) {
  // Prevent deactivating the last admin
  if (!isActive) {
    const allUsers = await db
      .select()
      .from(users)
      .where(eq(users.workspaceId, workspaceId));
    const adminCount = allUsers.filter(
      (u) => u.role === "admin" && u.isActive,
    ).length;
    if (adminCount <= 1) {
      const target = allUsers.find((u) => u.id === id);
      if (target && target.role === "admin") {
        throw new Error("Cannot deactivate the only admin");
      }
    }
  }

  const [user] = await db
    .update(users)
    .set({ isActive, updatedAt: new Date() })
    .where(and(eq(users.id, id), eq(users.workspaceId, workspaceId)))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      isOwner: users.isOwner,
      createdAt: users.createdAt,
    });

  return user;
}
