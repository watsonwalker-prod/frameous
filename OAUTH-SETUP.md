# Fraimous — wire Google / X / Facebook login

**Callback URL (same for all — must match exactly):**
```
https://fraimous.com/api/auth?provider=PROVIDER
```
Replace `PROVIDER` with `google`, `facebook`, or `x`.

**Also add (optional preview):**
```
https://frameous-*.vercel.app/api/auth?provider=PROVIDER
```
Or skip preview OAuth and only enable Production.

Vercel env vars needed on project **frameous**:

| Env | From |
|-----|------|
| `GOOGLE_CLIENT_ID` | Google Cloud OAuth client |
| `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth client |
| `FACEBOOK_APP_ID` | Meta app |
| `FACEBOOK_APP_SECRET` | Meta app |
| `X_CLIENT_ID` | X developer app (OAuth 2.0) |
| `X_CLIENT_SECRET` | X developer app |
| `JOIN_REDIRECT` | `https://fraimous.com/join` |

---

## 1) Google (fastest)

1. https://console.cloud.google.com/apis/credentials  
2. Create project (or pick one) → **Create credentials → OAuth client ID**  
3. Application type: **Web application**  
4. Name: `Fraimous`  
5. Authorized redirect URIs:
   ```
   https://fraimous.com/api/auth?provider=google
   ```
6. Copy **Client ID** + **Client secret**

```bash
export PATH="/tmp/node-v22.16.0-darwin-arm64/bin:$PATH"
cd "/Users/shea/her-os/30 Portfolio/FRAMEOUS"
npx vercel env add GOOGLE_CLIENT_ID production --scope -s-projects
npx vercel env add GOOGLE_CLIENT_SECRET production --scope -s-projects
```

---

## 2) Facebook / Meta

1. https://developers.facebook.com/apps → **Create App** → Consumer / Other  
2. Add product **Facebook Login** → Web  
3. Valid OAuth Redirect URIs:
   ```
   https://fraimous.com/api/auth?provider=facebook
   ```
4. Settings → Basic → copy **App ID** + **App Secret**  
5. Put app in **Live** mode (needs privacy policy URL — use `https://fraimous.com/faq` temporarily if needed)

```bash
npx vercel env add FACEBOOK_APP_ID production --scope -s-projects
npx vercel env add FACEBOOK_APP_SECRET production --scope -s-projects
```

---

## 3) X (Twitter) — hardest

1. https://developer.x.com/en/portal/dashboard → create Project + App  
2. User authentication → **OAuth 2.0**  
3. Type: Web App  
4. Callback URL:
   ```
   https://fraimous.com/api/auth?provider=x
   ```
5. Website URL: `https://fraimous.com`  
6. Copy **Client ID** + **Client Secret**  

**Note:** Email from X often requires elevated access. If login works but you see “need email”, users must use the email field — that’s an X API limitation, not Fraimous.

```bash
npx vercel env add X_CLIENT_ID production --scope -s-projects
npx vercel env add X_CLIENT_SECRET production --scope -s-projects
npx vercel env add JOIN_REDIRECT production --scope -s-projects
# value: https://fraimous.com/join
```

---

## Redeploy after env vars

```bash
cd "/Users/shea/her-os/30 Portfolio/FRAMEOUS"
npx vercel --prod --yes --scope -s-projects
```

Probe (should show `"wired":true`):
```bash
curl -s "https://fraimous.com/api/auth?provider=google&probe=1" -H "Accept: application/json"
```

---

## Checklist

- [ ] Google client + redirect URI  
- [ ] Facebook app + redirect URI + Live mode  
- [ ] X OAuth 2.0 app + callback  
- [ ] All six secrets on Vercel **frameous** Production  
- [ ] `JOIN_REDIRECT=https://fraimous.com/join`  
- [ ] Redeploy  
- [ ] Test each button on https://fraimous.com/join  
