import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Test database connection with Prisma
    await prisma.$connect();
    
    // Simple query to test connection
    const userCount = await prisma.user.count();
    
    return NextResponse.json({
      success: true,
      message: 'PostgreSQL database connected successfully via Prisma',
      userCount: userCount,
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error: any) {
    console.error('Database connection error:', error);

    return NextResponse.json({
      success: false,
      message: 'PostgreSQL database connection failed',
      error: error.message
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}