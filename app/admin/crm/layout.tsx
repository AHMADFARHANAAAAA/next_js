'use client'

import { Suspense } from 'react'
import CRMLayoutContent from './layout-content'

export default function CRMLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>}>
      <CRMLayoutContent>{children}</CRMLayoutContent>
    </Suspense>
  )
}