# Sync umroh-platform ke gemini

Script:

```powershell
C:\Users\Saifuddin\Desktop\umroh-platform\scripts\sync-to-gemini.ps1
```

Fungsi:

- Membuat backup folder `C:\Users\Saifuddin\Documents\gemini`.
- Mirror source dari `C:\Users\Saifuddin\Desktop\umroh-platform`.
- Menjaga folder `.git`, `node_modules`, `.next`, `venv`, `.venv`, dan `__pycache__` agar tidak ikut tertimpa.
- Verifikasi hash file agar source hasil sync benar-benar 1:1.

Pemakaian normal:

```powershell
cd C:\Users\Saifuddin\Desktop\umroh-platform
.\scripts\sync-to-gemini.ps1
```

Pemakaian dengan cek frontend di folder Gemini:

```powershell
cd C:\Users\Saifuddin\Desktop\umroh-platform
.\scripts\sync-to-gemini.ps1 -RunWebChecks
```

Jika backup sudah tidak dibutuhkan:

```powershell
cd C:\Users\Saifuddin\Desktop\umroh-platform
.\scripts\sync-to-gemini.ps1 -SkipBackup
```

Catatan:

- Jangan edit dua folder sekaligus.
- Gunakan `Desktop\umroh-platform` untuk development.
- Setelah selesai dan lolos test, jalankan sync ke `Documents\gemini`.
- Commit dan deploy dilakukan dari folder `Documents\gemini`.
