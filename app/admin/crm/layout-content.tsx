'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'

export default function CRMLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Check if accessed by superadmin
  const isSuperadminAccess = searchParams.get('superadmin') === 'true'
  const schoolId = searchParams.get('schoolId')
  
  // State to store school name when accessed by superadmin
  const [schoolName, setSchoolName] = useState<string>('')

  // Fetch school name if superadmin access
  useEffect(() => {
    if (isSuperadminAccess && schoolId) {
      const fetchSchoolName = async () => {
        try {
          const response = await fetch(`/api/schools/${schoolId}`)
          const data = await response.json()
          if (data.success) {
            setSchoolName(data.school.name)
          }
        } catch (error) {
          console.error('Error fetching school name:', error)
        }
      }
      fetchSchoolName()
    }
  }, [isSuperadminAccess, schoolId])

  // Authentication effect
  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
      router.push('/admin')
      return
    }
  }, [session, status, router])

  useEffect(() => {
    if (status === 'loading') return

    if (session?.user.role === 'SUPERADMIN' && !schoolId) {
      router.replace('/superadmin/manage-schools')
    }
  }, [session, status, schoolId, router])

  const navigation = [
    { name: 'Dashboard', href: '/admin/crm', icon: '📊' },
    { name: 'Leads', href: '/admin/crm/leads', icon: '👥' },
    { name: 'Campaigns', href: '/admin/crm/campaigns', icon: '📢' },
    { name: 'Contents', href: '/admin/crm/contents', icon: '📝' },
  ]

  // Add query parameters to navigation if superadmin access
  const getNavHref = (baseHref: string) => {
    if (isSuperadminAccess && schoolId) {
      return `${baseHref}?schoolId=${schoolId}&superadmin=true`
    }
    return baseHref
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN')) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-x-hidden">
      {/* Simple Static Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-slate-200/60 sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 max-w-full h-16">
          <div className="flex justify-between items-center h-full">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              {isSuperadminAccess ? (
                <Link 
                  href="/superadmin/manage-schools" 
                  className="text-blue-600 hover:text-blue-800 transition-colors hidden sm:block whitespace-nowrap"
                >
                  ← Back to Manage Schools
                </Link>
              ) : (
                <Link 
                  href="/admin" 
                  className="text-blue-600 hover:text-blue-800 transition-colors hidden sm:block whitespace-nowrap"
                >
                  ← Back to Admin
                </Link>
              )}
              <div className="border-l pl-3 min-w-0 flex-1">
                <h1 className="font-bold text-xl text-gray-900 truncate">
                  CRM System
                  {isSuperadminAccess && (
                    <span className="text-blue-600">
                      {schoolName ? ` - ${schoolName}` : ' - Loading...'}
                    </span>
                  )}
                </h1>
                <p className="text-sm text-gray-600 hidden sm:block">
                  {isSuperadminAccess ? (
                    <span className="flex items-center">
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Superadmin View
                    </span>
                  ) : (
                    'School Management'
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <span className="text-xs sm:text-sm text-gray-700 hidden lg:block truncate max-w-32">
                {session.user.name} ({session.user.role})
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="bg-red-600 text-white px-3 py-2 sm:px-4 rounded-lg hover:bg-red-700 text-xs sm:text-sm transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">↗</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Responsive Navigation */}
      <nav className="bg-white/90 backdrop-blur-sm border-b border-slate-200/60 overflow-x-hidden">
        <div className="w-full px-4 sm:px-6 lg:px-8 max-w-full">
          <div className="flex overflow-x-auto scrollbar-hide space-x-2 sm:space-x-6 py-3">
            {navigation.map((item) => {
              const href = getNavHref(item.href)
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={href}
                  className={`px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm transition-all duration-300 whitespace-nowrap flex-shrink-0 rounded-t-lg py-3 ${
                    isActive
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-1 sm:mr-2">{item.icon}</span>
                  <span className="hidden sm:inline">{item.name}</span>
                  <span className="sm:hidden">{item.name.slice(0, 4)}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Responsive Main Content */}
      <main className="w-full overflow-x-hidden transition-all duration-300">
        <div className="w-full px-0 py-4 sm:py-6">
          {children}
        </div>
      </main>

      {/* Responsive Footer */}
      <footer className="bg-white/90 backdrop-blur-sm border-t border-slate-200/60 mt-8 sm:mt-12">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4 max-w-full">
          <p className="text-center text-xs sm:text-sm text-gray-500">
            CRM System - School Management System
          </p>
        </div>
      </footer>
    </div>
  )
}
