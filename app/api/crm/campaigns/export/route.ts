import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { ensurePrismaConnection } from '@/lib/prisma'

const HEADERS = [
  'Title',
  'Description',
  'Type',
  'Status',
  'Start Date',
  'End Date',
  'Budget',
  'Reach',
  'Target Audience',
  'School',
  'Created At',
  'Updated At'
] as const

const escapeCsv = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const prisma = await ensurePrismaConnection()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || ''
    const statusFilter = searchParams.get('status') || ''
    const sortField = searchParams.get('sortField') || 'created_at'
    const sortDirection = (searchParams.get('sortDirection') || 'desc') as 'asc' | 'desc'
    const schoolIdParam = searchParams.get('schoolId')

    let schoolFilter: Record<string, string> = {}
    if (session.user.role === 'SUPERADMIN') {
      if (schoolIdParam) {
        schoolFilter = { schoolId: schoolIdParam }
      }
    } else {
      if (!session.user.schoolId) {
        return NextResponse.json(
          { error: 'Admin must be assigned to a school before exporting campaigns' },
          { status: 400 }
        )
      }
      schoolFilter = { schoolId: session.user.schoolId }
    }

    const whereClause: Record<string, unknown> = {
      ...schoolFilter,
      AND: [
        search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { targetAudience: { contains: search, mode: 'insensitive' } }
              ]
            }
          : {},
        type ? { type } : {},
        statusFilter ? { status: statusFilter } : {}
      ].filter(condition => Object.keys(condition).length > 0)
    }

    const orderBy: Record<string, 'asc' | 'desc'> = {}
    if (['title', 'description', 'type', 'status', 'targetAudience', 'created_at', 'updated_at', 'startDate', 'endDate'].includes(sortField)) {
      orderBy[sortField] = sortDirection
    } else {
      orderBy['created_at'] = 'desc'
    }

    const campaigns = await prisma.campaign.findMany({
      where: whereClause,
      include: {
        school: {
          select: {
            name: true
          }
        }
      },
      orderBy
    })

    const lines = [
      `\uFEFF${HEADERS.join(',')}`,
      ...campaigns.map(campaign =>
        [
          escapeCsv(campaign.title),
          escapeCsv(campaign.description ?? ''),
          escapeCsv(campaign.type),
          escapeCsv(campaign.status),
          escapeCsv(campaign.startDate ? campaign.startDate.toISOString() : ''),
          escapeCsv(campaign.endDate ? campaign.endDate.toISOString() : ''),
          escapeCsv(campaign.budget ?? ''),
          escapeCsv(campaign.reach ?? ''),
          escapeCsv(campaign.targetAudience ?? ''),
          escapeCsv(campaign.school?.name ?? ''),
          escapeCsv(campaign.created_at.toISOString()),
          escapeCsv(campaign.updated_at.toISOString())
        ].join(',')
      )
    ]

    const csv = lines.join('\r\n')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="campaigns-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error('Failed to export campaigns:', error)
    return NextResponse.json({ error: 'Failed to export campaigns' }, { status: 500 })
  }
}

