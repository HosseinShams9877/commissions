import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '0');
    const month = parseInt(searchParams.get('month') || '0');

    if (!year || !month) {
      return NextResponse.json(
        { success: false, message: 'سال و ماه الزامی است' },
        { status: 400 }
      );
    }

    const tieredCommissions = await db.tieredCommission.findMany({
      where: { periodYear: year, periodMonth: month },
      include: { salesPerson: true },
    });

    return NextResponse.json({
      success: true,
      tieredCommissions,
    });
  } catch (error) {
    console.error('Error fetching tiered commissions:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در دریافت داده‌ها' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { salesPersonId, salesAmount, tiers, mode, periodYear, periodMonth } = body;

    if (!salesPersonId || !salesAmount || !tiers || !mode || !periodYear || !periodMonth) {
      return NextResponse.json(
        { success: false, message: 'همه فیلدها الزامی هستند' },
        { status: 400 }
      );
    }

    const tiersJson = JSON.stringify(tiers);
    const lastTier = tiers[tiers.length - 1];
    const commissionAmount = salesAmount * (lastTier?.percentage / 100) || 0;

    const newCommission = await db.tieredCommission.create({
      data: {
        salesPersonId,
        periodYear,
        periodMonth,
        salesAmount,
        commissionAmount,
        mode,
        tiersJson,
      },
      include: { salesPerson: true },
    });

    return NextResponse.json({
      success: true,
      tieredCommission: newCommission,
    });
  } catch (error) {
    console.error('Error creating tiered commission:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در ایجاد پورسانت پلکانی' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'شناسه الزامی است' },
        { status: 400 }
      );
    }

    await db.tieredCommission.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'پورسانت با موفقیت حذف شد',
    });
  } catch (error) {
    console.error('Error deleting tiered commission:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در حذف پورسانت' },
      { status: 500 }
    );
  }
}