import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { ensurePrismaConnection } from '@/lib/prisma'
import { ContentStatus, ContentType } from '@prisma/client'
import csv from 'csv-parser'
import { Readable } from 'stream'

interface ImportSummary {
  successCount: number
  errorCount: number
  errors: string[]
}

const CONTENT_TYPE_MAP: Record<string, ContentType> = {
  ARTICLE: 'ARTICLE',
  'BLOG': 'ARTICLE',
  BLOGPOST: 'ARTICLE',
  IMAGE: 'IMAGE',
  PHOTO: 'IMAGE',
  GRAPHIC: 'IMAGE',
  VIDEO: 'VIDEO',
  'SOCIAL POST': 'SOCIAL_POST',
  'SOCIAL_POST': 'SOCIAL_POST',
  POST: 'SOCIAL_POST',
  NEWSLETTER: 'NEWSLETTER',
  EMAIL: 'NEWSLETTER'
}

const CONTENT_STATUS_MAP: Record<string, ContentStatus> = {
  DRAFT: 'DRAFT',
  'IN DRAFT': 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  LIVE: 'PUBLISHED',
  SCHEDULED: 'SCHEDULED',
  PLANNED: 'SCHEDULED',
  ARCHIVED: 'ARCHIVED',
  ARCHIVE: 'ARCHIVED'
}

const HEADER_KEYS = {
  title: ['title', 'content title', 'judul'],
  type: ['type', 'content type', 'jenis konten'],
  status: ['status', 'content status'],
  publishDate: ['publish date', 'publish_date', 'tanggal publish'],
  tags: ['tags', 'label'],
  socialMediaLink: ['social media link', 'link', 'url'],
  socialMediaPlatform: ['social media platform', 'platform'],
  content: ['content', 'body', 'deskripsi konten'],
  school: ['school id', 'school', 'sekolah id']
}

const getValue = (record: Record<string, string>, keys: string[]) => {
  for (const key of keys) {
    const found = record[key] ?? record[key.toLowerCase()] ?? record[key.toUpperCase()]
    if (found !== undefined) {
      return typeof found === 'string' ? found.trim() : found
    }
  }
  return ''
}

const normalizeKey = (value: string | null | undefined) => {
  if (!value) return ''
  return value.trim().replace(/\s+/g, ' ').toUpperCase()
}

const resolveContentType = (value: string | null | undefined): ContentType | null => {
  const key = normalizeKey(value)
  if (!key) return null
  return CONTENT_TYPE_MAP[key] ?? null
}

const resolveContentStatus = (value: string | null | undefined): ContentStatus => {
  const key = normalizeKey(value)
  return CONTENT_STATUS_MAP[key] ?? 'DRAFT'
}

