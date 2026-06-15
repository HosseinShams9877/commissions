import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { testCostCreateSchema, testCostUpdateSchema } from '@/lib/validations';

// GET /api/test-costs — list test costs
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

    const testCosts = await db.testCost.findMany({
      where,
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });

    return NextResponse.json({ testCosts });
  } catch (error) {
    console.error('Failed to fetch test costs:', error);
    return NextResponse.json(
      { error: 'دریافت هزینه‌های تست ناموفق بود' },
      { status: 500 }
    );
  }
}

// POST /api/test-costs — create a test cost
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = testCostCreateSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const data = parsed.data;
    const testCost = await db.testCost.create({
      data: {
        salesPersonId: data.salesPersonId,
        periodYear: data.periodYear,
        periodMonth: data.periodMonth,
        description: data.description,
        amount: data.amount,
      },
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json({ testCost }, { status: 201 });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2003') {
      return NextResponse.json(
        { error: 'فروشنده مشخص شده وجود ندارد' },
        { status: 404 }
      );
    }
    console.error('Failed to create test cost:', error);
    return NextResponse.json(
      { error: 'ایجاد هزینه تست ناموفق بود' },
      { status: 500 }
    );
  }
}

// PUT /api/test-costs — update a test cost
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = testCostUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { id, ...updateData } = parsed.data;

    const testCost = await db.testCost.update({
      where: { id },
      data: updateData,
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json({ testCost });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'هزینه تست مورد نظر یافت نشد' },
        { status: 404 }
      );
    }
    console.error('Failed to update test cost:', error);
    return NextResponse.json(
      { error: 'به‌روزرسانی هزینه تست ناموفق بود' },
      { status: 500 }
    );
  }
}

// DELETE /api/test-costs?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { error: 'شناسه الزامی است' },
        { status: 400 }
      );
    }

    await db.testCost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'هزینه تست مورد نظر یافت نشد' },
        { status: 404 }
      );
    }
    console.error('Failed to delete test cost:', error);
    return NextResponse.json(
      { error: 'حذف هزینه تست ناموفق بود' },
      { status: 500 }
    );
  }
}
