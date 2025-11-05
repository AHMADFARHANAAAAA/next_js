// Script untuk cek users dan roles di database
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...\n')
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        schoolId: true,
        created_at: true
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    if (users.length === 0) {
      console.log('❌ No users found in database')
      return
    }

    console.log(`📊 Found ${users.length} users:`)
    console.log('================================')
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`)
      console.log(`   Name: ${user.name || 'No name'}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   School ID: ${user.schoolId || 'None'}`)
      console.log(`   Created: ${user.created_at.toLocaleDateString()}`)
      console.log('---')
    })

    // Count by roles
    const roleCounts = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {})

    console.log('\n📈 Role Statistics:')
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`   ${role}: ${count} users`)
    })

    // Check for SUPERADMIN
    const superAdmins = users.filter(user => user.role === 'SUPERADMIN')
    if (superAdmins.length > 0) {
      console.log('\n✅ SUPERADMIN accounts found:')
      superAdmins.forEach(admin => {
        console.log(`   - ${admin.email} (${admin.name})`)
      })
    } else {
      console.log('\n⚠️  NO SUPERADMIN accounts found!')
      console.log('   You can create one using the role assignment API.')
    }

  } catch (error) {
    console.error('❌ Error checking users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()