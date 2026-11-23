// Limited editions: every work is an edition of 25 paid units TOTAL (all sizes, frames, mats, canvas).
// No database: sold counts are read from Stripe at runtime (complete + paid Checkout Sessions),
// with optional per-slug overrides in src/data/edition-sold.json (Build Dash contract).
// Files under api/_lib are not deployed as functions (underscore prefix).
const fs = require("fs");
const path = require("path");
const { stripeGet } = require("./stripe-rest");

const EDITION_SIZE = 25;

// In-stock works (cards on /, /ascensus, /villa) plus Snow Globe Effect (the-point, the-embrace, the-set).
// Keep in sync with /editions.js pills (client reads this API by slug; no hardcoded list there).
const IN_STOCK = [
  "thyrsus", "daisy-iron", "fulmen", "clamor",
  "apex", "adscensus", "scala", "grid-ascent", "scandere", "culmen", "fastigium", "gradus", "clivus",
  "tigris", "osculum", "iuba", "collar", "horse-floor", "white-pad", "convivium", "bruma", "fulgor", "susurrus",
  "the-point", "the-embrace", "the-set",
];
// The Set is two prints: public editions contract matches cart.js SET_MULT / checkout.js SGE_MULT.
// originalCents / unitCentsFor stay 1x so checkout (which already multiplies by SGE_MULT) cannot double-charge.
const SET_MULT = { "the-set": 2 };

// Old/alternate slugs -> one counter per work (see vercel.json redirects).
const ALIASES = { "floral-rifle": "thyrsus", "equus": "horse-floor", "star-port": "orbit-paper" };
const canonSlug = (s) => {
  const k = String(s || "").trim().toLowerCase();
  return ALIASES[k] || k;
};

// Only sessions created on/after the FRAIMOUS live launch are listed (2026-10-05 00:00 CT).
const LAUNCH_CREATED_GTE = Math.floor(Date.UTC(2026, 9, 5, 5, 0, 0) / 1000);
const MAX_PAGES = 100; // 10,000 sessions; beyond that we refuse to guess (ok:false)

// Compact per-work count written on each new session: "thyrsus:1,horse-floor:2".
const encodeEditions = (map) => Object.keys(map).map((s) => `${s}:${map[s]}`).join(",").slice(0, 500);
const parseEditions = (str) => {
  if (typeof str !== "string" || !str.trim()) return null;
  const out = {};
  for (const part of str.split(",")) {
    const m = part.trim().match(/^([a-z0-9-]+):(\d{1,4})$/);
    if (!m) return null; // malformed -> fall back to line items
    const slug = canonSlug(m[1]);
    out[slug] = (out[slug] || 0) + Number(m[2]);
  }
  return out;
};

const isPaid = (s) => s && s.status === "complete" && (s.payment_status === "paid" || s.payment_status === "no_payment_required");
// Only FRAIMOUS sessions count: our metadata.source, or an FRM- order number from this site's checkout.
const isFraimous = (s) => {
  const md = (s && s.metadata) || {};
  if (md.source === "fraimous") return true;
  return /^FRM-\d{6}-[0-9A-Z]{5}$/.test(String(md.order_number || s.client_reference_id || ""));
};

async function lineItemCounts(key, sessionId, get) {
  const out = {};
  let startingAfter = null;
  for (let page = 0; page < 20; page++) {
    const params = { limit: 100 };
    if (startingAfter) params.starting_after = startingAfter;
    const r = await get(`checkout/sessions/${encodeURIComponent(sessionId)}/line_items`, { key, params, expand: ["data.price.product"] });
    if (!r.ok || !r.data || !Array.isArray(r.data.data)) throw new Error("line_items " + r.status);
    for (const li of r.data.data) {
      const product = li.price && li.price.product;
      const slug = product && typeof product === "object" && product.metadata && product.metadata.slug;
      if (!slug) continue; // shipping or a non-FRAIMOUS line
      const k = canonSlug(slug);
      out[k] = (out[k] || 0) + (Number(li.quantity) || 0);
    }
    if (!r.data.has_more || !r.data.data.length) return out;
    startingAfter = r.data.data[r.data.data.length - 1].id;
  }
  throw new Error("line_items paging limit");
}

