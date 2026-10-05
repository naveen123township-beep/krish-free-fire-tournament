const { db, ensureDb, getAdmin, json } = require("../_lib");

module.exports = async function handler(req, res) {
  if (!getAdmin(req)) return json(res, 401, { error: "Unauthorized" });

  try {
    await ensureDb();
    const [settings] = await db()`SELECT * FROM tournament_settings WHERE id=1`;
    const registrations = await db()`
      SELECT id, type, name, player_number, team_name, players_json,
             amount, payment_status, slot_status, created_at
      FROM registrations
      ORDER BY id DESC
      LIMIT 500
    `;
    return json(res, 200, { settings, registrations });
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: "Unable to load admin data" });
  }
};
