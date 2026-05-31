# Quick Start

Panduan ini untuk pengguna yang belum terbiasa dengan CLI.

## Cara Paling Mudah

1. Buka PowerShell.
2. Cek Node.js:

```powershell
node --version
npm --version
```

Kalau belum ada Node.js, install dari <https://nodejs.org/>.

3. Install tool:

```powershell
npm install -g github:mocasus/kiro-refresh
```

4. Buka menu:

```powershell
kiro-refresh tui
```

## Menu yang Harus Dipilih

Kalau bingung, mulai dari urutan ini:

1. `Ensure Kiro auth is ready`
2. `Login` jika diminta login
3. `Status`
4. `Run kiro-cli --version`

Tekan `Up/Down` untuk memilih, `Enter` untuk menjalankan, dan `q` untuk keluar.

## Cara Tanpa Menu

```powershell
kiro-refresh ensure
kiro-refresh status
kiro-refresh run -- --version
```

Jika muncul:

```text
Kiro CLI session is ready.
```

berarti Kiro CLI sudah siap dipakai.

## Jika Install dari GitHub Gagal

Pakai cara clone:

```powershell
git clone https://github.com/mocasus/kiro-refresh.git
cd kiro-refresh
npm install
npm link
kiro-refresh tui
```

## Arti Command Penting

- `kiro-refresh tui`: buka menu interaktif.
- `kiro-refresh ensure`: cek Kiro CLI dan login.
- `kiro-refresh login`: login lewat flow resmi Kiro CLI.
- `kiro-refresh status`: lihat status akun.
- `kiro-refresh doctor`: cek environment lokal.
- `kiro-refresh run -- --version`: coba menjalankan Kiro CLI lewat wrapper.

## Catatan Keamanan

Tool ini tidak menampilkan refresh token mentah. Untuk automation headless, gunakan API key resmi lewat `KIRO_API_KEY`.