const parseDate = (value: string | null | undefined): Date | null => {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const direct = new Date(trimmed)
  if (!Number.isNaN(direct.getTime())) {
    return direct
  }

  const normalized = trimmed.replace(/\//g, '-')
  const parts = normalized.split('-')
  if (parts.length === 3) {
    const [first, second, third] = parts
    const isYearFirst = first.length === 4
    const year = isYearFirst ? parseInt(first, 10) : parseInt(third, 10)
    const month = isYearFirst ? parseInt(second, 10) - 1 : parseInt(second, 10) - 1
    const day = isYearFirst ? parseInt(third, 10) : parseInt(first, 10)
    if (
      !Number.isNaN(year) &&
      !Number.isNaN(month) &&
      !Number.isNaN(day)
    ) {
      const candidate = new Date(year, month, day)
      if (!Number.isNaN(candidate.getTime())) {
        return candidate
      }
    }
  }

  return null
}

const parseTags = (value: string | null | undefined): string[] => {
  if (!value) return []
  return value
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
}

const normalizePlatform = (value: string | null | undefined): string | null => {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.toUpperCase()
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['ADMIN', 'SUPERADMIN'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const schoolFromForm = formData.get('schoolId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'CSV file is required' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ error: 'Only CSV files are supported' }, { status: 400 })
    }

    const targetSchoolId =
      session.user.role === 'SUPERADMIN'
        ? schoolFromForm || null
        : session.user.schoolId || null

    if (!targetSchoolId) {
      return NextResponse.json(
        { error: 'School ID is required to import contents' },
        { status: 400 }
      )
    }

    if (session.user.role === 'ADMIN' && session.user.schoolId !== targetSchoolId) {
      return NextResponse.json(
        { error: 'Admins can only import contents for their assigned school' },
        { status: 403 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const records: Record<string, string>[] = []

    await new Promise((resolve, reject) => {
      const stream = Readable.from(buffer)
      stream
        .pipe(csv())
        .on('data', data => records.push(data))
        .on('end', resolve)
        .on('error', reject)
    })

    if (records.length === 0) {
      return NextResponse.json({ error: 'CSV file is empty or invalid' }, { status: 400 })
    }

    const prisma = await ensurePrismaConnection()
    const summary: ImportSummary = { successCount: 0, errorCount: 0, errors: [] }

    for (let index = 0; index < records.length; index += 1) {
      const record = records[index]
      try {
        const title = getValue(record, HEADER_KEYS.title)
        if (!title) {
          throw new Error('Title is required')
        }

        const typeInput = getValue(record, HEADER_KEYS.type)
        const resolvedType = resolveContentType(typeInput)
        if (!resolvedType) {
          throw new Error(`Unknown content type: "${typeInput}"`)
        }

        const statusInput = getValue(record, HEADER_KEYS.status)
        const resolvedStatus = resolveContentStatus(statusInput)

        const publishDateInput = getValue(record, HEADER_KEYS.publishDate)
        const publishDate = parseDate(publishDateInput)

        const tagsValue = getValue(record, HEADER_KEYS.tags)
        const tags = parseTags(tagsValue)

        const socialMediaLink = getValue(record, HEADER_KEYS.socialMediaLink) || null
        const socialMediaPlatform = normalizePlatform(getValue(record, HEADER_KEYS.socialMediaPlatform))

        const contentBody = getValue(record, HEADER_KEYS.content)
        if (!contentBody) {
          throw new Error('Content body is required')
        }

        const contentSchoolId =
          session.user.role === 'SUPERADMIN'
            ? (getValue(record, HEADER_KEYS.school) || targetSchoolId)
            : targetSchoolId

        if (!contentSchoolId) {
          throw new Error('School ID is missing for this row')
        }

        const existingContent = await prisma.content.findFirst({
          where: {
            schoolId: contentSchoolId,
            title: { equals: title, mode: 'insensitive' }
          }
        })

        if (existingContent) {
          await prisma.content.update({
            where: { id: existingContent.id },
            data: {
              type: resolvedType,
              status: resolvedStatus,
              publishDate,
              tags,
              socialMediaLink,
              socialMediaPlatform,
              content: contentBody,
              updated_at: new Date()
            }
          })
        } else {
          await prisma.content.create({
            data: {
              title,
              type: resolvedType,
              status: resolvedStatus,
              publishDate,
              tags,
              socialMediaLink,
              socialMediaPlatform,
              content: contentBody,
              schoolId: contentSchoolId
            }
          })
        }

        summary.successCount += 1
      } catch (error) {
        summary.errorCount += 1
        const message = error instanceof Error ? error.message : 'Unknown error'
        summary.errors.push(`Row ${index + 1}: ${message}`)
      }
    }

    return NextResponse.json({
      success: summary.errorCount === 0,
      message:
        summary.errorCount === 0
          ? `Successfully imported ${summary.successCount} contents`
          : `Imported ${summary.successCount} contents with ${summary.errorCount} errors`,
      details: summary
    })
  } catch (error) {
    console.error('Content CSV import failed:', error)
    return NextResponse.json(
      { error: 'Internal server error while importing contents' },
      { status: 500 }
    )
  }
}