// -> { ok:true, sold:{slug:n}, sessions:n } or { ok:false, error }
async function countSold({ key, get = stripeGet, since = LAUNCH_CREATED_GTE } = {}) {
  if (!key) return { ok: false, error: "no key" };
  const sold = {};
  const add = (map) => Object.keys(map).forEach((k) => { sold[k] = (sold[k] || 0) + map[k]; });
  let counted = 0;
  try {
    let startingAfter = null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const params = { limit: 100, status: "complete", created: { gte: since } };
      if (startingAfter) params.starting_after = startingAfter;
      const r = await get("checkout/sessions", { key, params });
      if (!r.ok || !r.data || !Array.isArray(r.data.data)) return { ok: false, error: "list " + r.status };
      const list = r.data.data;
      const needLines = [];
      for (const s of list) {
        if (!isPaid(s) || !isFraimous(s)) continue;
        counted++;
        const fromMeta = parseEditions(s.metadata && s.metadata.editions);
        if (fromMeta) add(fromMeta);
        else needLines.push(s.id);
      }
      for (let i = 0; i < needLines.length; i += 5) {
        const chunk = await Promise.all(needLines.slice(i, i + 5).map((id) => lineItemCounts(key, id, get)));
        chunk.forEach(add);
      }
      if (!r.data.has_more || !list.length) return { ok: true, sold, sessions: counted };
      startingAfter = list[list.length - 1].id;
    }
    return { ok: false, error: "too many pages" };
  } catch (e) {
    return { ok: false, error: (e && e.message) || "error" };
  }
}

// True if this email already has a paid FRAIMOUS Checkout Session (same isFraimous/isPaid rules).
async function emailHasPriorPaid({ key, email, get = stripeGet, since = LAUNCH_CREATED_GTE } = {}) {
  const want = String(email || "").trim().toLowerCase();
  if (!want) return { ok: false, error: "email" };
  if (!key) return { ok: false, error: "no key" };
  try {
    let startingAfter = null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const params = { limit: 100, status: "complete", created: { gte: since } };
      if (startingAfter) params.starting_after = startingAfter;
      const r = await get("checkout/sessions", { key, params });
      if (!r.ok || !r.data || !Array.isArray(r.data.data)) return { ok: false, error: "list " + r.status };
      const list = r.data.data;
      for (const s of list) {
        if (!isPaid(s) || !isFraimous(s)) continue;
        const em = String(
          s.customer_email ||
          (s.customer_details && s.customer_details.email) ||
          (s.metadata && s.metadata.email) ||
          ""
        ).trim().toLowerCase();
        if (em && em === want) return { ok: true, prior: true };
      }
      if (!r.data.has_more || !list.length) return { ok: true, prior: false };
      startingAfter = list[list.length - 1].id;
    }
    return { ok: false, error: "too many pages" };
  } catch (e) {
    return { ok: false, error: (e && e.message) || "error" };
  }
}

// Manual left override (Shea 2026-10-06): forces left without inventing Stripe sessions.
// Applied only when edition-sold.json does not list that slug.
const LEFT_OVERRIDE = { scala: 10 };

// Build Dash contract: slug -> sold. Missing/empty file = {}. Present slug wins over Stripe.
function loadSoldFile(root = process.cwd()) {
  try {
    const p = path.join(root, "src", "data", "edition-sold.json");
    const raw = fs.readFileSync(p, "utf8");
    const j = JSON.parse(raw);
    if (!j || typeof j !== "object" || Array.isArray(j)) return {};
    const out = {};
    Object.keys(j).forEach((k) => {
      const slug = canonSlug(k);
      const n = Number(j[k]);
      if (!slug || !Number.isFinite(n) || n < 0) return;
      out[slug] = Math.floor(n);
    });
    return out;
  } catch {
    return {};
  }
}

// Merge: file override when present for a slug, else Stripe count.
// LEFT_OVERRIDE (scala:10) kept unless the file lists that slug.
function mergeSold(stripeSold, fileSold) {
  const file = fileSold || {};
  const stripe = stripeSold || {};
  const out = {};
  const keys = new Set([...Object.keys(stripe), ...Object.keys(file), ...Object.keys(LEFT_OVERRIDE), ...IN_STOCK]);
  keys.forEach((raw) => {
    const k = canonSlug(raw);
    if (Object.prototype.hasOwnProperty.call(file, k)) {
      out[k] = file[k];
    } else if (LEFT_OVERRIDE[k] != null) {
      out[k] = Math.max(0, EDITION_SIZE - LEFT_OVERRIDE[k]);
    } else {
      out[k] = stripe[k] || 0;
    }
  });
  return out;
}

const leftOf = (sold, slug) => {
  const k = canonSlug(slug);
  return Math.max(0, EDITION_SIZE - (sold[k] || 0));
};

// Public scarcity bump: +0% at 25 left, +5% at 13 left, +10% at 1 left, never >10%.
// bump = 0.10 * (25 - left) / 24, clamped to [0, 0.10]. left=0 => sold out (no price).
const publicBump = (left) => {
  const n = Math.max(0, Math.floor(Number(left)));
  if (n <= 0) return 0;
  if (n >= EDITION_SIZE) return 0;
  const b = 0.10 * (EDITION_SIZE - n) / (EDITION_SIZE - 1);
  return Math.max(0, Math.min(0.10, b));
};

