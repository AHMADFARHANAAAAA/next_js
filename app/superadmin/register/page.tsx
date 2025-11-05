'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import Link from 'next/link'

interface RegisterFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
  role: 'ADMIN' | 'USER' | 'SUPERADMIN'
}

interface RegisterResponse {
  success: boolean
  message?: string
  user?: {
    id: string
    name: string
    email: string
    role: string
  }
  type?: 'oauth_exists' | 'manual_exists'
  existingProviders?: string[]
  existingRole?: string
}

export default function SuperAdminRegister() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'ADMIN'
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/')
      return
    }

    // Only SUPERADMIN can access this page
    if (session.user?.role !== 'SUPERADMIN') {
      router.push('/admin')
      return
    }
  }, [session, status, router])

  // Redirect if not SUPERADMIN
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (!session || session.user.role !== 'SUPERADMIN') {
    return null
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Nama harus diisi')
      return false
    }
    if (formData.name.trim().length < 2) {
      setError('Nama minimal harus 2 karakter')
      return false
    }
    if (!formData.email.trim()) {
      setError('Email harus diisi')
      return false
    }
    if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
      setError('Silakan masukkan alamat email yang valid')
      return false
    }
    if (!formData.password) {
      setError('Kata sandi harus diisi')
      return false
    }
    if (formData.password.length < 6) {
      setError('Kata sandi minimal harus 6 karakter')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Kata sandi tidak cocok')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role
        })
      })

      const data: RegisterResponse = await response.json()

      if (data.success) {
        setSuccess(`Pengguna ${formData.role} berhasil dibuat! Pengguna sekarang dapat login dengan email dan kata sandi.`)
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'ADMIN'
        })
      } else {
        if (data.type === 'oauth_exists') {
          const providers = data.existingProviders?.join(', ') || 'OAuth'
          setError(`Email ini sudah terdaftar via ${providers} dengan peran: ${data.existingRole}`)
        } else if (data.type === 'manual_exists') {
          setError(`Email ini sudah terdaftar secara manual dengan peran: ${data.existingRole}`)
        } else {
          setError(data.message || 'Pendaftaran gagal')
        }
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Silakan coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="backdrop-blur-sm bg-white/90 border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/superadmin')}
                className="inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Kembali
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Buat Akun Pengguna</h1>
                <p className="text-sm text-slate-600 font-medium">Daftarkan pengguna baru ke sistem</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-700">{session.user.name}</p>
                <p className="text-xs text-slate-500">Super Admin</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
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

      <div className="min-h-screen py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="backdrop-blur-sm bg-white/90 rounded-3xl shadow-xl border border-slate-200/60 p-8">
            <div className="text-center mb-8">
              <div className="mx-auto h-14 w-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
                <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-slate-800 tracking-tight mb-2">
                Buat Akun Pengguna Baru
              </h2>
              <p className="text-sm text-slate-600">
                Daftarkan pengguna baru untuk akses ke sistem manajemen
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Role Selection */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-2">
                  Peran Pengguna
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="ADMIN">Admin (Manajemen Sekolah)</option>
                  <option value="USER">User (Akses Terbatas)</option>
                  <option value="SUPERADMIN">Super Admin (Akses Penuh)</option>
                </select>
              </div>

              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                  Nama Lengkap
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                  placeholder="Masukkan nama lengkap"
                />
              </div>

              {/* Email - Can be any email including Gmail */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                  Alamat Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                  placeholder="Masukkan email (bisa email apapun termasuk Gmail)"
                />
                <div className="mt-3 text-xs text-blue-600 bg-blue-50/80 p-3 rounded-lg border border-blue-200/60">
                  <span className="font-medium">💡 Catatan:</span> Anda dapat mendaftarkan alamat email apapun (termasuk Gmail) tanpa memerlukan akses ke akun Google yang sebenarnya
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                  Kata Sandi
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 pr-11 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                    placeholder="Masukkan kata sandi (minimal 6 karakter)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                  Konfirmasi Kata Sandi
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 pr-11 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                    placeholder="Konfirmasi kata sandi"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50/80 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="ml-3 text-sm font-medium text-red-800">{error}</p>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="bg-green-50/80 border border-green-200 rounded-xl p-4">
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="ml-3 text-sm font-medium text-green-800">{success}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-medium rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Membuat Pengguna...
                  </div>
                ) : (
                  `Buat Pengguna ${formData.role}`
                )}
              </button>
            </form>

            {/* Navigation Links */}
            <div className="flex space-x-3 pt-6 border-t border-slate-200/60">
              <Link 
                href="/superadmin/schools"
                className="flex-1 text-center px-4 py-2 border border-blue-200 rounded-lg text-sm font-medium text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 transition-all duration-200"
              >
                Kelola Sekolah
              </Link>
              <Link 
                href="/superadmin"
                className="flex-1 text-center px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-slate-50/80 hover:bg-slate-100/80 transition-all duration-200"
              >
                Dashboard
              </Link>
            </div>

            {/* Info Box */}
            <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/60 rounded-xl p-5 mt-6">
              <div className="flex">
                <svg className="h-6 w-6 text-blue-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">Hak Istimewa SUPERADMIN</h3>
                  <div className="text-xs text-blue-800 space-y-1">
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></div>
                      Membuat pengguna dengan alamat email apapun (termasuk Gmail)
                    </div>
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></div>
                      Tidak memerlukan akses ke akun email yang sebenarnya
                    </div>
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></div>
                      Dapat menentukan peran ADMIN, USER, atau SUPERADMIN
                    </div>
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></div>
                      Pengguna dapat login dengan email + kata sandi (bukan OAuth)
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