import { createServer } from "node:http";
import { Readable } from "node:stream";

const PORT = process.env.PORT || 8080;

async function start() {
  let handler;

  try {
    const mod = await import("./dist/server/index.js");
    handler = mod.default;
    console.log("Loaded TanStack Start handler");
  } catch (e) {
    console.warn("Handler load failed:", e.message);
  }

  const server = createServer(async (req, res) => {
    // Health check
    if (req.url === "/api/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status: "healthy", version: "1.0.5" }));
    }

    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");

    if (handler) {
      try {
        const response = await handler(req);
        res.writeHead(response.status || 200,
          Object.fromEntries(response.headers?.entries() || [])
        );

        if (response.body) {
          if (response.body.getReader) {
            const reader = response.body.getReader();
            for (;;) { const { done, value } = await reader.read(); if (done) break; res.write(value); }
            res.end();
          } else {
            Readable.fromWeb(response.body).pipe(res);
          }
        } else {
          res.end();
        }
        return;
      } catch (e) {
        console.error("Handler error:", e.message);
      }
    }

    // Fallback
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<html><body style="background:#0f172a;color:#e2e8f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh"><div style="text-align:center"><h1 style="color:#84cc16">SupplyIQ</h1><p>API Running</p></div></body></html>`);
  });

  server.listen(PORT, () => console.log(`SupplyIQ API on port ${PORT}`));
}

start().catch(e => { console.error(e); process.exit(1); });
