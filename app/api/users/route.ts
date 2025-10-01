import { NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import User from '@/models/User';

export async function GET() {
  try {
    await dbConnect();

    // Get all users without password field
    const users = await User.findAll();

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
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}