import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/teams/[id] — get a single team
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const team = await db.team.findUnique({
      where: { id },
      include: {
        leader: { select: { id: true, name: true, code: true } },
        members: {
          include: { person: { select: { id: true, name: true, code: true } } },
        },
        commissions: {
          orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
          take: 12,
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: 'تیم مورد نظر یافت نشد' },
        { status: 404 }
      );
    }

    const result = {
      ...team,
      memberIds: team.members.map((m) => m.personId),
    };

    return NextResponse.json({ team: result });
  } catch (error) {
    console.error('Failed to fetch team:', error);
    return NextResponse.json(
      { error: 'دریافت اطلاعات تیم ناموفق بود' },
      { status: 500 }
    );
  }
}

// PUT /api/teams/[id] — update a team
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { memberIds, ...updateData } = body;

    // If memberIds is provided, replace all members
    if (memberIds !== undefined) {
      await db.teamMember.deleteMany({ where: { teamId: id } });

      if (memberIds.length > 0) {
        await db.teamMember.createMany({
          data: memberIds.map((personId: string) => ({ teamId: id, personId })),
        });
      }
    }

    const team = await db.team.update({
      where: { id },
      data: updateData,
      include: {
        leader: { select: { id: true, name: true, code: true } },
        members: {
          include: { person: { select: { id: true, name: true, code: true } } },
        },
      },
    });

    const result = {
      ...team,
      memberIds: team.members.map((m) => m.personId),
    };

    return NextResponse.json({ team: result });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'تیم مورد نظر یافت نشد' },
        { status: 404 }
      );
    }
    console.error('Failed to update team:', error);
    return NextResponse.json(
      { error: 'به‌روزرسانی تیم ناموفق بود' },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[id] — delete a team
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.team.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'تیم مورد نظر یافت نشد' },
        { status: 404 }
      );
    }
    console.error('Failed to delete team:', error);
    return NextResponse.json(
      { error: 'حذف تیم ناموفق بود' },
      { status: 500 }
    );
  }
}
