import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/export?type=all|month&year=1405&month=3
export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get('type') || 'all';
    const year = request.nextUrl.searchParams.get('year');
    const month = request.nextUrl.searchParams.get('month');

    if (type === 'month' && year && month) {
      // Export single month data
      const periodYear = parseInt(year);
      const periodMonth = parseInt(month);

      const [
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
      ] = await Promise.all([
        db.percentageCommission.findMany({ where: { periodYear, periodMonth } }),
        db.tieredCommission.findMany({ where: { periodYear, periodMonth } }),
        db.finderFee.findMany({ where: { periodYear, periodMonth } }),
        db.testCost.findMany({ where: { periodYear, periodMonth } }),
        db.repairCost.findMany({ where: { periodYear, periodMonth } }),
        db.salesShare.findMany({ where: { periodYear, periodMonth } }),
        db.teamCommission.findMany({ where: { periodYear, periodMonth } }),
        db.bonusPenalty.findMany({ where: { periodYear, periodMonth } }),
        db.salesTarget.findMany({ where: { periodYear, periodMonth } }),
        db.collection.findMany({ where: { periodYear, periodMonth } }),
        db.settlement.findMany({ where: { periodYear, periodMonth } }),
      ]);

      const salesPersons = await db.salesPerson.findMany();
      const teams = await db.team.findMany({ include: { members: true } });

      const exportData = {
        version: 3,
        exportDate: new Date().toISOString(),
        period: { year: periodYear, month: periodMonth },
        salesPersons,
        teams: teams.map(t => ({
          id: t.id,
          name: t.name,
          leaderId: t.leaderId,
          memberIds: t.members.map(m => m.personId),
          personalPercent: t.personalPercent,
          teamPercent: t.teamPercent,
        })),
        monthlyData: {
          period: { year: periodYear, month: periodMonth },
          percentageCommissions,
          tieredCommissions: tieredCommissions.map(tc => ({
            ...tc,
            tiers: JSON.parse(tc.tiersJson),
            tiersJson: undefined,
          })),
          finderFees,
          testCosts,
          repairCosts,
          salesShares,
          teamCommissions,
          bonusPenalties,
          salesTargets,
          collections,
          settlements,
        },
      };

      return NextResponse.json(exportData);
    }

    // Export all data
    const salesPersons = await db.salesPerson.findMany();
    const teams = await db.team.findMany({ include: { members: true } });
    const [
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
    ] = await Promise.all([
      db.percentageCommission.findMany(),
      db.tieredCommission.findMany(),
      db.finderFee.findMany(),
      db.testCost.findMany(),
      db.repairCost.findMany(),
      db.salesShare.findMany(),
      db.teamCommission.findMany(),
      db.bonusPenalty.findMany(),
      db.salesTarget.findMany(),
      db.collection.findMany(),
      db.settlement.findMany(),
    ]);

    // Group by period
    const monthlyDataMap: Record<string, any> = {};
    const allPeriods = new Set<string>();

    percentageCommissions.forEach(pc => allPeriods.add(`${pc.periodYear}-${pc.periodMonth}`));
    tieredCommissions.forEach(tc => allPeriods.add(`${tc.periodYear}-${tc.periodMonth}`));
    finderFees.forEach(ff => allPeriods.add(`${ff.periodYear}-${ff.periodMonth}`));
    testCosts.forEach(tc => allPeriods.add(`${tc.periodYear}-${tc.periodMonth}`));
    repairCosts.forEach(rc => allPeriods.add(`${rc.periodYear}-${rc.periodMonth}`));
    salesShares.forEach(ss => allPeriods.add(`${ss.periodYear}-${ss.periodMonth}`));
    teamCommissions.forEach(tc => allPeriods.add(`${tc.periodYear}-${tc.periodMonth}`));
    bonusPenalties.forEach(bp => allPeriods.add(`${bp.periodYear}-${bp.periodMonth}`));
    salesTargets.forEach(st => allPeriods.add(`${st.periodYear}-${st.periodMonth}`));
    collections.forEach(c => allPeriods.add(`${c.periodYear}-${c.periodMonth}`));
    settlements.forEach(st => allPeriods.add(`${st.periodYear}-${st.periodMonth}`));

    for (const periodKey of allPeriods) {
      const [y, m] = periodKey.split('-').map(Number);
      monthlyDataMap[periodKey] = {
        period: { year: y, month: m },
        percentageCommissions: percentageCommissions.filter(pc => pc.periodYear === y && pc.periodMonth === m),
        tieredCommissions: tieredCommissions.filter(tc => tc.periodYear === y && tc.periodMonth === m).map(tc => ({
          ...tc,
          tiers: JSON.parse(tc.tiersJson),
          tiersJson: undefined,
        })),
        finderFees: finderFees.filter(ff => ff.periodYear === y && ff.periodMonth === m),
        testCosts: testCosts.filter(tc => tc.periodYear === y && tc.periodMonth === m),
        repairCosts: repairCosts.filter(rc => rc.periodYear === y && rc.periodMonth === m),
        salesShares: salesShares.filter(ss => ss.periodYear === y && ss.periodMonth === m),
        teamCommissions: teamCommissions.filter(tc => tc.periodYear === y && tc.periodMonth === m),
        bonusPenalties: bonusPenalties.filter(bp => bp.periodYear === y && bp.periodMonth === m),
        salesTargets: salesTargets.filter(st => st.periodYear === y && st.periodMonth === m),
        collections: collections.filter(c => c.periodYear === y && c.periodMonth === m),
        settlements: settlements.filter(st => st.periodYear === y && st.periodMonth === m),
      };
    }

    const exportData = {
      version: 3,
      exportDate: new Date().toISOString(),
      salesPersons,
      teams: teams.map(t => ({
        id: t.id,
        name: t.name,
        leaderId: t.leaderId,
        memberIds: t.members.map(m => m.personId),
        personalPercent: t.personalPercent,
        teamPercent: t.teamPercent,
      })),
      monthlyDataMap,
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error('Failed to export data:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
