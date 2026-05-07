import type { IncomingMessage, ServerResponse } from "node:http";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * API route handler middleware.
 * Intercepts /api/* requests and routes them to the appropriate handler functions.
 */
export async function handleApiRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const path = url.pathname;
  const method = req.method?.toUpperCase() || "GET";

  // CORS headers — allow requests from landing site and any origin in dev
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return true;
  }

  if (!path.startsWith("/api/")) return false;

  // Parse JSON body for POST/PUT requests
  let body: Record<string, unknown> = {};
  if (method === "POST" || method === "PUT") {
    try {
      body = await parseBody(req);
    } catch {
      // body parsing failed, continue with empty body
    }
  }

  try {
    const result = await routeApiRequest(method, path, body, url.searchParams, req);

    // Handle file download response
    if (result && typeof result === "object" && "filename" in result && "content" in result) {
      const fileResult = result as { filename: string; content: string; mimeType: string };
      res.writeHead(200, {
        "Content-Type": fileResult.mimeType,
        "Content-Disposition": `attachment; filename="${fileResult.filename}"`,
      });
      res.end(fileResult.content);
      return true;
    }

    sendJson(res, 200, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    sendJson(res, err instanceof Error && err.message.includes("Invalid") ? 400 : 500, { error: message });
  }
  return true;
}

async function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  const json = JSON.stringify(data);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(json);
}

