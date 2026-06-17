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

    const percentageCommissions = await db.percentageCommission.findMany({
      where: { periodYear: year, periodMonth: month },
      include: { salesPerson: true },
    });

    return NextResponse.json({
      success: true,
      percentageCommissions,
    });
  } catch (error) {
    console.error('Error fetching percentage commissions:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در دریافت داده‌ها' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { salesPersonId, salesAmount, percentage, periodYear, periodMonth } = body;

    if (!salesPersonId || !salesAmount || !percentage || !periodYear || !periodMonth) {
      return NextResponse.json(
        { success: false, message: 'همه فیلدها الزامی هستند' },
        { status: 400 }
      );
    }

    const commissionAmount = salesAmount * (percentage / 100);

    const newCommission = await db.percentageCommission.create({
      data: {
        salesPersonId,
        periodYear,
        periodMonth,
        salesAmount,
        percentage,
        commissionAmount,
      },
      include: { salesPerson: true },
    });

    return NextResponse.json({
      success: true,
      percentageCommission: newCommission,
    });
  } catch (error) {
    console.error('Error creating percentage commission:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در ایجاد پورسانت' },
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

    await db.percentageCommission.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'پورسانت با موفقیت حذف شد',
    });
  } catch (error) {
    console.error('Error deleting percentage commission:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در حذف پورسانت' },
      { status: 500 }
    );
  }
}