'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCommissionStore, getEffectiveTierPercentage, getSteppedTierPercentage } from '@/lib/store';
import { formatCurrency, formatNumber, formatPercent, toPersianDigits, cn } from '@/lib/utils';
import { Tier } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useSalesPersons,
  useTieredCommissions, 
  useCreateTieredCommission, 
  useDeleteTieredCommission,
  useCreateSalesPerson,
  usePercentageCommissions,
  useTieredCommissions as useTieredCommissionsData,
} from '@/hooks/use-api';
import { Layers, Trash2, Plus, X, Info, TrendingUp, Calculator, ChevronDown, ChevronUp, Award } from 'lucide-react';
import { ExcelImport, ImportColumn } from './excel-import';

const TIERED_IMPORT_COLUMNS: ImportColumn[] = [
  { key: 'name', label: 'نام فروشنده', required: true, type: 'string' },
  { key: 'code', label: 'کد فروشنده', required: false, type: 'string' },
  { key: 'salesAmount', label: 'مبلغ فروش', required: true, type: 'number' },
];

const DEFAULT_TIERS_PROPORTIONAL: Tier[] = [
  { id: '1', fromAmount: 0, toAmount: 4000000, percentage: 0 },
  { id: '2', fromAmount: 4000000, toAmount: 8000000, percentage: 1 },
  { id: '3', fromAmount: 8000000, toAmount: 15000000, percentage: 2 },
  { id: '4', fromAmount: 15000000, toAmount: 0, percentage: 3 },
];

const DEFAULT_TIERS_STEPPED: Tier[] = [
  { id: '1', fromAmount: 0, toAmount: 5000000, percentage: 2 },
  { id: '2', fromAmount: 5000000, toAmount: 15000000, percentage: 3 },
  { id: '3', fromAmount: 15000000, toAmount: 0, percentage: 5 },
];

export function TieredCommissionTab() {
  const { currentPeriod } = useCommissionStore();
  
  const { data: salesPersonsData } = useSalesPersons();
  const { data: tieredData } = useTieredCommissionsData(currentPeriod.year, currentPeriod.month);
  
  const createTieredCommission = useCreateTieredCommission();
  const deleteTieredCommission = useDeleteTieredCommission();
  const createSalesPerson = useCreateSalesPerson();
  
  const salesPersons = salesPersonsData?.salesPersons || [];
  const tieredCommissions = tieredData?.tieredCommissions || [];


  return (
    <Tabs defaultValue="proportional" className="space-y-6" dir="rtl">
      <TabsList className="grid w-full grid-cols-2 h-12 bg-violet-50 border border-violet-200 rounded-xl p-1">
        <TabsTrigger value="proportional" className="rounded-lg text-sm font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all gap-1.5">
          <TrendingUp className="h-4 w-4" />
          تناسبی (نقطه‌به‌نقطه)
        </TabsTrigger>
        <TabsTrigger value="stepped" className="rounded-lg text-sm font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-600 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all gap-1.5">
          <Award className="h-4 w-4" />
          سقفی (غیر تناسبی)
        </TabsTrigger>
      </TabsList>
      <TabsContent value="proportional">
  <ProportionalTieredTab 
    salesPersons={salesPersons} 
    currentPeriod={currentPeriod} 
    tieredCommissions={tieredCommissions}
    createTieredCommission={createTieredCommission}
    deleteTieredCommission={deleteTieredCommission}
    createSalesPerson={createSalesPerson}
  />
</TabsContent>
<TabsContent value="stepped">
  <SteppedTieredTab 
    salesPersons={salesPersons} 
    currentPeriod={currentPeriod} 
    tieredCommissions={tieredCommissions}
    createTieredCommission={createTieredCommission}
    deleteTieredCommission={deleteTieredCommission}
    createSalesPerson={createSalesPerson}
  />
</TabsContent>
    </Tabs>
  );
}

