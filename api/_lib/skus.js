// Finish SKUs shared with the rest of fraimous.com (Stripe product metadata).
// Snow Globe Effect works sell through these finishes. This file only labels them.
// It does not create Stripe products or Printful sync variants. printful_sync_variant_id stays blank.
const { originalCents } = require("./editions");

const FINISH_CATALOG = {
  luster: { sku: "FRM", catalogFinish: "framed", printfulProductId: "2" },
  mat: { sku: "MAT", catalogFinish: "matte", printfulProductId: "1" },
  canvas: { sku: "CAN", catalogFinish: "canvas", printfulProductId: "3" },
};

// Prints must match cart.js SET_MULT and api/checkout.js SGE_MULT. Prices stay on those tables.
const SGE = {
  "the-point": { title: "The Point", prints: 1, bundleOf: "" },
  "the-embrace": { title: "The Embrace", prints: 1, bundleOf: "" },
  "the-set": { title: "The Set: The Point + The Embrace", prints: 2, bundleOf: "the-point,the-embrace" },
};

// Sizes checkout actually accepts for these works (api/checkout.js).
const SIZES = {
  luster: ["16×20", "18×24", "24×36"],
  mat: ["16×20", "18×24", "24×36"],
  canvas: ["24×36", "40×55", "40×60"],
};

const SITE = "https://fraimous.com";

const lineSkuMeta = (line) => {
  const slug = String((line && line.slug) || "").trim().toLowerCase();
  const work = SGE[slug];
  if (!work) return null;
  const shopFinish = String((line && line.finish) || "luster").toLowerCase();
  const fin = FINISH_CATALOG[shopFinish];
  if (!fin) return null;
  const meta = {
    sku: fin.sku,
    catalog_finish: fin.catalogFinish,
    printful_product_id: fin.printfulProductId,
    fraimous: "1",
    work_sku: `FRM-${slug}`,
  };
  if (work.bundleOf) {
    meta.bundle = slug;
    meta.bundle_of = work.bundleOf;
  }
  return meta;
};

const priceLabel = (cents) => `${(cents / 100).toFixed(2)} USD`;

const feedRows = () => {
  const rows = [];
  Object.keys(SGE).forEach((slug) => {
    const work = SGE[slug];
    Object.keys(SIZES).forEach((shopFinish) => {
      const fin = FINISH_CATALOG[shopFinish];
      SIZES[shopFinish].forEach((size) => {
        const cents = originalCents(size, shopFinish, slug) * work.prints;
        const sizeId = size.replace(/×/g, "x");
        const kind = shopFinish === "canvas" ? "Gallery-Wrap Canvas" : "Framed Art";
        rows.push({
          id: `FRM-${slug}-${sizeId}-${shopFinish}`,
          item_group_id: `FRM-${slug}`,
          title: `${work.title} — ${size} ${fin.catalogFinish} | FRAIMOUS`,
          description: `${work.title} — Original AI-assisted artwork by FRAIMOUS™. Snow Globe Effect preview. Not available to order. No Printful product is created from this row.`,
          link: `${SITE}/works/${slug}`,
          image_link: `${SITE}/library/web/mocks/${slug}_room.jpg`,
          additional_image_link: `${SITE}/library/web/mocks/${slug}_room_thumb.jpg`,
          price: priceLabel(cents),
          availability: "preorder",
          condition: "new",
          brand: "FRAIMOUS",
          google_product_category: "500044",
          product_type: `Home & Garden > Decor > Artwork > ${kind}`,
          custom_label_0: work.bundleOf ? "snow_globe_bundle" : "snow_globe_effect",
          custom_label_1: "staged_not_submitted",
          custom_label_2: "ai_assisted",
          stripe_sku: fin.sku,
          finish: fin.catalogFinish,
          printful_product_id: fin.printfulProductId,
          printful_sync_variant_id: "",
          bundle_of: work.bundleOf,
        });
      });
    });
  });
  return rows;
};

const FEED_COLUMNS = [
  "id", "item_group_id", "title", "description", "link", "image_link", "additional_image_link",
  "price", "availability", "condition", "brand", "google_product_category", "product_type",
  "custom_label_0", "custom_label_1", "custom_label_2",
  "stripe_sku", "finish", "printful_product_id", "printful_sync_variant_id", "bundle_of",
];

module.exports = { FINISH_CATALOG, SGE, SIZES, FEED_COLUMNS, lineSkuMeta, feedRows, priceLabel };
