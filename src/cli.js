"use strict";

const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const pkg = require("../package.json");

const DOC_URLS = {
  auth: "https://kiro.dev/docs/cli/authentication/",
  commands: "https://kiro.dev/docs/cli/reference/cli-commands/",
  firewall: "https://kiro.dev/docs/privacy-and-security/firewalls/"
};

function printHelp() {
  console.log(`kiro-refresh v${pkg.version}

Helper lokal untuk login dan mengecek status autentikasi Kiro secara aman.

Usage:
  kiro-refresh <command> [options]

Commands:
  login                 Jalankan flow login resmi Kiro CLI
  status                Tampilkan status login dari "kiro-cli whoami"
  doctor                Cek Node.js, kiro-cli, status auth, dan lokasi data store
  paths                 Tampilkan kandidat lokasi data store Kiro tanpa membacanya
  logout                Jalankan "kiro-cli logout"
  docs                  Buka dokumentasi resmi Kiro CLI auth di browser
  explain-token         Jelaskan kenapa tool ini tidak mencetak refresh token mentah
  help                  Tampilkan bantuan
  version               Tampilkan versi tool

Options umum:
  --json                Output JSON untuk command status/doctor/paths
  --show-email          Jangan mask email pada output status/doctor
  --kiro-cli <path>     Path executable kiro-cli. Bisa juga pakai env KIRO_CLI_BIN

Options login:
  --device-flow         Paksa device flow, cocok untuk SSH/container
  --social <provider>   Provider sosial: google atau github
  --license <type>      License type Kiro CLI, misalnya free atau pro
  --identity-provider <url>
  --region <region>
  --verbose             Teruskan flag verbose ke Kiro CLI

Contoh:
  kiro-refresh doctor
  kiro-refresh login
  kiro-refresh login --device-flow
  kiro-refresh status --show-email

Catatan keamanan:
  Tool ini tidak membaca cookie, localStorage, profile browser, atau isi database
  token Kiro. Gunakan flow login resmi Kiro CLI atau API key resmi untuk otomasi.`);
}

