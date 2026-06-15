import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';

// GET /api/reports/pdf?year=1405&month=3&salesPersonId=xxx
// Returns structured report data for client-side rendering/printing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const year = parseInt(searchParams.get('year') || '0');
    const month = parseInt(searchParams.get('month') || '0');
    const salesPersonId = searchParams.get('salesPersonId') || undefined;

    if (!year || !month) {
      return NextResponse.json(
        { error: 'سال و ماه الزامی است' },
        { status: 400 }
      );
    }

    const personFilter = salesPersonId ? { salesPersonId } : {};
    const periodFilter = { periodYear: year, periodMonth: month };

    const [
      companySettings,
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
      teams,
    ] = await Promise.all([
      db.setting.findMany(),
      db.salesPerson.findMany({
        where: salesPersonId ? { id: salesPersonId } : { active: true },
        select: { id: true, name: true, code: true, bankName: true, cardNumber: true, shebaNumber: true },
      }),
      db.percentageCommission.findMany({
        where: { ...periodFilter, ...personFilter },
        include: { salesPerson: { select: { name: true, code: true } } },
      }),
      db.tieredCommission.findMany({
        where: { ...periodFilter, ...personFilter },
        include: { salesPerson: { select: { name: true, code: true } } },
      }),
      db.finderFee.findMany({ where: { ...periodFilter, ...personFilter } }),
      db.testCost.findMany({ where: { ...periodFilter, ...personFilter } }),
      db.repairCost.findMany({ where: { ...periodFilter, ...personFilter } }),
      db.salesShare.findMany({ where: { ...periodFilter, ...personFilter } }),
      db.teamCommission.findMany({
        where: periodFilter,
        include: { team: { select: { id: true, name: true, leaderId: true, leader: { select: { name: true } } } } },
      }),
      db.bonusPenalty.findMany({ where: { ...periodFilter, ...personFilter } }),
      db.collection.findMany({ where: { ...periodFilter, ...personFilter } }),
      db.settlement.findMany({ where: { ...periodFilter, ...personFilter } }),
      db.team.findMany({ include: { leader: { select: { id: true, name: true } }, members: { include: { person: { select: { id: true, name: true } } } } } }),
    ]);

    // Build company info from settings
    const settingsMap: Record<string, string> = {};
    for (const s of companySettings) {
      settingsMap[s.key] = s.value;
    }

    // Calculate totals
    const totalPercentageComm = percentageCommissions.reduce((s, c) => s + c.commissionAmount, 0);
    const totalTieredComm = tieredCommissions.reduce((s, c) => s + c.commissionAmount, 0);
    const totalFinderFee = finderFees.reduce((s, f) => s + f.amount, 0);
    const totalTestCost = testCosts.reduce((s, t) => s + t.amount, 0);
    const totalRepairCost = repairCosts.reduce((s, r) => s + r.amount, 0);
    const totalSalesShare = salesShares.reduce((s, ss) => s + ss.shareAmount, 0);
    const totalTeamComm = teamCommissions.reduce((s, tc) => s + tc.totalLeaderCommission, 0);
    const totalBonus = bonusPenalties.filter(b => b.type === 'bonus').reduce((s, b) => s + b.amount, 0);
    const totalPenalty = bonusPenalties.filter(b => b.type === 'penalty').reduce((s, b) => s + b.amount, 0);
    const totalCollections = collections.reduce((s, c) => s + c.amount, 0);
    const totalSettlements = settlements.reduce((s, st) => s + st.amount, 0);

    const totalIncome = totalPercentageComm + totalTieredComm + totalFinderFee + totalSalesShare + totalTeamComm + totalBonus;
    const totalDeductions = totalTestCost + totalRepairCost + totalPenalty;
    const netAmount = totalIncome - totalDeductions;
    const remainingDebt = netAmount - totalSettlements;

    // Per-person summary
    const personSummaryMap = new Map<string, {
      id: string; name: string; code: string;
      percentageComm: number; tieredComm: number; finderFee: number;
      salesShare: number; teamComm: number; bonus: number; penalty: number;
      testCost: number; repairCost: number;
      collections: number; settlements: number;
      totalIncome: number; totalDeductions: number; netAmount: number; remaining: number;
    }>();

    for (const sp of salesPersons) {
      personSummaryMap.set(sp.id, {
        id: sp.id, name: sp.name, code: sp.code,
        percentageComm: 0, tieredComm: 0, finderFee: 0,
        salesShare: 0, teamComm: 0, bonus: 0, penalty: 0,
        testCost: 0, repairCost: 0, collections: 0, settlements: 0,
        totalIncome: 0, totalDeductions: 0, netAmount: 0, remaining: 0,
      });
    }

    for (const c of percentageCommissions) {
      const e = personSummaryMap.get(c.salesPersonId);
      if (e) e.percentageComm += c.commissionAmount;
    }
    for (const c of tieredCommissions) {
      const e = personSummaryMap.get(c.salesPersonId);
      if (e) e.tieredComm += c.commissionAmount;
    }
    for (const f of finderFees) {
      const e = personSummaryMap.get(f.salesPersonId);
      if (e) e.finderFee += f.amount;
    }
    for (const t of testCosts) {
      const e = personSummaryMap.get(t.salesPersonId);
      if (e) e.testCost += t.amount;
    }
    for (const r of repairCosts) {
      const e = personSummaryMap.get(r.salesPersonId);
      if (e) e.repairCost += r.amount;
    }
    for (const s of salesShares) {
      const e = personSummaryMap.get(s.salesPersonId);
      if (e) e.salesShare += s.shareAmount;
    }
    for (const b of bonusPenalties) {
      const e = personSummaryMap.get(b.salesPersonId);
      if (e) {
        if (b.type === 'bonus') e.bonus += b.amount;
        else e.penalty += b.amount;
      }
    }
    for (const c of collections) {
      const e = personSummaryMap.get(c.salesPersonId);
      if (e) e.collections += c.amount;
    }
    for (const s of settlements) {
      const e = personSummaryMap.get(s.salesPersonId);
      if (e) e.settlements += s.amount;
    }
    for (const tc of teamCommissions) {
      const team = teams.find(t => t.id === tc.teamId);
      if (team) {
        const e = personSummaryMap.get(team.leaderId);
        if (e) e.teamComm += tc.totalLeaderCommission;
      }
    }
    for (const e of personSummaryMap.values()) {
      e.totalIncome = e.percentageComm + e.tieredComm + e.finderFee + e.salesShare + e.teamComm + e.bonus;
      e.totalDeductions = e.testCost + e.repairCost + e.penalty;
      e.netAmount = e.totalIncome - e.totalDeductions;
      e.remaining = e.netAmount - e.settlements;
    }

    // Log the export
    logAudit('EXPORT', 'FinancialReport', undefined, { year, month, salesPersonId });

    return NextResponse.json({
      company: {
        name: settingsMap['company_name'] || 'شرکت',
        address: settingsMap['company_address'] || '',
        phone: settingsMap['company_phone'] || '',
        logo: settingsMap['company_logo'] || '',
      },
      period: { year, month },
      grandTotals: {
        totalIncome,
        totalDeductions,
        netAmount,
        totalCollections,
        totalSettlements,
        remainingDebt,
        breakdown: {
          totalPercentageComm,
          totalTieredComm,
          totalFinderFee,
          totalSalesShare,
          totalTeamComm,
          totalBonus,
          totalPenalty,
          totalTestCost,
          totalRepairCost,
        },
      },
      personSummaries: Array.from(personSummaryMap.values()),
    });
  } catch (error) {
    console.error('Failed to generate report:', error);
    return NextResponse.json(
      { error: 'تولید گزارش ناموفق بود' },
      { status: 500 }
    );
  }
}
