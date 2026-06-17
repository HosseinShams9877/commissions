'use client';

import { useMemo } from 'react';
import { useCommissionStore } from '@/lib/store';
import { formatNumber, formatCurrency, formatPercent, toPersianDigits, formatShamsiDate, cn, PERSIAN_MONTHS } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  useSalesPersons, 
  useTeams, 
  usePercentageCommissions, 
  useTieredCommissions, 
  useFinderFees, 
  useTestCosts, 
  useRepairCosts, 
  useSalesShares, 
  useTeamCommissions, 
  useBonusPenalties, 
  useSalesTargets,
  useCollections,
  useSettlements,
} from '@/hooks/use-api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, Award, BarChart3,
  ArrowUpRight, ArrowDownRight, Wallet, Activity,
} from 'lucide-react';

const CHART_COLORS = ['#10b981', '#14b8a6', '#06b6d4', '#8b5cf6', '#f97316', '#f43f5e', '#84cc16', '#6366f1', '#ec4899'];


 export function EnhancedDashboardTab() {
  const { currentPeriod } = useCommissionStore();
  
  // گرفتن همه داده‌ها از API
  const { data: salesPersonsData } = useSalesPersons();
  const { data: teamsData } = useTeams();
  const { data: percentageData } = usePercentageCommissions(currentPeriod.year, currentPeriod.month);
  const { data: tieredData } = useTieredCommissions(currentPeriod.year, currentPeriod.month);
  const { data: finderFeeData } = useFinderFees(currentPeriod.year, currentPeriod.month);
  const { data: testCostData } = useTestCosts(currentPeriod.year, currentPeriod.month);
  const { data: repairCostData } = useRepairCosts(currentPeriod.year, currentPeriod.month);
  const { data: salesShareData } = useSalesShares(currentPeriod.year, currentPeriod.month);
  const { data: teamCommissionData } = useTeamCommissions(currentPeriod.year, currentPeriod.month);
  const { data: bonusPenaltyData } = useBonusPenalties(currentPeriod.year, currentPeriod.month);
  const { data: salesTargetData } = useSalesTargets(currentPeriod.year, currentPeriod.month);
  const { data: collectionData } = useCollections(currentPeriod.year, currentPeriod.month);
  const { data: settlementData } = useSettlements(currentPeriod.year, currentPeriod.month);
  
  // داده‌های محلی
  const salesPersons = salesPersonsData?.salesPersons || [];
  const teams = teamsData?.teams || [];
  const percentageCommissions = percentageData?.percentageCommissions || [];
  const tieredCommissions = tieredData?.tieredCommissions || [];
  const finderFees = finderFeeData?.finderFees || [];
  const testCosts = testCostData?.testCosts || [];
  const repairCosts = repairCostData?.repairCosts || [];
  const salesShares = salesShareData?.salesShares || [];
  const teamCommissions = teamCommissionData?.teamCommissions || [];
  const bonusPenalties = bonusPenaltyData?.bonusPenalties || [];
  const salesTargets = salesTargetData?.salesTargets || [];
  const collections = collectionData?.collections || [];
  const settlements = settlementData?.settlements || [];

  // ====== Current period calculations ======
  const totalPercentageComm = percentageCommissions.reduce((sum, pc) => sum + pc.commissionAmount, 0);
  const totalTieredComm = tieredCommissions.reduce((sum, tc) => sum + tc.commissionAmount, 0);
  const totalFinderFee = finderFees.reduce((sum, ff) => sum + ff.amount, 0);
  const totalTestCost = testCosts.reduce((sum, tc) => sum + tc.amount, 0);
  const totalRepairCost = repairCosts.reduce((sum, rc) => sum + rc.amount, 0);
  const totalSalesShare = salesShares.reduce((sum, ss) => sum + ss.shareAmount, 0);
  const totalTeamComm = teamCommissions.reduce((sum, tc) => sum + tc.totalLeaderCommission, 0);
  const totalBonus = bonusPenalties.filter(bp => bp.type === 'bonus').reduce((s, bp) => s + bp.amount, 0);
  const totalPenalty = bonusPenalties.filter(bp => bp.type === 'penalty').reduce((s, bp) => s + bp.amount, 0);
  const totalCollections = collections.reduce((s, c) => s + c.amount, 0);
  const totalSettlements = settlements.reduce((s, st) => s + st.amount, 0);

  const totalCommissions = totalPercentageComm + totalTieredComm + totalFinderFee + totalSalesShare + totalTeamComm + totalBonus;
  const totalDeductions = totalTestCost + totalRepairCost + totalPenalty;
  const netPayment = totalCommissions - totalDeductions;

  // ====== Previous month comparison ======
  const prevMonth = currentPeriod.month === 1
    ? { year: currentPeriod.year - 1, month: 12 }
    : { year: currentPeriod.year, month: currentPeriod.month - 1 };
  // داده‌های ماه قبل - باید هوک جدید بزنی یا از dataهای موجود استفاده کنی
// به خاطر محدودیت، فعلاً صفر در نظر بگیر
const prevData = {
  percentageCommissions: [],
  tieredCommissions: [],
  finderFees: [],
  testCosts: [],
  repairCosts: [],
  salesShares: [],
  teamCommissions: [],
  bonusPenalties: [],
  collections: [],
  settlements: [],
};
  const prevTotalComm = prevData.percentageCommissions.reduce((s, pc) => s + pc.commissionAmount, 0)
    + prevData.tieredCommissions.reduce((s, tc) => s + tc.commissionAmount, 0)
    + prevData.finderFees.reduce((s, ff) => s + ff.amount, 0)
    + prevData.salesShares.reduce((s, ss) => s + ss.shareAmount, 0)
    + prevData.teamCommissions.reduce((s, tc) => s + tc.totalLeaderCommission, 0)
    + prevData.bonusPenalties.filter(bp => bp.type === 'bonus').reduce((s, bp) => s + bp.amount, 0);

  const prevTotalDed = prevData.testCosts.reduce((s, tc) => s + tc.amount, 0)
    + prevData.repairCosts.reduce((s, rc) => s + rc.amount, 0)
    + prevData.bonusPenalties.filter(bp => bp.type === 'penalty').reduce((s, bp) => s + bp.amount, 0);

  const prevNetPayment = prevTotalComm - prevTotalDed;

  const commChange = prevTotalComm > 0 ? ((totalCommissions - prevTotalComm) / prevTotalComm) * 100 : 0;
  const dedChange = prevTotalDed > 0 ? ((totalDeductions - prevTotalDed) / prevTotalDed) * 100 : 0;
  const netChange = prevNetPayment !== 0 ? ((netPayment - prevNetPayment) / Math.abs(prevNetPayment)) * 100 : 0;
  const collChange = (() => {
    const prevColl = prevData.collections.reduce((s, c) => s + c.amount, 0);
    return prevColl > 0 ? ((totalCollections - prevColl) / prevColl) * 100 : 0;
  })();

  // ====== Monthly trend (last 6 months) ======
  const monthlyTrend = useMemo(() => {
    const periods: { year: number; month: number }[] = [];
    // Generate last 6 months including current
    for (let i = 5; i >= 0; i--) {
      let m = currentPeriod.month - i;
      let y = currentPeriod.year;
      while (m <= 0) {
        m += 12;
        y -= 1;
      }
      periods.push({ year: y, month: m });
    }

    return periods.map(p => {
      // اینجا هم باید از API داده‌های ماه‌های قبلی رو بگیری
// فعلاً به خاطر سادگی، مقدار ۰ بگذار
const pData = {
  percentageCommissions: [],
  tieredCommissions: [],
  finderFees: [],
  testCosts: [],
  repairCosts: [],
  salesShares: [],
  teamCommissions: [],
  bonusPenalties: [],
  collections: [],
  settlements: [],
};
      const comm = pData.percentageCommissions.reduce((s, pc) => s + pc.commissionAmount, 0)
        + pData.tieredCommissions.reduce((s, tc) => s + tc.commissionAmount, 0)
        + pData.finderFees.reduce((s, ff) => s + ff.amount, 0)
        + pData.salesShares.reduce((s, ss) => s + ss.shareAmount, 0)
        + pData.teamCommissions.reduce((s, tc) => s + tc.totalLeaderCommission, 0)
        + pData.bonusPenalties.filter(bp => bp.type === 'bonus').reduce((s, bp) => s + bp.amount, 0);
      const ded = pData.testCosts.reduce((s, tc) => s + tc.amount, 0)
        + pData.repairCosts.reduce((s, rc) => s + rc.amount, 0)
        + pData.bonusPenalties.filter(bp => bp.type === 'penalty').reduce((s, bp) => s + bp.amount, 0);
      return {
        name: PERSIAN_MONTHS[p.month - 1],
        درآمد: Math.round(comm),
        کسورات: Math.round(ded),
        خالص: Math.round(comm - ded),
      };
    });
  }, [currentPeriod]);

  // ====== Commission type breakdown (PieChart) ======
  const commissionBreakdown = [
    { name: 'پورسانت درصدی', value: Math.round(totalPercentageComm) },
    { name: 'پورسانت پلکانی', value: Math.round(totalTieredComm) },
    { name: 'حق‌النصب', value: Math.round(totalFinderFee) },
    { name: 'سهم از فروش', value: Math.round(totalSalesShare) },
    { name: 'پورسانت تیمی', value: Math.round(totalTeamComm) },
    { name: 'پاداش', value: Math.round(totalBonus) },
  ].filter(i => i.value > 0);

  // محاسبه کل فروش هر فروشنده
const getPersonTotalSales = (personId: string) => {
  let total = 0;
  percentageCommissions
    .filter(pc => pc.salesPersonId === personId)
    .forEach(pc => total += pc.salesAmount);
  tieredCommissions
    .filter(tc => tc.salesPersonId === personId)
    .forEach(tc => total += tc.salesAmount);
  return total;
};

  // ====== Top performers ======
  const topPerformers = salesPersons
    .map(sp => {
      const totalSales = getPersonTotalSales(sp.id);
      const pComm = percentageCommissions.filter(pc => pc.salesPersonId === sp.id).reduce((s, pc) => s + pc.commissionAmount, 0);
      const tComm = tieredCommissions.filter(tc => tc.salesPersonId === sp.id).reduce((s, tc) => s + tc.commissionAmount, 0);
      const bonus = bonusPenalties.filter(bp => bp.salesPersonId === sp.id && bp.type === 'bonus').reduce((s, bp) => s + bp.amount, 0);
      const fFee = finderFees.filter(ff => ff.salesPersonId === sp.id).reduce((s, ff) => s + ff.amount, 0);
      const sShare = salesShares.filter(ss => ss.salesPersonId === sp.id).reduce((s, ss) => s + ss.shareAmount, 0);
      return {
        name: sp.name,
        totalSales,
        totalCommission: pComm + tComm + bonus + fFee + sShare,
      };
    })
    .filter(p => p.totalSales > 0 || p.totalCommission > 0)
    .sort((a, b) => b.totalCommission - a.totalCommission)
    .slice(0, 5);

  // ====== Quick stats with comparison ======
  const quickStats = [
    {
      title: 'مجموع پورسانت‌ها',
      value: totalCommissions,
      change: commChange,
      icon: Wallet,
      gradient: 'from-emerald-500 to-teal-400',
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      textColor: 'text-emerald-700',
    },
    {
      title: 'مجموع کسورات',
      value: totalDeductions,
      change: dedChange,
      icon: TrendingDown,
      gradient: 'from-rose-500 to-pink-400',
      bg: 'bg-rose-50',
      iconBg: 'bg-rose-100',
      textColor: 'text-rose-600',
    },
    {
      title: 'خالص قابل پرداخت',
      value: netPayment,
      change: netChange,
      icon: Activity,
      gradient: 'from-amber-500 to-orange-400',
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      textColor: 'text-amber-700',
    },
    {
      title: 'وصولیات',
      value: totalCollections,
      change: collChange,
      icon: TrendingUp,
      gradient: 'from-teal-500 to-cyan-400',
      bg: 'bg-teal-50',
      iconBg: 'bg-teal-100',
      textColor: 'text-teal-700',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Stats Cards with Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map(stat => {
          const isPositive = stat.change >= 0;
          const hasPrevData = Math.abs(stat.change) > 0.01;
          return (
            <Card key={stat.title} className={cn('border rounded-2xl card-hover-lift shadow-md overflow-hidden', stat.bg)}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn('p-2 rounded-lg', stat.iconBg)}>
                    <stat.icon className={cn('h-5 w-5', stat.textColor)} />
                  </div>
                  <p className={cn('text-xs font-semibold', stat.textColor)}>{stat.title}</p>
                </div>
                <p className={cn('text-xl font-black tracking-tight', stat.textColor)} dir="ltr">{formatCurrency(stat.value)}</p>
                {hasPrevData && (
                  <div className={cn('flex items-center gap-1 mt-2 text-xs font-semibold',
                    isPositive ? 'text-emerald-600' : 'text-rose-600'
                  )}>
                    {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    {toPersianDigits(Math.abs(stat.change).toFixed(1))}٪ نسبت به ماه قبل
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Trend Line Chart */}
        <Card className="lg:col-span-2 rounded-2xl shadow-sm border overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-50/80 to-teal-50/50 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
              روند ماهانه (۶ ماه اخیر)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {monthlyTrend.some(d => d.درآمد > 0 || d.کسورات > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(0)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                  <Tooltip
                    formatter={(value: number) => formatNumber(value)}
                    contentStyle={{ direction: 'rtl', fontFamily: 'Vazirmatn', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'Vazirmatn' }} />
                  <Line type="monotone" dataKey="درآمد" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="کسورات" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="خالص" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-16 text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">نمودار پس از ثبت داده نمایش داده می‌شود</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commission Type Pie Chart */}
        <Card className="rounded-2xl shadow-sm border overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">ترکیب پورسانت‌ها</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {commissionBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={commissionBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${toPersianDigits((percent * 100).toFixed(0))}٪)`}
                    labelLine={false}
                  >
                    {commissionBreakdown.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatNumber(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-16 text-center text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">نمودار پس از ثبت داده نمایش داده می‌شود</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <Card className="rounded-2xl shadow-sm border overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-amber-50/80 to-orange-50/50 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <Award className="h-4 w-4 text-amber-600" />
              برترین فروشندگان
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {topPerformers.map((p, idx) => {
                const maxComm = topPerformers[0]?.totalCommission || 1;
                const barWidth = (p.totalCommission / maxComm) * 100;
                const medalColors = ['from-amber-400 to-yellow-300', 'from-gray-300 to-gray-200', 'from-amber-600 to-amber-400'];
                return (
                  <div key={p.name} className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shadow-sm shrink-0',
                      idx < 3 ? `bg-gradient-to-br ${medalColors[idx]}` : 'bg-gray-200 text-gray-500'
                    )}>
                      {toPersianDigits(idx + 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-700">{p.name}</span>
                        <span className="text-xs font-mono text-emerald-700" dir="ltr">{formatNumber(p.totalCommission)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-teal-400 transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {salesPersons.length === 0 && (
        <Card className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/30">
          <CardContent className="py-16">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 text-emerald-200" />
              <p className="text-lg font-semibold text-emerald-800 mb-1">هنوز داده‌ای ثبت نشده است</p>
              <p className="text-sm">ابتدا از بخش فروشندگان، فروشنده اضافه کنید و سپس اطلاعات هر بخش را وارد نمایید</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
