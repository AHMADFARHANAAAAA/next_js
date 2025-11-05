import bcrypt from 'bcryptjs'
import type { User as PrismaUser } from '@prisma/client'
import { ensurePrismaConnection } from '@/lib/prisma'

const EMAIL_REGEX = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/

export type IUser = PrismaUser

export interface CreateUserData {
  name: string
  email: string
  password: string
}

export type UserResponse = Pick<PrismaUser, 'id' | 'name' | 'email' | 'created_at' | 'updated_at'>

class User {
  private static normalizeName(name: string) {
    return name.trim()
  }

  private static normalizeEmail(email: string) {
    return email.toLowerCase().trim()
  }

  // Create a new user
  static async create(userData: CreateUserData): Promise<UserResponse> {
    const { name, email, password } = userData

    if (!name || this.normalizeName(name).length < 2 || this.normalizeName(name).length > 50) {
      throw new Error('Name must be between 2 and 50 characters')
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      throw new Error('Please enter a valid email')
    }

    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters')
    }

    const prisma = await ensurePrismaConnection()

    const user = await prisma.user.create({
      data: {
        name: this.normalizeName(name),
        email: this.normalizeEmail(email),
        password
      },
      select: {
        id: true,
        name: true,
        email: true,
        created_at: true,
        updated_at: true
      }
    })

    return user
  }

  // Find user by email
  static async findByEmail(email: string): Promise<IUser | null> {
    if (!email) {
      return null
    }

    const prisma = await ensurePrismaConnection()

    return prisma.user.findUnique({
      where: { email: this.normalizeEmail(email) }
    })
  }

  // Find user by ID
  static async findById(id: string): Promise<UserResponse | null> {
    const prisma = await ensurePrismaConnection()

    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        created_at: true,
        updated_at: true
      }
    })
  }

  // Get all users (for admin)
  static async findAll(): Promise<UserResponse[]> {
    const prisma = await ensurePrismaConnection()

    return prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        created_at: true,
        updated_at: true
      },
      orderBy: { created_at: 'desc' }
    })
  }

  // Check if email exists
  static async emailExists(email: string): Promise<boolean> {
    if (!email) {
      return false
    }

    const prisma = await ensurePrismaConnection()

    const count = await prisma.user.count({
      where: { email: this.normalizeEmail(email) }
    })

    return count > 0
  }

  // Verify password
  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword)
  }

  // Hash password
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12
    return bcrypt.hash(password, saltRounds)
  }

  // Placeholder for legacy setup flow
  static async createTable(): Promise<void> {
    console.warn('createTable is managed by Prisma migrations. No action taken.')
  }
}

export default User
