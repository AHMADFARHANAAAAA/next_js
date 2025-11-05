import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'

type Role = 'ADMIN' | 'SUPERADMIN' | 'USER' | string

const CONVERTED_STATUSES = new Set(['CONVERTED', 'BAYAR_UP_OFFICIAL', 'PAID', 'ENROLLED', 'OFFICIAL'])
const CONSIDERATION_STATUSES = new Set(['KONTAK_VIA_WA', 'BAYAR_FORM_PRE', 'POTENSI_WARM', 'SURVEY_SEKOLAH'])
const OFFICIAL_STATUS = 'BAYAR_UP_OFFICIAL'
const SCHOLARSHIP_STATUS = 'SCHOLARSHIP'
const LOST_STATUSES = new Set(['LOST', 'TIDAK_POTENSI_COLD', 'TIDAK_RESPON'])

const includesKeyword = (value: string | null | undefined, keywords: string[]) => {
  if (!value) return false
  const lower = value.toLowerCase()
  return keywords.some(keyword => lower.includes(keyword))
}

const safeDivide = (numerator: number, denominator: number) => {
  if (!denominator) return 0
  return numerator / denominator
}

const percentage = (numerator: number, denominator: number) => safeDivide(numerator, denominator) * 100

const academicYearLabel = (now: Date) => {
  const month = now.getMonth() // 0 indexed
  const currentYear = now.getFullYear()
  const startYear = month >= 6 ? currentYear : currentYear - 1
  const endYear = startYear + 1
  return `${startYear}-${endYear}`
}

interface MonthBucket {
  key: string
  label: string
  awareness: number
  consideration: number
  action: number
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const querySchoolId = searchParams.get('schoolId')

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role as Role
    if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let schoolId: string | undefined

    if (role === 'ADMIN') {
      schoolId = session.user.schoolId || undefined
      if (!schoolId) {
        return NextResponse.json(
          { error: 'No school assigned to this admin account' },
          { status: 400 }
        )
      }
    } else if (role === 'SUPERADMIN') {
      schoolId = querySchoolId || undefined
    }

    const whereSchool = schoolId ? { schoolId } : {}

    const [leads, campaigns, contents, school] = await Promise.all([
      prisma.lead.findMany({
        where: whereSchool,
        select: {
          status: true,
          infoSource: true,
          domicile: true,
          gradeTarget: true,
          customerJourney: true,
          notes: true,
          created_at: true,
          dateContact: true
        }
      }),
      prisma.campaign.findMany({
        where: whereSchool,
        select: {
          reach: true,
          budget: true,
          type: true,
          title: true
        }
      }),
      prisma.content.findMany({
        where: whereSchool,
        select: {
          socialMediaPlatform: true,
          tags: true
        }
      }),
      schoolId
        ? prisma.school.findUnique({
            where: { id: schoolId },
            select: { id: true, name: true }
          })
        : null
    ])

    const totalLeads = leads.length
    const totalCampaigns = campaigns.length
    const totalContents = contents.length

    const convertedLeads = leads.filter(lead => CONVERTED_STATUSES.has(lead.status)).length
    const lostLeads = leads.filter(lead => LOST_STATUSES.has(lead.status)).length
    const preRegistrations = leads.filter(lead => lead.status === 'BAYAR_FORM_PRE').length
    const officialPayments = leads.filter(lead => lead.status === OFFICIAL_STATUS).length

    const totalCampaignReach = campaigns.reduce((acc, campaign) => acc + (campaign.reach ?? 0), 0)
    const totalCampaignBudget = campaigns.reduce((acc, campaign) => acc + (campaign.budget ?? 0), 0)

    const instagramContents = contents.filter(content => content.socialMediaPlatform === 'INSTAGRAM').length
    const tikTokContents = contents.filter(content => content.socialMediaPlatform === 'TIKTOK').length
    const viralContents = contents.filter(content =>
      content.tags?.some(tag => tag.toLowerCase().includes('viral') || tag.toLowerCase().includes('500k'))
    ).length

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const leadsToday = leads.filter(lead =>
      lead.created_at >= todayStart && lead.created_at < todayEnd
    ).length

    const websiteLeads = leads.filter(lead =>
      includesKeyword(lead.infoSource, ['website']) &&
      lead.created_at >= currentMonthStart &&
      lead.created_at < nextMonthStart
    ).length

    const whatsappLeads = leads.filter(lead =>
      lead.status === 'KONTAK_VIA_WA' || includesKeyword(lead.infoSource, ['whatsapp', 'wa', 'dm'])
    ).length

