// Offline: bump curve + MEMBER25 math. Run: node tests/pricing-2026-10-06.js
const E = require("../api/_lib/editions.js");
let failed = 0;
const ok = (n, c, e) => { if (!c) { console.error("FAIL", n, e); failed++; } else console.log("ok", n); };
ok("25→0%", E.publicBump(25) === 0);
ok("13→5%", Math.abs(E.publicBump(13) - 0.05) < 1e-12);
ok("1→10%", Math.abs(E.publicBump(1) - 0.1) < 1e-12);
ok("public last M/L/G", E.unitCentsFor("16×20","luster","apex",1,"public") === 27500
  && E.unitCentsFor("18×24","luster","apex",1,"public") === 31625
  && E.unitCentsFor("24×36","luster","apex",1,"public") === 36369);
ok("member25 75% of original", E.unitCentsFor("16×20","luster","apex",1,"member25") === 18750);
ok("scala left10 bump", Math.abs(E.publicBump(10) - (0.10 * 15 / 24)) < 1e-12);
process.exit(failed ? 1 : 0);
