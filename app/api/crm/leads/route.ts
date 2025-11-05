import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { ensurePrismaConnection } from '@/lib/prisma'

// PrismaClient singleton imported from lib/prisma

// GET - Ambil semua leads untuk sekolah admin
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
    const status = searchParams.get('status') || ''
    const source = searchParams.get('source') || ''
    const grade = searchParams.get('grade') || ''
    const sortField = searchParams.get('sortField') || 'created_at'
    const sortDirection = searchParams.get('sortDirection') || 'desc'
    const schoolIdParam = searchParams.get('schoolId') // For superadmin access

    const skip = (page - 1) * limit

    // Build orderBy object based on sortField and sortDirection
    const orderBy: Record<string, string> = {}
    
    // Map frontend field names to database field names
    const fieldMapping: Record<string, string> = {
      'id': 'id',
      'parentName': 'parentName',
      'parentPhone': 'parentPhone', 
      'parentEmail': 'parentEmail',
      'studentName': 'studentName',
      'schoolOrigin': 'schoolOrigin',
      'gradeTarget': 'gradeTarget',
      'enrollmentYear': 'enrollmentYear',
      'domicile': 'domicile',
      'infoSource': 'infoSource',
      'dateContact': 'dateContact',
      'leadMonth': 'leadMonth',
      'status': 'status',
      'notes': 'notes',
      'created_at': 'created_at'
    }
    
    const dbField = fieldMapping[sortField] || 'created_at'
    orderBy[dbField] = sortDirection === 'desc' ? 'desc' : 'asc'

    // Filter berdasarkan role dan schoolId parameter
    let schoolFilter: Record<string, string> = {}
    
    if (session.user.role === 'SUPERADMIN') {
      // Jika superadmin dan ada schoolId parameter, filter berdasarkan schoolId tersebut
      if (schoolIdParam) {
        schoolFilter = { schoolId: schoolIdParam }
      }
      // Jika superadmin tapi tidak ada schoolId parameter, tampilkan semua data (default behavior)
    } else {
      // Jika bukan superadmin, filter berdasarkan schoolId user
      schoolFilter = { schoolId: session.user.schoolId || '' }
    }

    // Build where clause with improved search
    const whereClause: Record<string, unknown> = {
      ...schoolFilter
    }

    // Add search conditions
    if (search && search.trim()) {
      const searchTerm = search.trim()
      const searchConditions: Record<string, unknown>[] = [
        { parentName: { contains: searchTerm, mode: 'insensitive' } },
        { parentEmail: { contains: searchTerm, mode: 'insensitive' } },
        { parentPhone: { contains: searchTerm, mode: 'insensitive' } },
        { studentName: { contains: searchTerm, mode: 'insensitive' } },
        { schoolOrigin: { contains: searchTerm, mode: 'insensitive' } },
        { gradeTarget: { contains: searchTerm, mode: 'insensitive' } },
        { enrollmentYear: { contains: searchTerm, mode: 'insensitive' } },
        { domicile: { contains: searchTerm, mode: 'insensitive' } },
        { infoSource: { contains: searchTerm, mode: 'insensitive' } },
        { leadMonth: { contains: searchTerm, mode: 'insensitive' } },
        { notes: { contains: searchTerm, mode: 'insensitive' } }
      ]
      
      // Add status search if the search term matches any status
      const statusValues = ['NEW', 'KONTAK_VIA_WA', 'BAYAR_FORM_PRE', 'BAYAR_UP_OFFICIAL', 'POTENSI_WARM', 'TIDAK_RESPON', 'TIDAK_POTENSI_COLD']
      const matchingStatus = statusValues.find(status => 
        status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        status.replace(/_/g, ' ').toLowerCase().includes(searchTerm.toLowerCase())
      )
      
      if (matchingStatus) {
        searchConditions.push({ status: matchingStatus })
      }
      
      whereClause.AND = [{ OR: searchConditions }]
    }

    // Add additional filters
    const additionalFilters: Record<string, unknown>[] = []
    
    if (status && status.trim()) {
      additionalFilters.push({ status: status.trim() })
    }

    if (source && source.trim()) {
      additionalFilters.push({ infoSource: { contains: source.trim(), mode: 'insensitive' } })
    }

    if (grade && grade.trim()) {
      additionalFilters.push({ gradeTarget: { contains: grade.trim(), mode: 'insensitive' } })
    }

    if (additionalFilters.length > 0) {
      whereClause.AND = whereClause.AND ? [...(whereClause.AND as Record<string, unknown>[]), ...additionalFilters] : additionalFilters
    }

    console.log('Search parameters:', { search, status, source, grade, page, limit })
    console.log('Where clause:', JSON.stringify(whereClause, null, 2))

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
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
      prisma.lead.count({ where: whereClause })
    ])

    // Hitung statistik
    const stats = await prisma.lead.groupBy({
      by: ['status'],
      where: schoolFilter,
      _count: {
        status: true
      }
    })

    const sourceStats = await prisma.lead.groupBy({
      by: ['infoSource'],
      where: schoolFilter,
      _count: {
        infoSource: true
      }
    })

    // Hitung statistik bulanan (12 bulan terakhir)
    const currentDate = new Date()
    const monthlyStats = []
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 1)
      
      const monthName = date.toLocaleString('en-US', { month: 'short' })
      
      // Total leads untuk bulan ini
      const totalLeads = await prisma.lead.count({
        where: {
          ...schoolFilter,
          created_at: {
            gte: date,
            lt: nextDate
          }
        }
      })
      
      // Converted leads (BAYAR_UP_OFFICIAL) untuk bulan ini
      const convertedLeads = await prisma.lead.count({
        where: {
          ...schoolFilter,
          status: 'BAYAR_UP_OFFICIAL',
          created_at: {
            gte: date,
            lt: nextDate
          }
        }
      })
      
      monthlyStats.push({
        month: monthName,
        totalLeads,
        convertedLeads,
        conversionRate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0
      })
    }

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        byStatus: stats,
        bySource: sourceStats,
        monthly: monthlyStats
      }
    })

  } catch (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leads', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST - Tambah lead baru
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Hanya ADMIN dan SUPERADMIN yang bisa menambah leads
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const prisma = await ensurePrismaConnection()

    const body = await request.json()
    const {
      parentName,
      parentPhone,
      parentEmail,
      studentName,
      schoolOrigin,
      gradeTarget,
      enrollmentYear,
      domicile,
      infoSource,
      dateContact,
      leadMonth,
      status,
      customerJourney,
      notes,
      nextFollowUp,
      schoolId
    } = body

    // Validasi input
    if (!parentName) {
      return NextResponse.json(
        { error: 'Parent name is required' },
        { status: 400 }
      )
    }

    // Tentukan schoolId berdasarkan role
    let targetSchoolId = schoolId
    if (session.user.role === 'ADMIN') {
      // Check if admin has assigned school
      if (!session.user.schoolId) {
        return NextResponse.json(
          { error: 'Anda belum ditugaskan ke sekolah manapun. Hubungi Super Admin untuk penugasan sekolah.' },
          { status: 403 }
        )
      }
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

    const lead = await prisma.lead.create({
      data: {
        parentName,
        parentPhone,
        parentEmail,
        studentName,
        schoolOrigin,
        gradeTarget,
        enrollmentYear,
        domicile,
        infoSource,
        dateContact: dateContact ? new Date(dateContact) : null,
        leadMonth,
        status: status || 'NEW',
        customerJourney,
        notes,
        nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null,
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

    return NextResponse.json(lead, { status: 201 })

  } catch (error) {
    console.error('Error creating lead:', error)
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    )
  }
}
