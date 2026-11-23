# FRAIMOUS — Grok Bot agent board

**Brand:** FRAIMOUS · **Domain to buy:** fraimous.com · **Live:** https://frameous.vercel.app · local `127.0.0.1:8802`  
**Root:** `her-os/30 Portfolio/FRAMEOUS/`  
**Printful / Shopify:** **parked** — do not create products until Shea says go.

**North star:** Image house. Curate → iterate → upscale keepers → site + marketing. Not a POD spam catalog.

**Inspo:** [LNDN Gray](https://lndngray.com/) · [House of Spoils](https://houseofspoils.com/)  
**Type locked:** Syne + Instrument Sans + IBM Plex Mono  
**Drop 01 live:** 6 framed mocks (Golden Grid Climber → Floral Rifle Cowgirl), from $89, inquire only

---

## Status (as of board write)

| Item | State |
|------|--------|
| Library inbox | ~60 images ingested |
| `library/review.html` | exists — human pick needed |
| `library/keepers/` | **empty** — blocking print-ready + next site wave |
| Site brand FRAIMOUS | live |
| Printful create | **NO** |

---

## Hard rules for every agent

1. **Do not** call Printful/Shopify create-product.  
2. **Do not** dump 100 SKUs on the site. Max **12–16** public works.  
3. Prefer **edit / iterate** over random new gens when a keeper exists.  
4. Write outputs under `FRAMEOUS/` paths below.  
5. Name files with short slugs + date when possible.  
6. If unsure of taste, propose 3 options and stop — don’t spam.

---

# Agent roster + jobs

Paste the **Prompt** block into Grok Bot for that agent.

---

## Agent A — LIBRARIAN (files + shortlist)

**Mission:** Make the library pickable and the keepers folder real.

| ID | Task | Done when | Priority |
|----|------|-----------|----------|
| **A0** | Open `library/review.html` in browser; fix broken image paths if any | Sheet loads all thumbs | P0 |
| **A1** | Re-score inbox: flag blur, plastic skin, bad hands, text garbage, near-dupes | Update `library/scored.json` + short `rejects.md` notes | P0 |
| **A2** | Propose top **16** IDs for keepers (ranked 1–16) in `library/shortlist.md` | File exists with paths + one-line why | P0 |
| **A3** | After Shea says yes: copy shortlist → `library/keepers/` with clean names `01-slug.jpg` … | keepers/ has 12–16 files | P0 (blocked on human) |
| **A4** | Build `library/manifest.json` for site (id, title, path, price floor, status) | Valid JSON | P1 |
| **A5** | Ingest any **new** `~/Downloads/grok-image-*` not already hashed | index.csv grows, no dupes | ongoing |

### Grok Bot prompt — Agent A

```
You are FRAIMOUS Librarian. Workspace: her-os/30 Portfolio/FRAMEOUS/

Rules: no Printful product create. Max 16 public keepers.

Do now:
1) Read library/scored.json and library/index.csv
2) Open / list library/inbox — propose top 16 keepers with rank, filename, one-line why, one-line risk
3) Write library/shortlist.md
4) Draft library/manifest.json schema for the site (don’t invent titles for Drop 01 — keep Golden Grid Climber, American Newspaper Capsule, Archer, #7 Crop Top, Desert Sunrise Coffee, Floral Rifle Cowgirl for those six mocks in images/)
5) List reject reasons for bottom 20

Stop and ask before moving files into keepers/.
```

---

## Agent B — ART DIRECTOR (gen / iterate / upscale)

**Mission:** Raise the ceiling of the best images. LNDN Gray bold + Spoils gallery taste.

| ID | Task | Done when | Priority |
|----|------|-----------|----------|
| **B1** | Write 5 prompt packs (Western / editorial body / still life / architecture shadow / abstract field) | `prompts/pack-01.md` … `pack-05.md` | P0 |
| **B2** | For each of top 5 shortlist: 3 iterate prompts (“less AI sheen”, “more grain film”, “gallery wall light”) | `prompts/iterate-top5.md` | P0 |
| **B3** | Run image_edit / Imagine on **one** approved keeper (when shortlist OK) × 3 variants | `library/iterations/` | P1 |
| **B4** | Upscale pipeline note: only keepers, print ratios 2:3 / 4:5, no double-upscale | `library/UPSCALE.md` | P1 |
| **B5** | Framed-mock prompts matching Drop 01 style (black frame, dark room, lifestyle) for 3 new keepers | `prompts/framed-mock.md` | P1 |
| **B6** | Reject rubric one-pager (plastic, mush, text, hands, logo) | `library/rejects.md` | P2 |

### Grok Bot prompt — Agent B

```
You are FRAIMOUS Art Director. Taste refs: LNDN Gray (bold photo, sparse UI) + House of Spoils (curated ready-to-hang).

Rules: iterate > random spam. No Printful. Digital-born stills, collector not dropship.

Do now:
1) Create folder prompts/ under her-os/30 Portfolio/FRAMEOUS/
2) Write 5 prompt packs (Western heat, editorial figure, still life, architecture shadow, abstract field) — each pack: system vibe + 4 concrete prompts + negative cues (no plastic skin, no watermark, no gibberish text)
3) Write prompts/iterate-top5.md with edit instructions for “less AI sheen / more film grain / museum wall light”
4) Write prompts/framed-mock.md matching our Drop 01 mock style (black frame, charcoal room, lifestyle prop)

Do not generate 50 images unprompted — deliver packs first, then wait for which keeper to iterate.
```

---

## Agent C — WEB (site polish)

**Mission:** Site already branded FRAIMOUS; tighten, wire keepers when ready.

| ID | Task | Done when | Priority |
|----|------|-----------|----------|
| **C1** | Mobile pass on index (hero crop, nav, 1-col grid) | Notes + any CSS fixes | P1 |
| **C2** | When keepers exist: second “Works” wave or swap hero | Site shows ≥6 + new keepers | P1 blocked |
| **C3** | `works.json` driven grid (optional) | HTML reads manifest | P2 |
| **C4** | OG image real file + meta absolute URLs for fraimous.com | share card works | P2 |
| **C5** | Favicon / apple-touch from mark | assets present | P2 |
| **C6** | Rename leftover Frameous/Framous strings in PLAN/README/review.html | FRAIMOUS everywhere public | P1 |

### Grok Bot prompt — Agent C

```
You are FRAIMOUS Web. Site: her-os/30 Portfolio/FRAMEOUS/index.html + styles.css
Live: frameous.vercel.app · brand FRAIMOUS · domain target fraimous.com
Stack: Syne + Instrument Sans + IBM Plex Mono · void #0a0a0a

Do now:
1) Grep for Frameous/Framous/fraimeus leftovers and fix to FRAIMOUS / fraimous.com (not Vercel project id)
2) Mobile CSS pass: hero height, sticky nav, piece meta stacking
3) Add simple favicon.svg (wordmark F or full FRAIMOUS mono)
4) Do NOT add a shop cart or Printful buttons
5) Deploy note only — use vercel --prod if asked

Report diffs in plain language.
```

---

## Agent D — MARKETING / EMAIL / SOCIAL

**Mission:** Voice + launch kit. No list tooling until domain/email live.

| ID | Task | Done when | Priority |
|----|------|-----------|----------|
| **D1** | Brand voice ½ page | `marketing/voice.md` | P0 |
| **D2** | About blurb + press one-liner + bio 160 chars | `marketing/about.md` | P0 |
| **D3** | Launch email #1 waitlist (HTML + plain) | `marketing/email-01-launch.html` + `.txt` | P0 |
| **D4** | 6 IG/X captions for Drop 01 titles | `marketing/captions-drop01.md` | P0 |
| **D5** | Story series outline: 7 posts “how an image becomes a frame” | `marketing/story-series.md` | P1 |
| **D6** | Subject lines A/B (10) for waitlist | in email file | P1 |
| **D7** | Later: Resend/Klaviyo — only after fraimous.com + mailbox | blocked | P3 |

### Grok Bot prompt — Agent D

```
You are FRAIMOUS Marketing. Voice: collector gallery, not Shopify dropship. Scarcity without cringe.

Brand: FRAIMOUS — digital-born stills, framed when ready. Drop 01 titles:
- Golden Grid Climber
- American Newspaper Capsule
- Archer
- #7 Crop Top
- Desert Sunrise Coffee
- Floral Rifle Cowgirl
Price floor: from $89 · CTA: inquire · email: hello@fraimous.com

Do now — write under her-os/30 Portfolio/FRAMEOUS/marketing/:
1) voice.md (½ page)
2) about.md (blurb + press one-liner + 160-char bio)
3) email-01-launch.txt + email-01-launch.html (waitlist / Drop 01)
4) captions-drop01.md (6 captions, IG + X variants)
5) story-series.md (7-post outline)

No fake follower counts. No “link in bio” spam tone.
```

---

## Agent E — COMMERCE (parked — do not run create)

| ID | Task | When |
|----|------|------|
| E0 | Document Printful store state only (list products, no create) | anytime audit |
| E1 | One hero mockup API test | after keepers locked + Shea OK |
| E2 | Shopify single edition product | after story works |
| E3 | Bulk catalog | **never** until explicit |

### Grok Bot prompt — Agent E (audit only)

```
You are FRAIMOUS Commerce auditor. Printful token may exist in ~/framous-agent/.env or FRAMEOUS/.env.

ONLY list/read. Do NOT create products, variants, or syncs.
Summarize: store name, existing products count, connection health.
Write marketing/commerce-status.md
```

---

## Agent F — DOMAIN / OPS (light)

| ID | Task | Priority |
|----|------|----------|
| **F1** | Checklist: buy fraimous.com → Vercel project `frameous` → DNS → remove old fraimeus alias if present | P0 human |
| **F2** | Mailbox hello@fraimous.com (Google / ImprovMX / whatever Shea uses) | P1 human |
| **F3** | One-page `OPS.md`: deploy command, ports 8802, paths | P2 |

### Grok Bot prompt — Agent F

```
Write her-os/30 Portfolio/FRAMEOUS/OPS.md:
- Brand FRAIMOUS / domain fraimous.com
- Local: cd "her-os/30 Portfolio/FRAMEOUS" && python3 -m http.server 8802 --bind 127.0.0.1
- Deploy: npx vercel --prod --yes from that folder
- Library paths, hard rules (no Printful create)
Keep it short.
```

---

# What Shea must do (agents can’t fake this)

1. **Open** `library/review.html` and mark loves (or reply with top file names).  
2. **Buy** fraimous.com and point DNS at Vercel.  
3. **Taste check** any B3 iterations before upscale.  
4. Say **GO** before any Printful create.

---

# Suggested run order (agents excited now)

| Order | Agent | Job |
|------:|-------|-----|
| 1 | **D** | voice + captions + launch email (pure writing, unblocked) |
| 2 | **B** | prompt packs (unblocked) |
| 3 | **A** | shortlist.md from existing 60 (unblocked) |
| 4 | **C** | string cleanup + mobile + favicon |
| 5 | **F** | OPS.md |
| 6 | **You** | pick keepers from shortlist |
| 7 | **B** | iterate winners |
| 8 | **C** | put keepers on site |
| 9 | **E** | still parked |

---

# Out of scope (don’t assign)

- BCBS / TWC / healthcare  
-  pink site revival  
- Unsupervised 100-image gen dump  
- Scraping dead IG as source of truth  
- Buying domains without Shea  

---

*Board for Grok Bot · update checkboxes as you go · ask Shea only when blocked on taste, money, or keys.*
