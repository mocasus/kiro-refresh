"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");

const DEFAULT_REDIRECT_URI = "http://127.0.0.1:8787/callback";
const DEFAULT_SCOPES = "offline_access";
const REQUIRED_ENV = [
  "OAUTH_CLIENT_ID",
  "OAUTH_AUTH_URL",
  "OAUTH_TOKEN_URL"
];
const RESERVED_AUTH_PARAMS = new Set([
  "response_type",
  "client_id",
  "redirect_uri",
  "scope",
  "state",
  "code_challenge",
  "code_challenge_method"
]);

function parseDotEnvContent(content) {
  const parsed = {};
  for (const rawLine of String(content || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

function loadDotEnv(envPath = path.join(process.cwd(), ".env")) {
  if (!fs.existsSync(envPath)) {
    return {};
  }
  return parseDotEnvContent(fs.readFileSync(envPath, "utf8"));
}

function getConfigEnv(env = process.env) {
  if (env !== process.env) {
    return env;
  }
  return {
    ...loadDotEnv(),
    ...env
  };
}

function base64Url(buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function randomUrlSafe(bytes = 32) {
  return base64Url(crypto.randomBytes(bytes));
}

function sha256Base64Url(value) {
  return base64Url(crypto.createHash("sha256").update(value).digest());
}

function getTokenStorePath(env = process.env) {
  return env.OAUTH_TOKEN_STORE || path.join(os.homedir(), ".kiro-refresh", "oauth-tokens.json");
}

function parseExtraParams(value) {
  const params = new URLSearchParams(value || "");
  const result = [];
  for (const [key, paramValue] of params.entries()) {
    if (!RESERVED_AUTH_PARAMS.has(key)) {
      result.push([key, paramValue]);
    }
  }
  return result;
}

function parseOAuthConfig(env = process.env) {
  const configEnv = getConfigEnv(env);
  const missing = REQUIRED_ENV.filter((key) => !String(configEnv[key] || "").trim());
  const redirectUri = String(configEnv.OAUTH_REDIRECT_URI || DEFAULT_REDIRECT_URI).trim();
  const scopes = String(configEnv.OAUTH_SCOPES || DEFAULT_SCOPES).trim();
  const timeoutMs = Number(configEnv.OAUTH_TIMEOUT_MS || 120000);

  return {
    clientId: String(configEnv.OAUTH_CLIENT_ID || "").trim(),
    clientSecret: String(configEnv.OAUTH_CLIENT_SECRET || "").trim(),
    authUrl: String(configEnv.OAUTH_AUTH_URL || "").trim(),
    tokenUrl: String(configEnv.OAUTH_TOKEN_URL || "").trim(),
    redirectUri,
    scopes,
    authParams: parseExtraParams(configEnv.OAUTH_AUTH_PARAMS),
    tokenStorePath: getTokenStorePath(configEnv),
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 120000,
    missing
  };
}

function getSafeOAuthConfig(config) {
  return {
    clientId: config.clientId ? `${config.clientId.slice(0, 6)}...` : undefined,
    clientSecret: config.clientSecret ? "set" : "not set",
    authUrl: config.authUrl || undefined,
    tokenUrl: config.tokenUrl || undefined,
    redirectUri: config.redirectUri,
    scopes: config.scopes,
    authParams: config.authParams,
    tokenStorePath: config.tokenStorePath,
    missing: config.missing
  };
}

function buildAuthorizeUrl(config, state, codeChallenge) {
  const url = new URL(config.authUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", config.scopes);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  for (const [key, value] of config.authParams) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

function waitForOAuthCallback(redirectUri, expectedState, timeoutMs) {
  const redirect = new URL(redirectUri);
  if (redirect.protocol !== "http:") {
    return Promise.reject(new Error("Only http:// redirect URIs are supported for the local callback server."));
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error, result) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      server.close(() => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    };

    const server = http.createServer((request, response) => {
      const requestUrl = new URL(request.url, redirect.origin);
      if (requestUrl.pathname !== redirect.pathname) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }

      const state = requestUrl.searchParams.get("state");
      const code = requestUrl.searchParams.get("code");
      const oauthError = requestUrl.searchParams.get("error");
      const oauthErrorDescription = requestUrl.searchParams.get("error_description");

      if (state !== expectedState) {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Invalid state. You may close this tab.");
        finish(new Error("OAuth callback state did not match."));
        return;
      }

      if (oauthError) {
        response.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        response.end("<h1>OAuth login failed</h1><p>You may close this tab.</p>");
        finish(new Error(`${oauthError}: ${oauthErrorDescription || "OAuth provider returned an error."}`));
        return;
      }

      if (!code) {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Missing authorization code. You may close this tab.");
        finish(new Error("OAuth callback did not include an authorization code."));
        return;
      }

      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end("<h1>OAuth login complete</h1><p>You may close this tab and return to the terminal.</p>");
      finish(null, { code });
    });

    const timer = setTimeout(() => {
      finish(new Error("OAuth login timed out before the callback was received."));
    }, timeoutMs);

    server.on("error", (error) => finish(error));
    server.listen(Number(redirect.port || 80), redirect.hostname);
  });
}

async function exchangeCodeForTokens(config, code, codeVerifier) {
  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("code", code);
  body.set("client_id", config.clientId);
  body.set("redirect_uri", config.redirectUri);
  body.set("code_verifier", codeVerifier);
  if (config.clientSecret) {
    body.set("client_secret", config.clientSecret);
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  const responseText = await response.text();
  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch (error) {
    payload = { raw: responseText };
  }

  if (!response.ok) {
    const message = payload.error_description || payload.error || payload.raw || `HTTP ${response.status}`;
    throw new Error(`Token exchange failed: ${message}`);
  }

  return payload;
}

function addTokenMetadata(tokenResponse) {
  const now = new Date();
  const expiresIn = Number(tokenResponse.expires_in || 0);
  return {
    received_at: now.toISOString(),
    expires_at: expiresIn > 0 ? new Date(now.getTime() + expiresIn * 1000).toISOString() : undefined,
    ...tokenResponse
  };
}

function saveTokenResponse(tokenResponse, storePath) {
  const dir = path.dirname(storePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(storePath, `${JSON.stringify(tokenResponse, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600
  });
}

function readTokenResponse(storePath) {
  if (!fs.existsSync(storePath)) {
    return { found: false, path: storePath };
  }

  const content = fs.readFileSync(storePath, "utf8");
  return {
    found: true,
    path: storePath,
    tokens: JSON.parse(content)
  };
}

function clearTokenResponse(storePath) {
  if (!fs.existsSync(storePath)) {
    return false;
  }
  fs.unlinkSync(storePath);
  return true;
}

function summarizeTokenResponse(tokens, maskSecret) {
  return {
    received_at: tokens.received_at,
    expires_at: tokens.expires_at,
    token_type: tokens.token_type,
    scope: tokens.scope,
    access_token: tokens.access_token ? maskSecret(tokens.access_token) : undefined,
    refresh_token: tokens.refresh_token ? maskSecret(tokens.refresh_token) : undefined,
    id_token: tokens.id_token ? maskSecret(tokens.id_token) : undefined
  };
}

module.exports = {
  DEFAULT_REDIRECT_URI,
  DEFAULT_SCOPES,
  addTokenMetadata,
  buildAuthorizeUrl,
  clearTokenResponse,
  exchangeCodeForTokens,
  getSafeOAuthConfig,
  getTokenStorePath,
  parseOAuthConfig,
  parseDotEnvContent,
  randomUrlSafe,
  readTokenResponse,
  saveTokenResponse,
  sha256Base64Url,
  summarizeTokenResponse,
  waitForOAuthCallback
};
