<p align="center">
  <img src="https://raw.githubusercontent.com/kirodotdev/Kiro/main/assets/kiro-icon.png" width="110" alt="Kiro logo" />
</p>

<pre align="center">
 _  ___                 _         _   _       _                 
| |/ (_)_ __ ___       / \  _   _| |_| |__   | |__   ___ _ __  
| ' /| | '__/ _ \     / _ \| | | | __| '_ \  | '_ \ / _ \ '__| 
| . \| | | | (_) |   / ___ \ |_| | |_| | | | | | | |  __/ |    
|_|\_\_|_|  \___/   /_/   \_\__,_|\__|_| |_| |_| |_|\___|_|    
</pre>

<p align="center">
  <strong>Kiro Auth Helper</strong><br />
  Local auth doctor and command wrapper for Kiro CLI.
</p>

# Kiro Auth Helper

Tool lokal untuk membantu login dan mengecek status autentikasi Kiro CLI secara aman.

Project ini awalnya dibuat untuk kebutuhan "ambil refresh token Kiro". Karena refresh token adalah kredensial jangka panjang, tool ini **tidak** mengekstrak atau mencetak token mentah dari browser, cookie, localStorage, profile browser, atau database internal Kiro. Sebagai gantinya, tool memakai flow resmi `kiro-cli login`, lalu mendeteksi status login lewat `kiro-cli whoami`.

> Unofficial helper. Kiro logo is loaded from the official [kirodotdev/Kiro](https://github.com/kirodotdev/Kiro) repository asset.

## Fitur

- Login lokal lewat browser resmi Kiro CLI.
- Device flow untuk SSH, container, atau environment yang tidak bisa membuka browser.
- Deteksi status login dengan output aman, email dimask secara default.
- `ensure` untuk memastikan Kiro CLI siap dipakai sebelum script lain jalan.
- `run` untuk menjalankan command `kiro-cli` setelah auth/API key dicek.
- `check-api-key` dan `setup-env` untuk automation/headless tanpa mencetak secret.
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
npm start -- ensure
npm start -- login
npm start -- status
npm start -- run -- --version
```

Atau pasang command lokal:

```powershell
npm link
kiro-refresh doctor
kiro-refresh ensure
kiro-refresh login
kiro-refresh status
kiro-refresh run -- --version
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

Jika Anda sudah login, command ini aman dijalankan ulang. Tool akan menampilkan akun aktif dan tidak memanggil `kiro-cli login`, sehingga tidak muncul error `Already logged in, please logout with kiro-cli logout first`.

Jika `kiro-cli whoami` tidak mengembalikan email, output akan menampilkan `Email: not returned by kiro-cli whoami`. Itu normal untuk sebagian sesi/provider dan bukan berarti login gagal.

Untuk pindah akun, logout dulu:

```powershell
kiro-refresh logout
kiro-refresh login
```

Untuk remote machine, SSH, container, atau browser tidak bisa terbuka:

```powershell
kiro-refresh login --device-flow
```

Kiro CLI akan menampilkan URL dan kode sekali pakai. Buka URL itu di browser mana pun, masukkan kode, lalu CLI akan mendeteksi login berhasil.

## Command Reference

```powershell
kiro-refresh help
kiro-refresh ensure
kiro-refresh run -- --version
kiro-refresh run -- chat --no-interactive "hello"
kiro-refresh check-api-key
kiro-refresh check-api-key --json
kiro-refresh setup-env
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

## Workflow yang Berguna

Pastikan environment siap sebelum script lain:

```powershell
kiro-refresh ensure
```

Jalankan command Kiro CLI lewat wrapper:

```powershell
kiro-refresh run -- --version
kiro-refresh run -- chat --no-interactive "hello"
```

Untuk CI/headless, cek API key tanpa mencetak secret:

```powershell
kiro-refresh check-api-key
kiro-refresh setup-env
```

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
