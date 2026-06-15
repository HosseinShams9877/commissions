import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { repairCostCreateSchema, repairCostUpdateSchema } from '@/lib/validations';

// GET /api/repair-costs — list repair costs
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

    const repairCosts = await db.repairCost.findMany({
      where,
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });

    return NextResponse.json({ repairCosts });
  } catch (error) {
    console.error('Failed to fetch repair costs:', error);
    return NextResponse.json(
      { error: 'دریافت هزینه‌های تعمیرات ناموفق بود' },
      { status: 500 }
    );
  }
}

// POST /api/repair-costs — create a repair cost
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = repairCostCreateSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const data = parsed.data;
    const repairCost = await db.repairCost.create({
      data: {
        salesPersonId: data.salesPersonId,
        periodYear: data.periodYear,
        periodMonth: data.periodMonth,
        description: data.description,
        amount: data.amount,
      },
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json({ repairCost }, { status: 201 });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2003') {
      return NextResponse.json(
        { error: 'فروشنده مشخص شده وجود ندارد' },
        { status: 404 }
      );
    }
    console.error('Failed to create repair cost:', error);
    return NextResponse.json(
      { error: 'ایجاد هزینه تعمیرات ناموفق بود' },
      { status: 500 }
    );
  }
}

// PUT /api/repair-costs — update a repair cost
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = repairCostUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { id, ...updateData } = parsed.data;

    const repairCost = await db.repairCost.update({
      where: { id },
      data: updateData,
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json({ repairCost });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'هزینه تعمیرات مورد نظر یافت نشد' },
        { status: 404 }
      );
    }
    console.error('Failed to update repair cost:', error);
    return NextResponse.json(
      { error: 'به‌روزرسانی هزینه تعمیرات ناموفق بود' },
      { status: 500 }
    );
  }
}

// DELETE /api/repair-costs?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { error: 'شناسه الزامی است' },
        { status: 400 }
      );
    }

    await db.repairCost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'هزینه تعمیرات مورد نظر یافت نشد' },
        { status: 404 }
      );
    }
    console.error('Failed to delete repair cost:', error);
    return NextResponse.json(
      { error: 'حذف هزینه تعمیرات ناموفق بود' },
      { status: 500 }
    );
  }
}
