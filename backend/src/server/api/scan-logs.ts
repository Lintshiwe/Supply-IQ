import { db } from "../db";
import { scanLogs } from "../db/schema";
import { eq, desc } from "drizzle-orm";

export async function handleCreateScanLog(data: {
  workspaceId: string;
  barcode: string;
  itemId?: string;
  itemName: string;
  scannedBy: string;
  userId: string;
}) {
  const [log] = await db
    .insert(scanLogs)
    .values({
      workspaceId: data.workspaceId,
      barcode: data.barcode,
      itemId: data.itemId || null,
      itemName: data.itemName,
      scannedBy: data.scannedBy,
      userId: data.userId,
    })
    .returning();
  return log;
}

export async function handleGetScanLogs(workspaceId: string, limit = 50) {
  return db
    .select()
    .from(scanLogs)
    .where(eq(scanLogs.workspaceId, workspaceId))
    .orderBy(desc(scanLogs.createdAt))
    .limit(limit);
}
