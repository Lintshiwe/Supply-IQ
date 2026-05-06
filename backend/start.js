import { createServer } from "node:http";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, createHash } from "node:crypto";

const PORT = process.env.PORT || 8080;
const __dirname = dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = join(__dirname, "dist", "client");
const DATABASE_URL = process.env.DATABASE_URL;

const MIME_TYPES = {
  ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2",
  ".json": "application/json", ".html": "text/html",
};

// ─── Database ────────────────────────────────────────────
let sql = null;
let dbConnected = false;

async function initDB() {
  if (!DATABASE_URL) return false;
  try {
    const postgres = (await import("postgres")).default;
    sql = postgres(DATABASE_URL, { max: 5, connect_timeout: 10 });
    await sql`SELECT 1`;
    dbConnected = true;
    await ensureTables();
    console.log("Database connected");
    return true;
  } catch (e) {
    console.warn("Database not available:", e.message);
    return false;
  }
}

async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS workspaces (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      owner_id UUID,
      address TEXT, phone TEXT, industry TEXT,
      is_demo BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      workspace_id UUID NOT NULL,
      is_owner BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      last_login TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID UNIQUE NOT NULL,
      tier TEXT NOT NULL DEFAULT 'demo',
      status TEXT NOT NULL DEFAULT 'demo',
      activation_key_hash TEXT,
      starts_at TIMESTAMPTZ, expires_at TIMESTAMPTZ,
      max_devices INT DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS activation_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL,
      key_hash TEXT UNIQUE NOT NULL,
      tier TEXT NOT NULL,
      is_used BOOLEAN DEFAULT false,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;
}

// ─── Auth Helpers ────────────────────────────────────────
function hashPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  const h = createHash("sha256").update(salt + pw).digest("hex");
  return `${salt}:${h}`;
}

function verifyPassword(pw, stored) {
  const [salt, h] = stored.split(":");
  return createHash("sha256").update(salt + pw).digest("hex") === h;
}

const SESSIONS = new Map();
function createSession(userId, workspaceId, role) {
  const token = randomBytes(32).toString("hex");
  SESSIONS.set(token, { userId, workspaceId, role, created: Date.now() });
  return token;
}

// ─── Static Files ────────────────────────────────────────
function serveStatic(url, res) {
  // Try exact match first
  let filePath = join(STATIC_DIR, url);
  if (existsSync(filePath)) {
    try {
      const data = readFileSync(filePath);
      const mime = MIME_TYPES[extname(filePath)] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": mime, "Content-Length": data.length });
      res.end(data);
      return true;
    } catch {}
  }

  // Handle hashed filenames: /assets/styles-ABC123.css → find styles-*.css
  const match = url.match(/^(.*\/)([a-zA-Z]+)-[a-zA-Z0-9]+\.(\w+)$/);
  if (match) {
    const dir = join(STATIC_DIR, match[1]);
    const prefix = match[2];
    const ext = match[3];
    if (existsSync(dir)) {
      const files = readdirSync(dir);
      const found = files.find(f => f.startsWith(prefix + "-") && f.endsWith("." + ext));
      if (found) {
        filePath = join(dir, found);
        try {
          const data = readFileSync(filePath);
          const mime = MIME_TYPES["." + ext] || "application/octet-stream";
          res.writeHead(200, { "Content-Type": mime, "Content-Length": data.length, "Cache-Control": "public, max-age=31536000" });
          res.end(data);
          return true;
        } catch {}
      }
    }
  }
  return false;
}

