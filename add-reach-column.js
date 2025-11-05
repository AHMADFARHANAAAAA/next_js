const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function addReachColumn() {
  try {
    // Try to add the reach column using raw SQL
    await prisma.$executeRaw`ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS reach INTEGER;`
    console.log('Successfully added reach column to Campaign table')
  } catch (error) {
    console.log('Column might already exist or there was an error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

addReachColumn()