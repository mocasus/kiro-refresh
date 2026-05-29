# Security

Refresh token adalah kredensial jangka panjang. Perlakukan refresh token seperti password.

## Boundary Tool Ini

Tool ini boleh:

- Menjalankan `kiro-cli login`.
- Menjalankan `kiro-cli whoami`.
- Menjalankan `kiro-cli logout`.
- Mengecek keberadaan file data store tanpa membaca isinya.
- Membuka dokumentasi resmi Kiro.

Tool ini tidak boleh:

- Membaca cookie browser.
- Membaca localStorage/sessionStorage browser.
- Membaca atau mendump database token Kiro.
- Mengintersep traffic login.
- Mencetak refresh token, access token, session token, atau API key.
- Menulis kredensial ke `.env`, log, atau file lain.

## Kenapa Batas Ini Penting?

Refresh token bisa digunakan untuk mendapatkan access token baru tanpa login ulang. Jika bocor, pihak lain dapat memakai akun sampai token dicabut atau kedaluwarsa.

Risiko umum:

- Token tersimpan di terminal history.
- Token ikut tercatat di CI logs.
- Token tidak sengaja masuk commit.
- Token tertangkap screenshot.
- Token dipakai ulang di mesin yang tidak dipercaya.

## Rekomendasi

- Pakai `kiro-cli login` untuk sesi lokal.
- Pakai `kiro-cli logout` saat mesin tidak lagi dipercaya.
- Pakai `KIRO_API_KEY` untuk otomasi resmi jika akun mendukung.
- Simpan API key di secret manager atau environment variable, bukan di repository.
- Rotasi dan revoke kredensial jika ada dugaan bocor.

## Jika Benar-Benar Butuh Token Mentah

Gunakan OAuth/API/SDK resmi yang secara eksplisit mengembalikan token ke aplikasi milik Anda melalui consent flow yang terdokumentasi. Jangan mengekstrak token dari aplikasi desktop, browser storage, atau database internal.
