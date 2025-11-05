import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { email, role } = await request.json()

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      )
    }

    if (!['USER', 'ADMIN', 'SUPERADMIN'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be USER, ADMIN, or SUPERADMIN' },
        { status: 400 }
      )
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        created_at: true
      }
    })

    return NextResponse.json({
      message: `User role updated to ${role}`,
      user: updatedUser
    })

  } catch (error: unknown) {
    console.error('Update user role error:', error)
    
    const prismaError = error as { code?: string }
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    )
  }
}