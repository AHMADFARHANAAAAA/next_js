# Setup PostgreSQL untuk Aplikasi Register

## 🚀 Migrasi dari MongoDB ke PostgreSQL

Aplikasi telah berhasil dimigrasi dari MongoDB ke PostgreSQL! Berikut panduan setup PostgreSQL.

## Pilihan 1: PostgreSQL Local (Windows)

### Install PostgreSQL
1. Download PostgreSQL dari [PostgreSQL Download](https://www.postgresql.org/download/windows/)
2. Install dengan default settings
3. Ingat password untuk user `postgres`

### Setup Database
1. Buka **pgAdmin** (biasanya terinstall bersamaan)
2. Connect ke server PostgreSQL
3. Buat database baru bernama `edu_app`

### Connection String
Update `.env.local`:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/edu_app?schema=public"
```

## Pilihan 2: PostgreSQL Cloud (Supabase - Recommended)

1. Buka [Supabase](https://supabase.com/)
2. Buat akun gratis
3. Buat project baru
4. Di dashboard, klik "Settings" > "Database"
5. Copy "Connection string" (URI format)

Update `.env.local`:
```env
DATABASE_URL="postgresql://postgres:[password]@[host]:5432/postgres?schema=public"
```

## Pilihan 3: Railway/Neon (Alternative Cloud)

### Railway:
1. Buka [Railway](https://railway.app/)
2. Buat project baru
3. Add PostgreSQL service
4. Copy connection string

### Neon:
1. Buka [Neon](https://neon.tech/)
2. Buat account dan database
3. Copy connection string

## 🎯 Struktur Database yang Dibuat

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Cara Test Aplikasi

1. **Start development server**:
   ```bash
   npm run dev
   ```

2. **Test Database Connection**:
   - Buka: http://localhost:3000/api/test-db
   - Harus menunjukkan "PostgreSQL database connected successfully"

3. **Test Register & Login**:
   - Admin: http://localhost:3000/admin
   - Register: http://localhost:3000/register
   - Login: http://localhost:3000/login

## 📋 Perubahan yang Telah Dilakukan

### 1. Dependencies
```bash
# Removed
- mongoose

# Added
+ pg
+ @prisma/client
+ prisma
+ @types/pg
```

### 2. Files Updated
- `lib/database.ts` (sebelumnya mongodb.ts)
- `models/User.ts` - Model PostgreSQL dengan raw SQL queries
- `app/api/register/route.ts`
- `app/api/login/route.ts`
- `app/api/users/route.ts`
- `app/api/test-db/route.ts`
- `app/admin/page.tsx`
- `.env.local`

### 3. Key Features
- ✅ PostgreSQL connection pooling
- ✅ Raw SQL queries dengan parameterized statements
- ✅ Automatic table creation
- ✅ Password hashing dengan bcryptjs
- ✅ JWT authentication
- ✅ Input validation
- ✅ Error handling

## 🛠️ Troubleshooting

### Error "relation users does not exist"
- Jalankan: http://localhost:3000/api/test-db
- Ini akan otomatis create table `users`

### Connection refused
- Pastikan PostgreSQL service berjalan
- Check username/password di connection string
- Untuk cloud: pastikan IP whitelist diatur

### Environment variables not loaded
- Restart development server setelah update `.env.local`
- Pastikan file `.env.local` ada di root project

## ✅ Ready to Use!

Sistem PostgreSQL sudah siap digunakan! Langkah selanjutnya:

1. ✅ Setup PostgreSQL (local/cloud)
2. ✅ Update `.env.local` dengan connection string
3. ✅ Jalankan `npm run dev`
4. ✅ Test di http://localhost:3000/admin

**PostgreSQL is ready! 🐘🚀**