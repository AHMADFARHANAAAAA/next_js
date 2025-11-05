import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { ensurePrismaConnection } from '@/lib/prisma'
import { CampaignStatus, CampaignType } from '@prisma/client'
import csv from 'csv-parser'
import { Readable } from 'stream'

interface ImportSummary {
  successCount: number
  errorCount: number
  errors: string[]
}

const CAMPAIGN_TYPE_MAP: Record<string, CampaignType> = {
  EMAIL: 'EMAIL',
  'E-MAIL': 'EMAIL',
  'EMAIL_CAMPAIGN': 'EMAIL',
  SOCIAL_MEDIA: 'SOCIAL_MEDIA',
  'SOCIAL MEDIA': 'SOCIAL_MEDIA',
  FACEBOOK: 'SOCIAL_MEDIA',
  INSTAGRAM: 'SOCIAL_MEDIA',
  DIGITAL: 'DIGITAL',
  ONLINE: 'DIGITAL',
  PRINT: 'PRINT',
  OFFLINE: 'PRINT',
  EVENT: 'EVENT',
  EVENTS: 'EVENT'
}

const CAMPAIGN_STATUS_MAP: Record<string, CampaignStatus> = {
  DRAFT: 'DRAFT',
  'IN DRAFT': 'DRAFT',
  ACTIVE: 'ACTIVE',
  RUNNING: 'ACTIVE',
  LIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  HOLD: 'PAUSED',
  COMPLETED: 'COMPLETED',
  FINISHED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  CANCELED: 'CANCELLED',
  STOPPED: 'CANCELLED'
}

const HEADER_KEYS = {
  title: ['title', 'campaign title', 'nama campaign'],
  description: ['description', 'deskripsi'],
  type: ['type', 'campaign type', 'jenis'],
  status: ['status', 'campaign status'],
  startDate: ['start date', 'start_date', 'mulai'],
  endDate: ['end date', 'end_date', 'selesai'],
  budget: ['budget', 'anggaran'],
  targetAudience: ['target audience', 'audience', 'segment'],
  reach: ['reach', 'impressions', 'jangkauan'],
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

const resolveCampaignType = (value: string | null | undefined): CampaignType | null => {
  const key = normalizeKey(value)
  if (!key) return null
  return CAMPAIGN_TYPE_MAP[key] ?? null
}

const resolveCampaignStatus = (value: string | null | undefined): CampaignStatus => {
  const key = normalizeKey(value)
  return CAMPAIGN_STATUS_MAP[key] ?? 'DRAFT'
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

const parseNumber = (value: string | null | undefined): number | null => {
  if (!value) return null
  const cleaned = value.replace(/[^0-9.-]/g, '')
  if (!cleaned) return null
  const parsed = Number.parseFloat(cleaned)
  return Number.isNaN(parsed) ? null : parsed
}

const parseInteger = (value: string | null | undefined): number | null => {
  if (!value) return null
  const cleaned = value.replace(/[^0-9-]/g, '')
  if (!cleaned) return null
  const parsed = Number.parseInt(cleaned, 10)
  return Number.isNaN(parsed) ? null : parsed
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
        { error: 'School ID is required to import campaigns' },
        { status: 400 }
      )
    }

    if (session.user.role === 'ADMIN' && session.user.schoolId !== targetSchoolId) {
      return NextResponse.json(
        { error: 'Admins can only import campaigns for their assigned school' },
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
        const resolvedType = resolveCampaignType(typeInput)
        if (!resolvedType) {
          throw new Error(`Unknown campaign type: "${typeInput}"`)
        }

        const statusInput = getValue(record, HEADER_KEYS.status)
        const resolvedStatus = resolveCampaignStatus(statusInput)

        const description = getValue(record, HEADER_KEYS.description) || null
        const targetAudience = getValue(record, HEADER_KEYS.targetAudience) || null

        const startDateValue = getValue(record, HEADER_KEYS.startDate)
        const endDateValue = getValue(record, HEADER_KEYS.endDate)
        const startDate = parseDate(startDateValue)
        const endDate = parseDate(endDateValue)

        const budgetValue = getValue(record, HEADER_KEYS.budget)
        const reachValue = getValue(record, HEADER_KEYS.reach)
        const budget = parseNumber(budgetValue)
        const reach = parseInteger(reachValue)

        const campaignSchoolId =
          session.user.role === 'SUPERADMIN'
            ? (getValue(record, HEADER_KEYS.school) || targetSchoolId)
            : targetSchoolId

        if (!campaignSchoolId) {
          throw new Error('School ID is missing for this row')
        }

        const existingCampaign = await prisma.campaign.findFirst({
          where: {
            schoolId: campaignSchoolId,
            title: { equals: title, mode: 'insensitive' }
          }
        })

        if (existingCampaign) {
          await prisma.campaign.update({
            where: { id: existingCampaign.id },
            data: {
              description,
              type: resolvedType,
              status: resolvedStatus,
              startDate,
              endDate,
              budget,
              targetAudience,
              reach,
              updated_at: new Date()
            }
          })
        } else {
          await prisma.campaign.create({
            data: {
              title,
              description,
              type: resolvedType,
              status: resolvedStatus,
              startDate,
              endDate,
              budget,
              targetAudience,
              reach,
              schoolId: campaignSchoolId
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
          ? `Successfully imported ${summary.successCount} campaigns`
          : `Imported ${summary.successCount} campaigns with ${summary.errorCount} errors`,
      details: summary
    })
  } catch (error) {
    console.error('Campaign CSV import failed:', error)
    return NextResponse.json(
      { error: 'Internal server error while importing campaigns' },
      { status: 500 }
    )
  }
}

