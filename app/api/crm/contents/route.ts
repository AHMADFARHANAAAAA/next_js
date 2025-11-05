import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { ensurePrismaConnection } from '@/lib/prisma'

// GET - Ambil semua contents untuk sekolah admin
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Hanya ADMIN dan SUPERADMIN yang bisa mengakses
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Ensure database connection
    const prisma = await ensurePrismaConnection()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || ''
    const status = searchParams.get('status') || ''
    const schoolId = searchParams.get('schoolId')

    const skip = (page - 1) * limit

    // Smart school filtering logic
    let schoolFilter = {}
    if (session.user.role === 'SUPERADMIN') {
      // If superadmin provides schoolId, filter by that school
      if (schoolId) {
        schoolFilter = { schoolId }
      }
      // If no schoolId provided, show all schools (no filter)
    } else {
      // For regular admins, always filter by their school
      schoolFilter = { schoolId: session.user.schoolId || '' }
    }

    // Build where clause
    const whereClause: Record<string, unknown> = {
      ...schoolFilter,
      AND: [
        search ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { content: { contains: search, mode: 'insensitive' } }
          ]
        } : {},
        type ? { type } : {},
        status ? { status } : {}
      ].filter(condition => Object.keys(condition).length > 0)
    }

    const [contents, total] = await Promise.all([
      prisma.content.findMany({
        where: whereClause,
        include: {
          school: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      }),
      prisma.content.count({ where: whereClause })
    ])

    // Hitung statistik
    const stats = await prisma.content.groupBy({
      by: ['status'],
      where: schoolFilter,
      _count: {
        status: true
      }
    })

    const typeStats = await prisma.content.groupBy({
      by: ['type'],
      where: schoolFilter,
      _count: {
        type: true
      }
    })

    return NextResponse.json({
      contents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        byStatus: stats,
        byType: typeStats
      }
    })

  } catch (error) {
    console.error('Error fetching contents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contents' },
      { status: 500 }
    )
  }
}

// POST - Tambah content baru
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Hanya ADMIN dan SUPERADMIN yang bisa menambah contents
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validasi khusus untuk ADMIN - harus memiliki schoolId
    if (session.user.role === 'ADMIN' && !session.user.schoolId) {
      return NextResponse.json(
        { error: 'Admin harus ditetapkan ke sekolah terlebih dahulu sebelum dapat menambah konten' },
        { status: 400 }
      )
    }

    // Ensure database connection
    const prisma = await ensurePrismaConnection()

    const body = await request.json()
    const {
      title,
      type,
      content,
      status,
      publishDate,
      tags,
      socialMediaLink,
      socialMediaPlatform,
      reach,
      schoolId
    } = body

    const normalizedTags = Array.isArray(tags)
      ? tags
      : typeof tags === 'string'
        ? tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : []

    const normalizedPlatform =
      typeof socialMediaPlatform === 'string' && socialMediaPlatform.trim()
        ? socialMediaPlatform.trim().toUpperCase()
        : null

    // Validasi input
    if (!title || !type || !content) {
      return NextResponse.json(
        { error: 'Title, type, and content are required' },
        { status: 400 }
      )
    }

    // Tentukan schoolId berdasarkan role
    let targetSchoolId = schoolId
    if (session.user.role === 'ADMIN') {
      targetSchoolId = session.user.schoolId
    }

    if (!targetSchoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      )
    }

    // Validasi school exists
    const school = await prisma.school.findUnique({
      where: { id: targetSchoolId }
    })

    if (!school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    const newContent = await prisma.content.create({
      data: {
        title,
        type,
        content,
        status: status || 'DRAFT',
        publishDate: publishDate ? new Date(publishDate) : null,
        tags: normalizedTags,
        socialMediaLink: socialMediaLink || null,
        socialMediaPlatform: normalizedPlatform,
        reach: reach ? parseInt(reach) : null,
        schoolId: targetSchoolId
      },
      include: {
        school: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(newContent, { status: 201 })

  } catch (error) {
    console.error('Error creating content:', error)
    return NextResponse.json(
      { error: 'Failed to create content' },
      { status: 500 }
    )
  }
}
