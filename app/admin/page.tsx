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
        
      

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* CRM Dashboard */}
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">CRM Dashboard</h3>
            <p className="text-sm text-gray-600 mb-4">Overview semua data CRM</p>
            <button 
              onClick={() => router.push('/admin/crm')}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition w-full"
            >
              Buka CRM
            </button>
          </div>

          {/* Data Leads */}
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Leads</h3>
            <p className="text-sm text-gray-600 mb-4">Kelola prospek dan calon siswa</p>
            <button 
              onClick={() => router.push('/admin/crm/leads')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition w-full"
            >
              Kelola Leads
            </button>
          </div>

          {/* Kampanye */}
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Kampanye</h3>
            <p className="text-sm text-gray-600 mb-4">Kelola kampanye marketing</p>
            <button 
              onClick={() => router.push('/admin/crm/campaigns')}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition w-full"
            >
              Kelola Kampanye
            </button>
          </div>

          {/* Konten */}
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Konten</h3>
            <p className="text-sm text-gray-600 mb-4">Kelola konten sekolah</p>
            <button 
              onClick={() => router.push('/admin/crm/contents')}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition w-full"
            >
              Kelola Konten
            </button>
          </div>
        </div>

        {/* CRM Quick Stats */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">CRM Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => router.push('/admin/crm/import')}
              className="p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 transition-colors text-left"
            >
              <h3 className="font-semibold text-blue-900">Import CSV Leads</h3>
              <p className="text-sm text-blue-600">Upload data leads dari CSV</p>
            </button>
            <button 
              onClick={() => router.push('/admin/crm/campaigns')}
              className="p-4 border-2 border-green-200 rounded-lg hover:border-green-400 transition-colors text-left"
            >
              <h3 className="font-semibold text-green-900">Buat Kampanye Baru</h3>
              <p className="text-sm text-green-600">Mulai kampanye marketing</p>
            </button>
            <button 
              onClick={() => router.push('/admin/crm/contents')}
              className="p-4 border-2 border-purple-200 rounded-lg hover:border-purple-400 transition-colors text-left"
            >
              <h3 className="font-semibold text-purple-900">Publish Konten</h3>
              <p className="text-sm text-purple-600">Buat konten untuk media sosial</p>
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Fitur CRM Admin</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Kelola Data Leads</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Import data dari CSV</li>
                <li>• Track customer journey dan status</li>
                <li>• Monitor conversion rate</li>
                <li>• Follow-up leads berdasarkan source</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Kelola Kampanye</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Buat kampanye digital dan print</li>
                <li>• Monitor budget dan ROI</li>
                <li>• Target audience segmentation</li>
                <li>• Schedule dan manage campaigns</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Kelola Konten</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Publish artikel untuk website</li>
                <li>• Konten untuk social media</li>
                <li>• Newsletter dan email marketing</li>
                <li>• Video dan image content</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
