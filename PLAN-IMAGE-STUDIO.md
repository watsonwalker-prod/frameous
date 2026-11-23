# Framous / Fraimeus — Image studio plan (not print catalog)

**Date:** 2026-08-17  
**Live shell:** https://frameous.vercel.app  
**Local:** `her-os/30 Portfolio/FRAMEOUS/` · agent at `~/framous-agent`  
**Printful:** connected (Frameous store) — **product create paused**

---

## North star (shift)

| Was (Phase 1) | Now |
|---------------|-----|
| Printful catalog / SKU machine | **Image house** — best Grok gens → curate → iterate → upscale → site + marketing |
| Logistics thesis only | Logistics *optional later*; **visual product is the brand** |
| Cormorant + Outfit “museum” | **NEXUS stack or new pair** aligned to LDN Grey × House of Spoils |

**USP (draft):** Limited digital-born stills, framed when ready — editorial, not print-on-demand spam.

---

## Design inspo (look again)

### [LNDN Gray](https://lndngray.com/) *(“LDN Grey”)*
- Bold photography as the product  
- Sparse UI, art first, type second  
- “Printed, framed, ready” without cluttered catalog grids  
- **Take:** full-bleed heroes, quiet nav, few SKUs, confidence  

### [House of Spoils](https://houseofspoils.com/)
- Exclusive photography prints, collective/curated feel  
- Ready-to-hang framing language  
- **Take:** gallery cadence, scarcity copy, collector tone  

### NEXUS (house fonts — option A)
| Role | Font |
|------|------|
| Display | **Syne** |
| Body | **Instrument Sans** |
| Meta | **IBM Plex Mono** |

### New pair (option B — if we want distance from NEXUS)
| Role | Candidates |
|------|------------|
| Display | **PP Editorial / Freight / Times-like** or **Syne** still |
| Body | **Söhne / Neue Haas / Instrument Sans** |
| Meta | **Plex Mono** or **ABC Diatype** |

**Recommendation:** Ship **NEXUS fonts first** (coherent house), then A/B a second pair if Framous needs more “art gallery London” vs “NEXUS tech-fashion.”

---

## Assets we already have

- **~60 `grok-image-*` files** in `~/Downloads` (Aug 15 batch)  
- Site shell + Printful agent (no creates)  
- No real gallery on site yet — pure landing  

---

## Problems to fix

### 1. Image scrape
| Issue | Approach |
|-------|----------|
| Grok downloads land as opaque UUIDs in Downloads | **Ingest script** → `FRAMEOUS/library/inbox/` with hash + date + short id |
| Duplicates / near-dupes | Perceptual hash (aHash) cull like travluencer |
| No metadata (prompt, seed) | Sidecar `.json` when gen from this agent; manual tags for old batch |
| IG/business scrape dead ends | Don’t depend on @dallas; source = **your Downloads + Grok Bot gen** |

### 2. Upscale quality
| Issue | Approach |
|-------|----------|
| Soft / mushy gens at print size | Gate: only upscale **keepers** (human pick or score) |
| Wrong tool for faces/noise | Pipeline: Real-ESRGAN **or** Grok/Imagine upscale API if available; never double-upscale |
| Aspect chaos | Normalize to print ratios (2:3, 4:5, 1:1) before mockup |

### 3. Image gen / iterate
| Mode | Flow |
|------|------|
| **Library** | Import best 60 → rate 1–5 → shortlist top 12 |
| **Iterate** | image_edit / Grok Bot: same composition, “more LDN Grey / more grain / less plastic” |
| **New** | Prompt packs (editorial still life, architecture shadow, body fragment, abstract field) |
| **Out** | `library/keepers/` + public CDN-ready WebP/JPG for site |

---

## Site rebuild (Framous)

### Information architecture
1. **Home** — full-bleed carousel of keepers, one line, one CTA  
2. **Works** — grid of 8–16 pieces (not 200 SKUs)  
3. **Piece** — single image, title, edition note, “inquire / notify”  
4. **About** — 3 sentences: studio, digital-born, framed when ready  
5. **Contact / list** — email capture  

