import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'

// PrismaClient singleton imported from lib/prisma

// POST - Import leads dari CSV data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Hanya ADMIN dan SUPERADMIN yang bisa import
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { leads, schoolId } = body

    if (!leads || !Array.isArray(leads)) {
      return NextResponse.json(
        { error: 'Leads data is required and must be an array' },
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

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Process leads satu per satu
    for (let i = 0; i < leads.length; i++) {
      const leadData = leads[i]
      
      try {
        // Validasi data required
        if (!leadData.parentName) {
          results.failed++
          results.errors.push(`Row ${i + 1}: Parent name is required`)
          continue
        }

        // Mapping status dari CSV ke string
        let mappedStatus: string = 'NEW'
        if (leadData.customerJourney) {
          const journey = leadData.customerJourney.toLowerCase()
          if (journey.includes('bayar up') || journey.includes('official')) {
            mappedStatus = 'BAYAR_UP_OFFICIAL'
          } else if (journey.includes('bayar form') || journey.includes('pre')) {
            mappedStatus = 'BAYAR_FORM_PRE'
          } else if (journey.includes('kontak via wa')) {
            mappedStatus = 'KONTAK_VIA_WA'
          } else if (journey.includes('potensi') && journey.includes('warm')) {
            mappedStatus = 'POTENSI_WARM'
          } else if (journey.includes('tidak respon')) {
            mappedStatus = 'TIDAK_RESPON'
          } else if (journey.includes('tidak potensi') || journey.includes('cold')) {
            mappedStatus = 'TIDAK_POTENSI_COLD'
          } else if (journey.includes('survey sekolah')) {
            mappedStatus = 'SURVEY_SEKOLAH'
          }
        }

        // Parse tanggal
        let dateContact = null
        if (leadData.dateContact) {
          try {
            dateContact = new Date(leadData.dateContact)
            if (isNaN(dateContact.getTime())) {
              dateContact = null
            }
          } catch {
            dateContact = null
          }
        }

        let nextFollowUp = null
        if (leadData.nextFollowUp) {
          try {
            nextFollowUp = new Date(leadData.nextFollowUp)
            if (isNaN(nextFollowUp.getTime())) {
              nextFollowUp = null
            }
          } catch {
            nextFollowUp = null
          }
        }

        // Create lead
        await prisma.lead.create({
          data: {
            parentName: leadData.parentName,
            parentPhone: leadData.parentPhone || null,
            parentEmail: leadData.parentEmail || null,
            studentName: leadData.studentName || null,
            schoolOrigin: leadData.schoolOrigin || null,
            gradeTarget: leadData.gradeTarget || null,
            enrollmentYear: leadData.enrollmentYear || null,
            infoSource: leadData.infoSource || null,
            dateContact,
            leadMonth: leadData.leadMonth || null,
            status: mappedStatus,
            customerJourney: leadData.customerJourney || null,
            notes: leadData.notes || null,
            nextFollowUp,
            schoolId: targetSchoolId
          }
        })

        results.success++

      } catch (error) {
        results.failed++
        results.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      message: 'Import completed',
      results
    })

  } catch (error) {
    console.error('Error importing leads:', error)
    return NextResponse.json(
      { error: 'Failed to import leads' },
      { status: 500 }
    )
  }
}
