import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { salesTargetCreateSchema, salesTargetUpdateSchema } from '@/lib/validations';

// GET /api/sales-targets — list sales targets
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

    const salesTargets = await db.salesTarget.findMany({
      where,
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });

    return NextResponse.json({ salesTargets });
  } catch (error) {
    console.error('Failed to fetch sales targets:', error);
    return NextResponse.json(
      { error: 'دریافت اهداف فروش ناموفق بود' },
      { status: 500 }
    );
  }
}

// POST /api/sales-targets — create a sales target
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = salesTargetCreateSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const data = parsed.data;
    const salesTarget = await db.salesTarget.create({
      data: {
        salesPersonId: data.salesPersonId,
        periodYear: data.periodYear,
        periodMonth: data.periodMonth,
        targetAmount: data.targetAmount,
        achievedAmount: data.achievedAmount,
        targetPercent: data.targetPercent,
        bonusPercent: data.bonusPercent,
      },
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json({ salesTarget }, { status: 201 });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2003') {
      return NextResponse.json(
        { error: 'فروشنده مشخص شده وجود ندارد' },
        { status: 404 }
      );
    }
    console.error('Failed to create sales target:', error);
    return NextResponse.json(
      { error: 'ایجاد هدف فروش ناموفق بود' },
      { status: 500 }
    );
  }
}

// PUT /api/sales-targets — update a sales target
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = salesTargetUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { id, ...updateData } = parsed.data;

    const salesTarget = await db.salesTarget.update({
      where: { id },
      data: updateData,
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json({ salesTarget });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'هدف فروش مورد نظر یافت نشد' },
        { status: 404 }
      );
    }
    console.error('Failed to update sales target:', error);
    return NextResponse.json(
      { error: 'به‌روزرسانی هدف فروش ناموفق بود' },
      { status: 500 }
    );
  }
}

// DELETE /api/sales-targets?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { error: 'شناسه الزامی است' },
        { status: 400 }
      );
    }

    await db.salesTarget.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'هدف فروش مورد نظر یافت نشد' },
        { status: 404 }
      );
    }
    console.error('Failed to delete sales target:', error);
    return NextResponse.json(
      { error: 'حذف هدف فروش ناموفق بود' },
      { status: 500 }
    );
  }
}
