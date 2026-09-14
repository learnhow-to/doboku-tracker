# Runbook Backup & Restore — DobokuTracker

Dokumen prosedur operasional untuk backup dan restore lingkungan produksi / staging DobokuTracker sesuai klausul Bagian 11 PRD.

---

## 1. Prinsip Kunci & Pemisahan Tanggung Jawab

> [!CAUTION]
> **Pemisahan Database & Storage**:
> Backup database PostgreSQL (Supabase / Managed Postgres) **TIDAK** otomatis mencakup file biner foto pada object storage. Keduanya harus dibackup dan dipulihkan dengan prosedur tersendiri dan disinkronkan melalui manifest hash SHA-256.

> [!WARNING]
> **Uji Restore ke Lingkungan Terpisah**:
> Dilarang melakukan uji coba restore langsung menimpa database produksi (`production`). Restore uji coba wajib ditargetkan ke database staging atau container uji terisolasi.

---

## 2. Prosedur Backup Harian

### A. Backup Database (PostgreSQL)
Jalankan skrip dump terenkripsi atau pg_dump terjadwal:
```bash
# Set timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/secure/backups/doboku/db"

# Backup data dan skema relasional
pg_dump -h $PG_HOST -p $PG_PORT -U $PG_USER -d dobokutracker \
  --format=custom \
  --file="${BACKUP_DIR}/doboku_db_${TIMESTAMP}.dump"

# Hitung checksum SHA-256 untuk verifikasi integritas
sha256sum "${BACKUP_DIR}/doboku_db_${TIMESTAMP}.dump" > "${BACKUP_DIR}/doboku_db_${TIMESTAMP}.dump.sha256"
```

### B. Backup Object Storage Foto & Pembuatan Manifest
Foto disimpan secara terpisah. Prosedur ini mengunduh/menyinkronkan objek storage dan menghasilkan file manifest:
```bash
# Sinkronkan bucket foto ke penyimpanan arsip dingin
aws s3 sync s3://doboku-production-photos/ /secure/backups/doboku/photos/${TIMESTAMP}/ \
  --endpoint-url $STORAGE_ENDPOINT

# Hasilkan Manifest Foto (Memetakan file, ukuran, dan SHA-256)
find /secure/backups/doboku/photos/${TIMESTAMP}/ -type f -exec sha256sum {} + > /secure/backups/doboku/photos/${TIMESTAMP}/photo_manifest.txt
```

---

## 3. Prosedur Restore ke Lingkungan Terpisah (Test / Staging)

### Langkah 1: Siapkan Lingkungan Target Baru
Pastikan target bukan database produksi:
```bash
# Verifikasi database target
echo "Target: $TARGET_DB_HOST (Harus STAGING / TEST, BUKAN PRODUCTION)"
```

### Langkah 2: Verifikasi Checksum Dump
```bash
sha256sum -c "${BACKUP_DIR}/doboku_db_${TIMESTAMP}.dump.sha256"
```

### Langkah 3: Eksekusi Restore Database
```bash
# Buat database baru di staging
createdb -h $TARGET_DB_HOST -U $TARGET_DB_USER dobokutracker_restored_test

# Restore dump
pg_restore -h $TARGET_DB_HOST -U $TARGET_DB_USER -d dobokutracker_restored_test \
  --clean --if-exists --no-owner "${BACKUP_DIR}/doboku_db_${TIMESTAMP}.dump"
```

### Langkah 4: Restore Objek Foto & Rekonsiliasi Manifest
```bash
# Sinkronkan kembali file foto ke bucket uji
aws s3 sync /secure/backups/doboku/photos/${TIMESTAMP}/ s3://doboku-staging-photos/ \
  --endpoint-url $STORAGE_ENDPOINT

# Jalankan query audit untuk memastikan tidak ada foto yang hilang atau hash tidak cocok:
# SELECT p.id, p.file_name, p.file_hash FROM photos p WHERE ...
```

---

## 4. Target RPO / RTO Pilot (Usulan untuk Persetujuan Perusahaan)

- **RPO (Recovery Point Objective)**: 24 jam (backup harian otomatis pukul 02:00 JST).
- **RTO (Recovery Time Objective)**: 2 jam untuk pemulihan database penuh dan ketersediaan aplikasi.
- **Uji Coba Wajib**: Uji restore end-to-end minimal 1 kali sebelum pilot go-live dimulai.
