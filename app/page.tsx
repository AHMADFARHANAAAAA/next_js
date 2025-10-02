'use client'

import Image from "next/image";
import Link from "next/link";
import { useSession, signOut } from 'next-auth/react';

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        {/* Welcome Message untuk Facebook User */}
        {session?.user && (
          <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-4">
              {session.user.image && (
                <img 
                  src={session.user.image} 
                  alt="Profile" 
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div>
                <h2 className="text-xl font-bold text-green-800">
                  Welcome back, {session.user.name}! 👋
                </h2>
                <p className="text-green-600">
                  Successfully signed in via Facebook
                </p>
              </div>
            </div>
          </div>
        )}

        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Edu Platform</h1>
          <p className="text-lg text-gray-600 mb-8">
            Educational platform with Facebook authentication
          </p>
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          {!session ? (
            <>
              <Link
                className="rounded-full border border-solid border-blue-600 bg-blue-600 text-white transition-colors flex items-center justify-center gap-2 hover:bg-blue-700 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
                href="/login"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Sign in with Facebook
              </Link>
              <Link
                className="rounded-full border border-solid border-gray-300 text-gray-700 transition-colors flex items-center justify-center gap-2 hover:bg-gray-50 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
                href="/register"
              >
                Register
              </Link>
            </>
          ) : (
            <>
              <Link
                className="rounded-full border border-solid border-green-600 bg-green-600 text-white transition-colors flex items-center justify-center gap-2 hover:bg-green-700 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
                href="/admin"
              >
                Admin Dashboard
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="rounded-full border border-solid border-red-600 bg-red-600 text-white transition-colors flex items-center justify-center gap-2 hover:bg-red-700 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      </main>
      
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center text-sm text-gray-500">
        <p>© 2025 Edu Platform - Educational platform with Facebook authentication</p>
      </footer>
    </div>
  );
}