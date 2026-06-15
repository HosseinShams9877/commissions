import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/sales-persons — list all sales persons
export async function GET() {
  try {
    const salesPersons = await db.salesPerson.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ salesPersons });
  } catch (error) {
    console.error('Failed to fetch sales persons:', error);
    return NextResponse.json({ error: 'Failed to fetch sales persons' }, { status: 500 });
  }
}

// POST /api/sales-persons — create a new sales person
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, code, bankName, cardNumber, shebaNumber, defaultPercentage } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'name and code are required' }, { status: 400 });
    }

    const salesPerson = await db.salesPerson.create({
      data: {
        name,
        code,
        bankName: bankName || null,
        cardNumber: cardNumber || null,
        shebaNumber: shebaNumber || null,
        defaultPercentage: defaultPercentage || 0,
      },
    });

    return NextResponse.json({ salesPerson }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'کد فروشنده تکراری است' }, { status: 409 });
    }
    console.error('Failed to create sales person:', error);
    return NextResponse.json({ error: 'Failed to create sales person' }, { status: 500 });
  }
}

// PUT /api/sales-persons — update a sales person
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, code, bankName, cardNumber, shebaNumber, defaultPercentage, active } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const salesPerson = await db.salesPerson.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(bankName !== undefined && { bankName }),
        ...(cardNumber !== undefined && { cardNumber }),
        ...(shebaNumber !== undefined && { shebaNumber }),
        ...(defaultPercentage !== undefined && { defaultPercentage }),
        ...(active !== undefined && { active }),
      },
    });

    return NextResponse.json({ salesPerson });
  } catch (error) {
    console.error('Failed to update sales person:', error);
    return NextResponse.json({ error: 'Failed to update sales person' }, { status: 500 });
  }
}

// DELETE /api/sales-persons?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await db.salesPerson.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete sales person:', error);
    return NextResponse.json({ error: 'Failed to delete sales person' }, { status: 500 });
  }
}
