import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = process.env.PORT || 8080;
const __dirname = dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = join(__dirname, "dist", "client");

const MIME_TYPES = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".html": "text/html",
};

function serveStatic(url, res) {
  const filePath = join(STATIC_DIR, url);
  if (!existsSync(filePath)) return false;

  const ext = extname(filePath);
  const mime = MIME_TYPES[ext] || "application/octet-stream";

  try {
    const data = readFileSync(filePath);
    res.writeHead(200, { "Content-Type": mime, "Content-Length": data.length });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

async function start() {
  try {
    const mod = await import("./dist/server/index.js");

    // TanStack Start exports: { createServerEntry: fn, default: { fetch: fn } }
    const workerEntry = mod.default;
    const handler = workerEntry?.fetch || mod.createServerEntry;

    if (!handler || typeof handler !== "function") {
      throw new Error("No valid handler found in build output");
    }

    const server = createServer(async (req, res) => {
      // Health check
      if (req.url === "/api/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ status: "healthy", version: "1.0.5" }));
      }

      // Serve static assets (JS, CSS, images, fonts)
      if (req.url && /\.(js|css|svg|png|jpg|woff2|json|ico)$/.test(req.url)) {
        if (serveStatic(req.url, res)) return;
      }

      try {
        const url = `https://${req.headers.host || "localhost"}${req.url}`;
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) {
          if (v) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
        }

        const body = req.method !== "GET" && req.method !== "HEAD"
          ? await new Promise((resolve) => {
              const chunks = [];
              req.on("data", (c) => chunks.push(c));
              req.on("end", () => resolve(Buffer.concat(chunks)));
            })
          : undefined;

        const webReq = new Request(url, { method: req.method, headers, body });
        const response = await handler(webReq);

        const resHeaders = {};
        response.headers?.forEach((v, k) => { resHeaders[k] = v; });
        res.writeHead(response.status || 200, resHeaders);

        if (response.body) {
          const reader = response.body.getReader();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
        }
        res.end();
      } catch (e) {
        console.error("Request error:", e.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
      }
    });

    server.listen(PORT, () => console.log(`SupplyIQ running on http://localhost:${PORT}`));
  } catch (e) {
    console.error("Startup error:", e.message);
    // Fallback server
    const s = createServer((_, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`<html><body style="background:#0f172a;color:#e2e8f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh"><div style="text-align:center"><h1 style="color:#84cc16">SupplyIQ</h1><p>API Running — Full site coming soon</p></div></body></html>`);
    });
    s.listen(PORT, () => console.log(`Fallback on ${PORT}`));
  }
}

start();
