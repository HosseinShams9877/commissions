'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCommissionStore } from '@/lib/store';
import {
  formatCurrency, formatNumber, toPersianDigits,
  formatShamsiDate, PERSIAN_MONTHS, cn,
} from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Printer, Building2, Calendar, Wallet, TrendingUp,
  ArrowUpCircle, ArrowDownCircle, Users,
} from 'lucide-react';
import { useNotifications } from '@/hooks/use-notifications';
import { 
  useSalesPersons,
  usePercentageCommissions, 
  useTieredCommissions, 
  useFinderFees, 
  useTestCosts, 
  useRepairCosts, 
  useSalesShares, 
  useTeamCommissions, 
  useBonusPenalties,
  useCollections,
  useSettlements,
} from '@/hooks/use-api';

interface ReportData {
  company: { name: string; address: string; phone: string; logo: string };
  period: { year: number; month: number };
  grandTotals: {
    totalIncome: number;
    totalDeductions: number;
    netAmount: number;
    totalCollections: number;
    totalSettlements: number;
    remainingDebt: number;
    breakdown: {
      totalPercentageComm: number;
      totalTieredComm: number;
      totalFinderFee: number;
      totalSalesShare: number;
      totalTeamComm: number;
      totalBonus: number;
      totalPenalty: number;
      totalTestCost: number;
      totalRepairCost: number;
    };
  };
  personSummaries: Array<{
    id: string; name: string; code: string;
    percentageComm: number; tieredComm: number; finderFee: number;
    salesShare: number; teamComm: number; bonus: number; penalty: number;
    testCost: number; repairCost: number;
    collections: number; settlements: number;
    totalIncome: number; totalDeductions: number; netAmount: number; remaining: number;
  }>;
}

