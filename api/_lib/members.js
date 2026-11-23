// FRAIMOUS member store (server side). Source of truth for member pricing and MEMBER25.
//
// Backends, picked automatically:
//   1. Redis over REST (Vercel KV / Upstash) when KV_REST_API_URL + KV_REST_API_TOKEN
//      (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN) are set. Also used for rate limits.
//   2. Otherwise Stripe Customers (STRIPE_SECRET_KEY, already on the server): one Customer per member,
//      email lowercased, metadata fraimous_member=true + joined_at. Not a coupon, not a payment.
//      The Stripe account is shared, so we never edit another business's Customer: we only read
//      Customers carrying metadata.fraimous_member=true and create our own.
// With KV on, lookups fall back to Stripe once (members who joined before KV) and backfill KV.
const crypto = require("crypto");
const { stripeGet, stripePost } = require("./stripe-rest");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const normEmail = (e) => String(e || "").trim().toLowerCase();
const validEmail = (e) => {
  const v = normEmail(e);
  return v.length <= 254 && EMAIL_RE.test(v) ? v : "";
};
// QA addresses (qa+anything@fraimous.com) are tagged fraimous_qa=true so they are easy to find and remove.
const isQaEmail = (e) => /^qa(\+[^@]*)?@fraimous\.com$/.test(normEmail(e));

const kvConf = () => {
  const url = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "").trim().replace(/\/+$/, "");
  const token = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
  return url && token ? { url, token } : null;
};
const backendName = () => (kvConf() ? "kv" : "stripe");

