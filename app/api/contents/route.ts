import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import prisma from '@/lib/prisma'

// PrismaClient singleton imported from lib/prisma

// GET - Ambil semua contents
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

    let contents
    if (user.role === 'SUPERADMIN') {
      contents = await prisma.content.findMany({
        include: {
          school: {
            select: { name: true }
          }
        },
        orderBy: { created_at: 'desc' }
      })
    } else if (user.role === 'ADMIN' && user.schoolId) {
      contents = await prisma.content.findMany({
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

    return NextResponse.json({ contents })
  } catch (error) {
    console.error('Error fetching contents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Tambah content baru
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
    const { title, type, content, publishDate, tags, schoolId } = body

    if (!title || !type || !content) {
      return NextResponse.json({ error: 'Title, type, and content are required' }, { status: 400 })
    }

    let targetSchoolId = schoolId
    if (user.role === 'ADMIN') {
      targetSchoolId = user.schoolId
    }

    if (!targetSchoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 })
    }

    const newContent = await prisma.content.create({
      data: {
        title,
        type,
        content,
        publishDate: publishDate ? new Date(publishDate) : null,
        tags: tags || [],
        schoolId: targetSchoolId,
      },
      include: {
        school: {
          select: { name: true }
        }
      }
    })

    return NextResponse.json({ content: newContent }, { status: 201 })
  } catch (error) {
    console.error('Error creating content:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}