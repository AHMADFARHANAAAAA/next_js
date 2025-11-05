# 📋 Panduan Import CSV untuk CRM Leads

## 🎯 Format CSV yang Didukung

Sistem ini mendukung import data leads dengan format CSV yang memiliki kolom-kolom berikut:

### 📊 **Header Kolom Wajib:**
```csv
No,Info Source,Date Contact,Lead / Month,Parent Name,Parent Phone,Parent Email,Student Name,School Origin,For Grade,Enrollment Year,Status Customer Journey,Notes / Kendala / Cancel / dll.,Next Follow-up
```

### 📝 **Penjelasan Kolom:**

1. **No** - Nomor urut (opsional)
2. **Info Source** - Sumber informasi lead (contoh: "Rekomendasi Teman", "Facebook", "Instagram", "Open House", "WhatsApp", "Website")
3. **Date Contact** - Tanggal kontak (format: YYYY-MM-DD, contoh: 2025-09-24)
4. **Lead / Month** - Bulan lead (contoh: "Des 2025", "Mar 2025")
5. **Parent Name** - Nama orang tua (WAJIB DIISI)
6. **Parent Phone** - Nomor HP orang tua
7. **Parent Email** - Email orang tua
8. **Student Name** - Nama siswa
9. **School Origin** - Asal sekolah siswa
10. **For Grade** - Target kelas (contoh: "Grade 7", "Grade 8", "Grade 9")
11. **Enrollment Year** - Tahun masuk (contoh: "2025/2026", "2026/2027")
12. **Status Customer Journey** - Status lead (lihat daftar di bawah)
13. **Notes / Kendala / Cancel / dll.** - Catatan tambahan
14. **Next Follow-up** - Aksi follow-up berikutnya (bukan tanggal)

## 🔄 **Status Customer Journey yang Didukung:**

### ✅ **Status Utama:**
- `New` atau `New Lead` → Dikonversi ke `NEW`
- `Contacted` → Dikonversi ke `KONTAK_VIA_WA`
- `Follow-up` → Dikonversi ke `KONTAK_VIA_WA`
- `Visited School` → Dikonversi ke `SURVEY_SEKOLAH`
- `Enrolled` → Dikonversi ke `CONVERTED`
- `Lost` → Dikonversi ke `LOST`

### 📋 **Status Lengkap Sistem:**
- `NEW` - Lead baru
- `KONTAK_VIA_WA` - Sudah dikontaki via WhatsApp
- `BAYAR_FORM_PRE` - Sudah bayar formulir pendaftaran
- `BAYAR_UP_OFFICIAL` - Sudah bayar uang pangkal resmi
- `POTENSI_WARM` - Prospek hangat
- `TIDAK_RESPON` - Tidak ada respons
- `TIDAK_POTENSI_COLD` - Tidak berpotensi (dingin)
- `SURVEY_SEKOLAH` - Sedang survey sekolah
- `CONVERTED` - Berhasil mendaftar
- `LOST` - Gagal/tidak jadi

## 📅 **Format Tanggal:**

### ✅ **Format yang Didukung:**
- `YYYY-MM-DD` (contoh: 2025-09-24)
- `DD-MMM-YY` (contoh: 24-Sep-25)

### ❌ **Format yang Tidak Didukung:**
- `DD/MM/YYYY`
- `MM-DD-YYYY`

## 🔧 **Next Follow-up:**

**Next Follow-up** berisi aksi yang akan dilakukan, bukan tanggal. Contoh:
- "Kirim brosur via WA"
- "Follow-up via email"
- "Pending info biaya"
- "Jadwalkan kunjungan"
- "Hubungi lagi minggu depan"
- "Sudah closing"

## ⚠️ **Penting untuk Diperhatikan:**

1. **Parent Name** WAJIB diisi - baris akan diskip jika kosong
2. **Encoding file**: Simpan CSV dalam format UTF-8
3. **Separator**: Gunakan koma (,) sebagai pemisah
4. **Data duplikat**: Sistem akan update data existing berdasarkan Parent Name + School
5. **Validation**: Semua error akan ditampilkan setelah proses import

## 📖 **Contoh Data CSV:**

```csv
No,Info Source,Date Contact,Lead / Month,Parent Name,Parent Phone,Parent Email,Student Name,School Origin,For Grade,Enrollment Year,Status Customer Journey,Notes / Kendala / Cancel / dll.,Next Follow-up
1,Rekomendasi Teman,2025-09-24,Des 2025,Bapak Siregar,084277462220,bapak.siregar@gmail.com,Intan Syahputra,SDIT Insan Cendekia,Grade 9,2026/2027,Lost,Menunggu hasil observasi,Kirim brosur via WA
2,Open House,2025-06-15,Mar 2025,Ibu Saputra,087366741688,ibu.saputra@gmail.com,Rafa Kusuma,SD Taruna Bakti,Grade 8,2025/2026,Follow-up,Tidak jadi daftar,Follow-up via email
```

## 🚀 **Tips Import Sukses:**

1. **Download template** yang sudah disediakan
2. **Isi data** sesuai format template
3. **Pastikan Parent Name** tidak kosong
4. **Periksa status** sesuai daftar yang didukung
5. **Simpan dalam format CSV** dengan encoding UTF-8
6. **Upload dan review** hasil import

## 📧 **Bantuan:**

Jika mengalami kesulitan, pastikan:
- Format CSV sesuai template
- Parent Name tidak kosong
- Status sesuai daftar yang didukung
- File encoding UTF-8