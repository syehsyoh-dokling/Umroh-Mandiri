# Master Wilayah API

API ini dibuat sebagai service master wilayah Indonesia yang reusable untuk banyak proyek, tidak hanya untuk MUWAHID.

## Sumber Data Canonical

- File sumber: `database/master-wilayah/dang1426_master_wilayah.sql`
- Database runtime: `master_wilayah_shared`
- Cakupan data terverifikasi:
  - `provinces`: 34
  - `regencies`: 499
  - `districts`: 6878
  - `villages`: 79702

## Base URL

- Local default: `http://127.0.0.1:8000/master-wilayah/v1`
- Jika ingin dijalankan sebagai service terpisah, arahkan env `WILAYAH_DATABASE_URL` ke schema MySQL yang sama dan set `NEXT_PUBLIC_WILAYAH_API_BASE` di frontend.

## Endpoints

### `GET /master-wilayah/v1/health`

Health check service.

### `GET /master-wilayah/v1/provinces`

Mengambil seluruh provinsi Indonesia.

Contoh respons:

```json
{
  "success": true,
  "meta": { "count": 34 },
  "data": [
    { "id": "11", "name": "Aceh" }
  ]
}
```

### `GET /master-wilayah/v1/regencies?province_id=11`

Mengambil kabupaten/kota berdasarkan provinsi.

### `GET /master-wilayah/v1/districts?regency_id=1101`

Mengambil kecamatan berdasarkan kabupaten/kota.

### `GET /master-wilayah/v1/villages?district_id=1101010`

Mengambil desa/kelurahan berdasarkan kecamatan.

### `GET /master-wilayah/v1/villages/1101010001/path`

Mengembalikan jalur lengkap satu desa sampai provinsi.

Contoh respons:

```json
{
  "success": true,
  "data": {
    "village_id": "1101010001",
    "village_name": "Latiung",
    "district_id": "1101010",
    "district_name": "Teupah Selatan",
    "regency_id": "1101",
    "regency_name": "Kabupaten Simeulue",
    "province_id": "11",
    "province_name": "Aceh"
  }
}
```

## Import Ulang ke MySQL

1. Buat schema:

```sql
CREATE DATABASE IF NOT EXISTS master_wilayah_shared
CHARACTER SET utf8mb4
COLLATE utf8mb4_general_ci;
```

2. Import dump:

```powershell
Get-Content -Raw .\database\master-wilayah\dang1426_master_wilayah.sql |
  & 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -u root '-pYOUR_PASSWORD' master_wilayah_shared
```

## Konsumsi di Frontend

Form registrasi memakai env berikut:

```env
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000
NEXT_PUBLIC_WILAYAH_API_BASE=http://127.0.0.1:8000/master-wilayah/v1
```

Jika `NEXT_PUBLIC_WILAYAH_API_BASE` tidak diisi, frontend otomatis memakai host API utama dengan path `/master-wilayah/v1`.
