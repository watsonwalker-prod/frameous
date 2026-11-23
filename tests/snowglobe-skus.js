// Offline: Snow Globe SKUs use the same finish products as the rest of the shop.
// Run: node tests/snowglobe-skus.js
const fs = require("fs");
const path = require("path");
const E = require("../api/_lib/editions.js");
const { FINISH_CATALOG, SGE, feedRows, lineSkuMeta, FEED_COLUMNS } = require("../api/_lib/skus.js");

const root = path.join(__dirname, "..");
let failed = 0;
const ok = (n, c) => { if (!c) { console.error("FAIL", n); failed++; } else console.log("ok", n); };

ok("finish products", FINISH_CATALOG.luster.sku === "FRM" && FINISH_CATALOG.luster.printfulProductId === "2"
  && FINISH_CATALOG.mat.sku === "MAT" && FINISH_CATALOG.mat.printfulProductId === "1"
  && FINISH_CATALOG.canvas.sku === "CAN" && FINISH_CATALOG.canvas.printfulProductId === "3");

ok("bundle is 2 prints", SGE["the-set"].prints === 2 && SGE["the-set"].bundleOf === "the-point,the-embrace"
  && SGE["the-point"].prints === 1 && SGE["the-embrace"].prints === 1);

const cart = fs.readFileSync(path.join(root, "cart.js"), "utf8");
const checkout = fs.readFileSync(path.join(root, "api/checkout.js"), "utf8");
ok("cart.js set multiplier", /const SET_MULT = \{ "the-set": 2 \}/.test(cart));
ok("checkout.js set multiplier", /const SGE_MULT = \{ "the-point": 1, "the-embrace": 1, "the-set": 2 \}/.test(checkout));

const rows = feedRows();
ok("27 staged skus", rows.length === 27);
ok("prices match editions", rows.every((r) => {
  const slug = r.item_group_id.replace(/^FRM-/, "");
  const shopFinish = r.id.split("-").pop();
  const size = r.id.slice(`FRM-${slug}-`.length, -(shopFinish.length + 1)).replace(/x/g, "×");
  const cents = Math.round(Number(r.price.replace(" USD", "")) * 100);
  return cents === E.originalCents(size, shopFinish, slug) * SGE[slug].prints;
}));
const centsOf = (price) => Math.round(Number(String(price).replace(" USD", "")) * 100);
ok("set is 2x the point", rows.filter((r) => r.item_group_id === "FRM-the-set").every((setRow) => {
  const point = rows.find((r) => r.id === setRow.id.replace("the-set", "the-point"));
  return centsOf(setRow.price) === centsOf(point.price) * 2;
}));
ok("no printful variants created", rows.every((r) => r.printful_sync_variant_id === ""));
ok("fraimous links only", rows.every((r) => r.link.startsWith("https://fraimous.com/works/")
  && !/ltk|amazon|associates/i.test(r.link)));

ok("point meta", (() => {
  const m = lineSkuMeta({ slug: "the-point", finish: "luster" });
  return m && m.sku === "FRM" && m.printful_product_id === "2" && m.work_sku === "FRM-the-point" && !m.bundle;
})());
ok("set canvas meta", (() => {
  const m = lineSkuMeta({ slug: "the-set", finish: "canvas" });
  return m && m.sku === "CAN" && m.printful_product_id === "3" && m.bundle === "the-set" && m.bundle_of === "the-point,the-embrace";
})());
ok("live works unchanged", lineSkuMeta({ slug: "apex", finish: "luster" }) === null);

function parseCsv(text) {
  const out = [];
  let row = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); out.push(row); row = []; cur = ""; }
    else if (c !== "\r") cur += c;
  }
  if (cur.length || row.length) { row.push(cur); out.push(row); }
  return out;
}

const csvPath = path.join(root, "library/web/feeds/snowglobe-skus.csv");
const table = parseCsv(fs.readFileSync(csvPath, "utf8"));
const header = table[0];
ok("csv columns", FEED_COLUMNS.every((c, i) => header[i] === c));
ok("csv matches catalog", table.length === rows.length + 1 && rows.every((r, i) => {
  return FEED_COLUMNS.every((c, col) => table[i + 1][col] === String(r[c]));
}));

process.env.VERCEL_ENV = "production";
delete process.env.SGE_CHECKOUT_OPEN;
const { notInStock } = require("../api/checkout.js");
const blocked = notInStock(["the-point", "the-embrace", "the-set"]);
ok("production checkout takes snow globe", blocked.length === 0);
ok("unreleased work still closed", notInStock(["not-a-real-work"]).join() === "not-a-real-work");

const promo = require("../api/_lib/promo.js");
const oneGallery = E.originalCents("24×36", "luster", "the-point");
const setGallery = oneGallery * 2;
ok("set gallery is 2x", oneGallery === 33063 && setGallery === 66126);
ok("code is 46 percent off the set only", promo.SEASONAL_OFF === 0.46 && promo.SEASONAL_SLUGS.join() === "the-set"
  && Math.round(setGallery * (1 - promo.SEASONAL_OFF)) === 35708);

try {
  fs.appendFileSync(path.join(root, ".cursor/debug-05d213.log"), JSON.stringify({
    sessionId: "05d213",
    hypothesisId: "SGE",
    location: "tests/snowglobe-skus.js",
    message: "production checkout gate",
    data: { blocked, setGalleryCents: setGallery, seasonalCents: Math.round(setGallery * (1 - promo.SEASONAL_OFF)) },
    timestamp: Date.now(),
  }) + "\n");
} catch (e) {}

process.exit(failed ? 1 : 0);
