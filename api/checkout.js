const crypto = require("crypto");
const { stripePost } = require("./_lib/stripe-rest");
const { countSold, canonSlug, encodeEditions, EDITION_SIZE, leftOf, loadSoldFile, mergeSold, unitCentsFor, publicBump } = require("./_lib/editions");
const { PROMO_CODE, SEASONAL_CODE, SEASONAL_SLUGS, RETIRED_CODES, normCode, memberPricing } = require("./_lib/promo");
const { SGE_MULT, sgeOpen, listUnitCents, chargeUnitCents, isSgeSlug, isOkSgeSize } = require("./_lib/sge");
const { lineSkuMeta } = require("./_lib/skus");
const members = require("./_lib/members");

// Order number: FRM-YYMMDD-XXXXX (Chicago date + 5 Crockford base32 chars, no I/L/O/U).
// No database here, so uniqueness is statistical: 32^5 = 33.5M codes per day. At 50 orders
// in one day the chance of any clash is about 0.004%. The Stripe session id stays the
// canonical key; the order number is the human one (email, thanks page, Printful external_id).
const CROCKFORD = "[phone removed]ABCDEFGHJKMNPQRSTVWXYZ";
const newOrderNumber = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago", year: "2-digit", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const get = (t) => (parts.find((p) => p.type === t) || {}).value || "00";
  let rand = "";
  for (let i = 0; i < 5; i++) rand += CROCKFORD[crypto.randomInt(32)];
  return `FRM-${get("year")}${get("month")}${get("day")}-${rand}`;
};

// Privacy (2026-10-10): the response never says which price applied or why (no pricing / pricingNote fields), both
// member lookups always run, and a successful answer is held to a fixed floor. What's left: the Stripe session
// total itself (member, MEMBER25 or public price), which the buyer must see before paying. That's limited per IP
// and per email below; the full fix is email confirmation via Resend.
const LIMITS = {
  ip: { limit: 10, windowSec: 600 },      // 10 sessions / 10 min / IP
  email: { limit: 5, windowSec: 3600 },   // 5 sessions / hour / checkout email, from any IP
};

// Slugs (after alias mapping) that are not in the in-stock list. Exported for tests.
// Snow Globe Effect works: priced in api/_lib/sge.js from the canonical standard table (never from the page).
// The Set = 2 prints, automatically 46% off (no code). For sale. A paid order emails the shop. It does not send itself to Printful.
function notInStock(slugs) {
  const { IN_STOCK, canonSlug } = require("./_lib/editions");
  const ok = new Set(IN_STOCK.map((s) => canonSlug(s)));
  if (sgeOpen()) Object.keys(SGE_MULT).forEach((s) => ok.add(s));
  return [...new Set((slugs || []).map((s) => canonSlug(String(s || ""))))].filter((k) => !ok.has(k));
}

