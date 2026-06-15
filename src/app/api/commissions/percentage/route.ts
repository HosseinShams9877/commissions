import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { percentageCommissionCreateSchema, percentageCommissionUpdateSchema } from '@/lib/validations';

// GET /api/commissions/percentage — list percentage commissions
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

    const commissions = await db.percentageCommission.findMany({
      where,
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });

    return NextResponse.json({ commissions });
  } catch (error) {
    console.error('Failed to fetch percentage commissions:', error);
    return NextResponse.json(
      { error: 'دریافت پورسانت‌های درصدی ناموفق بود' },
      { status: 500 }
    );
  }
}

// POST /api/commissions/percentage — create a percentage commission
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = percentageCommissionCreateSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const data = parsed.data;
    const commissionAmount = data.salesAmount * (data.percentage / 100);

    const commission = await db.percentageCommission.create({
      data: {
        salesPersonId: data.salesPersonId,
        periodYear: data.periodYear,
        periodMonth: data.periodMonth,
        salesAmount: data.salesAmount,
        percentage: data.percentage,
        commissionAmount,
      },
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json({ commission }, { status: 201 });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2003') {
      return NextResponse.json(
        { error: 'فروشنده مشخص شده وجود ندارد' },
        { status: 404 }
      );
    }
    console.error('Failed to create percentage commission:', error);
    return NextResponse.json(
      { error: 'ایجاد پورسانت درصدی ناموفق بود' },
      { status: 500 }
    );
  }
}

// PUT /api/commissions/percentage — update a percentage commission
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = percentageCommissionUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { id, ...updateData } = parsed.data;

    // If salesAmount or percentage changed, recalculate commissionAmount
    const existing = await db.percentageCommission.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'پورسانت مورد نظر یافت نشد' },
        { status: 404 }
      );
    }

    const salesAmount = updateData.salesAmount ?? existing.salesAmount;
    const percentage = updateData.percentage ?? existing.percentage;
    const commissionAmount = salesAmount * (percentage / 100);

    const commission = await db.percentageCommission.update({
      where: { id },
      data: {
        ...updateData,
        commissionAmount,
      },
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json({ commission });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'پورسانت مورد نظر یافت نشد' },
        { status: 404 }
      );
    }
    console.error('Failed to update percentage commission:', error);
    return NextResponse.json(
      { error: 'به‌روزرسانی پورسانت درصدی ناموفق بود' },
      { status: 500 }
    );
  }
}

// DELETE /api/commissions/percentage?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { error: 'شناسه الزامی است' },
        { status: 400 }
      );
    }

    await db.percentageCommission.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'پورسانت مورد نظر یافت نشد' },
        { status: 404 }
      );
    }
    console.error('Failed to delete percentage commission:', error);
    return NextResponse.json(
      { error: 'حذف پورسانت درصدی ناموفق بود' },
      { status: 500 }
    );
  }
}
