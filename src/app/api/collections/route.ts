import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { collectionCreateSchema, collectionUpdateSchema } from '@/lib/validations';

// GET /api/collections — list collections
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

    const collections = await db.collection.findMany({
      where,
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });

    return NextResponse.json({ collections });
  } catch (error) {
    console.error('Failed to fetch collections:', error);
    return NextResponse.json(
      { error: 'دریافت وصولی‌ها ناموفق بود' },
      { status: 500 }
    );
  }
}

// POST /api/collections — create a collection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = collectionCreateSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const data = parsed.data;
    const collection = await db.collection.create({
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

    return NextResponse.json({ collection }, { status: 201 });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2003') {
      return NextResponse.json(
        { error: 'فروشنده مشخص شده وجود ندارد' },
        { status: 404 }
      );
    }
    console.error('Failed to create collection:', error);
    return NextResponse.json(
      { error: 'ایجاد وصولی ناموفق بود' },
      { status: 500 }
    );
  }
}

// PUT /api/collections — update a collection
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = collectionUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { id, ...updateData } = parsed.data;

    const collection = await db.collection.update({
      where: { id },
      data: updateData,
      include: { salesPerson: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json({ collection });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'وصولی مورد نظر یافت نشد' },
        { status: 404 }
      );
    }
    console.error('Failed to update collection:', error);
    return NextResponse.json(
      { error: 'به‌روزرسانی وصولی ناموفق بود' },
      { status: 500 }
    );
  }
}

// DELETE /api/collections?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { error: 'شناسه الزامی است' },
        { status: 400 }
      );
    }

    await db.collection.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'وصولی مورد نظر یافت نشد' },
        { status: 404 }
      );
    }
    console.error('Failed to delete collection:', error);
    return NextResponse.json(
      { error: 'حذف وصولی ناموفق بود' },
      { status: 500 }
    );
  }
}
