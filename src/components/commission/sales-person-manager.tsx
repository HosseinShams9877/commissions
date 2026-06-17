'use client';

import { useState } from 'react';
import { useCommissionStore } from '@/lib/store';
import { toPersianDigits, formatPercent } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Trash2, Pencil, Users } from 'lucide-react';
import { 
  useSalesPersons,
  useCreateSalesPerson,
  useUpdateSalesPerson,
  useDeleteSalesPerson,
} from '@/hooks/use-api';
import { toast } from 'sonner';

export function SalesPersonManager() {
  const { data: salesPersonsData } = useSalesPersons();
  
  // Mutations
  const createSalesPersonMutation = useCreateSalesPerson();
  const updateSalesPersonMutation = useUpdateSalesPerson();
  const deleteSalesPersonMutation = useDeleteSalesPerson();
  
  // داده‌های محلی
  const salesPersons = salesPersonsData?.salesPersons || [];
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [shebaNumber, setShebaNumber] = useState('');
  const [defaultPercentage, setDefaultPercentage] = useState('');

  const handleSubmit = () => {
    if (!name.trim() || !code.trim()) return;
    const pct = parseFloat(defaultPercentage) || 0;
    
    if (editId) {
      updateSalesPersonMutation.mutate({
        id: editId,
        name,
        code,
        bankName,
        cardNumber,
        shebaNumber,
        defaultPercentage: pct,
      });
      setEditId(null);
    } else {
      createSalesPersonMutation.mutate({
        name,
        code,
        bankName,
        cardNumber,
        shebaNumber,
        defaultPercentage: pct,
      });
    }
    setName(''); setCode(''); setBankName(''); setCardNumber(''); setShebaNumber(''); setDefaultPercentage(''); setOpen(false);
  };
  const handleDelete = (id: string) => {
    if (confirm('آیا از حذف اطمینان دارید؟')) {
      deleteSalesPersonMutation.mutate(id);
    }
  };
  const handleEdit = (id: string, sp: { name: string; code: string; bankName?: string; cardNumber?: string; shebaNumber?: string; defaultPercentage?: number }) => {
    setEditId(id); 
    setName(sp.name); 
    setCode(sp.code); 
    setBankName(sp.bankName || ''); 
    setCardNumber(sp.cardNumber || ''); 
    setShebaNumber(sp.shebaNumber || ''); 
    setDefaultPercentage(sp.defaultPercentage?.toString() || ''); 
    setOpen(true);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) { setEditId(null); setName(''); setCode(''); setBankName(''); setCardNumber(''); setShebaNumber(''); setDefaultPercentage(''); }
  };

  return (
    <Card className="rounded-2xl shadow-md border-t-4 border-t-emerald-500 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-emerald-50/80 to-transparent flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-1.5 rounded-lg bg-emerald-100/80"><Users className="h-5 w-5 text-emerald-600" /></div>
          لیست فروشندگان
        </CardTitle>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-md shadow-emerald-500/20 rounded-xl transition-all duration-200 active:scale-[0.98]">
              <UserPlus className="h-4 w-4" />افزودن فروشنده
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="sm:max-w-md rounded-2xl border-t-4 border-t-emerald-500">
            <DialogHeader>
              <DialogTitle className="gradient-text">{editId ? 'ویرایش فروشنده' : 'افزودن فروشنده جدید'}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">نام فروشنده</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام و نام خانوادگی" className="focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">کد فروشنده</label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="کد پرسنلی" dir="ltr" className="text-left font-mono focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">درصد پیش‌فرض پورسانت</label>
                <Input type="number" value={defaultPercentage} onChange={(e) => setDefaultPercentage(e.target.value)} placeholder="مثلاً: ۵" dir="ltr" className="text-left font-mono focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500" />
                <p className="text-[10px] text-muted-foreground">درصد پیش‌فرضی که هنگام ثبت فروش جدید خودکار پر می‌شود</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">نام بانک</label>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="مثلاً: بانک ملت" className="focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">شماره کارت</label>
                <Input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="شماره کارت ۱۶ رقمی" dir="ltr" className="text-left font-mono focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">شماره شبا</label>
                <Input value={shebaNumber} onChange={(e) => setShebaNumber(e.target.value)} placeholder="IR" dir="ltr" className="text-left font-mono focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500" />
              </div>
              <Button onClick={handleSubmit} className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-md shadow-emerald-500/20 rounded-xl mt-2 transition-all duration-200 active:scale-[0.98]">
                {editId ? 'ذخیره تغییرات' : 'افزودن'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {salesPersons.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 text-emerald-200" />
            <p className="font-semibold text-emerald-800 mb-1">هنوز فروشنده‌ای اضافه نشده است</p>
            <p className="text-sm">برای شروع، فروشنده جدید اضافه کنید</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="table-zebra">
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-emerald-50/80 to-emerald-50/30 hover:bg-gradient-to-r hover:from-emerald-50/80 hover:to-emerald-50/30">
                  <TableHead className="text-right font-semibold text-emerald-800 text-xs">ردیف</TableHead>
                  <TableHead className="text-right font-semibold text-emerald-800 text-xs">نام فروشنده</TableHead>
                  <TableHead className="text-right font-semibold text-emerald-800 text-xs">کد</TableHead>
                  <TableHead className="text-right font-semibold text-emerald-800 text-xs">درصد پیش‌فرض</TableHead>
                  <TableHead className="text-right font-semibold text-emerald-800 text-xs">بانک</TableHead>
                  <TableHead className="text-right font-semibold text-emerald-800 text-xs">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesPersons.map((sp, idx) => (
                  <TableRow key={sp.id} className="transition-all duration-150">
                    <TableCell className="text-muted-foreground text-xs">{toPersianDigits(idx + 1)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                          {sp.name.charAt(0)}
                        </div>
                        <span className="font-medium">{sp.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs" dir="ltr">{sp.code}</TableCell>
                    <TableCell>
                      {sp.defaultPercentage ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">
                          {formatPercent(sp.defaultPercentage)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{sp.bankName || '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-amber-50 hover:text-amber-600 active:scale-90 transition-all" onClick={() => handleEdit(sp.id, sp)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600 active:scale-90 transition-all" 
                        onClick={() => handleDelete(sp.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