// One Redis command over the Upstash REST API: ["SET", key, value] -> result. Throws on error.
async function kv(cmd) {
  const c = kvConf();
  if (!c) throw new Error("kv not configured");
  const r = await fetch(c.url, {
    method: "POST",
    headers: { Authorization: "Bearer " + c.token, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error("kv " + r.status);
  return j.result;
}
const kvKey = (email) => "fraimous:member:" + email;

// Positive lookups are cached per warm instance for a minute (members don't un-join).
const memo = new Map();
const MEMO_MS = 60 * 1000;

async function stripeFind(key, email) {
  const r = await stripeGet("customers", { key, params: { email, limit: 100 } });
  if (!r.ok || !r.data || !Array.isArray(r.data.data)) return { ok: false, error: "stripe list " + r.status };
  const c = r.data.data.find((x) => x && x.metadata && x.metadata.fraimous_member === "true");
  return { ok: true, customer: c || null };
}

// -> { ok:true, member:boolean, joinedAt? } | { ok:false, error }
async function isMember(email, { key = process.env.STRIPE_SECRET_KEY } = {}) {
  const em = validEmail(email);
  if (!em) return { ok: true, member: false };
  const hit = memo.get(em);
  if (hit && Date.now() - hit.at < MEMO_MS) return { ok: true, member: true, joinedAt: hit.joinedAt };
  try {
    if (kvConf()) {
      const v = await kv(["GET", kvKey(em)]);
      if (v) {
        let joinedAt = "";
        try { joinedAt = JSON.parse(v).joined_at || ""; } catch { /* ignore */ }
        memo.set(em, { at: Date.now(), joinedAt });
        return { ok: true, member: true, joinedAt };
      }
      if (!key) return { ok: true, member: false };
    }
    if (!key) return { ok: false, error: "no store" };
    const f = await stripeFind(key, em);
    if (!f.ok) return f;
    if (!f.customer) return { ok: true, member: false };
    const joinedAt = f.customer.metadata.joined_at || "";
    memo.set(em, { at: Date.now(), joinedAt });
    if (kvConf()) await kv(["SET", kvKey(em), JSON.stringify({ joined_at: joinedAt, stripe: f.customer.id })]).catch(() => {});
    return { ok: true, member: true, joinedAt };
  } catch (e) {
    return { ok: false, error: (e && e.message) || "error" };
  }
}

// Idempotent. -> { ok:true, created:boolean } | { ok:false, error }
async function join(email, { source = "popup", key = process.env.STRIPE_SECRET_KEY } = {}) {
  const em = validEmail(email);
  if (!em) return { ok: false, error: "email" };
  const now = new Date().toISOString();
  try {
    const have = await isMember(em, { key });
    if (!have.ok) return have;
    if (have.member) return { ok: true, created: false };
    const src = String(source || "popup").replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "popup";
    if (kvConf()) {
      const rec = { joined_at: now, source: src };
      if (isQaEmail(em)) rec.fraimous_qa = true;
      // NX: first join wins (keeps the original joined_at).
      await kv(["SET", kvKey(em), JSON.stringify(rec), "NX"]);
      memo.set(em, { at: Date.now(), joinedAt: now });
      return { ok: true, created: true };
    }
    if (!key) return { ok: false, error: "no store" };
    const params = {
      email: em,
      description: "FRAIMOUS member",
      metadata: { fraimous_member: "true", joined_at: now, source: "fraimous", join_source: src },
    };
    if (isQaEmail(em)) params.metadata.fraimous_qa = "true";
    // Same key for the same email for 24 h: concurrent joins can't create two Customers.
    const idem = "fraimous-member-" + crypto.createHash("sha256").update(em).digest("hex").slice(0, 40);
    const r = await stripePost("customers", { key, params, idempotencyKey: idem });
    if (!r.ok || !r.data || !r.data.id) {
      // A concurrent join for the same email (same idempotency key) may have created it already.
      const again = await stripeFind(key, em);
      if (again.ok && again.customer) return { ok: true, created: false };
      return { ok: false, error: "stripe create " + r.status };
    }
    memo.set(em, { at: Date.now(), joinedAt: now });
    return { ok: true, created: true };
  } catch (e) {
    return { ok: false, error: (e && e.message) || "error" };
  }
}

// ---- Rate limit by IP. Shared across instances when KV exists; else per warm instance (best effort). ----
const buckets = new Map();
const clientIp = (req) => {
  const h = (req && req.headers) || {};
  const xf = String(h["x-forwarded-for"] || "").split(",")[0].trim();
  return xf || String(h["x-real-ip"] || "") || (req.socket && req.socket.remoteAddress) || "unknown";
};
// -> { ok:true } | { ok:false, retryAfter }
// `id` overrides the IP (e.g. a hashed email for per-email limits).
async function rateLimit(req, name, { limit, windowSec, id } = {}) {
  const who = id || clientIp(req);
  const win = Math.floor(Date.now() / 1000 / windowSec);
  const k = `fraimous:rl:${name}:${who}:${win}`;
  const retryAfter = windowSec - (Math.floor(Date.now() / 1000) % windowSec);
  if (kvConf()) {
    try {
      const n = await kv(["INCR", k]);
      if (n === 1) await kv(["EXPIRE", k, String(windowSec + 5)]);
      return n > limit ? { ok: false, retryAfter } : { ok: true };
    } catch { /* fall through to memory */ }
  }
  const now = Date.now();
  if (buckets.size > 5000) for (const [bk, v] of buckets) if (v.until < now) buckets.delete(bk);
  const b = buckets.get(k) || { n: 0, until: now + windowSec * 1000 };
  b.n += 1;
  buckets.set(k, b);
  return b.n > limit ? { ok: false, retryAfter } : { ok: true };
}

// Hashed email for rate-limit keys (never store the raw address in a limiter key).
const emailId = (email) => "e" + crypto.createHash("sha256").update("fraimous-rl:" + normEmail(email)).digest("hex").slice(0, 24);

// ---- Uniform timing ----
// Member status and purchase history must not show up in response time. Handlers that touch the store
// answer no sooner than a fixed floor (plus a little jitter), so a store hit, a miss, a cache hit and a
// create all take the same time from outside. FRAIMOUS_FLOOR_SCALE (tests only) shrinks every floor.
const FLOORS = { join: 1500, login: 700, promo: 500, checkout: 2200 };
const floorMs = (name) => {
  const raw = String(process.env.FRAIMOUS_FLOOR_SCALE || "").trim();
  const scale = raw ? Number(raw) : NaN;
  const base = FLOORS[name] || 0;
  return Number.isFinite(scale) && scale >= 0 ? base * scale : base;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
async function holdUntilFloor(startedAt, name) {
  const floor = floorMs(name);
  if (!floor) return;
  const jitter = crypto.randomInt(0, Math.max(1, Math.round(floor * 0.1)));
  await sleep(floor + jitter - (Date.now() - startedAt));
}

module.exports = { normEmail, validEmail, isQaEmail, isMember, join, rateLimit, backendName, clientIp, emailId, holdUntilFloor, floorMs };
