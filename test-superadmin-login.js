// Test script untuk verifikasi Google OAuth SUPERADMIN redirect
// Jalankan di browser console setelah login dengan Google

async function testSuperAdminLogin() {
  try {
    console.log('🔍 Testing SUPERADMIN login flow...\n')
    
    // 1. Check current session
    const sessionResponse = await fetch('/api/auth/session')
    const session = await sessionResponse.json()
    
    console.log('📊 Current Session:')
    console.log('User:', session?.user?.name)
    console.log('Email:', session?.user?.email) 
    console.log('Role:', session?.user?.role)
    console.log('School ID:', session?.user?.schoolId)
    
    // 2. Verify expected behavior
    if (session?.user?.role === 'SUPERADMIN') {
      console.log('\n✅ SUCCESS: User has SUPERADMIN role!')
      console.log('Expected redirect: /superadmin')
      
      // Test redirect
      if (window.location.pathname === '/superadmin') {
        console.log('✅ Currently on SUPERADMIN dashboard - PERFECT!')
      } else {
        console.log('⚠️  Not on superadmin page. Current:', window.location.pathname)
        console.log('Attempting manual redirect...')
        window.location.href = '/superadmin'
      }
    } else {
      console.log('\n❌ ISSUE: User role is not SUPERADMIN')
      console.log('Current role:', session?.user?.role)
      console.log('Expected: SUPERADMIN')
      
      // Check if user exists in database with correct role
      console.log('\n🔧 Run this to fix role:')
      console.log(`fetch('/api/users/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: '${session?.user?.email}',
          role: 'SUPERADMIN'
        })
      }).then(r => r.json()).then(console.log)`)
    }
    
  } catch (error) {
    console.error('❌ Error testing login:', error)
  }
}

console.log('🚀 Run testSuperAdminLogin() to verify Google OAuth SUPERADMIN login')
console.log('Make sure you are logged in with nahdya@gmail.com first!')