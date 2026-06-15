import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settlementCreateSchema, settlementUpdateSchema } from '@/lib/validations';

// GET /api/settlements — list settlements
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

    const settlements = await db.settlement.findMany({
      where,
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });

    return NextResponse.json({ settlements });
  } catch (error) {
    console.error('Failed to fetch settlements:', error);
    return NextResponse.json(
      { error: 'دریافت تسویه‌ها ناموفق بود' },
      { status: 500 }
    );
  }
}

// POST /api/settlements — create a settlement
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = settlementCreateSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const data = parsed.data;
    const settlement = await db.settlement.create({
      data: {
        salesPersonId: data.salesPersonId,
        periodYear: data.periodYear,
        periodMonth: data.periodMonth,
        amount: data.amount,
        date: data.date,
        description: data.description,
      },
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json({ settlement }, { status: 201 });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2003') {
      return NextResponse.json(
        { error: 'فروشنده مشخص شده وجود ندارد' },
        { status: 404 }
      );
    }
    console.error('Failed to create settlement:', error);
    return NextResponse.json(
      { error: 'ایجاد تسویه ناموفق بود' },
      { status: 500 }
    );
  }
}

// PUT /api/settlements — update a settlement
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = settlementUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { id, ...updateData } = parsed.data;

    const settlement = await db.settlement.update({
      where: { id },
      data: updateData,
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json({ settlement });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'تسویه مورد نظر یافت نشد' },
        { status: 404 }
      );
    }
    console.error('Failed to update settlement:', error);
    return NextResponse.json(
      { error: 'به‌روزرسانی تسویه ناموفق بود' },
      { status: 500 }
    );
  }
}

// DELETE /api/settlements?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { error: 'شناسه الزامی است' },
        { status: 400 }
      );
    }

    await db.settlement.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'تسویه مورد نظر یافت نشد' },
        { status: 404 }
      );
    }
    console.error('Failed to delete settlement:', error);
    return NextResponse.json(
      { error: 'حذف تسویه ناموفق بود' },
      { status: 500 }
    );
  }
}
