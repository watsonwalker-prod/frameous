// Tiny Stripe REST helper (no SDK: this project has no package.json / node_modules).
// Files under api/_lib are not deployed as functions (underscore prefix).
//
// The API version is PINNED so ui_mode "elements" and the response shapes used here do not
// depend on the account's default API version. Stripe.js on checkout.html is loaded from the
// matching release path (https://js.stripe.com/endive/stripe.js). Change both together.
const STRIPE_API_VERSION = "2026-09-30.endive";

const form = (params, prefix, out) => {
  out = out || new URLSearchParams();
  if (params == null) return out;
  Object.keys(params).forEach((k) => {
    const v = params[k];
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v == null) return;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item != null && typeof item === "object") form(item, `${key}[${i}]`, out);
        else out.append(`${key}[${i}]`, String(item));
      });
    } else if (typeof v === "object") {
      form(v, key, out);
    } else {
      out.append(key, String(v));
    }
  });
  return out;
};

async function stripeRequest(method, path, { key, params, expand, idempotencyKey } = {}) {
  if (!key) throw new Error("stripe key missing");
  const qs = new URLSearchParams();
  (expand || []).forEach((e) => qs.append("expand[]", e));
  let url = "https://api.stripe.com/v1/" + path;
  const headers = {
    Authorization: "Bearer " + key,
    "Stripe-Version": STRIPE_API_VERSION,
  };
  let body;
  if (method === "GET") {
    form(params, "", qs);
    const q = qs.toString();
    if (q) url += "?" + q;
  } else {
    body = params instanceof URLSearchParams ? params : form(params);
    qs.forEach((v, k) => body.append(k, v));
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  }
  const r = await fetch(url, { method, headers, body });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

const stripeGet = (path, opts) => stripeRequest("GET", path, opts);
const stripePost = (path, opts) => stripeRequest("POST", path, opts);

module.exports = { STRIPE_API_VERSION, stripeGet, stripePost, toForm: form };
