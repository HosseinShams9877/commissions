'use client';

import { useState } from 'react';
import { useCommissionStore } from '@/lib/store';
import { formatCurrency, formatNumber, toPersianDigits } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FlaskConical, Trash2, Plus } from 'lucide-react';
import { ExcelImport, ImportColumn } from './excel-import';

const TEST_COST_IMPORT_COLUMNS: ImportColumn[] = [
  { key: 'name', label: 'نام فروشنده', required: true, type: 'string' },
  { key: 'code', label: 'کد فروشنده', required: false, type: 'string' },
  { key: 'description', label: 'شرح', required: true, type: 'string' },
  { key: 'amount', label: 'مبلغ', required: true, type: 'number' },
];

export function TestCostTab() {
  const { salesPersons, currentPeriod, getMonthlyData, addTestCost, removeTestCost } = useCommissionStore();
  const data = getMonthlyData(currentPeriod);
  const [salesPersonId, setSalesPersonId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  const handleAdd = () => {
    if (!salesPersonId || !description || !amount) return;
    addTestCost(currentPeriod, { salesPersonId, description, amount: parseFloat(amount) });
    setSalesPersonId(''); setDescription(''); setAmount('');
  };

  const handleExcelImport = (rows: Record<string, string | number>[]) => {
    for (const row of rows) {
      const name = String(row.name || '').trim();
      const code = String(row.code || '').trim() || name;
      const desc = String(row.description || '').trim();
      const amt = Number(row.amount) || 0;
      if (!name || !desc || amt <= 0) continue;
      let person = salesPersons.find(sp => sp.name.trim() === name);
      if (!person) person = salesPersons.find(sp => sp.code.trim() === code);
      let personId = person?.id;
      if (!personId) {
        useCommissionStore.getState().addSalesPerson(name, code);
        personId = useCommissionStore.getState().salesPersons.find(sp => sp.name.trim() === name)?.id;
      }
      if (personId) addTestCost(currentPeriod, { salesPersonId: personId, description: desc, amount: amt });
    }
  };

  const getSalesPersonName = (id: string) => salesPersons.find((sp) => sp.id === id)?.name || 'نامشخص';
  const totalTestCost = data.testCosts.reduce((sum, tc) => sum + tc.amount, 0);

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-md border-t-4 border-t-orange-500 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-orange-50/80 to-transparent pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg">
              <div className="p-1.5 rounded-lg bg-orange-100/80"><FlaskConical className="h-5 w-5 text-orange-600" /></div>
              هزینه تست
            </div>
            <ExcelImport title="هزینه تست" columns={TEST_COST_IMPORT_COLUMNS} onImport={handleExcelImport} theme="orange" />
          </CardTitle>
          <p className="text-sm text-muted-foreground">ثبت هزینه‌های تست و آزمایش مرتبط با فروش</p>
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
              <label className="text-sm font-semibold text-gray-700">شرح</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="شرح هزینه تست" className="focus-visible:ring-orange-500/30 focus-visible:border-orange-500" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">مبلغ (ریال)</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="مبلغ" dir="ltr" className="text-left font-mono tabular-nums focus-visible:ring-orange-500/30 focus-visible:border-orange-500" />
            </div>
            <Button onClick={handleAdd} disabled={!salesPersonId || !description || !amount}
              className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 shadow-md shadow-orange-500/20 rounded-xl gap-1.5 transition-all duration-200 active:scale-[0.98]">
              <Plus className="h-4 w-4" />افزودن
            </Button>
          </div>
        </CardContent>
      </Card>

      {data.testCosts.length > 0 && (
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white rounded-2xl card-hover-lift shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-orange-600 font-semibold mb-1">مجموع هزینه تست</p>
            <p className="text-xl font-extrabold tracking-tight text-orange-700 animate-count-up" dir="ltr">{formatCurrency(totalTestCost)}</p>
          </CardContent>
        </Card>
      )}

      {data.testCosts.length > 0 && (
        <Card className="rounded-2xl shadow-sm border overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="table-zebra">
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-orange-50/80 to-orange-50/30 hover:bg-gradient-to-r hover:from-orange-50/80 hover:to-orange-50/30">
                    <TableHead className="text-right font-semibold text-orange-800 text-xs">ردیف</TableHead>
                    <TableHead className="text-right font-semibold text-orange-800 text-xs">نام فروشنده</TableHead>
                    <TableHead className="text-right font-semibold text-orange-800 text-xs">شرح</TableHead>
                    <TableHead className="text-right font-semibold text-orange-800 text-xs">مبلغ</TableHead>
                    <TableHead className="text-right font-semibold text-orange-800 text-xs">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.testCosts.map((tc, idx) => (
                    <TableRow key={tc.id} className="transition-all duration-150">
                      <TableCell className="text-muted-foreground text-xs">{toPersianDigits(idx + 1)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">{getSalesPersonName(tc.salesPersonId).charAt(0)}</div>
                          <span className="font-medium">{getSalesPersonName(tc.salesPersonId)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{tc.description}</TableCell>
                      <TableCell className="font-bold text-orange-700 text-left font-mono tabular-nums" dir="ltr">{formatNumber(tc.amount)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600 active:scale-90 transition-all" onClick={() => { if (confirm('آیا از حذف اطمینان دارید؟')) removeTestCost(currentPeriod, tc.id); }}><Trash2 className="h-4 w-4" /></Button>
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
