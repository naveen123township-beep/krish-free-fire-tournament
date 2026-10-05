const { neon } = require("@neondatabase/serverless");
const jwt = require("jsonwebtoken");

let sql;

function db() {
  if (!sql) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
}

async function ensureDb() {
  const q = db();

  await q`
    CREATE TABLE IF NOT EXISTS tournament_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      web_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      solo_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      squad_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      solo_price INTEGER NOT NULL DEFAULT 50,
      squad_price INTEGER NOT NULL DEFAULT 200,
      solo_slots INTEGER NOT NULL DEFAULT 48,
      squad_slots INTEGER NOT NULL DEFAULT 12,
      whatsapp TEXT NOT NULL DEFAULT '',
      tournament_name TEXT NOT NULL DEFAULT 'KRISH FREE FIRE TOURNAMENT'
    )
  `;

  await q`
    CREATE TABLE IF NOT EXISTS registrations (
      id BIGSERIAL PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('solo','squad')),
      name TEXT,
      player_number TEXT,
      team_name TEXT,
      players_json JSONB,
      amount INTEGER NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending','paid','rejected')),
      slot_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (slot_status IN ('pending','confirmed','rejected')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await q`
    INSERT INTO tournament_settings (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING
  `;
}

function cleanText(value, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

function cleanPhone(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 20);
}

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  return res.end(JSON.stringify(body));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
      if (data.length > 200000) reject(new Error("Request too large"));
    });
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}

function signAdmin() {
  return jwt.sign(
    { role: "admin" },
    process.env.JWT_SECRET || "CHANGE_ME",
    { expiresIn: "12h" }
  );
}

function getAdmin(req) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)krish_admin=([^;]+)/);
  if (!match || !process.env.JWT_SECRET) return false;
  try {
    const payload = jwt.verify(decodeURIComponent(match[1]), process.env.JWT_SECRET);
    return payload.role === "admin";
  } catch {
    return false;
  }
}

function setAdminCookie(res, token) {
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  res.setHeader(
    "Set-Cookie",
    `krish_admin=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax;${secure} Max-Age=43200`
  );
}

function clearAdminCookie(res) {
  res.setHeader(
    "Set-Cookie",
    "krish_admin=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  );
}

function waNumber(raw) {
  return cleanPhone(raw);
}

function waUrl(number, message) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

module.exports = {
  db, ensureDb, cleanText, cleanPhone, json, parseBody,
  signAdmin, getAdmin, setAdminCookie, clearAdminCookie,
  waNumber, waUrl
};
