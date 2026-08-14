# Extract. — Website Source Code Extractor

Alat developer front-end untuk mengekstrak **HTML, CSS, dan JavaScript** dari URL mana pun, langsung dari browser. Tampilan monokrom (hitam-putih murni), terinspirasi Linear / Vercel / Stripe / Apple.

Live demo: buka `index.html` langsung di browser — tidak perlu build step, server, atau `npm install`.

---

## ✨ Fitur

| Fitur | Keterangan |
|---|---|
| **URL Scanner** | Input URL dengan validasi otomatis + animasi shake saat error |
| **Ekstraksi nyata** | Fetch halaman asli via proxy CORS, lalu pisahkan HTML / CSS (inline + linked) / JS (inline + external) |
| **Syntax highlighting** | Tema highlight.js yang di-override total jadi monokrom (bold/italic untuk membedakan token, bukan warna) |
| **Live Preview** | Render hasil ekstraksi di `<iframe sandbox>`, dengan toggle Desktop / Tablet / Mobile |
| **Copy & Download** | Copy per tab, download per file, atau **Export semua sebagai `.zip`** (via JSZip) |
| **Animasi** | Page-load entrance, scroll-reveal, hover micro-interaction, loading skeleton, efek mengetik pada terminal & code viewer — semua pakai `transform`/`opacity` + custom easing, dan menghormati `prefers-reduced-motion` |
| **Error handling** | Jika situs target menolak diakses (CORS/offline/invalid), otomatis fallback ke contoh demo agar UI tidak pernah kosong |
| **Responsive** | Mobile-first, nav burger menu di layar kecil |

---

## 📁 Struktur File

```
extract-tool/
├── index.html    # Struktur halaman & semua section (Hero, Scanner, Viewer, Preview, Features, FAQ, Footer)
├── style.css     # Design system (token warna/tipografi/easing) + semua animasi
├── script.js     # Logika: ekstraksi, tab, copy/download, zip export, scroll reveal
└── README.md
```

Tidak ada dependency lokal. Tiga library eksternal dimuat via CDN di `index.html`:

- [Google Fonts](https://fonts.google.com) — `Inter` (display/body) & `JetBrains Mono` (code)
- [highlight.js](https://highlightjs.org) `11.9.0` — syntax highlighting (di-restyle monokrom lewat `style.css`)
- [JSZip](https://stuk.github.io/jszip/) `3.10.1` — bundling file jadi `.zip`

---

## 🚀 Cara Menjalankan

Tidak butuh instalasi apa pun:

1. Download ketiga file (`index.html`, `style.css`, `script.js`) ke folder yang sama.
2. Buka `index.html` dua kali klik, **atau** jalankan local server (disarankan, agar `fetch`/CORS lebih stabil):

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

3. Akses `http://localhost:8000`.

---

## ⚙️ Cara Kerja Ekstraksi

Karena ini murni **client-side** (tanpa backend sendiri), proses ekstraksi URL lintas-origin dilakukan lewat proxy CORS publik, dicoba berurutan sampai salah satu berhasil:

1. `api.allorigins.win`
2. `api.codetabs.com`
3. `corsproxy.io`

Alurnya:

1. Fetch dokumen HTML asli lewat proxy.
2. Parse dengan `DOMParser`.
3. Kumpulkan `<style>` inline + hingga 4 `<link rel="stylesheet">` pertama (ikut di-fetch isinya).
4. Kumpulkan `<script>` inline + daftar referensi `<script src>` eksternal.
5. Tampilkan hasil dengan efek mengetik + syntax highlighting, lalu render preview di iframe.

### ⚠️ Keterbatasan yang perlu diketahui

- **Bergantung pada proxy pihak ketiga** — beberapa situs bisa gagal diekstrak karena proxy rate-limited, situs target memblokir bot, atau butuh JavaScript rendering (SPA berat).
- **Bukan full-site crawler** — hanya mengekstrak dokumen yang diminta, bukan seluruh halaman di situs tersebut.
- **Preview iframe** memuat HTML mentah lewat `srcdoc`; aset dengan path relatif pada situs asli bisa saja tidak tampil sempurna karena tidak ada base URL asli.
- Jika ekstraksi nyata gagal total, aplikasi otomatis menampilkan **contoh demo bawaan** (`DEMO` object di `script.js`) supaya UI tetap berfungsi dan bisa dicoba.
- Untuk hasil ekstraksi yang konsisten di semua situs (termasuk yang butuh render JS penuh), solusi jangka panjang adalah menambahkan **backend sendiri** (mis. headless browser seperti Playwright) — bukan bergantung pada proxy publik.

---

## 🎨 Design Tokens

Didefinisikan sebagai CSS custom properties di `style.css` (`:root`):

- **Warna**: hitam murni `#000000`, putih murni `#FFFFFF`, dan 9 level abu-abu (`--g950` s/d `--g100`) — tanpa warna aksen sama sekali.
- **Tipografi**: `Inter` untuk display/body, `JetBrains Mono` untuk semua kode/data/label teknis.
- **Easing**: `--ease-out`, `--ease-out-soft`, `--ease-in-out` — custom cubic-bezier, bukan easing bawaan CSS.
- **Durasi**: skala `--dur-1` (120ms) s/d `--dur-4` (600ms), disesuaikan dengan seberapa sering elemen tersebut dilihat/dipicu.

---

## 🧩 Kustomisasi Cepat

- **Ganti nama produk**: cari & ganti string `extract` / `Extract.` di `index.html`.
- **Tambah/ganti proxy CORS**: edit array `PROXIES` di `script.js`.
- **Ubah batas ekstraksi stylesheet/script eksternal**: ubah angka `.slice(0, 4)` (CSS) dan `.slice(0, 3)` (JS) di fungsi `extractFromHtml`.
- **Matikan efek mengetik**: set `prefersReducedMotion` secara paksa jadi `true` di awal `script.js`.

---

## 📄 Lisensi

Bebas dipakai dan dimodifikasi untuk proyek pribadi maupun komersial.
