import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tieredCommissionCreateSchema, tieredCommissionUpdateSchema } from '@/lib/validations';
import { calculateTieredCommission } from '@/lib/commission-calculations';

// GET /api/commissions/tiered — list tiered commissions
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

    const commissions = await db.tieredCommission.findMany({
      where,
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });

    // Parse tiersJson for each commission
    const result = commissions.map((c) => ({
      ...c,
      tiers: JSON.parse(c.tiersJson),
    }));

    return NextResponse.json({ commissions: result });
  } catch (error) {
    console.error('Failed to fetch tiered commissions:', error);
    return NextResponse.json(
      { error: 'دریافت پورسانت‌های پلکانی ناموفق بود' },
      { status: 500 }
    );
  }
}

// POST /api/commissions/tiered — create a tiered commission
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = tieredCommissionCreateSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const data = parsed.data;
    const commissionAmount = calculateTieredCommission(
      data.salesAmount,
      data.tiers,
      data.mode
    );

    const commission = await db.tieredCommission.create({
      data: {
        salesPersonId: data.salesPersonId,
        periodYear: data.periodYear,
        periodMonth: data.periodMonth,
        salesAmount: data.salesAmount,
        commissionAmount,
        mode: data.mode,
        tiersJson: JSON.stringify(data.tiers),
      },
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
    });

    const result = {
      ...commission,
      tiers: JSON.parse(commission.tiersJson),
    };

    return NextResponse.json({ commission: result }, { status: 201 });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2003') {
      return NextResponse.json(
        { error: 'فروشنده مشخص شده وجود ندارد' },
        { status: 404 }
      );
    }
    console.error('Failed to create tiered commission:', error);
    return NextResponse.json(
      { error: 'ایجاد پورسانت پلکانی ناموفق بود' },
      { status: 500 }
    );
  }
}

// PUT /api/commissions/tiered — update a tiered commission
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = tieredCommissionUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { id, ...updateData } = parsed.data;

    const existing = await db.tieredCommission.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'پورسانت پلکانی مورد نظر یافت نشد' },
        { status: 404 }
      );
    }

    const salesAmount = updateData.salesAmount ?? existing.salesAmount;
    const mode = updateData.mode ?? existing.mode;
    const tiers = updateData.tiers ?? JSON.parse(existing.tiersJson);

    const commissionAmount = calculateTieredCommission(
      salesAmount,
      tiers,
      mode as 'proportional' | 'stepped'
    );

    const dataToUpdate: Record<string, unknown> = {
      ...updateData,
      commissionAmount,
    };
    if (updateData.tiers) {
      dataToUpdate.tiersJson = JSON.stringify(updateData.tiers);
      delete dataToUpdate.tiers;
    }

    const commission = await db.tieredCommission.update({
      where: { id },
      data: dataToUpdate,
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
    });

    const result = {
      ...commission,
      tiers: JSON.parse(commission.tiersJson),
    };

    return NextResponse.json({ commission: result });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'پورسانت پلکانی مورد نظر یافت نشد' },
        { status: 404 }
      );
    }
    console.error('Failed to update tiered commission:', error);
    return NextResponse.json(
      { error: 'به‌روزرسانی پورسانت پلکانی ناموفق بود' },
      { status: 500 }
    );
  }
}

// DELETE /api/commissions/tiered?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { error: 'شناسه الزامی است' },
        { status: 400 }
      );
    }

    await db.tieredCommission.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'پورسانت پلکانی مورد نظر یافت نشد' },
        { status: 404 }
      );
    }
    console.error('Failed to delete tiered commission:', error);
    return NextResponse.json(
      { error: 'حذف پورسانت پلکانی ناموفق بود' },
      { status: 500 }
    );
  }
}
