# Troubleshooting

## `kiro-cli` Tidak Ditemukan

Jalankan:

```powershell
Get-Command kiro-cli
```

Jika tidak ditemukan, install Kiro CLI atau set path manual:

```powershell
$env:KIRO_CLI_BIN = "C:\Users\you\AppData\Local\Kiro-Cli\kiro-cli.exe"
kiro-refresh doctor
```

## Browser Tidak Terbuka

Gunakan device flow:

```powershell
kiro-refresh login --device-flow
```

Mode ini menampilkan URL dan kode sekali pakai yang bisa dibuka di browser lain.

## Sudah Login Tapi Status Gagal

Coba:

```powershell
kiro-cli whoami
kiro-refresh doctor
```

Jika Kiro CLI memberi error "already logged in" saat login ulang, logout dulu:

```powershell
kiro-refresh logout
kiro-refresh login
```

## Firewall atau Proxy

Pastikan domain auth Kiro bisa diakses dari mesin Anda. Dokumentasi firewall Kiro mencantumkan endpoint seperti:

- `app.kiro.dev`
- `prod.us-east-1.auth.desktop.kiro.dev`
- endpoint identity provider seperti Google, GitHub, atau AWS IAM Identity Center sesuai metode login.

Lihat dokumentasi resmi: <https://kiro.dev/docs/privacy-and-security/firewalls/>

## Automation Headless

Untuk CI/CD atau script non-interaktif, gunakan API key resmi:

```powershell
$env:KIRO_API_KEY = "ksk_xxxxxxxx"
kiro-cli chat --no-interactive "your prompt here"
```

Jika akun tidak punya fitur API key, gunakan login interaktif atau minta admin Kiro mengaktifkan fitur tersebut.
