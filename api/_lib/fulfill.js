// Gate for a Printful handoff. Nothing in this file calls Printful.
// A push is allowed only for a paid FRAIMOUS order whose every line has a
// server-side sync variant. Snow Globe works are not in Printful.

const SNOW_GLOBE = new Set(["the-point", "the-embrace", "the-set"]);

const isFraimousSession = (s) => {
  const md = (s && s.metadata) || {};
  if (md.source === "fraimous") return true;
  const n = String(md.order_number || (s && s.client_reference_id) || "");
  return /^FRM-\d{6}-[0-9A-Z]{5}$/.test(n);
};

// order.items come from the Stripe session summary, never from a browser POST.
function fulfillDecision(order) {
  const items = (order && order.items) || [];
  if (!items.length) return { ok: false, reason: "no_items" };
  const slugs = items.map((it) => String((it && it.slug) || "").trim().toLowerCase());
  if (slugs.some((s) => SNOW_GLOBE.has(s))) return { ok: false, reason: "not_in_printful" };
  if (items.some((it) => !it || !it.slug || !it.size || !it.finish)) {
    return { ok: false, reason: "incomplete_item" };
  }
  // No sync-variant map is stored for the live works. Refuse instead of guessing an id.
  return { ok: false, reason: "no_sync_variant" };
}

module.exports = { SNOW_GLOBE, isFraimousSession, fulfillDecision };
