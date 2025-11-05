import { PrismaClient } from '@prisma/client';

// Database Source (Local)
const prismaLocal = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:123@localhost:5432/edu?schema=public"
    }
  }
});

// Database Target (Vercel Production)
const prismaProduction = new PrismaClient({
  datasources: {
    db: {
      url: "postgres://4de0fbbd5b4928fac22bc3b91355caa6dc17a837584883583187ed3f02e81aa6:sk_XdcobKOrMtOHAkzKSoyHN@db.prisma.io:5432/postgres?sslmode=require"
    }
  }
});

async function migrateData() {
  try {
    console.log('🚀 Starting data migration from Local to Vercel...\n');

    // 1. Migrate Schools
    console.log('📚 Migrating Schools...');
    const schools = await prismaLocal.school.findMany();
    for (const school of schools) {
      await prismaProduction.school.upsert({
        where: { id: school.id },
        update: school,
        create: school,
      });
    }
    console.log(`✅ Migrated ${schools.length} schools\n`);

    // 2. Migrate Users
    console.log('👤 Migrating Users...');
    const users = await prismaLocal.user.findMany();
    for (const user of users) {
      await prismaProduction.user.upsert({
        where: { id: user.id },
        update: user,
        create: user,
      });
    }
    console.log(`✅ Migrated ${users.length} users\n`);

    // 3. Migrate Leads
    console.log('📋 Migrating Leads...');
    const leads = await prismaLocal.lead.findMany();
    for (const lead of leads) {
      await prismaProduction.lead.upsert({
        where: { id: lead.id },
        update: lead,
        create: lead,
      });
    }
    console.log(`✅ Migrated ${leads.length} leads\n`);

    // 4. Migrate Campaigns
    console.log('📢 Migrating Campaigns...');
    const campaigns = await prismaLocal.campaign.findMany();
    for (const campaign of campaigns) {
      await prismaProduction.campaign.upsert({
        where: { id: campaign.id },
        update: campaign,
        create: campaign,
      });
    }
    console.log(`✅ Migrated ${campaigns.length} campaigns\n`);

    // 5. Migrate Contents
    console.log('📝 Migrating Contents...');
    const contents = await prismaLocal.content.findMany();
    for (const content of contents) {
      await prismaProduction.content.upsert({
        where: { id: content.id },
        update: content,
        create: content,
      });
    }
    console.log(`✅ Migrated ${contents.length} contents\n`);

    // 6. Migrate Accounts (NextAuth)
    console.log('🔐 Migrating Accounts...');
    const accounts = await prismaLocal.account.findMany();
    for (const account of accounts) {
      await prismaProduction.account.upsert({
        where: { 
          provider_providerAccountId: {
            provider: account.provider,
            providerAccountId: account.providerAccountId
          }
        },
        update: account,
        create: account,
      });
    }
    console.log(`✅ Migrated ${accounts.length} accounts\n`);

    // 7. Migrate Sessions (NextAuth)
    console.log('🎫 Migrating Sessions...');
    const sessions = await prismaLocal.session.findMany();
    for (const session of sessions) {
      await prismaProduction.session.upsert({
        where: { sessionToken: session.sessionToken },
        update: session,
        create: session,
      });
    }
    console.log(`✅ Migrated ${sessions.length} sessions\n`);

    console.log('🎉 Data migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await prismaLocal.$disconnect();
    await prismaProduction.$disconnect();
  }
}

migrateData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
