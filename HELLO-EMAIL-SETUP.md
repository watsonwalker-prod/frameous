# hello@fraimous.com — easy setup (ImprovMX → Proton)

**Goal:** Mail to `hello@fraimous.com` lands in **`[email removed]`**.  
**Domain:** already bought on Vercel · site already live.

Vercel does **not** host mailboxes. We use free **ImprovMX** forwarding.

---

## You do this (≈3 minutes)

1. Open **https://app.improvmx.com/signup** (or login if you have an account).
2. Sign up with **`[email removed]`** (same Proton you already use).
3. Click **Add domain** → type **`fraimous.com`** → continue.
4. Add alias:
   - **Alias:** `hello`
   - **Forward to:** `[email removed]`
5. Optional: add a **catch-all** `*` → `[email removed]` so anything@fraimous.com works.
6. ImprovMX will show DNS status. If it asks for an extra **TXT verification** string, paste it here or add it in Vercel DNS — tell Grok the exact value.

That’s it on your side.

---

## Grok already / will add on Vercel DNS

| Type | Name | Value | Priority |
|------|------|--------|----------|
| **MX** | `@` | `mx1.improvmx.com` | **10** |
| **MX** | `@` | `mx2.improvmx.com` | **20** |
| **TXT** | `@` | `v=spf1 include:spf.improvmx.com ~all` | — |

DNS can take **5–30 minutes** (sometimes up to a few hours).

---

## Test

1. From **another** account (Gmail/phone mail), send to **hello@fraimous.com**
2. Open **Proton** → `[email removed]`
3. Check inbox (+ spam once)

---

## Later (optional)

- ImprovMX **SMTP** (paid) or Proton custom-domain plan if you want to **send** as `hello@fraimous.com` (reply-from), not just receive.
- Until then: receive as hello@, reply from Proton is fine for inquire.

---

## Checklist

- [ ] ImprovMX account + domain `fraimous.com`
- [ ] Alias `hello` → `[email removed]`
- [ ] Vercel MX + SPF present
- [ ] Test email received in Proton
