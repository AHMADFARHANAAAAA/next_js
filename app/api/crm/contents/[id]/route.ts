import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Ambil content berdasarkan ID
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

    const content = await prisma.content.findFirst({
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

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    return NextResponse.json(content)

  } catch (error) {
    console.error('Error fetching content:', error)
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    )
  }
}

// PUT - Update content
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Hanya ADMIN dan SUPERADMIN yang bisa mengupdate
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'No data provided for update' },
        { status: 400 }
      )
    }

    const {
      title,
      type,
      content,
      status,
      publishDate,
      tags,
      socialMediaLink,
      socialMediaPlatform,
      reach
    } = body

    const normalizedTags = tags === undefined
      ? undefined
      : Array.isArray(tags)
        ? tags
        : typeof tags === 'string'
          ? tags.split(',').map(tag => tag.trim()).filter(Boolean)
          : []

    const normalizedPlatform =
      socialMediaPlatform === undefined
        ? undefined
        : typeof socialMediaPlatform === 'string' && socialMediaPlatform.trim()
          ? socialMediaPlatform.trim().toUpperCase()
          : null

    // Validasi content exists dan permission
    const whereClause: Record<string, unknown> = { id }
    if (session.user.role === 'ADMIN') {
      whereClause.schoolId = session.user.schoolId
    }

    const existingContent = await prisma.content.findFirst({
      where: whereClause
    })

    if (!existingContent) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (title !== undefined) updateData.title = title
    if (type !== undefined) updateData.type = type
    if (content !== undefined) updateData.content = content
    if (status !== undefined) updateData.status = status
    if (publishDate !== undefined) {
      updateData.publishDate = publishDate ? new Date(publishDate) : null
    }
    if (normalizedTags !== undefined) updateData.tags = normalizedTags
    if (socialMediaLink !== undefined) updateData.socialMediaLink = socialMediaLink || null
    if (normalizedPlatform !== undefined) updateData.socialMediaPlatform = normalizedPlatform
    if (reach !== undefined) updateData.reach = reach ? parseInt(reach) : null

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided for update' },
        { status: 400 }
      )
    }

    const updatedContent = await prisma.content.update({
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

    return NextResponse.json(updatedContent)

  } catch (error) {
    console.error('Error updating content:', error)
    return NextResponse.json(
      { error: 'Failed to update content' },
      { status: 500 }
    )
  }
}

// DELETE - Hapus content
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

    // Validasi content exists dan permission
    const whereClause: Record<string, unknown> = { id }
    if (session.user.role === 'ADMIN') {
      whereClause.schoolId = session.user.schoolId
    }

    const existingContent = await prisma.content.findFirst({
      where: whereClause
    })

    if (!existingContent) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    await prisma.content.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Content deleted successfully' })

  } catch (error) {
    console.error('Error deleting content:', error)
    return NextResponse.json(
      { error: 'Failed to delete content' },
      { status: 500 }
    )
  }
}
