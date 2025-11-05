'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CSVImport from '../../components/CSVImport'

interface School {
  id: string
  name: string
}

export default function SuperAdminImport() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [schools, setSchools] = useState<School[]>([])
  const [, setRefreshTrigger] = useState(0)

  useEffect(() => {
    if (status === 'loading') return

    if (!session || session.user.role !== 'SUPERADMIN') {
      router.push('/')
      return
    }

    fetchSchools()
  }, [session, status, router])

  const fetchSchools = async () => {
    try {
      const response = await fetch('/api/schools')
      const data = await response.json()
      if (response.ok) {
        setSchools(data.schools || [])
      }
    } catch (error) {
      console.error('Error fetching schools:', error)
    }
  }

  const handleImportComplete = () => {
    setRefreshTrigger(prev => prev + 1)
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
              <h1 className="text-xl font-semibold text-gray-900">Super Admin - CRM Data Import</h1>
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
        <div className="px-4 py-6 sm:px-0">
          
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">CRM Data Import Center</h2>
            <p className="mt-2 text-gray-600">
              Import CRM leads data from CSV files. Select a school to assign the imported leads to that specific institution.
            </p>
          </div>

          {/* CRM Import Section */}
          <div className="space-y-6">
            <div>
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Import CRM Leads</h3>
                <p className="text-sm text-blue-700">
                  Import customer leads and prospects for schools. The system supports the standard 15-column CRM format 
                  including Info Source, Date Contact, Lead/Month, Parent Name, Parent Phone, Parent Email, Student Name, 
                  School Origin, For Grade, Enrollment Year, Status Customer Journey, Notes, and Next Follow-up.
                </p>
                <div className="mt-3 text-sm text-blue-600">
                  <strong>Required columns:</strong> parentName<br/>
                  <strong>Standard columns:</strong> infoSource, dateContact, leadMonth, parentPhone, parentEmail, studentName, schoolOrigin, gradeTarget, enrollmentYear, status, customerJourney, notes, nextFollowUp
                </div>
                <div className="mt-2 text-sm text-orange-600">
                  <strong>Note:</strong> You must select a target school for the imported leads. Existing leads with the same parent name will be updated.
                </div>
              </div>
              <CSVImport 
                importType="leads" 
                schools={schools}
                onImportComplete={handleImportComplete}
              />
            </div>
          </div>

          {/* System Statistics */}
          <div className="mt-12 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">System Overview</h3>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{schools.length}</div>
                  <div className="text-sm text-gray-600">Schools Available</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">CRM Only</div>
                  <div className="text-sm text-gray-600">Import Type</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">15 Columns</div>
                  <div className="text-sm text-gray-600">Standard Format</div>
                </div>
              </div>
            </div>
          </div>

          {/* CRM Import Guidelines */}
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">CRM Import Guidelines</h3>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">📊 Data Format Requirements</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• CSV file with proper column headers</li>
                    <li>• Parent Name is required for all records</li>
                    <li>• Date fields should be in YYYY-MM-DD format</li>
                    <li>• Status values will be mapped to system statuses</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">🎯 Data Processing Rules</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Existing leads are updated based on parent name</li>
                    <li>• All leads must be assigned to a school</li>
                    <li>• Invalid records are logged and skipped</li>
                    <li>• Processing summary provided after import</li>
                  </ul>
                </div>
              </div>
              <div className="mt-6 p-4 bg-yellow-50 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      SUPERADMIN CRM Import Notice
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        As SUPERADMIN, you can import CRM leads for any school in the system. Please ensure you select 
                        the correct target school and verify data accuracy before importing. Test with small batches first.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}