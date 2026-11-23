# FRAIMOUS ship by 9:00 AM CT — 2026-08-18

Ship = live URL Shea would send to a real person.
Not = Printful catalog, checkout, or notify email.

## Confidence
- 75% we get https://frameous.vercel.app matching local 8802
- 60% it feels good to send (mailbox + one last look)
- Domain fraimous.com and a test print are extra, not the 9am gate

## Must (me)
1. Deploy payload: keepers + mocks + pages. No scenery/inbox/print.
2. Stranger pass: phone width, 16 available, 3 living prints, coming-soon notify, inquire.
3. Deploy production on Vercel project `frameous`.
4. Click the live URL like a stranger.

## Must (Shea)
1. Inquire inbox: hello@fraimous.com or I point CTAs at [email removed]
2. Printful promo for her Floral Rifle test print (she places it)
3. Optional: buy/attach fraimous.com

## Not by 9am
Printful product create for the 16. Notify email backend. Shopify. Test print (her, after promo).


---

## Ship log — 2026-08-18 7:08 AM CT

Deployed production to Vercel project frameous. Live: https://frameous.vercel.app

Inquire: homepage now has visible mailto:hello@fraimous.com (button + linked address). All 16 available PDPs have Inquire mailto next to Add to cart. Coming-soon already had quiet Inquire. Did not switch to Gmail. No fraimeus leftovers in shipped pages (excluded index.landing-backup.html and works/_off).

Payload: .vercelignore still excludes inbox/scenery/print/gun-girls/iterations. Uploaded keepers (107MB) + mocks (185MB) + images + works. Did not upload scenery.

Deploy: local Node v22.22.0 + npx vercel --prod --yes. Existing .vercel/project.json (frameous / team_GvfH6emVbBpp9b36FEqfGyod). needs_login=false. Opened https://frameous.vercel.app — current shop, inquire is hello@fraimous.com.

Also aliased on the Vercel project: fraimeus.com (pre-existing). Inspect: https://vercel.com/-s-projects/frameous/G2aCHoh7iNSU7X4vTyu8XM4jQPrh

Shea still stands up the hello@fraimous.com mailbox herself.

---

## Domain attach — 2026-08-18 7:55 AM CT

Shea purchased fraimous.com. Attached it to existing Vercel project frameous (team -s-projects / team_GvfH6emVbBpp9b36FEqfGyod). Did not buy another domain. Did not change inquire (still hello@fraimous.com). Did not create Printful products.

Domain already on this Vercel account:
- fraimous.com — Registrar Vercel, nameservers ns1.vercel-dns.com / ns2.vercel-dns.com (intended = current), Edge Network yes, created 18 Aug 2026 7:48 AM CT, expires 18 Aug 2027 7:48 AM CT, creator sevenxy-2041, renewal $11.25 USD.

CLI (from FRAMEOUS, Node v22.22.0, npx vercel 59.1.4, whoami sevenxy-2041):
- vercel domains add fraimous.com frameous --scope -s-projects → success / domain_added
- vercel domains add www.fraimous.com frameous --scope -s-projects → success / domain_added
- vercel domains verify fraimous.com → configured_correctly, attached+verified, configuredBy A, nameservers Vercel. Current A: 216.198.79.65, 64.29.17.1. No external registrar DNS needed.
- vercel domains verify www.fraimous.com → configured_correctly, attached+verified. Current A: 216.198.79.1, 64.29.17.1. No external registrar DNS needed.

Live hostname status (curl -sI):
- https://fraimous.com → HTTP/2 200, server Vercel, content-length 50252, same etag as frameous.vercel.app
- https://www.fraimous.com → HTTP/2 200, same shop payload
- https://frameous.vercel.app → HTTP/2 200 still
- http://fraimous.com → 308 Permanent Redirect to https://fraimous.com/

No A/CNAME printed as "set these at another registrar" — Vercel is the registrar and NS already match. Shop is live on the custom domain.
