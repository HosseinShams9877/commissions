import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { teamCommissionCreateSchema, teamCommissionUpdateSchema } from '@/lib/validations';

// GET /api/team-commissions — list team commissions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const periodYear = searchParams.get('periodYear');
    const periodMonth = searchParams.get('periodMonth');
    const teamId = searchParams.get('teamId');

    const where: Record<string, unknown> = {};
    if (periodYear) where.periodYear = parseInt(periodYear);
    if (periodMonth) where.periodMonth = parseInt(periodMonth);
    if (teamId) where.teamId = teamId;

    const teamCommissions = await db.teamCommission.findMany({
      where,
      include: {
        team: {
          select: {
            id: true,
            name: true,
            leader: { select: { id: true, name: true, code: true } },
            members: {
              include: { person: { select: { id: true, name: true, code: true } } },
            },
          },
        },
      },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });

    return NextResponse.json({ teamCommissions });
  } catch (error) {
    console.error('Failed to fetch team commissions:', error);
    return NextResponse.json(
      { error: 'دریافت پورسانت‌های تیمی ناموفق بود' },
      { status: 500 }
    );
  }
}

// POST /api/team-commissions — create a team commission
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = teamCommissionCreateSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const data = parsed.data;
    const teamCommission = await db.teamCommission.create({
      data: {
        teamId: data.teamId,
        periodYear: data.periodYear,
        periodMonth: data.periodMonth,
        leaderPersonalSales: data.leaderPersonalSales,
        leaderPersonalCommission: data.leaderPersonalCommission,
        totalTeamSales: data.totalTeamSales,
        teamCommissionAmount: data.teamCommissionAmount,
        totalLeaderCommission: data.totalLeaderCommission,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            leader: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    return NextResponse.json({ teamCommission }, { status: 201 });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2003') {
      return NextResponse.json(
        { error: 'تیم مشخص شده وجود ندارد' },
        { status: 404 }
      );
    }
    console.error('Failed to create team commission:', error);
    return NextResponse.json(
      { error: 'ایجاد پورسانت تیمی ناموفق بود' },
      { status: 500 }
    );
  }
}

// PUT /api/team-commissions — update a team commission
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = teamCommissionUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { id, ...updateData } = parsed.data;

    const teamCommission = await db.teamCommission.update({
      where: { id },
      data: updateData,
      include: {
        team: {
          select: {
            id: true,
            name: true,
            leader: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    return NextResponse.json({ teamCommission });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'پورسانت تیمی مورد نظر یافت نشد' },
        { status: 404 }
      );
    }
    console.error('Failed to update team commission:', error);
    return NextResponse.json(
      { error: 'به‌روزرسانی پورسانت تیمی ناموفق بود' },
      { status: 500 }
    );
  }
}

// DELETE /api/team-commissions?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { error: 'شناسه الزامی است' },
        { status: 400 }
      );
    }

    await db.teamCommission.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'پورسانت تیمی مورد نظر یافت نشد' },
        { status: 404 }
      );
    }
    console.error('Failed to delete team commission:', error);
    return NextResponse.json(
      { error: 'حذف پورسانت تیمی ناموفق بود' },
      { status: 500 }
    );
  }
}
