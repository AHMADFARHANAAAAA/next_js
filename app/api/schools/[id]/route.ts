import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'

// GET - Get specific school details
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

    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        _count: {
          select: {
            users: true,
            leads: true,
            campaigns: true,
            contents: true
          }
        }
      }
    })

    if (!school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      school
    })
  } catch (error) {
    console.error('Error fetching school:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update school
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
    const { name, address, phone, email, logo } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'School name is required' },
        { status: 400 }
      )
    }

    // Check if school exists
    const existingSchool = await prisma.school.findUnique({
      where: { id }
    })

    if (!existingSchool) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    const school = await prisma.school.update({
      where: { id },
      data: {
        name,
        address,
        phone,
        email,
        logo
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        _count: {
          select: {
            users: true,
            leads: true,
            campaigns: true,
            contents: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'School updated successfully',
      school
    })
  } catch (error) {
    console.error('Error updating school:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update school' },
      { status: 500 }
    )
  }
}

// DELETE - Delete school
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

    // Check if school exists and get user count
    const existingSchool = await prisma.school.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            leads: true,
            campaigns: true,
            contents: true
          }
        }
      }
    })

    if (!existingSchool) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    // Check if school has associated users
    if (existingSchool._count.users > 0) {
      // Instead of preventing deletion, we'll reassign users to null (no school)
      await prisma.user.updateMany({
        where: { schoolId: id },
        data: { schoolId: null }
      })
    }

    // Delete school and related data in transaction
    await prisma.$transaction([
      prisma.lead.deleteMany({ where: { schoolId: id } }),
      prisma.campaign.deleteMany({ where: { schoolId: id } }),
      prisma.content.deleteMany({ where: { schoolId: id } }),
      prisma.school.delete({ where: { id } })
    ])

    const message = existingSchool._count.users > 0 
      ? `School deleted successfully. ${existingSchool._count.users} users have been unassigned from this school.`
      : 'School deleted successfully'

    return NextResponse.json({
      success: true,
      message
    })
  } catch (error) {
    console.error('Error deleting school:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
