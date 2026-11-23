const crypto = require("crypto");

const COOKIE = "fraimous_oauth";
const JOIN_TO = "hello@fraimous.com";

const PROVIDERS = {
  google: {
    id: "GOOGLE_CLIENT_ID",
    secret: "GOOGLE_CLIENT_SECRET",
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
    pkce: false,
  },
  facebook: {
    id: "FACEBOOK_APP_ID",
    secret: "FACEBOOK_APP_SECRET",
    authorize: "https://www.facebook.com/v21.0/dialog/oauth",
    token: "https://graph.facebook.com/v21.0/oauth/access_token",
    scope: "email,public_profile",
    pkce: false,
  },
  x: {
    id: "X_CLIENT_ID",
    secret: "X_CLIENT_SECRET",
    authorize: "https://twitter.com/i/oauth2/authorize",
    token: "https://api.twitter.com/2/oauth2/token",
    scope: "tweet.read users.read offline.access users.email",
    pkce: true,
  },
};

const json = (res, status, body) => {
  res.setHeader("Content-Type", "application/json");
  return res.status(status).json(body);
};

const ALLOWED_HOST = /^(fraimous\.com|www\.fraimous\.com|[a-z0-9-]+\.vercel\.app)$/i;
const originOf = (req) => {
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "fraimous.com").split(",")[0].trim();
  if (proto !== "https" || !ALLOWED_HOST.test(host)) return "https://fraimous.com";
  return "https://" + host;
};

const redirectUri = (req, provider) => originOf(req) + "/api/auth?provider=" + provider;

const joinRedirect = (extra) => {
  const base = String(process.env.JOIN_REDIRECT || "https://fraimous.com/join").replace(/\/$/, "");
  return base + (extra || "");
};

const parseCookies = (req) => {
  const raw = String(req.headers.cookie || "");
  const out = {};
  raw.split(";").forEach((part) => {
    const i = part.indexOf("=");
    if (i < 0) return;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
};

const readSession = (req) => {
  const raw = parseCookies(req)[COOKIE];
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    return null;
  }
};

const setSession = (res, req, payload, maxAge) => {
  const secure = originOf(req).startsWith("https") ? "; Secure" : "";
  const value = Buffer.from(JSON.stringify(payload)).toString("base64url");
  res.setHeader(
    "Set-Cookie",
    COOKIE + "=" + value + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" + maxAge + secure
  );
};

const clearSession = (res, req) => setSession(res, req, {}, 0);

const wired = (conf) => !!(process.env[conf.id] && process.env[conf.secret]);

const rand = (n) => crypto.randomBytes(n).toString("base64url");

const sendJoinMail = async ({ email, name, provider }) => {
  const subject = "FRAIMOUS list — " + email;
  const message = ["FRAIMOUS list", "", email, name, provider && ("provider: " + provider), "source: oauth"]
    .filter(Boolean)
    .join("\n");
  const r = await fetch("https://formsubmit.co/ajax/" + JOIN_TO, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin: "https://fraimous.com",
      Referer: "https://fraimous.com/",
    },
    body: JSON.stringify({
      name: name || "FRAIMOUS list",
      email,
      _subject: subject,
      _template: "box",
      message,
    }),
  });
  if (!r.ok) throw new Error("mail");
};

const form = (obj) =>
  Object.keys(obj)
    .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]))
    .join("&");

const pullIdentity = async (provider, token) => {
  if (provider === "google") {
    const r = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: "Bearer " + token },
    });
    const out = await r.json().catch(() => ({}));
    return { email: String(out.email || "").trim(), name: String(out.name || "").trim() };
  }
  if (provider === "facebook") {
    const r = await fetch(
      "https://graph.facebook.com/me?fields=id,name,email&access_token=" + encodeURIComponent(token)
    );
    const out = await r.json().catch(() => ({}));
    return { email: String(out.email || "").trim(), name: String(out.name || "").trim() };
  }
  const r = await fetch("https://api.twitter.com/2/users/me?user.fields=confirmed_email,name,username", {
    headers: { Authorization: "Bearer " + token },
  });
  const out = await r.json().catch(() => ({}));
  const d = out.data || {};
  return {
    email: String(d.confirmed_email || d.email || "").trim(),
    name: String(d.name || d.username || "").trim(),
  };
};

const exchangeCode = async (provider, conf, code, req, verifier) => {
  const redirect = redirectUri(req, provider);
  if (provider === "facebook") {
    const url =
      conf.token +
      "?" +
      form({
        client_id: process.env[conf.id],
        client_secret: process.env[conf.secret],
        redirect_uri: redirect,
        code,
      });
    const r = await fetch(url);
    const out = await r.json().catch(() => ({}));
    if (!out.access_token) throw new Error("token");
    return out.access_token;
  }
  const body = {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirect,
    client_id: process.env[conf.id],
    client_secret: process.env[conf.secret],
  };
  const headers = { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" };
  if (provider === "x") {
    body.code_verifier = verifier || "";
    headers.Authorization =
      "Basic " + Buffer.from(process.env[conf.id] + ":" + process.env[conf.secret]).toString("base64");
  }
  const r = await fetch(conf.token, { method: "POST", headers, body: form(body) });
  const out = await r.json().catch(() => ({}));
  if (!out.access_token) throw new Error("token");
  return out.access_token;
};

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return json(res, 405, { ok: false });

  const q = req.query || {};
  const provider = String(q.provider || "").trim().toLowerCase();
  const conf = PROVIDERS[provider];
  if (!conf) return json(res, 400, { ok: false, error: "provider" });

  const isProbe = String(q.probe || "") === "1" || /application\/json/i.test(String(req.headers.accept || ""));
  if (isProbe && !q.code) {
    return json(res, 200, { ok: true, wired: wired(conf), provider });
  }

  if (!wired(conf)) {
    return res.redirect(302, joinRedirect("?door=later"));
  }

  if (q.code) {
    const sess = readSession(req) || {};
    clearSession(res, req);
    if (!sess.s || !q.state || sess.s !== String(q.state) || sess.p !== provider) {
      return res.redirect(302, joinRedirect("?door=later"));
    }
    try {
      const token = await exchangeCode(provider, conf, String(q.code), req, sess.v);
      const who = await pullIdentity(provider, token);
      if (!who.email) return res.redirect(302, joinRedirect("?need=email"));
      await sendJoinMail({ email: who.email, name: who.name, provider });
      return res.redirect(302, joinRedirect("?joined=1"));
    } catch {
      return res.redirect(302, joinRedirect("?door=later"));
    }
  }

  const state = rand(16);
  const verifier = conf.pkce ? rand(32) : "";
  setSession(res, req, { s: state, v: verifier, p: provider }, 600);

  const params = {
    response_type: "code",
    client_id: process.env[conf.id],
    redirect_uri: redirectUri(req, provider),
    scope: conf.scope,
    state,
  };
  if (provider === "google") params.access_type = "online";
  if (conf.pkce) {
    params.code_challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
    params.code_challenge_method = "S256";
  }
  return res.redirect(302, conf.authorize + "?" + form(params));
};
