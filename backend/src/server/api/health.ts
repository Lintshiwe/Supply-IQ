import { db } from "../db";

/**
 * Health check — verifies the app and database are running.
 */
export async function handleHealthCheck() {
  let dbStatus: "connected" | "error" = "error";
  try {
    await db.execute("SELECT 1");
    dbStatus = "connected";
  } catch {
    dbStatus = "error";
  }

  return {
    status: dbStatus === "connected" ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    services: {
      app: "running",
      database: dbStatus,
    },
    version: "1.0.0",
  };
}
