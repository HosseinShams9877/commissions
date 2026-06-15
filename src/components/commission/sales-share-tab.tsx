'use client';

import { useState } from 'react';
import { useCommissionStore } from '@/lib/store';
import { formatCurrency, formatNumber, formatPercent, toPersianDigits } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Trash2, Plus } from 'lucide-react';
import { ExcelImport, ImportColumn } from './excel-import';

const SALES_SHARE_IMPORT_COLUMNS: ImportColumn[] = [
  { key: 'name', label: 'نام فروشنده', required: true, type: 'string' },
  { key: 'code', label: 'کد فروشنده', required: false, type: 'string' },
  { key: 'totalSales', label: 'مجموع فروش', required: true, type: 'number' },
  { key: 'sharePercentage', label: 'درصد سهم', required: true, type: 'number' },
];

export function SalesShareTab() {
  const { salesPersons, currentPeriod, getMonthlyData, addSalesShare, removeSalesShare } = useCommissionStore();
  const data = getMonthlyData(currentPeriod);
  const [salesPersonId, setSalesPersonId] = useState('');
  const [totalSales, setTotalSales] = useState('');
  const [sharePercentage, setSharePercentage] = useState('');

  const handleAdd = () => {
    if (!salesPersonId || !totalSales || !sharePercentage) return;
    addSalesShare(currentPeriod, { salesPersonId, totalSales: parseFloat(totalSales), sharePercentage: parseFloat(sharePercentage) });
    setSalesPersonId(''); setTotalSales(''); setSharePercentage('');
  };

  const handleExcelImport = (rows: Record<string, string | number>[]) => {
    for (const row of rows) {
      const name = String(row.name || '').trim();
      const code = String(row.code || '').trim() || name;
      const sales = Number(row.totalSales) || 0;
      const pct = Number(row.sharePercentage) || 0;
      if (!name || sales <= 0 || pct <= 0) continue;
      let person = salesPersons.find(sp => sp.name.trim() === name);
      if (!person) person = salesPersons.find(sp => sp.code.trim() === code);
      let personId = person?.id;
      if (!personId) {
        useCommissionStore.getState().addSalesPerson(name, code);
        personId = useCommissionStore.getState().salesPersons.find(sp => sp.name.trim() === name)?.id;
      }
      if (personId) addSalesShare(currentPeriod, { salesPersonId: personId, totalSales: sales, sharePercentage: pct });
    }
  };

  const getSalesPersonName = (id: string) => salesPersons.find((sp) => sp.id === id)?.name || 'نامشخص';
  const totalShareAmount = data.salesShares.reduce((sum, ss) => sum + ss.shareAmount, 0);

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-md border-t-4 border-t-cyan-500 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-cyan-50/80 to-transparent pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg">
              <div className="p-1.5 rounded-lg bg-cyan-100/80"><TrendingUp className="h-5 w-5 text-cyan-600" /></div>
              سهم از فروش
            </div>
            <ExcelImport title="سهم از فروش" columns={SALES_SHARE_IMPORT_COLUMNS} onImport={handleExcelImport} theme="cyan" />
          </CardTitle>
          <p className="text-sm text-muted-foreground">محاسبه سهم هر فروشنده از مجموع فروش بر اساس درصد مشخص</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">فروشنده</label>
              <Select value={salesPersonId} onValueChange={setSalesPersonId}>
                <SelectTrigger><SelectValue placeholder="انتخاب فروشنده" /></SelectTrigger>
                <SelectContent>{salesPersons.map((sp) => (<SelectItem key={sp.id} value={sp.id}>{sp.name} ({sp.code})</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">مجموع فروش (ریال)</label>
              <Input type="number" value={totalSales} onChange={(e) => setTotalSales(e.target.value)} placeholder="مجموع فروش" dir="ltr" className="text-left font-mono tabular-nums focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">درصد سهم</label>
              <Input type="number" value={sharePercentage} onChange={(e) => setSharePercentage(e.target.value)} placeholder="درصد سهم" dir="ltr" className="text-left font-mono tabular-nums focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500" />
            </div>
            <Button onClick={handleAdd} disabled={!salesPersonId || !totalSales || !sharePercentage}
              className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-700 hover:to-cyan-600 shadow-md shadow-cyan-500/20 rounded-xl gap-1.5 transition-all duration-200 active:scale-[0.98]">
              <Plus className="h-4 w-4" />افزودن
            </Button>
          </div>
        </CardContent>
      </Card>

      {data.salesShares.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-cyan-200 bg-gradient-to-br from-cyan-50 to-white rounded-2xl card-hover-lift shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-cyan-600 font-semibold mb-1">مجموع فروش ثبت شده</p>
              <p className="text-xl font-extrabold tracking-tight text-cyan-700 animate-count-up" dir="ltr">{formatCurrency(data.salesShares.reduce((sum, ss) => sum + ss.totalSales, 0))}</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white rounded-2xl card-hover-lift shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-amber-600 font-semibold mb-1">مجموع سهم از فروش</p>
              <p className="text-xl font-extrabold tracking-tight text-amber-700 animate-count-up" dir="ltr">{formatCurrency(totalShareAmount)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {data.salesShares.length > 0 && (
        <Card className="rounded-2xl shadow-sm border overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="table-zebra">
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-cyan-50/80 to-cyan-50/30 hover:bg-gradient-to-r hover:from-cyan-50/80 hover:to-cyan-50/30">
                    <TableHead className="text-right font-semibold text-cyan-800 text-xs">ردیف</TableHead>
                    <TableHead className="text-right font-semibold text-cyan-800 text-xs">نام فروشنده</TableHead>
                    <TableHead className="text-right font-semibold text-cyan-800 text-xs">مجموع فروش</TableHead>
                    <TableHead className="text-right font-semibold text-cyan-800 text-xs">درصد سهم</TableHead>
                    <TableHead className="text-right font-semibold text-cyan-800 text-xs">مبلغ سهم</TableHead>
                    <TableHead className="text-right font-semibold text-cyan-800 text-xs">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.salesShares.map((ss, idx) => (
                    <TableRow key={ss.id} className="transition-all duration-150">
                      <TableCell className="text-muted-foreground text-xs">{toPersianDigits(idx + 1)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">{getSalesPersonName(ss.salesPersonId).charAt(0)}</div>
                          <span className="font-medium">{getSalesPersonName(ss.salesPersonId)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-left font-mono tabular-nums" dir="ltr">{formatNumber(ss.totalSales)}</TableCell>
                      <TableCell>{formatPercent(ss.sharePercentage)}</TableCell>
                      <TableCell className="font-bold text-cyan-700 text-left font-mono tabular-nums" dir="ltr">{formatNumber(ss.shareAmount)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600 active:scale-90 transition-all" onClick={() => { if (confirm('آیا از حذف اطمینان دارید؟')) removeSalesShare(currentPeriod, ss.id); }}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
