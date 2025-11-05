// Script untuk membuat SUPERADMIN account
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createSuperAdmin() {
  try {
    // Email yang akan dijadikan SUPERADMIN
    const superAdminEmail = '' // Bisa diganti sesuai keinginan
    
    console.log(`🔧 Creating SUPERADMIN account for: ${superAdminEmail}`)
    
    // Update user role to SUPERADMIN
    const updatedUser = await prisma.user.update({
      where: { 
        email: superAdminEmail 
      },
      data: { 
        role: 'SUPERADMIN' 
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        created_at: true
      }
    })

    console.log('✅ SUPERADMIN account created successfully!')
    console.log('=====================================')
    console.log(`Email: ${updatedUser.email}`)
    console.log(`Name: ${updatedUser.name}`)
    console.log(`Role: ${updatedUser.role}`)
    console.log(`Created: ${updatedUser.created_at.toLocaleDateString()}`)
    console.log('\n🚀 You can now login with this account to access Super Admin features!')
    
  } catch (error) {
    if (error.code === 'P2025') {
      console.error('❌ User not found! Please check the email address.')
    } else {
      console.error('❌ Error creating SUPERADMIN:', error.message)
    }
  } finally {
    await prisma.$disconnect()
  }
}

createSuperAdmin()