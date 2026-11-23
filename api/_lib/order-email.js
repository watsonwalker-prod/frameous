// Order summary + customer confirmation email + owner note, built from a retrieved
// Checkout Session (expanded line_items.data.price.product, payment_intent.latest_charge,
// shipping_cost.shipping_rate). Ported from the approved template
// order-confirmation.html (Syne 800 headline, Instrument Sans body, IBM Plex Mono labels).
// Not a function: files under api/_lib are not deployed as endpoints.

const TZ = "America/Chicago";
const SITE = "https://fraimous.com";
const FALLBACK_HERO = SITE + "/og.jpg"; // site share image, used only when no room/cutout image exists

const FRAME_LABEL = { black: "black frame", white: "white frame", oak: "red oak frame", none: "no frame" };
const FINISH_LABEL = { luster: "Luster", mat: "Mat", canvas: "Canvas" };

const esc = (v) =>
  String(v == null ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const money = (cents, currency) => {
  if (cents == null) return "";
  const cur = String(currency || "usd").toUpperCase();
  const s = "$" + (Number(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return cur === "USD" ? s : `${s} ${cur}`;
};

const fmtDate = (d) => d.toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric", year: "numeric" });
const fmtShort = (d) => d.toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric" });

// Add business days (Mon–Fri, no holiday calendar) to a timestamp, in Chicago time.
const addBusinessDays = (fromMs, n) => {
  const d = new Date(fromMs);
  let left = n;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = new Date(d.toLocaleString("en-US", { timeZone: TZ })).getDay();
    if (wd !== 0 && wd !== 6) left -= 1;
  }
  return d;
};

const unitWord = (unit, n) => {
  const u = String(unit || "day").replace(/_/g, " ");
  return n === 1 ? u : u + "s";
};

const deliveryEstimate = (rate, createdSec) => {
  const de = rate && typeof rate === "object" ? rate.delivery_estimate : null;
  if (!de || (!de.minimum && !de.maximum)) return null;
  const min = de.minimum, max = de.maximum;
  let text;
  if (min && max) text = `${min.value}–${max.value} ${unitWord(max.unit, max.value)}`;
  else if (max) text = `up to ${max.value} ${unitWord(max.unit, max.value)}`;
  else text = `${min.value}+ ${unitWord(min.unit, min.value)}`;
  let range = null;
  if (min && max && min.unit === "business_day" && max.unit === "business_day" && createdSec) {
    const a = addBusinessDays(createdSec * 1000, min.value);
    const b = addBusinessDays(createdSec * 1000, max.value);
    range = `${fmtShort(a)} – ${fmtShort(b)}`;
  }
  return { text, range };
};

const legacyItems = (meta) => {
  try {
    const arr = JSON.parse((meta && meta.items) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

function summarize(s) {
  s = s || {};
  const meta = s.metadata || {};
  const lis = (s.line_items && s.line_items.data) || [];
  const legacy = legacyItems(meta);
  const items = lis
    .filter((li) => !/^US shipping$/i.test(String(li.description || ""))) // sessions made before this change
    .map((li, i) => {
      const price = li.price || {};
      const prod = price.product && typeof price.product === "object" ? price.product : {};
      const pm = prod.metadata || {};
      const lg = legacy[i] || {};
      const name = String(li.description || prod.name || "");
      const title = pm.title || lg.title || name.split(" — ")[0] || "Print";
      const finish = String(pm.finish || lg.finish || "luster").toLowerCase();
      const frame = String(pm.frame || lg.frame || "");
      const size = pm.size || lg.size || "";
      return {
        slug: pm.slug || lg.slug || "",
        title,
        name,
        size,
        sizeLabel: pm.size_label || size,
        finish,
        frame,
        finishLabel:
          (FINISH_LABEL[finish] || finish.charAt(0).toUpperCase() + finish.slice(1)) +
          (finish === "canvas" ? ", gallery wrap" : frame ? ", " + (FRAME_LABEL[frame] || frame + " frame") : ""),
        qty: li.quantity || 1,
        amount: li.amount_total,
      };
    });

  const ci = s.collected_information || {};
  const sd = ci.shipping_details || s.shipping_details || null;
  const addr = (sd && sd.address) || {};
  const shipTo = sd
    ? {
        name: sd.name || "",
        line1: addr.line1 || "",
        line2: addr.line2 || "",
        city: addr.city || "",
        state: addr.state || "",
        postal_code: addr.postal_code || "",
        country: addr.country || "",
      }
    : null;

  const sc = s.shipping_cost || {};
  const rate = sc.shipping_rate && typeof sc.shipping_rate === "object" ? sc.shipping_rate : null;
  const shippingCents =
    (s.total_details && s.total_details.amount_shipping != null ? s.total_details.amount_shipping : null) ??
    (sc.amount_total != null ? sc.amount_total : null);

  const pi = s.payment_intent && typeof s.payment_intent === "object" ? s.payment_intent : null;
  const charge = pi && pi.latest_charge && typeof pi.latest_charge === "object" ? pi.latest_charge : null;
  const cd = s.customer_details || {};

  // Subtotal / discount (Stripe total_details + discounts). MEMBER25 today is baked into price_data,
  // so live sessions usually report no discount; the line shows only when Stripe reports one.
  const td = s.total_details || {};
  const discountCents = Number(td.amount_discount) || 0;
  const bd = (td.breakdown && td.breakdown.discounts) || [];
  const codeOf = (d) => {
    if (!d || typeof d !== "object") return "";
    const pc = d.promotion_code && typeof d.promotion_code === "object" ? d.promotion_code.code : "";
    const cp = d.coupon && typeof d.coupon === "object" ? d.coupon.name || d.coupon.id : "";
    return pc || cp || "";
  };
  const discountCode = String(
    (bd[0] && codeOf(bd[0].discount)) || (Array.isArray(s.discounts) && s.discounts[0] && codeOf(s.discounts[0])) ||
    (meta.pricing === "member25" ? "MEMBER25" : "")
  ).toUpperCase();
  const subtotalCents = s.amount_subtotal != null ? s.amount_subtotal : null;

  return {
    subtotalCents,
    subtotal: subtotalCents != null ? money(subtotalCents, s.currency) : "",
    discountCents,
    discount: discountCents ? money(discountCents, s.currency) : "",
    discountCode,
    sessionId: s.id || "",
    orderNumber: s.client_reference_id || meta.order_number || (pi && pi.metadata && pi.metadata.order_number) || "",
    placed: s.created ? fmtDate(new Date(s.created * 1000)) : "",
    created: s.created || null,
    currency: s.currency || "usd",
    totalCents: s.amount_total,
    total: money(s.amount_total, s.currency),
    shippingCents,
    shipping: shippingCents ? money(shippingCents, s.currency) : "",
    shippingLabel: (rate && rate.display_name) || "",
    estimate: deliveryEstimate(rate, s.created),
    items,
    shipTo,
    email: cd.email || s.customer_email || "",
    paid: s.payment_status === "paid",
    status: { paid: "Paid", no_payment_required: "Confirmed" }[s.payment_status] || "",
    receiptUrl: (charge && charge.receipt_url) || "",
    paymentIntentId: pi ? pi.id : typeof s.payment_intent === "string" ? s.payment_intent : "",
    paymentIntentMetadata: (pi && pi.metadata) || {},
    sessionMetadata: meta,
    livemode: !!s.livemode,
  };
}

// Hero = the purchased work's room image (library/web/mocks/{slug}_room.jpg) when it exists on
// fraimous.com, else that exact variant's cutout, else the site share image. Never a fixed work.
async function pickHero(order, fetchImpl) {
  const f = fetchImpl || fetch;
  const first = order.items[0] || {};
  const slug = String(first.slug || "").replace(/[^a-z0-9-]/gi, "");
  const sf = String(first.size || "16×20").replace(/[×X]/g, "x");
  const candidates = [];
  if (slug) {
    candidates.push(`${SITE}/library/web/mocks/${slug}_room.jpg`);
    if (first.finish === "canvas") candidates.push(`${SITE}/library/mocks/cutouts/${slug}_canvas_${sf}.png`);
    else if (first.finish === "mat") candidates.push(`${SITE}/library/mocks/cutouts/${slug}_mat_${first.frame || "black"}_${sf}.png`);
    else candidates.push(`${SITE}/library/mocks/cutouts/${slug}_${first.frame || "black"}_${sf}.png`);
  }
  for (const url of candidates) {
    try {
      const r = await f(url, { method: "HEAD", signal: AbortSignal.timeout(3000) });
      if (r && r.ok) return { url, alt: `${first.title || "Your piece"} — FRAIMOUS` };
    } catch {}
  }
  return { url: FALLBACK_HERO, alt: "FRAIMOUS" };
}

const LABEL = "padding:7px 0;width:112px;vertical-align:top;font-family:'IBM Plex Mono', 'Courier New', monospace;font-size:10px;line-height:18px;letter-spacing:0.16em;text-transform:uppercase;color:#8a7564;";
const VALUE = "padding:7px 0;vertical-align:top;font-family:'Instrument Sans', Arial, sans-serif;font-size:15px;line-height:18px;color:#1a100c;";
const SUB = "font-size:13px;color:#3a281c;";

const row = (label, valueHtml) => `
                <tr>
                  <td style="${LABEL}">${esc(label)}</td>
                  <td style="${VALUE}">${valueHtml}</td>
                </tr>`;

function renderEmail(order, opts = {}) {
  const hero = opts.hero || { url: FALLBACK_HERO, alt: "FRAIMOUS" };
  const first = order.items[0] || {};
  const slug = String(first.slug || "").replace(/[^a-z0-9-]/gi, "");
  const seeIt = slug ? `${SITE}/works/${slug}` : SITE + "/";
  const support = opts.supportEmail || "";

  let rows = "";
  if (order.orderNumber) rows += row("Order", esc(order.orderNumber));
  if (order.placed) rows += row("Placed", esc(order.placed));
  order.items.forEach((it, i) => {
    rows += row(
      order.items.length > 1 ? `Piece ${i + 1}` : "Piece",
      `${esc(it.title)}<br /><span style="${SUB}">${esc(it.sizeLabel)} &middot; ${esc(it.finishLabel)} &times; ${esc(it.qty)}</span>`
    );
  });
  if (order.total && order.discountCents > 0) {
    // Itemized: subtotal, discount (named), shipping, total.
    if (order.subtotal) rows += row("Subtotal", esc(order.subtotal));
    rows += row("Discount", (order.discountCode ? esc(order.discountCode) + " " : "") + "&minus;" + esc(order.discount));
    rows += row("Shipping", order.shippingCents ? esc(order.shipping) : "Free" + (order.shippingLabel ? `<br /><span style="${SUB}">${esc(order.shippingLabel)}</span>` : ""));
    rows += row("Total", `<strong>${esc(order.total)}</strong>`);
  } else if (order.total) {
    const shipBit = order.shipping
      ? `<br /><span style="${SUB}">incl. ${esc(order.shipping)} ${esc((order.shippingLabel || "shipping").toLowerCase())}</span>`
      : "";
    rows += row("Total", esc(order.total) + shipBit);
  }
  if (order.shipTo && order.shipTo.name) {
    const a = order.shipTo;
    const cityLine = [a.city, [a.state, a.postal_code].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    const lines = [[a.line1, a.line2].filter(Boolean).join(", "), cityLine, a.country && a.country !== "US" ? a.country : ""]
      .filter(Boolean)
      .map(esc)
      .join("<br />");
    rows += row("Ship to", `${esc(a.name)}${lines ? `<br /><span style="${SUB}">${lines}</span>` : ""}`);
  }
  if (order.status) rows += row("Status", esc(order.status));
  if (order.estimate) {
    rows += row(
      "Arrives",
      order.estimate.range
        ? `${esc(order.estimate.range)}<br /><span style="${SUB}">${esc(order.estimate.text)}, estimate</span>`
        : `${esc(order.estimate.text)}<br /><span style="${SUB}">estimate</span>`
    );
  }
  // No Tracking row yet: tracking comes from Printful once shipped.

  const receipt = order.receiptUrl
    ? `<p style="margin:0 0 10px;font-family:'IBM Plex Mono', 'Courier New', monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;"><a href="${esc(order.receiptUrl)}" target="_blank" style="color:#6b5646;text-decoration:underline;">Payment receipt</a></p>`
    : "";
  const questions = support
    ? `<p style="margin:0;font-family:'Instrument Sans', Arial, sans-serif;font-size:13px;line-height:1.5;color:#6b5646;">Questions? Reply to this email or write <a href="mailto:${esc(support)}" style="color:#1a100c;text-decoration:underline;">${esc(support)}</a>.</p>`
    : "";
  const footNote = receipt || questions
    ? `
          <tr>
            <td align="center" bgcolor="#f6efe6" style="padding:0 28px 26px;background:#f6efe6;">
              ${receipt}${questions}
            </td>
          </tr>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>FRAIMOUS — order confirmed</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Instrument+Sans:wght@400;500;600&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background:#f6efe6;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">
    ${order.orderNumber ? `Order ${esc(order.orderNumber)}. ` : ""}Framed. Ready to hang.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f6efe6;">
    <tr>
      <td align="center" style="padding:0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background:#f6efe6;">
          <tr>
            <td align="center" bgcolor="#1a100c" style="background:#1a100c;padding:18px 20px;">
              <a href="${SITE}/" target="_blank" style="text-decoration:none;">
                <img src="${SITE}/images/fraimous-wordmark.png" width="200" height="24" alt="FRAIMOUS" style="display:block;width:200px;max-width:70%;height:auto;border:0;" />
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0;line-height:0;font-size:0;">
              <a href="${esc(seeIt)}" target="_blank" style="display:block;text-decoration:none;">
                <img src="${esc(hero.url)}" width="600" alt="${esc(hero.alt)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" bgcolor="#f6efe6" style="padding:22px 28px 8px;background:#f6efe6;">
              <h1 style="margin:0;font-family:'Syne', Arial, sans-serif;font-weight:800;font-size:34px;line-height:1.05;letter-spacing:0.01em;text-transform:uppercase;color:#1a100c;">Order confirmed</h1>
              <p style="margin:10px 0 0;font-family:'Instrument Sans', Arial, sans-serif;font-size:16px;line-height:1.45;color:#3a281c;">Yours. Framed. Ready to hang.</p>
            </td>
          </tr>
          <tr>
            <td bgcolor="#f6efe6" style="padding:18px 28px 4px;background:#f6efe6;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-top:1px solid #1a100c;border-bottom:1px solid #1a100c;">
                <tr><td colspan="2" style="padding:6px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>${rows}
                <tr><td colspan="2" style="padding:0 0 6px;font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" bgcolor="#f6efe6" style="padding:22px 28px 18px;background:#f6efe6;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="#1a100c" style="background:#1a100c;">
                    <a href="${esc(seeIt)}" target="_blank" style="display:inline-block;background:#1a100c;color:#f6efe6;font-family:'IBM Plex Mono', 'Courier New', monospace;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;padding:14px 32px;">See it</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>${footNote}
          <tr>
            <td align="center" bgcolor="#1a100c" style="background:#1a100c;padding:16px 20px 20px;">
              <p style="margin:0 0 8px;line-height:0;font-size:0;">
                <img src="${SITE}/images/fraimous-wordmark.png" width="140" height="17" alt="FRAIMOUS" style="display:block;width:140px;height:auto;border:0;margin:0 auto;" />
              </p>
              <p style="margin:0;font-family:'IBM Plex Mono', 'Courier New', monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#a08d7c;">Ready to hang. Too big to be polite.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const a = order.shipTo || {};
  const text = [
    "ORDER CONFIRMED",
    "Yours. Framed. Ready to hang.",
    "",
    order.orderNumber && `Order: ${order.orderNumber}`,
    order.placed && `Placed: ${order.placed}`,
    ...order.items.map((it) => `Piece: ${it.title} — ${it.sizeLabel} · ${it.finishLabel} × ${it.qty}`),
    order.discountCents > 0 && order.subtotal && `Subtotal: ${order.subtotal}`,
    order.discountCents > 0 && `Discount: ${order.discountCode ? order.discountCode + " " : ""}-${order.discount}`,
    order.discountCents > 0 && `Shipping: ${order.shippingCents ? order.shipping : "Free"}`,
    order.total && (order.discountCents > 0 ? `Total: ${order.total}` : `Total: ${order.total}${order.shipping ? ` (incl. ${order.shipping} shipping)` : ""}`),
    a.name && `Ship to: ${[a.name, a.line1, a.line2, [a.city, [a.state, a.postal_code].filter(Boolean).join(" ")].filter(Boolean).join(", "), a.country].filter(Boolean).join(", ")}`,
    order.status && `Status: ${order.status}`,
    order.estimate && `Arrives: ${order.estimate.range ? order.estimate.range + " (" + order.estimate.text + ", estimate)" : order.estimate.text + " (estimate)"}`,
    "",
    `See it: ${seeIt}`,
    order.receiptUrl && `Payment receipt: ${order.receiptUrl}`,
    support && `Questions? Reply to this email or write ${support}.`,
  ]
    .filter((x) => x !== false && x != null && x !== undefined)
    .join("\n");

  return {
    subject: `Order confirmed — ${order.orderNumber || "FRAIMOUS"}`,
    html,
    text,
  };
}

// Owner note: same plain-text format the old paid.js sent, plus the order number (and finish).
function ownerNote(order) {
  const a = order.shipTo || {};
  const message = [
    "FRAIMOUS paid order",
    `order ${order.orderNumber || "(none)"}`,
    "",
    order.items.map((x) => `${x.title} — ${x.finish}, ${x.finish === "canvas" ? "gallery wrap" : x.frame}, ${x.size} ×${x.qty}`).join("\n") || "(no lines)",
    "",
    `stripe ${order.sessionId}`,
    `amount ${order.total}`,
    order.shipping ? `shipping ${order.shipping}${order.shippingLabel ? " · " + order.shippingLabel : ""}${order.estimate ? " · " + order.estimate.text : ""}` : "",
    "",
    "ship to",
    [a.name, a.line1, a.line2, [a.city, a.state, a.postal_code].filter(Boolean).join(", "), a.country].filter(Boolean).join("\n"),
    "",
    `customer ${order.email}`,
  ].join("\n");
  const first = order.items[0];
  return {
    name: a.name || "FRAIMOUS order",
    subject: `FRAIMOUS paid — ${order.orderNumber ? order.orderNumber + " — " : ""}${(first && first.title) || "print"}`,
    message,
  };
}

module.exports = { summarize, pickHero, renderEmail, ownerNote, esc, money, FALLBACK_HERO };
