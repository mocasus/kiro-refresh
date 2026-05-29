# Kiro Auth Helper

Tool lokal untuk membantu login dan mengecek status autentikasi Kiro CLI secara aman.

Project ini awalnya dibuat untuk kebutuhan "ambil refresh token Kiro". Karena refresh token adalah kredensial jangka panjang, tool ini **tidak** mengekstrak atau mencetak token mentah dari browser, cookie, localStorage, profile browser, atau database internal Kiro. Sebagai gantinya, tool memakai flow resmi `kiro-cli login`, lalu mendeteksi status login lewat `kiro-cli whoami`.

## Fitur

- Login lokal lewat browser resmi Kiro CLI.
- Device flow untuk SSH, container, atau environment yang tidak bisa membuka browser.
- Deteksi status login dengan output aman, email dimask secara default.
- Pemeriksaan `doctor` untuk Node.js, `kiro-cli`, status auth, dan lokasi data store tanpa membaca isinya.
- Dokumentasi penggunaan, troubleshooting, dan batasan keamanan.

## Requirement

- Node.js 18 atau lebih baru.
- Kiro CLI terpasang dan bisa dipanggil sebagai `kiro-cli`.
- Akun Kiro yang valid.

Di mesin ini, `kiro-cli` terdeteksi sebagai `kiro-cli-chat 2.2.2`.

## Install

```powershell
npm install
```

Jalankan langsung dari repo:

```powershell
npm start -- doctor
npm start -- login
npm start -- status
```

Atau pasang command lokal:

```powershell
npm link
kiro-refresh doctor
kiro-refresh login
kiro-refresh status
```

Jika `kiro-cli` ada di path khusus:

```powershell
$env:KIRO_CLI_BIN = "C:\Users\you\AppData\Local\Kiro-Cli\kiro-cli.exe"
kiro-refresh doctor
```

## Cara Login dan Deteksi Auth

Untuk login di komputer lokal:

```powershell
kiro-refresh login
```

Kiro CLI akan membuka browser default. Setelah login selesai, tool otomatis menjalankan pengecekan status.

Untuk remote machine, SSH, container, atau browser tidak bisa terbuka:

```powershell
kiro-refresh login --device-flow
```

Kiro CLI akan menampilkan URL dan kode sekali pakai. Buka URL itu di browser mana pun, masukkan kode, lalu CLI akan mendeteksi login berhasil.

## Command Reference

```powershell
kiro-refresh help
kiro-refresh login
kiro-refresh login --device-flow
kiro-refresh status
kiro-refresh status --json
kiro-refresh status --show-email
kiro-refresh doctor
kiro-refresh paths
kiro-refresh logout
kiro-refresh docs
kiro-refresh explain-token
```

Lihat detail di [docs/USAGE.md](docs/USAGE.md).

## Kenapa Tidak Mencetak Refresh Token?

Refresh token bisa dipakai untuk mendapatkan access token baru. Kalau token itu tercetak di terminal, masuk ke log, commit, screenshot, atau history shell, akun bisa disalahgunakan.

Tool ini mengikuti batas aman:

- Tidak membaca database internal Kiro.
- Tidak membaca cookie atau localStorage browser.
- Tidak melakukan traffic interception.
- Tidak menulis token ke file `.env`.
- Tidak mengirim data ke server mana pun.

Untuk otomasi resmi, gunakan API key Kiro jika akun Anda mendukungnya:

```powershell
$env:KIRO_API_KEY = "ksk_xxxxxxxx"
kiro-cli chat --no-interactive "your prompt here"
```

## Dokumentasi Resmi Kiro

- [Kiro CLI Authentication](https://kiro.dev/docs/cli/authentication/)
- [Kiro CLI Commands](https://kiro.dev/docs/cli/reference/cli-commands/)
- [Kiro Network and Firewall Requirements](https://kiro.dev/docs/privacy-and-security/firewalls/)

## Dokumen Project

- [Usage](docs/USAGE.md)
- [Security](docs/SECURITY.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Architecture](docs/ARCHITECTURE.md)

## Test

```powershell
npm test
```
