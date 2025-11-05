'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  name: string
  email: string
  role: string
  schoolId: string | null
  created_at: string
  updated_at: string
  school?: {
    id: string
    name: string
  }
}

interface School {
  id: string
  name: string
}

export default function UserManagement() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterSchool, setFilterSchool] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    schoolId: ''
  })

  useEffect(() => {
    if (status === 'loading') return

    if (!session || session.user.role !== 'SUPERADMIN') {
      router.push('/')
      return
    }

    fetchUsers()
    fetchSchools()
  }, [session, status, router])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users')
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSchools = async () => {
    try {
      const response = await fetch('/api/schools')
      const data = await response.json()
      setSchools(data.schools || [])
    } catch (error) {
      console.error('Error fetching schools:', error)
    }
  }

  // Filter and search function
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.school?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = filterRole === '' || user.role === filterRole
    
    // Handle school filter including "null" option for unassigned users
    let matchesSchool = true
    if (filterSchool !== '') {
      if (filterSchool === 'null') {
        matchesSchool = user.schoolId === null
      } else {
        matchesSchool = user.schoolId === filterSchool
      }
    }

    return matchesSearch && matchesRole && matchesSchool
  })

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      schoolId: user.schoolId || ''
    })
    setShowEditModal(true)
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    // Validation
    if (formData.role === 'ADMIN' && !formData.schoolId) {
      alert('Admin users must be assigned to a school. Please select a school before saving.')
      return
    }

    if (!formData.name.trim() || !formData.email.trim()) {
      alert('Name and email are required fields.')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password.trim() || undefined,
          role: formData.role,
          schoolId: formData.schoolId || null
        })
      })

      const result = await response.json()

      if (response.ok) {
        alert(`User "${formData.name}" updated successfully!`)
        setShowEditModal(false)
        setEditingUser(null)
        fetchUsers() // Refresh the user list to show updated data
      } else {
        alert(result.error || 'Failed to update user')
      }
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Network error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"?`)) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (response.ok) {
        alert('User deleted successfully!')
        fetchUsers()
      } else {
        alert(result.error || 'Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return 'bg-red-100 text-red-800'
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800'
      case 'USER':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
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
              <h1 className="text-xl font-semibold text-gray-900">User Management</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/superadmin"
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Statistics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {users.length}
                    </span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Users
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {users.length} registered
                    </dd>
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
                    <span className="text-white text-sm font-bold">
                      {users.filter(u => u.role === 'ADMIN').length}
                    </span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      School Admins
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {users.filter(u => u.role === 'ADMIN' && u.school).length} assigned / {users.filter(u => u.role === 'ADMIN').length} total
                    </dd>
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
                    <span className="text-white text-sm font-bold">
                      {schools.length}
                    </span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Schools Managed
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {schools.filter(s => users.some(u => u.schoolId === s.id)).length} active schools
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {users.filter(u => u.role === 'ADMIN' && !u.school).length}
                    </span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Needs Assignment
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      Admins without schools
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                  <h2 className="text-lg font-medium text-gray-900">All Users</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Manage user accounts, roles, and permissions
                  </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                  <Link
                    href="/superadmin/register"
                    className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                  >
                    Add User
                  </Link>
                </div>
              </div>

              {/* Filter and Search Panel */}
              <div className="mt-6 border-t border-gray-200 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                      Search Users
                    </label>
                    <input
                      type="text"
                      id="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name, email, or school..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="filterRole" className="block text-sm font-medium text-gray-700 mb-1">
                      Filter by Role
                    </label>
                    <select
                      id="filterRole"
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Roles</option>
                      <option value="SUPERADMIN">Super Admin</option>
                      <option value="ADMIN">Admin</option>
                      <option value="USER">User</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="filterSchool" className="block text-sm font-medium text-gray-700 mb-1">
                      Filter by School
                    </label>
                    <select
                      id="filterSchool"
                      value={filterSchool}
                      onChange={(e) => setFilterSchool(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Schools</option>
                      <option value="null">No School Assigned</option>
                      {schools.map(school => (
                        <option key={school.id} value={school.id}>
                          {school.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Results Summary */}
                <div className="mb-4 text-sm text-gray-600">
                  Showing {filteredUsers.length} of {users.length} users
                  {(searchTerm || filterRole || filterSchool) && (
                    <button
                      onClick={() => {
                        setSearchTerm('')
                        setFilterRole('')
                        setFilterSchool('')
                      }}
                      className="ml-2 text-blue-600 hover:text-blue-800 underline"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="mt-6 flex justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="mt-6 overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          School Assigned
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Account Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Updated
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.email}
                              </div>
                              <div className="text-xs text-gray-400">
                                ID: {user.id.slice(0, 8)}...
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm text-gray-900">
                                {user.school?.name || 'No School Assigned'}
                              </div>
                              {user.school && (
                                <div className="text-xs text-gray-500">
                                  School ID: {user.school.id.slice(0, 8)}...
                                </div>
                              )}
                              {user.role === 'ADMIN' && !user.school && (
                                <div className="text-xs text-red-500">
                                  ⚠️ Admin without school assignment
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              {user.school ? (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  Active
                                </span>
                              ) : user.role === 'ADMIN' ? (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                  Needs School
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                  No Assignment
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>
                              <div>{new Date(user.created_at).toLocaleDateString()}</div>
                              <div className="text-xs">{new Date(user.created_at).toLocaleTimeString()}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>
                              <div>{new Date(user.updated_at).toLocaleDateString()}</div>
                              <div className="text-xs">{new Date(user.updated_at).toLocaleTimeString()}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              Edit
                            </button>
                            {user.id !== session?.user?.id && (
                              <button
                                onClick={() => handleDeleteUser(user.id, user.name)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* No results message */}
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-8">
                      <div className="text-gray-500">
                        {users.length === 0 
                          ? "No users found in the system."
                          : "No users match your current filters."
                        }
                      </div>
                      {(searchTerm || filterRole || filterSchool) && (
                        <button
                          onClick={() => {
                            setSearchTerm('')
                            setFilterRole('')
                            setFilterSchool('')
                          }}
                          className="mt-2 text-blue-600 hover:text-blue-800 underline"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Edit User Profile
                  </h3>
                  <p className="text-sm text-gray-500">
                    User ID: {editingUser.id}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(editingUser.role)}`}>
                    Current: {editingUser.role}
                  </span>
                </div>
              </div>

              {/* User Info Summary */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Current Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Current School:</span>
                    <div className="font-medium">
                      {editingUser.school?.name || 'No School Assigned'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Account Created:</span>
                    <div className="font-medium">
                      {new Date(editingUser.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Updated:</span>
                    <div className="font-medium">
                      {new Date(editingUser.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Current Email:</span>
                    <div className="font-medium">
                      {editingUser.email}
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                      placeholder="Enter user's full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                      placeholder="user@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Leave blank to keep current password"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Only enter a password if you want to change it
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      User Role *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    >
                      <option value="USER">USER - Regular User</option>
                      <option value="ADMIN">ADMIN - School Administrator</option>
                      <option value="SUPERADMIN">SUPERADMIN - System Administrator</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      {formData.role === 'ADMIN' && 'Admin users must be assigned to a school'}
                      {formData.role === 'USER' && 'Regular users with limited access'}
                      {formData.role === 'SUPERADMIN' && 'Full system access across all schools'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      School Assignment
                    </label>
                    <select
                      value={formData.schoolId}
                      onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">No School Assignment</option>
                      {schools.map((school) => (
                        <option key={school.id} value={school.id}>
                          {school.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      {formData.role === 'ADMIN' && !formData.schoolId && '⚠️ Admin role requires school assignment'}
                      {formData.role === 'ADMIN' && formData.schoolId && '✓ Admin will manage this school'}
                      {formData.role === 'SUPERADMIN' && 'Superadmin has access to all schools'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingUser(null)
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Updating...' : 'Update User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}