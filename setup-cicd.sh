#!/bin/bash

# CI/CD Setup Script for Next.js CRM Project
# This script helps you set up GitHub Actions CI/CD pipeline

echo "🚀 GitHub Actions CI/CD Setup Script"
echo "===================================="
echo ""

# Check if running in project directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Check if git repository
if [ ! -d ".git" ]; then
    echo "⚠️  Warning: Not a git repository. Initializing..."
    git init
    echo "✅ Git repository initialized"
fi

# Check if .github/workflows exists
if [ ! -d ".github/workflows" ]; then
    echo "❌ Error: .github/workflows directory not found."
    echo "Please ensure the workflow files are in place."
    exit 1
fi

echo "📋 Checking workflow files..."
WORKFLOWS=("ci.yml" "deploy.yml" "preview.yml" "prisma-check.yml" "code-quality.yml")
for workflow in "${WORKFLOWS[@]}"; do
    if [ -f ".github/workflows/$workflow" ]; then
        echo "✅ $workflow found"
    else
        echo "❌ $workflow missing"
    fi
done

echo ""
echo "📝 Required GitHub Secrets:"
echo "----------------------------"
echo "1. NEXTAUTH_SECRET          - Generate with: openssl rand -base64 32"
echo "2. NEXTAUTH_URL             - Your production URL (e.g., https://yourdomain.com)"
echo "3. NEXTAUTH_URL_PREVIEW     - Your preview URL (e.g., https://preview.vercel.app)"
echo "4. DATABASE_URL             - PostgreSQL connection string"
echo "5. VERCEL_TOKEN             - Get from: https://vercel.com/account/tokens"
echo "6. VERCEL_ORG_ID            - Get from: cat .vercel/project.json"
echo "7. VERCEL_PROJECT_ID        - Get from: cat .vercel/project.json"

echo ""
echo "🔑 Generating NEXTAUTH_SECRET..."
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "Generated secret: $NEXTAUTH_SECRET"
echo "(Copy this to GitHub Secrets)"

echo ""
echo "📦 Vercel Setup Instructions:"
echo "----------------------------"
echo "1. Install Vercel CLI: npm install -g vercel"
echo "2. Login: vercel login"
echo "3. Link project: vercel link"
echo "4. Get credentials: cat .vercel/project.json"

echo ""
echo "🔧 Next Steps:"
echo "----------------------------"
echo "1. Go to: https://github.com/AHMADFARHANAAAAA/next_js/settings/secrets/actions"
echo "2. Add all required secrets listed above"
echo "3. Create 'production' and 'preview' environments"
echo "4. Enable branch protection for 'main' branch"
echo "5. Push your code to trigger the workflows"

echo ""
echo "📚 Documentation:"
echo "----------------------------"
echo "- Full setup guide: .github/CICD_SETUP.md"
echo "- GitHub Actions: https://docs.github.com/en/actions"
echo "- Vercel deployment: https://vercel.com/docs"

echo ""
read -p "Would you like to verify your environment? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🔍 Verifying environment..."
    
    # Check Node.js version
    NODE_VERSION=$(node -v)
    echo "✅ Node.js version: $NODE_VERSION"
    
    # Check npm version
    NPM_VERSION=$(npm -v)
    echo "✅ npm version: $NPM_VERSION"
    
    # Check if Prisma is installed
    if npx prisma --version > /dev/null 2>&1; then
        echo "✅ Prisma CLI available"
    else
        echo "⚠️  Prisma CLI not found in dependencies"
    fi
    
    # Check if .env file exists
    if [ -f ".env" ]; then
        echo "✅ .env file exists"
    else
        echo "⚠️  .env file not found. You may need to create one."
    fi
    
    # Check if node_modules exists
    if [ -d "node_modules" ]; then
        echo "✅ Dependencies installed"
    else
        echo "⚠️  Dependencies not installed. Run: npm install"
    fi
fi

echo ""
echo "✨ Setup script complete!"
echo "Please follow the next steps above to complete your CI/CD setup."
echo ""
