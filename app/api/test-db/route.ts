import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PrismaClient singleton imported from lib/prisma;

export async function GET() {
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

  } catch (error: unknown) {
    console.error('Database connection error:', error);

    return NextResponse.json({
      success: false,
      message: 'PostgreSQL database connection failed',
      error: error && typeof error === 'object' && 'message' in error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}