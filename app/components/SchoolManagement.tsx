'use client'

import { useState, useEffect } from 'react'

interface School {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
  logo?: string
  users: Array<{
    id: string
    name: string
    email: string
    role: string
  }>
  _count: {
    users: number
    leads: number
    campaigns: number
    contents: number
  }
}

interface User {
  id: string
  name: string
  email: string
  role: string
  schoolId?: string
}

export default function SchoolManagement() {
  const [schools, setSchools] = useState<School[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddSchool, setShowAddSchool] = useState(false)
  const [showAssignUser, setShowAssignUser] = useState(false)

  const [newSchool, setNewSchool] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
  })

  const [assignment, setAssignment] = useState({
    userId: '',
    schoolId: '',
    role: 'ADMIN'
  })

  useEffect(() => {
    fetchSchools()
    fetchUsers()
  }, [])

  const fetchSchools = async () => {
    try {
      const response = await fetch('/api/schools')
      const data = await response.json()
      if (data.success) {
        setSchools(data.schools)
      }
    } catch (error) {
      console.error('Error fetching schools:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      if (data.success) {
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await fetch('/api/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSchool)
      })
      
      const data = await response.json()
      if (data.success) {
        setNewSchool({ name: '', address: '', phone: '', email: '' })
        setShowAddSchool(false)
        fetchSchools()
        alert('School created successfully!')
      } else {
        alert(data.message || 'Failed to create school')
      }
    } catch (error) {
      console.error('Error creating school:', error)
      alert('Failed to create school')
    } finally {
      setLoading(false)
    }
  }

  const handleAssignUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await fetch('/api/assign-school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignment)
      })
      
      const data = await response.json()
      if (data.success) {
        setAssignment({ userId: '', schoolId: '', role: 'ADMIN' })
        setShowAssignUser(false)
        fetchSchools()
        fetchUsers()
        alert('User assigned successfully!')
      } else {
        alert(data.message || 'Failed to assign user')
      }
    } catch (error) {
      console.error('Error assigning user:', error)
      alert('Failed to assign user')
    } finally {
      setLoading(false)
    }
  }

  const unassignedUsers = users.filter(user => !user.schoolId)

  return (
    <div className="space-y-6">
      {/* Debug Info */}
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-800">
          Debug: showAddSchool = {showAddSchool.toString()}
        </p>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">School Management</h2>
        <div className="flex gap-4">
          <button
            onClick={() => {
              console.log('Add School button clicked!')
              alert('Button clicked - opening modal')
              setShowAddSchool(true)
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            type="button"
          >
            + Add School
          </button>
          <button
            onClick={() => {
              console.log('Assign Admin button clicked!')
              setShowAssignUser(true)
            }}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            type="button"
          >
            + Assign Admin
          </button>
        </div>
      </div>

      {/* Schools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schools.map((school) => (
          <div key={school.id} className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{school.name}</h3>
            {school.address && (
              <p className="text-sm text-gray-600 mb-2">📍 {school.address}</p>
            )}
            {school.email && (
              <p className="text-sm text-gray-600 mb-2">📧 {school.email}</p>
            )}
            {school.phone && (
              <p className="text-sm text-gray-600 mb-4">📞 {school.phone}</p>
            )}
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{school._count.users}</p>
                <p className="text-xs text-gray-500">Users</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{school._count.leads}</p>
                <p className="text-xs text-gray-500">Leads</p>
              </div>
            </div>

            {/* Assigned Users */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Assigned Staff:</h4>
              {school.users.length > 0 ? (
                <div className="space-y-1">
                  {school.users.map((user) => (
                    <div key={user.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{user.name}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        user.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' :
                        user.role === 'SUPERADMIN' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No staff assigned</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add School Modal */}
      {showAddSchool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New School</h3>
            <form onSubmit={handleCreateSchool} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  School Name *
                </label>
                <input
                  type="text"
                  required
                  value={newSchool.name}
                  onChange={(e) => setNewSchool({...newSchool, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={newSchool.address}
                  onChange={(e) => setNewSchool({...newSchool, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newSchool.email}
                  onChange={(e) => setNewSchool({...newSchool, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={newSchool.phone}
                  onChange={(e) => setNewSchool({...newSchool, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setShowAddSchool(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create School'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign User Modal */}
      {showAssignUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Assign Admin to School</h3>
            <form onSubmit={handleAssignUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select User
                </label>
                <select
                  required
                  value={assignment.userId}
                  onChange={(e) => setAssignment({...assignment, userId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a user...</option>
                  {unassignedUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select School
                </label>
                <select
                  required
                  value={assignment.schoolId}
                  onChange={(e) => setAssignment({...assignment, schoolId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a school...</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={assignment.role}
                  onChange={(e) => setAssignment({...assignment, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="USER">User</option>
                </select>
              </div>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setShowAssignUser(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Assigning...' : 'Assign User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}