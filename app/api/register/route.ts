import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/database';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { name, email, password } = await request.json();

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const emailExists = await User.emailExists(email);
    if (emailExists) {
      return NextResponse.json(
        { success: false, message: 'User already exists with this email' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await User.hashPassword(password);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return success response (don't include password)
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at
    };

    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      user: userResponse,
      token
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Registration error:', error);

    // Handle duplicate email error
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === '23505') {
      return NextResponse.json(
        { success: false, message: 'Email already exists' },
        { status: 409 }
      );
    }

    // Handle validation errors
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}