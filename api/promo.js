// POST /api/promo { code } -> is this a valid code?
// ok:   { ok:true, code:"MEMBER25", message }   (the same answer for every email)
// fail: { ok:false, reason:"invalid"|"rate", message }
// Privacy (2026-10-10): no member or purchase lookup happens here, so this can't reveal either. Whether MEMBER25
// actually applies is decided server-side by api/checkout.js when it builds the session. Rate-limited by IP.
const { codeCheck } = require("./_lib/promo");
const { rateLimit, holdUntilFloor } = require("./_lib/members");

module.exports = async (req, res) => {
  const startedAt = Date.now();
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }
  const rl = await rateLimit(req, "promo", { limit: 20, windowSec: 600 });
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfter));
    return res.status(429).json({ ok: false, reason: "rate", message: "Too many tries. Wait a few minutes." });
  }
  let data = req.body;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch { data = {}; }
  }
  if (!data || typeof data !== "object") data = {};
  const out = codeCheck(data.code);
  await holdUntilFloor(startedAt, "promo");
  return res.status(200).json(out);
};
