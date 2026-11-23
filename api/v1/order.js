// GET /api/v1/order?n=FRM-YYMMDD-XXXXX  (or ?n=cs_... Checkout Session id)  — called by /order.
// READ ONLY: only GETs to Stripe (list/retrieve sessions + line items). Never creates or updates anything.
// Returns ONLY: order number, date, status, and per piece title/slug/size/finish/frame/qty + preview URL.
// No email, name, address or amounts. Unknown, malformed, unpaid or non-FRAIMOUS -> same 404.
const { stripeGet } = require("../_lib/stripe-rest");

const SITE = "https://fraimous.com";
const TZ = "America/Chicago";
const ORDER_RE = /^FRM-(\d{2})(\d{2})(\d{2})-([0-9A-HJKMNP-TV-Z]{5})$/;
const SESSION_RE = /^cs_(live|test)_[A-Za-z0-9]{10,200}$/;
const FINISH_LABEL = { luster: "Luster", mat: "Mat", canvas: "Canvas" };
const FRAME_LABEL = { black: "Black frame", white: "White frame", oak: "Red oak frame", none: "No frame" };

// Basic rate limit (per warm instance, best effort): 20 lookups / 10 min / IP.
const HITS = new Map();
const WINDOW = 10 * 60 * 1000, LIMIT = 20;
const limited = (ip) => {
  const now = Date.now();
  const arr = (HITS.get(ip) || []).filter((t) => now - t < WINDOW);
  arr.push(now);
  HITS.set(ip, arr);
  if (HITS.size > 5000) HITS.clear();
  return arr.length > LIMIT;
};

const isFraimous = (s) => {
  const md = (s && s.metadata) || {};
  return md.source === "fraimous" || /^FRM-\d{6}-[0-9A-Z]{5}$/.test(String(md.order_number || s.client_reference_id || ""));
};
const orderNo = (s) => String(s.client_reference_id || (s.metadata && s.metadata.order_number) || "");

async function findByNumber(key, n) {
  const m = n.match(ORDER_RE);
  const y = 2000 + Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
  // Chicago day is 05:00–06:00 UTC offset; widen the window and match exactly.
  const gte = Math.floor(Date.UTC(y, mo, d, 3, 0, 0) / 1000);
  const lte = Math.floor(Date.UTC(y, mo, d + 1, 8, 0, 0) / 1000);
  let after = null;
  for (let page = 0; page < 20; page++) {
    const params = { limit: 100, created: { gte, lte } };
    if (after) params.starting_after = after;
    const r = await stripeGet("checkout/sessions", { key, params });
    if (!r.ok || !r.data || !Array.isArray(r.data.data)) throw new Error("list " + r.status);
    const hit = r.data.data.find((s) => orderNo(s) === n);
    if (hit) return hit;
    if (!r.data.has_more || !r.data.data.length) return null;
    after = r.data.data[r.data.data.length - 1].id;
  }
  return null;
}

async function head(url) {
  try {
    const r = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(2500) });
    return r.ok;
  } catch { return false; }
}

async function previewFor(it) {
  const slug = String(it.slug || "").replace(/[^a-z0-9-]/gi, "");
  if (!slug) return SITE + "/og.jpg";
  const sf = String(it.size || "16×20").replace(/[×X]/g, "x");
  const c = [];
  if (it.finish === "canvas") c.push(`${SITE}/library/mocks/cutouts/${slug}_canvas_${sf}.png`);
  else if (it.finish === "mat") c.push(`${SITE}/library/mocks/cutouts/${slug}_mat_${it.frame || "black"}_${sf}.png`);
  else c.push(`${SITE}/library/mocks/cutouts/${slug}_${it.frame || "black"}_${sf}.png`);
  c.push(`${SITE}/library/mocks/cutouts/${slug}_black_16x20.png`, `${SITE}/library/web/mocks/${slug}_room.jpg`);
  for (const u of c) if (await head(u)) return u;
  return SITE + "/og.jpg";
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  if (req.method !== "GET") return res.status(405).json({ ok: false });
  const notFound = () => res.status(404).json({ ok: false, error: "not_found" });

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "?";
  if (limited(ip)) return res.status(429).json({ ok: false, error: "slow_down" });

  const n = String((req.query && req.query.n) || "").trim().toUpperCase().replace(/\s+/g, "");
  const raw = String((req.query && req.query.n) || "").trim();
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(503).json({ ok: false, error: "unavailable" });

  let s = null;
  try {
    if (ORDER_RE.test(n)) s = await findByNumber(key, n);
    else if (SESSION_RE.test(raw)) {
      const r = await stripeGet("checkout/sessions/" + encodeURIComponent(raw), { key });
      s = r.ok ? r.data : null;
    } else return notFound();
  } catch {
    return res.status(502).json({ ok: false, error: "unavailable" });
  }
  if (!s || !isFraimous(s) || s.status !== "complete") return notFound();

  let lis = [];
  try {
    const r = await stripeGet(`checkout/sessions/${encodeURIComponent(s.id)}/line_items`, {
      key, params: { limit: 20 }, expand: ["data.price.product"],
    });
    lis = (r.ok && r.data && r.data.data) || [];
  } catch {}

  const items = await Promise.all(lis
    .filter((li) => !/^US shipping$/i.test(String(li.description || "")))
    .map(async (li) => {
      const prod = li.price && typeof li.price.product === "object" ? li.price.product : {};
      const pm = prod.metadata || {};
      const finish = String(pm.finish || "luster").toLowerCase();
      const frame = String(pm.frame || "");
      const it = {
        title: pm.title || String(li.description || "").split(" — ")[0] || "Print",
        slug: pm.slug || "",
        size: pm.size || "",
        sizeLabel: pm.size_label || pm.size || "",
        finish,
        finishLabel: (FINISH_LABEL[finish] || finish) + (finish === "canvas" ? ", gallery wrap" : frame ? ", " + (FRAME_LABEL[frame] || frame).toLowerCase() : ""),
        frame,
        qty: li.quantity || 1,
      };
      it.preview = await previewFor(it);
      return it;
    }));

  const paid = s.payment_status === "paid" || s.payment_status === "no_payment_required";
  return res.status(200).json({
    ok: true,
    orderNumber: orderNo(s) || null,
    placed: s.created ? new Date(s.created * 1000).toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric", year: "numeric" }) : "",
    payment: paid ? "paid" : "processing",
    status: paid ? "Paid · being made" : "Payment processing",
    statusNote: paid ? "Each piece is made to order, then framed and shipped. Usually 5–11 business days." : "We’ll email you as soon as your payment clears.",
    items,
  });
};
