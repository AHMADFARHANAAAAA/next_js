import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { ensurePrismaConnection } from '@/lib/prisma'

// GET - Ambil semua campaigns untuk sekolah admin
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
    const sortField = searchParams.get('sortField') || 'created_at'
    const sortDirection = searchParams.get('sortDirection') || 'desc'

    console.log('Search parameters:', { search, status, type, page, limit, sortField, sortDirection })

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
            { description: { contains: search, mode: 'insensitive' } },
            { targetAudience: { contains: search, mode: 'insensitive' } }
          ]
        } : {},
        type ? { type } : {},
        status ? { status } : {}
      ].filter(condition => Object.keys(condition).length > 0)
    }

    console.log('Where clause:', whereClause)

    // Build order by clause
    const orderBy: Record<string, string> = {}
    if (sortField === 'created_at' || sortField === 'updated_at' || sortField === 'startDate' || sortField === 'endDate') {
      orderBy[sortField] = sortDirection
    } else if (sortField === 'title' || sortField === 'description' || sortField === 'type' || sortField === 'status' || sortField === 'targetAudience') {
      orderBy[sortField] = sortDirection
    } else if (sortField === 'budget' || sortField === 'reach') {
      orderBy[sortField] = sortDirection
    } else {
      orderBy['created_at'] = 'desc' // Default sort
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where: whereClause,
        include: {
          school: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: orderBy,
        skip,
        take: limit
      }),
      prisma.campaign.count({ where: whereClause })
    ])

    // Hitung statistik
    const stats = await prisma.campaign.groupBy({
      by: ['status'],
      where: schoolFilter,
      _count: {
        status: true
      }
    })

    const typeStats = await prisma.campaign.groupBy({
      by: ['type'],
      where: schoolFilter,
      _count: {
        type: true
      }
    })

    return NextResponse.json({
      campaigns,
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
    console.error('Error fetching campaigns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}

// POST - Tambah campaign baru
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Hanya ADMIN dan SUPERADMIN yang bisa menambah campaigns
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validasi khusus untuk ADMIN - harus memiliki schoolId
    if (session.user.role === 'ADMIN' && !session.user.schoolId) {
      return NextResponse.json(
        { error: 'Admin harus ditetapkan ke sekolah terlebih dahulu sebelum dapat menambah campaign' },
        { status: 400 }
      )
    }

    // Ensure database connection
    const prisma = await ensurePrismaConnection()

    const body = await request.json()
    const {
      title,
      description,
      type,
      status,
      startDate,
      endDate,
      budget,
      targetAudience,
      reach,
      schoolId
    } = body

    // Validasi input
    if (!title || !type) {
      return NextResponse.json(
        { error: 'Title and type are required' },
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

    const campaign = await prisma.campaign.create({
      data: {
        title,
        description,
        type,
        status: status || 'DRAFT',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        budget: budget ? parseFloat(budget) : null,
        targetAudience,
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

    return NextResponse.json(campaign, { status: 201 })

  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    )
  }
}
