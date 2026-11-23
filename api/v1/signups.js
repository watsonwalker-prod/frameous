// GET /api/v1/signups?list=notify|join  with header Authorization: Bearer <EXPORT_TOKEN>. Returns CSV.
const crypto = require("crypto");
module.exports = async (req, res) => {
  const want = (process.env.EXPORT_TOKEN || "").trim();
  const got = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  const a = Buffer.from(got), b = Buffer.from(want);
  if (!want || a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ ok: false });
  const list = req.query.list === "join" ? "fraimous:join" : "fraimous:notify";
  const url = (process.env.KV_REST_API_URL || "").replace(/\/+$/, "");
  const r = await fetch(url, { method: "POST", headers: { Authorization: "Bearer " + process.env.KV_REST_API_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify(["LRANGE", list, 0, -1]) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) return res.status(500).json({ ok: false, error: "store" });
  const esc = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
  const rows = ["timestamp,kind,source,slug,email"];
  for (const x of j.result || []) { try { const o = JSON.parse(x); rows.push([o.t, o.kind, o.source, o.slug, o.email].map(esc).join(",")); } catch {} }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).send(rows.join("\n") + "\n");
};