export function PrintReport() {
 const { currentPeriod } = useCommissionStore();
  const { addNotification } = useNotifications();
  
  // گرفتن همه داده‌ها از API
  const { data: salesPersonsData } = useSalesPersons();
  const { data: percentageData } = usePercentageCommissions(currentPeriod.year, currentPeriod.month);
  const { data: tieredData } = useTieredCommissions(currentPeriod.year, currentPeriod.month);
  const { data: finderFeeData } = useFinderFees(currentPeriod.year, currentPeriod.month);
  const { data: testCostData } = useTestCosts(currentPeriod.year, currentPeriod.month);
  const { data: repairCostData } = useRepairCosts(currentPeriod.year, currentPeriod.month);
  const { data: salesShareData } = useSalesShares(currentPeriod.year, currentPeriod.month);
  const { data: teamCommissionData } = useTeamCommissions(currentPeriod.year, currentPeriod.month);
  const { data: bonusPenaltyData } = useBonusPenalties(currentPeriod.year, currentPeriod.month);
  const { data: collectionData } = useCollections(currentPeriod.year, currentPeriod.month);
  const { data: settlementData } = useSettlements(currentPeriod.year, currentPeriod.month);
  
  // داده‌های محلی
  const salesPersons = salesPersonsData?.salesPersons || [];
  const percentageCommissions = percentageData?.percentageCommissions || [];
  const tieredCommissions = tieredData?.tieredCommissions || [];
  const finderFees = finderFeeData?.finderFees || [];
  const testCosts = testCostData?.testCosts || [];
  const repairCosts = repairCostData?.repairCosts || [];
  const salesShares = salesShareData?.salesShares || [];
  const teamCommissions = teamCommissionData?.teamCommissions || [];
  const bonusPenalties = bonusPenaltyData?.bonusPenalties || [];
  const collections = collectionData?.collections || [];
  const settlements = settlementData?.settlements || [];
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = useCallback(async () => {
    setLoading(true);

    try {
      const res = await fetch(`/api/reports/pdf?year=${currentPeriod.year}&month=${currentPeriod.month}`);
      if (!res.ok) throw new Error('خطا در دریافت گزارش');
      const data: ReportData = await res.json();
      setReportData(data);
    } catch {
      // Fallback: generate from local store
    

      const totalPercentageComm = percentageCommissions.reduce((s, pc) => s + pc.commissionAmount, 0);
      const totalTieredComm = tieredCommissions.reduce((s, tc) => s + tc.commissionAmount, 0);
      const totalFinderFee = finderFees.reduce((s, ff) => s + ff.amount, 0);
      const totalSalesShare = salesShares.reduce((s, ss) => s + ss.shareAmount, 0);
      const totalTeamComm = teamCommissions.reduce((s, tc) => s + tc.totalLeaderCommission, 0);
      const totalBonus = bonusPenalties.filter(bp => bp.type === 'bonus').reduce((s, bp) => s + bp.amount, 0);
      const totalPenalty = bonusPenalties.filter(bp => bp.type === 'penalty').reduce((s, bp) => s + bp.amount, 0);
      const totalTestCost = testCosts.reduce((s, tc) => s + tc.amount, 0);
      const totalRepairCost = repairCosts.reduce((s, rc) => s + rc.amount, 0);
      const totalCollections = collections.reduce((s, c) => s + c.amount, 0);
      const totalSettlements = settlements.reduce((s, st) => s + st.amount, 0);

      const totalIncome = totalPercentageComm + totalTieredComm + totalFinderFee + totalSalesShare + totalTeamComm + totalBonus;
      const totalDeductions = totalTestCost + totalRepairCost + totalPenalty;
      const netAmount = totalIncome - totalDeductions;

      const personSummaries = salesPersons.map(sp => {
        const pComm = percentageCommissions.filter(pc => pc.salesPersonId === sp.id).reduce((s, pc) => s + pc.commissionAmount, 0);
        const tComm = tieredCommissions.filter(tc => tc.salesPersonId === sp.id).reduce((s, tc) => s + tc.commissionAmount, 0);
        const fFee = finderFees.filter(ff => ff.salesPersonId === sp.id).reduce((s, ff) => s + ff.amount, 0);
        const sShare = salesShares.filter(ss => ss.salesPersonId === sp.id).reduce((s, ss) => s + ss.shareAmount, 0);
        const bonus = bonusPenalties.filter(bp => bp.salesPersonId === sp.id && bp.type === 'bonus').reduce((s, bp) => s + bp.amount, 0);
        const penalty = bonusPenalties.filter(bp => bp.salesPersonId === sp.id && bp.type === 'penalty').reduce((s, bp) => s + bp.amount, 0);
        const tCost = testCosts.filter(tc => tc.salesPersonId === sp.id).reduce((s, tc) => s + tc.amount, 0);
        const rCost = repairCosts.filter(rc => rc.salesPersonId === sp.id).reduce((s, rc) => s + rc.amount, 0);
        const coll = collections.filter(c => c.salesPersonId === sp.id).reduce((s, c) => s + c.amount, 0);
        const settl = settlements.filter(st => st.salesPersonId === sp.id).reduce((s, st) => s + st.amount, 0);

        const inc = pComm + tComm + fFee + sShare + bonus;
        const ded = tCost + rCost + penalty;
        return {
          id: sp.id, name: sp.name, code: sp.code,
          percentageComm: pComm, tieredComm: tComm, finderFee: fFee,
          salesShare: sShare, teamComm: 0, bonus, penalty,
          testCost: tCost, repairCost: rCost,
          collections: coll, settlements: settl,
          totalIncome: inc, totalDeductions: ded, netAmount: inc - ded, remaining: inc - ded - settl,
        };
      });

      setReportData({
        company: { name: 'شرکت', address: '', phone: '', logo: '' },
        period: currentPeriod,
        grandTotals: {
          totalIncome, totalDeductions, netAmount,
          totalCollections, totalSettlements,
          remainingDebt: netAmount - totalSettlements,
          breakdown: {
            totalPercentageComm, totalTieredComm, totalFinderFee,
            totalSalesShare, totalTeamComm, totalBonus, totalPenalty,
            totalTestCost, totalRepairCost,
          },
        },
        personSummaries,
      });
    } finally {
      setLoading(false);
    }
  }, [currentPeriod, salesPersons, percentageCommissions, tieredCommissions, finderFees, testCosts, repairCosts, salesShares, teamCommissions, bonusPenalties, collections, settlements]);

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  const handlePrint = () => {
    window.print();
    addNotification('success', 'چاپ گزارش', 'گزارش مالی برای چاپ ارسال شد');
  };

  if (!reportData) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const periodLabel = formatShamsiDate(reportData.period.year, reportData.period.month);
  const gt = reportData.grandTotals;
  const bd = gt.breakdown;
  const persons = reportData.personSummaries.filter(p =>
    p.totalIncome || p.totalDeductions || p.collections || p.settlements
  );

  return (
    <div className="space-y-6">
      {/* Print button */}
      <div className="flex items-center gap-3 no-print">
        <Button onClick={handlePrint} className="gap-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl">
          <Printer className="h-4 w-4" />
          چاپ گزارش
        </Button>
        <Button variant="outline" onClick={generateReport} disabled={loading} className="gap-2 rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50">
          به‌روزرسانی داده‌ها
        </Button>
      </div>

      {/* Print-Ready Report */}
      <div className="print-report bg-white rounded-2xl shadow-sm border p-8 space-y-8">
        {/* Company Header */}
        <div className="text-center border-b-2 border-emerald-600 pb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Building2 className="h-8 w-8 text-emerald-600" />
            <h1 className="text-2xl font-black text-emerald-800">{reportData.company.name}</h1>
          </div>
          {reportData.company.address && (
            <p className="text-sm text-gray-600">{reportData.company.address}</p>
          )}
          {reportData.company.phone && (
            <p className="text-sm text-gray-600">تلفن: {toPersianDigits(reportData.company.phone)}</p>
          )}
        </div>

        {/* Period Info */}
        <div className="flex items-center justify-center gap-4 bg-emerald-50 rounded-xl p-4">
          <Calendar className="h-6 w-6 text-emerald-600" />
          <h2 className="text-lg font-bold text-emerald-800">
            گزارش مالی — {periodLabel}
          </h2>
        </div>

        {/* Financial Summary */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-600" />
            خلاصه مالی
          </h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-emerald-50">
                <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">عنوان</th>
                <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">مبلغ (ریال)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-emerald-50/30">
                <td className="border border-gray-300 px-3 py-2 text-sm font-semibold text-emerald-800" colSpan={2}>
                  <ArrowUpCircle className="h-4 w-4 inline ml-1" />
                  درآمد فروشندگان
                </td>
              </tr>
              <tr><td className="border border-gray-300 px-3 py-1.5 text-sm">پورسانت درصدی</td><td className="border border-gray-300 px-3 py-1.5 text-sm text-left font-mono" dir="ltr">{formatNumber(bd.totalPercentageComm)}</td></tr>
              <tr><td className="border border-gray-300 px-3 py-1.5 text-sm">پورسانت پلکانی</td><td className="border border-gray-300 px-3 py-1.5 text-sm text-left font-mono" dir="ltr">{formatNumber(bd.totalTieredComm)}</td></tr>
              <tr><td className="border border-gray-300 px-3 py-1.5 text-sm">حق‌النصب</td><td className="border border-gray-300 px-3 py-1.5 text-sm text-left font-mono" dir="ltr">{formatNumber(bd.totalFinderFee)}</td></tr>
              <tr><td className="border border-gray-300 px-3 py-1.5 text-sm">سهم از فروش</td><td className="border border-gray-300 px-3 py-1.5 text-sm text-left font-mono" dir="ltr">{formatNumber(bd.totalSalesShare)}</td></tr>
              <tr><td className="border border-gray-300 px-3 py-1.5 text-sm">پورسانت تیمی</td><td className="border border-gray-300 px-3 py-1.5 text-sm text-left font-mono" dir="ltr">{formatNumber(bd.totalTeamComm)}</td></tr>
              <tr><td className="border border-gray-300 px-3 py-1.5 text-sm font-semibold">پاداش</td><td className="border border-gray-300 px-3 py-1.5 text-sm text-left font-mono font-semibold text-emerald-700" dir="ltr">{formatNumber(bd.totalBonus)}</td></tr>
              <tr className="bg-emerald-50/50 font-bold">
                <td className="border border-gray-300 px-3 py-2 text-sm">مجموع درآمد</td>
                <td className="border border-gray-300 px-3 py-2 text-sm text-left font-mono text-emerald-700" dir="ltr">{formatNumber(gt.totalIncome)}</td>
              </tr>

              <tr className="bg-rose-50/30">
                <td className="border border-gray-300 px-3 py-2 text-sm font-semibold text-rose-800" colSpan={2}>
                  <ArrowDownCircle className="h-4 w-4 inline ml-1" />
                  کسورات
                </td>
              </tr>
              <tr><td className="border border-gray-300 px-3 py-1.5 text-sm">هزینه تست</td><td className="border border-gray-300 px-3 py-1.5 text-sm text-left font-mono" dir="ltr">{formatNumber(bd.totalTestCost)}</td></tr>
              <tr><td className="border border-gray-300 px-3 py-1.5 text-sm">تعمیرات</td><td className="border border-gray-300 px-3 py-1.5 text-sm text-left font-mono" dir="ltr">{formatNumber(bd.totalRepairCost)}</td></tr>
              <tr><td className="border border-gray-300 px-3 py-1.5 text-sm">جریمه</td><td className="border border-gray-300 px-3 py-1.5 text-sm text-left font-mono" dir="ltr">{formatNumber(bd.totalPenalty)}</td></tr>
              <tr className="bg-rose-50/50 font-bold">
                <td className="border border-gray-300 px-3 py-2 text-sm">مجموع کسورات</td>
                <td className="border border-gray-300 px-3 py-2 text-sm text-left font-mono text-rose-600" dir="ltr">{formatNumber(gt.totalDeductions)}</td>
              </tr>

              <tr className="bg-amber-50/50 font-bold text-base">
                <td className="border border-gray-300 px-3 py-2">خالص قابل پرداخت</td>
                <td className="border border-gray-300 px-3 py-2 text-left font-mono text-amber-700" dir="ltr">{formatNumber(gt.netAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Per-person Details */}
        {persons.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              جزئیات به تفکیک فروشنده
            </h2>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-emerald-50">
                  <th className="border border-gray-300 px-2 py-1.5 text-right font-semibold">فروشنده</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-right font-semibold">درصدی</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-right font-semibold">پلکانی</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-right font-semibold">تیمی</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-right font-semibold">پاداش</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-right font-semibold">کسورات</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-right font-semibold">خالص</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-right font-semibold">وصول</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-right font-semibold">تسویه</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-right font-semibold">مانده</th>
                </tr>
              </thead>
              <tbody>
                {persons.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-2 py-1 font-medium">{p.name}</td>
                    <td className="border border-gray-300 px-2 py-1 text-left font-mono" dir="ltr">{p.percentageComm ? formatNumber(p.percentageComm) : '−'}</td>
                    <td className="border border-gray-300 px-2 py-1 text-left font-mono" dir="ltr">{p.tieredComm ? formatNumber(p.tieredComm) : '−'}</td>
                    <td className="border border-gray-300 px-2 py-1 text-left font-mono" dir="ltr">{p.teamComm ? formatNumber(p.teamComm) : '−'}</td>
                    <td className="border border-gray-300 px-2 py-1 text-left font-mono text-emerald-700" dir="ltr">{p.bonus ? formatNumber(p.bonus) : '−'}</td>
                    <td className="border border-gray-300 px-2 py-1 text-left font-mono text-rose-600" dir="ltr">{p.totalDeductions ? formatNumber(p.totalDeductions) : '−'}</td>
                    <td className="border border-gray-300 px-2 py-1 text-left font-mono font-semibold" dir="ltr">{formatNumber(p.netAmount)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-left font-mono" dir="ltr">{p.collections ? formatNumber(p.collections) : '−'}</td>
                    <td className="border border-gray-300 px-2 py-1 text-left font-mono" dir="ltr">{p.settlements ? formatNumber(p.settlements) : '−'}</td>
                    <td className="border border-gray-300 px-2 py-1 text-left font-mono font-semibold" dir="ltr">{formatNumber(p.remaining)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-50 font-bold">
                  <td className="border border-gray-300 px-2 py-1.5">مجموع</td>
                  <td className="border border-gray-300 px-2 py-1.5 text-left font-mono" dir="ltr">{formatNumber(bd.totalPercentageComm)}</td>
                  <td className="border border-gray-300 px-2 py-1.5 text-left font-mono" dir="ltr">{formatNumber(bd.totalTieredComm)}</td>
                  <td className="border border-gray-300 px-2 py-1.5 text-left font-mono" dir="ltr">{formatNumber(bd.totalTeamComm)}</td>
                  <td className="border border-gray-300 px-2 py-1.5 text-left font-mono text-emerald-700" dir="ltr">{formatNumber(bd.totalBonus)}</td>
                  <td className="border border-gray-300 px-2 py-1.5 text-left font-mono text-rose-600" dir="ltr">{formatNumber(gt.totalDeductions)}</td>
                  <td className="border border-gray-300 px-2 py-1.5 text-left font-mono" dir="ltr">{formatNumber(gt.netAmount)}</td>
                  <td className="border border-gray-300 px-2 py-1.5 text-left font-mono" dir="ltr">{formatNumber(gt.totalCollections)}</td>
                  <td className="border border-gray-300 px-2 py-1.5 text-left font-mono" dir="ltr">{formatNumber(gt.totalSettlements)}</td>
                  <td className="border border-gray-300 px-2 py-1.5 text-left font-mono" dir="ltr">{formatNumber(gt.remainingDebt)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Collection and Settlement Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-teal-50 rounded-xl p-4 text-center">
            <p className="text-xs text-teal-600 mb-1">مجموع وصولیات</p>
            <p className="text-lg font-black text-teal-700" dir="ltr">{formatCurrency(gt.totalCollections)}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 text-center">
            <p className="text-xs text-amber-600 mb-1">مجموع تسویه</p>
            <p className="text-lg font-black text-amber-700" dir="ltr">{formatCurrency(gt.totalSettlements)}</p>
          </div>
          <div className={cn(
            'rounded-xl p-4 text-center',
            gt.remainingDebt > 0 ? 'bg-rose-50' : 'bg-emerald-50'
          )}>
            <p className={cn('text-xs mb-1', gt.remainingDebt > 0 ? 'text-rose-600' : 'text-emerald-600')}>
              {gt.remainingDebt > 0 ? 'بدهی شرکت' : 'تسویه‌شده'}
            </p>
            <p className={cn('text-lg font-black', gt.remainingDebt > 0 ? 'text-rose-700' : 'text-emerald-700')} dir="ltr">
              {formatCurrency(Math.abs(gt.remainingDebt))}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pt-4 border-t border-gray-200">
          <p>تاریخ تولید: {formatShamsiDate(reportData.period.year, reportData.period.month)} — تولید شده توسط سیستم محاسبه‌گر پورسانت</p>
        </div>
      </div>
    </div>
  );
}
