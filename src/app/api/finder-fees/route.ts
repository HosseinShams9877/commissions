import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { finderFeeCreateSchema, finderFeeUpdateSchema } from '@/lib/validations';

// GET /api/finder-fees — list finder fees
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

    const finderFees = await db.finderFee.findMany({
      where,
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });

    return NextResponse.json({ finderFees });
  } catch (error) {
    console.error('Failed to fetch finder fees:', error);
    return NextResponse.json(
      { error: 'دریافت حق‌النصب‌ها ناموفق بود' },
      { status: 500 }
    );
  }
}

// POST /api/finder-fees — create a finder fee
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = finderFeeCreateSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const data = parsed.data;
    const finderFee = await db.finderFee.create({
      data: {
        salesPersonId: data.salesPersonId,
        periodYear: data.periodYear,
        periodMonth: data.periodMonth,
        description: data.description,
        amount: data.amount,
      },
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json({ finderFee }, { status: 201 });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2003') {
      return NextResponse.json(
        { error: 'فروشنده مشخص شده وجود ندارد' },
        { status: 404 }
      );
    }
    console.error('Failed to create finder fee:', error);
    return NextResponse.json(
      { error: 'ایجاد حق‌النصب ناموفق بود' },
      { status: 500 }
    );
  }
}

// PUT /api/finder-fees — update a finder fee
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = finderFeeUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { id, ...updateData } = parsed.data;

    const finderFee = await db.finderFee.update({
      where: { id },
      data: updateData,
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json({ finderFee });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'حق‌النصب مورد نظر یافت نشد' },
        { status: 404 }
      );
    }
    console.error('Failed to update finder fee:', error);
    return NextResponse.json(
      { error: 'به‌روزرسانی حق‌النصب ناموفق بود' },
      { status: 500 }
    );
  }
}

// DELETE /api/finder-fees?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { error: 'شناسه الزامی است' },
        { status: 400 }
      );
    }

    await db.finderFee.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'حق‌النصب مورد نظر یافت نشد' },
        { status: 404 }
      );
    }
    console.error('Failed to delete finder fee:', error);
    return NextResponse.json(
      { error: 'حذف حق‌النصب ناموفق بود' },
      { status: 500 }
    );
  }
}
