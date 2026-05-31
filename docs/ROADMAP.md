# Roadmap

Dokumen ini menjelaskan arah project agar tidak kabur.

## Product Direction

`kiro-refresh` adalah Kiro CLI Companion.

Tujuan utamanya adalah membantu pengguna menjalankan Kiro CLI dengan lebih mudah melalui:

- TUI sederhana.
- Pengecekan login.
- Pengecekan environment lokal.
- Wrapper command `kiro-cli`.
- OAuth Authorization Code + PKCE flow untuk provider resmi.
- Setup API key untuk automation.
- Dokumentasi yang ramah pemula.

## Non-Goals

Project ini tidak akan:

- Mengekstrak refresh token mentah.
- Membaca cookie browser.
- Membaca localStorage/sessionStorage.
- Membaca database internal Kiro.
- Mengintersep traffic login.
- Menggantikan Kiro CLI resmi.

Catatan: project boleh menampilkan refresh token yang berasal dari OAuth token endpoint resmi setelah user login/consent. Itu berbeda dari ekstraksi token dari storage aplikasi lain.

## Current Scope

Fitur yang sudah ada:

- `kiro-refresh tui`
- `kiro-refresh ensure`
- `kiro-refresh login`
- `kiro-refresh status`
- `kiro-refresh doctor`
- `kiro-refresh run -- <args>`
- `kiro-refresh oauth-config`
- `kiro-refresh oauth-login`
- `kiro-refresh oauth-status`
- `kiro-refresh oauth-show-refresh-token`
- `kiro-refresh oauth-clear`
- `kiro-refresh check-api-key`
- `kiro-refresh setup-env`
- `kiro-refresh logout`

## Next Milestones

### 1. Better TUI

- Tambah tampilan ringkasan status di bagian atas TUI.
- Tambah menu custom command.
- Tambah confirm dialog untuk logout.
- Tambah pesan error yang lebih ramah untuk user awam.

### 2. Guided Setup

- Wizard install check untuk Node.js, Kiro CLI, dan PATH.
- Wizard login.
- Wizard API key environment variable.

### 3. Command Presets

- Preset untuk command Kiro CLI yang sering dipakai.
- Simpan preset lokal tanpa menyimpan secret.
- Jalankan preset dari TUI.

### 4. Better Documentation

- Tambah screenshot tiap menu utama.
- Tambah panduan Windows-first.
- Tambah FAQ untuk error umum.

## Success Criteria

Project dianggap arahnya benar jika pengguna baru bisa:

1. Install tool.
2. Buka TUI.
3. Cek apakah Kiro CLI siap.
4. Login jika perlu.
5. Menjalankan command Kiro CLI pertama tanpa membaca dokumentasi panjang.