    const openHouseEngagements =
      campaigns.filter(campaign => campaign.title.toLowerCase().includes('open house')).length +
      leads.filter(lead => includesKeyword(lead.infoSource, ['open house'])).length

    const eventCampaigns = campaigns.filter(campaign => campaign.type === 'EVENT').length

    const schoolVisits = leads.filter(lead =>
      lead.status === 'SURVEY_SEKOLAH' || includesKeyword(lead.infoSource, ['visit', 'survey'])
    ).length

    const scholarshipLeads = leads.filter(
      lead => lead.status?.toUpperCase() === SCHOLARSHIP_STATUS
    ).length

    const retentionLeads = leads.filter(lead =>
      includesKeyword(lead.customerJourney, ['retention', 'retensi'])
    ).length

    const newLeadsTarget = Math.round(Math.max(totalLeads * 1.4, convertedLeads + 40))
    const conversionRate = percentage(officialPayments, totalLeads)
    const preRegistrationRate = percentage(preRegistrations, totalLeads)
    const officialRate = conversionRate
    const retentionRate = percentage(retentionLeads, totalLeads)
    const costPerLeadPre = preRegistrations > 0 ? Math.round(totalCampaignBudget / preRegistrations) : 0
    const costPerOfficialLead = officialPayments > 0 ? Math.round(totalCampaignBudget / officialPayments) : 0
    const npsScore = Math.max(0, Math.min(100, (convertedLeads - lostLeads <= 0 || totalLeads === 0)
      ? 0
      : ((convertedLeads - lostLeads) / totalLeads) * 100))

    const totalLeadsNeeded =
      conversionRate > 0 ? Math.round(officialPayments / (conversionRate / 100)) : totalLeads

    const leadsThisYear = leads.filter(lead => {
      const referenceDate = lead.dateContact ?? lead.created_at
      return referenceDate.getFullYear() === now.getFullYear()
    }).length
    const leadsLastYear = leads.filter(lead => {
      const referenceDate = lead.dateContact ?? lead.created_at
      return referenceDate.getFullYear() === now.getFullYear() - 1
    }).length

    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const leadsThisMonth = leads.filter(lead => {
      const referenceDate = lead.dateContact ?? lead.created_at
      return referenceDate >= currentMonthStart && referenceDate < nextMonthStart
    }).length
    const leadsPreviousMonth = leads.filter(lead => {
      const referenceDate = lead.dateContact ?? lead.created_at
      return referenceDate >= previousMonthStart && referenceDate < currentMonthStart
    }).length

    const yoyEnrollmentGrowth = leadsLastYear === 0
      ? (leadsThisYear > 0 ? 100 : 0)
      : ((leadsThisYear - leadsLastYear) / leadsLastYear) * 100

    const momEnrollmentGrowth = leadsPreviousMonth === 0
      ? (leadsThisMonth > 0 ? 100 : 0)
      : ((leadsThisMonth - leadsPreviousMonth) / leadsPreviousMonth) * 100

