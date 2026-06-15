import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Backup } from '@prisma/client';

// GET /api/backup — list all backups
export async function GET() {
  try {
    const backups = await db.backup.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json({ backups });
  } catch (error) {
    console.error('Failed to list backups:', error);
    return NextResponse.json({ error: 'Failed to list backups' }, { status: 500 });
  }
}

// POST /api/backup — create a new backup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, dataJson } = body;

    if (!dataJson) {
      return NextResponse.json({ error: 'dataJson is required' }, { status: 400 });
    }

    const backup = await db.backup.create({
      data: {
        name: name || `backup-${new Date().toISOString().slice(0, 10)}`,
        dataJson: typeof dataJson === 'string' ? dataJson : JSON.stringify(dataJson),
        size: typeof dataJson === 'string' ? dataJson.length : JSON.stringify(dataJson).length,
      },
    });

    return NextResponse.json({ backup }, { status: 201 });
  } catch (error) {
    console.error('Failed to create backup:', error);
    return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 });
  }
}

// DELETE /api/backup?id=xxx — delete a backup
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await db.backup.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete backup:', error);
    return NextResponse.json({ error: 'Failed to delete backup' }, { status: 500 });
  }
}
