import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import csv from 'csv-parser'
import { Readable } from 'stream'

// PrismaClient singleton imported from lib/prisma

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Check authorization
    if (!session || !['SUPERADMIN', 'ADMIN'].includes(session.user.role || '')) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const importType = formData.get('importType') as string
    const schoolId = formData.get('schoolId') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    if (!importType) {
      return NextResponse.json(
        { error: 'Import type is required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only CSV files are allowed' },
        { status: 400 }
      )
    }

    // Check school access for ADMIN users
    if (session.user.role === 'ADMIN') {
      if (!session.user.schoolId) {
        return NextResponse.json(
          { error: 'Admin harus ditetapkan ke sekolah terlebih dahulu sebelum dapat mengimpor data' },
          { status: 403 }
        )
      }
      
      if (schoolId && schoolId !== session.user.schoolId) {
        return NextResponse.json(
          { error: 'Anda hanya dapat mengimpor data untuk sekolah yang ditugaskan kepada Anda' },
          { status: 403 }
        )
      }
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Parse CSV
    const records: Record<string, string>[] = []
    const stream = Readable.from(buffer)
    
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data) => records.push(data))
        .on('end', resolve)
        .on('error', reject)
    })

    if (records.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty or invalid' },
        { status: 400 }
      )
    }

    // Only allow leads import - remove schools and users import
    if (importType !== 'leads') {
      return NextResponse.json(
        { error: 'Only CRM leads import is supported' },
        { status: 400 }
      )
    }

    const targetSchoolId = schoolId || session.user.schoolId || null
    const result = await importLeads(records, targetSchoolId)

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${result.successCount} records`,
      details: result
    })

  } catch (error) {
    console.error('CSV Import Error:', error)
    return NextResponse.json(
      { error: 'Internal server error during import' },
      { status: 500 }
    )
  }
}

// Import Leads function
async function importLeads(records: Record<string, string>[], schoolId: string | null) {
  const results = {
    successCount: 0,
    errorCount: 0,
    errors: [] as string[]
  }

  if (!schoolId) {
    results.errors.push('School ID is required for lead import')
    results.errorCount = records.length
    return results
  }

  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    
    try {
      // Map CSV columns to Lead model - sesuai dengan format CSV yang diberikan
      const leadData = {
        parentName: record['Parent Name'] || record.parentName || record.parent_name || record.nama_ortu || '',
        parentPhone: record['Parent Phone'] || record.parentPhone || record.parent_phone || record.phone_ortu || record.no_hp_ortu || '',
        parentEmail: record['Parent Email'] || record.parentEmail || record.parent_email || record.email_ortu || '',
        studentName: record['Student Name'] || record.studentName || record.student_name || record.nama_siswa || '',
        schoolOrigin: record['School Origin'] || record.schoolOrigin || record.school_origin || record.asal_sekolah || '',
        gradeTarget: record['For Grade'] || record.gradeTarget || record.grade_target || record.target_kelas || '',
        enrollmentYear: record['Enrollment Year'] || record.enrollmentYear || record.enrollment_year || record.tahun_masuk || '',
        domicile: record['Domicile'] || record.domicile || record.domisili || '',
        infoSource: record['Info Source'] || record.infoSource || record.info_source || record.sumber_info || 'CSV Import',
        dateContact: parseCustomDate(record['Date Contact']),
        leadMonth: record['Lead / Month'] || record.leadMonth || record.lead_month || record.bulan_lead || '',
        status: mapLeadStatus(record['Status Customer Journey'] || record.status || record.Status || record.status_lead || 'NEW'),
        customerJourney: record['Status Customer Journey'] || record.customerJourney || record.customer_journey || record.status || '',
        notes: record['Notes / Kendala / Cancel / dll.'] || record.notes || record.Notes || record.keterangan || record.kendala || '',
        nextFollowUp: parseFollowUpDate(record['Next Follow-up'] || ''),
        schoolId: schoolId
      }

      // Validate required fields - Parent Name wajib diisi
      if (!leadData.parentName || leadData.parentName.trim() === '') {
        results.errors.push(`Row ${i + 1}: Parent Name is required`)
        results.errorCount++
        continue
      }

      // Skip rows yang kosong atau hanya berisi nomor
      if (!leadData.parentName && !leadData.studentName && !leadData.parentPhone && !leadData.parentEmail) {
        continue
      }

      // Check for existing lead with same parent name + phone and school
      const existingLead = await prisma.lead.findFirst({
        where: {
          parentName: leadData.parentName,
          parentPhone: leadData.parentPhone,
          schoolId: schoolId
        }
      })

      if (existingLead) {
        // Update existing lead
        await prisma.lead.update({
          where: { id: existingLead.id },
          data: {
            parentPhone: leadData.parentPhone,
            parentEmail: leadData.parentEmail,
            studentName: leadData.studentName,
            schoolOrigin: leadData.schoolOrigin,
            gradeTarget: leadData.gradeTarget,
            enrollmentYear: leadData.enrollmentYear,
            infoSource: leadData.infoSource,
            dateContact: leadData.dateContact,
            leadMonth: leadData.leadMonth,
            status: leadData.status,
            customerJourney: leadData.customerJourney,
            notes: leadData.notes,
            nextFollowUp: leadData.nextFollowUp,
            updated_at: new Date()
          }
        })
      } else {
        // Create new lead
        await prisma.lead.create({
          data: leadData
        })
      }

      results.successCount++
    } catch (error) {
      results.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      results.errorCount++
    }
  }

  return results
}

// Helper function to parse date format dari CSV (supports multiple formats)
function parseCustomDate(dateStr: string): Date | null {
  try {
    if (!dateStr || dateStr.trim() === '') return null
    
    const cleanDate = dateStr.trim()
    
    // Handle ISO format like "2025-09-24"
    if (/^\d{4}-\d{2}-\d{2}/.test(cleanDate)) {
      const parsed = new Date(cleanDate)
      return isNaN(parsed.getTime()) ? null : parsed
    }
    
    // Handle format like "7-Jul-25"
    const parts = cleanDate.split('-')
    if (parts.length === 3) {
      const day = parseInt(parts[0])
      const month = parts[1]
      let year = parseInt(parts[2])
      
      // Convert 2-digit year to 4-digit
      if (year < 100) {
        year += 2000
      }
      
      const monthMap: { [key: string]: number } = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      }
      
      const monthNum = monthMap[month]
      if (monthNum !== undefined) {
        return new Date(year, monthNum, day)
      }
    }
    
    // Fallback to standard date parsing
    const parsed = new Date(cleanDate)
    return isNaN(parsed.getTime()) ? null : parsed
  } catch {
    return null
  }
}

// Helper function to parse follow-up text to date
function parseFollowUpDate(followUpText: string): Date | null {
  try {
    if (!followUpText || followUpText.trim() === '') return null
    
    const cleanText = followUpText.toLowerCase().trim()
    
    // Skip non-date follow-up actions
    const nonDateActions = [
      'kirim brosur via wa',
      'follow-up via email', 
      'pending info biaya',
      'jadwalkan kunjungan',
      'hubungi lagi minggu depan',
      'sudah closing'
    ]
    
    if (nonDateActions.includes(cleanText)) {
      return null // Return null for action-based follow-ups
    }
    
    // Try to parse as date if it looks like a date
    if (/\d{4}-\d{2}-\d{2}/.test(cleanText) || /\d{1,2}-\w{3}-\d{2,4}/.test(cleanText)) {
      return parseCustomDate(cleanText)
    }
    
    return null
  } catch {
    return null
  }
}

// Helper function to map lead status - sesuai dengan status di CSV yang diberikan
function mapLeadStatus(status: string): string {
  const statusMap: { [key: string]: string } = {
    // Basic statuses
    'new': 'NEW',
    'new lead': 'NEW',
    'baru': 'NEW',
    
    // Contact stages
    'contacted': 'KONTAK_VIA_WA',
    'kontak via wa': 'KONTAK_VIA_WA',
    
    // Follow-up stages  
    'follow-up': 'KONTAK_VIA_WA',
    'followup': 'KONTAK_VIA_WA',
    
    // Payment stages
    'bayar form (pre)': 'BAYAR_FORM_PRE',
    'bayar up (official)': 'BAYAR_UP_OFFICIAL',
    
    // Interest levels
    'potensi (warm)': 'POTENSI_WARM',
    'warm': 'POTENSI_WARM',
    
    // School interaction
    'visited school': 'SURVEY_SEKOLAH',
    'survey sekolah': 'SURVEY_SEKOLAH',
    'kunjungan sekolah': 'SURVEY_SEKOLAH',
    
    // Success/Conversion
    'converted': 'CONVERTED',
    'enrolled': 'CONVERTED',
    'berhasil': 'CONVERTED',
    'daftar': 'CONVERTED',
    
    // No response
    'tidak respon': 'TIDAK_RESPON',
    'no response': 'TIDAK_RESPON',
    
    // Lost/Cold
    'lost': 'LOST',
    'gagal': 'LOST',
    'tidak potensi (cold)': 'TIDAK_POTENSI_COLD',
    'cold': 'TIDAK_POTENSI_COLD'
  }

  const cleanStatus = status.toLowerCase().trim()
  return statusMap[cleanStatus] || 'NEW'
}
