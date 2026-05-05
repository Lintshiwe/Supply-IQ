/**
 * SupplyIQ — Node.js Production Server
 * Starts an HTTP server using the TanStack Start build output.
 */
import { createServer } from "node:http";

const PORT = process.env.PORT || 8082;

async function start() {
  try {
    // Dynamic import for TanStack Start's server entry
    const { default: handler } = await import("./dist/server/index.js");

    const server = createServer(async (req, res) => {
      try {
        const response = await handler(req);
        
        // Set headers
        res.writeHead(response.status, {
          "Content-Type": response.headers.get("content-type") || "text/html",
        });

        // Stream or send response body
        if (response.body) {
          const reader = response.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        } else {
          res.end();
        }
      } catch (err) {
        console.error("Request error:", err);
        res.writeHead(500);
        res.end("Internal Server Error");
      }
    });

    server.listen(PORT, () => {
      console.log(`SupplyIQ running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
