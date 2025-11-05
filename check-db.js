import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('=== DATABASE CHECK ===');
    
    // Count total users
    const totalUsers = await prisma.user.count();
    console.log(`Total users: ${totalUsers}`);
    
    // Get all users with their accounts
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        created_at: true,
        accounts: {
          select: {
            provider: true,
            providerAccountId: true,
            type: true
          }
        }
      }
    });
    
    console.log('\nAll users:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email || 'No email'})`);
      console.log(`   Image: ${user.image ? 'Yes' : 'No'}`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Accounts: ${user.accounts.map(acc => `${acc.provider} (${acc.providerAccountId})`).join(', ') || 'None'}`);
      console.log('');
    });
    
    // Count accounts by provider
    const totalAccounts = await prisma.account.count();
    console.log(`Total accounts: ${totalAccounts}`);
    
    const facebookAccounts = await prisma.account.count({
      where: { provider: 'facebook' }
    });
    
    const googleAccounts = await prisma.account.count({
      where: { provider: 'google' }
    });
    
    console.log(`Facebook accounts: ${facebookAccounts}`);
    console.log(`Google accounts: ${googleAccounts}`);
    
    // Count sessions
    const totalSessions = await prisma.session.count();
    console.log(`Total sessions: ${totalSessions}`);
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();