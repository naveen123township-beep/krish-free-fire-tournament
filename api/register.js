const { db, ensureDb, cleanText, cleanPhone, json, parseBody, waNumber, waUrl } = require("./_lib");
const { getPool } = require("./_db");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  try {
    await ensureDb();
    const body = await parseBody(req);
    const type = body.type === "squad" ? "squad" : "solo";
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock($1)", [834221]);
      const sres = await client.query("SELECT * FROM tournament_settings WHERE id=1");
      const s = sres.rows[0];

      if (!s.web_enabled) throw new Error("REGISTRATION_CLOSED");
      if (type === "solo" && !s.solo_enabled) throw new Error("SOLO_DISABLED");
      if (type === "squad" && !s.squad_enabled) throw new Error("SQUAD_DISABLED");

      const cres = await client.query(`
        SELECT COUNT(*) FILTER (WHERE type='solo' AND slot_status IN ('pending','confirmed'))::int AS solo_reserved,
               COUNT(*) FILTER (WHERE type='squad' AND slot_status IN ('pending','confirmed'))::int AS squad_reserved
        FROM registrations
      `);
      const c = cres.rows[0];

      if (type === "solo" && c.solo_reserved >= s.solo_slots) throw new Error("SOLO_FULL");
      if (type === "squad" && c.squad_reserved >= s.squad_slots) throw new Error("SQUAD_FULL");

      let name = null, playerNumber = null, teamName = null, players = [];

      if (type === "solo") {
        name = cleanText(body.playerName, 80);
        playerNumber = cleanPhone(body.playerNumber);
        if (!name || playerNumber.length < 8) throw new Error("INVALID_SOLO");
      } else {
        teamName = cleanText(body.teamName, 80);
        const captainNumber = cleanPhone(body.captainNumber);
        players = Array.isArray(body.players)
          ? body.players.slice(0, 4).map(x => cleanText(x, 80))
          : [];
        if (!teamName || captainNumber.length < 8 || players.length !== 4 || players.some(x => !x)) {
          throw new Error("INVALID_SQUAD");
        }
        playerNumber = captainNumber;
      }

      const amount = type === "solo" ? s.solo_price : s.squad_price;
      const rres = await client.query(`
        INSERT INTO registrations
          (type, name, player_number, team_name, players_json, amount)
        VALUES ($1,$2,$3,$4,$5::jsonb,$6)
        RETURNING id, created_at
      `, [type, name, playerNumber, teamName, JSON.stringify(players), amount]);
      const row = rres.rows[0];

      const adminNumber = waNumber(s.whatsapp);
      const lines = [
        `🔥 ${s.tournament_name}`,
        `Registration ID: #${row.id}`,
        `Mode: ${type.toUpperCase()}`,
        ""
      ];

      if (type === "solo") {
        lines.push(`Player Name: ${name}`, `Player Number: ${playerNumber}`);
      } else {
        lines.push(`Team Name: ${teamName}`, `Captain Number: ${playerNumber}`);
        players.forEach((p, i) => lines.push(`Player ${i + 1}: ${p}`));
      }

      lines.push("", `Entry Fee: ₹${amount}`, "Payment: PENDING", "Slot: PENDING",
        "", "Please confirm payment and slot from the admin panel.");

      const result = {
        id: row.id,
        url: adminNumber ? waUrl(adminNumber, lines.join("\n")) : null,
        message: lines.join("\n")
      };
      await client.query("COMMIT");
      return result;
    } catch (e) {
      try { await client.query("ROLLBACK"); } catch {}
      throw e;
    } finally {
      client.release();
    }

    return json(res, 200, { ok: true, ...result });
  } catch (e) {
    console.error(e);
    const map = {
      REGISTRATION_CLOSED: [403, "Registration is currently closed"],
      SOLO_DISABLED: [403, "Solo registration is disabled"],
      SQUAD_DISABLED: [403, "Squad registration is disabled"],
      SOLO_FULL: [409, "Solo slots are full"],
      SQUAD_FULL: [409, "Squad slots are full"],
      INVALID_SOLO: [400, "Enter a valid player name and player number"],
      INVALID_SQUAD: [400, "Enter team name, valid captain number, and all 4 player names"]
    };
    const [status, message] = map[e.message] || [500, "Registration failed"];
    return json(res, status, { error: message });
  }
};