async function routeApiRequest(
  method: string,
  path: string,
  body: Record<string, unknown>,
  params: URLSearchParams,
  req: IncomingMessage,
): Promise<unknown> {
  // Extract workspaceId from session cookie for authenticated requests
  function getWorkspaceId(): string {
    const cookie = req.headers.cookie || "";
    const match = cookie.match(/session=([^;]+)/);
    if (match) {
      try {
        const buf = Buffer.from(match[1], "base64url").toString();
        const parts = buf.split(":");
        if (parts.length >= 3) return parts[2]; // workspaceId is the 3rd field
      } catch {}
    }
    return "";
  }

  const wsId = getWorkspaceId();
  // Auth endpoints
  if (path === "/api/register" && method === "POST") {
    const { registerUser } = await import("./auth");
    return registerUser(body as any);
  }
  if (path === "/api/login" && method === "POST") {
    const { loginUser } = await import("./auth");
    return loginUser(body as any);
  }
  if (path === "/api/logout" && method === "POST") {
    const { logoutUser } = await import("./auth");
    return logoutUser();
  }
  if (path === "/api/activate" && method === "POST") {
    const { activateSubscription } = await import("./auth");
    return activateSubscription(body as any);
  }
  if (path === "/api/request-key" && method === "POST") {
    const { requestActivationKey } = await import("./auth");
    return requestActivationKey(body as any);
  }
  if (path === "/api/cancel" && method === "POST") {
    const { cancelSubscription } = await import("./auth");
    return cancelSubscription(body as any);
  }

  // Device management
  if (path === "/api/devices" && method === "GET") {
    const { getDevices } = await import("./auth");
    return getDevices({ workspaceId: params.get("workspaceId") || "" });
  }
  if (path === "/api/devices" && method === "POST") {
    const { registerDevice } = await import("./auth");
    return registerDevice(body as any);
  }
  if (path === "/api/devices/remove" && method === "POST") {
    const { removeDevice } = await import("./auth");
    return removeDevice(body as any);
  }

  // Download activation key file
  if (path === "/api/download-key" && method === "GET") {
    const { downloadActivationKey } = await import("./auth");
    return downloadActivationKey({
      workspaceId: params.get("workspaceId") || "",
      userId: params.get("userId") || "",
    });
  }

  // Item CRUD endpoints
  if (path === "/api/items" && method === "GET") {
    const { handleGetItems } = await import("./items");
    return handleGetItems(wsId || body.workspaceId as string);
  }
  if (path === "/api/items/lookup" && method === "GET") {
    const barcode = params.get("barcode");
    if (!barcode) throw new Error("barcode query param required");
    const { handleLookupByBarcode } = await import("./items");
    return handleLookupByBarcode(wsId || body.workspaceId as string, barcode);
  }
  if (path === "/api/items" && method === "POST") {
    const { handleCreateItem } = await import("./items");
    return handleCreateItem({ ...body, workspaceId: wsId || body.workspaceId } as any);
  }
  if (path === "/api/items/update" && method === "POST") {
    const { handleUpdateItem } = await import("./items");
    return handleUpdateItem(body.id as string, wsId || body.workspaceId as string, body.updates as Record<string, unknown>);
  }
  if (path === "/api/items/delete" && method === "POST") {
    const { handleDeleteItem } = await import("./items");
    return handleDeleteItem(body.id as string, wsId || body.workspaceId as string);
  }

  // Supplier endpoints
  if (path === "/api/suppliers" && method === "GET") {
    const { handleGetSuppliers } = await import("./suppliers");
    return handleGetSuppliers(wsId || body.workspaceId as string);
  }
  if (path === "/api/suppliers" && method === "POST") {
    const { handleCreateSupplier } = await import("./suppliers");
    return handleCreateSupplier({ ...body, workspaceId: wsId || body.workspaceId } as any);
  }
  if (path === "/api/suppliers/update" && method === "POST") {
    const { handleUpdateSupplier } = await import("./suppliers");
    return handleUpdateSupplier(body.id as string, wsId || body.workspaceId as string, body.updates as Record<string, unknown>);
  }
  if (path === "/api/suppliers/delete" && method === "POST") {
    const { handleDeleteSupplier } = await import("./suppliers");
    return handleDeleteSupplier(body.id as string, wsId || body.workspaceId as string);
  }

  // Movement endpoints
  if (path === "/api/movements" && method === "GET") {
    const { handleGetMovements } = await import("./movements");
    return handleGetMovements(wsId || body.workspaceId as string);
  }
  if (path === "/api/movements" && method === "POST") {
    const { handleCreateMovement } = await import("./movements");
    return handleCreateMovement({ ...body, workspaceId: wsId || body.workspaceId } as any);
  }

  // Purchase order endpoints
  if (path === "/api/purchase-orders" && method === "GET") {
    const { handleGetPurchaseOrders } = await import("./purchase-orders");
    return handleGetPurchaseOrders(wsId || body.workspaceId as string);
  }
  if (path === "/api/purchase-orders" && method === "POST") {
    const { handleCreatePO } = await import("./purchase-orders");
    return handleCreatePO({ ...body, workspaceId: wsId || body.workspaceId } as any);
  }
  if (path === "/api/purchase-orders/update" && method === "POST") {
    const { handleUpdatePO } = await import("./purchase-orders");
    return handleUpdatePO(body.id as string, wsId || body.workspaceId as string, body.updates as Record<string, unknown>);
  }
  if (path === "/api/purchase-orders/delete" && method === "POST") {
    const { handleDeletePO } = await import("./purchase-orders");
    return handleDeletePO(body.id as string, wsId || body.workspaceId as string);
  }

  // Location endpoints
  if (path === "/api/locations" && method === "GET") {
    const { handleGetLocations } = await import("./locations");
    return handleGetLocations(wsId || body.workspaceId as string);
  }
  if (path === "/api/locations" && method === "POST") {
    const { handleCreateLocation } = await import("./locations");
    return handleCreateLocation({ ...body, workspaceId: wsId || body.workspaceId } as any);
  }
  if (path === "/api/locations/update" && method === "POST") {
    const { handleUpdateLocation } = await import("./locations");
    return handleUpdateLocation(body.id as string, wsId || body.workspaceId as string, body.updates as Record<string, unknown>);
  }
  if (path === "/api/locations/delete" && method === "POST") {
    const { handleDeleteLocation } = await import("./locations");
    return handleDeleteLocation(body.id as string, wsId || body.workspaceId as string);
  }

  // Category endpoints
  if (path === "/api/categories" && method === "GET") {
    const { handleGetCategories } = await import("./categories");
    return handleGetCategories(wsId || body.workspaceId as string);
  }
  if (path === "/api/categories" && method === "POST") {
    const { handleCreateCategory } = await import("./categories");
    return handleCreateCategory({ ...body, workspaceId: wsId || body.workspaceId } as any);
  }
  if (path === "/api/categories/update" && method === "POST") {
    const { handleUpdateCategory } = await import("./categories");
    return handleUpdateCategory(body.id as string, wsId || body.workspaceId as string, body.updates as Record<string, unknown>);
  }
  if (path === "/api/categories/delete" && method === "POST") {
    const { handleDeleteCategory } = await import("./categories");
    return handleDeleteCategory(body.id as string, wsId || body.workspaceId as string);
  }

  // Request endpoints
  if (path === "/api/requests" && method === "GET") {
    const { handleGetRequests } = await import("./requests");
    return handleGetRequests(wsId || body.workspaceId as string);
  }
  if (path === "/api/requests" && method === "POST") {
    const { handleCreateRequest } = await import("./requests");
    return handleCreateRequest({ ...body, workspaceId: wsId || body.workspaceId } as any);
  }
  if (path === "/api/requests/approve" && method === "POST") {
    const { handleApproveRequest } = await import("./requests");
    return handleApproveRequest(body.id as string, wsId || body.workspaceId as string, body.approvedBy as string);
  }
  if (path === "/api/requests/decline" && method === "POST") {
    const { handleDeclineRequest } = await import("./requests");
    return handleDeclineRequest(body.id as string, wsId || body.workspaceId as string, body.declineReason as string);
  }

  // User management endpoints
  if (path === "/api/users" && method === "GET") {
    const { handleGetUsers } = await import("./users");
    return handleGetUsers(wsId || body.workspaceId as string);
  }
  if (path === "/api/users/invite" && method === "POST") {
    const { handleInviteUser } = await import("./users");
    return handleInviteUser({ ...body, workspaceId: wsId || body.workspaceId } as any);
  }
  if (path === "/api/users/update-role" && method === "POST") {
    const { handleUpdateUserRole } = await import("./users");
    return handleUpdateUserRole(body.id as string, wsId || body.workspaceId as string, body.role as string);
  }
  if (path === "/api/users/toggle-status" && method === "POST") {
    const { handleToggleUserStatus } = await import("./users");
    return handleToggleUserStatus(body.id as string, wsId || body.workspaceId as string, body.isActive as boolean);
  }

  // Stock summary endpoint
  if (path === "/api/stock-summary" && method === "GET") {
    const { handleGetStockSummary } = await import("./items");
    return handleGetStockSummary(wsId || body.workspaceId as string);
  }

  // Health check
  if (path === "/api/health" && method === "GET") {
    const { handleHealthCheck } = await import("./health");
    return handleHealthCheck();
  }

  // Scan log endpoints (mobile scanner)
  if (path === "/api/scan" && method === "GET") {
    const barcode = params.get("barcode");
    if (!barcode) throw new Error("barcode query param required");
    const { handleLookupByBarcode } = await import("./items");
    return handleLookupByBarcode(wsId || body.workspaceId as string, barcode, true);
  }
  if (path === "/api/scan-log" && method === "POST") {
    const { handleCreateScanLog } = await import("./scan-logs");
    return handleCreateScanLog({ ...body, workspaceId: wsId || body.workspaceId } as any);
  }
  if (path === "/api/scan-logs" && method === "GET") {
    const { handleGetScanLogs } = await import("./scan-logs");
    return handleGetScanLogs(wsId || body.workspaceId as string, 50);
  }

  throw new Error(`Unknown API endpoint: ${method} ${path}`);
}
