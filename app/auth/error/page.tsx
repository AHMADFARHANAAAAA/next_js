'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { Suspense } from 'react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  
  const getErrorContent = () => {
    switch (error) {
      case 'EmailNotRegistered':
        return {
          title: 'Email Belum Terdaftar',
          description: 'Email Google Anda belum terdaftar dalam sistem. Hanya email yang sudah terdaftar yang dapat login dengan Google.',
          suggestion: 'Hubungi administrator untuk mendaftarkan email Anda, atau gunakan metode login lain jika tersedia.',
          actionText: 'Kembali ke Login',
          actionHref: '/',
          showContactInfo: true,
          isEmailNotRegistered: true
        }
      case 'OAuthSignin':
      case 'OAuthCallback':
        return {
          title: 'Email Belum Terdaftar',
          description: 'Email Google Anda belum terdaftar dalam sistem.',
          suggestion: 'Hubungi administrator untuk mendaftarkan akun Anda.',
          actionText: 'Kembali ke Login',
          actionHref: '/',
          showContactInfo: true,
          isEmailNotRegistered: true
        }
      case 'AccessDenied':
        return {
          title: 'Akses Ditolak',
          description: 'Email Anda belum terdaftar dalam sistem.',
          suggestion: 'Hanya email yang sudah terdaftar yang dapat login dengan Google.',
          actionText: 'Kembali ke Login',
          actionHref: '/',
          showContactInfo: true,
          isEmailNotRegistered: true
        }
      case 'OAuthAccountNotLinked':
        return {
          title: 'Account Already Exists',
          description: 'An account with this email already exists with a different sign-in method.',
          suggestion: 'Please sign in using your original method, then you can link additional accounts in your profile settings.',
          actionText: 'Go to Login',
          actionHref: '/'
        }
      case 'CredentialsSignin':
        return {
          title: 'Sign In Failed',
          description: 'The email or password you entered is incorrect.',
          suggestion: 'Please check your credentials and try again, or use the "Forgot Password" link.',
          actionText: 'Try Again',
          actionHref: '/'
        }
      case 'EmailCreateAccount':
        return {
          title: 'Email Already Registered',
          description: 'This email is already associated with another account.',
          suggestion: 'Please sign in with your existing account or use a different email address.',
          actionText: 'Sign In',
          actionHref: '/'
        }
      default:
        return {
          title: 'Authentication Error',
          description: 'An unexpected error occurred during authentication.',
          suggestion: 'Please try again or contact support if the problem persists.',
          actionText: 'Try Again',
          actionHref: '/'
        }
    }
  }

  const errorContent = getErrorContent()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {errorContent.title}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {errorContent.description}
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                {errorContent.suggestion}
              </p>
            </div>
          </div>
        </div>

        {/* Error Details for unregistered email */}
        {errorContent.isEmailNotRegistered && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 mb-2">
                  Cara Mendapatkan Akses:
                </h3>
                <div className="text-sm text-blue-700">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Hubungi administrator sistem</li>
                    <li>Minta untuk didaftarkan dengan email Google Anda</li>
                    <li>Administrator akan membuat akun untuk Anda melalui panel SUPERADMIN</li>
                    <li>Setelah terdaftar, Anda dapat login dengan Google</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-4">
          <Link
            href={errorContent.actionHref}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {errorContent.actionText}
          </Link>

          {/* Social Login Options - Only show if NOT email not registered error */}
          {!errorContent.isEmailNotRegistered && (
            <div className="space-y-2">
              <p className="text-center text-sm text-gray-600">Or try signing in with Google:</p>
              <div>
                <button
                  onClick={() => signIn('google')}
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>
              </div>
            </div>
          )}

          {/* Contact Admin for unregistered email */}
          {errorContent.showContactInfo && (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Butuh bantuan?{' '}
                <a href="mailto:admin@edu.com" className="font-medium text-blue-600 hover:text-blue-500">
                  Hubungi Administrator
                </a>
              </p>
            </div>
          )}

          <div className="text-center">
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  )
}