import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * API route handler middleware.
 * Intercepts /api/* requests and routes them to the appropriate handler functions.
 */
export async function handleApiRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const path = url.pathname;
  const method = req.method?.toUpperCase() || "GET";

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
    const result = await routeApiRequest(method, path, body, url.searchParams);
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
): Promise<unknown> {
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

  throw new Error(`Unknown API endpoint: ${method} ${path}`);
}