// ─── API Routes ──────────────────────────────────────────
async function handleApiRoute(req, res) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if (req.url === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ status: "healthy", version: "1.0.5", db: dbConnected }));
  }

  // Session check — returns current user from cookie
  if (req.url === "/api/session" && req.method === "GET") {
    const cookie = req.headers.cookie || "";
    const match = cookie.match(/session=([^;]+)/);
    if (match && SESSIONS.has(match[1])) {
      const s = SESSIONS.get(match[1]);
      if (dbConnected) {
        try {
          const [user] = await sql`SELECT * FROM users WHERE id = ${s.userId}::uuid`;
          const [ws] = await sql`SELECT * FROM workspaces WHERE id = ${s.workspaceId}::uuid`;
          const [sub] = await sql`SELECT * FROM subscriptions WHERE workspace_id = ${s.workspaceId}::uuid`;
          if (user) {
            return json(res, 200, {
              authenticated: true,
              user: { id: user.id, email: user.email, name: user.name, role: user.role },
              workspace: ws ? { id: ws.id, name: ws.name } : { id: s.workspaceId, name: "Workspace" },
              subscription: sub ? {
                tier: sub.tier, status: sub.status,
                isActive: sub.status === "active" && new Date(sub.expires_at) > new Date(),
                isDemo: sub.tier === "demo" || sub.status === "demo",
                isExpired: sub.status !== "active" && new Date(sub.expires_at) < new Date(),
                expiresAt: sub.expires_at?.toISOString(), maxDevices: sub.max_devices || 1,
              } : { tier: "demo", status: "demo", isActive: false, isDemo: true, isExpired: false, maxDevices: 1 },
            });
          }
        } catch (e) { console.warn("Session DB query failed:", e.message); }
      }
      // Fallback for demo or DB not available
      return json(res, 200, {
        authenticated: true,
        user: { id: s.userId, email: "", name: "User", role: s.role },
        workspace: { id: s.workspaceId, name: "Workspace" },
        subscription: { tier: "active", status: "active", isActive: true, isDemo: false, isExpired: false, maxDevices: 1 },
      });
    }
    return json(res, 200, { authenticated: false, user: null });
  }

  // Parse body
  let body = {};
  if (req.method === "POST") {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = JSON.parse(Buffer.concat(chunks).toString());
    } catch {}
  }

  try {
    // Register
    if (req.url === "/api/register" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "Database not connected" });
      const { email, name, password, companyName } = body;
      if (!email || !password || !name) return json(res, 400, { error: "Missing fields" });

      const norm = email.toLowerCase();
      const [existing] = await sql`SELECT id FROM users WHERE email = ${norm}`;
      if (existing) return json(res, 400, { error: "Account already exists" });

      const slug = (companyName || name).toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36);
      const [ws] = await sql`INSERT INTO workspaces (name, slug) VALUES (${companyName || name}, ${slug}) RETURNING id`;
      const [user] = await sql`INSERT INTO users (email, name, password_hash, role, workspace_id, is_owner)
        VALUES (${norm}, ${name}, ${hashPassword(password)}, 'admin', ${ws.id}, true) RETURNING id, email, name, role, workspace_id`;

      const now = new Date();
      const trialEnds = new Date(now.getTime() + 14 * 86400000);
      await sql`UPDATE workspaces SET owner_id = ${user.id} WHERE id = ${ws.id}`;
      await sql`INSERT INTO subscriptions (workspace_id, tier, status, starts_at, expires_at, max_devices)
        VALUES (${ws.id}, 'demo', 'demo', ${now.toISOString()}, ${trialEnds.toISOString()}, 1)`;

      const token = createSession(user.id, ws.id, user.role);
      return json(res, 200, {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        workspace: { id: ws.id, name: companyName || name },
        subscription: { tier: "demo", status: "demo", isActive: false, isDemo: true, isExpired: false, expiresAt: trialEnds.toISOString() },
        sessionCookie: `session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`,
      });
    }

    // Login
    if (req.url === "/api/login" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "Database not connected" });
      const { email, password } = body;
      const [user] = await sql`SELECT * FROM users WHERE email = ${email.toLowerCase()}`;
      if (!user || !verifyPassword(password, user.password_hash)) {
        return json(res, 401, { error: "Invalid email or password" });
      }
      await sql`UPDATE users SET last_login = now() WHERE id = ${user.id}`;
      const [ws] = await sql`SELECT * FROM workspaces WHERE id = ${user.workspace_id}`;
      const [sub] = await sql`SELECT * FROM subscriptions WHERE workspace_id = ${user.workspace_id}`;
      const token = createSession(user.id, user.workspace_id, user.role);

      return json(res, 200, {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        workspace: ws ? { id: ws.id, name: ws.name } : null,
        subscription: sub ? {
          tier: sub.tier, status: sub.status,
          isActive: sub.status === "active" && new Date(sub.expires_at) > new Date(),
          isDemo: sub.tier === "demo", isExpired: new Date(sub.expires_at) < new Date(),
          expiresAt: sub.expires_at?.toISOString(),
        } : null,
        sessionCookie: `session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`,
      });
    }

    // Activate
    if (req.url === "/api/activate" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "Database not connected" });
      const { activationKey, workspaceId } = body;
      const keyHash = createHash("sha256").update(activationKey).digest("hex");
      const [key] = await sql`SELECT * FROM activation_keys WHERE key_hash = ${keyHash} AND workspace_id = ${workspaceId}::uuid AND is_used = false`;
      if (!key) return json(res, 400, { error: "Invalid activation key" });
      if (new Date(key.expires_at) < new Date()) return json(res, 400, { error: "Key expired" });

      const durations = { "1yr": 365, "3yr": 1095, "5yr": 1825, "7yr": 2555 };
      const days = durations[key.tier] || 365;
      const now = new Date();
      const exp = new Date(now.getTime() + days * 86400000);
      const maxDev = { "1yr": 2, "3yr": 5, "5yr": 10, "7yr": 20 }[key.tier] || 1;

      await sql`UPDATE activation_keys SET is_used = true WHERE id = ${key.id}`;
      await sql`UPDATE subscriptions SET tier = ${key.tier}, status = 'active', starts_at = ${now.toISOString()}, expires_at = ${exp.toISOString()}, max_devices = ${maxDev} WHERE workspace_id = ${workspaceId}`;
      await sql`UPDATE workspaces SET is_demo = false WHERE id = ${workspaceId}`;

      // Create a session so user can access dashboard
      const [user] = await sql`SELECT * FROM users WHERE workspace_id = ${workspaceId} AND is_owner = true`;
      let sessionCookie = "";
      if (user) {
        const token = createSession(user.id, workspaceId, user.role);
        sessionCookie = `session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`;
      }

      return json(res, 200, {
        tier: key.tier, status: "active", isActive: true, isDemo: false, isExpired: false,
        expiresAt: exp.toISOString(), maxDevices: maxDev,
        sessionCookie,
      });
    }

    // Request activation key
    if (req.url === "/api/request-key" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "Database not connected" });
      const { workspaceId, tier } = body;
      const rawKey = "SW-" + Array.from({ length: 5 }, () => randomBytes(2).toString("hex").toUpperCase()).join("-");
      const keyHash = createHash("sha256").update(rawKey).digest("hex");
      const exp = new Date(Date.now() + 30 * 86400000);
      await sql`INSERT INTO activation_keys (workspace_id, key_hash, tier, is_used, expires_at) VALUES (${workspaceId}, ${keyHash}, ${tier}, false, ${exp.toISOString()})`;

      // Try to send email
      try {
        const nodemailer = require("nodemailer");
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || "smtp.gmail.com",
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: false,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        const [user] = await sql`SELECT * FROM users WHERE workspace_id = ${workspaceId} AND is_owner = true`;
        if (user) {
          await transporter.sendMail({
            from: `"SupplyIQ" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: "Your SupplyIQ Activation Key",
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h1 style="color:#0f172a">Supply<span style="color:#84cc16">IQ</span></h1><p>Hi ${user.name},</p><p>Your activation key:</p><div style="background:#f5f5f5;padding:20px;border-radius:8px;text-align:center;margin:20px 0"><code style="font-size:22px;letter-spacing:3px;font-weight:700">${rawKey}</code></div><p>Enter this in the app to activate.</p></div>`,
            text: `Your SupplyIQ activation key: ${rawKey}`,
          });
          console.log("[EMAIL] Sent to", user.email);
        }
      } catch (e) { console.warn("Email not sent:", e.message); }

      return json(res, 200, { activationKey: rawKey, tier, maxDevices: { "1yr": 2, "3yr": 5, "5yr": 10, "7yr": 20 }[tier] || 2 });
    }

    // Devices
    if (req.url === "/api/request-key" && req.method === "GET") {
      return json(res, 200, { devices: [], maxDevices: 1 });
    }

    return json(res, 404, { error: "Unknown endpoint" });
  } catch (e) {
    console.error("API error:", e.message);
    return json(res, 500, { error: "Internal server error" });
  }
}

