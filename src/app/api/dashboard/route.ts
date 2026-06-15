import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dashboardQuerySchema } from '@/lib/validations';

// GET /api/dashboard?year=1405&month=3
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const parsed = dashboardQuerySchema.safeParse({
      year: searchParams.get('year') || undefined,
      month: searchParams.get('month') || undefined,
    });

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { year, month } = parsed.data;

    // Fetch all data for the given period in parallel
    const [
      salesPersons,
      percentageCommissions,
      tieredCommissions,
      finderFees,
      testCosts,
      repairCosts,
      salesShares,
      teamCommissions,
      bonusPenalties,
      salesTargets,
      collections,
      settlements,
      teams,
    ] = await Promise.all([
      db.salesPerson.findMany({ where: { active: true } }),
      db.percentageCommission.findMany({
        where: { periodYear: year, periodMonth: month },
        include: { salesPerson: { select: { id: true, name: true, code: true } } },
      }),
      db.tieredCommission.findMany({
        where: { periodYear: year, periodMonth: month },
        include: { salesPerson: { select: { id: true, name: true, code: true } } },
      }),
      db.finderFee.findMany({
        where: { periodYear: year, periodMonth: month },
      }),
      db.testCost.findMany({
        where: { periodYear: year, periodMonth: month },
      }),
      db.repairCost.findMany({
        where: { periodYear: year, periodMonth: month },
      }),
      db.salesShare.findMany({
        where: { periodYear: year, periodMonth: month },
      }),
      db.teamCommission.findMany({
        where: { periodYear: year, periodMonth: month },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              leader: { select: { id: true, name: true, code: true } },
            },
          },
        },
      }),
      db.bonusPenalty.findMany({
        where: { periodYear: year, periodMonth: month },
      }),
      db.salesTarget.findMany({
        where: { periodYear: year, periodMonth: month },
      }),
      db.collection.findMany({
        where: { periodYear: year, periodMonth: month },
      }),
      db.settlement.findMany({
        where: { periodYear: year, periodMonth: month },
      }),
      db.team.findMany({
        include: {
          leader: { select: { id: true, name: true, code: true } },
          members: { include: { person: { select: { id: true, name: true, code: true } } } },
        },
      }),
    ]);

    // Calculate totals by type
    const totalPercentageCommissions = percentageCommissions.reduce(
      (sum, c) => sum + c.commissionAmount, 0
    );
    const totalTieredCommissions = tieredCommissions.reduce(
      (sum, c) => sum + c.commissionAmount, 0
    );
    const totalFinderFees = finderFees.reduce((sum, f) => sum + f.amount, 0);
    const totalTestCosts = testCosts.reduce((sum, t) => sum + t.amount, 0);
    const totalRepairCosts = repairCosts.reduce((sum, r) => sum + r.amount, 0);
    const totalSalesShares = salesShares.reduce((sum, s) => sum + s.shareAmount, 0);
    const totalTeamCommissions = teamCommissions.reduce(
      (sum, t) => sum + t.totalLeaderCommission, 0
    );
    const totalBonuses = bonusPenalties
      .filter((b) => b.type === 'bonus')
      .reduce((sum, b) => sum + b.amount, 0);
    const totalPenalties = bonusPenalties
      .filter((b) => b.type === 'penalty')
      .reduce((sum, b) => sum + b.amount, 0);
    const totalCollections = collections.reduce((sum, c) => sum + c.amount, 0);
    const totalSettlements = settlements.reduce((sum, s) => sum + s.amount, 0);

    // Total income (commissions + bonuses + finder fees + sales shares)
    const totalIncome =
      totalPercentageCommissions +
      totalTieredCommissions +
      totalFinderFees +
      totalSalesShares +
      totalTeamCommissions +
      totalBonuses;

    // Total deductions (costs + penalties)
    const totalDeductions = totalTestCosts + totalRepairCosts + totalPenalties;

    // Net amount
    const netAmount = totalIncome - totalDeductions;

    // Per-person summary
    const personSummaryMap = new Map<
      string,
      {
        salesPersonId: string;
        name: string;
        code: string;
        totalPercentageCommission: number;
        totalTieredCommission: number;
        totalFinderFee: number;
        totalTestCost: number;
        totalRepairCost: number;
        totalSalesShare: number;
        totalBonus: number;
        totalPenalty: number;
        totalCollections: number;
        totalSettlements: number;
        netAmount: number;
      }
    >();

    // Initialize all sales persons
    for (const sp of salesPersons) {
      personSummaryMap.set(sp.id, {
        salesPersonId: sp.id,
        name: sp.name,
        code: sp.code,
        totalPercentageCommission: 0,
        totalTieredCommission: 0,
        totalFinderFee: 0,
        totalTestCost: 0,
        totalRepairCost: 0,
        totalSalesShare: 0,
        totalBonus: 0,
        totalPenalty: 0,
        totalCollections: 0,
        totalSettlements: 0,
        netAmount: 0,
      });
    }

    // Aggregate per person
    for (const c of percentageCommissions) {
      const entry = personSummaryMap.get(c.salesPersonId);
      if (entry) entry.totalPercentageCommission += c.commissionAmount;
    }
    for (const c of tieredCommissions) {
      const entry = personSummaryMap.get(c.salesPersonId);
      if (entry) entry.totalTieredCommission += c.commissionAmount;
    }
    for (const f of finderFees) {
      const entry = personSummaryMap.get(f.salesPersonId);
      if (entry) entry.totalFinderFee += f.amount;
    }
    for (const t of testCosts) {
      const entry = personSummaryMap.get(t.salesPersonId);
      if (entry) entry.totalTestCost += t.amount;
    }
    for (const r of repairCosts) {
      const entry = personSummaryMap.get(r.salesPersonId);
      if (entry) entry.totalRepairCost += r.amount;
    }
    for (const s of salesShares) {
      const entry = personSummaryMap.get(s.salesPersonId);
      if (entry) entry.totalSalesShare += s.shareAmount;
    }
    for (const b of bonusPenalties) {
      const entry = personSummaryMap.get(b.salesPersonId);
      if (entry) {
        if (b.type === 'bonus') entry.totalBonus += b.amount;
        else entry.totalPenalty += b.amount;
      }
    }
    for (const c of collections) {
      const entry = personSummaryMap.get(c.salesPersonId);
      if (entry) entry.totalCollections += c.amount;
    }
    for (const s of settlements) {
      const entry = personSummaryMap.get(s.salesPersonId);
      if (entry) entry.totalSettlements += s.amount;
    }

    // Calculate net per person
    for (const entry of personSummaryMap.values()) {
      const income =
        entry.totalPercentageCommission +
        entry.totalTieredCommission +
        entry.totalFinderFee +
        entry.totalSalesShare +
        entry.totalBonus;
      const deductions = entry.totalTestCost + entry.totalRepairCost + entry.totalPenalty;
      entry.netAmount = income - deductions;
    }

    // Team leaders also get team commissions
    for (const tc of teamCommissions) {
      const team = teams.find((t) => t.id === tc.teamId);
      if (team) {
        const entry = personSummaryMap.get(team.leaderId);
        if (entry) {
          entry.netAmount += tc.totalLeaderCommission;
        }
      }
    }

    // Sales targets overview
    const salesTargetsOverview = salesTargets.map((st) => {
      const personEntry = personSummaryMap.get(st.salesPersonId);
      return {
        salesPersonId: st.salesPersonId,
        salesPersonName: personEntry?.name ?? 'نامشخص',
        targetAmount: st.targetAmount,
        achievedAmount: st.achievedAmount,
        targetPercent: st.targetPercent,
        bonusPercent: st.bonusPercent,
      };
    });

    return NextResponse.json({
      period: { year, month },
      totals: {
        totalPercentageCommissions,
        totalTieredCommissions,
        totalFinderFees,
        totalTestCosts,
        totalRepairCosts,
        totalSalesShares,
        totalTeamCommissions,
        totalBonuses,
        totalPenalties,
        totalCollections,
        totalSettlements,
        totalIncome,
        totalDeductions,
        netAmount,
      },
      personSummaries: Array.from(personSummaryMap.values()),
      teamCommissions: teamCommissions.map((tc) => ({
        ...tc,
        teamName: tc.team.name,
        leaderName: tc.team.leader.name,
      })),
      salesTargetsOverview,
      counts: {
        salesPersons: salesPersons.length,
        percentageCommissions: percentageCommissions.length,
        tieredCommissions: tieredCommissions.length,
        finderFees: finderFees.length,
        testCosts: testCosts.length,
        repairCosts: repairCosts.length,
        salesShares: salesShares.length,
        teamCommissions: teamCommissions.length,
        bonusPenalties: bonusPenalties.length,
        salesTargets: salesTargets.length,
        collections: collections.length,
        settlements: settlements.length,
        teams: teams.length,
      },
    });
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    return NextResponse.json(
      { error: 'دریافت اطلاعات داشبورد ناموفق بود' },
      { status: 500 }
    );
  }
}
