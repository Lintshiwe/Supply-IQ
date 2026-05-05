/**
 * SupplyIQ — Production Server
 * Starts an HTTP server serving the TanStack Start app.
 */
const { createServer } = require("http");
const { execSync } = require("child_process");

const PORT = process.env.PORT || 10000;

// Simple proxy: forwards all requests to the TanStack Start dev server
// or serves the built static + API from dist/
async function start() {
  try {
    // Try using the built server handler
    const mod = await import("./dist/server/index.js");
    const handler = mod.default || mod.createServerEntry;

    if (handler) {
      const server = createServer(async (req, res) => {
        try {
          // Add CORS headers
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type");

          if (req.method === "OPTIONS") {
            res.writeHead(204);
            res.end();
            return;
          }

          // Health check
          if (req.url === "/api/health") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              status: "healthy",
              timestamp: new Date().toISOString(),
              services: { app: "running" },
              version: "1.0.5"
            }));
            return;
          }

          // Forward to TanStack handler
          const response = await handler(req);

          // Set headers
          const headers = {};
          if (response.headers) {
            response.headers.forEach((value, key) => {
              headers[key] = value;
            });
          }
          if (!headers["content-type"]) {
            headers["content-type"] = "text/html";
          }

          res.writeHead(response.status || 200, headers);

          // Stream body
          if (response.body) {
            if (typeof response.body.pipe === "function") {
              response.body.pipe(res);
            } else if (response.body.getReader) {
              const reader = response.body.getReader();
              const pump = async () => {
                const { done, value } = await reader.read();
                if (done) { res.end(); return; }
                res.write(value);
                await pump();
              };
              await pump();
            } else if (typeof response.body === "string") {
              res.end(response.body);
            } else {
              res.end();
            }
          } else {
            res.end();
          }
        } catch (err) {
          console.error("Request error:", err.message);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Internal Server Error" }));
        }
      });

      server.listen(PORT, () => {
        console.log(`SupplyIQ running on port ${PORT}`);
      });
    }
  } catch (err) {
    console.error("Failed to start:", err.message);
    // Fallback: start dev server
    console.log("Falling back to dev server...");
    execSync(`bun run dev`, { 
      cwd: __dirname,
      stdio: "inherit",
      env: { ...process.env, PORT: String(PORT) }
    });
  }
}

start();