function ProportionalTieredTab({ 
  salesPersons, 
  currentPeriod, 
  tieredCommissions, 
  createTieredCommission, 
  deleteTieredCommission,
  createSalesPerson,
}: {
  salesPersons: { id: string; name: string; code: string }[];
  currentPeriod: { year: number; month: number };
  tieredCommissions: any[];
  createTieredCommission: any;
  deleteTieredCommission: any;
  createSalesPerson: any;
}) {
  const [salesPersonId, setSalesPersonId] = useState('');
  const [salesAmount, setSalesAmount] = useState('');
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS_PROPORTIONAL.map(t => ({ ...t })));

  // Handle Excel import
  const handleExcelImport = async (rows: Record<string, string | number>[]) => {
    let successCount = 0;
    let errorCount = 0;
  
    for (const row of rows) {
      try {
        const name = String(row.name || '').trim();
        const code = String(row.code || '').trim() || name;
        const salesAmount = Number(row.salesAmount) || 0;
        
        if (!name || salesAmount <= 0) {
          errorCount++;
          continue;
        }
  
        let person = salesPersons.find(sp => sp.name.trim() === name);
        if (!person) person = salesPersons.find(sp => sp.code.trim() === code);
        let personId = person?.id;
  
        if (!personId) {
          try {
            const newPerson = await createSalesPerson.mutateAsync({
              name,
              code,
            });
            personId = newPerson.data.id;
            salesPersons.push(newPerson.data);
          } catch (err) {
            console.error('خطا در ایجاد فروشنده:', err);
            errorCount++;
            continue;
          }
        }
  
        if (personId) {
          try {
            await createTieredCommission.mutateAsync({
              salesPersonId: personId,
              salesAmount,
              tiers,
              mode: 'proportional',
              periodYear: currentPeriod.year,
              periodMonth: currentPeriod.month,
            });
            successCount++;
          } catch (err) {
            console.error('خطا در ثبت پورسانت پلکانی:', err);
            errorCount++;
          }
        }
      } catch (err) {
        console.error('خطا در پردازش ردیف:', err);
        errorCount++;
      }
    }
  
    if (successCount > 0) {
      toast.success(`${successCount} پورسانت پلکانی با موفقیت ثبت شد`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} ردیف با خطا مواجه شد`);
    }
  };

  const salesAmountNum = parseFloat(salesAmount) || 0;
  const effectivePercentage = useMemo(() => getEffectiveTierPercentage(salesAmountNum, tiers), [salesAmountNum, tiers]);

  const activeTierIndex = useMemo(() => {
    for (let i = 0; i < tiers.length; i++) {
      const to = tiers[i].toAmount === 0 ? Infinity : tiers[i].toAmount;
      if (salesAmountNum >= tiers[i].fromAmount && salesAmountNum < to) return i;
    }
    if (tiers.length > 0 && salesAmountNum >= tiers[tiers.length - 1].fromAmount) return tiers.length - 1;
    return -1;
  }, [salesAmountNum, tiers]);

  const tierProgress = useMemo(() => {
    if (activeTierIndex < 0 || salesAmountNum <= 0) return 0;
    const tier = tiers[activeTierIndex];
    const from = tier.fromAmount;
    const to = tier.toAmount === 0 ? from + 10000000 : tier.toAmount;
    if (to <= from) return 1;
    return Math.min(1, Math.max(0, (salesAmountNum - from) / (to - from)));
  }, [activeTierIndex, salesAmountNum, tiers]);

  const addTier = () => {
    const lastTier = tiers[tiers.length - 1];
    const newFrom = lastTier.toAmount === 0 ? lastTier.fromAmount + 10000000 : lastTier.toAmount;
    setTiers([...tiers, { id: generateTierId(), fromAmount: newFrom, toAmount: 0, percentage: 0 }]);
  };
  const removeTier = (id: string) => { if (tiers.length <= 1) return; setTiers(tiers.filter(t => t.id !== id)); };
  const updateTier = (id: string, field: keyof Tier, value: number) => { setTiers(tiers.map(t => t.id === id ? { ...t, [field]: value } : t)); };

  const handleAdd = () => {
    if (!salesPersonId || !salesAmount || tiers.length === 0) return;
    createTieredCommission.mutate({
      salesPersonId,
      salesAmount: parseFloat(salesAmount),
      tiers,
      mode: 'proportional',
      periodYear: currentPeriod.year,
      periodMonth: currentPeriod.month,
    });
    setSalesPersonId(''); setSalesAmount('');
  };

  const handleDelete = (id: string) => {
    if (confirm('آیا از حذف اطمینان دارید؟')) {
      deleteTieredCommission.mutate({
        id,
        year: currentPeriod.year,
        month: currentPeriod.month,
      });
    }
  };

  const totalCommission = tieredCommissions.filter(tc => tc.mode === 'proportional' || !tc.mode).reduce((sum, tc) => sum + tc.commissionAmount, 0);

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-md border-t-4 border-t-violet-500 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-violet-50/80 to-transparent pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg">
              <div className="p-1.5 rounded-lg bg-violet-100/80"><Layers className="h-5 w-5 text-violet-600" /></div>
              پورسانت پلکانی تناسبی (نقطه‌به‌نقطه)
            </div>
            <ExcelImport
              title="پورسانت پلکانی تناسبی"
              columns={TIERED_IMPORT_COLUMNS}
              onImport={handleExcelImport}
              theme="violet"
            />
          </CardTitle>
          <p className="text-sm text-muted-foreground">هر بخش از مبلغ فروش درصد متناسب خود را دارد — با درون‌یابی خطی</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">فروشنده</label>
              <Select value={salesPersonId} onValueChange={setSalesPersonId}>
                <SelectTrigger><SelectValue placeholder="انتخاب فروشنده" /></SelectTrigger>
                <SelectContent>{salesPersons.map(sp => (<SelectItem key={sp.id} value={sp.id}>{sp.name} ({sp.code})</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">مبلغ فروش (ریال)</label>
              <Input type="number" value={salesAmount} onChange={(e) => setSalesAmount(e.target.value)} placeholder="مبلغ فروش" dir="ltr" className="text-left font-mono tabular-nums focus-visible:ring-violet-500/30 focus-visible:border-violet-500" />
            </div>
          </div>

          {salesAmountNum > 0 && (
            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-violet-600" /><span className="text-sm font-bold text-violet-800">پیش‌نمایش</span></div>
                <button onClick={() => setShowBreakdown(!showBreakdown)} className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 transition-colors">
                  {showBreakdown ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {showBreakdown ? 'مخفی' : 'جزئیات'}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-lg p-3 border border-violet-100"><p className="text-[10px] text-violet-500">مبلغ فروش</p><p className="text-sm font-bold text-violet-800" dir="ltr">{formatNumber(salesAmountNum)}</p></div>
                <div className="bg-white rounded-lg p-3 border border-violet-100"><p className="text-[10px] text-violet-500">پله فعال</p><p className="text-sm font-bold text-violet-800">{activeTierIndex >= 0 ? `پله ${toPersianDigits(activeTierIndex + 1)}` : '—'}</p></div>
                <div className="bg-white rounded-lg p-3 border border-violet-100"><p className="text-[10px] text-violet-500">درصد موثر</p><p className="text-sm font-bold text-violet-800">{formatPercent(Math.round(effectivePercentage * 10000) / 10000)}</p></div>
                <div className="bg-white rounded-lg p-3 border border-emerald-100"><p className="text-[10px] text-emerald-600">مبلغ پورسانت</p><p className="text-sm font-bold text-emerald-700" dir="ltr">{formatCurrency(salesAmountNum * effectivePercentage / 100)}</p></div>
              </div>
              {activeTierIndex >= 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-violet-600">
                    <span>پله {toPersianDigits(activeTierIndex + 1)}: {formatNumber(tiers[activeTierIndex].fromAmount)} تا {tiers[activeTierIndex].toAmount === 0 ? '∞' : formatNumber(tiers[activeTierIndex].toAmount)}</span>
                    <span>{toPersianDigits(Math.round(tierProgress * 100))}٪ طی شده</span>
                  </div>
                  <div className="h-3 rounded-full bg-violet-100 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-l from-violet-500 to-indigo-400 transition-all duration-500" style={{ width: `${tierProgress * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tiers Config */}
          <div className="border border-violet-200 bg-gradient-to-br from-violet-50/50 to-white rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-violet-800">پله‌های پورسانت</h4>
              <Button variant="outline" size="sm" onClick={addTier} className="gap-1 border-violet-300 text-violet-700 hover:bg-violet-50 rounded-lg"><Plus className="h-3 w-3" />افزودن پله</Button>
            </div>
            {tiers.map((tier, idx) => {
              const isActive = idx === activeTierIndex && salesAmountNum > 0;
              return (
                <div key={tier.id || idx} className={cn('grid grid-cols-2 sm:grid-cols-4 gap-2 items-center rounded-lg border p-3 shadow-sm transition-all', isActive ? 'bg-violet-50 border-violet-300 ring-2 ring-violet-300/30' : 'bg-white border-violet-100')}>
                  <div className="flex flex-col gap-1"><label className="text-xs text-muted-foreground">از مبلغ</label><Input type="number" value={tier.fromAmount || ''} onChange={(e) => updateTier(tier.id!, 'fromAmount', parseFloat(e.target.value) || 0)} className="text-sm text-left font-mono" dir="ltr" /></div>
                  <div className="flex flex-col gap-1"><label className="text-xs text-muted-foreground">تا مبلغ {tier.toAmount === 0 && '(∞)'}</label><Input type="number" value={tier.toAmount || ''} onChange={(e) => updateTier(tier.id!, 'toAmount', parseFloat(e.target.value) || 0)} className="text-sm text-left font-mono" dir="ltr" /></div>
                  <div className="flex flex-col gap-1"><label className="text-xs text-muted-foreground">درصد انتهای پله</label><Input type="number" value={tier.percentage || ''} onChange={(e) => updateTier(tier.id!, 'percentage', parseFloat(e.target.value) || 0)} className="text-sm text-left font-mono" dir="ltr" step="0.1" /></div>
                  <div className="flex items-center justify-center"><Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-red-50 active:scale-90" onClick={() => removeTier(tier.id!)} disabled={tiers.length <= 1}><X className="h-4 w-4 text-red-400" /></Button></div>
                </div>
              );
            })}
          </div>

          <Button onClick={handleAdd} disabled={!salesPersonId || !salesAmount}
            className="bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 shadow-md shadow-violet-500/20 rounded-xl gap-1.5 active:scale-[0.98]">
            <Plus className="h-4 w-4" />محاسبه و افزودن
          </Button>
        </CardContent>
      </Card>

      {totalCommission > 0 && (
        <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-white rounded-2xl card-hover-lift shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-violet-600 font-semibold mb-1">مجموع پورسانت پلکانی (تناسبی)</p>
            <p className="text-xl font-extrabold tracking-tight text-violet-700" dir="ltr">{formatCurrency(totalCommission)}</p>
          </CardContent>
        </Card>
      )}

      {tieredCommissions.filter(tc => tc.mode === 'proportional' || !tc.mode).length > 0 && (
        <Card className="rounded-2xl shadow-sm border overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="table-zebra">
                <TableHeader><TableRow className="bg-gradient-to-r from-violet-50/80 to-violet-50/30">
                  <TableHead className="text-right font-semibold text-violet-800 text-xs">ردیف</TableHead>
                  <TableHead className="text-right font-semibold text-violet-800 text-xs">فروشنده</TableHead>
                  <TableHead className="text-right font-semibold text-violet-800 text-xs">مبلغ فروش</TableHead>
                  <TableHead className="text-right font-semibold text-violet-800 text-xs">درصد موثر</TableHead>
                  <TableHead className="text-right font-semibold text-violet-800 text-xs">پورسانت</TableHead>
                  <TableHead className="text-right font-semibold text-violet-800 text-xs">عملیات</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {tieredCommissions.filter(tc => tc.mode === 'proportional' || !tc.mode).map((tc, idx) => {
                   const effPct = getEffectiveTierPercentage(tc.salesAmount, tc.tiers || []);
                    return (
                      <TableRow key={tc.id}>
                        <TableCell className="text-muted-foreground text-xs">{toPersianDigits(idx + 1)}</TableCell>
                        <TableCell><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">{(salesPersons.find(s => s.id === tc.salesPersonId)?.name || '?').charAt(0)}</div><span className="font-medium">{salesPersons.find(s => s.id === tc.salesPersonId)?.name || 'نامشخص'}</span></div></TableCell>
                        <TableCell className="text-left font-mono tabular-nums" dir="ltr">{formatNumber(tc.salesAmount)}</TableCell>
                        <TableCell><Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono">{formatPercent(Math.round(effPct * 10000) / 10000)}</Badge></TableCell>
                        <TableCell className="font-bold text-violet-700 text-left font-mono tabular-nums" dir="ltr">{formatNumber(tc.commissionAmount)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-50 active:scale-90" 
                        onClick={() => handleDelete(tc.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SteppedTieredTab({ 
  salesPersons, 
  currentPeriod, 
  tieredCommissions, 
  createTieredCommission, 
  deleteTieredCommission,
  createSalesPerson,
}: {
  salesPersons: { id: string; name: string; code: string }[];
  currentPeriod: { year: number; month: number };
  tieredCommissions: any[];
  createTieredCommission: any;
  deleteTieredCommission: any;
  createSalesPerson: any;
}) {
  const [salesPersonId, setSalesPersonId] = useState('');
  const [salesAmount, setSalesAmount] = useState('');
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS_STEPPED.map(t => ({ ...t })));

  // Handle Excel import
  const handleExcelImport = async (rows: Record<string, string | number>[]) => {
    let successCount = 0;
    let errorCount = 0;
  
    for (const row of rows) {
      try {
        const name = String(row.name || '').trim();
        const code = String(row.code || '').trim() || name;
        const salesAmount = Number(row.salesAmount) || 0;
        
        if (!name || salesAmount <= 0) {
          errorCount++;
          continue;
        }
  
        let person = salesPersons.find(sp => sp.name.trim() === name);
        if (!person) person = salesPersons.find(sp => sp.code.trim() === code);
        let personId = person?.id;
  
        if (!personId) {
          try {
            const newPerson = await createSalesPerson.mutateAsync({
              name,
              code,
            });
            personId = newPerson.data.id;
            salesPersons.push(newPerson.data);
          } catch (err) {
            console.error('خطا در ایجاد فروشنده:', err);
            errorCount++;
            continue;
          }
        }
  
        if (personId) {
          try {
            await createTieredCommission.mutateAsync({
              salesPersonId: personId,
              salesAmount,
              tiers,
              mode: 'stepped',
              periodYear: currentPeriod.year,
              periodMonth: currentPeriod.month,
            });
            successCount++;
          } catch (err) {
            console.error('خطا در ثبت پورسانت پلکانی:', err);
            errorCount++;
          }
        }
      } catch (err) {
        console.error('خطا در پردازش ردیف:', err);
        errorCount++;
      }
    }
  
    if (successCount > 0) {
      toast.success(`${successCount} پورسانت پلکانی با موفقیت ثبت شد`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} ردیف با خطا مواجه شد`);
    }
  };

  const salesAmountNum = parseFloat(salesAmount) || 0;
  const steppedPercentage = useMemo(() => getSteppedTierPercentage(salesAmountNum, tiers), [salesAmountNum, tiers]);

  const activeTierIndex = useMemo(() => {
    for (let i = tiers.length - 1; i >= 0; i--) { if (salesAmountNum >= tiers[i].fromAmount) return i; }
    return -1;
  }, [salesAmountNum, tiers]);

  const addTier = () => {
    const lastTier = tiers[tiers.length - 1];
    const newFrom = lastTier.toAmount === 0 ? lastTier.fromAmount + 10000000 : lastTier.toAmount;
    setTiers([...tiers, { id: generateTierId(), fromAmount: newFrom, toAmount: 0, percentage: lastTier.percentage + 1 }]);
  };
  const removeTier = (id: string) => { if (tiers.length <= 1) return; setTiers(tiers.filter(t => t.id !== id)); };
  const updateTier = (id: string, field: keyof Tier, value: number) => { setTiers(tiers.map(t => t.id === id ? { ...t, [field]: value } : t)); };

  const handleAdd = () => {
    if (!salesPersonId || !salesAmount || tiers.length === 0) return;
    createTieredCommission.mutate({
      salesPersonId,
      salesAmount: parseFloat(salesAmount),
      tiers,
      mode: 'stepped',
      periodYear: currentPeriod.year,
      periodMonth: currentPeriod.month,
    });
    setSalesPersonId(''); setSalesAmount('');
  };

  const handleDelete = (id: string) => {
    if (confirm('آیا از حذف اطمینان دارید؟')) {
      deleteTieredCommission.mutate({
        id,
        year: currentPeriod.year,
        month: currentPeriod.month,
      });
    }
  };

  const totalCommission = tieredCommissions.filter(tc => tc.mode === 'stepped').reduce((sum, tc) => sum + tc.commissionAmount, 0);

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-md border-t-4 border-t-amber-500 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-amber-50/80 to-orange-50/30 pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg">
              <div className="p-1.5 rounded-lg bg-amber-100/80"><Award className="h-5 w-5 text-amber-600" /></div>
              پورسانت پلکانی سقفی (غیر تناسبی)
            </div>
            <ExcelImport
              title="پورسانت پلکانی سقفی"
              columns={TIERED_IMPORT_COLUMNS}
              onImport={handleExcelImport}
              theme="amber"
            />
          </CardTitle>
          <p className="text-sm text-muted-foreground">کل مبلغ فروش درصد همان پله‌ای که در آن قرار دارد را می‌گیرد</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">فروشنده</label>
              <Select value={salesPersonId} onValueChange={setSalesPersonId}>
                <SelectTrigger><SelectValue placeholder="انتخاب فروشنده" /></SelectTrigger>
                <SelectContent>{salesPersons.map(sp => (<SelectItem key={sp.id} value={sp.id}>{sp.name} ({sp.code})</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">مبلغ فروش (ریال)</label>
              <Input type="number" value={salesAmount} onChange={(e) => setSalesAmount(e.target.value)} placeholder="مبلغ فروش" dir="ltr" className="text-left font-mono tabular-nums focus-visible:ring-amber-500/30 focus-visible:border-amber-500" />
            </div>
          </div>

          {salesAmountNum > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Award className="h-4 w-4 text-amber-600" /><span className="text-sm font-bold text-amber-800">پیش‌نمایش سقفی</span></div>
                <button onClick={() => setShowBreakdown(!showBreakdown)} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 transition-colors">
                  {showBreakdown ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {showBreakdown ? 'مخفی' : 'جزئیات'}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-lg p-3 border border-amber-100"><p className="text-[10px] text-amber-500">مبلغ فروش</p><p className="text-sm font-bold text-amber-800" dir="ltr">{formatNumber(salesAmountNum)}</p></div>
                <div className="bg-white rounded-lg p-3 border border-amber-100"><p className="text-[10px] text-amber-500">پله فعال</p><p className="text-sm font-bold text-amber-800">{activeTierIndex >= 0 ? `پله ${toPersianDigits(activeTierIndex + 1)}` : '—'}</p></div>
                <div className="bg-white rounded-lg p-3 border border-amber-100"><p className="text-[10px] text-amber-500">درصد پله</p><p className="text-sm font-bold text-amber-800">{formatPercent(steppedPercentage)}</p></div>
                <div className="bg-white rounded-lg p-3 border border-emerald-100"><p className="text-[10px] text-emerald-600">مبلغ پورسانت</p><p className="text-sm font-bold text-emerald-700" dir="ltr">{formatCurrency(salesAmountNum * steppedPercentage / 100)}</p></div>
              </div>
              {activeTierIndex >= 0 && (
                <div className="bg-amber-100/50 rounded-lg p-2 text-xs text-amber-700">
                  فروش {formatNumber(salesAmountNum)} در پله {toPersianDigits(activeTierIndex + 1)} — درصد: {formatPercent(steppedPercentage)} از کل مبلغ
                </div>
              )}
            </div>
          )}

          <div className="border border-amber-200 bg-gradient-to-br from-amber-50/50 to-white rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-amber-800">پله‌های پورسانت</h4>
              <Button variant="outline" size="sm" onClick={addTier} className="gap-1 border-amber-300 text-amber-700 hover:bg-amber-50 rounded-lg"><Plus className="h-3 w-3" />افزودن پله</Button>
            </div>
            {tiers.map((tier, idx) => {
              const isActive = idx === activeTierIndex && salesAmountNum > 0;
              return (
                <div key={tier.id || idx} className={cn('grid grid-cols-2 sm:grid-cols-4 gap-2 items-center rounded-lg border p-3 shadow-sm transition-all', isActive ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-300/30' : 'bg-white border-amber-100')}>
                  <div className="flex flex-col gap-1"><label className="text-xs text-muted-foreground">از مبلغ</label><Input type="number" value={tier.fromAmount || ''} onChange={(e) => updateTier(tier.id!, 'fromAmount', parseFloat(e.target.value) || 0)} className="text-sm text-left font-mono" dir="ltr" /></div>
                  <div className="flex flex-col gap-1"><label className="text-xs text-muted-foreground">تا مبلغ {tier.toAmount === 0 && '(∞)'}</label><Input type="number" value={tier.toAmount || ''} onChange={(e) => updateTier(tier.id!, 'toAmount', parseFloat(e.target.value) || 0)} className="text-sm text-left font-mono" dir="ltr" /></div>
                  <div className="flex flex-col gap-1"><label className="text-xs text-muted-foreground">درصد پله</label><Input type="number" value={tier.percentage || ''} onChange={(e) => updateTier(tier.id!, 'percentage', parseFloat(e.target.value) || 0)} className="text-sm text-left font-mono" dir="ltr" step="0.1" /></div>
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[11px] font-mono">{formatPercent(tier.percentage)}</Badge>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-red-50 active:scale-90" onClick={() => removeTier(tier.id!)} disabled={tiers.length <= 1}><X className="h-4 w-4 text-red-400" /></Button>
                  </div>
                </div>
              );
            })}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-800 leading-relaxed space-y-1">
              <p className="font-bold">مثال: ۰ تا ۵M = ۲٪ | ۵M تا ۱۵M = ۳٪ | بالای ۱۵M = ۵٪</p>
              <p>→ فروش ۲۰M = ۵٪ × ۲۰M = ۱,۰۰۰,۰۰۰ ریال</p>
              <p className="text-amber-700">تفاوت با تناسبی: کل مبلغ فروش درصد پله فعلی را می‌گیرد، نه هر بخش درصد خود را</p>
            </div>
          </div>

          <Button onClick={handleAdd} disabled={!salesPersonId || !salesAmount}
            className="bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 shadow-md shadow-amber-500/20 rounded-xl gap-1.5 active:scale-[0.98]">
            <Plus className="h-4 w-4" />محاسبه و افزودن
          </Button>
        </CardContent>
      </Card>

      {totalCommission > 0 && (
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white rounded-2xl card-hover-lift shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-600 font-semibold mb-1">مجموع پورسانت پلکانی (سقفی)</p>
            <p className="text-xl font-extrabold tracking-tight text-amber-700" dir="ltr">{formatCurrency(totalCommission)}</p>
          </CardContent>
        </Card>
      )}

      {tieredCommissions.filter(tc => tc.mode === 'stepped').length > 0 && (
        <Card className="rounded-2xl shadow-sm border overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="table-zebra">
                <TableHeader><TableRow className="bg-gradient-to-r from-amber-50/80 to-orange-50/30">
                  <TableHead className="text-right font-semibold text-amber-800 text-xs">ردیف</TableHead>
                  <TableHead className="text-right font-semibold text-amber-800 text-xs">فروشنده</TableHead>
                  <TableHead className="text-right font-semibold text-amber-800 text-xs">مبلغ فروش</TableHead>
                  <TableHead className="text-right font-semibold text-amber-800 text-xs">درصد پله</TableHead>
                  <TableHead className="text-right font-semibold text-amber-800 text-xs">پورسانت</TableHead>
                  <TableHead className="text-right font-semibold text-amber-800 text-xs">عملیات</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {tieredCommissions.filter(tc => tc.mode === 'stepped').map((tc, idx) => {
                    const pct = getSteppedTierPercentage(tc.salesAmount, tc.tiers || []);
                    return (
                      <TableRow key={tc.id}>
                        <TableCell className="text-muted-foreground text-xs">{toPersianDigits(idx + 1)}</TableCell>
                        <TableCell><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">{(salesPersons.find(s => s.id === tc.salesPersonId)?.name || '?').charAt(0)}</div><span className="font-medium">{salesPersons.find(s => s.id === tc.salesPersonId)?.name || 'نامشخص'}</span></div></TableCell>
                        <TableCell className="text-left font-mono tabular-nums" dir="ltr">{formatNumber(tc.salesAmount)}</TableCell>
                        <TableCell><Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono">{formatPercent(pct)}</Badge></TableCell>
                        <TableCell className="font-bold text-amber-700 text-left font-mono tabular-nums" dir="ltr">{formatNumber(tc.commissionAmount)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-50 active:scale-90"
                        onClick={() => handleDelete(tc.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function generateTierId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}
