const { db, getAdmin, json, parseBody, ensureDb } = require("../../_lib");
const { getPool } = require("../../_db");

module.exports = async function handler(req, res) {
  if (!getAdmin(req)) return json(res, 401, { error: "Unauthorized" });

  const id = Number(req.query.id);
  if (!Number.isInteger(id) || id < 1) return json(res, 400, { error: "Invalid ID" });

  try {
    await ensureDb();
    if (req.method === "DELETE") {
      await db()`DELETE FROM registrations WHERE id=${id}`;
      return json(res, 200, { ok: true });
    }

    if (req.method !== "PATCH") return json(res, 405, { error: "Method not allowed" });

    const b = await parseBody(req);
    const payment = ["pending","paid","rejected"].includes(b.paymentStatus) ? b.paymentStatus : null;
    const slot = ["pending","confirmed","rejected"].includes(b.slotStatus) ? b.slotStatus : null;
    if (!payment && !slot) return json(res, 400, { error: "No valid status supplied" });

    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock($1)", [834221]);
      const sres = await client.query("SELECT * FROM tournament_settings WHERE id=1");
      const s = sres.rows[0];
      const rres = await client.query("SELECT * FROM registrations WHERE id=$1 FOR UPDATE", [id]);
      const r = rres.rows[0];
      if (!r) throw new Error("NOT_FOUND");

      let newSlot = slot || r.slot_status;
      if (newSlot === "confirmed" && r.slot_status !== "confirmed") {
        const cres = await client.query(
          "SELECT COUNT(*)::int AS count FROM registrations WHERE type=$1 AND slot_status='confirmed' AND id <> $2",
          [r.type, id]
        );
        const c = cres.rows[0];
        const limit = r.type === "solo" ? s.solo_slots : s.squad_slots;
        if (c.count >= limit) throw new Error("FULL");
      }

      const newPayment = payment || r.payment_status;
      const ures = await client.query(
        "UPDATE registrations SET payment_status=$1, slot_status=$2 WHERE id=$3 RETURNING id, payment_status, slot_status",
        [newPayment, newSlot, id]
      );
      const updated = ures.rows[0];
      await client.query("COMMIT");
      return updated;
    } catch (e) {
      try { await client.query("ROLLBACK"); } catch {}
      throw e;
    } finally {
      client.release();
    }

    return json(res, 200, { ok: true, registration: result });
  } catch (e) {
    if (e.message === "NOT_FOUND") return json(res, 404, { error: "Registration not found" });
    if (e.message === "FULL") return json(res, 409, { error: "No available confirmed slot" });
    console.error(e);
    return json(res, 500, { error: "Unable to update registration" });
  }
};
