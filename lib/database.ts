import prisma from './prisma'

/**
 * Ensures Prisma is connected before executing queries
 * This prevents "Engine is not yet connected" errors
 */
export async function ensureConnection() {
  try {
    await prisma.$connect()
  } catch (error) {
    console.error('Database connection error:', error)
    throw new Error('Failed to connect to database')
  }
}

/**
 * Execute a database query with automatic connection handling
 */
export async function withConnection<T>(
  fn: () => Promise<T>
): Promise<T> {
  await ensureConnection()
  return fn()
}

export { prisma }
export default prisma

