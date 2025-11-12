import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

// GET - Get school logo (public, no auth required for login page)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        logo: true,
      },
    });

    if (!school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        schoolId: school.id,
        schoolName: school.name,
        logo: school.logo || null,
      },
    });
  } catch (error) {
    console.error('Error fetching school logo:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Update school logo
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and SUPERADMIN can update logos
    if (!['ADMIN', 'SUPERADMIN'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { schoolId, logoUrl } = body;

    if (!schoolId || !logoUrl) {
      return NextResponse.json(
        { error: 'School ID and logo URL are required' },
        { status: 400 }
      );
    }

    // For ADMIN, they can only update their own school
    if (session.user.role === 'ADMIN' && session.user.schoolId !== schoolId) {
      return NextResponse.json(
        { error: 'You can only update your own school logo' },
        { status: 403 }
      );
    }

    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: { logo: logoUrl },
      select: {
        id: true,
        name: true,
        logo: true,
        updated_at: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'School logo updated successfully',
      data: updatedSchool,
    });
  } catch (error) {
    console.error('Error updating school logo:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
