import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// PrismaClient singleton imported from lib/prisma

// POST - Assign user to school with role
export async function POST(request: NextRequest) {
  try {
    const { userId, schoolId, role } = await request.json()

    if (!userId || !schoolId || !role) {
      return NextResponse.json(
        { success: false, message: 'User ID, School ID, and role are required' },
        { status: 400 }
      )
    }

    if (!['USER', 'ADMIN', 'SUPERADMIN'].includes(role)) {
      return NextResponse.json(
        { success: false, message: 'Invalid role' },
        { status: 400 }
      )
    }

    // Update user with school assignment and role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        schoolId,
        role
      },
      include: {
        school: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'User assigned to school successfully',
      user: updatedUser
    })
  } catch (error) {
    console.error('Error assigning user to school:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to assign user to school' },
      { status: 500 }
    )
  }
}

// GET - Get users by school
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const schoolId = url.searchParams.get('schoolId')

    if (!schoolId) {
      return NextResponse.json(
        { success: false, message: 'School ID is required' },
        { status: 400 }
      )
    }

    const users = await prisma.user.findMany({
      where: { schoolId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
        school: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      users
    })
  } catch (error) {
    console.error('Error fetching school users:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch school users' },
      { status: 500 }
    )
  }
}