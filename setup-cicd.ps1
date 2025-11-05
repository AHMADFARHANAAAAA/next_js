# CI/CD Setup Script for Next.js CRM Project (PowerShell)
# This script helps you set up GitHub Actions CI/CD pipeline

Write-Host "🚀 GitHub Actions CI/CD Setup Script" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if running in project directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found. Please run this script from the project root directory." -ForegroundColor Red
    exit 1
}

# Check if git repository
if (-not (Test-Path ".git")) {
    Write-Host "⚠️  Warning: Not a git repository. Initializing..." -ForegroundColor Yellow
    git init
    Write-Host "✅ Git repository initialized" -ForegroundColor Green
}

# Check if .github/workflows exists
if (-not (Test-Path ".github/workflows")) {
    Write-Host "❌ Error: .github/workflows directory not found." -ForegroundColor Red
    Write-Host "Please ensure the workflow files are in place." -ForegroundColor Red
    exit 1
}

Write-Host "📋 Checking workflow files..." -ForegroundColor Yellow
$workflows = @("ci.yml", "deploy.yml", "preview.yml", "prisma-check.yml", "code-quality.yml")
foreach ($workflow in $workflows) {
    if (Test-Path ".github/workflows/$workflow") {
        Write-Host "✅ $workflow found" -ForegroundColor Green
    } else {
        Write-Host "❌ $workflow missing" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📝 Required GitHub Secrets:" -ForegroundColor Cyan
Write-Host "----------------------------" -ForegroundColor Cyan
Write-Host "1. NEXTAUTH_SECRET          - Generate with: openssl rand -base64 32"
Write-Host "2. NEXTAUTH_URL             - Your production URL (e.g., https://yourdomain.com)"
Write-Host "3. NEXTAUTH_URL_PREVIEW     - Your preview URL (e.g., https://preview.vercel.app)"
Write-Host "4. DATABASE_URL             - PostgreSQL connection string"
Write-Host "5. VERCEL_TOKEN             - Get from: https://vercel.com/account/tokens"
Write-Host "6. VERCEL_ORG_ID            - Get from: Get-Content .vercel/project.json"
Write-Host "7. VERCEL_PROJECT_ID        - Get from: Get-Content .vercel/project.json"

Write-Host ""
Write-Host "🔑 Generating NEXTAUTH_SECRET..." -ForegroundColor Yellow
# Generate random secret using .NET
$bytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$NEXTAUTH_SECRET = [Convert]::ToBase64String($bytes)
Write-Host "Generated secret: $NEXTAUTH_SECRET" -ForegroundColor Green
Write-Host "(Copy this to GitHub Secrets)" -ForegroundColor Yellow

Write-Host ""
Write-Host "📦 Vercel Setup Instructions:" -ForegroundColor Cyan
Write-Host "----------------------------" -ForegroundColor Cyan
Write-Host "1. Install Vercel CLI: npm install -g vercel"
Write-Host "2. Login: vercel login"
Write-Host "3. Link project: vercel link"
Write-Host "4. Get credentials: Get-Content .vercel/project.json"

Write-Host ""
Write-Host "🔧 Next Steps:" -ForegroundColor Cyan
Write-Host "----------------------------" -ForegroundColor Cyan
Write-Host "1. Go to: https://github.com/AHMADFARHANAAAAA/next_js/settings/secrets/actions"
Write-Host "2. Add all required secrets listed above"
Write-Host "3. Create 'production' and 'preview' environments"
Write-Host "4. Enable branch protection for 'main' branch"
Write-Host "5. Push your code to trigger the workflows"

Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "----------------------------" -ForegroundColor Cyan
Write-Host "- Full setup guide: .github/CICD_SETUP.md"
Write-Host "- GitHub Actions: https://docs.github.com/en/actions"
Write-Host "- Vercel deployment: https://vercel.com/docs"

Write-Host ""
$verify = Read-Host "Would you like to verify your environment? (y/n)"
if ($verify -eq "y" -or $verify -eq "Y") {
    Write-Host ""
    Write-Host "🔍 Verifying environment..." -ForegroundColor Yellow
    
    # Check Node.js version
    try {
        $nodeVersion = node -v
        Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ Node.js not found" -ForegroundColor Red
    }
    
    # Check npm version
    try {
        $npmVersion = npm -v
        Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ npm not found" -ForegroundColor Red
    }
    
    # Check if Prisma is installed
    try {
        npx prisma --version | Out-Null
        Write-Host "✅ Prisma CLI available" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Prisma CLI not found in dependencies" -ForegroundColor Yellow
    }
    
    # Check if .env file exists
    if (Test-Path ".env") {
        Write-Host "✅ .env file exists" -ForegroundColor Green
    } else {
        Write-Host "⚠️  .env file not found. You may need to create one." -ForegroundColor Yellow
    }
    
    # Check if node_modules exists
    if (Test-Path "node_modules") {
        Write-Host "✅ Dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Dependencies not installed. Run: npm install" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✨ Setup script complete!" -ForegroundColor Green
Write-Host "Please follow the next steps above to complete your CI/CD setup." -ForegroundColor Yellow
Write-Host ""
