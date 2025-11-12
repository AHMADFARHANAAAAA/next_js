'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { signOut } from 'next-auth/react'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/')
      return
    }

    if (session.user.role !== 'ADMIN') {
      router.push('/admin')
      return
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-3"></div>
          <div className="text-lg font-medium text-gray-700">Loading...</div>
        </div>
      </div>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">School Management System</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {session.user.name}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Welcome back, {session.user.name}! 👋</h2>
              <p className="text-indigo-100">Here&apos;s what&apos;s happening with your school today.</p>
            </div>
            <div className="hidden md:block">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <svg className="h-16 w-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* CRM Dashboard */}
          <div className="group bg-white p-6 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-transparent hover:border-indigo-500">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-indigo-100 group-hover:bg-indigo-500 p-3 rounded-lg transition-colors duration-300">
                <svg className="h-8 w-8 text-indigo-600 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">CRM Dashboard</h3>
            <p className="text-sm text-gray-600 mb-4">Overview of all CRM data and analytics</p>
            <button 
              onClick={() => router.push('/admin/crm')}
              className="w-full bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium"
            >
              Open Dashboard
            </button>
          </div>

          {/* Data Leads */}
          <div className="group bg-white p-6 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-transparent hover:border-blue-500">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 group-hover:bg-blue-500 p-3 rounded-lg transition-colors duration-300">
                <svg className="h-8 w-8 text-blue-600 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Leads Data</h3>
            <p className="text-sm text-gray-600 mb-4">Manage prospects and potential students</p>
            <button 
              onClick={() => router.push('/admin/crm/leads')}
              className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
            >
              Manage Leads
            </button>
          </div>

          {/* Campaigns */}
          <div className="group bg-white p-6 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-transparent hover:border-green-500">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 group-hover:bg-green-500 p-3 rounded-lg transition-colors duration-300">
                <svg className="h-8 w-8 text-green-600 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Campaigns</h3>
            <p className="text-sm text-gray-600 mb-4">Manage marketing campaigns</p>
            <button 
              onClick={() => router.push('/admin/crm/campaigns')}
              className="w-full bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium"
            >
              Manage Campaigns
            </button>
          </div>

          {/* Content */}
          <div className="group bg-white p-6 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-transparent hover:border-purple-500">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 group-hover:bg-purple-500 p-3 rounded-lg transition-colors duration-300">
                <svg className="h-8 w-8 text-purple-600 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Content</h3>
            <p className="text-sm text-gray-600 mb-4">Manage school content</p>
            <button 
              onClick={() => router.push('/admin/crm/contents')}
              className="w-full bg-purple-600 text-white px-4 py-2.5 rounded-lg hover:bg-purple-700 transition-colors duration-200 font-medium"
            >
              Manage Content
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <svg className="h-6 w-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => router.push('/admin/crm/import')}
              className="group p-5 border-2 border-blue-100 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 text-left"
            >
              <div className="flex items-center mb-3">
                <div className="bg-blue-500 p-2 rounded-lg">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="ml-3 font-bold text-blue-900 text-lg">Import CSV</h3>
              </div>
              <p className="text-sm text-gray-600">Upload leads data from CSV files</p>
            </button>

            <button 
              onClick={() => router.push('/admin/crm/campaigns')}
              className="group p-5 border-2 border-green-100 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all duration-200 text-left"
            >
              <div className="flex items-center mb-3">
                <div className="bg-green-500 p-2 rounded-lg">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="ml-3 font-bold text-green-900 text-lg">New Campaign</h3>
              </div>
              <p className="text-sm text-gray-600">Start a new marketing campaign</p>
            </button>

            <button 
              onClick={() => router.push('/admin/crm/contents')}
              className="group p-5 border-2 border-purple-100 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all duration-200 text-left"
            >
              <div className="flex items-center mb-3">
                <div className="bg-purple-500 p-2 rounded-lg">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <h3 className="ml-3 font-bold text-purple-900 text-lg">Create Content</h3>
              </div>
              <p className="text-sm text-gray-600">Publish content for social media</p>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
