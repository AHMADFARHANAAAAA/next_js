'use client'

import { signIn, useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Redirect if already logged in
  useEffect(() => {
    if (session) {
      router.push('/admin')
    }
  }, [session, router])

  const handleFacebookLogin = async () => {
    setLoading(true)
    try {
      await signIn('facebook', { 
        callbackUrl: '/admin'
      })
    } catch (error) {
      console.error('Login error:', error)
      setLoading(false)
    }
  }

  if (session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to admin...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Sign in to Admin Dashboard
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Use your Facebook account to access the platform
          </p>
        </div>
        
        <div className="space-y-4">
          {/* Facebook Login Button */}
          <button
            onClick={handleFacebookLogin}
            disabled={loading}
            className="w-full flex justify-center items-center px-4 py-3 border border-transparent rounded-md shadow-sm bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            )}
            {loading ? 'Signing in...' : 'Continue with Facebook'}
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Local development - Facebook Login
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Make sure your Facebook account is added as a tester in the Facebook App
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}