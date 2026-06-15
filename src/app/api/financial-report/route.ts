import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { financialReportQuerySchema } from '@/lib/validations';

// GET /api/financial-report?fromYear=1404&fromMonth=1&toYear=1405&toMonth=12&salesPersonId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const parsed = financialReportQuerySchema.safeParse({
      fromYear: searchParams.get('fromYear') || undefined,
      fromMonth: searchParams.get('fromMonth') || undefined,
      toYear: searchParams.get('toYear') || undefined,
      toMonth: searchParams.get('toMonth') || undefined,
      salesPersonId: searchParams.get('salesPersonId') || undefined,
    });

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { fromYear, fromMonth, toYear, toMonth, salesPersonId } = parsed.data;

    // Build period filter
    const periodFilter: Record<string, unknown> = {};
    if (fromYear !== undefined || toYear !== undefined) {
      const orConditions: Record<string, unknown>[] = [];

      if (fromYear !== undefined && toYear !== undefined) {
        // Years strictly between fromYear and toYear
        if (toYear - fromYear > 1) {
          orConditions.push({
            periodYear: { gt: fromYear, lt: toYear },
          });
        }
        // Same as fromYear with appropriate month
        if (fromMonth !== undefined) {
          orConditions.push({
            AND: [
              { periodYear: fromYear },
              { periodMonth: { gte: fromMonth } },
            ],
          });
        } else {
          orConditions.push({ periodYear: fromYear });
        }
        // Same as toYear with appropriate month
        if (toMonth !== undefined) {
          orConditions.push({
            AND: [
              { periodYear: toYear },
              { periodMonth: { lte: toMonth } },
            ],
          });
        } else {
          orConditions.push({ periodYear: toYear });
        }
      } else if (fromYear !== undefined) {
        if (fromMonth !== undefined) {
          orConditions.push({
            AND: [
              { periodYear: fromYear },
              { periodMonth: { gte: fromMonth } },
            ],
          });
          orConditions.push({ periodYear: { gt: fromYear } });
        } else {
          orConditions.push({ periodYear: { gte: fromYear } });
        }
      } else if (toYear !== undefined) {
        if (toMonth !== undefined) {
          orConditions.push({
            AND: [
              { periodYear: toYear },
              { periodMonth: { lte: toMonth } },
            ],
          });
          orConditions.push({ periodYear: { lt: toYear } });
        } else {
          orConditions.push({ periodYear: { lte: toYear } });
        }
      }

      if (orConditions.length > 0) {
        periodFilter.OR = orConditions;
      }
    }

    // Sales person filter
    const personFilter = salesPersonId
      ? { salesPersonId }
      : {};

    const combinedFilter = {
      ...periodFilter,
      ...personFilter,
    };

    // Fetch all financial data + all sales persons in parallel
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
      collections,
      settlements,
    ] = await Promise.all([
      db.salesPerson.findMany({ select: { id: true, name: true, code: true } }),
      db.percentageCommission.findMany({
        where: combinedFilter,
        orderBy: [{ periodYear: 'asc' }, { periodMonth: 'asc' }],
      }),
      db.tieredCommission.findMany({
        where: combinedFilter,
        orderBy: [{ periodYear: 'asc' }, { periodMonth: 'asc' }],
      }),
      db.finderFee.findMany({
        where: combinedFilter,
        orderBy: [{ periodYear: 'asc' }, { periodMonth: 'asc' }],
      }),
      db.testCost.findMany({
        where: combinedFilter,
        orderBy: [{ periodYear: 'asc' }, { periodMonth: 'asc' }],
      }),
      db.repairCost.findMany({
        where: combinedFilter,
        orderBy: [{ periodYear: 'asc' }, { periodMonth: 'asc' }],
      }),
      db.salesShare.findMany({
        where: combinedFilter,
        orderBy: [{ periodYear: 'asc' }, { periodMonth: 'asc' }],
      }),
      db.teamCommission.findMany({
        where: periodFilter,
        include: {
          team: {
            select: {
              id: true,
              name: true,
              leaderId: true,
              leader: { select: { id: true, name: true, code: true } },
            },
          },
        },
        orderBy: [{ periodYear: 'asc' }, { periodMonth: 'asc' }],
      }),
      db.bonusPenalty.findMany({
        where: combinedFilter,
        orderBy: [{ periodYear: 'asc' }, { periodMonth: 'asc' }],
      }),
      db.collection.findMany({
        where: combinedFilter,
        orderBy: [{ periodYear: 'asc' }, { periodMonth: 'asc' }],
      }),
      db.settlement.findMany({
        where: combinedFilter,
        orderBy: [{ periodYear: 'asc' }, { periodMonth: 'asc' }],
      }),
    ]);

    // Build person lookup map
    const personMap = new Map(salesPersons.map((sp) => [sp.id, sp]));
    function getPersonName(id: string) {
      return personMap.get(id)?.name ?? 'نامشخص';
    }
    function getPersonCode(id: string) {
      return personMap.get(id)?.code ?? '';
    }

    // Calculate grand totals
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

    const totalIncome =
      totalPercentageCommissions +
      totalTieredCommissions +
      totalFinderFees +
      totalSalesShares +
      totalTeamCommissions +
      totalBonuses;

    const totalDeductions = totalTestCosts + totalRepairCosts + totalPenalties;
    const netAmount = totalIncome - totalDeductions;

    // Group by period
    interface PeriodSummary {
      periodYear: number;
      periodMonth: number;
      totalIncome: number;
      totalDeductions: number;
      netAmount: number;
      percentageCommissions: number;
      tieredCommissions: number;
      finderFees: number;
      testCosts: number;
      repairCosts: number;
      salesShares: number;
      teamCommissions: number;
      bonuses: number;
      penalties: number;
      collections: number;
      settlements: number;
    }

    const byPeriod = new Map<string, PeriodSummary>();

    function getOrCreatePeriod(year: number, month: number): PeriodSummary {
      const key = `${year}-${month.toString().padStart(2, '0')}`;
      if (!byPeriod.has(key)) {
        byPeriod.set(key, {
          periodYear: year,
          periodMonth: month,
          totalIncome: 0,
          totalDeductions: 0,
          netAmount: 0,
          percentageCommissions: 0,
          tieredCommissions: 0,
          finderFees: 0,
          testCosts: 0,
          repairCosts: 0,
          salesShares: 0,
          teamCommissions: 0,
          bonuses: 0,
          penalties: 0,
          collections: 0,
          settlements: 0,
        });
      }
      return byPeriod.get(key)!;
    }

    for (const c of percentageCommissions) {
      const p = getOrCreatePeriod(c.periodYear, c.periodMonth);
      p.percentageCommissions += c.commissionAmount;
    }
    for (const c of tieredCommissions) {
      const p = getOrCreatePeriod(c.periodYear, c.periodMonth);
      p.tieredCommissions += c.commissionAmount;
    }
    for (const f of finderFees) {
      const p = getOrCreatePeriod(f.periodYear, f.periodMonth);
      p.finderFees += f.amount;
    }
    for (const t of testCosts) {
      const p = getOrCreatePeriod(t.periodYear, t.periodMonth);
      p.testCosts += t.amount;
    }
    for (const r of repairCosts) {
      const p = getOrCreatePeriod(r.periodYear, r.periodMonth);
      p.repairCosts += r.amount;
    }
    for (const s of salesShares) {
      const p = getOrCreatePeriod(s.periodYear, s.periodMonth);
      p.salesShares += s.shareAmount;
    }
    for (const tc of teamCommissions) {
      const p = getOrCreatePeriod(tc.periodYear, tc.periodMonth);
      p.teamCommissions += tc.totalLeaderCommission;
    }
    for (const b of bonusPenalties) {
      const p = getOrCreatePeriod(b.periodYear, b.periodMonth);
      if (b.type === 'bonus') p.bonuses += b.amount;
      else p.penalties += b.amount;
    }
    for (const c of collections) {
      const p = getOrCreatePeriod(c.periodYear, c.periodMonth);
      p.collections += c.amount;
    }
    for (const s of settlements) {
      const p = getOrCreatePeriod(s.periodYear, s.periodMonth);
      p.settlements += s.amount;
    }

    // Calculate totals per period
    for (const p of byPeriod.values()) {
      p.totalIncome =
        p.percentageCommissions +
        p.tieredCommissions +
        p.finderFees +
        p.salesShares +
        p.teamCommissions +
        p.bonuses;
      p.totalDeductions = p.testCosts + p.repairCosts + p.penalties;
      p.netAmount = p.totalIncome - p.totalDeductions;
    }

    // Group by sales person
    interface PersonSummary {
      salesPersonId: string;
      salesPersonName: string;
      salesPersonCode: string;
      totalIncome: number;
      totalDeductions: number;
      netAmount: number;
      percentageCommissions: number;
      tieredCommissions: number;
      finderFees: number;
      testCosts: number;
      repairCosts: number;
      salesShares: number;
      bonuses: number;
      penalties: number;
      collections: number;
      settlements: number;
    }

    const byPerson = new Map<string, PersonSummary>();

    function getOrCreatePerson(id: string): PersonSummary {
      if (!byPerson.has(id)) {
        byPerson.set(id, {
          salesPersonId: id,
          salesPersonName: getPersonName(id),
          salesPersonCode: getPersonCode(id),
          totalIncome: 0,
          totalDeductions: 0,
          netAmount: 0,
          percentageCommissions: 0,
          tieredCommissions: 0,
          finderFees: 0,
          testCosts: 0,
          repairCosts: 0,
          salesShares: 0,
          bonuses: 0,
          penalties: 0,
          collections: 0,
          settlements: 0,
        });
      }
      return byPerson.get(id)!;
    }

    for (const c of percentageCommissions) {
      const p = getOrCreatePerson(c.salesPersonId);
      p.percentageCommissions += c.commissionAmount;
    }
    for (const c of tieredCommissions) {
      const p = getOrCreatePerson(c.salesPersonId);
      p.tieredCommissions += c.commissionAmount;
    }
    for (const f of finderFees) {
      const p = getOrCreatePerson(f.salesPersonId);
      p.finderFees += f.amount;
    }
    for (const t of testCosts) {
      const p = getOrCreatePerson(t.salesPersonId);
      p.testCosts += t.amount;
    }
    for (const r of repairCosts) {
      const p = getOrCreatePerson(r.salesPersonId);
      p.repairCosts += r.amount;
    }
    for (const s of salesShares) {
      const p = getOrCreatePerson(s.salesPersonId);
      p.salesShares += s.shareAmount;
    }
    for (const b of bonusPenalties) {
      const p = getOrCreatePerson(b.salesPersonId);
      if (b.type === 'bonus') p.bonuses += b.amount;
      else p.penalties += b.amount;
    }
    for (const c of collections) {
      const p = getOrCreatePerson(c.salesPersonId);
      p.collections += c.amount;
    }
    for (const s of settlements) {
      const p = getOrCreatePerson(s.salesPersonId);
      p.settlements += s.amount;
    }

    // Add team commissions to the team leader
    for (const tc of teamCommissions) {
      const leaderId = tc.team.leaderId;
      if (leaderId) {
        const p = getOrCreatePerson(leaderId);
        p.bonuses += tc.totalLeaderCommission;
      }
    }

    // Calculate totals per person
    for (const p of byPerson.values()) {
      p.totalIncome =
        p.percentageCommissions +
        p.tieredCommissions +
        p.finderFees +
        p.salesShares +
        p.bonuses;
      p.totalDeductions = p.testCosts + p.repairCosts + p.penalties;
      p.netAmount = p.totalIncome - p.totalDeductions;
    }

    return NextResponse.json({
      filters: {
        fromYear,
        fromMonth,
        toYear,
        toMonth,
        salesPersonId,
      },
      grandTotals: {
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
      byPeriod: Array.from(byPeriod.values()).sort((a, b) =>
        a.periodYear !== b.periodYear
          ? a.periodYear - b.periodYear
          : a.periodMonth - b.periodMonth
      ),
      byPerson: Array.from(byPerson.values()).sort((a, b) =>
        b.netAmount - a.netAmount
      ),
    });
  } catch (error) {
    console.error('Failed to fetch financial report:', error);
    return NextResponse.json(
      { error: 'دریافت گزارش مالی ناموفق بود' },
      { status: 500 }
    );
  }
}
