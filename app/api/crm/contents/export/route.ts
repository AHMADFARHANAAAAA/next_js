import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { ensurePrismaConnection } from '@/lib/prisma'

const HEADERS = [
  'Title',
  'Type',
  'Status',
  'Publish Date',
  'Tags',
  'Social Media Link',
  'Social Media Platform',
  'Content',
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
    const typeFilter = searchParams.get('type') || ''
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
          { error: 'Admin must be assigned to a school before exporting contents' },
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
                { content: { contains: search, mode: 'insensitive' } }
              ]
            }
          : {},
        typeFilter ? { type: typeFilter } : {},
        statusFilter ? { status: statusFilter } : {}
      ].filter(condition => Object.keys(condition).length > 0)
    }

    const orderBy: Record<string, 'asc' | 'desc'> = {}
    if (['title', 'type', 'status', 'created_at', 'updated_at', 'publishDate'].includes(sortField)) {
      orderBy[sortField] = sortDirection
    } else {
      orderBy['created_at'] = 'desc'
    }

    const contents = await prisma.content.findMany({
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
      ...contents.map(item =>
        [
          escapeCsv(item.title),
          escapeCsv(item.type),
          escapeCsv(item.status),
          escapeCsv(item.publishDate ? item.publishDate.toISOString() : ''),
          escapeCsv(item.tags.join('; ')),
          escapeCsv(item.socialMediaLink ?? ''),
          escapeCsv(item.socialMediaPlatform ?? ''),
          escapeCsv(item.content),
          escapeCsv(item.school?.name ?? ''),
          escapeCsv(item.created_at.toISOString()),
          escapeCsv(item.updated_at.toISOString())
        ].join(',')
      )
    ]

    const csv = lines.join('\r\n')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="contents-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error('Failed to export contents:', error)
    return NextResponse.json({ error: 'Failed to export contents' }, { status: 500 })
  }
}

