import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import prisma from '@/lib/prisma'

// PrismaClient singleton imported from lib/prisma

// GET - Ambil semua campaigns
export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { role: true, schoolId: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let campaigns
    if (user.role === 'SUPERADMIN') {
      campaigns = await prisma.campaign.findMany({
        include: {
          school: {
            select: { name: true }
          }
        },
        orderBy: { created_at: 'desc' }
      })
    } else if (user.role === 'ADMIN' && user.schoolId) {
      campaigns = await prisma.campaign.findMany({
        where: { schoolId: user.schoolId },
        include: {
          school: {
            select: { name: true }
          }
        },
        orderBy: { created_at: 'desc' }
      })
    } else {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ campaigns })
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Tambah campaign baru
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { role: true, schoolId: true }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, type, startDate, endDate, budget, targetAudience, schoolId } = body

    if (!title || !type) {
      return NextResponse.json({ error: 'Title and type are required' }, { status: 400 })
    }

    let targetSchoolId = schoolId
    if (user.role === 'ADMIN') {
      targetSchoolId = user.schoolId
    }

    if (!targetSchoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 })
    }

    const campaign = await prisma.campaign.create({
      data: {
        title,
        description,
        type,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        budget: budget ? parseFloat(budget) : null,
        targetAudience,
        schoolId: targetSchoolId,
      },
      include: {
        school: {
          select: { name: true }
        }
      }
    })

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}