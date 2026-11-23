// Closed. This used to email [email removed] from a browser POST with no payment check.
// A Printful push must not start here. Paid orders are read from the Stripe webhook.
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Allow", "POST");
  if (req.method === "OPTIONS") return res.status(204).end();
  return res.status(410).json({ ok: false, error: "closed" });
};
