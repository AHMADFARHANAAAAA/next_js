import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get all users from Prisma
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        created_at: true,
        updated_at: true,
        accounts: {
          select: {
            provider: true,
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

  } catch (error: any) {
    console.error('Get users error:', error);

    return NextResponse.json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}