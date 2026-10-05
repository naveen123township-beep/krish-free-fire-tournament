const { db, ensureDb, getAdmin, json, parseBody, cleanText, cleanPhone } = require("../_lib");

module.exports = async function handler(req, res) {
  if (!getAdmin(req)) return json(res, 401, { error: "Unauthorized" });
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  try {
    await ensureDb();
    const b = await parseBody(req);

    const webEnabled = !!b.webEnabled;
    const soloEnabled = !!b.soloEnabled;
    const squadEnabled = !!b.squadEnabled;
    const soloPrice = Math.max(0, Math.floor(Number(b.soloPrice)));
    const squadPrice = Math.max(0, Math.floor(Number(b.squadPrice)));
    const soloSlots = Math.max(1, Math.floor(Number(b.soloSlots)));
    const squadSlots = Math.max(1, Math.floor(Number(b.squadSlots)));
    const whatsapp = cleanPhone(b.whatsapp);
    const tournamentName = cleanText(b.tournamentName || "KRISH FREE FIRE TOURNAMENT", 100);

    if (![soloPrice, squadPrice, soloSlots, squadSlots].every(Number.isFinite)) {
      return json(res, 400, { error: "Invalid numeric settings" });
    }

    const q = db();
    await q`
      UPDATE tournament_settings SET
        web_enabled=${webEnabled},
        solo_enabled=${soloEnabled},
        squad_enabled=${squadEnabled},
        solo_price=${soloPrice},
        squad_price=${squadPrice},
        solo_slots=${soloSlots},
        squad_slots=${squadSlots},
        whatsapp=${whatsapp},
        tournament_name=${tournamentName}
      WHERE id=1
    `;

    return json(res, 200, { ok: true });
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: "Unable to save settings" });
  }
};
