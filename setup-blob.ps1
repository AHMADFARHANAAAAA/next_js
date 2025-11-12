# Setup Vercel Blob Storage Token
# Run this script to get BLOB_READ_WRITE_TOKEN from Vercel

Write-Host "🔧 Setting up Vercel Blob Storage..." -ForegroundColor Cyan
Write-Host ""

# Check if vercel CLI is installed
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Red
    npm install -g vercel
}

Write-Host "📥 Pulling environment variables from Vercel..." -ForegroundColor Yellow
vercel env pull .env.local

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Success! BLOB_READ_WRITE_TOKEN has been added to .env.local" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Cyan
    Write-Host "1. Check .env.local file"
    Write-Host "2. Restart your dev server: npm run dev"
    Write-Host "3. Test image upload"
} else {
    Write-Host ""
    Write-Host "❌ Failed to pull env variables" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 Manual steps:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://vercel.com/ahmadfarhanaaaas-projects/edu-crm/stores"
    Write-Host "2. Create Blob Storage"
    Write-Host "3. Copy BLOB_READ_WRITE_TOKEN from Settings > Environment Variables"
    Write-Host "4. Add to .env.local manually"
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
