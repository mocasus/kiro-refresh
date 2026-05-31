"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildAuthorizeUrl,
  getSafeOAuthConfig,
  parseOAuthConfig,
  parseDotEnvContent,
  sha256Base64Url,
  summarizeTokenResponse
} = require("../src/oauth");

test("parseOAuthConfig reads official OAuth env", () => {
  const config = parseOAuthConfig({
    OAUTH_CLIENT_ID: "client-id",
    OAUTH_CLIENT_SECRET: "client-secret",
    OAUTH_AUTH_URL: "https://provider.example.com/oauth/authorize",
    OAUTH_TOKEN_URL: "https://provider.example.com/oauth/token",
    OAUTH_REDIRECT_URI: "http://127.0.0.1:8787/callback",
    OAUTH_SCOPES: "offline_access profile",
    OAUTH_AUTH_PARAMS: "access_type=offline&prompt=consent&state=ignored"
  });

  assert.equal(config.clientId, "client-id");
  assert.equal(config.clientSecret, "client-secret");
  assert.equal(config.redirectUri, "http://127.0.0.1:8787/callback");
  assert.equal(config.scopes, "offline_access profile");
  assert.deepEqual(config.authParams, [
    ["access_type", "offline"],
    ["prompt", "consent"]
  ]);
  assert.deepEqual(config.missing, []);
});

test("parseDotEnvContent reads simple quoted values", () => {
  const parsed = parseDotEnvContent(`
# comment
OAUTH_CLIENT_ID="client-id"
OAUTH_AUTH_URL=https://provider.example.com/oauth/authorize
EMPTY=
`);

  assert.deepEqual(parsed, {
    OAUTH_CLIENT_ID: "client-id",
    OAUTH_AUTH_URL: "https://provider.example.com/oauth/authorize",
    EMPTY: ""
  });
});

test("buildAuthorizeUrl uses authorization code with PKCE", () => {
  const config = parseOAuthConfig({
    OAUTH_CLIENT_ID: "client-id",
    OAUTH_AUTH_URL: "https://provider.example.com/oauth/authorize",
    OAUTH_TOKEN_URL: "https://provider.example.com/oauth/token",
    OAUTH_SCOPES: "offline_access",
    OAUTH_AUTH_PARAMS: "prompt=consent"
  });

  const url = new URL(buildAuthorizeUrl(config, "state-value", "challenge-value"));

  assert.equal(url.origin + url.pathname, "https://provider.example.com/oauth/authorize");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("client_id"), "client-id");
  assert.equal(url.searchParams.get("redirect_uri"), "http://127.0.0.1:8787/callback");
  assert.equal(url.searchParams.get("scope"), "offline_access");
  assert.equal(url.searchParams.get("state"), "state-value");
  assert.equal(url.searchParams.get("code_challenge"), "challenge-value");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("prompt"), "consent");
});

test("getSafeOAuthConfig never returns the raw client secret", () => {
  const config = parseOAuthConfig({
    OAUTH_CLIENT_ID: "abcdef123456",
    OAUTH_CLIENT_SECRET: "very-secret",
    OAUTH_AUTH_URL: "https://provider.example.com/oauth/authorize",
    OAUTH_TOKEN_URL: "https://provider.example.com/oauth/token"
  });

  const safe = getSafeOAuthConfig(config);
  assert.equal(safe.clientId, "abcdef...");
  assert.equal(safe.clientSecret, "set");
});

test("summarizeTokenResponse masks token values", () => {
  const summary = summarizeTokenResponse({
    access_token: "access_1234567890",
    refresh_token: "refresh_1234567890",
    id_token: "id_1234567890",
    token_type: "Bearer"
  }, (value) => `${value.slice(0, 3)}...`);

  assert.equal(summary.access_token, "acc...");
  assert.equal(summary.refresh_token, "ref...");
  assert.equal(summary.id_token, "id_...");
  assert.equal(summary.token_type, "Bearer");
});

test("sha256Base64Url returns URL-safe PKCE challenge text", () => {
  const challenge = sha256Base64Url("verifier");
  assert.match(challenge, /^[A-Za-z0-9_-]+$/);
  assert.ok(!challenge.includes("="));
});
