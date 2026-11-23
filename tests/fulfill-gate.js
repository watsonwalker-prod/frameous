// Offline: the Printful gate refuses forged and unmapped orders.
// Run: node tests/fulfill-gate.js
const { isFraimousSession, fulfillDecision } = require("../api/_lib/fulfill.js");
let failed = 0;
const ok = (n, c) => { if (!c) { console.error("FAIL", n); failed++; } else console.log("ok", n); };

ok("fraimous source", isFraimousSession({ metadata: { source: "fraimous" } }));
ok("fraimous order number", isFraimousSession({ client_reference_id: "FRM-261105-ABCDE" }));
ok("other stripe charge", !isFraimousSession({ metadata: { source: "shop" }, client_reference_id: "ch_123" }));

ok("snow globe blocked", fulfillDecision({
  items: [{ slug: "the-point", size: "24×36", finish: "luster" }],
}).reason === "not_in_printful");
ok("set blocked", fulfillDecision({
  items: [{ slug: "the-set", size: "24×36", finish: "canvas" }],
}).reason === "not_in_printful");
ok("unmapped live work", fulfillDecision({
  items: [{ slug: "apex", size: "16×20", finish: "luster" }],
}).reason === "no_sync_variant");
ok("empty", fulfillDecision({ items: [] }).reason === "no_items");
ok("incomplete browser body", fulfillDecision({
  items: [{ title: "The Point", qty: 1 }],
}).reason === "incomplete_item");

process.exit(failed ? 1 : 0);
