# Usage

`kiro-refresh` adalah wrapper kecil di atas `kiro-cli`. Tool ini tidak mengganti auth Kiro, hanya membantu menjalankan flow resmi dan mengecek hasilnya.

Baru mulai? Ikuti [Quick Start](QUICKSTART.md) dulu.

## Direct CLI

Dari folder repo:

```powershell
npm link
kiro-refresh tui
```

Atau install global dari GitHub:

```powershell
npm install -g github:mocasus/kiro-refresh
kiro-refresh tui
```

## TUI

```powershell
kiro-refresh tui
```

Kontrol:

- `Up/Down`: pilih menu.
- `Enter`: jalankan menu.
- `q`: keluar.

Menu TUI menyediakan aksi umum: ensure auth, login, status, doctor, cek versi Kiro CLI, check API key, setup env, docs, logout, dan help.

## Ensure

```powershell
kiro-refresh ensure
```

Command ini memastikan Kiro CLI siap dipakai:

1. Mengecek executable `kiro-cli`.
2. Mengecek login lokal lewat `kiro-cli whoami --format json`.
3. Jika login lokal belum ada, mengecek env `KIRO_API_KEY`.
4. Jika keduanya belum tersedia, menjalankan flow login resmi Kiro CLI.

Ini cocok dipakai sebelum script automation lokal.

## Run

```powershell
kiro-refresh run -- --version
kiro-refresh run -- chat --no-interactive "hello"
```

Semua argumen setelah `--` diteruskan apa adanya ke `kiro-cli`. Sebelum menjalankan command, tool memanggil `ensure` supaya error auth muncul lebih jelas.

## API Key Check

```powershell
kiro-refresh check-api-key
kiro-refresh check-api-key --json
kiro-refresh setup-env
```

`check-api-key` hanya mengecek apakah `KIRO_API_KEY` tersedia. Tool tidak mencetak raw secret; output hanya memakai bentuk masked seperti `ksk_...abcd`.

`setup-env` menampilkan contoh command untuk mengatur `KIRO_API_KEY` di PowerShell, CMD, atau Bash/Zsh.

## Login Lokal

```powershell
kiro-refresh login
```

Yang terjadi:

1. Tool menjalankan `kiro-cli whoami --format json`.
2. Jika sudah login, tool menampilkan akun aktif dan selesai dengan exit code `0`.
3. Jika belum login, tool menjalankan `kiro-cli login`.
4. Kiro CLI membuka browser default untuk login.
5. Anda memilih metode login di portal Kiro.
6. Setelah selesai, Kiro CLI menyimpan auth state-nya sendiri.
7. Tool menjalankan `kiro-cli whoami --format json` untuk memastikan login aktif.

Behavior ini membuat `kiro-refresh login` aman dijalankan berulang. Saat user sudah login, tool tidak memanggil `kiro-cli login`, sehingga error berikut tidak muncul:

```text
Already logged in, please logout with kiro-cli logout first
```

Output `Already authenticated. Skipping Kiro CLI login.` berarti sesi Kiro CLI sudah siap dipakai. Jika field email tidak muncul dari `kiro-cli whoami`, tool akan menampilkan:

```text
Email: not returned by kiro-cli whoami
```

Untuk pindah akun:

```powershell
kiro-refresh logout
kiro-refresh login
```

## Login Remote atau Container

```powershell
kiro-refresh login --device-flow
```

Pakai mode ini ketika terminal tidak bisa membuka browser, misalnya SSH, WSL tanpa browser, DevContainer, VM, atau CI interaktif.

## Status Login

```powershell
kiro-refresh status
```

Output default memask email:

```text
Authenticated: yes
Account Type: Social
Provider: Google
Email: a******e@example.com
```

Untuk JSON:

```powershell
kiro-refresh status --json
```

Untuk menampilkan email penuh:

```powershell
kiro-refresh status --show-email
```

## Doctor

```powershell
kiro-refresh doctor
```

Command ini mengecek:

- Versi Node.js.
- Apakah `kiro-cli` bisa dipanggil.
- Versi Kiro CLI.
- Status login.
- Kandidat lokasi data store Kiro.

Catatan: command ini hanya mengecek apakah file data store ada. Isinya tidak dibuka.

## Path Kiro CLI Khusus

Jika `kiro-cli` tidak ada di `PATH`, set environment variable:

```powershell
$env:KIRO_CLI_BIN = "C:\Users\you\AppData\Local\Kiro-Cli\kiro-cli.exe"
kiro-refresh doctor
```

Atau pakai flag:

```powershell
kiro-refresh doctor --kiro-cli "C:\Users\you\AppData\Local\Kiro-Cli\kiro-cli.exe"
```

## Logout

```powershell
kiro-refresh logout
```

Ini menjalankan `kiro-cli logout`, sehingga kredensial yang dikelola Kiro CLI dibersihkan oleh Kiro CLI sendiri.

## API Key untuk Headless

Untuk automation non-interaktif, dokumentasi Kiro merekomendasikan API key bila akun/subscription mendukung:

```powershell
$env:KIRO_API_KEY = "ksk_xxxxxxxx"
kiro-cli chat --no-interactive "your prompt here"
```

Jangan commit API key ke repository.
