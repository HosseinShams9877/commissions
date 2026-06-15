'use client';

import { useState, useMemo } from 'react';
import { useCommissionStore } from '@/lib/store';
import {
  formatCurrency, formatNumber, formatPercent, toPersianDigits,
  formatShamsiDate, getCurrentShamsiDate, cn, PERSIAN_MONTHS,
} from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ExcelImport, ImportColumn } from './excel-import';
import * as XLSX from 'xlsx';
import {
  Banknote, HandCoins, AlertTriangle, CheckCircle2,
  TrendingUp, Plus, Trash2,
  Wallet, ArrowDownCircle, ArrowUpCircle, Scale, FileBarChart,
  ChevronDown, ChevronUp, Filter, X, RotateCcw, FileDown,
} from 'lucide-react';

// ====== Excel import column definitions ======
const COLLECTION_IMPORT_COLUMNS: ImportColumn[] = [
  { key: 'name', label: 'نام فروشنده', required: true, type: 'string' },
  { key: 'code', label: 'کد فروشنده', required: false, type: 'string' },
  { key: 'amount', label: 'مبلغ وصول', required: true, type: 'number' },
  { key: 'date', label: 'تاریخ', required: false, type: 'string' },
  { key: 'description', label: 'شرح', required: false, type: 'string' },
];

const SETTLEMENT_IMPORT_COLUMNS: ImportColumn[] = [
  { key: 'name', label: 'نام فروشنده', required: true, type: 'string' },
  { key: 'code', label: 'کد فروشنده', required: false, type: 'string' },
  { key: 'amount', label: 'مبلغ تسویه', required: true, type: 'number' },
  { key: 'date', label: 'تاریخ', required: false, type: 'string' },
  { key: 'description', label: 'شرح', required: false, type: 'string' },
];

type SubTab = 'collections' | 'settlements' | 'report';

// ====== Helper: compute financial summary for a single MonthlyData ======
function computePeriodFinancials(
  data: {
    percentageCommissions: { salesPersonId: string; salesAmount: number; commissionAmount: number }[];
    tieredCommissions: { salesPersonId: string; salesAmount: number; commissionAmount: number }[];
    finderFees: { salesPersonId: string; amount: number }[];
    salesShares: { salesPersonId: string; shareAmount: number }[];
    teamCommissions: { teamId: string; totalLeaderCommission: number }[];
    bonusPenalties: { salesPersonId: string; type: 'bonus' | 'penalty'; amount: number }[];
    testCosts: { salesPersonId: string; amount: number }[];
    repairCosts: { salesPersonId: string; amount: number }[];
    collections: { salesPersonId: string; amount: number }[];
    settlements: { salesPersonId: string; amount: number }[];
  },
  teams: { id: string; leaderId: string }[],
  salesPersonIds?: string[], // if provided, only compute for these IDs
) {
  const result: Record<string, {
    sales: number; collections: number; commissions: number;
    deductions: number; netPayable: number; settled: number; remaining: number;
  }> = {};

  const init = (id: string) => {
    if (!result[id]) result[id] = { sales: 0, collections: 0, commissions: 0, deductions: 0, netPayable: 0, settled: 0, remaining: 0 };
  };
  const shouldInclude = (id: string) => !salesPersonIds || salesPersonIds.includes(id);

  for (const pc of data.percentageCommissions) {
    if (!shouldInclude(pc.salesPersonId)) continue;
    init(pc.salesPersonId);
    result[pc.salesPersonId].sales += pc.salesAmount;
    result[pc.salesPersonId].commissions += pc.commissionAmount;
  }
  for (const tc of data.tieredCommissions) {
    if (!shouldInclude(tc.salesPersonId)) continue;
    init(tc.salesPersonId);
    result[tc.salesPersonId].sales += tc.salesAmount;
    result[tc.salesPersonId].commissions += tc.commissionAmount;
  }
  for (const ff of data.finderFees) {
    if (!shouldInclude(ff.salesPersonId)) continue;
    init(ff.salesPersonId);
    result[ff.salesPersonId].commissions += ff.amount;
  }
  for (const ss of data.salesShares) {
    if (!shouldInclude(ss.salesPersonId)) continue;
    init(ss.salesPersonId);
    result[ss.salesPersonId].commissions += ss.shareAmount;
  }
  for (const tc of data.teamCommissions) {
    const team = teams.find(t => t.id === tc.teamId);
    if (team && shouldInclude(team.leaderId)) {
      init(team.leaderId);
      result[team.leaderId].commissions += tc.totalLeaderCommission;
    }
  }
  for (const bp of data.bonusPenalties) {
    if (!shouldInclude(bp.salesPersonId)) continue;
    init(bp.salesPersonId);
    if (bp.type === 'bonus') result[bp.salesPersonId].commissions += bp.amount;
    else result[bp.salesPersonId].deductions += bp.amount;
  }
  for (const tc of data.testCosts) {
    if (!shouldInclude(tc.salesPersonId)) continue;
    init(tc.salesPersonId);
    result[tc.salesPersonId].deductions += tc.amount;
  }
  for (const rc of data.repairCosts) {
    if (!shouldInclude(rc.salesPersonId)) continue;
    init(rc.salesPersonId);
    result[rc.salesPersonId].deductions += rc.amount;
  }
  for (const c of data.collections) {
    if (!shouldInclude(c.salesPersonId)) continue;
    init(c.salesPersonId);
    result[c.salesPersonId].collections += c.amount;
  }
  for (const st of data.settlements) {
    if (!shouldInclude(st.salesPersonId)) continue;
    init(st.salesPersonId);
    result[st.salesPersonId].settled += st.amount;
  }

  for (const key of Object.keys(result)) {
    const p = result[key];
    p.netPayable = p.commissions - p.deductions;
    p.remaining = p.netPayable - p.settled;
  }
  return result;
}

