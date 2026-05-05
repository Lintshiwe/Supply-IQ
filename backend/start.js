import { createServer } from "node:http";

const PORT = process.env.PORT || 8080;

async function start() {
  try {
    const mod = await import("./dist/server/index.js");
    const handler = mod.default || mod.createServerEntry;

    if (!handler) throw new Error("No handler found");

    const server = createServer(async (req, res) => {
      // Health check
      if (req.url === "/api/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ status: "healthy", version: "1.0.5" }));
      }

      try {
        // Convert Node req to Web Request
        const url = `http://${req.headers.host || "localhost"}${req.url}`;
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

        const webReq = new Request(url, {
          method: req.method,
          headers,
          body,
        });

        const response = await handler(webReq);

        // Send back response
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
        res.writeHead(500);
        res.end("Internal Server Error");
      }
    });

    server.listen(PORT, () => console.log(`SupplyIQ running on http://localhost:${PORT}`));
  } catch (e) {
    console.error("Startup error:", e.message);
    // Fallback
    const s = createServer((_, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<h1>SupplyIQ</h1><p>API Running</p>");
    });
    s.listen(PORT, () => console.log(`Fallback on ${PORT}`));
  }
}

start();
