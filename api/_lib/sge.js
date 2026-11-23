// Snow Globe Effect pricing. Checkout charges from this table (never from the page).
// The Set (the-set) is 2 prints and automatically 46% off for everyone (no code needed).
// 5N0W84LL3FFCT is accepted as a valid, non-stacking code: it does not apply a second discount.
const { SEASONAL_OFF } = require("./promo");

const PRICE = {
  "16×20": 25000, "18×12": 25000,
  "18×24": 28750, "24×18": 28750,
  "24×36": 33063, "36×24": 33063,
};
const CANVAS_PRICE = {
  "16×20": 26500, "18×12": 26500,
  "18×24": 30475, "24×18": 30475,
  "24×36": 26500, "36×24": 26500,
  "40×55": 30475, "55×40": 30475,
  "40×60": 35046, "60×40": 35046,
};
const SGE_MULT = { "the-point": 1, "the-embrace": 1, "the-set": 2 };
const SET_SALE_SLUG = "the-set";

const sgeOpen = () => true;
const normSize = (s) => String(s || "").replace(/[xX]/g, "×");
const isSgeSlug = (slug) => Object.prototype.hasOwnProperty.call(SGE_MULT, String(slug || "").trim().toLowerCase());
const isSetSale = (slug) => String(slug || "").trim().toLowerCase() === SET_SALE_SLUG;

// Allowed sizes as api/checkout.js historically enforced (no 18×12 / 24×18 aliases at checkout).
const isOkSgeSize = (size, finish) => {
  const key = normSize(size);
  const fin = String(finish || "luster").toLowerCase();
  if (fin === "canvas") return ["24×36", "40×55", "40×60"].includes(key);
  return ["16×20", "18×24", "24×36"].includes(key);
};

const listUnitCents = (slug, size, finish) => {
  const k = String(slug || "").trim().toLowerCase();
  const fin = String(finish || "luster").toLowerCase();
  const base = (fin === "canvas" ? CANVAS_PRICE : PRICE)[normSize(size)];
  if (!base || !SGE_MULT[k]) return null;
  return base * SGE_MULT[k];
};

// Charged amount = list, except The Set is always round(list * 0.54) cents. Promo codes never stack on this.
const chargeUnitCents = (slug, size, finish) => {
  const list = listUnitCents(slug, size, finish);
  if (list == null) return null;
  if (isSetSale(slug)) return Math.round(list * (1 - SEASONAL_OFF));
  return list;
};

const allSetPrices = () => {
  const framed = [
    ["Medium", "16×20", "luster"],
    ["Large", "18×24", "luster"],
    ["Gallery", "24×36", "luster"],
  ];
  const canvas = [
    ["Medium", "24×36", "canvas"],
    ["Large", "40×55", "canvas"],
    ["Gallery", "40×60", "canvas"],
  ];
  const row = (label, size, finish) => {
    const list = listUnitCents(SET_SALE_SLUG, size, finish);
    const sale = chargeUnitCents(SET_SALE_SLUG, size, finish);
    return { finish, size, label, listCents: list, saleCents: sale, list: list / 100, sale: sale / 100 };
  };
  return {
    framed: framed.map(([label, size, finish]) => row(label, size, finish)),
    canvas: canvas.map(([label, size, finish]) => row(label, size, finish)),
  };
};

module.exports = {
  PRICE, CANVAS_PRICE, SGE_MULT, SET_SALE_SLUG, SEASONAL_OFF,
  sgeOpen, normSize, isSgeSlug, isSetSale, isOkSgeSize,
  listUnitCents, chargeUnitCents, allSetPrices,
};
