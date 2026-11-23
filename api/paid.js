// GET /api/paid?session_id=cs_...  (called by thanks.html)
// READ ONLY: returns order info for the thanks page. It no longer sends anything;
// the owner note and the customer email go out from /api/v1/webhooks/stripe.
const { stripeGet } = require("./_lib/stripe-rest");
const { summarize } = require("./_lib/order-email");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ ok: false });
  const key = process.env.STRIPE_SECRET_KEY;
  const id = String((req.query && req.query.session_id) || "").trim();
  if (!key || !/^cs_[A-Za-z0-9_]+$/.test(id)) return res.status(400).json({ ok: false });

  let r;
  try {
    r = await stripeGet("checkout/sessions/" + encodeURIComponent(id), {
      key,
      expand: ["line_items", "line_items.data.price.product", "shipping_cost.shipping_rate"],
    });
  } catch {
    return res.status(502).json({ ok: false });
  }
  const session = r.data || {};
  if (!r.ok) return res.status(r.status === 404 ? 404 : 502).json({ ok: false });
  if (session.payment_status !== "paid") {
    return res.status(402).json({
      ok: false,
      paid: false,
      status: session.status || "",
      payment_status: session.payment_status || "",
    });
  }

  const o = summarize(session);
  // The session id is in the thanks URL. Do not return the email or street address with it.
  return res.status(200).json({
    ok: true,
    paid: true,
    orderNumber: o.orderNumber,
    items: o.items.map((x) => ({
      title: x.title, size: x.size, sizeLabel: x.sizeLabel, qty: x.qty,
    })),
    amountFormatted: o.total,
    shipping: o.shippingCents
      ? { formatted: o.shipping, label: o.shippingLabel, estimate: o.estimate }
      : null,
  });
};
