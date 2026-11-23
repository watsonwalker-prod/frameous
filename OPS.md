# FRAIMOUS — OPS

**Date:** 2026-08-17  
**Track:** F (ops)  
**Do not:** deploy · buy a domain · change DNS · create Printful/Shopify products

---

## 1. Live now vs target

| | Now | Target |
|---|-----|--------|
| Public brand | **FRAIMOUS** (site shell) | **FRAIMOUS** |
| Public URL | https://frameous.vercel.app | **https://fraimous.com** (+ www) |
| Vercel project | `frameous` (host name can stay) | same project, custom domain attached |
| Domain | **not bought** | **fraimous.com** |
| Old spelling | `fraimeus.com` in older notes / landing backup | skip unless cheaper; do not treat as public |
| `frameous.com` | for sale / skip (README) | skip |
| Inquire mailbox | site CTA is already `hello@fraimous.com` (local `index.html`); mailbox **does not exist** | live inbox at **hello@fraimous.com** |
| Leftover email | `index.landing-backup.html` still `[email removed]` | backup only — do not ship |
| Site content | Drop 01 · 6 framed mocks · inquire only · from $89 | 12–16 keepers, same inquire model |
| Library | `library/inbox/` ~60 · `library/review.html` exists · **keepers empty** | keepers locked, then site wave 2 |
| Printful | connected (Frameous store) · **create paused** | one hero test only after Shea says **GO** |
| Shopify | optional / parked | parked until story works |
| Thesis | image house (digital-born stills, framed when ready) | same; logistics optional later (`../FRAIMEUS/` is a different thesis) |

**Local root:** `/Users/shea/her-os/30 Portfolio/FRAMEOUS/`  
**Linked Vercel:** `.vercel/project.json` → projectName `frameous`  
**Domains UI:** https://vercel.com/-s-projects/frameous/settings/domains

---

## 2. Domain checklist — fraimous.com

Shea buys. Agents do not register, pay, or edit DNS.

### Buy

- [ ] Register **fraimous.com** (matches brand FRAIMOUS)
- [ ] Skip `fraimeus.com` unless it is clearly cheaper (older pick)
- [ ] Skip `frameous.com` (for sale)

### Option A — Buy on Vercel (easiest if they offer .com)

- [ ] Open project **frameous** → Settings → Domains
- [ ] Add `fraimous.com` → purchase if prompted
- [ ] Wait for DNS (often automatic on Vercel registrar)

### Option B — Buy elsewhere (Porkbun / Cloudflare / Namecheap)

- [ ] Register **fraimous.com** at the registrar
- [ ] Vercel → **frameous** → Domains → add `fraimous.com` + `www.fraimous.com`
- [ ] At registrar, set what Vercel shows after add. Typical (verify in UI):

| Type | Name | Value |
|------|------|--------|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

- [ ] Do **not** change DNS until Shea is at this step
- [ ] Confirm HTTPS / certificate issued on both apex + www
- [ ] Confirm apex redirects or serves the same as www (Vercel default)

### Email (after domain exists)

- [ ] Create mailbox **hello@fraimous.com** (Google / ImprovMX / whatever Shea uses)
- [ ] Add MX (and SPF/DKIM if the mail host asks)
- [ ] Send a test to the inquire CTA
- [ ] List tooling (Resend / Klaviyo) only after mailbox works — Agent D7
- [ ] Public copy already uses `hello@fraimous.com` on current `index.html`; do not flip it back to `[email removed]`

---

## 3. Deploy checklist (local → Vercel)

**Do not run this until Shea asks.** This is the recipe only.

### Local preview

```bash
cd "/Users/shea/her-os/30 Portfolio/FRAMEOUS"
python3 -m http.server 8802 --bind 127.0.0.1
```

- Review: http://127.0.0.1:8802/  
- Contact sheet: http://127.0.0.1:8802/library/review.html  
- README still lists port **8801**; board + `library/review.html` use **8802**. Prefer **8802**.

### Ship (when asked)

```bash
export PATH="/tmp/node-v22.16.0-darwin-arm64/bin:$PATH"
cd "/Users/shea/her-os/30 Portfolio/FRAMEOUS"
npx vercel --prod --yes
```

- Static site. `vercel.json`: `cleanUrls` + `X-Content-Type-Options: nosniff`
- Confirm https://frameous.vercel.app after deploy
- After domain attach: confirm https://fraimous.com

### Do **not** upload

Already in `.vercelignore` — keep it that way:

| Path | Why |
|------|-----|
| `library/inbox` | raw ingest (~60), not public |
| `library/keepers` | working picks |
| `library/iterations` | art-director variants |
| `library/print-ready` | upscales |
| `.env` | Printful / Shopify tokens |
| `.venv` / `venv` | Python env |
| `agent/` | Printful sync script |
| `__pycache__` | junk |

Also never commit/share: `.env`, `.vercel/` (link folder).  
`.gitignore` already covers `.env` and `.venv/`.

**Do upload (public site):** `index.html`, `styles.css`, `images/` (Drop 01 mocks), `vercel.json`.  
`library/review.html` is linked from the nav — treat as local pick sheet, not a public product.

---

## 4. Hard rules

```
┌─────────────────────────────────────────────────────────────┐
│  NO Printful / Shopify product create until Shea says GO    │
│  MAX 12–16 public works (not a 100-SKU catalog)             │
│  ITERATE keepers — do not spam new gens                     │
│  Commerce is secondary; visual product is the brand         │
│  Agents do not buy domains, edit DNS, or deploy unasked     │
│  Tokens stay in .env — never in the repo or the site        │
└─────────────────────────────────────────────────────────────┘
```

Printful agent (paused — do not `--create`):

```bash
cd "/Users/shea/her-os/30 Portfolio/FRAMEOUS"
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# tokens in .env (from .env.example)
python3 agent/framous_agent.py    # health / list only
```

---

## 5. Agent run-order

| Track | Agent | Job | Gate |
|-------|-------|-----|------|
| **A** | Librarian | ingest, score, shortlist, keepers | keepers wait on Shea pick |
| **B** | Art | prompt packs, iterate, upscale keepers only | iterate after shortlist OK |
| **C** | Web | site, fonts, mobile, deploy when asked | wave 2 after keepers |
| **D** | Marketing | voice, captions, launch email | list wiring after domain/email |
| **E** | Commerce | **parked** | Shea says GO |
| **F** | Ops | this file · domain/email/deploy checklists | Shea buys / points DNS |

Unblocked-now order (from `AGENT-BOARD.md`): **D → B packs → A shortlist → C polish → F** · then Shea picks keepers · then B iterate · C on site · **E still parked**.

Board: `AGENT-BOARD.md`  
Plan: `PLAN-IMAGE-STUDIO.md`  
Sibling logistics thesis (not this brand): `../FRAIMEUS/README.md`

---

## 6. Open items — Shea only

Agents cannot fake these.

1. **Buy `fraimous.com`** and attach it to Vercel project `frameous` (or buy on Vercel).
2. **Stand up `hello@fraimous.com`** once the domain exists (MX + a real inbox).
3. **Open `library/review.html`** and mark keepers (or reply with top filenames). `library/keepers/` is empty — this blocks print-ready and the next site wave.
4. **Taste-check** any B3 iterations before upscale.
5. **Say GO** before any Printful create or Shopify product. Until then: list/read only.
6. **Ask for a deploy** when the local shell is the one that should be live. Do not assume.

---

*FRAIMOUS Ops · 2026-08-17 · no deploy / no DNS / no product create in this pass*
