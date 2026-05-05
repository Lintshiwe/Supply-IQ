import { db } from "../db";
import { notifications, notificationPrefs } from "../db/schema";
import { eq, desc } from "drizzle-orm";

export async function handleGetNotifications(workspaceId: string) {
  return db.select().from(notifications).where(eq(notifications.workspaceId, workspaceId)).orderBy(desc(notifications.createdAt));
}

export async function handleMarkAsRead(id: string, workspaceId: string) {
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  return { success: true };
}

export async function handleMarkAllAsRead(workspaceId: string) {
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.workspaceId, workspaceId));
  return { success: true };
}

export async function handleDismissNotification(id: string) {
  await db.delete(notifications).where(eq(notifications.id, id));
  return { success: true };
}

export async function handleGetNotificationPrefs(workspaceId: string) {
  const [prefs] = await db.select().from(notificationPrefs).where(eq(notificationPrefs.workspaceId, workspaceId));
  return prefs ?? null;
}

export async function handleUpdateNotificationPrefs(workspaceId: string, prefs: { lowStock?: boolean; zeroStock?: boolean; poReminder?: boolean; poOverdue?: boolean; requestUpdate?: boolean }) {
  const existing = await db.select().from(notificationPrefs).where(eq(notificationPrefs.workspaceId, workspaceId));
  if (existing.length === 0) {
    await db.insert(notificationPrefs).values({ workspaceId, ...prefs });
  } else {
    await db.update(notificationPrefs).set(prefs).where(eq(notificationPrefs.workspaceId, workspaceId));
  }
  return { success: true };
}