module.exports = async (req, res) => {
  const startedAt = Date.now();
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  let data = req.body;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch { data = {}; }
  }
  if (!data || typeof data !== "object") data = {};

  const email = String(data.email || "").trim();
  const name = String(data.name || "").trim();
  const itemsIn = Array.isArray(data.items) ? data.items : [];
  if (!itemsIn.length) {
    return res.status(400).json({ ok: false, error: "empty" });
  }
  if (!email || !name) {
    return res.status(400).json({ ok: false, error: "missing" });
  }

  const rlIp = await members.rateLimit(req, "checkout", LIMITS.ip);
  const rlEmail = rlIp.ok ? await members.rateLimit(req, "checkout-email", { ...LIMITS.email, id: members.emailId(email) }) : rlIp;
  if (!rlIp.ok || !rlEmail.ok) {
    res.setHeader("Retry-After", String((rlIp.ok ? rlEmail : rlIp).retryAfter));
    return res.status(429).json({ ok: false, error: "rate", message: "Too many tries. Wait a few minutes." });
  }

  const key = process.env.STRIPE_SECRET_KEY;
  // Publishable key for Stripe.js on the pay page (public by design). Must match the secret key's mode.
  // With a usable key: on-page Checkout Elements. Without one (missing, malformed, or the other
  // mode): fall back to a Stripe-hosted Checkout page, which needs only the secret key.
  const pkEnv = (process.env.STRIPE_PUBLISHABLE_KEY || "").trim();
  const keyLive = /^(sk|rk)_live_/.test(key);
  const pkUsable = /^pk_(live|test)_/.test(pkEnv) && /^pk_live_/.test(pkEnv) === keyLive;
  if (pkEnv && !pkUsable) {
    console.error("checkout: STRIPE_PUBLISHABLE_KEY malformed or not the same mode as STRIPE_SECRET_KEY; using hosted Checkout");
  }
  const hosted = !pkUsable;
  const publishableKey = hosted ? "" : pkEnv;

  const SHIP = { medium: { first: 1399, extra: 495 }, large: { first: 2999, extra: 1495 } };
  const LARGE = new Set(["24×36", "36×24", "24x36", "36x24", "40×55", "40×60", "40x55", "40x60", "55×40", "60×40", "55x40", "60x40"]);
  const TITLES = {
    "thyrsus": "Thyrsus",
    "floral-rifle": "Thyrsus",
    "cabin-seven": "Vesper",
    "ring-seven": "Cestus",
    "desert-seven": "Harena",
    "orbital-library": "Athenaeum",
    "collar": "Torquis",
    "doll-pilot": "Pupa",
    "lunar-walk": "Lunaris",
    "cubes": "Tessera",
    "grid-ascent": "Ascensus",
    "daisy-iron": "Bellis",
    "white-pad": "Volatus",
    "horse-floor": "Equus",
    "glass-walk": "Viridarium",
    "moon-terrace": "Plenilunium",
    "the-point": "The Point",
    "the-embrace": "The Embrace",
    "the-set": "The Set: The Point + The Embrace",
  };

  const norm = (s) => String(s || "").replace(/[xX]/g, "×");
  const titleOf = (item) => TITLES[item.slug] || item.title || "Print";
  
  const SIZE_LABEL = {
    "16×20": "Medium 16×20",
    "18×24": "Large 18×24",
    "24×36": "Gallery 24×36",
    "18×12": "Medium 18×12",
    "24×18": "Large 24×18",
    "36×24": "Gallery 36×24",
    "40×55": "Large 40×55",
    "40×60": "Gallery 40×60",
    "55×40": "Large 55×40",
    "60×40": "Gallery 60×40",
  };
  const CANVAS_SIZE_LABEL = {
    "24×36": "Medium 24×36",
    "36×24": "Medium 36×24",
    "40×55": "Large 40×55",
    "55×40": "Large 55×40",
    "40×60": "Gallery 40×60",
    "60×40": "Gallery 60×40",
  };
  const sizeLabel = (size, finish) => {
    const key = norm(size);
    const fin = String(finish || "luster").toLowerCase();
    if (fin === "canvas") return CANVAS_SIZE_LABEL[key] || size || "24×36";
    return SIZE_LABEL[key] || size || "16×20";
  };

  // Unit amounts: computed after edition left is known (see below). Originals in _lib/editions
  // (Scala 6× + $250-floor). Stripe Nexus catalog prices are NOT re-priced — we use price_data.

  let medium = 0;
  let large = 0;
  const lines = [];
  itemsIn.forEach((item) => {
    const qty = Math.max(1, parseInt(item.qty, 10) || 1);
    const size = item.size || "16×20";
    const frame = item.frame || "black";
    const finish = item.finish || "luster";
    const title = titleOf(item);
    lines.push({
      slug: item.slug,
      title,
      frame,
      finish,
      size,
      qty,
      cents: 0, // filled after edition left + pricing mode
    });
    if (LARGE.has(String(size))) large += qty;
    else medium += qty;
  });

  let shipCents = 0;
  if (medium) shipCents += SHIP.medium.first + SHIP.medium.extra * (medium - 1);
  if (large) shipCents += SHIP.large.first + SHIP.large.extra * (large - 1);

  // Limited edition of 25 per work, all variants together. Sum this cart per work (aliases merged)
  // and check it against the real paid count in Stripe. If the count can't be read, refuse: never guess.
  // (Small race: two buyers can pass this check for the last unit at the same moment.)
  // Only released works can be bought (IN_STOCK in api/_lib/editions.js). Checked before any Stripe call.
  const notReady = notInStock(lines.map((l) => l.slug));
  if (notReady.length) {
    const names = [...new Set(lines.filter((l) => notReady.includes(canonSlug(l.slug))).map((l) => l.title || l.slug))];
    const message = (names.length ? names.join(", ") + " " + (names.length > 1 ? "aren’t" : "isn’t") + " available yet." : "Not available yet.") + " Remove it from your cart to continue.";
    return res.status(400).json({ ok: false, error: "not_available", message, slugs: notReady });
  }
  // Promo codes: one per order. MEMBER25 = main site only. 5N0W84LL3FFCT is accepted on The Set only but does not stack
  // (The Set is already 46% off automatically). Retired codes are invalid.
  const codesIn = [data.promoCode, data.promo].concat(Array.isArray(data.promoCodes) ? data.promoCodes : [])
    .map((c) => normCode(c)).filter(Boolean);
  const codes = [...new Set(codesIn)];
  if (codes.length > 1) return res.status(400).json({ ok: false, error: "promo_stack", message: "Use one code per order." });
  const code = codes[0] || "";
  const isSge = (l) => isSgeSlug(canonSlug(l.slug));
  if (code && (RETIRED_CODES.includes(code) || (code !== PROMO_CODE && code !== SEASONAL_CODE))) {
    return res.status(400).json({ ok: false, error: "promo_invalid", message: "That code isn’t valid." });
  }
  const notFor = (bad) => {
    const names = [...new Set(bad.map((l) => l.title || l.slug))];
    return res.status(400).json({ ok: false, error: "promo_not_valid_for_item", message: `${code} isn’t valid for ${names.join(", ")}.`, slugs: [...new Set(bad.map((l) => canonSlug(l.slug)))] });
  };
  if (code === SEASONAL_CODE) {
    const bad = lines.filter((l) => !SEASONAL_SLUGS.includes(canonSlug(l.slug)));
    if (bad.length) return notFor(bad);
  }
  if (code === PROMO_CODE) {
    const bad = lines.filter(isSge);
    if (bad.length) return notFor(bad);
  }
  for (const l of lines.filter(isSge)) {
    if (listUnitCents(l.slug, l.size, l.finish) == null || !isOkSgeSize(l.size, l.finish)) {
      return res.status(400).json({ ok: false, error: "size", message: "That size isn’t available for this piece." });
    }
  }
  if (!key) return res.status(503).json({ ok: false, error: "stripe" });

  const wanted = {};
  const titleBySlug = {};
  lines.forEach((l) => {
    const k = canonSlug(l.slug);
    wanted[k] = (wanted[k] || 0) + l.qty;
    titleBySlug[k] = titleBySlug[k] || l.title;
  });
  const counted = await countSold({ key });
  if (!counted.ok) {
    console.error("checkout: edition count failed:", counted.error);
    return res.status(503).json({ ok: false, error: "editions", message: "Couldn’t confirm availability. Try again in a minute." });
  }
  counted.sold = mergeSold(counted.sold, loadSoldFile());
  const short = Object.keys(wanted)
    .map((k) => ({ slug: k, title: titleBySlug[k], requested: wanted[k], left: leftOf(counted.sold, k) }))
    .filter((w) => w.requested > w.left);
  if (short.length) {
    const message = short.map((w) => (w.left === 0 ? `${w.title}: Sold out.` : `${w.title}: Only ${w.left} left.`)).join(" ");
    return res.status(409).json({ ok: false, error: "edition", message, works: short });
  }

  // Pricing mode: public (bumped) | member (original) | member25 (75% of original, first purchase only).
  // Member status comes from the SERVER member list for the checkout email (api/_lib/members.js), never
  // from the browser flag. MEMBER25 is the only promo code, baked into price_data (no Stripe coupon / promotion code).
  // The browser's member flag / pricing claim is ignored entirely. Both lookups always run (memberPricing).
  const promoRaw = normCode(data.promoCode || data.promo || "");
  const wantsMember25 = code === PROMO_CODE;
  const mp = await memberPricing({ key, email });
  if (!mp.ok) {
    console.error("checkout: member pricing lookup failed:", mp.error);
    return res.status(503).json({ ok: false, error: "editions", message: "Couldn’t confirm pricing. Try again in a minute." });
  }
  const pricing = wantsMember25 && mp.member25 ? "member25" : mp.member ? "member" : "public";

  const leftBySlug = {};
  Object.keys(wanted).forEach((k) => { leftBySlug[k] = leftOf(counted.sold, k); });
  lines.forEach((l) => {
    const k = canonSlug(l.slug);
    let unit;
    if (isSgeSlug(k)) {
      // SGE: canonical standard table x prints. The Set is always 46% off (round(list * 0.54)).
      // 5N0W84LL3FFCT does not stack. No bump, no member pricing.
      unit = chargeUnitCents(l.slug, l.size, l.finish);
    } else {
      unit = unitCentsFor(l.size, l.finish, l.slug, leftBySlug[k], pricing);
    }
    l.cents = unit * l.qty;
    l.unitCents = unit;
    l.pricing = pricing;
    l.publicBump = publicBump(leftBySlug[k]);
  });

  const orderNumber = newOrderNumber();
  // Short, human summary only. Per-line details live on each line's product_data.metadata.
  const itemsSummary = lines
    .map((l) => `${l.slug}|${norm(l.size)}|${l.finish}|${l.finish === "canvas" ? "wrap" : l.frame}|x${l.qty}`)
    .join("; ")
    .slice(0, 500);

  const params = new URLSearchParams();
  params.append("mode", "payment");
  if (hosted) {
    // Fallback: Stripe-hosted Checkout page (ui_mode omitted = hosted default), redirect from checkout.html.
    params.append("success_url", "https://fraimous.com/thanks?session_id={CHECKOUT_SESSION_ID}");
    params.append("cancel_url", "https://fraimous.com/checkout");
  } else {
    // Payment stays on fraimous.com: Checkout Sessions + Elements (Payment Element), no hosted page.
    params.append("ui_mode", "elements");
    params.append("return_url", "https://fraimous.com/thanks?session_id={CHECKOUT_SESSION_ID}");
  }
  // No Stripe promotion codes: MEMBER25 (the only code) is applied above in price_data.
  params.append("customer_email", email);
  params.append("client_reference_id", orderNumber);
  params.append("metadata[order_number]", orderNumber);
  params.append("metadata[items_summary]", itemsSummary);
  // Edition counting reads these (api/_lib/editions.js): source marks FRAIMOUS sessions on the shared account.
  params.append("metadata[source]", "fraimous");
  params.append("metadata[editions]", encodeEditions(wanted));
  params.append("metadata[pricing]", pricing);
  if (code) params.append("metadata[promo]", code);
  params.append("metadata[email]", email.slice(0, 200));
  params.append("payment_intent_data[metadata][order_number]", orderNumber);
  params.append("payment_intent_data[metadata][source]", "fraimous");
  // Unpaid sessions expire after 35 min (Stripe default is 24 h) so an old open checkout can't
  // be paid long after a work sold out.
  params.append("expires_at", String(Math.floor(Date.now() / 1000) + 35 * 60));
  // Buyer confirmation fallback: until Resend is set up, Stripe sends its own receipt (live mode only).
  // Once RESEND_API_KEY exists the webhook sends the FRAIMOUS email instead, so no receipt_email (no double send).
  if (!process.env.RESEND_API_KEY) params.append("payment_intent_data[receipt_email]", email);
  // Ship-to is collected by Stripe (set from the form on the pay page), not stored in metadata.
  params.append("shipping_address_collection[allowed_countries][0]", "US");
  params.append("shipping_address_collection[allowed_countries][1]", "CA");

  lines.forEach((line, i) => {
    const p = `line_items[${i}][price_data]`;
    params.append(`line_items[${i}][quantity]`, String(line.qty));
    params.append(`${p}[currency]`, "usd");
    params.append(`${p}[unit_amount]`, String(Math.round(line.cents / line.qty)));
    params.append(`${p}[product_data][name]`, `${line.title} — ${line.finish || "luster"}, ${line.frame}, ${sizeLabel(line.size, line.finish)}`);
    params.append(`${p}[product_data][metadata][slug]`, String(line.slug || "").slice(0, 100));
    params.append(`${p}[product_data][metadata][title]`, String(line.title || "").slice(0, 100));
    params.append(`${p}[product_data][metadata][size]`, String(line.size || "").slice(0, 20));
    params.append(`${p}[product_data][metadata][size_label]`, String(sizeLabel(line.size, line.finish)).slice(0, 40));
    params.append(`${p}[product_data][metadata][finish]`, String(line.finish || "").slice(0, 20));
    params.append(`${p}[product_data][metadata][frame]`, String(line.frame || "").slice(0, 20));
    // Snow Globe lines reuse the shop's finish SKUs (FRM / MAT / CAN). Shop finish stays "luster"|"mat"|"canvas".
    const skuMeta = lineSkuMeta(line);
    if (skuMeta) {
      Object.keys(skuMeta).forEach((k) => {
        params.append(`${p}[product_data][metadata][${k}]`, String(skuMeta[k]).slice(0, 500));
      });
    }
  });
  // Shipping: same amounts and band logic as before, now a Checkout shipping option
  // (was a separate "US shipping" line item). Estimate = Printful Standard, print + transit.
  if (shipCents) {
    const s = "shipping_options[0][shipping_rate_data]";
    params.append(`${s}[type]`, "fixed_amount");
    params.append(`${s}[display_name]`, "Standard shipping");
    params.append(`${s}[fixed_amount][amount]`, String(shipCents));
    params.append(`${s}[fixed_amount][currency]`, "usd");
    params.append(`${s}[delivery_estimate][minimum][unit]`, "business_day");
    params.append(`${s}[delivery_estimate][minimum][value]`, "5");
    params.append(`${s}[delivery_estimate][maximum][unit]`, "business_day");
    params.append(`${s}[delivery_estimate][maximum][value]`, "11");
  }

  try {
    const r = await stripePost("checkout/sessions", { key, params });
    const out = r.data || {};
    if (hosted) {
      if (!r.ok || !out.url) {
        console.error("checkout: stripe error (hosted)", r.status, out.error && out.error.message);
        return res.status(502).json({ ok: false, error: "stripe" });
      }
      await members.holdUntilFloor(startedAt, "checkout");
      return res.status(200).json({ ok: true, mode: "hosted", id: out.id, url: out.url, orderNumber });
    }
    if (!r.ok || !out.client_secret) {
      console.error("checkout: stripe error", r.status, out.error && out.error.message);
      return res.status(502).json({ ok: false, error: "stripe" });
    }
    await members.holdUntilFloor(startedAt, "checkout");
    return res.status(200).json({
      mode: "elements",
      ok: true,
      id: out.id,
      clientSecret: out.client_secret,
      publishableKey,
      orderNumber,
    });
  } catch (err) {
    return res.status(502).json({ ok: false, error: "stripe" });
  }
};
module.exports.notInStock = notInStock;
module.exports.listUnitCents = listUnitCents;
module.exports.chargeUnitCents = chargeUnitCents;
