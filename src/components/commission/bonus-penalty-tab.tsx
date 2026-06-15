'use client';

import { useState } from 'react';
import { useCommissionStore } from '@/lib/store';
import { formatCurrency, formatNumber, toPersianDigits, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Gift, AlertTriangle, Trash2, Plus, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

export function BonusPenaltyTab() {
  const { salesPersons, currentPeriod, getMonthlyData, addBonusPenalty, removeBonusPenalty } = useCommissionStore();
  const data = getMonthlyData(currentPeriod);

  const [salesPersonId, setSalesPersonId] = useState('');
  const [type, setType] = useState<'bonus' | 'penalty'>('bonus');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const handleAdd = () => {
    if (!salesPersonId || !amount) return;
    addBonusPenalty(currentPeriod, { salesPersonId, type, amount: parseFloat(amount), reason: reason || (type === 'bonus' ? 'پاداش' : 'جریمه') });
    setSalesPersonId(''); setAmount(''); setReason(''); setType('bonus');
  };

  const getPersonName = (id: string) => salesPersons.find(sp => sp.id === id)?.name || 'نامشخص';

  const totalBonus = data.bonusPenalties.filter(bp => bp.type === 'bonus').reduce((s, bp) => s + bp.amount, 0);
  const totalPenalty = data.bonusPenalties.filter(bp => bp.type === 'penalty').reduce((s, bp) => s + bp.amount, 0);
  const netBonus = totalBonus - totalPenalty;

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl shadow-md border-t-4 border-t-emerald-500 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-50/80 to-amber-50/30 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-1.5 rounded-lg bg-emerald-100/80"><Gift className="h-5 w-5 text-emerald-600" /></div>
            ثبت پاداش و جریمه
          </CardTitle>
          <p className="text-sm text-muted-foreground leading-relaxed">
            پاداش‌ها به پورسانت اضافه و جریمه‌ها از پورسانت کسر می‌شوند
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Type Selector */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setType('bonus')}
              className={cn(
                'flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                type === 'bonus'
                  ? 'border-emerald-400 bg-emerald-50 shadow-md shadow-emerald-500/10'
                  : 'border-gray-200 bg-white hover:border-emerald-200'
              )}
            >
              <ArrowUpCircle className={cn('h-6 w-6', type === 'bonus' ? 'text-emerald-500' : 'text-gray-400')} />
              <div className="text-right">
                <p className={cn('font-bold', type === 'bonus' ? 'text-emerald-700' : 'text-gray-600')}>پاداش</p>
                <p className="text-[10px] text-muted-foreground">افزایش پورسانت</p>
              </div>
            </button>
            <button
              onClick={() => setType('penalty')}
              className={cn(
                'flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                type === 'penalty'
                  ? 'border-rose-400 bg-rose-50 shadow-md shadow-rose-500/10'
                  : 'border-gray-200 bg-white hover:border-rose-200'
              )}
            >
              <ArrowDownCircle className={cn('h-6 w-6', type === 'penalty' ? 'text-rose-500' : 'text-gray-400')} />
              <div className="text-right">
                <p className={cn('font-bold', type === 'penalty' ? 'text-rose-700' : 'text-gray-600')}>جریمه</p>
                <p className="text-[10px] text-muted-foreground">کاهش پورسانت</p>
              </div>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">فروشنده</label>
              <Select value={salesPersonId} onValueChange={setSalesPersonId}>
                <SelectTrigger><SelectValue placeholder="انتخاب فروشنده" /></SelectTrigger>
                <SelectContent>{salesPersons.map(sp => (<SelectItem key={sp.id} value={sp.id}>{sp.name} ({sp.code})</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">مبلغ (ریال)</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="مبلغ" dir="ltr" className={cn('text-left font-mono tabular-nums', type === 'bonus' ? 'focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500' : 'focus-visible:ring-rose-500/30 focus-visible:border-rose-500')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">دلیل</label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={type === 'bonus' ? 'دلیل پاداش' : 'دلیل جریمه'} />
            </div>
            <Button onClick={handleAdd} disabled={!salesPersonId || !amount}
              className={cn('gap-1.5 shadow-md rounded-xl active:scale-[0.98] transition-all',
                type === 'bonus'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 shadow-rose-500/20'
              )}>
              <Plus className="h-4 w-4" />{type === 'bonus' ? 'ثبت پاداش' : 'ثبت جریمه'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {data.bonusPenalties.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white rounded-2xl card-hover-lift shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
                <p className="text-sm text-emerald-600 font-semibold">مجموع پاداش‌ها</p>
              </div>
              <p className="text-xl font-extrabold tracking-tight text-emerald-700" dir="ltr">{formatCurrency(totalBonus)}</p>
            </CardContent>
          </Card>
          <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-white rounded-2xl card-hover-lift shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownCircle className="h-4 w-4 text-rose-500" />
                <p className="text-sm text-rose-600 font-semibold">مجموع جریمه‌ها</p>
              </div>
              <p className="text-xl font-extrabold tracking-tight text-rose-700" dir="ltr">{formatCurrency(totalPenalty)}</p>
            </CardContent>
          </Card>
          <Card className={cn('rounded-2xl card-hover-lift shadow-sm', netBonus >= 0 ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white' : 'border-rose-200 bg-gradient-to-br from-rose-50 to-white')}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                {netBonus >= 0 ? <ArrowUpCircle className="h-4 w-4 text-emerald-500" /> : <ArrowDownCircle className="h-4 w-4 text-rose-500" />}
                <p className={cn('text-sm font-semibold', netBonus >= 0 ? 'text-emerald-600' : 'text-rose-600')}>تراز خالص</p>
              </div>
              <p className={cn('text-xl font-extrabold tracking-tight', netBonus >= 0 ? 'text-emerald-700' : 'text-rose-700')} dir="ltr">{formatCurrency(Math.abs(netBonus))} {netBonus >= 0 ? '(مثبت)' : '(منفی)'}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      {data.bonusPenalties.length > 0 && (
        <Card className="rounded-2xl shadow-sm border overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="table-zebra">
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-emerald-50/80 to-amber-50/30">
                    <TableHead className="text-right font-semibold text-xs">ردیف</TableHead>
                    <TableHead className="text-right font-semibold text-xs">نوع</TableHead>
                    <TableHead className="text-right font-semibold text-xs">فروشنده</TableHead>
                    <TableHead className="text-right font-semibold text-xs">مبلغ</TableHead>
                    <TableHead className="text-right font-semibold text-xs">دلیل</TableHead>
                    <TableHead className="text-right font-semibold text-xs">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.bonusPenalties.map((bp, idx) => (
                    <TableRow key={bp.id}>
                      <TableCell className="text-muted-foreground text-xs">{toPersianDigits(idx + 1)}</TableCell>
                      <TableCell>
                        <Badge className={cn('gap-1 text-[10px]', bp.type === 'bonus' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-100 text-rose-700 hover:bg-rose-100')}>
                          {bp.type === 'bonus' ? <><ArrowUpCircle className="h-3 w-3" />پاداش</> : <><ArrowDownCircle className="h-3 w-3" />جریمه</>}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn('w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-sm', bp.type === 'bonus' ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-gradient-to-br from-rose-400 to-pink-500')}>
                            {getPersonName(bp.salesPersonId).charAt(0)}
                          </div>
                          <span className="font-medium">{getPersonName(bp.salesPersonId)}</span>
                        </div>
                      </TableCell>
                      <TableCell className={cn('font-bold text-left font-mono tabular-nums', bp.type === 'bonus' ? 'text-emerald-700' : 'text-rose-700')} dir="ltr">
                        {bp.type === 'bonus' ? '+' : '−'}{formatNumber(bp.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{bp.reason}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-50 active:scale-90" onClick={() => { if (confirm('آیا از حذف اطمینان دارید؟')) removeBonusPenalty(currentPeriod, bp.id); }}>
                          <Trash2 className="h-4 w-4 text-red-400" />
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
