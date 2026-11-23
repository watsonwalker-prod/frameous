# FRAIMOUS

**Public name / domain:** **fraimous.com**  
**Live now:** https://frameous.vercel.app (Vercel project `frameous` — host name can stay)

**Thesis:** Image house — digital-born stills, framed when ready. (Logistics optional later.)

## Domain status

| Name | Status |
|------|--------|
| **fraimous.com** | **Buy this** — matches brand FRAIMOUS |
| fraimeus.com | Alt spelling (older pick) — skip unless cheaper |
| frameous.com | For sale / skip |
| Free host | https://frameous.vercel.app |

## Buy + attach to Vercel (you)

### Option A — Buy on Vercel (easiest if they offer .com)

1. Open https://vercel.com/-s-projects/frameous/settings/domains  
2. Add `fraimous.com` → purchase if prompted, or “buy domain”  
3. Wait for DNS (often automatic on Vercel registrar)

### Option B — Buy elsewhere (Porkbun / Cloudflare / Namecheap)

1. Register **fraimous.com**  
2. Vercel → **frameous** project → Domains → Add `fraimous.com` + `www.fraimous.com`  
3. DNS at registrar:

| Type | Name | Value |
|------|------|--------|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

(Use exact records Vercel shows after you add the domain.)

## Local site

```bash
cd "her-os/30 Portfolio/FRAMEOUS"
python3 -m http.server 8801
```

## Printful agent (Phase 1)

```bash
cd "her-os/30 Portfolio/FRAMEOUS"
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# put real tokens in .env (copy from .env.example)
python3 agent/framous_agent.py                 # health check + list variants
python3 agent/framous_agent.py --create \
  --name "Your Print Title" \
  --image-url "https://public-url/to/art.png" \
  --variant 10760 --price 49.00
```

| File | Role |
|------|------|
| `agent/framous_agent.py` | Printful sync product + optional Shopify |
| `.env` | Tokens (gitignored) |
| `.env.example` | Template |

## Deploy site

```bash
export PATH="/tmp/node-v22.16.0-darwin-arm64/bin:$PATH"
cd "her-os/30 Portfolio/FRAMEOUS"
npx vercel --prod --yes
```

## Related

- Thesis notes: `../FRAIMEUS/README.md`
- Live: https://frameous.vercel.app
