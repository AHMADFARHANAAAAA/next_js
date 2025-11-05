import { NextRequest, NextResponse } from 'next/server'
import { ensurePrismaConnection } from '@/lib/prisma'

// GET - List all schools
export async function GET() {
  try {
    // Ensure database connection
    const prisma = await ensurePrismaConnection()

    const schools = await prisma.school.findMany({
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        _count: {
          select: {
            users: true,
            leads: true,
            campaigns: true,
            contents: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      schools
    })
  } catch (error) {
    console.error('Error fetching schools:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch schools' },
      { status: 500 }
    )
  }
}

// POST - Create new school
export async function POST(request: NextRequest) {
  try {
    // Ensure database connection
    const prisma = await ensurePrismaConnection()

    const { name, address, phone, email, logo } = await request.json()

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'School name is required' },
        { status: 400 }
      )
    }

    const school = await prisma.school.create({
      data: {
        name,
        address,
        phone,
        email,
        logo
      }
    })

    return NextResponse.json({
      success: true,
      message: 'School created successfully',
      school
    })
  } catch (error) {
    console.error('Error creating school:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create school' },
      { status: 500 }
    )
  }
}