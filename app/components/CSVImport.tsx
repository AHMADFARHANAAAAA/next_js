'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

interface ImportResult {
  success: boolean
  message: string
  details?: {
    successCount: number
    errorCount: number
    errors: string[]
  }
}

interface School {
  id: string
  name: string
}

interface CSVImportProps {
  schools?: School[]
  importType: 'leads'
  onImportComplete?: () => void
}

export default function CSVImport({ schools = [], importType, onImportComplete }: CSVImportProps) {
  const { data: session } = useSession()
  const [file, setFile] = useState<File | null>(null)
  const [schoolId, setSchoolId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
    }
  }

  const handleImport = async () => {
    if (!file) {
      alert('Please select a CSV file first')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('importType', importType)
      
      if (schoolId) {
        formData.append('schoolId', schoolId)
      }

      const response = await fetch('/api/import/csv', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
        if (onImportComplete) {
          onImportComplete()
        }
      } else {
        setResult({
          success: false,
          message: data.error || 'Import failed'
        })
      }
    } catch (error) {
      console.error('Import error:', error)
      setResult({
        success: false,
        message: 'Network error occurred'
      })
    } finally {
      setLoading(false)
    }
  }

  const getCSVTemplate = () => {
    // Template sesuai dengan format CSV yang diberikan user
    return `No,Info Source,Date Contact,Lead / Month,Parent Name,Parent Phone,Parent Email,Student Name,School Origin,For Grade,Enrollment Year,Domicile,Status Customer Journey,Notes / Kendala / Cancel / dll.,Next Follow-up
1,Google Ads,7-Jul-25,1.Aug,Helmi Budiman,+6282115252123,helmibudiman02garut@gmail.com,Muhammad Fathan Alamy,SDIT 2 Persis Tarogong,G7,2025-2026,Garut,Bayar UP (Official),Tanya biaya pendaftaran,
2,Website Form,17-Jul-25,1.Aug,Rio Unitrya,+6281363368808,Rio.unitrya@gmail.com,Jihan Nabilla Hanania,SD IT Jamiatul Muslimin,G7,2025-2026,Bandung,Bayar UP (Official),,`
  }

  const downloadTemplate = () => {
    const template = getCSVTemplate()
    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads_template.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Import CRM Leads Data
        </h3>
        
        {/* Download Template */}
        <div className="mb-4">
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download CSV Template
          </button>
          <p className="text-sm text-gray-600 mt-2">
            Download the template to ensure your CSV file has the correct format with all 15 required columns.
          </p>
        </div>

        {/* School Selection for SUPERADMIN */}
        {session?.user.role === 'SUPERADMIN' && schools.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Target School
            </label>
            <select
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a school...</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-600 mt-1">
              All imported leads will be assigned to the selected school.
            </p>
          </div>
        )}

        {/* File Upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select CSV File
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          {file && (
            <p className="text-sm text-green-600 mt-1">
              Selected: {file.name} ({Math.round(file.size / 1024)} KB)
            </p>
          )}
        </div>

        {/* Import Button */}
        <button
          onClick={handleImport}
          disabled={!file || loading || (session?.user.role === 'SUPERADMIN' && !schoolId)}
          className={`w-full px-4 py-2 rounded-md text-white font-medium ${
            !file || loading || (session?.user.role === 'SUPERADMIN' && !schoolId)
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Importing...
            </div>
          ) : (
            'Import CRM Data'
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className={`rounded-md p-4 ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {result.success ? (
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3 flex-1">
              <h3 className={`text-sm font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                {result.success ? 'Import Successful' : 'Import Failed'}
              </h3>
              <div className={`mt-2 text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                <p>{result.message}</p>
              </div>
              
              {result.details && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className={`text-sm font-medium ${result.success ? 'text-green-800 hover:text-green-900' : 'text-red-800 hover:text-red-900'}`}
                  >
                    {showDetails ? 'Hide Details' : 'Show Details'}
                  </button>
                  
                  {showDetails && (
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between">
                        <span>Successfully imported:</span>
                        <span className="font-medium">{result.details.successCount} records</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Failed to import:</span>
                        <span className="font-medium">{result.details.errorCount} records</span>
                      </div>
                      
                      {result.details.errors.length > 0 && (
                        <div className="mt-3">
                          <h4 className="font-medium mb-2">Errors:</h4>
                          <div className="max-h-32 overflow-y-auto">
                            {result.details.errors.slice(0, 10).map((error, index) => (
                              <div key={index} className="text-xs p-2 bg-white rounded border">
                                {error}
                              </div>
                            ))}
                            {result.details.errors.length > 10 && (
                              <div className="text-xs text-gray-600 mt-2">
                                ... and {result.details.errors.length - 10} more errors
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import Guidelines */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Import Guidelines</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Use the exact CSV format with headers: No, Info Source, Date Contact, Lead / Month, Parent Name, Parent Phone, Parent Email, Student Name, School Origin, For Grade, Enrollment Year, Status Customer Journey, Notes / Kendala / Cancel / dll., Next Follow-up</li>
          <li>• Parent Name column is required for all records</li>
          <li>• Date fields should be in format like: 7-Jul-25 or 17-Jul-25</li>
          <li>• Status will be automatically mapped (e.g., &quot;Bayar UP (Official)&quot; → BAYAR_UP_OFFICIAL)</li>
          <li>• Existing leads with same parent name will be updated</li>
          <li>• Empty rows will be skipped automatically</li>
          <li>• File size limit: 10MB, recommended: test with small files first</li>
        </ul>
      </div>
    </div>
  )
}