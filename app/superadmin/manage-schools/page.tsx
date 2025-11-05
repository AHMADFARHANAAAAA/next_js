'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import ImageUpload from '../../components/ImageUpload'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface School {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
  logo?: string
  created_at: string
  users: User[]
  _count: {
    users: number
    leads: number
    campaigns: number
    contents: number
  }
}

interface DashboardStats {
  totalSchools: number
  totalUsers: number
  totalLeads: number
  totalCampaigns: number
  totalContents: number
  activeSchools: number
  recentSchools: School[]
  topSchoolsByLeads: School[]
  topSchoolsByUsers: School[]
}

export default function SchoolsManagement() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(false)
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSchool, setEditingSchool] = useState<School | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingSchool, setDeletingSchool] = useState<School | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    logo: ''
  })

  const fetchSchools = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/schools')
      const data = await response.json()
      if (data.success) {
        setSchools(data.schools)
        calculateDashboardStats(data.schools)
      } else {
        console.error('Failed to load schools')
      }
    } catch (error) {
      console.error('Error fetching schools:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/')
      return
    }

    if (session.user.role !== 'SUPERADMIN') {
      router.push('/admin')
      return
    }

    fetchSchools()
  }, [session, status, router, fetchSchools])

  const calculateDashboardStats = (schoolsData: School[]) => {
    const totalSchools = schoolsData.length
    const totalUsers = schoolsData.reduce((sum, school) => sum + school._count.users, 0)
    const totalLeads = schoolsData.reduce((sum, school) => sum + school._count.leads, 0)
    const totalCampaigns = schoolsData.reduce((sum, school) => sum + school._count.campaigns, 0)
    const totalContents = schoolsData.reduce((sum, school) => sum + school._count.contents, 0)
    const activeSchools = schoolsData.filter(school => school._count.users > 0).length

    // Recent schools (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentSchools = schoolsData
      .filter(school => new Date(school.created_at) > thirtyDaysAgo)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)

    // Top schools by leads
    const topSchoolsByLeads = [...schoolsData]
      .sort((a, b) => b._count.leads - a._count.leads)
      .slice(0, 5)

    // Top schools by users
    const topSchoolsByUsers = [...schoolsData]
      .sort((a, b) => b._count.users - a._count.users)
      .slice(0, 5)

    setDashboardStats({
      totalSchools,
      totalUsers,
      totalLeads,
      totalCampaigns,
      totalContents,
      activeSchools,
      recentSchools,
      topSchoolsByLeads,
      topSchoolsByUsers
    })
  }

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const response = await fetch('/api/schools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()
      if (response.ok && result.success) {
        alert('School added successfully!')
        setShowAddModal(false)
        setFormData({ name: '', address: '', phone: '', email: '', logo: '' })
        fetchSchools()
      } else {
        alert(result.message || 'Failed to add school')
      }
    } catch (error) {
      console.error('Error adding school:', error)
      alert('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleEditSchool = (school: School) => {
    setEditingSchool(school)
    setFormData({
      name: school.name,
      address: school.address || '',
      phone: school.phone || '',
      email: school.email || '',
      logo: school.logo || ''
    })
    setShowEditModal(true)
  }

  const handleUpdateSchool = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSchool) return

    try {
      setLoading(true)
      const response = await fetch(`/api/schools/${editingSchool.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()
      if (response.ok && result.success) {
        alert('School updated successfully!')
        setShowEditModal(false)
        setEditingSchool(null)
        fetchSchools()
      } else {
        alert(result.error || result.message || 'Failed to update school')
      }
    } catch (error) {
      console.error('Error updating school:', error)
      alert('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSchool = async (schoolId: string) => {
    const school = schools.find(s => s.id === schoolId)
    if (school) {
      setDeletingSchool(school)
      setShowDeleteModal(true)
    }
  }

  const confirmDeleteSchool = async () => {
    if (!deletingSchool) return

    try {
      setLoading(true)
      const response = await fetch(`/api/schools/${deletingSchool.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      if (response.ok && result.success) {
        alert(result.message || 'School deleted successfully!')
        setShowDeleteModal(false)
        setDeletingSchool(null)
        fetchSchools()
      } else {
        alert(result.error || result.message || 'Failed to delete school')
      }
    } catch (error) {
      console.error('Error deleting school:', error)
      alert('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', address: '', phone: '', email: '', logo: '' })
    setEditingSchool(null)
  }

  const handleAccessSchoolDashboard = (schoolId: string) => {
    // Navigate to the school's CRM page with superadmin access
    router.push(`/admin/crm?schoolId=${schoolId}&superadmin=true`)
  }

  if (status === 'loading') {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">School Management</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/superadmin"
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Admin
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="text-red-600 hover:text-red-800"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Dashboard Overview */}
          {dashboardStats && (
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Dashboard Overview</h2>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">🏫</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Schools</dt>
                          <dd className="text-lg font-medium text-gray-900">{dashboardStats.totalSchools}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">👥</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                          <dd className="text-lg font-medium text-gray-900">{dashboardStats.totalUsers}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">🎯</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Leads</dt>
                          <dd className="text-lg font-medium text-gray-900">{dashboardStats.totalLeads}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                {dashboardStats.totalCampaigns > 0 && (
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">📊</span>
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Campaigns</dt>
                            <dd className="text-lg font-medium text-gray-900">{dashboardStats.totalCampaigns}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {dashboardStats.totalContents > 0 && (
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">📝</span>
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Contents</dt>
                            <dd className="text-lg font-medium text-gray-900">{dashboardStats.totalContents}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">✅</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Active Schools</dt>
                          <dd className="text-lg font-medium text-gray-900">{dashboardStats.activeSchools}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dashboard Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                
                {/* Recent Schools - Only show if there are recent schools */}
                {dashboardStats.recentSchools.length > 0 && (
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Schools (30 days)</h3>
                      <div className="space-y-3">
                        {dashboardStats.recentSchools.map((school) => (
                          <div 
                            key={school.id} 
                            className="flex items-center justify-between p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleAccessSchoolDashboard(school.id)}
                            title={`Access ${school.name} CRM`}
                          >
                            <div className="flex items-center">
                              {school.logo && (
                                <div className="flex-shrink-0 mr-3">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={school.logo}
                                    alt={`${school.name} logo`}
                                    className="w-8 h-8 rounded object-cover border border-gray-200"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium text-gray-900 flex items-center">
                                  {school.name}
                                  <svg className="w-3 h-3 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(school.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">{school._count.users} users</p>
                              <p className="text-xs text-gray-500">{school._count.leads} leads</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Top Schools by Leads - Only show if there are schools with leads */}
                {dashboardStats.topSchoolsByLeads.some(school => school._count.leads > 0) && (
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Top Schools by Leads</h3>
                      <div className="space-y-3">
                        {dashboardStats.topSchoolsByLeads
                          .filter(school => school._count.leads > 0)
                          .map((school, index) => (
                            <div 
                              key={school.id} 
                              className="flex items-center justify-between p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => handleAccessSchoolDashboard(school.id)}
                              title={`Access ${school.name} CRM`}
                            >
                              <div className="flex items-center">
                                <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-2">
                                  <span className="text-xs font-bold text-purple-600">#{index + 1}</span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 flex items-center">
                                    {school.name}
                                    <svg className="w-3 h-3 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </p>
                                  <p className="text-xs text-gray-500">{school._count.users} users</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-purple-600">{school._count.leads}</p>
                                <p className="text-xs text-gray-500">leads</p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Top Schools by Users - Only show if there are schools with users */}
                {dashboardStats.topSchoolsByUsers.some(school => school._count.users > 0) && (
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Top Schools by Users</h3>
                      <div className="space-y-3">
                        {dashboardStats.topSchoolsByUsers
                          .filter(school => school._count.users > 0)
                          .map((school, index) => (
                            <div 
                              key={school.id} 
                              className="flex items-center justify-between p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => handleAccessSchoolDashboard(school.id)}
                              title={`Access ${school.name} CRM`}
                            >
                              <div className="flex items-center">
                                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-2">
                                  <span className="text-xs font-bold text-green-600">#{index + 1}</span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 flex items-center">
                                    {school.name}
                                    <svg className="w-3 h-3 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </p>
                                  <p className="text-xs text-gray-500">{school._count.leads} leads</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-green-600">{school._count.users}</p>
                                <p className="text-xs text-gray-500">users</p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Show message if no insights are available */}
                {dashboardStats.recentSchools.length === 0 && 
                 !dashboardStats.topSchoolsByLeads.some(school => school._count.leads > 0) &&
                 !dashboardStats.topSchoolsByUsers.some(school => school._count.users > 0) && (
                  <div className="col-span-3 bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6 text-center">
                      <div className="text-gray-400 mb-2">
                        <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Data</h3>
                      <p className="text-sm text-gray-500">
                        No recent schools, leads, or user activity to display. Start by adding schools and users to see insights here.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                  <h2 className="text-lg font-medium text-gray-900">All Schools</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Manage educational institutions in the system
                  </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                  >
                    Add School
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="mt-6 flex justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="mt-6">
                  {schools.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No schools found. Add your first school!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {schools.map((school) => (
                        <div key={school.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                          <div className="p-6">
                            {/* School Header - Clickable */}
                            <div 
                              className="flex items-start justify-between cursor-pointer hover:bg-gray-50 -m-2 p-2 rounded-lg transition-colors"
                              onClick={() => handleAccessSchoolDashboard(school.id)}
                              title={`Access ${school.name} CRM`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center mb-2">
                                  {school.logo && (
                                    <div className="flex-shrink-0 mr-3">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={school.logo}
                                        alt={`${school.name} logo`}
                                        className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none'
                                        }}
                                      />
                                    </div>
                                  )}
                                  <div>
                                    <h3 className="text-lg font-medium text-gray-900">
                                      {school.name}
                                    </h3>
                                  </div>
                                  <svg className="w-4 h-4 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </div>
                                {school.address && (
                                  <p className="text-sm text-gray-600 mb-1">
                                    📍 {school.address}
                                  </p>
                                )}
                                {school.phone && (
                                  <p className="text-sm text-gray-600 mb-1">
                                    📞 {school.phone}
                                  </p>
                                )}
                                {school.email && (
                                  <p className="text-sm text-gray-600 mb-3">
                                    ✉️ {school.email}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Statistics */}
                            <div className="grid grid-cols-2 gap-4 py-3 border-t border-gray-200">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{school._count.users}</div>
                                <div className="text-xs text-gray-500">Users</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{school._count.leads}</div>
                                <div className="text-xs text-gray-500">Leads</div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="space-y-2 pt-4 border-t border-gray-200">
                              {/* Primary Action - Access CRM (only if school has CRM data) */}
                              {(school._count.leads > 0 || school._count.campaigns > 0 || school._count.contents > 0) ? (
                                <button
                                  onClick={() => handleAccessSchoolDashboard(school.id)}
                                  className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center justify-center transition-colors"
                                >
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0h3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                  </svg>
                                  Access CRM ({school._count.leads} leads)
                                </button>
                              ) : (
                                <div className="w-full px-3 py-2 text-sm text-gray-500 bg-gray-100 rounded-md text-center">
                                  <svg className="w-4 h-4 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                  </svg>
                                  No CRM Data
                                </div>
                              )}
                              
                              {/* Secondary Actions */}
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEditSchool(school)}
                                  className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteSchool(school.id)}
                                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md ${
                                    school._count.users > 0 
                                      ? 'text-orange-600 bg-orange-50 hover:bg-orange-100' 
                                      : 'text-red-600 bg-red-50 hover:bg-red-100'
                                  }`}
                                  title={school._count.users > 0 ? `Warning: This will unassign ${school._count.users} users` : 'Delete school'}
                                >
                                  {school._count.users > 0 ? '⚠️ Delete' : 'Delete'}
                                </button>
                              </div>
                            </div>

                            <div className="pt-2 text-xs text-gray-400">
                              Created: {new Date(school.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add School Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New School</h3>
              <form onSubmit={handleAddSchool} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    School Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School Logo
                  </label>
                  <ImageUpload
                    onImageUploaded={(imageUrl: string) => setFormData({ ...formData, logo: imageUrl })}
                    uploadType="schools"
                    currentImage={formData.logo}
                    buttonText="Upload School Logo"
                    className="mb-2"
                  />
                  <p className="text-xs text-gray-500">
                    Upload a logo for the school. Recommended size: 200x200px or larger, square format.
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      resetForm()
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add School'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit School Modal */}
      {showEditModal && editingSchool && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Edit School: {editingSchool.name}
              </h3>
              <form onSubmit={handleUpdateSchool} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    School Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School Logo
                  </label>
                  <ImageUpload
                    onImageUploaded={(imageUrl: string) => setFormData({ ...formData, logo: imageUrl })}
                    uploadType="schools"
                    currentImage={formData.logo}
                    buttonText="Upload School Logo"
                    className="mb-2"
                  />
                  <p className="text-xs text-gray-500">
                    Upload a logo for the school. Recommended size: 200x200px or larger, square format.
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false)
                      resetForm()
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update School'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingSchool && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    Delete School
                  </h3>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  Are you sure you want to delete <strong>&quot;{deletingSchool.name}&quot;</strong>?
                </p>
                
                {deletingSchool._count.users > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-3">
                    <div className="flex">
                      <svg className="h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-orange-800">
                          Warning: Users will be unassigned
                        </h4>
                        <p className="text-sm text-orange-700 mt-1">
                          This school has <strong>{deletingSchool._count.users} users</strong> associated with it. 
                          These users will be unassigned from this school and can be reassigned later.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {(deletingSchool._count.leads > 0 || deletingSchool._count.campaigns > 0 || deletingSchool._count.contents > 0) && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
                    <div className="flex">
                      <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-red-800">
                          Data will be permanently deleted
                        </h4>
                        <div className="text-sm text-red-700 mt-1">
                          {deletingSchool._count.leads > 0 && <p>• {deletingSchool._count.leads} leads</p>}
                          {deletingSchool._count.campaigns > 0 && <p>• {deletingSchool._count.campaigns} campaigns</p>}
                          {deletingSchool._count.contents > 0 && <p>• {deletingSchool._count.contents} contents</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-sm text-gray-500">
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeletingSchool(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteSchool}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete School'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
