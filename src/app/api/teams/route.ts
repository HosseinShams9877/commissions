import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { teamCreateSchema, teamUpdateSchema } from '@/lib/validations';

// GET /api/teams — list all teams
export async function GET(request: NextRequest) {
  try {
    const teams = await db.team.findMany({
      include: {
        leader: { select: { id: true, name: true, code: true } },
        members: {
          include: { person: { select: { id: true, name: true, code: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Transform members to memberIds for client compatibility
    const result = teams.map((team) => ({
      ...team,
      memberIds: team.members.map((m) => m.personId),
    }));

    return NextResponse.json({ teams: result });
  } catch (error) {
    console.error('Failed to fetch teams:', error);
    return NextResponse.json(
      { error: 'دریافت تیم‌ها ناموفق بود' },
      { status: 500 }
    );
  }
}

// POST /api/teams — create a new team
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = teamCreateSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const data = parsed.data;
    const memberIds: string[] = data.memberIds ?? [];

    const team = await db.team.create({
      data: {
        name: data.name,
        leaderId: data.leaderId,
        personalPercent: data.personalPercent,
        teamPercent: data.teamPercent,
        members: {
          create: memberIds.map((personId) => ({ personId })),
        },
      },
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

    return NextResponse.json({ team: result }, { status: 201 });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2003') {
      return NextResponse.json(
        { error: 'سرگروه مشخص شده وجود ندارد' },
        { status: 404 }
      );
    }
    if (prismaError.code === 'P2002') {
      return NextResponse.json(
        { error: 'عضو تیم تکراری است' },
        { status: 409 }
      );
    }
    console.error('Failed to create team:', error);
    return NextResponse.json(
      { error: 'ایجاد تیم ناموفق بود' },
      { status: 500 }
    );
  }
}

// PUT /api/teams — update a team
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = teamUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { id, memberIds, ...updateData } = parsed.data;

    // If memberIds is provided, replace all members
    if (memberIds !== undefined) {
      // Delete existing members first
      await db.teamMember.deleteMany({ where: { teamId: id } });

      // Create new members
      if (memberIds.length > 0) {
        await db.teamMember.createMany({
          data: memberIds.map((personId) => ({ teamId: id, personId })),
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

// DELETE /api/teams?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { error: 'شناسه الزامی است' },
        { status: 400 }
      );
    }

    // TeamMember will be cascade deleted
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
