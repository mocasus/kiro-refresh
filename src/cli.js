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

const MISSING_EMAIL_MESSAGE = "not returned by kiro-cli whoami";

function printHelp() {
  console.log(`kiro-refresh v${pkg.version}

Helper lokal untuk login dan mengecek status autentikasi Kiro secara aman.

Usage:
  kiro-refresh <command> [options]

Commands:
  tui                   Buka menu terminal interaktif
  ensure                Pastikan Kiro CLI siap dipakai; login otomatis jika perlu
  run -- <args...>      Pastikan auth siap lalu teruskan command ke kiro-cli
  check-api-key         Cek apakah env KIRO_API_KEY sudah diset tanpa mencetak secret
  setup-env             Tampilkan template setup env untuk automation/headless
  login                 Jalankan flow login resmi Kiro CLI jika belum login
  status                Tampilkan status login dari "kiro-cli whoami"
  doctor                Cek Node.js, kiro-cli, status auth, dan lokasi data store
  paths                 Tampilkan kandidat lokasi data store Kiro tanpa membacanya
  logout                Jalankan "kiro-cli logout"
  docs                  Buka dokumentasi resmi Kiro CLI auth di browser
  explain-token         Jelaskan kenapa tool ini tidak mencetak refresh token mentah
  help                  Tampilkan bantuan
  version               Tampilkan versi tool

Options umum:
  --json                Output JSON untuk command status/doctor/paths/check-api-key
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
  kiro-refresh tui
  kiro-refresh doctor
  kiro-refresh ensure
  kiro-refresh login
  kiro-refresh login --device-flow
  kiro-refresh check-api-key
  kiro-refresh run -- chat --no-interactive "hello"
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
    loginArgs: [],
    runArgs: []
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (command === "run" && arg === "--") {
      options.runArgs = args.slice(i + 1);
      break;
    }

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
    } else if (command === "run") {
      options.runArgs = args.slice(i);
      break;
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

function maskSecret(secret) {
  if (!secret || typeof secret !== "string") {
    return undefined;
  }

  const trimmed = secret.trim();
  if (trimmed.length <= 8) {
    return `${trimmed.slice(0, 2)}...`;
  }

  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

function getApiKeyStatus(env = process.env) {
  const value = typeof env.KIRO_API_KEY === "string" ? env.KIRO_API_KEY.trim() : "";
  return {
    present: value.length > 0,
    variable: "KIRO_API_KEY",
    masked: value ? maskSecret(value) : undefined,
    length: value.length || undefined
  };
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

function clearScreen() {
  process.stdout.write("\x1Bc");
}

function readKey() {
  const buffer = Buffer.alloc(8);
  const bytesRead = fs.readSync(process.stdin.fd, buffer, 0, buffer.length, null);
  return buffer.toString("utf8", 0, bytesRead);
}

function withRawInput(callback) {
  const canUseRawMode = process.stdin.isTTY && typeof process.stdin.setRawMode === "function";
  if (canUseRawMode) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  try {
    return callback();
  } finally {
    if (canUseRawMode) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
  }
}

function pauseForKey(message = "Press any key to return to the menu...") {
  console.log("");
  console.log(message);
  withRawInput(() => readKey());
}

function renderTuiMenu(selectedIndex, items) {
  clearScreen();
  console.log("Kiro Auth Helper TUI");
  console.log("====================");
  console.log("Use Up/Down, Enter to run, q to quit.");
  console.log("");

  for (let index = 0; index < items.length; index += 1) {
    const marker = index === selectedIndex ? ">" : " ";
    console.log(`${marker} ${items[index].label}`);
  }
}

function runTui(options) {
  if (!process.stdin.isTTY) {
    console.log("TUI requires an interactive terminal.");
    console.log("Use `kiro-refresh help` for non-interactive commands.");
    return 1;
  }

  const items = [
    {
      label: "Ensure Kiro auth is ready",
      action: () => ensureReady(options.kiroCli, options, { interactiveLogin: true })
    },
    {
      label: "Login",
      action: () => login(options.kiroCli, options.loginArgs)
    },
    {
      label: "Status",
      action: () => printStatus(options.kiroCli, { json: false, showEmail: false })
    },
    {
      label: "Doctor",
      action: () => printDoctor(options.kiroCli, { json: false, showEmail: false })
    },
    {
      label: "Run kiro-cli --version",
      action: () => runKiroCommand(options.kiroCli, { ...options, runArgs: ["--version"] })
    },
    {
      label: "Check KIRO_API_KEY",
      action: () => checkApiKey({ json: false })
    },
    {
      label: "Show env setup examples",
      action: () => setupEnv()
    },
    {
      label: "Open Kiro auth docs",
      action: () => openDocs()
    },
    {
      label: "Logout",
      action: () => logout(options.kiroCli)
    },
    {
      label: "Help",
      action: () => {
        printHelp();
        return 0;
      }
    },
    {
      label: "Exit",
      action: () => "exit"
    }
  ];

  let selectedIndex = 0;
  while (true) {
    renderTuiMenu(selectedIndex, items);
    const key = withRawInput(() => readKey());

    if (key === "\u0003" || key.toLowerCase() === "q") {
      clearScreen();
      return 0;
    }

    if (key === "\u001b[A" || key === "k") {
      selectedIndex = (selectedIndex - 1 + items.length) % items.length;
      continue;
    }

    if (key === "\u001b[B" || key === "j") {
      selectedIndex = (selectedIndex + 1) % items.length;
      continue;
    }

    if (key === "\r" || key === "\n") {
      clearScreen();
      console.log(`> ${items[selectedIndex].label}`);
      console.log("");
      const result = items[selectedIndex].action();
      if (result === "exit") {
        clearScreen();
        return 0;
      }
      pauseForKey();
    }
  }
}

function ensureKiroCliAvailable(kiroCli) {
  const version = getKiroCliVersion(kiroCli);
  if (!commandExists(kiroCli) || !version.ok) {
    console.log(`Kiro CLI: not ready (${version.error || "not found"})`);
    console.log("Install Kiro CLI or pass --kiro-cli <path> / set KIRO_CLI_BIN.");
    return { ok: false, version };
  }

  return { ok: true, version };
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

  printAuthenticatedAccount(status.account);
  return 0;
}

function printAuthenticatedAccount(account) {
  console.log("Authenticated: yes");
  for (const line of formatAccountLines(account)) {
    console.log(line);
  }
}

function formatAccountLines(account) {
  const entries = Object.entries(account || {});
  const lines = entries.map(([key, value]) => `${humanizeKey(key)}: ${value}`);

  if (!entries.some(([key]) => key.toLowerCase() === "email")) {
    lines.push(`Email: ${MISSING_EMAIL_MESSAGE}`);
  }

  return lines;
}

function humanizeKey(key) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());
}

function printDoctor(kiroCli, options) {
  const version = getKiroCliVersion(kiroCli);
  const whoami = getWhoami(kiroCli, options);
  const apiKey = getApiKeyStatus();
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
    apiKey,
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
  console.log(`API key: ${report.apiKey.present ? `set (${report.apiKey.masked})` : "not set"}`);
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

function checkApiKey(options) {
  const status = getApiKeyStatus();
  if (options.json) {
    console.log(JSON.stringify(status, null, 2));
    return status.present ? 0 : 1;
  }

  if (status.present) {
    console.log(`KIRO_API_KEY: set (${status.masked})`);
    console.log("Ready for headless Kiro CLI usage.");
    return 0;
  }

  console.log("KIRO_API_KEY: not set");
  console.log("For headless automation, set KIRO_API_KEY in your shell or secret manager.");
  console.log("Run `kiro-refresh setup-env` for examples.");
  return 1;
}

function setupEnv() {
  const status = getApiKeyStatus();
  console.log("Kiro headless setup");
  console.log("");
  if (status.present) {
    console.log(`Detected KIRO_API_KEY: ${status.masked}`);
    console.log("");
  }
  console.log("PowerShell, current session:");
  console.log('$env:KIRO_API_KEY = "ksk_xxxxxxxx"');
  console.log("");
  console.log("PowerShell, persistent user env:");
  console.log('[Environment]::SetEnvironmentVariable("KIRO_API_KEY", "ksk_xxxxxxxx", "User")');
  console.log("");
  console.log("CMD, current session:");
  console.log('set KIRO_API_KEY=ksk_xxxxxxxx');
  console.log("");
  console.log("Bash/Zsh, current session:");
  console.log('export KIRO_API_KEY="ksk_xxxxxxxx"');
  console.log("");
  console.log("This tool never asks for, stores, or prints the raw API key.");
  return 0;
}

function ensureReady(kiroCli, options, { interactiveLogin = true } = {}) {
  const cli = ensureKiroCliAvailable(kiroCli);
  if (!cli.ok) {
    return 1;
  }

  const whoami = getWhoami(kiroCli, { showEmail: false });
  if (whoami.authenticated) {
    console.log("Kiro CLI session is ready.");
    printAuthenticatedAccount(whoami.account);
    return 0;
  }

  const apiKey = getApiKeyStatus();
  if (apiKey.present) {
    console.log(`Kiro API key is ready (${apiKey.masked}).`);
    console.log("Using KIRO_API_KEY for headless flow.");
    return 0;
  }

  console.log("Kiro auth is not ready.");
  console.log(`Reason: ${whoami.error || "No active login and KIRO_API_KEY is not set."}`);

  if (!interactiveLogin) {
    console.log("Run `kiro-refresh login` or set KIRO_API_KEY.");
    return 1;
  }

  return login(kiroCli, options.loginArgs);
}

function runKiroCommand(kiroCli, options) {
  if (!options.runArgs.length) {
    console.log("Missing kiro-cli arguments.");
    console.log('Usage: kiro-refresh run -- chat --no-interactive "hello"');
    console.log("Example: kiro-refresh run -- --version");
    return 1;
  }

  const readyExitCode = ensureReady(kiroCli, options, { interactiveLogin: true });
  if (readyExitCode !== 0) {
    return readyExitCode;
  }

  console.log("");
  console.log("Running kiro-cli command...");
  const result = runInteractive(kiroCli, options.runArgs);
  if (result.error) {
    console.error(`Failed to start kiro-cli: ${result.error.message}`);
    return 1;
  }
  return result.status || 0;
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
  const currentStatus = getWhoami(kiroCli, { showEmail: false });
  if (currentStatus.authenticated) {
    console.log("Already authenticated. Skipping Kiro CLI login.");
    console.log("Kiro CLI session is ready to use.");
    console.log("Use `kiro-refresh logout` first if you need to switch accounts.");
    printAuthenticatedAccount(currentStatus.account);
    return 0;
  }

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
    } else if (command === "tui") {
      exitCode = runTui(options);
    } else if (command === "ensure") {
      exitCode = ensureReady(options.kiroCli, options, { interactiveLogin: true });
    } else if (command === "run") {
      exitCode = runKiroCommand(options.kiroCli, options);
    } else if (command === "check-api-key") {
      exitCode = checkApiKey(options);
    } else if (command === "setup-env") {
      exitCode = setupEnv();
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
  MISSING_EMAIL_MESSAGE,
  formatAccountLines,
  getApiKeyStatus,
  getKiroDataCandidates,
  main,
  maskEmail,
  maskSecret,
  parseArgs,
  sanitizeWhoami
};
