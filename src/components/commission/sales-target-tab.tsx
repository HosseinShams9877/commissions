'use client';

import { useState, useMemo , useEffect } from 'react';
import { useCommissionStore } from '@/lib/store';
import { formatCurrency, formatNumber, formatPercent, toPersianDigits, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Target, Trash2, Plus, TrendingUp, TrendingDown, RefreshCw, CheckCircle2, AlertCircle, Award } from 'lucide-react';
import { 
  useSalesPersons,
  useSalesTargets, 
  useCreateSalesTarget, 
  useUpdateSalesTarget, 
  useDeleteSalesTarget,
  usePercentageCommissions, 
  useTieredCommissions,
} from '@/hooks/use-api';
import { toast } from 'sonner';

export function SalesTargetTab() {
  const { currentPeriod } = useCommissionStore();
  
  // گرفتن داده‌ها از API
  const { data: salesPersonsData } = useSalesPersons();
  const { data: salesTargetData } = useSalesTargets(currentPeriod.year, currentPeriod.month);
  const { data: percentageData } = usePercentageCommissions(currentPeriod.year, currentPeriod.month);
  const { data: tieredData } = useTieredCommissions(currentPeriod.year, currentPeriod.month);

// داده‌های محلی
const percentageCommissions = percentageData?.percentageCommissions || [];
const tieredCommissions = tieredData?.tieredCommissions || [];
  
  // Mutations
  const createSalesTargetMutation = useCreateSalesTarget();
  const updateSalesTargetMutation = useUpdateSalesTarget();
  const deleteSalesTargetMutation = useDeleteSalesTarget();
  
  // داده‌های محلی
  const salesPersons = salesPersonsData?.salesPersons || [];
  const salesTargets = salesTargetData?.salesTargets || [];

  const [salesPersonId, setSalesPersonId] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [bonusPercent, setBonusPercent] = useState('');

  const handleAdd = () => {
    if (!salesPersonId || !targetAmount) return;
    createSalesTargetMutation.mutate({
      salesPersonId,
      targetAmount: parseFloat(targetAmount),
      bonusPercent: parseFloat(bonusPercent) || 0,
      periodYear: currentPeriod.year,
      periodMonth: currentPeriod.month,
    });
    setSalesPersonId(''); setTargetAmount(''); setBonusPercent('');
  };
  // محاسبه کل فروش هر فروشنده از داده‌های API
const getPersonTotalSales = (personId: string) => {
  let total = 0;
  
  // جمع فروش از پورسانت درصدی
  percentageCommissions
    .filter(pc => pc.salesPersonId === personId)
    .forEach(pc => total += pc.salesAmount);
  
  // جمع فروش از پورسانت پلکانی
  tieredCommissions
    .filter(tc => tc.salesPersonId === personId)
    .forEach(tc => total += tc.salesAmount);
  
  return total;
};

const handleRefreshAchieved = (targetId: string, personId: string) => {
  // محاسبه فروش از داده‌های API
  const achieved = getPersonTotalSales(personId);
  const target = salesTargets.find(st => st.id === targetId);
  const targetAmt = target?.targetAmount || 1;
  const percent = targetAmt > 0 ? (achieved / targetAmt) * 100 : 0;
  
  updateSalesTargetMutation.mutate({
    id: targetId,
    achievedAmount: achieved,
    targetPercent: percent,
    periodYear: currentPeriod.year,
    periodMonth: currentPeriod.month,
  });
};


  const handleRefreshAll = () => {
    for (const st of salesTargets) {
      handleRefreshAchieved(st.id, st.salesPersonId);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('آیا از حذف اطمینان دارید؟')) {
      deleteSalesTargetMutation.mutate({
        id,
        year: currentPeriod.year,
        month: currentPeriod.month,
      });
    }
  };

  const getPersonName = (id: string) => salesPersons.find(sp => sp.id === id)?.name || 'نامشخص';

  // Summary
  const totalTarget = salesTargets.reduce((s, st) => s + st.targetAmount, 0);
  const totalAchieved = salesTargets.reduce((s, st) => s + st.achievedAmount, 0);
  const avgAchievement = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0;

  useEffect(() => {
    if (salesTargets.length > 0) {
      handleRefreshAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percentageCommissions, tieredCommissions]);

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-md border-t-4 border-t-sky-500 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-sky-50/80 to-blue-50/30 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-1.5 rounded-lg bg-sky-100/80"><Target className="h-5 w-5 text-sky-600" /></div>
            هدف فروش ماهانه
          </CardTitle>
          <p className="text-sm text-muted-foreground leading-relaxed">
            هدف فروش هر فروشنده را تعیین کنید و درصد تحقق را به صورت خودکار محاسبه کنید
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">فروشنده</label>
              <Select value={salesPersonId} onValueChange={setSalesPersonId}>
                <SelectTrigger><SelectValue placeholder="انتخاب فروشنده" /></SelectTrigger>
                <SelectContent>{salesPersons.map(sp => (<SelectItem key={sp.id} value={sp.id}>{sp.name} ({sp.code})</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">هدف فروش (ریال)</label>
              <Input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="مبلغ هدف" dir="ltr" className="text-left font-mono tabular-nums focus-visible:ring-sky-500/30 focus-visible:border-sky-500" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">درصد پاداش تحقق (اختیاری)</label>
              <Input type="number" value={bonusPercent} onChange={(e) => setBonusPercent(e.target.value)} placeholder="مثلاً ۵" dir="ltr" className="text-left font-mono focus-visible:ring-sky-500/30 focus-visible:border-sky-500" />
            </div>
            <Button onClick={handleAdd} disabled={!salesPersonId || !targetAmount}
              className="bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-700 hover:to-sky-600 shadow-md shadow-sky-500/20 rounded-xl gap-1.5 active:scale-[0.98]">
              <Plus className="h-4 w-4" />تعریف هدف
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {salesTargets.length > 0 && (
        <>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleRefreshAll} className="gap-1.5 border-sky-300 text-sky-700 hover:bg-sky-50 rounded-xl">
              <RefreshCw className="h-3.5 w-3.5" />بروزرسانی فروش تحقق‌یافته
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-sky-200 bg-gradient-to-br from-sky-50 to-white rounded-2xl card-hover-lift shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-sky-500" />
                  <p className="text-sm text-sky-600 font-semibold">مجموع اهداف</p>
                </div>
                <p className="text-xl font-extrabold tracking-tight text-sky-700" dir="ltr">{formatCurrency(totalTarget)}</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white rounded-2xl card-hover-lift shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <p className="text-sm text-emerald-600 font-semibold">مجموع فروش تحقق‌یافته</p>
                </div>
                <p className="text-xl font-extrabold tracking-tight text-emerald-700" dir="ltr">{formatCurrency(totalAchieved)}</p>
              </CardContent>
            </Card>
            <Card className={cn('rounded-2xl card-hover-lift shadow-sm', avgAchievement >= 100 ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white' : avgAchievement >= 70 ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-white' : 'border-rose-200 bg-gradient-to-br from-rose-50 to-white')}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  {avgAchievement >= 100 ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-amber-500" />}
                  <p className="text-sm font-semibold text-muted-foreground">میانگین تحقق</p>
                </div>
                <p className={cn('text-xl font-extrabold tracking-tight', avgAchievement >= 100 ? 'text-emerald-700' : avgAchievement >= 70 ? 'text-amber-700' : 'text-rose-700')} dir="ltr">{formatPercent(Math.round(avgAchievement * 10) / 10)}</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Target Cards with Progress */}
      {salesTargets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {salesTargets.map(st => {
            const pct = st.targetPercent || 0;
            const isAchieved = pct >= 100;
            const isWarning = pct >= 70 && pct < 100;
            const isDanger = pct < 70;
            const bonus = st.bonusPercent ? st.achievedAmount * (st.bonusPercent / 100) : 0;

            return (
              <Card key={st.id} className={cn('rounded-2xl shadow-sm border-2 overflow-hidden transition-all',
                isAchieved ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white' :
                isWarning ? 'border-amber-200 bg-gradient-to-br from-amber-50/50 to-white' :
                'border-rose-200 bg-gradient-to-br from-rose-50/50 to-white'
              )}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-full text-white font-bold flex items-center justify-center shadow-sm text-sm',
                        isAchieved ? 'bg-gradient-to-br from-emerald-400 to-teal-500' :
                        isWarning ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                        'bg-gradient-to-br from-rose-400 to-pink-500'
                      )}>
                        {getPersonName(st.salesPersonId).charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{getPersonName(st.salesPersonId)}</p>
                        <p className="text-[10px] text-muted-foreground">هدف: {formatNumber(st.targetAmount)} ریال</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-sky-50" onClick={() => handleRefreshAchieved(st.id, st.salesPersonId)}>
                        <RefreshCw className="h-3.5 w-3.5 text-sky-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-red-50"
                      onClick={() => handleDelete(st.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">تقدم تحقق</span>
                      <span className={cn('font-bold', isAchieved ? 'text-emerald-600' : isWarning ? 'text-amber-600' : 'text-rose-600')}>
                        {formatPercent(Math.round(pct * 10) / 10)}
                      </span>
                    </div>
                    <div className="h-4 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-700',
                          isAchieved ? 'bg-gradient-to-l from-emerald-500 to-teal-400' :
                          isWarning ? 'bg-gradient-to-l from-amber-500 to-orange-400' :
                          'bg-gradient-to-l from-rose-500 to-pink-400'
                        )}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white rounded-lg p-2.5 border">
                      <p className="text-muted-foreground">فروش تحقق‌یافته</p>
                      <p className="font-bold text-gray-800" dir="ltr">{formatNumber(st.achievedAmount)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2.5 border">
                      <p className="text-muted-foreground">مانده تا هدف</p>
                      <p className={cn('font-bold', isAchieved ? 'text-emerald-600' : 'text-rose-600')} dir="ltr">
                        {isAchieved ? '✓ تحقق یافت' : formatNumber(st.targetAmount - st.achievedAmount)}
                      </p>
                    </div>
                  </div>

                  {st.bonusPercent && st.bonusPercent > 0 && isAchieved && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs text-emerald-700 font-semibold">پاداش تحقق ({formatPercent(st.bonusPercent)})</span>
                      </div>
                      <span className="text-sm font-bold text-emerald-800" dir="ltr">{formatCurrency(bonus)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
