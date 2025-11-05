'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface DashboardStats {
  schools: number
  users: number
  leads: number
  campaigns: number
  contents: number
}

export default function SuperAdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    schools: 0,
    users: 0,
    leads: 0,
    campaigns: 0,
    contents: 0
  })
  const [loading, setLoading] = useState(true)

  const handleLogout = async () => {
    await signOut({ 
      callbackUrl: '/',
      redirect: true 
    })
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch statistics
      const [schoolsRes, usersRes, leadsRes, campaignsRes, contentsRes] = await Promise.all([
        fetch('/api/schools'),
        fetch('/api/users'),
        fetch('/api/crm/leads?limit=1000'),
        fetch('/api/crm/campaigns?limit=1000'),
        fetch('/api/crm/contents?limit=1000')
      ])

      const [schoolsData, usersData, leadsData, campaignsData, contentsData] = await Promise.all([
        schoolsRes.json(),
        usersRes.json(),
        leadsRes.json(),
        campaignsRes.json(),
        contentsRes.json()
      ])

      setStats({
        schools: schoolsData.schools?.length || 0,
        users: usersData.users?.length || 0,
        leads: leadsData.leads?.length || 0,
        campaigns: campaignsData.campaigns?.length || 0,
        contents: contentsData.contents?.length || 0
      })

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (!session) {
      router.push('/')
      return
    }

    // Only SUPERADMIN can access this page
    if (!session.user?.role || session.user.role !== 'SUPERADMIN') {
      router.push('/admin') // Redirect to admin page
      return
    }

    // Fetch dashboard data
    fetchDashboardData()
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!session || session.user?.role !== 'SUPERADMIN') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="backdrop-blur-sm bg-white/90 border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
                  Super Admin
                </h1>
              </div>
              <p className="text-sm text-slate-600 font-medium">
                Welcome back, {session.user.name}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchDashboardData}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 disabled:opacity-50 shadow-sm"
              >
                <svg className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {loading ? 'Loading...' : 'Refresh'}
              </button>
              
              <div className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full text-xs font-semibold tracking-wide shadow-lg">
                SUPERADMIN
              </div>
              
              <button
                onClick={() => router.push('/')}
                className="inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-lg"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-6 lg:px-8">
        
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-light text-slate-800 tracking-tight">Dashboard Overview</h2>
          <p className="mt-2 text-slate-600">Monitor and manage your entire system from here</p>
        </div>
        
        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
          {/* Schools Card */}
          <div className="group bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 hover:bg-white hover:shadow-xl hover:shadow-orange-100/50 hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-orange-200">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0h2M7 7h10M7 11h6m2 4h.01" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Schools</p>
              <div className="text-2xl font-semibold text-slate-900">
                {loading ? (
                  <div className="animate-pulse bg-slate-200 h-8 w-16 rounded"></div>
                ) : (
                  stats.schools.toLocaleString()
                )}
              </div>
            </div>
          </div>

          {/* Users Card */}
          <div className="group bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 hover:bg-white hover:shadow-xl hover:shadow-blue-100/50 hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-blue-200">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Users</p>
              <div className="text-2xl font-semibold text-slate-900">
                {loading ? (
                  <div className="animate-pulse bg-slate-200 h-8 w-16 rounded"></div>
                ) : (
                  stats.users.toLocaleString()
                )}
              </div>
            </div>
          </div>

          {/* Leads Card */}
          <div className="group bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 hover:bg-white hover:shadow-xl hover:shadow-green-100/50 hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-green-200">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Leads</p>
              <div className="text-2xl font-semibold text-slate-900">
                {loading ? (
                  <div className="animate-pulse bg-slate-200 h-8 w-16 rounded"></div>
                ) : (
                  stats.leads.toLocaleString()
                )}
              </div>
            </div>
          </div>

          {/* Campaigns Card */}
          <div className="group bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 hover:bg-white hover:shadow-xl hover:shadow-purple-100/50 hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-purple-200">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Campaigns</p>
              <div className="text-2xl font-semibold text-slate-900">
                {loading ? (
                  <div className="animate-pulse bg-slate-200 h-8 w-16 rounded"></div>
                ) : (
                  stats.campaigns.toLocaleString()
                )}
              </div>
            </div>
          </div>

          {/* Contents Card */}
          <div className="group bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 hover:bg-white hover:shadow-xl hover:shadow-indigo-100/50 hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-indigo-200">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Contents</p>
              <div className="text-2xl font-semibold text-slate-900">
                {loading ? (
                  <div className="animate-pulse bg-slate-200 h-8 w-16 rounded"></div>
                ) : (
                  stats.contents.toLocaleString()
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-xl font-medium text-slate-800 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Manage Schools */}
            <button 
              onClick={() => router.push('/superadmin/manage-schools')}
              className="group bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 hover:bg-white hover:shadow-xl hover:shadow-orange-100/50 hover:-translate-y-1 transition-all duration-300 text-left"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-4 group-hover:shadow-lg group-hover:shadow-orange-200 transition-shadow">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0h2M7 7h10M7 11h6m2 4h.01" />
                </svg>
              </div>
              <h4 className="font-semibold text-slate-900 mb-2">Manage Schools</h4>
              <p className="text-sm text-slate-600">Edit, delete, and view school details</p>
            </button>

            {/* Create Admin */}
            <button 
              onClick={() => router.push('/superadmin/register')}
              className="group bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 hover:bg-white hover:shadow-xl hover:shadow-blue-100/50 hover:-translate-y-1 transition-all duration-300 text-left"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:shadow-lg group-hover:shadow-blue-200 transition-shadow">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h4 className="font-semibold text-slate-900 mb-2">Create Admin</h4>
              <p className="text-sm text-slate-600">Add new admin users</p>
            </button>

            {/* Manage Users */}
            <button 
              onClick={() => router.push('/superadmin/users')}
              className="group bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 hover:bg-white hover:shadow-xl hover:shadow-indigo-100/50 hover:-translate-y-1 transition-all duration-300 text-left"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:shadow-lg group-hover:shadow-indigo-200 transition-shadow">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h4 className="font-semibold text-slate-900 mb-2">Manage Users</h4>
              <p className="text-sm text-slate-600">Edit user profiles and permissions</p>
            </button>

            {/* Import Data */}
            <button 
              onClick={() => router.push('/superadmin/import')}
              className="group bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 hover:bg-white hover:shadow-xl hover:shadow-green-100/50 hover:-translate-y-1 transition-all duration-300 text-left"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-4 group-hover:shadow-lg group-hover:shadow-green-200 transition-shadow">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <h4 className="font-semibold text-slate-900 mb-2">Import Data</h4>
              <p className="text-sm text-slate-600">Bulk import users, schools, and leads</p>
            </button>

          </div>
        </div>

        {/* System Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* System Health */}
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">System Health</h3>
                <p className="text-slate-600 mt-1">Real-time system statistics</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Active Users</span>
                  <span className="text-slate-900 font-semibold">{loading ? '...' : stats.users}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Total Schools</span>
                  <span className="text-slate-900 font-semibold">{loading ? '...' : stats.schools}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Total Leads</span>
                  <span className="text-slate-900 font-semibold">{loading ? '...' : stats.leads}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Campaigns</span>
                  <span className="text-slate-900 font-semibold">{loading ? '...' : stats.campaigns}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">System Status</h3>
                <p className="text-slate-600 text-sm mt-1">All systems operational</p>
              </div>
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-emerald-50 rounded-xl">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-sm text-emerald-700 font-medium">Database Connected</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-xl">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-blue-700 font-medium">Authentication Active</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-xl">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-purple-700 font-medium">CRM System Online</span>
              </div>
            </div>
          </div>
          
        </div>
        
      </main>
    </div>
  )
}