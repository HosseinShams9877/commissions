'use client';

import { useState } from 'react';
import { useCommissionStore } from '@/lib/store';
import { formatCurrency, formatNumber, toPersianDigits } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Handshake, Trash2, Plus } from 'lucide-react';
import { ExcelImport, ImportColumn } from './excel-import';
import { 
  useFinderFees, 
  useCreateFinderFee, 
  useDeleteFinderFee,
  useCreateSalesPerson,
  useSalesPersons
} from '@/hooks/use-api';
import { toast } from 'sonner';

const FINDER_FEE_IMPORT_COLUMNS: ImportColumn[] = [
  { key: 'name', label: 'نام فروشنده', required: true, type: 'string' },
  { key: 'code', label: 'کد فروشنده', required: false, type: 'string' },
  { key: 'description', label: 'شرح', required: true, type: 'string' },
  { key: 'amount', label: 'مبلغ', required: true, type: 'number' },
];

export function FinderFeeTab() {
  const { currentPeriod } = useCommissionStore();
  
  // گرفتن داده‌ها از API
  const { data: salesPersonsData } = useSalesPersons();
  const { data: finderFeeData } = useFinderFees(currentPeriod.year, currentPeriod.month);
  
  // Mutations
  const createFinderFeeMutation = useCreateFinderFee();
  const deleteFinderFeeMutation = useDeleteFinderFee();
  const createSalesPersonMutation = useCreateSalesPerson();
  
  // داده‌های محلی
  const salesPersons = salesPersonsData?.salesPersons || [];
  const finderFees = finderFeeData?.finderFees || [];
  const [salesPersonId, setSalesPersonId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  const handleAdd = () => {
  if (!salesPersonId || !description || !amount) return;
  createFinderFeeMutation.mutate({
    salesPersonId,
    description,
    amount: parseFloat(amount),
    periodYear: currentPeriod.year,
    periodMonth: currentPeriod.month,
  });
  setSalesPersonId(''); setDescription(''); setAmount('');
};

const handleDelete = (id: string) => {
  if (confirm('آیا از حذف اطمینان دارید؟')) {
    deleteFinderFeeMutation.mutate({
      id,
      year: currentPeriod.year,
      month: currentPeriod.month,
    });
  }
};

  // Handle Excel import
  const handleExcelImport = async (rows: Record<string, string | number>[]) => {
  let successCount = 0;
  let errorCount = 0;

  for (const row of rows) {
    try {
      const name = String(row.name || '').trim();
      const code = String(row.code || '').trim() || name;
      const desc = String(row.description || '').trim();
      const amt = Number(row.amount) || 0;
      
      if (!name || !desc || amt <= 0) {
        errorCount++;
        continue;
      }

      let person = salesPersons.find(sp => sp.name.trim() === name);
      if (!person) person = salesPersons.find(sp => sp.code.trim() === code);
      let personId = person?.id;

      if (!personId) {
        try {
          const newPerson = await createSalesPersonMutation.mutateAsync({
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
          await createFinderFeeMutation.mutateAsync({
            salesPersonId: personId,
            description: desc,
            amount: amt,
            periodYear: currentPeriod.year,
            periodMonth: currentPeriod.month,
          });
          successCount++;
        } catch (err) {
          console.error('خطا در ثبت حق‌النصب:', err);
          errorCount++;
        }
      }
    } catch (err) {
      console.error('خطا در پردازش ردیف:', err);
      errorCount++;
    }
  }

  if (successCount > 0) {
    toast.success(`${successCount} حق‌النصب با موفقیت ثبت شد`);
  }
  if (errorCount > 0) {
    toast.error(`${errorCount} ردیف با خطا مواجه شد`);
  }
};

  const getSalesPersonName = (id: string) => salesPersons.find((sp) => sp.id === id)?.name || 'نامشخص';
  const totalFinderFee = finderFees.reduce((sum, ff) => sum + ff.amount, 0);

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-md border-t-4 border-t-teal-500 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-50/80 to-transparent pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg">
              <div className="p-1.5 rounded-lg bg-teal-100/80"><Handshake className="h-5 w-5 text-teal-600" /></div>
              حق النصب
            </div>
            <ExcelImport title="حق‌النصب" columns={FINDER_FEE_IMPORT_COLUMNS} onImport={handleExcelImport} theme="teal" />
          </CardTitle>
          <p className="text-sm text-muted-foreground">ثبت حق‌النصب (کمیسیون معرفی و واسطه‌گری) برای هر فروشنده</p>
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
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="شرح حق‌النصب" className="focus-visible:ring-teal-500/30 focus-visible:border-teal-500" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">مبلغ (ریال)</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="مبلغ" dir="ltr" className="text-left font-mono tabular-nums focus-visible:ring-teal-500/30 focus-visible:border-teal-500" />
            </div>
            <Button onClick={handleAdd} disabled={!salesPersonId || !description || !amount}
              className="bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 shadow-md shadow-teal-500/20 rounded-xl gap-1.5 transition-all duration-200 active:scale-[0.98]">
              <Plus className="h-4 w-4" />افزودن
            </Button>
          </div>
        </CardContent>
      </Card>

      {finderFees.length > 0 && (
        <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-white rounded-2xl card-hover-lift shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-teal-600 font-semibold mb-1">مجموع حق‌النصب</p>
            <p className="text-xl font-extrabold tracking-tight text-teal-700 animate-count-up" dir="ltr">{formatCurrency(totalFinderFee)}</p>
          </CardContent>
        </Card>
      )}

      {finderFees.length > 0 && (
        <Card className="rounded-2xl shadow-sm border overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="table-zebra">
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-teal-50/80 to-teal-50/30 hover:bg-gradient-to-r hover:from-teal-50/80 hover:to-teal-50/30">
                    <TableHead className="text-right font-semibold text-teal-800 text-xs">ردیف</TableHead>
                    <TableHead className="text-right font-semibold text-teal-800 text-xs">نام فروشنده</TableHead>
                    <TableHead className="text-right font-semibold text-teal-800 text-xs">شرح</TableHead>
                    <TableHead className="text-right font-semibold text-teal-800 text-xs">مبلغ</TableHead>
                    <TableHead className="text-right font-semibold text-teal-800 text-xs">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {finderFees.map((ff, idx) => (
                    <TableRow key={ff.id} className="transition-all duration-150">
                      <TableCell className="text-muted-foreground text-xs">{toPersianDigits(idx + 1)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">{getSalesPersonName(ff.salesPersonId).charAt(0)}</div>
                          <span className="font-medium">{getSalesPersonName(ff.salesPersonId)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{ff.description}</TableCell>
                      <TableCell className="font-bold text-teal-700 text-right font-mono tabular-nums">
  <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>{formatNumber(ff.amount)}</span>
</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600 active:scale-90 transition-all" onClick={() => handleDelete(ff.id)}><Trash2 className="h-4 w-4" /></Button>
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
