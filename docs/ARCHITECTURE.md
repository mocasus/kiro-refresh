# Architecture

Project ini sengaja kecil dan dependency-free.

```text
bin/kiro-refresh.js
  -> src/cli.js
      -> child_process.spawnSync("kiro-cli", ...)
      -> fs.existsSync(...) untuk cek path data store
```

## Komponen

- `bin/kiro-refresh.js`: entrypoint executable.
- `src/cli.js`: parser argumen, command handler, wrapper `kiro-cli`, masker email, dan helper path.
- `test/cli.test.js`: test kecil untuk helper internal.
- `docs/`: dokumentasi penggunaan, keamanan, troubleshooting, dan arsitektur.

## Prinsip Desain

- Tidak ada dependency runtime.
- Tidak ada server lokal.
- Tidak ada network call selain yang dilakukan oleh `kiro-cli` saat login.
- Tidak membaca secret store internal.
- Tidak mencetak token.
- Output status memask email secara default.

## Kenapa Wrapper, Bukan OAuth Client Sendiri?

Kiro CLI sudah menyediakan login lokal, device flow, logout, dan status user. Membuat OAuth client sendiri tanpa dokumentasi resmi berisiko rapuh dan dapat melanggar model keamanan Kiro. Wrapper ini menjaga integrasi tetap dekat dengan jalur resmi.
