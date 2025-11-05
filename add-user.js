// Script untuk menambahkan user baru
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function addUser() {
  try {
    const email = 'nahdya@gmail.com'
    const password = 'Vanhantu2'
    const name = 'Nahdya'
    const role = 'SUPERADMIN' // Default role, bisa diubah jadi SUPERADMIN jika perlu
    
    console.log(`🔧 Creating user account for: ${email}`)
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })
    
    if (existingUser) {
      console.log('❌ User already exists!')
      console.log(`   Email: ${existingUser.email}`)
      console.log(`   Name: ${existingUser.name}`)
      console.log(`   Role: ${existingUser.role}`)
      console.log(`   Created: ${existingUser.created_at.toLocaleDateString()}`)
      return
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)
    
    // Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        emailVerified: new Date() // Mark as verified
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        created_at: true
      }
    })

    console.log('✅ User account created successfully!')
    console.log('=====================================')
    console.log(`Email: ${newUser.email}`)
    console.log(`Name: ${newUser.name}`)
    console.log(`Role: ${newUser.role}`)
    console.log(`Created: ${newUser.created_at.toLocaleDateString()}`)
    console.log('\n🚀 User can now login with these credentials!')
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)
    
  } catch (error) {
    console.error('❌ Error creating user:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

addUser()