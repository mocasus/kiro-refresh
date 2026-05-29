"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  MISSING_EMAIL_MESSAGE,
  formatAccountLines,
  getKiroDataCandidates,
  maskEmail,
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
