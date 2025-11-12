#!/bin/bash
# Setup Vercel Blob Storage Token
# Run this script to get BLOB_READ_WRITE_TOKEN from Vercel

echo "🔧 Setting up Vercel Blob Storage..."
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null
then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

echo "📥 Pulling environment variables from Vercel..."
vercel env pull .env.local

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Success! BLOB_READ_WRITE_TOKEN has been added to .env.local"
    echo ""
    echo "📝 Next steps:"
    echo "1. Check .env.local file"
    echo "2. Restart your dev server: npm run dev"
    echo "3. Test image upload"
else
    echo ""
    echo "❌ Failed to pull env variables"
    echo ""
    echo "📋 Manual steps:"
    echo "1. Go to: https://vercel.com/ahmadfarhanaaaas-projects/edu-crm/stores"
    echo "2. Create Blob Storage"
    echo "3. Copy BLOB_READ_WRITE_TOKEN from Settings > Environment Variables"
    echo "4. Add to .env.local manually"
fi
