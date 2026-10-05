const { json, parseBody, signAdmin, setAdminCookie } = require("../_lib");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  try {
    const body = await parseBody(req);
    const expected = process.env.ADMIN_PASSWORD || "krish@15";
    if (String(body.password || "") !== expected) return json(res, 401, { error: "Wrong password" });

    if (!process.env.JWT_SECRET) return json(res, 500, { error: "JWT_SECRET is not configured" });

    setAdminCookie(res, signAdmin());
    return json(res, 200, { ok: true });
  } catch {
    return json(res, 400, { error: "Invalid request" });
  }
};