// Original framed cents (Stripe catalog / Nexus stay at these; do not re-price Products).
const ORIGINAL_FRAMED = {
  medium: 25000, // 16×20 / 18×12
  large: 28750,  // 18×24 / 24×18
  gallery: 33063, // 24×36 / 36×24
};
const ORIGINAL_CANVAS = {
  medium: 26500,
  large: 30475,
  gallery: 35046,
};
// Scala absolute originals (6× tables). Treated as Scala's "original".
const SCALA_FRAMED = { medium: 150000, large: 172500, gallery: 198378 };
const SCALA_CANVAS = { medium: 159000, large: 182850, gallery: 210276 };

const SIZE_TIER = {
  "16×20": "medium", "18×12": "medium",
  "18×24": "large", "24×18": "large",
  "24×36": "gallery", "36×24": "gallery",
  // Canvas large/gallery physical sizes map to large/gallery tiers for canvas tables.
  "40×55": "large", "55×40": "large",
  "40×60": "gallery", "60×40": "gallery",
};

const normSize = (size) => String(size || "").replace(/[xX]/g, "×");

const originalCents = (size, finish, slug) => {
  const isScala = canonSlug(slug) === "scala";
  const key = normSize(size);
  const tier = SIZE_TIER[key] || ((finish === "canvas") ? "medium" : "medium");
  if (finish === "canvas") {
    // Canvas Medium uses 24×36 which is gallery in framed SIZE_TIER — cart/checkout use separate canvas labels.
    // Match existing checkout tables: canvas 24×36 / 36×24 = medium canvas price; 40×55 = large; 40×60 = gallery.
    const canvasTier =
      key === "24×36" || key === "36×24" || key === "16×20" || key === "18×12" ? "medium" :
      key === "40×55" || key === "55×40" || key === "18×24" || key === "24×18" ? "large" :
      key === "40×60" || key === "60×40" ? "gallery" : "medium";
    const table = isScala ? SCALA_CANVAS : ORIGINAL_CANVAS;
    return table[canvasTier];
  }
  const table = isScala ? SCALA_FRAMED : ORIGINAL_FRAMED;
  return table[tier] || table.medium;
};

const applyBumpCents = (cents, bump) => Math.round(Number(cents) * (1 + Number(bump) || 0));
const member25Cents = (cents) => Math.round(Number(cents) * 0.75);

// pricing: "public" | "member" | "member25"
const unitCentsFor = (size, finish, slug, left, pricing) => {
  const orig = originalCents(size, finish, slug);
  const mode = String(pricing || "public").toLowerCase();
  if (mode === "member25") return member25Cents(orig);
  if (mode === "member") return orig;
  const bump = publicBump(left);
  return applyBumpCents(orig, bump);
};

const tierCentsView = (slug, left) => {
  const isScala = canonSlug(slug) === "scala";
  const framed = isScala ? SCALA_FRAMED : ORIGINAL_FRAMED;
  const bump = publicBump(left);
  const mult = SET_MULT[canonSlug(slug)] || 1;
  const sizes = {
    medium: framed.medium * mult,
    large: framed.large * mult,
    gallery: framed.gallery * mult,
  };
  const pub = {
    medium: applyBumpCents(sizes.medium, bump),
    large: applyBumpCents(sizes.large, bump),
    gallery: applyBumpCents(sizes.gallery, bump),
  };
  return {
    publicBump: bump,
    original: sizes,
    public: pub,
    member: sizes,
    member25: {
      medium: member25Cents(sizes.medium),
      large: member25Cents(sizes.large),
      gallery: member25Cents(sizes.gallery),
    },
  };
};

// Public shape for in-stock works (main site + Snow Globe Effect): { slug: { edition, sold, left, publicBump, ... } }
// Existing clients only read edition/sold/left — extra fields are additive. the-set original/public/member/member25 are 2x.
const editionsView = (sold) => {
  const out = {};
  IN_STOCK.forEach((slug) => {
    const n = sold[slug] || 0;
    const left = Math.max(0, EDITION_SIZE - n);
    const pricing = tierCentsView(slug, left);
    out[slug] = {
      edition: EDITION_SIZE,
      sold: n,
      left,
      publicBump: pricing.publicBump,
      original: pricing.original,
      public: pricing.public,
      member: pricing.member,
      member25: pricing.member25,
    };
  });
  return out;
};

module.exports = {
  EDITION_SIZE, IN_STOCK, SET_MULT, ALIASES, LAUNCH_CREATED_GTE, LEFT_OVERRIDE,
  ORIGINAL_FRAMED, ORIGINAL_CANVAS, SCALA_FRAMED, SCALA_CANVAS,
  canonSlug, encodeEditions, parseEditions, isPaid, isFraimous,
  countSold, emailHasPriorPaid, loadSoldFile, mergeSold,
  leftOf, publicBump, originalCents, applyBumpCents, member25Cents,
  unitCentsFor, tierCentsView, editionsView, normSize,
};