export function FinancialReportTab() {
  const {
    salesPersons, teams, currentPeriod, getMonthlyData,
    addCollection, removeCollection, addSettlement, removeSettlement,
    addSalesPerson, getSavedPeriods,
  } = useCommissionStore();

  const data = getMonthlyData(currentPeriod);
  const [subTab, setSubTab] = useState<SubTab>('report');

  // ====== Filter state ======
  const [filterPersonId, setFilterPersonId] = useState<string>('__all__');
  const [filterFromMonth, setFilterFromMonth] = useState<string>('__all__');
  const [filterFromYear, setFilterFromYear] = useState<string>('__all__');
  const [filterToMonth, setFilterToMonth] = useState<string>('__all__');
  const [filterToYear, setFilterToYear] = useState<string>('__all__');
  const [showFilters, setShowFilters] = useState(false);

  // Collection form
  const [collPersonId, setCollPersonId] = useState('');
  const [collAmount, setCollAmount] = useState('');
  const [collDate, setCollDate] = useState('');
  const [collDesc, setCollDesc] = useState('');

  // Settlement form
  const [settlePersonId, setSettlePersonId] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleDate, setSettleDate] = useState('');
  const [settleDesc, setSettleDesc] = useState('');

  const getPersonName = (id: string) => salesPersons.find(sp => sp.id === id)?.name || 'نامشخص';

  // ====== Available years from data ======
  const savedPeriods = getSavedPeriods();
  const allYears = useMemo(() => {
    const yearSet = new Set<number>();
    savedPeriods.forEach(p => { yearSet.add(p.year); });
    yearSet.add(currentPeriod.year);
    return Array.from(yearSet).sort((a, b) => a - b);
  }, [savedPeriods, currentPeriod]);

  // ====== Filter logic ======
  const hasActiveFilter = filterPersonId !== '__all__' ||
    filterFromMonth !== '__all__' || filterFromYear !== '__all__' ||
    filterToMonth !== '__all__' || filterToYear !== '__all__';

  const resetFilters = () => {
    setFilterPersonId('__all__');
    setFilterFromMonth('__all__');
    setFilterFromYear('__all__');
    setFilterToMonth('__all__');
    setFilterToYear('__all__');
  };

  // Filtered periods based on month/year range
  const filteredPeriods = useMemo(() => {
    if (filterFromMonth === '__all__' && filterFromYear === '__all__' &&
        filterToMonth === '__all__' && filterToYear === '__all__') {
      // No date filter — use current period only
      return [currentPeriod];
    }

    // Determine from/to
    const fromY = filterFromYear !== '__all__' ? parseInt(filterFromYear) : 1400;
    const fromM = filterFromMonth !== '__all__' ? parseInt(filterFromMonth) : 1;
    const toY = filterToYear !== '__all__' ? parseInt(filterToYear) : 1410;
    const toM = filterToMonth !== '__all__' ? parseInt(filterToMonth) : 12;

    return savedPeriods.filter(p => {
      if (p.year < fromY || p.year > toY) return false;
      if (p.year === fromY && p.month < fromM) return false;
      if (p.year === toY && p.month > toM) return false;
      return true;
    });
  }, [currentPeriod, savedPeriods, filterFromMonth, filterFromYear, filterToMonth, filterToYear]);

  // If no date filter, only use currentPeriod; otherwise aggregate across filteredPeriods
  const isMultiPeriod = filterFromMonth !== '__all__' || filterFromYear !== '__all__' ||
    filterToMonth !== '__all__' || filterToYear !== '__all__';

  // Person filter
  const filteredPersonIds = filterPersonId !== '__all__' ? [filterPersonId] : undefined;

  // ====== Aggregate financial data across filtered periods ======
  const aggregatedFinancials = useMemo(() => {
    const combined: Record<string, {
      sales: number; collections: number; commissions: number;
      deductions: number; netPayable: number; settled: number; remaining: number;
    }> = {};

    for (const period of filteredPeriods) {
      const pData = getMonthlyData(period);
      const periodResult = computePeriodFinancials(pData, teams, filteredPersonIds);

      for (const [id, vals] of Object.entries(periodResult)) {
        if (!combined[id]) {
          combined[id] = { sales: 0, collections: 0, commissions: 0, deductions: 0, netPayable: 0, settled: 0, remaining: 0 };
        }
        combined[id].sales += vals.sales;
        combined[id].collections += vals.collections;
        combined[id].commissions += vals.commissions;
        combined[id].deductions += vals.deductions;
        combined[id].settled += vals.settled;
      }
    }

    for (const key of Object.keys(combined)) {
      const p = combined[key];
      p.netPayable = p.commissions - p.deductions;
      p.remaining = p.netPayable - p.settled;
    }
    return combined;
  }, [filteredPeriods, teams, filteredPersonIds, getMonthlyData]);

  // ====== Current period financials (for collections/settlements tabs) ======
  const currentPeriodFinancials = useMemo(() => {
    return computePeriodFinancials(data, teams);
  }, [data, teams]);

  // ====== Totals from aggregated data ======
  const totalSales = Object.values(aggregatedFinancials).reduce((s, p) => s + p.sales, 0);
  const totalCollections = Object.values(aggregatedFinancials).reduce((s, p) => s + p.collections, 0);
  const totalCommissions = Object.values(aggregatedFinancials).reduce((s, p) => s + p.commissions, 0);
  const totalDeductions = Object.values(aggregatedFinancials).reduce((s, p) => s + p.deductions, 0);
  const totalSettlements = Object.values(aggregatedFinancials).reduce((s, p) => s + p.settled, 0);
  const netPayable = totalCommissions - totalDeductions;
  const remainingDebt = netPayable - totalSettlements;

  // Current period totals for collections/settlements sub-tabs
  const curTotalSales = data.percentageCommissions.reduce((s, pc) => s + pc.salesAmount, 0)
    + data.tieredCommissions.reduce((s, tc) => s + tc.salesAmount, 0);
  const curTotalCollections = data.collections.reduce((s, c) => s + c.amount, 0);
  const curTotalSettlements = data.settlements.reduce((s, st) => s + st.amount, 0);
  const curTotalComm = data.percentageCommissions.reduce((s, pc) => s + pc.commissionAmount, 0)
    + data.tieredCommissions.reduce((s, tc) => s + tc.commissionAmount, 0)
    + data.finderFees.reduce((s, ff) => s + ff.amount, 0)
    + data.salesShares.reduce((s, ss) => s + ss.shareAmount, 0)
    + data.teamCommissions.reduce((s, tc) => s + tc.totalLeaderCommission, 0)
    + data.bonusPenalties.filter(bp => bp.type === 'bonus').reduce((s, bp) => s + bp.amount, 0);
  const curTotalDed = data.testCosts.reduce((s, tc) => s + tc.amount, 0)
    + data.repairCosts.reduce((s, rc) => s + rc.amount, 0)
    + data.bonusPenalties.filter(bp => bp.type === 'penalty').reduce((s, bp) => s + bp.amount, 0);
  const curNetPayable = curTotalComm - curTotalDed;
  const curRemaining = curNetPayable - curTotalSettlements;

  // Breakdown for current period report (if no multi-period filter)
  const totalPercentageComm = isMultiPeriod ? 0 : data.percentageCommissions.reduce((s, pc) => s + pc.commissionAmount, 0);
  const totalTieredComm = isMultiPeriod ? 0 : data.tieredCommissions.reduce((s, tc) => s + tc.commissionAmount, 0);
  const totalFinderFee = isMultiPeriod ? 0 : data.finderFees.reduce((s, ff) => s + ff.amount, 0);
  const totalSalesShare = isMultiPeriod ? 0 : data.salesShares.reduce((s, ss) => s + ss.shareAmount, 0);
  const totalTeamComm = isMultiPeriod ? 0 : data.teamCommissions.reduce((s, tc) => s + tc.totalLeaderCommission, 0);
  const totalBonus = isMultiPeriod ? 0 : data.bonusPenalties.filter(bp => bp.type === 'bonus').reduce((s, bp) => s + bp.amount, 0);
  const totalPenalty = isMultiPeriod ? 0 : data.bonusPenalties.filter(bp => bp.type === 'penalty').reduce((s, bp) => s + bp.amount, 0);
  const totalTestCost = isMultiPeriod ? 0 : data.testCosts.reduce((s, tc) => s + tc.amount, 0);
  const totalRepairCost = isMultiPeriod ? 0 : data.repairCosts.reduce((s, rc) => s + rc.amount, 0);

  // ====== Multi-month data for comparison table ======
  const [showMultiMonth, setShowMultiMonth] = useState(false);

  const multiMonthData = savedPeriods.map(period => {
    const pData = getMonthlyData(period);
    const pf = computePeriodFinancials(pData, teams, filteredPersonIds);
    const pSales = Object.values(pf).reduce((s, p) => s + p.sales, 0);
    const pColl = Object.values(pf).reduce((s, p) => s + p.collections, 0);
    const pComm = Object.values(pf).reduce((s, p) => s + p.commissions, 0);
    const pDed = Object.values(pf).reduce((s, p) => s + p.deductions, 0);
    const pSett = Object.values(pf).reduce((s, p) => s + p.settled, 0);
    const pNet = pComm - pDed;
    return { period, label: formatShamsiDate(period.year, period.month), sales: pSales, collections: pColl, commissions: pComm, deductions: pDed, netPayable: pNet, settled: pSett, remaining: pNet - pSett };
  });

  // ====== Handlers ======
  const handleAddCollection = () => {
    if (!collPersonId || !collAmount) return;
    addCollection(currentPeriod, {
      salesPersonId: collPersonId,
      amount: parseFloat(collAmount),
      date: collDate || toPersianDigits(getCurrentShamsiDate().year + '/' + getCurrentShamsiDate().month + '/' + getCurrentShamsiDate().day),
      description: collDesc || 'وصولی',
    });
    setCollPersonId(''); setCollAmount(''); setCollDate(''); setCollDesc('');
  };

  const handleAddSettlement = () => {
    if (!settlePersonId || !settleAmount) return;
    addSettlement(currentPeriod, {
      salesPersonId: settlePersonId,
      amount: parseFloat(settleAmount),
      date: settleDate || toPersianDigits(getCurrentShamsiDate().year + '/' + getCurrentShamsiDate().month + '/' + getCurrentShamsiDate().day),
      description: settleDesc || 'تسویه حساب',
    });
    setSettlePersonId(''); setSettleAmount(''); setSettleDate(''); setSettleDesc('');
  };

  const handleCollectionExcelImport = (rows: Record<string, string | number>[]) => {
    for (const row of rows) {
      const name = String(row.name || '').trim();
      const code = String(row.code || '').trim() || name;
      const amount = Number(row.amount) || 0;
      if (!name || amount <= 0) continue;
      let person = salesPersons.find(sp => sp.name.trim() === name);
      if (!person) person = salesPersons.find(sp => sp.code.trim() === code);
      let personId = person?.id;
      if (!personId) {
        addSalesPerson(name, code);
        const state = useCommissionStore.getState();
        personId = state.salesPersons.find(sp => sp.name.trim() === name)?.id;
      }
      if (personId) {
        addCollection(currentPeriod, { salesPersonId: personId, amount, date: String(row.date || ''), description: String(row.description || 'وصولی از اکسل') });
      }
    }
  };

  const handleSettlementExcelImport = (rows: Record<string, string | number>[]) => {
    for (const row of rows) {
      const name = String(row.name || '').trim();
      const code = String(row.code || '').trim() || name;
      const amount = Number(row.amount) || 0;
      if (!name || amount <= 0) continue;
      let person = salesPersons.find(sp => sp.name.trim() === name);
      if (!person) person = salesPersons.find(sp => sp.code.trim() === code);
      let personId = person?.id;
      if (!personId) {
        addSalesPerson(name, code);
        const state = useCommissionStore.getState();
        personId = state.salesPersons.find(sp => sp.name.trim() === name)?.id;
      }
      if (personId) {
        addSettlement(currentPeriod, { salesPersonId: personId, amount, date: String(row.date || ''), description: String(row.description || 'تسویه از اکسل') });
      }
    }
  };

  const subTabs: { id: SubTab; label: string; icon: typeof FileBarChart }[] = [
    { id: 'report', label: 'گزارش مالی', icon: FileBarChart },
    { id: 'collections', label: 'وصولیات', icon: HandCoins },
    { id: 'settlements', label: 'تسویه‌حساب', icon: Banknote },
  ];

  // ====== Filter bar JSX (inline, not a component to avoid re-mount issues) ======

  return (
    <div className="space-y-6">
      {/* Sub-tab navigation */}
      <div className="flex gap-2 border-b border-gray-200 pb-3">
        {subTabs.map(st => (
          <button
            key={st.id}
            onClick={() => setSubTab(st.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold transition-all duration-200 border-b-2 -mb-[13px]',
              subTab === st.id
                ? 'bg-emerald-50 text-emerald-700 border-emerald-500 shadow-sm'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
            )}
          >
            <st.icon className="h-4 w-4" />
            {st.label}
          </button>
        ))}
      </div>

      {/* ============ REPORT TAB ============ */}
      {subTab === 'report' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <Card className="rounded-2xl shadow-sm border-t-4 border-t-indigo-400 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-50/80 to-transparent pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <div className="p-1.5 rounded-lg bg-indigo-100/80"><Filter className="h-4 w-4 text-indigo-600" /></div>
                  فیلتر گزارش
                </div>
                <div className="flex items-center gap-2">
                  {hasActiveFilter && (
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 text-xs text-indigo-600 hover:text-indigo-800">
                      <RotateCcw className="h-3.5 w-3.5" />
                      حذف فیلتر
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1 text-xs">
                    {showFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {showFilters ? 'بستن' : 'باز کردن'}
                  </Button>
                </div>
              </CardTitle>
              {/* Active filter badges */}
              {hasActiveFilter && !showFilters && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {filterPersonId !== '__all__' && (
                    <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 gap-1 text-xs">
                      فروشنده: {getPersonName(filterPersonId)}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterPersonId('__all__')} />
                    </Badge>
                  )}
                  {(filterFromMonth !== '__all__' || filterFromYear !== '__all__') && (
                    <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 gap-1 text-xs">
                      از: {filterFromYear !== '__all__' ? toPersianDigits(filterFromYear) : '...'}{filterFromMonth !== '__all__' ? '/' + PERSIAN_MONTHS[parseInt(filterFromMonth) - 1] : ''}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => { setFilterFromMonth('__all__'); setFilterFromYear('__all__'); }} />
                    </Badge>
                  )}
                  {(filterToMonth !== '__all__' || filterToYear !== '__all__') && (
                    <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 gap-1 text-xs">
                      تا: {filterToYear !== '__all__' ? toPersianDigits(filterToYear) : '...'}{filterToMonth !== '__all__' ? '/' + PERSIAN_MONTHS[parseInt(filterToMonth) - 1] : ''}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => { setFilterToMonth('__all__'); setFilterToYear('__all__'); }} />
                    </Badge>
                  )}
                </div>
              )}
            </CardHeader>
            {showFilters && (
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                  {/* Person filter */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-700">فروشنده</label>
                    <Select value={filterPersonId} onValueChange={setFilterPersonId}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="همه فروشندگان" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">همه فروشندگان</SelectItem>
                        {salesPersons.map(sp => (
                          <SelectItem key={sp.id} value={sp.id}>{sp.name} ({sp.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* From month/year */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-700">از ماه</label>
                    <div className="flex gap-1.5">
                      <Select value={filterFromMonth} onValueChange={setFilterFromMonth}>
                        <SelectTrigger className="h-9 text-xs flex-1">
                          <SelectValue placeholder="ماه" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">— همه —</SelectItem>
                          {PERSIAN_MONTHS.map((m, idx) => (
                            <SelectItem key={idx} value={(idx + 1).toString()}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={filterFromYear} onValueChange={setFilterFromYear}>
                        <SelectTrigger className="h-9 text-xs w-20">
                          <SelectValue placeholder="سال" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">—</SelectItem>
                          {allYears.map(y => (
                            <SelectItem key={y} value={y.toString()}>{toPersianDigits(y)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* To month/year */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-700">تا ماه</label>
                    <div className="flex gap-1.5">
                      <Select value={filterToMonth} onValueChange={setFilterToMonth}>
                        <SelectTrigger className="h-9 text-xs flex-1">
                          <SelectValue placeholder="ماه" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">— همه —</SelectItem>
                          {PERSIAN_MONTHS.map((m, idx) => (
                            <SelectItem key={idx} value={(idx + 1).toString()}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={filterToYear} onValueChange={setFilterToYear}>
                        <SelectTrigger className="h-9 text-xs w-20">
                          <SelectValue placeholder="سال" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">—</SelectItem>
                          {allYears.map(y => (
                            <SelectItem key={y} value={y.toString()}>{toPersianDigits(y)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Period count indicator */}
                  <div className="flex flex-col items-center justify-center bg-indigo-50/50 rounded-xl p-3 border border-indigo-100">
                    <p className="text-[10px] text-indigo-600 font-semibold">دوره‌های انتخاب‌شده</p>
                    <p className="text-lg font-black text-indigo-700">{toPersianDigits(filteredPeriods.length)}</p>
                  </div>

                  {/* Reset button */}
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    disabled={!hasActiveFilter}
                    className="gap-1.5 rounded-xl border-dashed border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    حذف فیلتر
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Period Summary Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-emerald-600 via-emerald-500 to-teal-500 p-6 text-white shadow-lg shadow-emerald-500/20">
            <div className="absolute -left-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-xl" />
            <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/5 blur-lg" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm mb-1">
                  {isMultiPeriod ? 'گزارش مالی تجمیعی' : 'گزارش مالی ماهانه'}
                </p>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <FileBarChart className="h-6 w-6 text-emerald-200" />
                  {isMultiPeriod
                    ? `${toPersianDigits(filteredPeriods.length)} دوره`
                    : formatShamsiDate(currentPeriod.year, currentPeriod.month)
                  }
                </h2>
              </div>
              <Scale className="h-8 w-8 text-emerald-200/50" />
            </div>
          </div>

          {/* Main financial KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 card-hover-lift shadow-md shadow-emerald-500/5 rounded-2xl overflow-hidden">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-emerald-100/80"><TrendingUp className="h-4 w-4 text-emerald-600" /></div>
                  <p className="text-xs font-semibold text-emerald-700">مجموع فروش</p>
                </div>
                <p className="text-lg font-black tracking-tight text-emerald-700" dir="ltr">{formatCurrency(totalSales)}</p>
              </CardContent>
            </Card>

            <Card className="border-teal-200 bg-gradient-to-br from-teal-50 via-white to-teal-50/30 card-hover-lift shadow-md shadow-teal-500/5 rounded-2xl overflow-hidden">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-teal-100/80"><HandCoins className="h-4 w-4 text-teal-600" /></div>
                  <p className="text-xs font-semibold text-teal-700">وصول‌شده</p>
                </div>
                <p className="text-lg font-black tracking-tight text-teal-700" dir="ltr">{formatCurrency(totalCollections)}</p>
                {totalSales > 0 && (
                  <div className="mt-2 h-1.5 rounded-full bg-teal-100 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-l from-teal-500 to-cyan-400" style={{ width: `${Math.min((totalCollections / totalSales) * 100, 100)}%` }} />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/30 card-hover-lift shadow-md shadow-amber-500/5 rounded-2xl overflow-hidden">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-amber-100/80"><Banknote className="h-4 w-4 text-amber-600" /></div>
                  <p className="text-xs font-semibold text-amber-700">تسویه‌شده</p>
                </div>
                <p className="text-lg font-black tracking-tight text-amber-700" dir="ltr">{formatCurrency(totalSettlements)}</p>
                {netPayable > 0 && (
                  <div className="mt-2 h-1.5 rounded-full bg-amber-100 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-l from-amber-500 to-yellow-400" style={{ width: `${Math.min((totalSettlements / netPayable) * 100, 100)}%` }} />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={cn(
              'card-hover-lift shadow-md rounded-2xl overflow-hidden',
              remainingDebt > 0
                ? 'border-rose-200 bg-gradient-to-br from-rose-50 via-white to-rose-50/30 shadow-rose-500/5'
                : 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 shadow-emerald-500/5'
            )}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn('p-2 rounded-lg', remainingDebt > 0 ? 'bg-rose-100/80' : 'bg-emerald-100/80')}>
                    {remainingDebt > 0
                      ? <AlertTriangle className="h-4 w-4 text-rose-600" />
                      : <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    }
                  </div>
                  <p className={cn('text-xs font-semibold', remainingDebt > 0 ? 'text-rose-700' : 'text-emerald-700')}>
                    {remainingDebt > 0 ? 'بدهی شرکت' : 'تسویه‌شده'}
                  </p>
                </div>
                <p className={cn('text-lg font-black tracking-tight', remainingDebt > 0 ? 'text-rose-700' : 'text-emerald-700')} dir="ltr">
                  {formatCurrency(Math.abs(remainingDebt))}
                </p>
                {remainingDebt > 0 && (
                  <p className="text-[10px] text-rose-500 mt-1">مانده بدهکار شرکت به فروشندگان</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Commission / Deduction breakdown (only when single period) */}
          {!isMultiPeriod && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white rounded-2xl shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                    <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
                    تفکیک درآمد فروشندگان
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {[
                    { label: 'پورسانت درصدی', value: totalPercentageComm },
                    { label: 'پورسانت پلکانی', value: totalTieredComm },
                    { label: 'حق‌النصب', value: totalFinderFee },
                    { label: 'سهم از فروش', value: totalSalesShare },
                    { label: 'پورسانت تیمی', value: totalTeamComm },
                    { label: 'پاداش', value: totalBonus },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-mono font-semibold text-emerald-700" dir="ltr">{formatNumber(item.value)}</span>
                    </div>
                  ))}
                  <div className="border-t border-emerald-200 pt-2 flex items-center justify-between text-sm font-bold">
                    <span className="text-emerald-800">مجموع درآمد</span>
                    <span className="font-mono text-emerald-700" dir="ltr">{formatNumber(totalCommissions)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-rose-200 bg-gradient-to-br from-rose-50/50 to-white rounded-2xl shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold text-rose-800">
                    <ArrowDownCircle className="h-4 w-4 text-rose-600" />
                    تفکیک کسورات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {[
                    { label: 'هزینه تست', value: totalTestCost },
                    { label: 'تعمیرات', value: totalRepairCost },
                    { label: 'جریمه', value: totalPenalty },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-mono font-semibold text-rose-600" dir="ltr">{formatNumber(item.value)}</span>
                    </div>
                  ))}
                  <div className="border-t border-rose-200 pt-2 flex items-center justify-between text-sm font-bold">
                    <span className="text-rose-800">مجموع کسورات</span>
                    <span className="font-mono text-rose-600" dir="ltr">{formatNumber(totalDeductions)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex items-center justify-between text-sm font-bold">
                    <span className="text-amber-800">خالص قابل پرداخت</span>
                    <span className="font-mono text-amber-700" dir="ltr">{formatNumber(netPayable)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Per-person financial table */}
          {Object.values(aggregatedFinancials).some(p => p.sales || p.collections || p.commissions || p.settled) && (
            <Card className="rounded-2xl shadow-sm border overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50/50 pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-1.5 rounded-lg bg-emerald-100/80"><Wallet className="h-5 w-5 text-emerald-600" /></div>
                  گزارش مالی به تفکیک فروشنده
                  {isMultiPeriod && (
                    <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 text-xs mr-2">
                      {toPersianDigits(filteredPeriods.length)} دوره
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const headers = ['فروشنده', 'فروش', 'وصول', 'درآمد', 'کسورات', 'خالص', 'تسویه', 'مانده'];
                      const rows = Object.entries(aggregatedFinancials)
                        .filter(([, p]) => p.sales || p.collections || p.commissions || p.settled)
                        .map(([id, p]) => [getPersonName(id), p.sales, p.collections, p.commissions, p.deductions, p.netPayable, p.settled, p.remaining]);
                      const totalsRow = ['مجموع', totalSales, totalCollections, totalCommissions, totalDeductions, netPayable, totalSettlements, remainingDebt];
                      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows, totalsRow]);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'گزارش مالی');
                      const periodLabel = `${currentPeriod.year}-${currentPeriod.month.toString().padStart(2, '0')}`;
                      XLSX.writeFile(wb, `گزارش-مالی-${periodLabel}.xlsx`);
                    }}
                    className="gap-1.5 mr-auto border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl"
                  >
                    <FileDown className="h-4 w-4" />
                    خروجی اکسل
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="table-zebra">
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-emerald-50/80 to-teal-50/40">
                        <TableHead className="text-right font-semibold text-emerald-800 text-xs">فروشنده</TableHead>
                        <TableHead className="text-right font-semibold text-emerald-800 text-xs">فروش</TableHead>
                        <TableHead className="text-right font-semibold text-teal-800 text-xs">وصول</TableHead>
                        <TableHead className="text-right font-semibold text-emerald-800 text-xs">درآمد</TableHead>
                        <TableHead className="text-right font-semibold text-rose-800 text-xs">کسورات</TableHead>
                        <TableHead className="text-right font-semibold text-amber-800 text-xs">خالص</TableHead>
                        <TableHead className="text-right font-semibold text-amber-800 text-xs">تسویه</TableHead>
                        <TableHead className="text-right font-semibold text-rose-800 text-xs">مانده</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(aggregatedFinancials).map(([id, p]) => {
                        if (!p.sales && !p.collections && !p.commissions && !p.settled) return null;
                        const name = getPersonName(id);
                        return (
                          <TableRow key={id} className="transition-all duration-150">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                                  {name.charAt(0)}
                                </div>
                                <span className="font-medium text-sm">{name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-left font-mono tabular-nums text-xs" dir="ltr">{p.sales ? formatNumber(p.sales) : '−'}</TableCell>
                            <TableCell className="text-left font-mono tabular-nums text-xs text-teal-700" dir="ltr">{p.collections ? formatNumber(p.collections) : '−'}</TableCell>
                            <TableCell className="text-left font-mono tabular-nums text-xs text-emerald-700" dir="ltr">{p.commissions ? formatNumber(p.commissions) : '−'}</TableCell>
                            <TableCell className="text-left font-mono tabular-nums text-xs text-rose-600" dir="ltr">{p.deductions ? formatNumber(p.deductions) : '−'}</TableCell>
                            <TableCell className="text-left font-mono tabular-nums text-xs text-amber-700" dir="ltr">{p.netPayable ? formatNumber(p.netPayable) : '−'}</TableCell>
                            <TableCell className="text-left font-mono tabular-nums text-xs text-amber-700" dir="ltr">{p.settled ? formatNumber(p.settled) : '−'}</TableCell>
                            <TableCell>
                              <Badge
                                variant={p.remaining > 0 ? 'destructive' : 'default'}
                                className={cn('font-bold font-mono tabular-nums text-xs',
                                  p.remaining <= 0 && 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
                                  p.remaining > 0 && 'bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-100'
                                )}
                              >
                                {p.remaining !== 0 ? formatNumber(Math.abs(p.remaining)) : '−'}
                                {p.remaining > 0 && ' بدهکار'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Totals row */}
                      <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100/50 font-bold border-t-2 border-gray-200">
                        <TableCell className="text-sm font-bold">جمع کل</TableCell>
                        <TableCell className="text-left font-mono tabular-nums text-xs" dir="ltr">{formatNumber(totalSales)}</TableCell>
                        <TableCell className="text-left font-mono tabular-nums text-xs text-teal-700" dir="ltr">{formatNumber(totalCollections)}</TableCell>
                        <TableCell className="text-left font-mono tabular-nums text-xs text-emerald-700" dir="ltr">{formatNumber(totalCommissions)}</TableCell>
                        <TableCell className="text-left font-mono tabular-nums text-xs text-rose-600" dir="ltr">{formatNumber(totalDeductions)}</TableCell>
                        <TableCell className="text-left font-mono tabular-nums text-xs text-amber-700" dir="ltr">{formatNumber(netPayable)}</TableCell>
                        <TableCell className="text-left font-mono tabular-nums text-xs text-amber-700" dir="ltr">{formatNumber(totalSettlements)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={remainingDebt > 0 ? 'destructive' : 'default'}
                            className={cn('font-bold font-mono tabular-nums text-xs',
                              remainingDebt <= 0 && 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
                              remainingDebt > 0 && 'bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-100'
                            )}
                          >
                            {remainingDebt !== 0 ? formatNumber(Math.abs(remainingDebt)) : '−'}
                            {remainingDebt > 0 && ' بدهکار'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Multi-month comparison */}
          {savedPeriods.length > 0 && (
            <Card className="rounded-2xl shadow-sm border overflow-hidden">
              <CardHeader
                className="bg-gradient-to-r from-sky-50 to-blue-50/50 pb-3 cursor-pointer"
                onClick={() => setShowMultiMonth(!showMultiMonth)}
              >
                <CardTitle className="flex items-center justify-between text-sm font-bold">
                  <div className="flex items-center gap-2">
                    <FileBarChart className="h-4 w-4 text-sky-600" />
                    مقایسه مالی ماه‌ها
                  </div>
                  {showMultiMonth ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
              {showMultiMonth && (
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-sky-50/50">
                          <TableHead className="text-right font-semibold text-sky-800 text-xs">دوره</TableHead>
                          <TableHead className="text-right font-semibold text-sky-800 text-xs">فروش</TableHead>
                          <TableHead className="text-right font-semibold text-sky-800 text-xs">وصول</TableHead>
                          <TableHead className="text-right font-semibold text-sky-800 text-xs">خالص</TableHead>
                          <TableHead className="text-right font-semibold text-sky-800 text-xs">تسویه</TableHead>
                          <TableHead className="text-right font-semibold text-sky-800 text-xs">مانده</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {multiMonthData.map(m => (
                          <TableRow key={m.label}>
                            <TableCell className="text-sm font-medium">{m.label}</TableCell>
                            <TableCell className="text-left font-mono tabular-nums text-xs" dir="ltr">{formatNumber(m.sales)}</TableCell>
                            <TableCell className="text-left font-mono tabular-nums text-xs text-teal-700" dir="ltr">{formatNumber(m.collections)}</TableCell>
                            <TableCell className="text-left font-mono tabular-nums text-xs text-amber-700" dir="ltr">{formatNumber(m.netPayable)}</TableCell>
                            <TableCell className="text-left font-mono tabular-nums text-xs" dir="ltr">{formatNumber(m.settled)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={m.remaining > 0 ? 'destructive' : 'default'}
                                className={cn('font-mono tabular-nums text-xs',
                                  m.remaining <= 0 && 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
                                  m.remaining > 0 && 'bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-100'
                                )}
                              >
                                {m.remaining !== 0 ? formatNumber(Math.abs(m.remaining)) : '−'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Empty state */}
          {Object.values(aggregatedFinancials).every(p => !p.sales && !p.collections && !p.commissions && !p.settled) && (
            <Card className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/30">
              <CardContent className="py-16">
                <div className="text-center text-muted-foreground">
                  <FileBarChart className="h-16 w-16 mx-auto mb-4 text-emerald-200" />
                  <p className="text-lg font-semibold text-emerald-800 mb-1">هنوز داده مالی ثبت نشده است</p>
                  <p className="text-sm">ابتدا اطلاعات فروش، وصول و تسویه را وارد کنید تا گزارش مالی نمایش داده شود</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ============ COLLECTIONS TAB ============ */}
      {subTab === 'collections' && (
        <div className="space-y-6">
          <Card className="rounded-2xl shadow-md border-t-4 border-t-teal-500 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-teal-50/80 to-transparent pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg">
                  <div className="p-1.5 rounded-lg bg-teal-100/80"><HandCoins className="h-5 w-5 text-teal-600" /></div>
                  ثبت وصول — {formatShamsiDate(currentPeriod.year, currentPeriod.month)}
                </div>
                <ExcelImport
                  title="وصولیات"
                  columns={COLLECTION_IMPORT_COLUMNS}
                  onImport={handleCollectionExcelImport}
                  theme="teal"
                />
              </CardTitle>
              <p className="text-sm text-muted-foreground">مبالغ وصول‌شده از مشتریان را برای هر فروشنده ثبت کنید</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">فروشنده</label>
                  <Select value={collPersonId} onValueChange={setCollPersonId}>
                    <SelectTrigger><SelectValue placeholder="انتخاب فروشنده" /></SelectTrigger>
                    <SelectContent>{salesPersons.map(sp => (<SelectItem key={sp.id} value={sp.id}>{sp.name} ({sp.code})</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">مبلغ وصول (ریال)</label>
                  <Input type="number" value={collAmount} onChange={e => setCollAmount(e.target.value)} placeholder="مبلغ" dir="ltr" className="text-left font-mono tabular-nums focus-visible:ring-teal-500/30 focus-visible:border-teal-500" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">تاریخ</label>
                  <Input value={collDate} onChange={e => setCollDate(e.target.value)} placeholder="مثلاً ۱۴۰۴/۰۳/۱۵" className="focus-visible:ring-teal-500/30 focus-visible:border-teal-500" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">شرح</label>
                  <Input value={collDesc} onChange={e => setCollDesc(e.target.value)} placeholder="توضیحات" className="focus-visible:ring-teal-500/30 focus-visible:border-teal-500" />
                </div>
                <Button onClick={handleAddCollection} disabled={!collPersonId || !collAmount}
                  className="bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 shadow-md shadow-teal-500/20 rounded-xl gap-1.5 transition-all duration-200 active:scale-[0.98]">
                  <Plus className="h-4 w-4" />ثبت وصول
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary cards */}
          {data.collections.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-white rounded-2xl card-hover-lift shadow-sm">
                <CardContent className="pt-6">
                  <p className="text-sm text-teal-600 font-semibold mb-1">مجموع وصولیات</p>
                  <p className="text-xl font-extrabold tracking-tight text-teal-700" dir="ltr">{formatCurrency(curTotalCollections)}</p>
                </CardContent>
              </Card>
              <Card className="border-sky-200 bg-gradient-to-br from-sky-50 to-white rounded-2xl card-hover-lift shadow-sm">
                <CardContent className="pt-6">
                  <p className="text-sm text-sky-600 font-semibold mb-1">نسبت وصول به فروش</p>
                  <p className="text-xl font-extrabold tracking-tight text-sky-700">
                    {curTotalSales > 0 ? formatPercent(Math.round((curTotalCollections / curTotalSales) * 100)) : '−'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Collections table */}
          {data.collections.length > 0 && (
            <Card className="rounded-2xl shadow-sm border overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="table-zebra">
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-teal-50/80 to-teal-50/30">
                        <TableHead className="text-right font-semibold text-teal-800 text-xs">ردیف</TableHead>
                        <TableHead className="text-right font-semibold text-teal-800 text-xs">فروشنده</TableHead>
                        <TableHead className="text-right font-semibold text-teal-800 text-xs">مبلغ وصول</TableHead>
                        <TableHead className="text-right font-semibold text-teal-800 text-xs">تاریخ</TableHead>
                        <TableHead className="text-right font-semibold text-teal-800 text-xs">شرح</TableHead>
                        <TableHead className="text-right font-semibold text-teal-800 text-xs">عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.collections.map((c, idx) => (
                        <TableRow key={c.id} className="transition-all duration-150">
                          <TableCell className="text-muted-foreground text-xs">{toPersianDigits(idx + 1)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                                {getPersonName(c.salesPersonId).charAt(0)}
                              </div>
                              <span className="font-medium">{getPersonName(c.salesPersonId)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-teal-700 text-left font-mono tabular-nums" dir="ltr">{formatNumber(c.amount)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{c.date || '−'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{c.description || '−'}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600 active:scale-90 transition-all" onClick={() => { if (confirm('آیا از حذف اطمینان دارید؟')) removeCollection(currentPeriod, c.id); }}>
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

          {data.collections.length === 0 && (
            <Card className="rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/30">
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <HandCoins className="h-12 w-12 mx-auto mb-3 text-teal-200" />
                  <p className="text-sm font-semibold text-teal-800 mb-1">هنوز وصولی ثبت نشده</p>
                  <p className="text-xs">از فرم بالا یا دکمه ایمپورت اکسل، وصولیات را ثبت کنید</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ============ SETTLEMENTS TAB ============ */}
      {subTab === 'settlements' && (
        <div className="space-y-6">
          <Card className="rounded-2xl shadow-md border-t-4 border-t-amber-500 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-amber-50/80 to-transparent pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg">
                  <div className="p-1.5 rounded-lg bg-amber-100/80"><Banknote className="h-5 w-5 text-amber-600" /></div>
                  ثبت تسویه‌حساب — {formatShamsiDate(currentPeriod.year, currentPeriod.month)}
                </div>
                <ExcelImport
                  title="تسویه‌حساب"
                  columns={SETTLEMENT_IMPORT_COLUMNS}
                  onImport={handleSettlementExcelImport}
                  theme="amber"
                />
              </CardTitle>
              <p className="text-sm text-muted-foreground">مبالغ تسویه‌شده با فروشندگان را ثبت کنید</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">فروشنده</label>
                  <Select value={settlePersonId} onValueChange={setSettlePersonId}>
                    <SelectTrigger><SelectValue placeholder="انتخاب فروشنده" /></SelectTrigger>
                    <SelectContent>{salesPersons.map(sp => (<SelectItem key={sp.id} value={sp.id}>{sp.name} ({sp.code})</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">مبلغ تسویه (ریال)</label>
                  <Input type="number" value={settleAmount} onChange={e => setSettleAmount(e.target.value)} placeholder="مبلغ" dir="ltr" className="text-left font-mono tabular-nums focus-visible:ring-amber-500/30 focus-visible:border-amber-500" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">تاریخ</label>
                  <Input value={settleDate} onChange={e => setSettleDate(e.target.value)} placeholder="مثلاً ۱۴۰۴/۰۳/۱۵" className="focus-visible:ring-amber-500/30 focus-visible:border-amber-500" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">شرح</label>
                  <Input value={settleDesc} onChange={e => setSettleDesc(e.target.value)} placeholder="توضیحات" className="focus-visible:ring-amber-500/30 focus-visible:border-amber-500" />
                </div>
                <Button onClick={handleAddSettlement} disabled={!settlePersonId || !settleAmount}
                  className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 shadow-md shadow-amber-500/20 rounded-xl gap-1.5 transition-all duration-200 active:scale-[0.98]">
                  <Plus className="h-4 w-4" />ثبت تسویه
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary cards */}
          {data.settlements.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white rounded-2xl card-hover-lift shadow-sm">
                <CardContent className="pt-6">
                  <p className="text-sm text-amber-600 font-semibold mb-1">مجموع تسویات</p>
                  <p className="text-xl font-extrabold tracking-tight text-amber-700" dir="ltr">{formatCurrency(curTotalSettlements)}</p>
                </CardContent>
              </Card>
              <Card className={cn(
                'card-hover-lift shadow-sm rounded-2xl',
                curRemaining > 0
                  ? 'border-rose-200 bg-gradient-to-br from-rose-50 to-white'
                  : 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white'
              )}>
                <CardContent className="pt-6">
                  <p className={cn('text-sm font-semibold mb-1', curRemaining > 0 ? 'text-rose-600' : 'text-emerald-600')}>
                    {curRemaining > 0 ? 'مانده بدهی شرکت' : 'تمام‌تسویه'}
                  </p>
                  <p className={cn('text-xl font-extrabold tracking-tight', curRemaining > 0 ? 'text-rose-700' : 'text-emerald-700')} dir="ltr">
                    {formatCurrency(Math.abs(curRemaining))}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Settlements table */}
          {data.settlements.length > 0 && (
            <Card className="rounded-2xl shadow-sm border overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="table-zebra">
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-amber-50/80 to-amber-50/30">
                        <TableHead className="text-right font-semibold text-amber-800 text-xs">ردیف</TableHead>
                        <TableHead className="text-right font-semibold text-amber-800 text-xs">فروشنده</TableHead>
                        <TableHead className="text-right font-semibold text-amber-800 text-xs">مبلغ تسویه</TableHead>
                        <TableHead className="text-right font-semibold text-amber-800 text-xs">تاریخ</TableHead>
                        <TableHead className="text-right font-semibold text-amber-800 text-xs">شرح</TableHead>
                        <TableHead className="text-right font-semibold text-amber-800 text-xs">عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.settlements.map((st, idx) => (
                        <TableRow key={st.id} className="transition-all duration-150">
                          <TableCell className="text-muted-foreground text-xs">{toPersianDigits(idx + 1)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                                {getPersonName(st.salesPersonId).charAt(0)}
                              </div>
                              <span className="font-medium">{getPersonName(st.salesPersonId)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-amber-700 text-left font-mono tabular-nums" dir="ltr">{formatNumber(st.amount)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{st.date || '−'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{st.description || '−'}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600 active:scale-90 transition-all" onClick={() => { if (confirm('آیا از حذف اطمینان دارید؟')) removeSettlement(currentPeriod, st.id); }}>
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

          {data.settlements.length === 0 && (
            <Card className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/30">
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Banknote className="h-12 w-12 mx-auto mb-3 text-amber-200" />
                  <p className="text-sm font-semibold text-amber-800 mb-1">هنوز تسویه‌ای ثبت نشده</p>
                  <p className="text-xs">از فرم بالا یا دکمه ایمپورت اکسل، تسویات را ثبت کنید</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
