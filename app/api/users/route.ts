import { NextResponse } from 'next/server';
import { ensurePrismaConnection } from '@/lib/prisma';

export async function GET() {
  try {
    // Ensure database connection
    const prisma = await ensurePrismaConnection()

    // Get all users from Prisma with school information
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        schoolId: true,
        image: true,
        created_at: true,
        updated_at: true,
        school: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      count: users.length,
      users: users
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('Get users error:', error);

    return NextResponse.json({
      success: false,
      message: 'Failed to fetch users',
      error: error && typeof error === 'object' && 'message' in error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}