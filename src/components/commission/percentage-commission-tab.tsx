'use client';

import { useState } from 'react';
import { useCommissionStore } from '@/lib/store';
import { formatCurrency, formatNumber, formatPercent, toPersianDigits } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Percent, Trash2, Plus } from 'lucide-react';
import { ExcelImport, ImportColumn } from './excel-import';

const PERCENTAGE_IMPORT_COLUMNS: ImportColumn[] = [
  { key: 'name', label: 'نام فروشنده', required: true, type: 'string' },
  { key: 'code', label: 'کد فروشنده', required: false, type: 'string' },
  { key: 'salesAmount', label: 'مبلغ فروش', required: true, type: 'number' },
  { key: 'percentage', label: 'درصد پورسانت', required: true, type: 'number' },
];

export function PercentageCommissionTab() {
  const { salesPersons, currentPeriod, getMonthlyData, addPercentageCommission, removePercentageCommission, addSalesPerson } = useCommissionStore();
  const data = getMonthlyData(currentPeriod);

  const [salesPersonId, setSalesPersonId] = useState('');
  const [salesAmount, setSalesAmount] = useState('');
  const [percentage, setPercentage] = useState('');

  // Auto-fill percentage from seller's defaultPercentage when seller is selected
  const handleSalesPersonChange = (id: string) => {
    setSalesPersonId(id);
    const person = salesPersons.find(sp => sp.id === id);
    if (person?.defaultPercentage && !percentage) {
      setPercentage(person.defaultPercentage.toString());
    }
  };

  const handleAdd = () => {
    if (!salesPersonId || !salesAmount || !percentage) return;
    addPercentageCommission(currentPeriod, { salesPersonId, salesAmount: parseFloat(salesAmount), percentage: parseFloat(percentage) });
    setSalesPersonId(''); setSalesAmount(''); setPercentage('');
  };

  // Handle Excel import
  const handleExcelImport = (rows: Record<string, string | number>[]) => {
    for (const row of rows) {
      const name = String(row.name || '').trim();
      const code = String(row.code || '').trim() || name;
      const salesAmount = Number(row.salesAmount) || 0;
      const percentage = Number(row.percentage) || 0;
      if (!name || salesAmount <= 0 || percentage <= 0) continue;

      // Find or create sales person by name
      let person = salesPersons.find(sp => sp.name.trim() === name);
      if (!person) {
        // Check by code
        person = salesPersons.find(sp => sp.code.trim() === code);
      }
      let personId = person?.id;
      if (!personId) {
        addSalesPerson(name, code);
        // Get newly added person from store
        const state = useCommissionStore.getState();
        personId = state.salesPersons.find(sp => sp.name.trim() === name)?.id;
      }
      if (personId) {
        addPercentageCommission(currentPeriod, { salesPersonId: personId, salesAmount, percentage });
      }
    }
  };

  const getSalesPersonName = (id: string) => salesPersons.find((sp) => sp.id === id)?.name || 'نامشخص';
  const totalCommission = data.percentageCommissions.reduce((sum, pc) => sum + pc.commissionAmount, 0);
  const totalSales = data.percentageCommissions.reduce((sum, pc) => sum + pc.salesAmount, 0);

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-md border-t-4 border-t-emerald-500 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-50/80 to-transparent pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg">
              <div className="p-1.5 rounded-lg bg-emerald-100/80"><Percent className="h-5 w-5 text-emerald-600" /></div>
              محاسبه پورسانت درصدی
            </div>
            <ExcelImport
              title="پورسانت درصدی"
              columns={PERCENTAGE_IMPORT_COLUMNS}
              onImport={handleExcelImport}
              theme="emerald"
            />
          </CardTitle>
          <p className="text-sm text-muted-foreground">پورسانت بر اساس درصد ثابت از مبلغ فروش محاسبه می‌شود</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">فروشنده</label>
              <Select value={salesPersonId} onValueChange={handleSalesPersonChange}>
                <SelectTrigger><SelectValue placeholder="انتخاب فروشنده" /></SelectTrigger>
                <SelectContent>{salesPersons.map((sp) => (<SelectItem key={sp.id} value={sp.id}>{sp.name} ({sp.code})</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">مبلغ فروش (ریال)</label>
              <Input type="number" value={salesAmount} onChange={(e) => setSalesAmount(e.target.value)} placeholder="مبلغ فروش" dir="ltr" className="text-left font-mono tabular-nums focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">درصد پورسانت</label>
              <Input type="number" value={percentage} onChange={(e) => setPercentage(e.target.value)} placeholder="درصد" dir="ltr" className="text-left font-mono tabular-nums focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500" />
            </div>
            <Button onClick={handleAdd} disabled={!salesPersonId || !salesAmount || !percentage}
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-md shadow-emerald-500/20 rounded-xl gap-1.5 transition-all duration-200 active:scale-[0.98]">
              <Plus className="h-4 w-4" />افزودن
            </Button>
          </div>
        </CardContent>
      </Card>

      {data.percentageCommissions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white rounded-2xl card-hover-lift shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-emerald-600 font-semibold mb-1">مجموع فروش</p>
              <p className="text-xl font-extrabold tracking-tight text-emerald-700 animate-count-up" dir="ltr">{formatCurrency(totalSales)}</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white rounded-2xl card-hover-lift shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-amber-600 font-semibold mb-1">مجموع پورسانت</p>
              <p className="text-xl font-extrabold tracking-tight text-amber-700 animate-count-up" dir="ltr">{formatCurrency(totalCommission)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {data.percentageCommissions.length > 0 && (
        <Card className="rounded-2xl shadow-sm border overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="table-zebra">
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-emerald-50/80 to-emerald-50/30 hover:bg-gradient-to-r hover:from-emerald-50/80 hover:to-emerald-50/30">
                    <TableHead className="text-right font-semibold text-emerald-800 text-xs">ردیف</TableHead>
                    <TableHead className="text-right font-semibold text-emerald-800 text-xs">نام فروشنده</TableHead>
                    <TableHead className="text-right font-semibold text-emerald-800 text-xs">مبلغ فروش</TableHead>
                    <TableHead className="text-right font-semibold text-emerald-800 text-xs">درصد</TableHead>
                    <TableHead className="text-right font-semibold text-emerald-800 text-xs">مبلغ پورسانت</TableHead>
                    <TableHead className="text-right font-semibold text-emerald-800 text-xs">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.percentageCommissions.map((pc, idx) => (
                    <TableRow key={pc.id} className="transition-all duration-150">
                      <TableCell className="text-muted-foreground text-xs">{toPersianDigits(idx + 1)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                            {getSalesPersonName(pc.salesPersonId).charAt(0)}
                          </div>
                          <span className="font-medium">{getSalesPersonName(pc.salesPersonId)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-left font-mono tabular-nums" dir="ltr">{formatNumber(pc.salesAmount)}</TableCell>
                      <TableCell>{formatPercent(pc.percentage)}</TableCell>
                      <TableCell className="font-bold text-emerald-700 text-left font-mono tabular-nums" dir="ltr">{formatNumber(pc.commissionAmount)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600 active:scale-90 transition-all" onClick={() => { if (confirm('آیا از حذف اطمینان دارید؟')) removePercentageCommission(currentPeriod, pc.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
