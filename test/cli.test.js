"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  MISSING_EMAIL_MESSAGE,
  formatAccountLines,
  getApiKeyStatus,
  getKiroDataCandidates,
  maskEmail,
  maskSecret,
  parseArgs,
  sanitizeWhoami
} = require("../src/cli");

test("maskEmail hides the local part while keeping the domain", () => {
  assert.equal(maskEmail("alice@example.com"), "a****e@example.com");
  assert.equal(maskEmail("ab@example.com"), "a*@example.com");
  assert.equal(maskEmail("x@example.com"), "*@example.com");
});

test("sanitizeWhoami masks email by default", () => {
  const result = sanitizeWhoami({
    accountType: "Social",
    provider: "Google",
    email: "alice@example.com"
  });

  assert.deepEqual(result, {
    accountType: "Social",
    provider: "Google",
    email: "a****e@example.com"
  });
});

test("sanitizeWhoami can keep email when explicitly requested", () => {
  const result = sanitizeWhoami(
    { email: "alice@example.com" },
    { showEmail: true }
  );

  assert.equal(result.email, "alice@example.com");
});

test("maskSecret keeps only a small prefix and suffix", () => {
  assert.equal(maskSecret("ksk_1234567890abcdef"), "ksk_...cdef");
  assert.equal(maskSecret("short"), "sh...");
});

test("getApiKeyStatus never returns the raw secret", () => {
  const status = getApiKeyStatus({ KIRO_API_KEY: "ksk_1234567890abcdef" });

  assert.deepEqual(status, {
    present: true,
    variable: "KIRO_API_KEY",
    masked: "ksk_...cdef",
    length: 20
  });
});

test("getApiKeyStatus handles missing API key", () => {
  const status = getApiKeyStatus({});

  assert.deepEqual(status, {
    present: false,
    variable: "KIRO_API_KEY",
    masked: undefined,
    length: undefined
  });
});

test("formatAccountLines explains when whoami omits email", () => {
  const lines = formatAccountLines({
    accountType: "Social",
    provider: "Google"
  });

  assert.deepEqual(lines, [
    "Account Type: Social",
    "Provider: Google",
    `Email: ${MISSING_EMAIL_MESSAGE}`
  ]);
});

test("parseArgs maps device flow to Kiro CLI flag", () => {
  const parsed = parseArgs([
    "login",
    "--device-flow",
    "--social",
    "google",
    "--kiro-cli",
    "C:\\tools\\kiro-cli.exe"
  ]);

  assert.equal(parsed.command, "login");
  assert.equal(parsed.options.kiroCli, "C:\\tools\\kiro-cli.exe");
  assert.deepEqual(parsed.options.loginArgs, [
    "--use-device-flow",
    "--social",
    "google"
  ]);
});

test("parseArgs passes through kiro-cli args for run command after delimiter", () => {
  const parsed = parseArgs([
    "run",
    "--",
    "chat",
    "--no-interactive",
    "hello"
  ]);

  assert.equal(parsed.command, "run");
  assert.deepEqual(parsed.options.runArgs, [
    "chat",
    "--no-interactive",
    "hello"
  ]);
});

test("parseArgs allows common options before run delimiter", () => {
  const parsed = parseArgs([
    "run",
    "--kiro-cli",
    "C:\\tools\\kiro-cli.exe",
    "--",
    "--version"
  ]);

  assert.equal(parsed.options.kiroCli, "C:\\tools\\kiro-cli.exe");
  assert.deepEqual(parsed.options.runArgs, ["--version"]);
});

test("getKiroDataCandidates returns unique candidate paths", () => {
  const candidates = getKiroDataCandidates(
    { LOCALAPPDATA: "C:\\Users\\me\\AppData\\Local" },
    "win32",
    "C:\\Users\\me"
  );

  const paths = candidates.map((candidate) => candidate.path);
  assert.equal(paths.length, new Set(paths).size);
  assert.ok(paths.some((candidatePath) => candidatePath.includes("Kiro-Cli")));
});
