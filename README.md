# CRM Education Management System

![CI](https://github.com/AHMADFARHANAAAAA/next_js/workflows/CI%20-%20Build%20and%20Test/badge.svg)
![CD](https://github.com/AHMADFARHANAAAAA/next_js/workflows/CD%20-%20Deploy%20to%20Production/badge.svg)
![Code Quality](https://github.com/AHMADFARHANAAAAA/next_js/workflows/Code%20Quality/badge.svg)

A comprehensive CRM system built with Next.js 15, Prisma, and PostgreSQL for managing educational institution's lead generation, campaigns, and student enrollment.

## Features

- 📊 **Dashboard Analytics** - Real-time PSB (student enrollment) metrics
- 🎯 **Lead Management** - Track leads through awareness, consideration, and action stages
- 📈 **Campaign Tracking** - Manage marketing campaigns with reach and budget monitoring
- 📝 **Content Management** - Organize social media content across platforms
- 🔐 **Role-based Access** - Admin and Superadmin user roles
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🤖 **AI Predictions** - Linear regression for enrollment projections

## Tech Stack

- **Framework**: Next.js 15.5.4 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Deployment**: Vercel
- **CI/CD**: GitHub Actions

## Getting Started

### Prerequisites

- Node.js 18.x or 20.x
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/AHMADFARHANAAAAA/next_js.git
cd next_js
```

2. Install dependencies:
```bash
npm install
```

3. Setup environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

4. Setup database:
```bash
npx prisma generate
npx prisma migrate deploy
```

5. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
next_js/
├── app/                    # Next.js app directory
│   ├── admin/             # Admin dashboard pages
│   │   └── crm/          # CRM modules (leads, campaigns, contents)
│   ├── api/              # API routes
│   └── components/       # Shared React components
├── lib/                   # Utility functions and configurations
├── models/               # Data models
├── prisma/               # Database schema and migrations
├── public/               # Static files
├── types/                # TypeScript type definitions
└── .github/              # GitHub Actions workflows
    └── workflows/        # CI/CD pipelines
```

## CI/CD Pipeline

This project uses GitHub Actions for automated testing and deployment:

### Workflows

- **CI - Build and Test**: Runs on every push/PR
  - ESLint and TypeScript checks
  - Build verification on Node 18.x and 20.x
  - Security audit

- **CD - Deploy to Production**: Runs on push to `main`
  - Database migrations
  - Production deployment to Vercel

- **Preview Deployment**: Runs on PRs
  - Creates preview environment
  - Comments preview URL on PR

- **Database Migration Check**: Validates Prisma schema changes
- **Code Quality**: Weekly code quality reports

### Setup CI/CD

See [CI/CD Setup Guide](.github/CICD_SETUP.md) for detailed instructions.

## Database Schema

Main tables:
- `User` - System users (Admin/Superadmin)
- `School` - Educational institutions
- `Lead` - Prospective students
- `Campaign` - Marketing campaigns
- `Content` - Social media content

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npx prisma studio    # Open Prisma Studio
npx prisma migrate   # Run database migrations
```

## Environment Variables

Required environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Secret key for NextAuth
- `NEXTAUTH_URL` - Application URL

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
