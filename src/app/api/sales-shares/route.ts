import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { salesShareCreateSchema, salesShareUpdateSchema } from '@/lib/validations';

// GET /api/sales-shares — list sales shares
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

    const salesShares = await db.salesShare.findMany({
      where,
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });

    return NextResponse.json({ salesShares });
  } catch (error) {
    console.error('Failed to fetch sales shares:', error);
    return NextResponse.json(
      { error: 'دریافت سهم‌های فروش ناموفق بود' },
      { status: 500 }
    );
  }
}

// POST /api/sales-shares — create a sales share
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = salesShareCreateSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const data = parsed.data;
    const shareAmount = data.totalSales * (data.sharePercentage / 100);

    const salesShare = await db.salesShare.create({
      data: {
        salesPersonId: data.salesPersonId,
        periodYear: data.periodYear,
        periodMonth: data.periodMonth,
        totalSales: data.totalSales,
        sharePercentage: data.sharePercentage,
        shareAmount,
      },
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json({ salesShare }, { status: 201 });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2003') {
      return NextResponse.json(
        { error: 'فروشنده مشخص شده وجود ندارد' },
        { status: 404 }
      );
    }
    console.error('Failed to create sales share:', error);
    return NextResponse.json(
      { error: 'ایجاد سهم فروش ناموفق بود' },
      { status: 500 }
    );
  }
}

// PUT /api/sales-shares — update a sales share
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = salesShareUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { id, ...updateData } = parsed.data;

    // Recalculate shareAmount if totalSales or sharePercentage changed
    const existing = await db.salesShare.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'سهم فروش مورد نظر یافت نشد' },
        { status: 404 }
      );
    }

    const totalSales = updateData.totalSales ?? existing.totalSales;
    const sharePercentage = updateData.sharePercentage ?? existing.sharePercentage;
    const shareAmount = totalSales * (sharePercentage / 100);

    const salesShare = await db.salesShare.update({
      where: { id },
      data: {
        ...updateData,
        shareAmount,
      },
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json({ salesShare });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'سهم فروش مورد نظر یافت نشد' },
        { status: 404 }
      );
    }
    console.error('Failed to update sales share:', error);
    return NextResponse.json(
      { error: 'به‌روزرسانی سهم فروش ناموفق بود' },
      { status: 500 }
    );
  }
}

// DELETE /api/sales-shares?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { error: 'شناسه الزامی است' },
        { status: 400 }
      );
    }

    await db.salesShare.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'سهم فروش مورد نظر یافت نشد' },
        { status: 404 }
      );
    }
    console.error('Failed to delete sales share:', error);
    return NextResponse.json(
      { error: 'حذف سهم فروش ناموفق بود' },
      { status: 500 }
    );
  }
}
