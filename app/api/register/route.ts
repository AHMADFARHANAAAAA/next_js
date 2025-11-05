import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

// PrismaClient singleton imported from lib/prisma;

export async function POST(request: NextRequest) {
  try {
    // For now, we'll allow registration (can be enhanced with session validation later)
    
    const { name, email, password, role = 'ADMIN' } = await request.json();

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['ADMIN', 'USER', 'SUPERADMIN'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, message: 'Invalid role specified' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { accounts: true }
    });
    
    if (existingUser) {
      const providers = existingUser.accounts.map(acc => acc.provider);
      const hasPassword = !!existingUser.password;
      
      if (providers.length > 0) {
        // User registered via OAuth (Google)
        return NextResponse.json({
          success: false,
          message: `This email is already registered via ${providers.join(', ')} with role: ${existingUser.role}`,
          existingProviders: providers,
          existingRole: existingUser.role,
          type: 'oauth_exists'
        }, { status: 409 });
      } else if (hasPassword) {
        // User registered manually
        return NextResponse.json({
          success: false,
          message: `This email is already registered manually with role: ${existingUser.role}`,
          existingRole: existingUser.role,
          type: 'manual_exists'
        }, { status: 409 });
      } else {
        // Edge case: user exists but no password or accounts
        return NextResponse.json({
          success: false,
          message: 'This email is already registered. Please contact support.',
          existingRole: existingUser.role,
          type: 'unknown_exists'
        }, { status: 409 });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with specified role
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role as 'ADMIN' | 'USER' | 'SUPERADMIN', // Type-safe role assignment
        emailVerified: new Date(), // Mark as verified since created by SUPERADMIN
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
      }
    });

    return NextResponse.json({
      success: true,
      message: `${role} user created successfully`,
      user
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Registration error:', error);

    // Handle Prisma unique constraint error
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, message: 'Email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}