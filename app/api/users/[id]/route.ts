import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import bcrypt from 'bcryptjs'

// GET - Get specific user details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. SUPERADMIN access required.' },
        { status: 403 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        schoolId: true,
        created_at: true,
        updated_at: true,
        school: {
          select: {
            name: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update user profile
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. SUPERADMIN access required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, email, password, role, schoolId } = body

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Validate role-specific requirements
    if (role === 'ADMIN' && !schoolId) {
      return NextResponse.json(
        { error: 'Admin users must be assigned to a school' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if email is already taken by another user
    if (email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      })

      if (emailExists) {
        return NextResponse.json(
          { error: 'Email is already taken by another user' },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: {
      name: string;
      email: string;
      role: 'USER' | 'ADMIN' | 'SUPERADMIN';
      schoolId: string | null;
      password?: string;
    } = {
      name,
      email,
      role: (role || existingUser.role) as 'USER' | 'ADMIN' | 'SUPERADMIN',
      schoolId: schoolId || existingUser.schoolId
    }

    // Hash new password if provided
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 12)
      updateData.password = hashedPassword
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        schoolId: true,
        created_at: true,
        updated_at: true,
        school: {
          select: {
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'User profile updated successfully',
      user: updatedUser
    })

  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. SUPERADMIN access required.' },
        { status: 403 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent SUPERADMIN from deleting themselves
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Delete user
    await prisma.user.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
