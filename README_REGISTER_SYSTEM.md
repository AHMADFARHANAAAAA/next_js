# 🚀 Sistem Register MongoDB - Dokumentasi Lengkap

## 📋 Apa yang Telah Dibuat

Saya telah membuat sistem register lengkap yang terhubung dengan MongoDB untuk aplikasi Next.js Anda. Berikut adalah komponen-komponen yang telah dibuat:

## 🗂️ Struktur File yang Dibuat

```
edu/
├── .env.local                     # Environment variables
├── MONGODB_SETUP.md              # Panduan setup MongoDB
├── lib/
│   └── mongodb.ts                # Koneksi database
├── models/
│   └── User.ts                   # Model User schema
├── app/
│   ├── api/
│   │   ├── register/
│   │   │   └── route.ts          # API endpoint register
│   │   ├── login/
│   │   │   └── route.ts          # API endpoint login
│   │   ├── users/
│   │   │   └── route.ts          # API untuk melihat users
│   │   └── test-db/
│   │       └── route.ts          # Test koneksi database
│   ├── register/
│   │   └── page.tsx              # Halaman register
│   ├── admin/
│   │   └── page.tsx              # Halaman admin
│   └── login/
│       └── page.tsx              # Updated login page
```

## 🔧 Dependencies yang Ditambahkan

```json
{
  "dependencies": {
    "mongoose": "^8.x.x",
    "bcryptjs": "^2.x.x",
    "jsonwebtoken": "^9.x.x"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.x.x",
    "@types/jsonwebtoken": "^8.x.x"
  }
}
```

## 🌟 Fitur Utama

### 1. **Halaman Register** (`/register`)
- ✅ Form validation (client & server-side)
- ✅ Password confirmation
- ✅ Email format validation
- ✅ Real-time error messages
- ✅ Success feedback
- ✅ Auto redirect ke login setelah berhasil

### 2. **API Routes**
- ✅ **POST `/api/register`**: Mendaftarkan user baru
- ✅ **POST `/api/login`**: Login user
- ✅ **GET `/api/users`**: Melihat semua user (untuk admin)
- ✅ **GET `/api/test-db`**: Test koneksi database

### 3. **Database & Security**
- ✅ MongoDB schema dengan validasi
- ✅ Password hashing dengan bcryptjs (salt rounds 12)
- ✅ JWT token authentication (7 hari expiry)
- ✅ Email uniqueness validation
- ✅ Input sanitization

### 4. **Halaman Admin** (`/admin`)
- ✅ Melihat status koneksi database
- ✅ Daftar semua user yang terdaftar
- ✅ Statistics dan informasi user
- ✅ Navigation ke register/login

## 🚀 Cara Menggunakan

### 1. Setup MongoDB
Lihat file `MONGODB_SETUP.md` untuk panduan lengkap setup MongoDB.

**Opsi A: MongoDB Atlas (Cloud - Recommended)**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.xxxxx.mongodb.net/edu_app
```

**Opsi B: MongoDB Local**
```env
MONGODB_URI=mongodb://localhost:27017/edu_app
```

### 2. Jalankan Aplikasi
```bash
npm run dev
```
Aplikasi berjalan di: http://localhost:3001

### 3. Test Fitur
1. **Admin Dashboard**: http://localhost:3001/admin
2. **Register**: http://localhost:3001/register
3. **Login**: http://localhost:3001/login

## 🎯 Flow Aplikasi

```
1. User mengisi form register
   ↓
2. Client-side validation
   ↓
3. POST ke /api/register
   ↓
4. Server validation & hash password
   ↓
5. Simpan ke MongoDB
   ↓
6. Generate JWT token
   ↓
7. Return success + redirect ke login
   ↓
8. User login dengan credentials
   ↓
9. POST ke /api/login
   ↓
10. Verify password & generate token
    ↓
11. Store token di localStorage
    ↓
12. Redirect ke homepage
```

## 🔒 Security Features

1. **Password Hashing**: bcryptjs dengan salt rounds 12
2. **JWT Authentication**: Secure token dengan expiry
3. **Input Validation**: Client & server-side
4. **Email Uniqueness**: Mencegah duplikasi
5. **Environment Variables**: Sensitive data terproteksi
6. **Error Handling**: Comprehensive error responses

## 📱 UI/UX Features

1. **Responsive Design**: Mobile-friendly
2. **Loading States**: User feedback selama proses
3. **Error Messages**: Real-time validation feedback
4. **Success Messages**: Confirmation feedback
5. **Password Toggle**: Show/hide password
6. **Form Validation**: Mencegah submit invalid data

## 🧪 Testing

### Manual Testing
1. Buka http://localhost:3001/admin untuk cek status DB
2. Register user baru di http://localhost:3001/register
3. Cek admin page untuk melihat user terdaftar
4. Test login dengan credentials baru
5. Verify token tersimpan di browser localStorage

### API Testing (menggunakan curl atau Postman)
```bash
# Test Database Connection
curl http://localhost:3001/api/test-db

# Register User
curl -X POST http://localhost:3001/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123"}'

# Login User
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'

# Get All Users
curl http://localhost:3001/api/users
```

## 🎉 Ready to Use!

Sistem register Anda sudah siap digunakan! Yang perlu dilakukan:

1. ✅ Setup MongoDB (Atlas atau local)
2. ✅ Update `.env.local` dengan connection string
3. ✅ Jalankan `npm run dev`
4. ✅ Test di browser

**Enjoy coding! 🚀**