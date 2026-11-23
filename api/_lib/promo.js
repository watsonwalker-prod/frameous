// MEMBER25: the only promo code (the old welcome code was retired 2026-10-07).
// 25% off the ORIGINAL price, a member's first FRAIMOUS purchase only.
// Baked into Checkout price_data by api/checkout.js (unitCentsFor(..., "member25")). No Stripe coupon / promotion code.
//
// Eligibility (server side only, decided when api/checkout.js builds the session; the browser's flag is ignored):
//   1. code is MEMBER25
//   2. the checkout email is on the server member list (api/_lib/members.js)
//   3. no prior paid FRAIMOUS Checkout Session for that email (emailHasPriorPaid)
//
// Privacy (2026-10-10): /api/promo only says whether the CODE is valid. It never looks up the email, so it can't
// reveal membership or past purchases. The member and prior-purchase lookups always run together, so the
// check takes the same path whatever the answer.
const { emailHasPriorPaid } = require("./editions");
const members = require("./members");

const PROMO_CODE = "MEMBER25";
// Snow Globe Effect: The Set is automatically 46% off (no code needed). 5N0W84LL3FFCT remains valid but does
// not stack — checkout charges the same sale price. Not valid on the-point, the-embrace, or main-site works;
// never combined with MEMBER25 (one code per order). Enforced in api/checkout.js.
const SEASONAL_CODE = "5N0W84LL3FFCT";
const SEASONAL_SLUGS = ["the-set"];
const SEASONAL_OFF = 0.46;
const RETIRED_CODES = ["SN0WB4LL3FCT"];
const normCode = (c) => String(c || "").trim().toUpperCase();

const MESSAGES = {
  invalid: "That code isn’t valid.",
  saved: "MEMBER25 saved. It applies at checkout if this email is eligible.",
  seasonal: "46% off The Set is already applied. No code needed.",
  check: "Couldn’t check the code. Try again in a minute.",
};

// Code only, no lookups. -> { ok:true, code, message } | { ok:false, reason:"invalid", message }
function codeCheck(code) {
  const c = normCode(code);
  if (c === SEASONAL_CODE) return { ok: true, code: SEASONAL_CODE, message: MESSAGES.seasonal };
  if (c !== PROMO_CODE) return { ok: false, reason: "invalid", message: MESSAGES.invalid };
  return { ok: true, code: PROMO_CODE, message: MESSAGES.saved };
}

// Server-only, for api/checkout.js. Both lookups always run (in parallel), whatever the answer.
// -> { ok:true, member:boolean, member25:boolean } | { ok:false, error }
async function memberPricing({ key, email, prior = emailHasPriorPaid, isMember = members.isMember } = {}) {
  const em = members.validEmail(email);
  if (!em) return { ok: true, member: false, member25: false };
  const [m, p] = await Promise.all([
    Promise.resolve().then(() => isMember(em, { key })).catch((e) => ({ ok: false, error: e && e.message })),
    Promise.resolve().then(() => prior({ key, email: em })).catch((e) => ({ ok: false, error: e && e.message })),
  ]);
  if (!m || !m.ok) return { ok: false, error: "member: " + (m && m.error) };
  if (!p || !p.ok) return { ok: false, error: "prior: " + (p && p.error) };
  return { ok: true, member: !!m.member, member25: !!m.member && !p.prior };
}

module.exports = { PROMO_CODE, SEASONAL_CODE, SEASONAL_SLUGS, SEASONAL_OFF, RETIRED_CODES, MESSAGES, normCode, codeCheck, memberPricing };
