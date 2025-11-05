import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { writeFile } from 'fs/promises'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN and SUPERADMIN can upload images
    if (!['ADMIN', 'SUPERADMIN'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const uploadType = formData.get('uploadType') as string || 'general'

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only image files (JPEG, PNG, GIF, WebP) are allowed' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const fileName = `${uploadType}_${timestamp}_${randomString}.${fileExtension}`

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', uploadType)
    
    try {
      await writeFile(join(uploadDir, fileName), buffer)
    } catch (error) {
      // If directory doesn't exist, create it and try again
      const fs = await import('fs')
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
        await writeFile(join(uploadDir, fileName), buffer)
      } else {
        throw error
      }
    }

    const fileUrl = `/uploads/${uploadType}/${fileName}`

    return NextResponse.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: fileUrl,
        filename: fileName,
        originalName: file.name,
        size: file.size,
        type: file.type,
        uploadedBy: session.user.id,
        uploadedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - List uploaded images (optional)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['ADMIN', 'SUPERADMIN'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const uploadType = searchParams.get('uploadType') || 'general'

    // This is a simple implementation - in production you might want to store file metadata in database
    return NextResponse.json({
      success: true,
      message: 'Use POST to upload images',
      uploadType
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
