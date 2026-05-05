import { db } from "../db";
import { requests } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function handleGetRequests(workspaceId: string) {
  return db.select().from(requests).where(eq(requests.workspaceId, workspaceId)).orderBy(desc(requests.createdAt));
}

export async function handleGetRequestById(id: string, workspaceId: string) {
  const [r] = await db.select().from(requests).where(and(eq(requests.id, id), eq(requests.workspaceId, workspaceId)));
  return r ?? null;
}

export async function handleCreateRequest(data: {
  workspaceId: string; requestNumber: string; title: string; priority?: string;
  items: any[]; requestedBy: string; reason?: string;
}) {
  const [r] = await db.insert(requests).values({
    workspaceId: data.workspaceId, requestNumber: data.requestNumber, title: data.title,
    priority: data.priority ?? "normal", items: data.items as any,
    requestedBy: data.requestedBy, reason: data.reason ?? "",
  }).returning();
  return r;
}

export async function handleUpdateRequest(id: string, workspaceId: string, updates: Record<string, unknown>) {
  const d = { ...updates, updatedAt: new Date() };
  const [r] = await db.update(requests).set(d).where(and(eq(requests.id, id), eq(requests.workspaceId, workspaceId))).returning();
  return r;
}

export async function handleApproveRequest(id: string, workspaceId: string, approvedBy: string) {
  const [r] = await db.update(requests).set({ status: "approved", approvedBy, updatedAt: new Date() }).where(and(eq(requests.id, id), eq(requests.workspaceId, workspaceId))).returning();
  return r;
}

export async function handleDeclineRequest(id: string, workspaceId: string, reason?: string) {
  const [r] = await db.update(requests).set({ status: "declined", declineReason: reason ?? "", updatedAt: new Date() }).where(and(eq(requests.id, id), eq(requests.workspaceId, workspaceId))).returning();
  return r;
}
