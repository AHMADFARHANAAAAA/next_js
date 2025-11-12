# Vercel Blob Storage Setup

## 🎯 Purpose
This application uses **Vercel Blob Storage** to store uploaded images (school logos, profile pictures, etc.) because Vercel's serverless environment doesn't support persistent file system storage.

## ⚙️ Setup Instructions

### 1. Enable Vercel Blob in Your Project

1. Go to your Vercel project dashboard: https://vercel.com/ahmadfarhanaaaas-projects/edu-crm
2. Navigate to **Storage** tab
3. Click **Create Database** → Select **Blob**
4. Click **Create** to provision Blob storage
5. Vercel will automatically add the required environment variable: `BLOB_READ_WRITE_TOKEN`

### 2. Environment Variables

After creating Blob storage, Vercel automatically adds:

```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
```

**No manual configuration needed!** This token is automatically available in all environments (Development, Preview, Production).

### 3. Local Development

For local development, you need to link your project to Vercel:

```bash
# Link to Vercel project
vercel link

# Pull environment variables
vercel env pull .env.local
```

This will create `.env.local` with the `BLOB_READ_WRITE_TOKEN`.

## 📦 Package Used

```json
{
  "@vercel/blob": "^0.x.x"
}
```

## 🔧 Implementation

### Upload API (`/api/upload/image`)

```typescript
import { put } from '@vercel/blob'

const blob = await put(fileName, file, {
  access: 'public',
  addRandomSuffix: false,
})

// Returns: blob.url (e.g., https://xxx.public.blob.vercel-storage.com/schools/logo.png)
```

### Database Storage

The database stores the **blob URL**, not the file itself:

```prisma
model School {
  logo String? // Stores: https://xxx.public.blob.vercel-storage.com/schools/logo.png
}
```

## 🌐 How It Works

1. **User uploads image** → `POST /api/upload/image`
2. **File sent to Vercel Blob** → Stores in cloud storage
3. **Blob URL returned** → `https://xxx.public.blob.vercel-storage.com/...`
4. **URL saved to database** → PostgreSQL stores the URL
5. **Image displayed** → Browser loads from Blob URL

## ✅ Benefits

- ✅ **Persistent storage** - Images don't disappear on redeploy
- ✅ **CDN delivery** - Fast image loading worldwide
- ✅ **No file system needed** - Works on serverless
- ✅ **Automatic scaling** - Vercel handles infrastructure
- ✅ **Secure access** - Token-based authentication

## 📊 Storage Limits

### Hobby Plan (Free)
- **Storage**: 1 GB
- **Bandwidth**: 100 GB/month

### Pro Plan
- **Storage**: Unlimited
- **Bandwidth**: 1 TB/month

Check current usage: https://vercel.com/ahmadfarhanaaaas-projects/edu-crm/storage

## 🔒 Security

- All uploads require authentication (ADMIN or SUPERADMIN role)
- File type validation (only images: JPG, PNG, GIF, WebP)
- File size limit: 5MB per file
- Public access URLs (secure, but publicly accessible)

## 📝 API Endpoints

### Upload Image
```http
POST /api/upload/image
Content-Type: multipart/form-data

file: [Binary File]
uploadType: schools | profiles | general | contents
```

### Update School Logo
```http
POST /api/schools/logo
Content-Type: application/json

{
  "schoolId": "xxx",
  "logoUrl": "https://xxx.public.blob.vercel-storage.com/..."
}
```

## 🐛 Troubleshooting

### Error: "BLOB_READ_WRITE_TOKEN is not defined"

**Solution**: 
1. Ensure Blob storage is created in Vercel dashboard
2. Redeploy your application
3. For local dev: Run `vercel env pull .env.local`

### Error: "ENOENT: no such file or directory"

This was the old file system error. Now fixed with Vercel Blob! 🎉

### Images not loading

**Check**:
1. Blob URL format: `https://xxx.public.blob.vercel-storage.com/...`
2. Database contains correct URL
3. Image access is set to `public`

## 📚 Resources

- [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)
- [@vercel/blob Package](https://www.npmjs.com/package/@vercel/blob)
- [Vercel Storage Dashboard](https://vercel.com/ahmadfarhanaaaas-projects/edu-crm/storage)
