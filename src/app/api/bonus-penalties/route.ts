import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bonusPenaltyCreateSchema, bonusPenaltyUpdateSchema } from '@/lib/validations';

// GET /api/bonus-penalties — list bonus/penalties
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const periodYear = searchParams.get('periodYear');
    const periodMonth = searchParams.get('periodMonth');
    const salesPersonId = searchParams.get('salesPersonId');

    const where: Record<string, unknown> = {};
    if (periodYear) where.periodYear = parseInt(periodYear);
    if (periodMonth) where.periodMonth = parseInt(periodMonth);
    if (salesPersonId) where.salesPersonId = salesPersonId;

    const bonusPenalties = await db.bonusPenalty.findMany({
      where,
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });

    return NextResponse.json({ bonusPenalties });
  } catch (error) {
    console.error('Failed to fetch bonus/penalties:', error);
    return NextResponse.json(
      { error: 'دریافت پاداش/جریمه‌ها ناموفق بود' },
      { status: 500 }
    );
  }
}

// POST /api/bonus-penalties — create a bonus/penalty
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bonusPenaltyCreateSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const data = parsed.data;
    const bonusPenalty = await db.bonusPenalty.create({
      data: {
        salesPersonId: data.salesPersonId,
        periodYear: data.periodYear,
        periodMonth: data.periodMonth,
        type: data.type,
        amount: data.amount,
        reason: data.reason,
      },
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json({ bonusPenalty }, { status: 201 });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2003') {
      return NextResponse.json(
        { error: 'فروشنده مشخص شده وجود ندارد' },
        { status: 404 }
      );
    }
    console.error('Failed to create bonus/penalty:', error);
    return NextResponse.json(
      { error: 'ایجاد پاداش/جریمه ناموفق بود' },
      { status: 500 }
    );
  }
}

// PUT /api/bonus-penalties — update a bonus/penalty
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bonusPenaltyUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { id, ...updateData } = parsed.data;

    const bonusPenalty = await db.bonusPenalty.update({
      where: { id },
      data: updateData,
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json({ bonusPenalty });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'پاداش/جریمه مورد نظر یافت نشد' },
        { status: 404 }
      );
    }
    console.error('Failed to update bonus/penalty:', error);
    return NextResponse.json(
      { error: 'به‌روزرسانی پاداش/جریمه ناموفق بود' },
      { status: 500 }
    );
  }
}

// DELETE /api/bonus-penalties?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { error: 'شناسه الزامی است' },
        { status: 400 }
      );
    }

    await db.bonusPenalty.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'پاداش/جریمه مورد نظر یافت نشد' },
        { status: 404 }
      );
    }
    console.error('Failed to delete bonus/penalty:', error);
    return NextResponse.json(
      { error: 'حذف پاداش/جریمه ناموفق بود' },
      { status: 500 }
    );
  }
}
