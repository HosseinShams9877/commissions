'use client';

import { useCommissionStore, getPersonTotalSales } from '@/lib/store';
import { formatCurrency, formatNumber, formatPercent, toPersianDigits, formatShamsiDate, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Percent, Layers, Handshake, FlaskConical, Wrench, TrendingUp,
  BarChart3, Wallet, Users, ArrowUpRight, UsersRound, Gift, Target,
  ArrowUpCircle, ArrowDownCircle, Award,
} from 'lucide-react';

export function DashboardTab() {
  const { salesPersons, teams, currentPeriod, getMonthlyData } = useCommissionStore();
  const data = getMonthlyData(currentPeriod);

  const totalPercentageComm = data.percentageCommissions.reduce((sum, pc) => sum + pc.commissionAmount, 0);
  const totalTieredComm = data.tieredCommissions.reduce((sum, tc) => sum + tc.commissionAmount, 0);
  const totalFinderFee = data.finderFees.reduce((sum, ff) => sum + ff.amount, 0);
  const totalTestCost = data.testCosts.reduce((sum, tc) => sum + tc.amount, 0);
  const totalRepairCost = data.repairCosts.reduce((sum, rc) => sum + rc.amount, 0);
  const totalSalesShare = data.salesShares.reduce((sum, ss) => sum + ss.shareAmount, 0);
  const totalTeamComm = data.teamCommissions.reduce((sum, tc) => sum + tc.totalLeaderCommission, 0);
  const totalBonus = data.bonusPenalties.filter(bp => bp.type === 'bonus').reduce((s, bp) => s + bp.amount, 0);
  const totalPenalty = data.bonusPenalties.filter(bp => bp.type === 'penalty').reduce((s, bp) => s + bp.amount, 0);

  const totalCommissions = totalPercentageComm + totalTieredComm + totalFinderFee + totalSalesShare + totalTeamComm + totalBonus;
  const totalDeductions = totalTestCost + totalRepairCost + totalPenalty;
  const netPayment = totalCommissions - totalDeductions;

  const periodLabel = formatShamsiDate(currentPeriod.year, currentPeriod.month);

  const summaryCards = [
    { title: 'پورسانت درصدی', value: totalPercentageComm, icon: Percent, gradient: 'from-emerald-500 to-emerald-400', iconBg: 'bg-emerald-100', count: data.percentageCommissions.length },
    { title: 'پورسانت پلکانی', value: totalTieredComm, icon: Layers, gradient: 'from-violet-500 to-purple-400', iconBg: 'bg-violet-100', count: data.tieredCommissions.length },
    { title: 'حق‌النصب', value: totalFinderFee, icon: Handshake, gradient: 'from-teal-500 to-cyan-400', iconBg: 'bg-teal-100', count: data.finderFees.length },
    { title: 'سهم از فروش', value: totalSalesShare, icon: TrendingUp, gradient: 'from-cyan-500 to-sky-400', iconBg: 'bg-cyan-100', count: data.salesShares.length },
    { title: 'پورسانت تیمی', value: totalTeamComm, icon: UsersRound, gradient: 'from-indigo-500 to-blue-400', iconBg: 'bg-indigo-100', count: data.teamCommissions.length },
    { title: 'پاداش', value: totalBonus, icon: Gift, gradient: 'from-lime-500 to-green-400', iconBg: 'bg-lime-100', count: data.bonusPenalties.filter(bp => bp.type === 'bonus').length },
    { title: 'هزینه تست', value: totalTestCost, icon: FlaskConical, gradient: 'from-orange-500 to-amber-400', iconBg: 'bg-orange-100', count: data.testCosts.length },
    { title: 'تعمیرات', value: totalRepairCost, icon: Wrench, gradient: 'from-rose-500 to-pink-400', iconBg: 'bg-rose-100', count: data.repairCosts.length },
    { title: 'جریمه', value: totalPenalty, icon: ArrowDownCircle, gradient: 'from-red-500 to-rose-400', iconBg: 'bg-red-100', count: data.bonusPenalties.filter(bp => bp.type === 'penalty').length },
  ];

  // Bar chart data - per person sales
  const personSalesData = salesPersons.map(sp => ({
    name: sp.name,
    sales: getPersonTotalSales(useCommissionStore.getState(), currentPeriod, sp.id),
    target: data.salesTargets.find(st => st.salesPersonId === sp.id)?.targetAmount || 0,
  })).filter(p => p.sales > 0 || p.target > 0);

  const maxSales = Math.max(...personSalesData.map(p => Math.max(p.sales, p.target)), 1);

  // Donut chart data
  const donutData = summaryCards
    .filter(c => c.value > 0)
    .map(c => ({ title: c.title, value: c.value, gradient: c.gradient }));

  const donutTotal = donutData.reduce((s, d) => s + d.value, 0);

  // Per-person summary
  const personSummary: Record<string, { name: string; percentageComm: number; tieredComm: number; finderFee: number; testCost: number; repairCost: number; salesShare: number; teamComm: number; bonus: number; penalty: number; total: number }> = {};
  for (const sp of salesPersons) {
    personSummary[sp.id] = { name: sp.name, percentageComm: 0, tieredComm: 0, finderFee: 0, testCost: 0, repairCost: 0, salesShare: 0, teamComm: 0, bonus: 0, penalty: 0, total: 0 };
  }
  for (const pc of data.percentageCommissions) { if (personSummary[pc.salesPersonId]) personSummary[pc.salesPersonId].percentageComm += pc.commissionAmount; }
  for (const tc of data.tieredCommissions) { if (personSummary[tc.salesPersonId]) personSummary[tc.salesPersonId].tieredComm += tc.commissionAmount; }
  for (const ff of data.finderFees) { if (personSummary[ff.salesPersonId]) personSummary[ff.salesPersonId].finderFee += ff.amount; }
  for (const tc of data.testCosts) { if (personSummary[tc.salesPersonId]) personSummary[tc.salesPersonId].testCost += tc.amount; }
  for (const rc of data.repairCosts) { if (personSummary[rc.salesPersonId]) personSummary[rc.salesPersonId].repairCost += rc.amount; }
  for (const ss of data.salesShares) { if (personSummary[ss.salesPersonId]) personSummary[ss.salesPersonId].salesShare += ss.shareAmount; }
  for (const tc of data.teamCommissions) {
    const team = teams.find(t => t.id === tc.teamId);
    if (team && personSummary[team.leaderId]) personSummary[team.leaderId].teamComm += tc.totalLeaderCommission;
  }
  for (const bp of data.bonusPenalties) {
    if (personSummary[bp.salesPersonId]) {
      if (bp.type === 'bonus') personSummary[bp.salesPersonId].bonus += bp.amount;
      else personSummary[bp.salesPersonId].penalty += bp.amount;
    }
  }
  for (const key of Object.keys(personSummary)) {
    const p = personSummary[key];
    p.total = p.percentageComm + p.tieredComm + p.finderFee + p.salesShare + p.teamComm + p.bonus - p.testCost - p.repairCost - p.penalty;
  }

  return (
    <div className="space-y-6">
      {/* Period Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-emerald-600 via-emerald-500 to-teal-500 p-6 text-white shadow-lg shadow-emerald-500/20">
        <div className="absolute -left-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-xl" />
        <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/5 blur-lg" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-sm mb-1">خلاصه ماهانه</p>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-emerald-200" />
              {periodLabel}
            </h2>
          </div>
          <ArrowUpRight className="h-8 w-8 text-emerald-200/50" />
        </div>
      </div>

      {/* Main Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 card-hover-lift shadow-md shadow-emerald-500/5 rounded-2xl overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-emerald-100/80"><Wallet className="h-5 w-5 text-emerald-600" /></div>
              <p className="text-sm font-semibold text-emerald-700">مجموع پورسانت‌ها</p>
            </div>
            <p className="text-2xl font-black tracking-tight text-emerald-700 animate-count-up" dir="ltr">{formatCurrency(totalCommissions)}</p>
          </CardContent>
        </Card>
        <Card className="border-rose-200 bg-gradient-to-br from-rose-50 via-white to-rose-50/30 card-hover-lift shadow-md shadow-rose-500/5 rounded-2xl overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-rose-100/80"><Wrench className="h-5 w-5 text-rose-500" /></div>
              <p className="text-sm font-semibold text-rose-600">مجموع کسورات</p>
            </div>
            <p className="text-2xl font-black tracking-tight text-rose-600 animate-count-up" dir="ltr">{formatCurrency(totalDeductions)}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/30 card-hover-lift shadow-md shadow-amber-500/5 rounded-2xl overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-amber-100/80"><Wallet className="h-5 w-5 text-amber-600" /></div>
              <p className="text-sm font-semibold text-amber-700">خالص قابل پرداخت</p>
            </div>
            <p className="text-2xl font-black tracking-tight text-amber-700 animate-count-up" dir="ltr">{formatCurrency(netPayment)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart - Sales per person */}
      {personSalesData.length > 0 && (
        <Card className="rounded-2xl shadow-sm border overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-50/80 to-teal-50/50 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
              مقایسه فروش و هدف فروشندگان
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="space-y-4">
              {personSalesData.map((p) => {
                const salesWidth = (p.sales / maxSales) * 100;
                const targetWidth = (p.target / maxSales) * 100;
                return (
                  <div key={p.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">{p.name}</span>
                      <span className="text-xs text-muted-foreground font-mono" dir="ltr">{formatNumber(p.sales)} / {p.target > 0 ? formatNumber(p.target) : '—'}</span>
                    </div>
                    <div className="relative h-7 rounded-lg bg-gray-50 overflow-hidden border border-gray-100">
                      {/* Target bar (background) */}
                      {p.target > 0 && (
                        <div
                          className="absolute top-0 right-0 h-full bg-sky-100 rounded-lg border border-sky-200"
                          style={{ width: `${targetWidth}%` }}
                        />
                      )}
                      {/* Sales bar (foreground) */}
                      <div
                        className={cn('absolute top-0 right-0 h-full rounded-lg transition-all duration-700',
                          p.target > 0 && p.sales >= p.target ? 'bg-gradient-to-l from-emerald-500 to-teal-400' :
                          'bg-gradient-to-l from-emerald-400 to-teal-300'
                        )}
                        style={{ width: `${Math.min(salesWidth, 100)}%` }}
                      />
                      {/* Label */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-gray-700 drop-shadow-sm">
                          {p.target > 0 ? formatPercent(Math.round((p.sales / p.target) * 1000) / 10) : formatNumber(p.sales)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 pt-3 border-t text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-gradient-to-l from-emerald-500 to-teal-400" />
                فروش
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-sky-100 border border-sky-200" />
                هدف
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Cards + Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {summaryCards.map((card) => {
            const maxVal = Math.max(...summaryCards.map(c => c.value), 1);
            const barWidth = (card.value / maxVal) * 100;
            return (
              <Card key={card.title} className={cn('border rounded-2xl card-hover-lift shadow-sm overflow-hidden',
                card.gradient.includes('emerald') ? 'border-emerald-200' :
                card.gradient.includes('violet') ? 'border-violet-200' :
                card.gradient.includes('teal') ? 'border-teal-200' :
                card.gradient.includes('cyan') ? 'border-cyan-200' :
                card.gradient.includes('indigo') ? 'border-indigo-200' :
                card.gradient.includes('lime') ? 'border-lime-200' :
                card.gradient.includes('orange') ? 'border-orange-200' :
                card.gradient.includes('red') ? 'border-red-200' :
                'border-rose-200'
              )}>
                <CardContent className="pt-4 pb-4 px-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn('p-1.5 rounded-lg', card.iconBg)}>
                      <card.icon className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground">{card.title}</p>
                  </div>
                  <p className="text-lg font-extrabold tracking-tight text-left animate-count-up" dir="ltr">{formatNumber(card.value)}</p>
                  <div className="mt-2 h-1 rounded-full bg-gray-100 overflow-hidden">
                    <div className={cn('h-full rounded-full bg-gradient-to-l', card.gradient)} style={{ width: `${barWidth}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">{toPersianDigits(card.count)} رکورد</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Donut Chart */}
        {donutData.length > 0 && (
          <Card className="rounded-2xl shadow-sm border overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">ترکیب پورسانت‌ها</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="relative w-40 h-40">
                <div
                  className="w-full h-full rounded-full"
                  style={{
                    background: donutData.map((d, i) => {
                      const prevPercent = donutData.slice(0, i).reduce((s, x) => s + (x.value / donutTotal) * 100, 0);
                      const percent = (d.value / donutTotal) * 100;
                      return `${getGradientColor(d.gradient)} ${prevPercent}% ${prevPercent + percent}%`;
                    }).join(', '),
                  }}
                />
                <div className="absolute inset-4 bg-white rounded-full shadow-inner flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">مجموع</p>
                    <p className="text-sm font-bold" dir="ltr">{formatNumber(donutTotal)}</p>
                  </div>
                </div>
              </div>
              <div className="w-full space-y-1.5">
                {donutData.map((d) => (
                  <div key={d.title} className="flex items-center gap-2 text-xs">
                    <div className={cn('w-3 h-3 rounded-full bg-gradient-to-br', d.gradient)} />
                    <span className="flex-1 text-muted-foreground">{d.title}</span>
                    <span className="font-semibold" dir="ltr">{formatNumber(d.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {donutData.length === 0 && (
          <Card className="rounded-2xl shadow-sm border">
            <CardContent className="py-8 text-center text-muted-foreground">
              <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">نمودار پس از ثبت داده نمایش داده می‌شود</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sales Targets Summary */}
      {data.salesTargets.length > 0 && (
        <Card className="rounded-2xl shadow-sm border overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-sky-50 to-blue-50/50 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <Target className="h-4 w-4 text-sky-600" />
              وضعیت تحقق اهداف فروش
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {data.salesTargets.map(st => {
                const pct = st.targetPercent || 0;
                const name = salesPersons.find(sp => sp.id === st.salesPersonId)?.name || '—';
                return (
                  <div key={st.id} className="bg-white rounded-xl p-3 border">
                    <p className="text-xs font-medium text-gray-700 mb-1">{name}</p>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-1.5">
                      <div className={cn('h-full rounded-full transition-all', pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-400' : 'bg-rose-400')} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">هدف: {formatNumber(st.targetAmount)}</span>
                      <Badge variant={pct >= 100 ? 'default' : 'secondary'} className={cn('text-[9px] h-4 px-1', pct >= 100 && 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100')}>
                        {formatPercent(Math.round(pct))}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-person Table */}
      {Object.values(personSummary).some(p => p.percentageComm || p.tieredComm || p.finderFee || p.testCost || p.repairCost || p.salesShare || p.teamComm || p.bonus || p.penalty) && (
        <Card className="rounded-2xl shadow-sm border overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50/50 pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-1.5 rounded-lg bg-emerald-100/80"><Users className="h-5 w-5 text-emerald-600" /></div>
              خلاصه به تفکیک فروشنده
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="table-zebra">
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-emerald-50/80 to-teal-50/40">
                    <TableHead className="text-right font-semibold text-emerald-800 text-xs">فروشنده</TableHead>
                    <TableHead className="text-right font-semibold text-emerald-800 text-xs">درصدی</TableHead>
                    <TableHead className="text-right font-semibold text-emerald-800 text-xs">پلکانی</TableHead>
                    <TableHead className="text-right font-semibold text-emerald-800 text-xs">تیمی</TableHead>
                    <TableHead className="text-right font-semibold text-emerald-800 text-xs">پاداش</TableHead>
                    <TableHead className="text-right font-semibold text-emerald-800 text-xs">کسورات</TableHead>
                    <TableHead className="text-right font-semibold text-emerald-800 text-xs">خالص</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(personSummary).map((p) => {
                    const hasData = p.percentageComm || p.tieredComm || p.finderFee || p.testCost || p.repairCost || p.salesShare || p.teamComm || p.bonus || p.penalty;
                    if (!hasData) return null;
                    const deductions = p.testCost + p.repairCost + p.penalty;
                    return (
                      <TableRow key={p.name}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                              {p.name.charAt(0)}
                            </div>
                            <span className="font-medium">{p.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-left font-mono tabular-nums text-xs" dir="ltr">{p.percentageComm ? formatNumber(p.percentageComm) : '−'}</TableCell>
                        <TableCell className="text-left font-mono tabular-nums text-xs" dir="ltr">{p.tieredComm ? formatNumber(p.tieredComm) : '−'}</TableCell>
                        <TableCell className="text-left font-mono tabular-nums text-xs text-indigo-600" dir="ltr">{p.teamComm ? formatNumber(p.teamComm) : '−'}</TableCell>
                        <TableCell className="text-left font-mono tabular-nums text-xs text-emerald-600" dir="ltr">{p.bonus ? formatNumber(p.bonus) : '−'}</TableCell>
                        <TableCell className="text-left font-mono tabular-nums text-xs text-rose-600" dir="ltr">{deductions ? formatNumber(deductions) : '−'}</TableCell>
                        <TableCell>
                          <Badge variant={p.total >= 0 ? 'default' : 'destructive'} className={cn('font-bold font-mono tabular-nums text-xs',
                            p.total >= 0 && 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          )}>
                            {formatNumber(p.total)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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

function getGradientColor(gradient: string): string {
  const map: Record<string, string> = {
    'from-emerald-500 to-emerald-400': '#10b981',
    'from-violet-500 to-purple-400': '#8b5cf6',
    'from-teal-500 to-cyan-400': '#14b8a6',
    'from-cyan-500 to-sky-400': '#06b6d4',
    'from-indigo-500 to-blue-400': '#6366f1',
    'from-lime-500 to-green-400': '#84cc16',
    'from-orange-500 to-amber-400': '#f97316',
    'from-rose-500 to-pink-400': '#f43f5e',
    'from-red-500 to-rose-400': '#ef4444',
  };
  return map[gradient] || '#10b981';
}