### Visual system
- Void or warm paper (decide after moodboard)  
- Type: **Syne + Instrument Sans + Plex Mono** (v1)  
- Motion: slow crossfade, not shop filters  
- Printful link later as secondary, not hero  

### Engineering tasks
- [ ] Pull NEXUS font CSS tokens into FRAMEOUS  
- [ ] Build `library/` + ingest script  
- [ ] Works grid from JSON manifest  
- [ ] Deploy to frameous.vercel.app  
- [ ] Optional: fraimeus.com DNS when bought  

---

## Agent task board

### Agent A — **Librarian** (images)
| ID | Task | Output |
|----|------|--------|
| A1 | Ingest all `~/Downloads/grok-image-*` → `library/inbox/` | renamed files + index.csv |
| A2 | Dedupe + basic score (size, sharpness proxy, aspect) | `library/scored.json` |
| A3 | Export contact sheet HTML for human pick | `library/review.html` |
| A4 | Move top picks → `library/keepers/` | 12–20 files |

### Agent B — **Art director** (gen / iterate)
| ID | Task | Output |
|----|------|--------|
| B1 | Write 5 prompt packs (LDN Grey / Spoils tone) | `prompts/*.md` |
| B2 | Iterate 3 keepers × 3 variants each (Grok Bot / Imagine) | `library/iterations/` |
| B3 | Upscale only approved keepers | `library/print-ready/` |
| B4 | Reject list + why (plastic, mush, text artifacts) | `library/rejects.md` |

### Agent C — **Web** (site)
| ID | Task | Output |
|----|------|--------|
| C1 | Mood: screenshots notes from LNDN Gray + House of Spoils | `design/inspo.md` |
| C2 | Font decision memo (NEXUS vs new pair) | `design/type.md` |
| C3 | Rebuild index + works from keepers | live site |
| C4 | Mobile pass + Lighthouse | checklist |

### Agent D — **Marketing / email**
| ID | Task | Output |
|----|------|--------|
| D1 | Brand voice ½ page (collector, not dropship) | `marketing/voice.md` |
| D2 | Launch email #1 (list / waitlist) | HTML + plain |
| D3 | 5 IG/X captions for first 5 keepers | `marketing/captions.md` |
| D4 | Press one-liner + about blurb | copy deck |
| D5 | Later: Klaviyo/Resend list wiring | only when domain/email live |

### Agent E — **Commerce (parked)**
| ID | Task | When |
|----|------|------|
| E1 | Printful mockup API for 1 hero piece | after keepers locked |
| E2 | Shopify product only for editioned pieces | after site story works |
| E3 | No bulk catalog | permanent rule until you say otherwise |

### Grok Bot (desktop) — human-in-loop
| Use | How |
|-----|-----|
| Fast iterate | Open keeper → “more like this / less AI sheen” |
| Batch review | Contact sheet + pick winners in chat |
| Not for | Unsupervised 100-SKU spam |

---

## Phased roadmap

### Phase 0 — Plan (this doc) ✅
### Phase 1 — Library (this week)
- Ingest + contact sheet  
- You rate keepers  
- Type decision locked  

### Phase 2 — Site (next)
- NEXUS fonts + Spoils/Gray IA  
- Works grid with 8–12 keepers  
- Deploy  

### Phase 3 — Story + list
- Email D1–D4  
- Optional waitlist  

### Phase 4 — Commerce (optional)
- One print test of **one** keeper  
- Still not a catalog  

---

## Immediate next actions (pick order)

1. **You:** open LNDN Gray + House of Spoils 10 min; note 3 likes  
2. **Agent A:** ingest Downloads grok images  
3. **Agent C:** font swap on current site shell  
4. **You + Grok Bot:** iterate top 5  

---

## Out of scope (for now)
- Printful bulk create  
- Shopify full catalog  
- TWC / BCBS (separate track)  
- Dead Instagram business scrape as source of truth  
