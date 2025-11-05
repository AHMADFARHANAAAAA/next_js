import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Ambil campaign berdasarkan ID
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

    const campaign = await prisma.campaign.findFirst({
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

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json(campaign)

  } catch (error) {
    console.error('Error fetching campaign:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    )
  }
}

// PUT - Update campaign
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
      title,
      description,
      type,
      status,
      startDate,
      endDate,
      budget,
      targetAudience,
      reach
    } = body

    // Validasi campaign exists dan permission
    const whereClause: Record<string, unknown> = { id }
    if (session.user.role === 'ADMIN') {
      whereClause.schoolId = session.user.schoolId
    }

    const existingCampaign = await prisma.campaign.findFirst({
      where: whereClause
    })

    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Build update data object only with provided fields
    const updateData: Record<string, unknown> = {}
    
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (type !== undefined) updateData.type = type
    if (status !== undefined) updateData.status = status
    if (startDate !== undefined) {
      updateData.startDate = startDate ? new Date(startDate) : null
      console.log('Processing startDate:', { original: startDate, converted: updateData.startDate })
    }
    if (endDate !== undefined) {
      updateData.endDate = endDate ? new Date(endDate) : null
      console.log('Processing endDate:', { original: endDate, converted: updateData.endDate })
    }
    if (budget !== undefined) {
      updateData.budget = budget ? parseFloat(budget.toString()) : null
      console.log('Processing budget:', { original: budget, converted: updateData.budget })
    }
    if (targetAudience !== undefined) updateData.targetAudience = targetAudience
    if (reach !== undefined) {
      updateData.reach = reach ? parseInt(reach.toString()) : null
      console.log('Processing reach:', { original: reach, converted: updateData.reach })
    }

    console.log('Update data:', updateData)
    
    // Check if we have any fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided for update' },
        { status: 400 }
      )
    }

    const campaign = await prisma.campaign.update({
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
    
    console.log('Campaign updated successfully:', campaign.id)

    return NextResponse.json(campaign)

  } catch (error) {
    console.error('Error updating campaign:', error)
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to update campaign',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE - Hapus campaign
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

    // Validasi campaign exists dan permission
    const whereClause: Record<string, unknown> = { id }
    if (session.user.role === 'ADMIN') {
      whereClause.schoolId = session.user.schoolId
    }

    const existingCampaign = await prisma.campaign.findFirst({
      where: whereClause
    })

    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    await prisma.campaign.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Campaign deleted successfully' })

  } catch (error) {
    console.error('Error deleting campaign:', error)
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    )
  }
}
