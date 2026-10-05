const { json, clearAdminCookie } = require("../_lib");

module.exports = async function handler(req, res) {
  clearAdminCookie(res);
  return json(res, 200, { ok: true });
};