function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

// ─── Server Start ────────────────────────────────────────
async function start() {
  await initDB();

  try {
    const mod = await import("./dist/server/index.js");
    const workerEntry = mod.default;
    const handler = workerEntry?.fetch || mod.createServerEntry;
    if (!handler || typeof handler !== "function") throw new Error("No handler");

    const server = createServer(async (req, res) => {
      // Cross-domain auth: dedicated path to avoid SSR issues
      if (req.url?.startsWith("/auth?s=")) {
        const token = new URL(req.url, "https://h").searchParams.get("s");
        if (token && SESSIONS.has(token)) {
          res.writeHead(302, {
            "Location": "/app/dashboard",
            "Set-Cookie": `session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`,
          });
          res.end();
          return;
        }
        res.writeHead(302, { "Location": "/" });
        res.end();
        return;
      }

      if (req.url?.startsWith("/api/")) return handleApiRoute(req, res);
      if (req.url && /\.(js|css|svg|png|jpg|woff2|json|ico)$/.test(req.url)) {
        if (serveStatic(req.url, res)) return;
      }

      try {
        const url = `https://${req.headers.host || "localhost"}${req.url}`;
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) {
          if (v) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
        }
        const bodyData = req.method !== "GET" && req.method !== "HEAD"
          ? await new Promise((r) => { const c = []; req.on("data", (d) => c.push(d)); req.on("end", () => r(Buffer.concat(c))); })
          : undefined;
        const webReq = new Request(url, { method: req.method, headers, body: bodyData });
        const response = await handler(webReq);
        const resHeaders = {};
        response.headers?.forEach((v, k) => { resHeaders[k] = v; });
        res.writeHead(response.status || 200, resHeaders);
        if (response.body) {
          const reader = response.body.getReader();
          for (;;) { const { done, value } = await reader.read(); if (done) break; res.write(value); }
        }
        res.end();
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Server error" }));
      }
    });

    server.listen(PORT, () => console.log(`SupplyIQ on port ${PORT}${dbConnected ? " (DB connected)" : ""}`));
  } catch (e) {
    console.error("Start error:", e.message);
    const s = createServer((_, r) => { r.writeHead(200); r.end("SupplyIQ API Running"); });
    s.listen(PORT);
  }
}

start();
