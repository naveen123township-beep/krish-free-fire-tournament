const { db, ensureDb, json } = require("./_lib");

module.exports = async function handler(req, res) {
  try {
    await ensureDb();
    const [s] = await db()`SELECT * FROM tournament_settings WHERE id = 1`;
    const counts = await db()`
      SELECT
        COUNT(*) FILTER (WHERE type='solo' AND slot_status IN ('pending','confirmed'))::int AS solo_reserved,
        COUNT(*) FILTER (WHERE type='solo' AND slot_status='confirmed')::int AS solo_confirmed,
        COUNT(*) FILTER (WHERE type='squad' AND slot_status IN ('pending','confirmed'))::int AS squad_reserved,
        COUNT(*) FILTER (WHERE type='squad' AND slot_status='confirmed')::int AS squad_confirmed
      FROM registrations
    `;

    return json(res, 200, {
      tournamentName: s.tournament_name,
      webEnabled: s.web_enabled,
      soloEnabled: s.solo_enabled,
      squadEnabled: s.squad_enabled,
      soloPrice: s.solo_price,
      squadPrice: s.squad_price,
      soloSlots: s.solo_slots,
      squadSlots: s.squad_slots,
      soloReserved: counts.solo_reserved,
      soloConfirmed: counts.solo_confirmed,
      squadReserved: counts.squad_reserved,
      squadConfirmed: counts.squad_confirmed,
      soloAvailable: Math.max(0, s.solo_slots - counts.solo_reserved),
      squadAvailable: Math.max(0, s.squad_slots - counts.squad_reserved)
    });
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: "Unable to load tournament settings" });
  }
};
