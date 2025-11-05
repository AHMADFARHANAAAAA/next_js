'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CSVImport from '../../../components/CSVImport'

interface School {
  id: string
  name: string
}

export default function ImportData() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [schools, setSchools] = useState<School[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return

    if (!session || !['ADMIN', 'SUPERADMIN'].includes(session.user.role || '')) {
      router.push('/')
      return
    }

    // Check if admin has a school assigned
    if (session.user.role === 'ADMIN' && !session.user.schoolId) {
      setError('Admin harus ditetapkan ke sekolah terlebih dahulu sebelum dapat menggunakan fitur import CSV')
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
    // Show success message or redirect
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
              <h1 className="text-xl font-semibold text-gray-900">CRM Data Import</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/admin/crm"
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to CRM
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
            <h2 className="text-2xl font-bold text-gray-900">CRM Leads Import Center</h2>
            <p className="mt-2 text-gray-600">
              Import CRM leads data from CSV files to quickly populate your database
            </p>
          </div>

          {/* Admin School Assignment Warning */}
          {error && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.19-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Akses Ditolak
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>{error}</p>
                    <p className="mt-1">Silakan hubungi Super Admin untuk mendapatkan sekolah yang akan dikelola.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CRM Import Section */}
          {!error && (
            <div className="space-y-6">
              <div>
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">Import CRM Leads</h3>
                  <p className="text-sm text-blue-700">
                    Import customer leads menggunakan format CSV dengan 14 kolom standar. 
                  Sistem mendukung mapping otomatis untuk semua field CRM leads dengan validasi data yang ketat.
                </p>
                <div className="mt-3 text-sm text-blue-600">
                  <strong>Kolom Wajib:</strong> Parent Name (tidak boleh kosong)<br/>
                  <strong>Format Tanggal:</strong> YYYY-MM-DD (contoh: 2025-09-24)<br/>
                  <strong>Status:</strong> New Lead, Follow-up, Visited School, Enrolled, Lost, dll.
                </div>
                <div className="mt-3">
                  <a 
                    href="/templates/leads_template.csv" 
                    download
                    className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
                  >
                    📥 Download Template CSV
                  </a>
                  <a 
                    href="/templates/README_CSV_Import.md" 
                    target="_blank"
                    className="ml-2 inline-flex items-center px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200"
                  >
                    📖 Panduan Lengkap
                  </a>
                </div>
                {session?.user.role === 'ADMIN' && (
                  <div className="mt-2 text-sm text-orange-600">
                    <strong>Note:</strong> Sebagai admin sekolah, leads akan otomatis ditempatkan di sekolah Anda
                  </div>
                )}
                {session?.user.role === 'SUPERADMIN' && (
                  <div className="mt-2 text-sm text-orange-600">
                    <strong>Note:</strong> Sebagai SUPERADMIN, Anda dapat mengimpor leads ke sekolah manapun
                  </div>
                )}
              </div>
              <CSVImport 
                importType="leads" 
                schools={schools}
                onImportComplete={handleImportComplete}
              />
            </div>
          </div>
          )}

          {/* Import Statistics */}
          <div className="mt-12 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Import Overview</h3>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">CRM Leads</div>
                  <div className="text-sm text-gray-600">Import Type</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">15 Kolom</div>
                  <div className="text-sm text-gray-600">Format Standar</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">Siap Pakai</div>
                  <div className="text-sm text-gray-600">Sistem Import</div>
                </div>
              </div>
            </div>
          </div>

          {/* Import Guidelines */}
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">CRM Import Guidelines</h3>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">📊 Format Data yang Diperlukan</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• File CSV dengan header kolom yang benar</li>
                    <li>• <strong>Parent Name wajib diisi</strong> untuk semua record</li>
                    <li>• Format tanggal: YYYY-MM-DD (2025-09-24)</li>
                    <li>• Status sesuai daftar yang didukung sistem</li>
                    <li>• Next Follow-up berisi aksi, bukan tanggal</li>
                    <li>• Encoding file harus UTF-8</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">🎯 Aturan Pemrosesan</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Lead existing di-update berdasarkan Parent Name</li>
                    <li>• Record duplikat ditangani dengan cerdas</li>
                    <li>• Record tidak valid akan di-skip dengan log error</li>
                    <li>• Summary lengkap ditampilkan setelah import</li>
                    <li>• Validasi otomatis untuk semua field</li>
                    <li>• Status mapping otomatis ke sistem</li>
                  </ul>
                </div>
              </div>
              <div className="mt-6 p-4 bg-green-50 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      ✅ Sistem Import CRM Siap Digunakan
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>
                        Sistem telah dikonfigurasi untuk import leads CRM dengan format 15 kolom standar. 
                        Download template CSV, isi sesuai format, dan upload untuk memulai import data. 
                        Sistem akan otomatis memvalidasi dan memproses data Anda.
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