function parseArgs(argv) {
  const command = argv[0] && !argv[0].startsWith("-") ? argv[0] : "help";
  const args = command === "help" ? argv.slice(command === argv[0] ? 1 : 0) : argv.slice(1);
  const options = {
    json: false,
    showEmail: false,
    kiroCli: process.env.KIRO_CLI_BIN || "kiro-cli",
    loginArgs: []
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--show-email") {
      options.showEmail = true;
    } else if (arg === "--kiro-cli") {
      options.kiroCli = requireValue(args, i, arg);
      i += 1;
    } else if (arg === "--device-flow" || arg === "--use-device-flow") {
      options.loginArgs.push("--use-device-flow");
    } else if (arg === "--verbose" || arg === "-v") {
      options.loginArgs.push("--verbose");
    } else if (arg === "--social" || arg === "--license" || arg === "--identity-provider" || arg === "--region") {
      const value = requireValue(args, i, arg);
      options.loginArgs.push(arg, value);
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Option tidak dikenal: ${arg}`);
    }
  }

  return { command, options };
}

function requireValue(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith("-")) {
    throw new Error(`${flag} membutuhkan value.`);
  }
  return value;
}

function maskEmail(email) {
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return email || undefined;
  }

  const [local, domain] = email.split("@");
  if (!local || !domain) {
    return email;
  }

  if (local.length === 1) {
    return `*@${domain}`;
  }

  const first = local[0];
  const last = local.length > 2 ? local[local.length - 1] : "";
  return `${first}${"*".repeat(Math.min(Math.max(local.length - 1, 1), 6))}${last ? last : ""}@${domain}`;
}

function sanitizeWhoami(raw, { showEmail = false } = {}) {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key.toLowerCase() === "email" && typeof value === "string") {
      sanitized[key] = showEmail ? value : maskEmail(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function runCapture(command, args, options = {}) {
  return childProcess.spawnSync(command, args, {
    encoding: "utf8",
    windowsHide: true,
    ...options
  });
}

function runInteractive(command, args) {
  return childProcess.spawnSync(command, args, {
    stdio: "inherit",
    windowsHide: false
  });
}

function getKiroCliVersion(kiroCli) {
  const result = runCapture(kiroCli, ["--version"]);
  if (result.error) {
    return { ok: false, error: result.error.message };
  }
  if (result.status !== 0) {
    return {
      ok: false,
      error: trimOutput(result.stderr || result.stdout) || `exit code ${result.status}`
    };
  }
  return { ok: true, version: trimOutput(result.stdout || result.stderr) };
}

function getWhoami(kiroCli, { showEmail = false } = {}) {
  const result = runCapture(kiroCli, ["whoami", "--format", "json"]);
  if (result.error) {
    return { authenticated: false, error: result.error.message };
  }
  if (result.status !== 0) {
    return {
      authenticated: false,
      error: trimOutput(result.stderr || result.stdout) || `exit code ${result.status}`
    };
  }

  const output = trimOutput(result.stdout || result.stderr);
  try {
    const raw = JSON.parse(output);
    return {
      authenticated: true,
      raw,
      account: sanitizeWhoami(raw, { showEmail })
    };
  } catch (error) {
    return {
      authenticated: true,
      raw: output,
      account: { message: output }
    };
  }
}

function trimOutput(value) {
  return String(value || "").trim();
}

function commandExists(command) {
  if (looksLikePath(command)) {
    return fs.existsSync(command);
  }

  const lookup = process.platform === "win32"
    ? runCapture("where.exe", [command])
    : runCapture("sh", ["-lc", `command -v ${shellQuote(command)}`]);

  return lookup.status === 0;
}

function looksLikePath(value) {
  return value.includes("/") || value.includes("\\") || path.isAbsolute(value);
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function getKiroDataCandidates(env = process.env, platform = process.platform, home = os.homedir()) {
  const candidates = [];

  if (platform === "win32") {
    if (env.LOCALAPPDATA) {
      candidates.push(path.join(env.LOCALAPPDATA, "Kiro-Cli", "data.sqlite3"));
      candidates.push(path.join(env.LOCALAPPDATA, "kiro-cli", "data.sqlite3"));
    }
    candidates.push(path.join(home, "AppData", "Local", "Kiro-Cli", "data.sqlite3"));
    candidates.push(path.join(home, "AppData", "Local", "kiro-cli", "data.sqlite3"));
  }

  if (platform === "darwin") {
    candidates.push(path.join(home, "Library", "Application Support", "kiro-cli", "data.sqlite3"));
    candidates.push(path.join(home, "Library", "Application Support", "Kiro-Cli", "data.sqlite3"));
  }

  candidates.push(path.join(home, ".local", "share", "kiro-cli", "data.sqlite3"));
  candidates.push(path.join(home, ".kiro", "data.sqlite3"));

  const seen = new Set();
  return candidates
    .filter((filePath) => {
      const key = platform === "win32" ? filePath.toLowerCase() : filePath;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .map((filePath) => ({
      path: filePath,
      exists: fs.existsSync(filePath)
    }));
}

function printStatus(kiroCli, options) {
  const status = getWhoami(kiroCli, options);
  if (options.json) {
    console.log(JSON.stringify(status, null, 2));
    return status.authenticated ? 0 : 1;
  }

  if (!status.authenticated) {
    console.log("Authenticated: no");
    console.log(`Reason: ${status.error || "Kiro CLI belum login."}`);
    console.log("Next: jalankan `kiro-refresh login` atau `kiro-refresh login --device-flow`.");
    return 1;
  }

  console.log("Authenticated: yes");
  for (const [key, value] of Object.entries(status.account)) {
    console.log(`${humanizeKey(key)}: ${value}`);
  }
  return 0;
}

function humanizeKey(key) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());
}

function printDoctor(kiroCli, options) {
  const version = getKiroCliVersion(kiroCli);
  const whoami = getWhoami(kiroCli, options);
  const paths = getKiroDataCandidates();
  const report = {
    node: {
      ok: true,
      version: process.version
    },
    kiroCli: {
      ok: commandExists(kiroCli) && version.ok,
      command: kiroCli,
      ...version
    },
    auth: whoami,
    dataStore: {
      note: "Path hanya dideteksi. Isi database tidak dibaca.",
      candidates: paths
    },
    docs: DOC_URLS
  };

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return report.kiroCli.ok && report.auth.authenticated ? 0 : 1;
  }

  console.log(`Node.js: ${report.node.version}`);
  console.log(`Kiro CLI: ${report.kiroCli.ok ? report.kiroCli.version : `not ready (${report.kiroCli.error || "not found"})`}`);
  console.log(`Auth: ${report.auth.authenticated ? "logged in" : "not logged in"}`);
  if (report.auth.authenticated && report.auth.account) {
    for (const [key, value] of Object.entries(report.auth.account)) {
      console.log(`  ${humanizeKey(key)}: ${value}`);
    }
  }
  console.log("Data store candidates:");
  for (const candidate of paths) {
    console.log(`  ${candidate.exists ? "[found]" : "[missing]"} ${candidate.path}`);
  }
  console.log("Security: data store content is not read; refresh tokens are not printed.");

  return report.kiroCli.ok && report.auth.authenticated ? 0 : 1;
}

function printPaths(options) {
  const paths = getKiroDataCandidates();
  if (options.json) {
    console.log(JSON.stringify(paths, null, 2));
  } else {
    for (const candidate of paths) {
      console.log(`${candidate.exists ? "[found]" : "[missing]"} ${candidate.path}`);
    }
  }
  return 0;
}

function openDocs() {
  const url = DOC_URLS.auth;
  let result;

  if (process.platform === "win32") {
    result = childProcess.spawnSync("cmd.exe", ["/c", "start", "", url], {
      stdio: "ignore",
      windowsHide: true
    });
  } else if (process.platform === "darwin") {
    result = childProcess.spawnSync("open", [url], { stdio: "ignore" });
  } else {
    result = childProcess.spawnSync("xdg-open", [url], { stdio: "ignore" });
  }

  if (result.error || result.status !== 0) {
    console.log(url);
    return 1;
  }

  console.log(`Opened: ${url}`);
  return 0;
}

function printTokenExplanation() {
  console.log(`Tool ini sengaja tidak mencetak refresh token Kiro.

Refresh token adalah kredensial jangka panjang yang bisa dipakai untuk membuat
access token baru. Mengekstrak token dari browser, localStorage, cookie, atau
database aplikasi rawan bocor dan biasanya melanggar batas keamanan aplikasi.

Flow yang didukung tool ini:
  1. Jalankan login resmi: kiro-refresh login
  2. Kiro CLI membuka browser atau device flow resmi.
  3. Tool mengecek status dengan: kiro-cli whoami
  4. Untuk otomasi headless, pakai API key resmi Kiro lewat KIRO_API_KEY.

Jika integrasi Anda benar-benar membutuhkan refresh token mentah, gunakan API
atau SDK resmi yang secara eksplisit mengembalikan token tersebut kepada app
Anda lewat OAuth consent flow milik Anda sendiri.`);
}

function login(kiroCli, loginArgs) {
  console.log("Starting official Kiro CLI login flow...");
  const result = runInteractive(kiroCli, ["login", ...loginArgs]);
  if (result.error) {
    console.error(`Failed to start kiro-cli: ${result.error.message}`);
    return 1;
  }
  if (result.status !== 0) {
    return result.status || 1;
  }

  console.log("");
  console.log("Login flow finished. Checking status...");
  return printStatus(kiroCli, { json: false, showEmail: false });
}

function logout(kiroCli) {
  const result = runInteractive(kiroCli, ["logout"]);
  if (result.error) {
    console.error(`Failed to start kiro-cli: ${result.error.message}`);
    return 1;
  }
  return result.status || 0;
}

function main(argv) {
  try {
    const { command, options } = parseArgs(argv);
    if (options.help) {
      printHelp();
      return 0;
    }

    let exitCode = 0;
    if (command === "help") {
      printHelp();
    } else if (command === "version" || command === "--version" || command === "-V") {
      console.log(pkg.version);
    } else if (command === "login") {
      exitCode = login(options.kiroCli, options.loginArgs);
    } else if (command === "status") {
      exitCode = printStatus(options.kiroCli, options);
    } else if (command === "doctor") {
      exitCode = printDoctor(options.kiroCli, options);
    } else if (command === "paths") {
      exitCode = printPaths(options);
    } else if (command === "logout") {
      exitCode = logout(options.kiroCli);
    } else if (command === "docs") {
      exitCode = openDocs();
    } else if (command === "explain-token") {
      printTokenExplanation();
    } else {
      throw new Error(`Command tidak dikenal: ${command}`);
    }

    if (require.main === module) {
      process.exitCode = exitCode;
    }
    return exitCode;
  } catch (error) {
    console.error(error.message);
    console.error("Jalankan `kiro-refresh help` untuk bantuan.");
    if (require.main === module) {
      process.exitCode = 1;
    }
    return 1;
  }
}

module.exports = {
  DOC_URLS,
  getKiroDataCandidates,
  main,
  maskEmail,
  parseArgs,
  sanitizeWhoami
};
