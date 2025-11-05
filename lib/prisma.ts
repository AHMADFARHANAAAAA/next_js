import { PrismaClient } from '@prisma/client'

/**
 * PrismaClient is attached to the `global` object in development to prevent
 * exhausting your database connection limit.
 * 
 * Learn more:
 * https://pris.ly/d/help/next-js-best-practices
 */

const globalForPrisma = global as unknown as {
  prisma: PrismaClient
  prismaPromise?: Promise<void>
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Create a connection promise that we can await
if (!globalForPrisma.prismaPromise) {
  globalForPrisma.prismaPromise = prisma.$connect()
    .then(() => {
      console.log('✅ Database connected successfully')
    })
    .catch((err) => {
      console.error('❌ Failed to connect to database:', err)
      throw err
    })
}

// Export a function to ensure connection before queries
export async function ensurePrismaConnection() {
  if (globalForPrisma.prismaPromise) {
    await globalForPrisma.prismaPromise
  }
  return prisma
}

export default prisma
