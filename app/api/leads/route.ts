import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import prisma from '@/lib/prisma'

// PrismaClient singleton imported from lib/prisma

// GET - Ambil semua leads berdasarkan school
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

    // SUPERADMIN bisa lihat semua leads, ADMIN hanya untuk schoolnya
    let leads
    if (user.role === 'SUPERADMIN') {
      leads = await prisma.lead.findMany({
        include: {
          school: {
            select: { name: true }
          }
        },
        orderBy: { created_at: 'desc' }
      })
    } else if (user.role === 'ADMIN' && user.schoolId) {
      leads = await prisma.lead.findMany({
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

    return NextResponse.json({ leads })
  } catch (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Tambah lead baru
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
    const { name, email, phone, source, notes, schoolId } = body

    // Validation
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    // Determine schoolId
    let targetSchoolId = schoolId
    if (user.role === 'ADMIN') {
      targetSchoolId = user.schoolId // Admin hanya bisa add ke schoolnya
    }

    if (!targetSchoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 })
    }

    const lead = await prisma.lead.create({
      data: {
        parentName: name,
        parentEmail: email,
        parentPhone: phone,
        infoSource: source,
        notes,
        schoolId: targetSchoolId,
      },
      include: {
        school: {
          select: { name: true }
        }
      }
    })

    return NextResponse.json({ lead }, { status: 201 })
  } catch (error) {
    console.error('Error creating lead:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}