    const infoSourceCounts = leads.reduce<Record<string, number>>((acc, lead) => {
      const key = lead.infoSource?.trim() || 'Tidak diketahui'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    const totalLeadsWithSource = Object.values(infoSourceCounts).reduce((acc, count) => acc + count, 0)

    const topLeadSources = Object.entries(infoSourceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([source, count]) => ({
        source,
        count,
        percentage: percentage(count, totalLeadsWithSource)
      }))

    const domicileCounts = leads.reduce<Record<string, number>>((acc, lead) => {
      const key = lead.domicile?.trim() || 'Tidak diketahui'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    const totalLeadsWithDomicile = Object.values(domicileCounts).reduce((acc, count) => acc + count, 0)

    const leadDemographics = Object.entries(domicileCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label, count]) => ({
        label,
        count,
        percentage: percentage(count, totalLeadsWithDomicile)
      }))

    // Grade distribution analysis
    const gradeMapping: Record<string, string> = {
      'PG': 'PG',
      'PLAYGROUP': 'PG',
      'PLAY GROUP': 'PG',
      'TK': 'TK',
      'TK A': 'TK',
      'TK B': 'TK',
      'KINDERGARTEN': 'TK',
      'SD': 'SD',
      'G1': 'SD',
      'G2': 'SD',
      'G3': 'SD',
      'G4': 'SD',
      'G5': 'SD',
      'G6': 'SD',
      'GRADE 1': 'SD',
      'GRADE 2': 'SD',
      'GRADE 3': 'SD',
      'GRADE 4': 'SD',
      'GRADE 5': 'SD',
      'GRADE 6': 'SD',
      'G1 (GRADE 1)': 'SD',
      'G2 (GRADE 2)': 'SD',
      'G3 (GRADE 3)': 'SD',
      'G4 (GRADE 4)': 'SD',
      'G5 (GRADE 5)': 'SD',
      'G6 (GRADE 6)': 'SD',
      'SMP': 'SMP',
      'G7': 'SMP',
      'G8': 'SMP',
      'G9': 'SMP',
      'GRADE 7': 'SMP',
      'GRADE 8': 'SMP',
      'GRADE 9': 'SMP',
      'G7 (GRADE 7)': 'SMP',
      'G8 (GRADE 8)': 'SMP',
      'G9 (GRADE 9)': 'SMP',
      'SMA': 'SMA',
      'G10': 'SMA',
      'G11': 'SMA',
      'G12': 'SMA',
      'GRADE 10': 'SMA',
      'GRADE 11': 'SMA',
      'GRADE 12': 'SMA',
      'G10 (GRADE 10)': 'SMA',
      'G11 (GRADE 11)': 'SMA',
      'G12 (GRADE 12)': 'SMA',
    }

    const gradeYearCounts = leads.reduce<Record<string, Record<string, number>>>((acc, lead) => {
      const referenceDate = lead.dateContact ?? lead.created_at
      const academicYear = referenceDate.getMonth() >= 6 
        ? `${referenceDate.getFullYear()}/${String(referenceDate.getFullYear() + 1).slice(2)}`
        : `${referenceDate.getFullYear() - 1}/${String(referenceDate.getFullYear()).slice(2)}`
      
      const gradeRaw = lead.gradeTarget?.toUpperCase()?.trim() || 'UNKNOWN'
      const gradeCategory = gradeMapping[gradeRaw] || 'OTHER'
      
      if (!acc[academicYear]) acc[academicYear] = {}
      acc[academicYear][gradeCategory] = (acc[academicYear][gradeCategory] || 0) + 1
      return acc
    }, {})

    // Generate last 3 years + next year projection
    const currentAcademicYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
    const yearLabels = [
      `${currentAcademicYear - 2}/${String(currentAcademicYear - 1).slice(2)}`,
      `${currentAcademicYear - 1}/${String(currentAcademicYear).slice(2)}`,
      `${currentAcademicYear}/${String(currentAcademicYear + 1).slice(2)}`,
      `${currentAcademicYear + 1}/${String(currentAcademicYear + 2).slice(2)}` // Projection
    ]

    const gradeCategories = ['PG', 'TK', 'SD', 'SMP', 'SMA']
    
    // Count leads by grade from actual lead data
    const gradeLeadCounts: Record<string, number> = {
      PG: 0,
      TK: 0,
      SD: 0,
      SMP: 0,
      SMA: 0
    }
    
    leads.forEach(lead => {
      const grade = lead.gradeTarget?.toUpperCase() || ''
      
      // Map grade to categories
      // IMPORTANT: Check SMA first (G10-G12) before SD (G1-G6) to avoid false matches
      // because "G1" would match "G10", "G11", "G12"
      if (
        grade.includes('SMA') ||
        grade.includes('G10') || grade.includes('G11') || grade.includes('G12') ||
        grade.includes('GRADE 10') || grade.includes('GRADE 11') || grade.includes('GRADE 12')
      ) {
        gradeLeadCounts.SMA += 1
      } else if (
        grade.includes('SMP') ||
        grade.includes('G7') || grade.includes('G8') || grade.includes('G9') ||
        grade.includes('GRADE 7') || grade.includes('GRADE 8') || grade.includes('GRADE 9')
      ) {
        gradeLeadCounts.SMP += 1
      } else if (
        grade.includes('SD') || 
        grade.includes('G1') || grade.includes('G2') || grade.includes('G3') ||
        grade.includes('G4') || grade.includes('G5') || grade.includes('G6') ||
        grade.includes('GRADE 1') || grade.includes('GRADE 2') || grade.includes('GRADE 3') ||
        grade.includes('GRADE 4') || grade.includes('GRADE 5') || grade.includes('GRADE 6')
      ) {
        gradeLeadCounts.SD += 1
      } else if (grade.includes('TK') || grade.includes('KINDERGARTEN')) {
        gradeLeadCounts.TK += 1
      } else if (grade.includes('PG') || grade.includes('PLAYGROUP')) {
        gradeLeadCounts.PG += 1
      }
    })
    
    // Linear regression function
    const linearRegression = (xValues: number[], yValues: number[]): { slope: number; intercept: number } => {
      const n = xValues.length
      const sumX = xValues.reduce((sum, x) => sum + x, 0)
      const sumY = yValues.reduce((sum, y) => sum + y, 0)
      const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0)
      const sumXX = xValues.reduce((sum, x) => sum + x * x, 0)
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
      const intercept = (sumY - slope * sumX) / n
      
      return { slope, intercept }
    }
    
    const gradeGrowthData = yearLabels.map((yearLabel, index) => {
      const isProjection = index === 3
      const yearData = gradeYearCounts[yearLabel] || {}
      
      const result: Record<string, number | string | boolean> = { year: yearLabel, isProjection }
      
      gradeCategories.forEach(category => {
        if (isProjection) {
          // Use linear regression for projection
          const historicalYears = [0, 1, 2] // Last 3 years as x-axis
          const historicalValues = historicalYears.map(i => {
            const year = yearLabels[i]
            return gradeYearCounts[year]?.[category] || 0
          })
          
          // Calculate linear regression
          const { slope, intercept } = linearRegression(historicalYears, historicalValues)
          
          // Project next year (x = 3)
          const projection = slope * 3 + intercept
          
          // Ensure positive value and round
          result[category] = Math.max(0, Math.round(projection))
        } else {
          result[category] = yearData[category] || 0
        }
      })
      
      return result
    })

    const monthMap = new Map<string, MonthBucket>()

    const createEmptyBucket = (year: number, month: number): MonthBucket => {
      const normalized = new Date(year, month, 1)
      return {
        key: `${normalized.getFullYear()}-${normalized.getMonth()}`,
        label: normalized.toLocaleString('id-ID', { month: 'short', year: '2-digit' }),
        awareness: 0,
        consideration: 0,
        action: 0
      }
    }

    const ensureBucket = (date: Date) => {
      const normalized = new Date(date.getFullYear(), date.getMonth(), 1)
      const key = `${normalized.getFullYear()}-${normalized.getMonth()}`
      let bucket = monthMap.get(key)
      if (!bucket) {
        bucket = createEmptyBucket(normalized.getFullYear(), normalized.getMonth())
        monthMap.set(key, bucket)
      }
      return bucket
    }

    leads.forEach(lead => {
      const referenceDate = lead.dateContact ?? lead.created_at
      const bucket = ensureBucket(referenceDate)

      bucket.awareness += 1
      if (CONSIDERATION_STATUSES.has(lead.status)) bucket.consideration += 1
      if (lead.status === OFFICIAL_STATUS) bucket.action += 1
    })

    // Generate 12 months from August (current/last year) to July (next year)
    const months: MonthBucket[] = []
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() // 0-indexed (0 = Jan, 7 = Aug)
    
    // Determine start year for August
    const startYear = currentMonth >= 7 ? currentYear : currentYear - 1
    
    // Generate 12 months: Aug, Sep, Oct, Nov, Dec, Jan, Feb, Mar, Apr, May, Jun, Jul
    for (let i = 0; i < 12; i += 1) {
      const monthIndex = (7 + i) % 12 // Start from August (7)
      const year = startYear + (7 + i >= 12 ? 1 : 0) // Increment year after December
      const key = `${year}-${monthIndex}`
      const bucket = monthMap.get(key) ?? createEmptyBucket(year, monthIndex)
      months.push(bucket)
    }

    const responsePayload = {
      academicYear: academicYearLabel(now),
      school: school
        ? { id: school.id, name: school.name }
        : { id: null, name: role === 'SUPERADMIN' ? 'Semua Sekolah' : null },
      summary: {
        newPsbTarget: newLeadsTarget,
        totalLeads,
        totalCampaigns,
        totalContents,
        totalPreRegistrations: preRegistrations,
        preRegistrationRate,
        totalOfficial: officialPayments,
        officialRate,
        totalLeadsNeeded,
        officialConversionRate: conversionRate,
        yoyEnrollmentGrowth,
        yoyComparison: { current: leadsThisYear, previous: leadsLastYear },
        momEnrollmentGrowth,
        momComparison: { current: leadsThisMonth, previous: leadsPreviousMonth },
        topLeadSources,
        leadDemographics
      },
      awarenessStage: {
        totalCampaignReach,
        instagramContents,
        tikTokContents,
        viralContents,
        websiteLeads
      },
      considerationStage: {
        whatsappLeads,
        openHouseEngagements,
        eventCampaigns,
        costPerLeadPre,
        schoolVisits
      },
      conversionStage: {
        officialConversionRate: conversionRate,
        officialPayments,
        scholarshipLeads,
        retentionRate,
        costPerOfficialLead,
        npsScore
      },
      conversionJourney: months,
      gradeGrowth: gradeGrowthData,
      gradeLeadCounts,
      metadata: {
        totalCampaignBudget,
        convertedLeads,
        lostLeads,
        leadsToday
      }
    }

    return NextResponse.json(responsePayload)
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard statistics',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
