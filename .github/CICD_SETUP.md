# GitHub Actions CI/CD Setup Guide

## Overview
This project uses GitHub Actions for automated CI/CD pipeline with the following workflows:

### Workflows

1. **CI - Build and Test** (`ci.yml`)
   - Triggers: Push/PR to `main` or `develop` branches
   - Jobs:
     - Lint & Type Check
     - Build on Node 18.x and 20.x
     - Security Audit

2. **CD - Deploy to Production** (`deploy.yml`)
   - Triggers: Push to `main` branch
   - Jobs:
     - Database migrations
     - Deploy to Vercel production

3. **Preview Deployment** (`preview.yml`)
   - Triggers: Pull requests to `main`
   - Jobs:
     - Build preview
     - Deploy to Vercel preview
     - Comment preview URL on PR

4. **Database Migration Check** (`prisma-check.yml`)
   - Triggers: PR with changes to `prisma/**`
   - Jobs:
     - Validate Prisma schema
     - Check migration status

5. **Code Quality** (`code-quality.yml`)
   - Triggers: Push/PR, Weekly on Sunday
   - Jobs:
     - ESLint report
     - TODO/FIXME checks
     - Large file detection
     - Dependency analysis

## Setup Instructions

### 1. GitHub Repository Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add the following secrets:

```bash
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_URL_PREVIEW=https://preview-yourdomain.vercel.app
DATABASE_URL=postgresql://user:password@host:5432/database
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-vercel-org-id
VERCEL_PROJECT_ID=your-vercel-project-id
```

### 2. Get Vercel Credentials

#### Install Vercel CLI:
```bash
npm install -g vercel
```

#### Login and Link Project:
```bash
vercel login
vercel link
```

#### Get Project Information:
```bash
# Get ORG_ID and PROJECT_ID
cat .vercel/project.json
```

Output will look like:
```json
{
  "orgId": "team_xxxxxxxxxxxxx",
  "projectId": "prj_xxxxxxxxxxxxx"
}
```

#### Get Vercel Token:
1. Go to [Vercel Dashboard](https://vercel.com/account/tokens)
2. Create new token
3. Copy token and add to GitHub Secrets as `VERCEL_TOKEN`

### 3. Environment Setup

Create environments in GitHub:
- Go to **Settings** → **Environments**
- Create `production` environment
- Create `preview` environment
- Add environment-specific secrets if needed

### 4. Branch Protection Rules

Setup branch protection for `main`:
1. Go to **Settings** → **Branches** → **Add branch protection rule**
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
     - Select: `Lint & Type Check`, `Build Application`
   - ✅ Require conversation resolution before merging
   - ✅ Do not allow bypassing the above settings

### 5. Generate NEXTAUTH_SECRET

```bash
# Using openssl
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 6. Database Setup

Ensure your production database is ready:
```bash
# Run migrations locally first
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

## Usage

### Automatic Triggers

- **Push to `main`**: Runs CI + deploys to production
- **Push to `develop`**: Runs CI only
- **Create PR**: Runs CI + creates preview deployment
- **Modify Prisma schema**: Runs migration checks

### Manual Triggers

Deploy manually via GitHub UI:
1. Go to **Actions** tab
2. Select **CD - Deploy to Production**
3. Click **Run workflow**
4. Select branch and run

## Monitoring

### View Workflow Status

- **Actions Tab**: See all workflow runs
- **PR Checks**: Status checks on pull requests
- **Badge**: Add to README.md

```markdown
![CI](https://github.com/AHMADFARHANAAAAA/next_js/workflows/CI%20-%20Build%20and%20Test/badge.svg)
![CD](https://github.com/AHMADFARHANAAAAA/next_js/workflows/CD%20-%20Deploy%20to%20Production/badge.svg)
```

### Notifications

Workflows will:
- ✅ Show status on PR
- 💬 Comment preview URLs
- ❌ Show errors in Actions tab

## Troubleshooting

### Common Issues

1. **Build fails with "Prisma Client not found"**
   - Ensure `npx prisma generate` runs before build

2. **Environment variables not working**
   - Check if secrets are added correctly
   - Verify secret names match in workflow files

3. **Vercel deployment fails**
   - Verify `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
   - Check if Vercel project is properly linked

4. **Database migration fails**
   - Ensure `DATABASE_URL` is correct
   - Check if database is accessible from GitHub Actions

### Debug Tips

Add debug step to workflow:
```yaml
- name: Debug Environment
  run: |
    echo "Node version: $(node -v)"
    echo "NPM version: $(npm -v)"
    echo "Working directory: $(pwd)"
    ls -la
```

## Best Practices

1. **Always test locally before pushing**
   ```bash
   npm run lint
   npm run build
   npx prisma generate
   ```

2. **Use feature branches**
   - Create branch: `git checkout -b feature/new-feature`
   - Push: `git push origin feature/new-feature`
   - Create PR to `main`

3. **Write meaningful commit messages**
   ```bash
   git commit -m "feat: add new dashboard feature"
   git commit -m "fix: resolve SMA data mapping issue"
   git commit -m "chore: update dependencies"
   ```

4. **Review PR checks before merging**
   - All checks must pass
   - Preview deployment works
   - Code reviewed

## Cost Optimization

- **Vercel**: Free tier includes preview deployments
- **GitHub Actions**: 2000 minutes/month free for public repos
- **Caching**: Workflows use npm cache to speed up builds

## Security

- Never commit secrets to repository
- Use GitHub Secrets for sensitive data
- Rotate tokens periodically
- Review workflow permissions

## Next Steps

1. ✅ Setup GitHub Secrets
2. ✅ Configure Vercel
3. ✅ Create environments
4. ✅ Enable branch protection
5. ✅ Push code and test workflows
6. ✅ Monitor first deployment

## Support

For issues:
- Check [GitHub Actions docs](https://docs.github.com/en/actions)
- Check [Vercel docs](https://vercel.com/docs)
- Review workflow logs in Actions tab
