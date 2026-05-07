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
  await sql`
    CREATE TABLE IF NOT EXISTS token_blacklist (
      token_hash TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;

  // Inventory tables
  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      parent_id UUID,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS suppliers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL,
      name TEXT NOT NULL,
      contact_name TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      lead_time_days INT DEFAULT 7,
      rating NUMERIC(3,1) DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS locations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'warehouse',
      parent_id UUID,
      description TEXT DEFAULT '',
      address TEXT DEFAULT '',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL,
      sku TEXT NOT NULL,
      barcode TEXT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category_id UUID,
      status TEXT DEFAULT 'active',
      unit TEXT DEFAULT 'each',
      current_stock INT DEFAULT 0,
      reorder_point INT DEFAULT 0,
      reorder_quantity INT DEFAULT 0,
      cost_price NUMERIC(10,2) DEFAULT 0,
      selling_price NUMERIC(10,2) DEFAULT 0,
      location_id UUID,
      supplier_id UUID,
      image_url TEXT,
      custom_fields JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS movements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL,
      item_id UUID NOT NULL,
      type TEXT NOT NULL,
      quantity INT NOT NULL,
      from_location_id UUID,
      to_location_id UUID,
      reference TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      performed_by TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL,
      order_number TEXT NOT NULL,
      supplier_id UUID NOT NULL,
      status TEXT DEFAULT 'draft',
      items JSONB DEFAULT '[]',
      total_cost NUMERIC(12,2) DEFAULT 0,
      expected_delivery TIMESTAMPTZ,
      notes TEXT DEFAULT '',
      created_by TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL,
      request_number TEXT NOT NULL,
      title TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'normal',
      items JSONB DEFAULT '[]',
      requested_by TEXT DEFAULT '',
      approved_by TEXT,
      reason TEXT DEFAULT '',
      decline_reason TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT DEFAULT '',
      is_read BOOLEAN DEFAULT false,
      link TEXT,
      reference_id TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;
}

// ─── Auth Helpers ────────────────────────────────────────
function getWsId(req) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/session=([^;]+)/);
  if (match) {
    const s = verifySession(match[1]);
    if (s) return s.workspaceId;
  }
  return null;
}

function hashPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  const h = createHash("sha256").update(salt + pw).digest("hex");
  return `${salt}:${h}`;
}

function verifyPassword(pw, stored) {
  const [salt, h] = stored.split(":");
  return createHash("sha256").update(salt + pw).digest("hex") === h;
}

// ─── Stateless Session Tokens ─────────────────────────────
const SESSION_SECRET = process.env.SESSION_SECRET || "supplyiq-secret";

function createSession(userId, workspaceId, role) {
  const payload = `${userId}:${workspaceId}:${role}:${Date.now()}`;
  const sig = createHash("sha256").update(payload + SESSION_SECRET).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

function verifySession(token) {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const parts = decoded.split(":");
    if (parts.length < 5) return null;
    const sig = parts.pop();
    const payload = parts.join(":");
    const expected = createHash("sha256").update(payload + SESSION_SECRET).digest("hex");
    if (sig !== expected) return null;
    return { userId: parts[0], workspaceId: parts[1], role: parts[2], created: parseInt(parts[3]) };
  } catch { return null; }
}

// ─── Email ───────────────────────────────────────────────
let _nodemailer = null;
async function sendEmail(to, subject, html, text) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("[EMAIL] Skipped — no SMTP credentials configured");
    return false;
  }
  try {
    if (!_nodemailer) {
      try {
        _nodemailer = (await import("nodemailer")).default;
        console.log("[EMAIL] nodemailer loaded");
      } catch (e) {
        console.error("[EMAIL] Failed to load nodemailer:", e.message);
        return false;
      }
    }
    const transporter = _nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      requireTLS: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    console.log("[EMAIL] Connecting to SMTP...");
    await transporter.verify();
    console.log("[EMAIL] SMTP connection verified");
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html: html || text,
      text: text || "",
    });
    console.log("[EMAIL] Sent successfully to", to);
    return true;
  } catch (e) {
    console.error("[EMAIL] Error:", e.code || e.message, e.response || "");
    return false;
  }
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

  if (req.url === "/api/test-email" && req.method === "GET") {
    const sent = await sendEmail("ntoanpilp@gmail.com", "SupplyIQ Email Test",
      "<h1>SupplyIQ</h1><p>Email service is working.</p>",
      "SupplyIQ email test successful.");
    return json(res, 200, {
      emailSent: sent,
      smtpConfigured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
      smtpHost: process.env.SMTP_HOST,
      smtpUser: process.env.SMTP_USER,
    });
  }

  if (req.url === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ status: "healthy", version: "1.0.5", db: dbConnected }));
  }

  // Session check — returns current user from cookie
  if (req.url === "/api/session" && req.method === "GET") {
    const cookie = req.headers.cookie || "";
    const match = cookie.match(/session=([^;]+)/);
    if (match && verifySession(match[1])) {
      // Check blacklist
      if (dbConnected) {
        const hash = createHash("sha256").update(match[1] + "blacklist").digest("hex");
        const [bl] = await sql`SELECT 1 FROM token_blacklist WHERE token_hash = ${hash}`;
        if (bl) return json(res, 200, { authenticated: false, user: null });
      }
      const s = verifySession(match[1]);
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

  // Logout — blacklist token AND clear cookie server-side
  if (req.url === "/api/logout" && req.method === "POST") {
    const cookie = req.headers.cookie || "";
    const match = cookie.match(/session=([^;]+)/);
    if (match && dbConnected) {
      const hash = createHash("sha256").update(match[1] + "blacklist").digest("hex");
      await sql`INSERT INTO token_blacklist (token_hash) VALUES (${hash}) ON CONFLICT DO NOTHING`;
    }
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Set-Cookie": "session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0",
    });
    return res.end(JSON.stringify({ message: "Logged out" }));
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
      const [user] = dbConnected ? await sql`SELECT * FROM users WHERE workspace_id = ${workspaceId}::uuid AND is_owner = true` : [null];
      if (user) sendEmail(user.email, "Your SupplyIQ Activation Key",
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h1>Supply<span style="color:#84cc16">IQ</span></h1><p>Hi ${user.name},</p><p>Your activation key:</p><div style="background:#f5f5f5;padding:20px;border-radius:8px;text-align:center;margin:20px 0"><code style="font-size:22px;letter-spacing:3px;font-weight:700">${rawKey}</code></div></div>`,
        `Your SupplyIQ activation key: ${rawKey}`);

      return json(res, 200, { activationKey: rawKey, tier, maxDevices: { "1yr": 2, "3yr": 5, "5yr": 10, "7yr": 20 }[tier] || 2 });
    }

    // Devices
    if (req.url === "/api/devices" && req.method === "GET") {
      return json(res, 200, { devices: [], maxDevices: 1 });
    }

    // Forgot password — generate reset token and email
    if (req.url === "/api/forgot-password" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "Database not connected" });
      const { email } = body;
      const [user] = email ? await sql`SELECT * FROM users WHERE email = ${email.toLowerCase()}` : [null];
      if (user) {
        const resetToken = randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 3600000); // 1 hour
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`;
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMPTZ`;
        await sql`UPDATE users SET reset_token = ${resetToken}, reset_expires = ${expires.toISOString()} WHERE id = ${user.id}`;

        // Try to send email
        sendEmail(user.email, "Reset your SupplyIQ password",
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h1>Supply<span style="color:#84cc16">IQ</span></h1><p>Click below to reset your password:</p><a href="https://supplyiq.netlify.app/reset-password?token=${resetToken}" style="display:inline-block;background:#84cc16;color:#0f172a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a><p style="color:#94a3b8;font-size:12px">Link expires in 1 hour.</p></div>`,
          `Reset your SupplyIQ password: https://supplyiq.netlify.app/reset-password?token=${resetToken}`);
      }
      return json(res, 200, { message: "If the email exists, a reset link has been sent." });
    }

    // Reset password
    if (req.url === "/api/reset-password" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "Database not connected" });
      const { token, password } = body;
      const [user] = token ? await sql`SELECT * FROM users WHERE reset_token = ${token} AND reset_expires > now()` : [null];
      if (!user) return json(res, 400, { error: "Invalid or expired reset token" });
      await sql`UPDATE users SET password_hash = ${hashPassword(password)}, reset_token = NULL, reset_expires = NULL WHERE id = ${user.id}`;
      return json(res, 200, { message: "Password reset successfully." });
    }

    // ─── CRUD: Items ────────────────────────────────────
    if (req.url === "/api/items" && req.method === "GET") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      const items = wsId ? await sql`SELECT * FROM items WHERE workspace_id = ${wsId}::uuid ORDER BY updated_at DESC` : [];
      return json(res, 200, items);
    }
    if (req.url.startsWith("/api/items/lookup") && req.method === "GET") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      if (!wsId) return json(res, 401, { error: "Not authenticated" });
      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      const barcode = url.searchParams.get("barcode");
      if (!barcode) return json(res, 400, { error: "barcode query param required" });
      const [item] = await sql`SELECT * FROM items WHERE workspace_id = ${wsId}::uuid AND (barcode = ${barcode} OR sku = ${barcode}) LIMIT 1`;
      if (!item) return json(res, 404, { error: "Item not found", barcode });
      return json(res, 200, item);
    }
    // Public scan endpoint — no auth required, returns minimal info only
    if (req.url.startsWith("/api/scan") && req.method === "GET") {
      if (!dbConnected) return json(res, 503, { error: "Database not connected" });
      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      const barcode = url.searchParams.get("barcode");
      if (!barcode) return json(res, 400, { error: "barcode query param required" });
      const [item] = await sql`SELECT id, sku, name, barcode, current_stock, unit FROM items WHERE barcode = ${barcode} OR sku = ${barcode} LIMIT 1`;
      if (!item) return json(res, 404, { error: "Item not found", barcode });
      return json(res, 200, {
        name: item.name,
        sku: item.sku,
        barcode: item.barcode,
        stock: item.current_stock,
        unit: item.unit,
      });
    }
    if (req.url === "/api/items" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      if (!wsId) return json(res, 401, { error: "Not authenticated" });
      const { name, sku, description, categoryId, unit, currentStock, reorderPoint, reorderQuantity, costPrice, sellingPrice, locationId, supplierId, barcode } = body;
      const [item] = await sql`
        INSERT INTO items (workspace_id, name, sku, description, category_id, unit, current_stock, reorder_point, reorder_quantity, cost_price, selling_price, location_id, supplier_id, barcode)
        VALUES (${wsId}::uuid, ${name || ""}, ${sku || ""}, ${description || ""}, ${categoryId || null}::uuid, ${unit || "each"}, ${currentStock || 0}, ${reorderPoint || 0}, ${reorderQuantity || 0}, ${costPrice || 0}, ${sellingPrice || 0}, ${locationId || null}::uuid, ${supplierId || null}::uuid, ${barcode || null})
        RETURNING *`;
      return json(res, 201, item);
    }
    if (req.url === "/api/items/update" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const { id, updates } = body;
      const setClauses = Object.entries(updates).filter(([k]) => !["id","workspace_id","created_at"].includes(k));
      if (setClauses.length === 0) return json(res, 400, { error: "No updates" });
      const [item] = await sql`UPDATE items SET ${sql(setClauses.map(([k,v]) => sql`${sql(k)} = ${v}`))}, updated_at = now() WHERE id = ${id}::uuid RETURNING *`;
      return json(res, 200, item);
    }
    if (req.url === "/api/items/delete" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      await sql`DELETE FROM items WHERE id = ${body.id}::uuid`;
      return json(res, 200, { success: true });
    }

    // ─── CRUD: Suppliers ────────────────────────────────
    if (req.url === "/api/suppliers" && req.method === "GET") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      const result = wsId ? await sql`SELECT * FROM suppliers WHERE workspace_id = ${wsId}::uuid ORDER BY name` : [];
      return json(res, 200, result);
    }
    if (req.url === "/api/suppliers" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      if (!wsId) return json(res, 401, { error: "Not authenticated" });
      const { name, contactName, email, phone, address, leadTimeDays, rating, notes } = body;
      const [s] = await sql`
        INSERT INTO suppliers (workspace_id, name, contact_name, email, phone, address, lead_time_days, rating, notes)
        VALUES (${wsId}::uuid, ${name}, ${contactName || ""}, ${email || ""}, ${phone || ""}, ${address || ""}, ${leadTimeDays || 7}, ${rating || "0"}, ${notes || ""})
        RETURNING *`;
      return json(res, 201, s);
    }
    if (req.url === "/api/suppliers/update" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      if (!wsId) return json(res, 401, { error: "Not authenticated" });
      const { id, updates } = body;
      const [s] = await sql`UPDATE suppliers SET ${sql(Object.entries(updates).map(([k,v]) => sql`${sql(k)} = ${v}`))}, updated_at = now() WHERE id = ${id}::uuid AND workspace_id = ${wsId}::uuid RETURNING *`;
      return json(res, 200, s);
    }
    if (req.url === "/api/suppliers/delete" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      if (!wsId) return json(res, 401, { error: "Not authenticated" });
      await sql`DELETE FROM suppliers WHERE id = ${body.id}::uuid AND workspace_id = ${wsId}::uuid`;
      return json(res, 200, { success: true });
    }

    // ─── CRUD: Purchase Orders ──────────────────────────
    if (req.url === "/api/purchase-orders" && req.method === "GET") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      const result = wsId ? await sql`SELECT * FROM purchase_orders WHERE workspace_id = ${wsId}::uuid ORDER BY created_at DESC` : [];
      return json(res, 200, result);
    }
    if (req.url === "/api/purchase-orders" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      if (!wsId) return json(res, 401, { error: "Not authenticated" });
      const { orderNumber, supplierId, status, items, totalCost, expectedDelivery, notes, createdBy } = body;
      const [po] = await sql`
        INSERT INTO purchase_orders (workspace_id, order_number, supplier_id, status, items, total_cost, expected_delivery, notes, created_by)
        VALUES (${wsId}::uuid, ${orderNumber}, ${supplierId}::uuid, ${status || "draft"}, ${JSON.stringify(items || [])}, ${totalCost || 0}, ${expectedDelivery || null}, ${notes || ""}, ${createdBy || ""})
        RETURNING *`;
      return json(res, 201, po);
    }
    if (req.url === "/api/purchase-orders/update" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      if (!wsId) return json(res, 401, { error: "Not authenticated" });
      const { id, updates } = body;
      const [po] = await sql`UPDATE purchase_orders SET ${sql(Object.entries(updates).map(([k,v]) => sql`${sql(k)} = ${v}`))}, updated_at = now() WHERE id = ${id}::uuid AND workspace_id = ${wsId}::uuid RETURNING *`;
      return json(res, 200, po);
    }
    if (req.url === "/api/purchase-orders/delete" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      if (!wsId) return json(res, 401, { error: "Not authenticated" });
      await sql`DELETE FROM purchase_orders WHERE id = ${body.id}::uuid AND workspace_id = ${wsId}::uuid`;
      return json(res, 200, { success: true });
    }

    // ─── CRUD: Movements ────────────────────────────────
    if (req.url === "/api/movements" && req.method === "GET") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      const result = wsId ? await sql`SELECT * FROM movements WHERE workspace_id = ${wsId}::uuid ORDER BY created_at DESC LIMIT 50` : [];
      return json(res, 200, result);
    }
    if (req.url === "/api/movements" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      if (!wsId) return json(res, 401, { error: "Not authenticated" });
      const { itemId, type, quantity, fromLocationId, toLocationId, reference, notes, performedBy } = body;
      const [m] = await sql`
        INSERT INTO movements (workspace_id, item_id, type, quantity, from_location_id, to_location_id, reference, notes, performed_by)
        VALUES (${wsId}::uuid, ${itemId}::uuid, ${type}, ${quantity}, ${fromLocationId || null}::uuid, ${toLocationId || null}::uuid, ${reference || ""}, ${notes || ""}, ${performedBy || ""})
        RETURNING *`;
      return json(res, 201, m);
    }

    // ─── CRUD: Requests ───────────────────────────────────
    if (req.url === "/api/requests" && req.method === "GET") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      const result = wsId ? await sql`SELECT * FROM requests WHERE workspace_id = ${wsId}::uuid ORDER BY created_at DESC` : [];
      return json(res, 200, result);
    }
    if (req.url === "/api/requests" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      if (!wsId) return json(res, 401, { error: "Not authenticated" });
      const { requestNumber, title, priority, items, requestedBy, reason } = body;
      const [r] = await sql`
        INSERT INTO requests (workspace_id, request_number, title, priority, items, requested_by, reason)
        VALUES (${wsId}::uuid, ${requestNumber}, ${title}, ${priority || "normal"}, ${JSON.stringify(items || [])}, ${requestedBy}, ${reason || ""})
        RETURNING *`;
      return json(res, 201, r);
    }
    if (req.url === "/api/requests/update" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      if (!wsId) return json(res, 401, { error: "Not authenticated" });
      const { id, updates } = body;
      const [r] = await sql`UPDATE requests SET ${sql(Object.entries(updates).map(([k,v]) => sql`${sql(k)} = ${v}`))}, updated_at = now() WHERE id = ${id}::uuid AND workspace_id = ${wsId}::uuid RETURNING *`;
      return json(res, 200, r);
    }
    if (req.url === "/api/requests/approve" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      if (!wsId) return json(res, 401, { error: "Not authenticated" });
      const { id, approvedBy } = body;
      const [r] = await sql`UPDATE requests SET status = 'approved', approved_by = ${approvedBy}, updated_at = now() WHERE id = ${id}::uuid AND workspace_id = ${wsId}::uuid RETURNING *`;
      return json(res, 200, r);
    }
    if (req.url === "/api/requests/decline" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      if (!wsId) return json(res, 401, { error: "Not authenticated" });
      const { id, declineReason } = body;
      const [r] = await sql`UPDATE requests SET status = 'declined', decline_reason = ${declineReason || ""}, updated_at = now() WHERE id = ${id}::uuid AND workspace_id = ${wsId}::uuid RETURNING *`;
      return json(res, 200, r);
    }

    // ─── CRUD: Users ─────────────────────────────────────
    if (req.url === "/api/users" && req.method === "GET") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      if (!wsId) return json(res, 401, { error: "Not authenticated" });
      const result = await sql`SELECT id, email, name, role, is_active, is_owner, created_at FROM users WHERE workspace_id = ${wsId}::uuid ORDER BY name`;
      return json(res, 200, result);
    }
    if (req.url === "/api/users/invite" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      if (!wsId) return json(res, 401, { error: "Not authenticated" });
      const { email, name, role } = body;
      if (!email) return json(res, 400, { error: "Email required" });
      const norm = email.toLowerCase();
      const [existing] = await sql`SELECT id FROM users WHERE email = ${norm}`;
      if (existing) return json(res, 400, { error: "User already exists" });
      const displayName = name || norm.split("@")[0];
      // Generate a temporary password
      const tempPw = randomBytes(8).toString("hex");
      const pwHash = hashPassword(tempPw);
      const [user] = await sql`INSERT INTO users (email, name, password_hash, role, workspace_id, is_owner, is_active) VALUES (${norm}, ${displayName}, ${pwHash}, ${role || "requestor"}, ${wsId}::uuid, false, true) RETURNING id, email, name, role, is_active, is_owner, created_at`;
      // Try to send invitation email
      sendEmail(norm, "Welcome to SupplyIQ",
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h1>Supply<span style="color:#84cc16">IQ</span></h1><p>You've been added as a <strong>${role || "requestor"}</strong>.</p><p>Your temporary password: <code>${tempPw}</code></p><p><a href="https://supplyiq.netlify.app/login">Log in here</a></p></div>`,
        `You've been added to SupplyIQ. Your temporary password is: ${tempPw}`,
      );
      return json(res, 201, user);
    }
    if (req.url === "/api/users/update-role" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      if (!wsId) return json(res, 401, { error: "Not authenticated" });
      const { id, role } = body;
      // Prevent demoting the last admin
      if (role !== "admin") {
        const admins = await sql`SELECT COUNT(*) as c FROM users WHERE workspace_id = ${wsId}::uuid AND role = 'admin' AND is_active = true`;
        if (admins[0].c <= 1) {
          const [target] = await sql`SELECT role FROM users WHERE id = ${id}::uuid`;
          if (target && target.role === "admin") {
            return json(res, 400, { error: "Cannot change the only admin" });
          }
        }
      }
      const [user] = await sql`UPDATE users SET role = ${role}, updated_at = now() WHERE id = ${id}::uuid AND workspace_id = ${wsId}::uuid RETURNING id, email, name, role, is_active, is_owner, created_at`;
      return json(res, 200, user);
    }
    if (req.url === "/api/users/toggle-status" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      if (!wsId) return json(res, 401, { error: "Not authenticated" });
      const { id, isActive } = body;
      // Prevent deactivating the last admin
      if (!isActive) {
        const admins = await sql`SELECT COUNT(*) as c FROM users WHERE workspace_id = ${wsId}::uuid AND role = 'admin' AND is_active = true`;
        if (admins[0].c <= 1) {
          const [target] = await sql`SELECT role FROM users WHERE id = ${id}::uuid`;
          if (target && target.role === "admin") {
            return json(res, 400, { error: "Cannot deactivate the only admin" });
          }
        }
      }
      const [user] = await sql`UPDATE users SET is_active = ${isActive}, updated_at = now() WHERE id = ${id}::uuid AND workspace_id = ${wsId}::uuid RETURNING id, email, name, role, is_active, is_owner, created_at`;
      return json(res, 200, user);
    }

    // ─── Stock Summary ──────────────────────────────────
    if (req.url === "/api/stock-summary" && req.method === "GET") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      const items = wsId ? await sql`SELECT * FROM items WHERE workspace_id = ${wsId}::uuid` : [];
      return json(res, 200, {
        total: items.length,
        inStock: items.filter(i => i.current_stock > i.reorder_point).length,
        lowStock: items.filter(i => i.current_stock > 0 && i.current_stock <= i.reorder_point).length,
        outOfStock: items.filter(i => i.current_stock === 0).length,
      });
    }

    // ─── CRUD: Locations ────────────────────────────────
    if (req.url === "/api/locations" && req.method === "GET") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      const result = wsId ? await sql`SELECT * FROM locations WHERE workspace_id = ${wsId}::uuid ORDER BY name` : [];
      return json(res, 200, result);
    }
    if (req.url === "/api/locations" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      if (!wsId) return json(res, 401, { error: "Not authenticated" });
      const { name, type, parentId, description, address } = body;
      const [l] = await sql`
        INSERT INTO locations (workspace_id, name, type, parent_id, description, address)
        VALUES (${wsId}::uuid, ${name}, ${type || "warehouse"}, ${parentId || null}::uuid, ${description || ""}, ${address || ""})
        RETURNING *`;
      return json(res, 201, l);
    }
    if (req.url === "/api/locations/update" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      if (!wsId) return json(res, 401, { error: "Not authenticated" });
      const { id, updates } = body;
      const [l] = await sql`UPDATE locations SET ${sql(Object.entries(updates).map(([k,v]) => sql`${sql(k)} = ${v}`))}, updated_at = now() WHERE id = ${id}::uuid AND workspace_id = ${wsId}::uuid RETURNING *`;
      return json(res, 200, l);
    }
    if (req.url === "/api/locations/delete" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      if (!wsId) return json(res, 401, { error: "Not authenticated" });
      await sql`DELETE FROM locations WHERE id = ${body.id}::uuid AND workspace_id = ${wsId}::uuid`;
      return json(res, 200, { success: true });
    }

    // ─── CRUD: Categories ───────────────────────────────
    if (req.url === "/api/categories" && req.method === "GET") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      const result = wsId ? await sql`SELECT * FROM categories WHERE workspace_id = ${wsId}::uuid ORDER BY name` : [];
      return json(res, 200, result);
    }
    if (req.url === "/api/categories" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      if (!wsId) return json(res, 401, { error: "Not authenticated" });
      const { name, description, parentId } = body;
      const [c] = await sql`
        INSERT INTO categories (workspace_id, name, description, parent_id)
        VALUES (${wsId}::uuid, ${name}, ${description || ""}, ${parentId || null}::uuid)
        RETURNING *`;
      return json(res, 201, c);
    }
    if (req.url === "/api/categories/update" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      if (!wsId) return json(res, 401, { error: "Not authenticated" });
      const { id, updates } = body;
      const [c] = await sql`UPDATE categories SET ${sql(Object.entries(updates).map(([k,v]) => sql`${sql(k)} = ${v}`))}, updated_at = now() WHERE id = ${id}::uuid AND workspace_id = ${wsId}::uuid RETURNING *`;
      return json(res, 200, c);
    }
    if (req.url === "/api/categories/delete" && req.method === "POST") {
      if (!dbConnected) return json(res, 503, { error: "DB not connected" });
      const wsId = getWsId(req);
      if (!wsId) return json(res, 401, { error: "Not authenticated" });
      await sql`DELETE FROM categories WHERE id = ${body.id}::uuid AND workspace_id = ${wsId}::uuid`;
      return json(res, 200, { success: true });
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
        if (token && verifySession(token)) {
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
