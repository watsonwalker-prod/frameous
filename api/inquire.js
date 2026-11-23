const { rateLimit } = require("./_lib/members");

const clip = (v, n) => String(v == null ? "" : v).replace(/[\r\n]/g, " ").trim().slice(0, n);

const kvConf = () => {
  const url = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "").trim().replace(/\/+$/, "");
  const token = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
  return url && token ? { url, token } : null;
};
async function kvPipe(cmds) {
  const c = kvConf();
  if (!c) throw new Error("kv not configured");
  const r = await fetch(c.url + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + c.token, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !Array.isArray(j) || j.some((x) => x && x.error)) throw new Error("kv " + r.status);
  return j.map((x) => x.result);
}
const UNSUB = "mailto:orders@fraimous.com?subject=Unsubscribe";
const COMPANY_ADDRESS = ", 2919 Commerce St. Suite 532, Dallas, TX 75226";
// Angels signup confirmation (Resend template alias angels-notify), once per email
// (Redis flag fraimous:notified:angels:<email>, SET NX). Never fails the signup.
async function sendAngelsNotify(email) {
  const key = (process.env.RESEND_API_KEY || "").trim();
  if (!key) { console.warn("angels-notify: RESEND_API_KEY not set; skipped"); return; }
  const flag = "fraimous:notified:angels:" + email;
  try {
    const [claimed] = await kvPipe([["SET", flag, new Date().toISOString(), "NX"]]);
    if (claimed !== "OK") return;
  } catch (e) { console.error("angels-notify: flag error, skipped:", e && e.message); return; }
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: ctl.signal,
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json", "Idempotency-Key": "fraimous-angels-notify-" + email },
      body: JSON.stringify({
        from: "FRAIMOUS <orders@fraimous.com>",
        to: [email],
        headers: { "List-Unsubscribe": "<" + UNSUB + ">" },
        template: { id: "angels-notify", variables: { UNSUB_URL: UNSUB, COMPANY_ADDRESS } },
      }),
    });
    clearTimeout(timer);
    const out = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("angels-notify: resend error", r.status, out && (out.name || out.message));
      await kvPipe([["DEL", flag]]).catch(() => {});
      return;
    }
    console.log("angels-notify: sent", out && out.id);
  } catch (e) {
    console.error("angels-notify: send failed:", e && e.message);
    await kvPipe([["DEL", flag]]).catch(() => {});
  }
}
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const rl = await rateLimit(req, "inquire", { limit: 8, windowSec: 600 });
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfter));
    return res.status(429).json({ ok: false, error: "rate" });
  }

  let data = req.body;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch { data = {}; }
  }
  if (!data || typeof data !== "object") data = {};

  const kind = clip(data.kind, 20).toLowerCase();
  const email = clip(data.email, 254);
  const name = clip(data.name, 80);
  const note = clip(data.note || data.message, 2000);
  const slug = clip(data.slug, 80);
  const title = clip(data.title || slug, 120);
  const provider = clip(data.provider, 40);
  const source = clip(data.source, 40);

  const isNotify = kind === "notify";
  const isJoin = kind === "join" || kind === "list";

  if (isJoin) {
    if (!email) return res.status(400).json({ ok: false, error: "missing" });
  } else if (isNotify) {
    if (!email || !slug) return res.status(400).json({ ok: false, error: "missing" });
  } else if (!email || !name || !note) {
    return res.status(400).json({ ok: false, error: "missing" });
  }

  // Save first. Notify/join signups are only "on the list" once Redis has them.
  if (isNotify || isJoin) {
    const em = email.toLowerCase();
    if (em.length > 254 || !EMAIL_OK.test(em)) return res.status(400).json({ ok: false, error: "email" });
    const list = isNotify ? "fraimous:notify" : "fraimous:join";
    const rec = JSON.stringify({ email: em, kind: isNotify ? "notify" : "join", slug, source: source || (isNotify ? slug : "list"), t: new Date().toISOString() });
    try {
      const [added] = await kvPipe([["SADD", list + ":set", (isNotify ? slug + ":" : "") + em]]);
      if (added === 1) await kvPipe([["RPUSH", list, rec]]);
    } catch (err) {
      console.error("signup save failed", list, err && err.message);
      return res.status(500).json({ ok: false, error: "store" });
    }
    if (isNotify && slug === "angels") {
      try { await sendAngelsNotify(em); } catch (e) { console.error("angels-notify: unexpected:", e && e.message); }
    }
    // Email relay is best effort; test addresses never relay.
    if (/@example\.com$/.test(em)) return res.status(200).json({ ok: true, stored: true, relay: "skipped" });
  }

  const to = isJoin ? "hello@fraimous.com" : "[email removed]";
  const subject = isJoin
    ? "FRAIMOUS list — " + email
    : isNotify
      ? "FRAIMOUS notify — " + (title || slug)
      : "FRAIMOUS inquire — " + name;

  const message = isJoin
    ? ["FRAIMOUS list", "", email, name, provider && ("provider: " + provider), source && ("source: " + source)]
        .filter(Boolean)
        .join("\n")
    : isNotify
      ? ["FRAIMOUS notify", "", email, slug, title].join("\n")
      : ["FRAIMOUS inquire", "", name, email, "", note].join("\n");

  const fromName = isJoin
    ? (name || "FRAIMOUS list")
    : isNotify
      ? (title || "FRAIMOUS notify")
      : (name || "FRAIMOUS inquire");

  try {
    const r = await fetch("https://formsubmit.co/ajax/" + to, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: "https://fraimous.com",
        Referer: "https://fraimous.com/",
      },
      body: JSON.stringify({
        name: fromName,
        email,
        _subject: subject,
        _template: "box",
        message,
      }),
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok) {
      if (isNotify || isJoin) return res.status(200).json({ ok: true, stored: true, relay: "failed" });
      return res.status(502).json({ ok: false, error: "mail" });
    }
    return res.status(200).json({ ok: true, activate: /activate|confirm/i.test(JSON.stringify(out)) });
  } catch (err) {
    if (isNotify || isJoin) return res.status(200).json({ ok: true, stored: true, relay: "failed" });
    return res.status(502).json({ ok: false, error: "mail" });
  }
};
