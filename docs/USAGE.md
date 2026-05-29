# Usage

`kiro-refresh` adalah wrapper kecil di atas `kiro-cli`. Tool ini tidak mengganti auth Kiro, hanya membantu menjalankan flow resmi dan mengecek hasilnya.

## Login Lokal

```powershell
kiro-refresh login
```

Yang terjadi:

1. Tool menjalankan `kiro-cli login`.
2. Kiro CLI membuka browser default untuk login.
3. Anda memilih metode login di portal Kiro.
4. Setelah selesai, Kiro CLI menyimpan auth state-nya sendiri.
5. Tool menjalankan `kiro-cli whoami --format json` untuk memastikan login aktif.

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
