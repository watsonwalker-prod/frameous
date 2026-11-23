// GET /api/v1/editions -> { slug: { edition: 25, sold, left, publicBump, original, public, member, member25 } }
// Real counts (paid FRAIMOUS sessions) merged with src/data/edition-sold.json overrides.
// On any error, or with no key: { ok:false } and the UI shows just "Edition of 25". Never a guess.
const { countSold, editionsView, loadSoldFile, mergeSold } = require("../_lib/editions");

const TTL_MS = 60 * 1000;
let memo = null;      // { at, body } per warm instance (also shields Stripe from cache-busting query strings)
let inflight = null;

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ ok: false });
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(503).json({ ok: false });
  }
  if (!memo || Date.now() - memo.at > TTL_MS) {
    if (!inflight) {
      inflight = countSold({ key })
        .then((r) => {
          if (r.ok) {
            const fileSold = loadSoldFile();
            const sold = mergeSold(r.sold, fileSold);
            memo = { at: Date.now(), body: editionsView(sold) };
          } else {
            console.error("editions: count failed:", r.error);
          }
          return r.ok;
        })
        .finally(() => { inflight = null; });
    }
    const ok = await inflight;
    if (!ok) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(503).json({ ok: false });
    }
  }
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return res.status(200).json(memo.body);
};
