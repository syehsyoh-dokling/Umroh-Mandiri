# Ticket Trend Daemon

Dokumen ini menjelaskan tool lokal untuk membangun statistik bulanan dan proyeksi harga tiket dari database legacy yang sudah diimpor ke MySQL lokal.

## Database yang dipakai

- Database sumber legacy: `umroh_legacy_local`
- Database analytics: `umroh_ticket_analytics`

Table analytics yang dibuat:

- `ticket_price_monthly_stats`
- `ticket_price_projections`

## Sumber data yang dianalisis

Tool membaca histori dari:

- `tiket_pp_cache`
- `tiket_pp_harian`

Lalu data dikelompokkan per:

- `origin`
- `destination`
- `bucket`
- `year_month`

Statistik bulanan yang disimpan:

- jumlah sampel
- harga minimum
- harga rata-rata
- harga median
- harga maksimum

## Metode proyeksi

Tool memakai dua pendekatan:

1. `linear-regression`
Dipakai jika histori bulanan tersedia minimal 3 bulan.

2. `seasonal-baseline`
Dipakai jika histori masih tipis. Baseline diambil dari median bulan terakhir, lalu bulan Mei dan Juni diberi uplift musiman ringan.

Catatan:

- Confidence masih rendah jika histori tipis.
- Dump legacy saat ini baru memberi histori yang relatif pendek, jadi proyeksi sampai Juni masih harus dianggap estimasi awal, bukan harga final.

## Menjalankan sekali

```powershell
python C:\Users\Saifuddin\Desktop\umroh-platform\scripts\ticket_trend_daemon.py --through 2026-06
```

## Menjalankan seperti daemon ringan

```powershell
python C:\Users\Saifuddin\Desktop\umroh-platform\scripts\ticket_trend_daemon.py --through 2026-06 --daemon-minutes 60
```

Mode ini akan:

- membangun ulang statistik bulanan
- memperbarui proyeksi
- mengulang setiap 60 menit

## Langkah lanjutan yang disarankan

1. Tambahkan importer tambahan dari `tiket_raw_segments` untuk memperkaya histori per route.
2. Tambahkan endpoint backend yang membaca `ticket_price_projections` agar halaman tiket stack baru bisa menampilkan estimasi langsung dari database lokal.
3. Tambahkan scheduler Windows Task Scheduler atau NSSM jika nanti tool ini ingin dijalankan terus di laptop/server lokal.
