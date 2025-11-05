import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Ambil lead berdasarkan ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Hanya ADMIN dan SUPERADMIN yang bisa mengakses
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Filter berdasarkan role
    const whereClause: Record<string, unknown> = { id }
    if (session.user.role === 'ADMIN') {
      whereClause.schoolId = session.user.schoolId
    }

    const lead = await prisma.lead.findFirst({
      where: whereClause,
      include: {
        school: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json(lead)

  } catch (error) {
    console.error('Error fetching lead:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lead' },
      { status: 500 }
    )
  }
}

// PUT - Update lead
export async function PUT(request: NextRequest, { params }: RouteParams) {
  console.log('=== PUT request received ===')
  console.log('Timestamp:', new Date().toISOString())
  console.log('URL:', request.url)
  
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    console.log('Session in PUT request:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userRole: session?.user?.role,
      userId: session?.user?.id
    })
    
    if (!session || !session.user) {
      console.log('No session or user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Hanya ADMIN dan SUPERADMIN yang bisa mengupdate
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
      console.log('User role not authorized:', session.user.role)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    console.log('API received body:', body)
    
    // Check if body is empty
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'No data provided for update' },
        { status: 400 }
      )
    }
    
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
      nextFollowUp
    } = body

    // Validasi lead exists dan permission
    const whereClause: Record<string, unknown> = { id }
    if (session.user.role === 'ADMIN') {
      whereClause.schoolId = session.user.schoolId
    }

    const existingLead = await prisma.lead.findFirst({
      where: whereClause
    })

    if (!existingLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Build update data object only with provided fields
    const updateData: Record<string, unknown> = {}
    
    if (parentName !== undefined) updateData.parentName = parentName
    if (parentPhone !== undefined) updateData.parentPhone = parentPhone
    if (parentEmail !== undefined) updateData.parentEmail = parentEmail
    if (studentName !== undefined) updateData.studentName = studentName
    if (schoolOrigin !== undefined) updateData.schoolOrigin = schoolOrigin
    if (gradeTarget !== undefined) updateData.gradeTarget = gradeTarget
    if (enrollmentYear !== undefined) updateData.enrollmentYear = enrollmentYear
    if (domicile !== undefined) updateData.domicile = domicile
    if (infoSource !== undefined) updateData.infoSource = infoSource
    if (dateContact !== undefined) updateData.dateContact = dateContact ? new Date(dateContact) : null
    if (leadMonth !== undefined) updateData.leadMonth = leadMonth
    if (status !== undefined) updateData.status = status
    if (customerJourney !== undefined) updateData.customerJourney = customerJourney
    if (notes !== undefined) updateData.notes = notes
    if (nextFollowUp !== undefined) updateData.nextFollowUp = nextFollowUp ? new Date(nextFollowUp) : null

    console.log('Update data:', updateData)
    
    // Check if we have any fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided for update' },
        { status: 400 }
      )
    }

    // Test database connection
    try {
      await prisma.$queryRaw`SELECT 1`
      console.log('Database connection OK')
    } catch (dbError) {
      console.error('Database connection error:', dbError)
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    // Verify lead exists before updating
    const leadExists = await prisma.lead.findUnique({
      where: { id }
    })
    
    if (!leadExists) {
      console.error('Lead not found with ID:', id)
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }
    
    console.log('Existing lead found:', {
      id: leadExists.id,
      parentName: leadExists.parentName,
      status: leadExists.status
    })

    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        school: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
    
    console.log('Lead updated successfully:', lead.id)

    return NextResponse.json(lead)

  } catch (error) {
    console.error('Error updating lead:', error)
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to update lead',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE - Hapus lead
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Hanya ADMIN dan SUPERADMIN yang bisa menghapus
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validasi lead exists dan permission
    const whereClause: Record<string, unknown> = { id }
    if (session.user.role === 'ADMIN') {
      whereClause.schoolId = session.user.schoolId
    }

    const existingLead = await prisma.lead.findFirst({
      where: whereClause
    })

    if (!existingLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    await prisma.lead.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Lead deleted successfully' })

  } catch (error) {
    console.error('Error deleting lead:', error)
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 }
    )
  }
}
