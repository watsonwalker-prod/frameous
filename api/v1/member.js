// POST /api/v1/member
//   { action:"join",  email, source? } -> { ok:true }   (idempotent; also re-registers browsers that joined
//                                                       before 2026-10-07)
//   { action:"login", email }          -> { ok:true }   (does NOT look anything up)
//
// Privacy (2026-10-10): nobody can confirm an email's membership or purchase history through this endpoint.
//   - log-in never reads the member list; it answers the same for every valid email. The browser just
//     remembers the email, and the server decides member pricing at checkout.
//   - join answers the same whether the email was new or already a member.
//   - both answer no sooner than a fixed floor (members.holdUntilFloor), so timing doesn't tell either.
// Email ownership is not verified yet (that needs a confirmation email via Resend). Rate-limited by IP.
// New joins only (created:true) get the Resend "welcome" template, once per email (Redis flag
// fraimous:welcomed:<email>, SET NX). Login and repeat joins never send. A send failure never fails the join.
const { validEmail, join, rateLimit, holdUntilFloor } = require("../_lib/members");

const COMPANY_ADDRESS = ", 2919 Commerce St. Suite 532, Dallas, TX 75226";
const UNSUB = "mailto:orders@fraimous.com?subject=Unsubscribe";

async function kvCmd(cmd) {
  const url = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "").trim().replace(/\/+$/, "");
  const token = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
  if (!url || !token) throw new Error("kv not configured");
  const r = await fetch(url, { method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify(cmd) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error("kv " + r.status);
  return j.result;
}

async function sendWelcome(email, name) {
  const key = (process.env.RESEND_API_KEY || "").trim();
  if (!key) { console.warn("welcome: RESEND_API_KEY not set; skipped"); return; }
  const flag = "fraimous:welcomed:" + email;
  try {
    const claimed = await kvCmd(["SET", flag, new Date().toISOString(), "NX"]);
    if (claimed !== "OK") return; // already welcomed
  } catch (e) {
    console.error("welcome: flag error, skipped:", e && e.message);
    return;
  }
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: ctl.signal,
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json", "Idempotency-Key": "fraimous-welcome-" + email },
      body: JSON.stringify({
        from: "FRAIMOUS <orders@fraimous.com>",
        to: [email],
        headers: { "List-Unsubscribe": "<" + UNSUB + ">" },
        template: {
          id: "welcome",
          variables: { CUSTOMER_NAME: name || "there", PROMO_CODE: "MEMBER25", COMPANY_ADDRESS, RESEND_UNSUBSCRIBE_URL: UNSUB },
        },
      }),
    });
    clearTimeout(timer);
    const out = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("welcome: resend error", r.status, out && (out.name || out.message));
      await kvCmd(["DEL", flag]).catch(() => {});
      return;
    }
    console.log("welcome: sent", out && out.id);
  } catch (e) {
    console.error("welcome: send failed:", e && e.message);
    await kvCmd(["DEL", flag]).catch(() => {});
  }
}

const LIMITS = {
  join: { limit: 8, windowSec: 600 },   // 8 joins / 10 min / IP
  login: { limit: 10, windowSec: 600 }, // 10 logins / 10 min / IP
};

module.exports = async (req, res) => {
  const startedAt = Date.now();
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }
  let data = req.body;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch { data = {}; }
  }
  if (!data || typeof data !== "object") data = {};
  const action = String(data.action || "").toLowerCase();
  if (action !== "join" && action !== "login") return res.status(400).json({ ok: false, error: "action" });

  const rl = await rateLimit(req, "member-" + action, LIMITS[action]);
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfter));
    return res.status(429).json({ ok: false, error: "rate", message: "Too many tries. Wait a few minutes." });
  }

  const email = validEmail(data.email);
  if (!email) return res.status(400).json({ ok: false, error: "email", message: "Enter a valid email." });

  if (action === "login") {
    await holdUntilFloor(startedAt, "login");
    return res.status(200).json({ ok: true });
  }

  const j = await join(email, { source: data.source });
  await holdUntilFloor(startedAt, "join");
  if (!j.ok) {
    console.error("member: join failed:", j.error);
    return res.status(503).json({ ok: false, error: "store", message: "Couldn’t save that right now. Try again in a minute." });
  }
  if (j.created) {
    const name = String(data.name || "").trim().slice(0, 60);
    try { await sendWelcome(email, name); } catch (e) { console.error("welcome: unexpected:", e && e.message); }
  }
  return res.status(200).json({ ok: true });
};
