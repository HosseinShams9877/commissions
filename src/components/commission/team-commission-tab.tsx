'use client';

import { useState, useMemo } from 'react';
import { useCommissionStore, getPersonTotalSales } from '@/lib/store';
import { formatCurrency, formatNumber, formatPercent, toPersianDigits, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Trash2, Plus, UserCheck, Crown, Pencil, X } from 'lucide-react';
import { Team } from '@/lib/types';
import { ExcelImport, ImportColumn } from './excel-import';

const TEAM_IMPORT_COLUMNS: ImportColumn[] = [
  { key: 'teamName', label: 'نام تیم', required: true, type: 'string' },
  { key: 'leaderName', label: 'نام سرگروه', required: true, type: 'string' },
  { key: 'leaderCode', label: 'کد سرگروه', required: false, type: 'string' },
  { key: 'memberNames', label: 'نام اعضا (جدا با کاما)', required: false, type: 'string' },
  { key: 'personalPercent', label: 'درصد فروش شخصی', required: true, type: 'number' },
  { key: 'teamPercent', label: 'درصد از کل فروش تیم', required: true, type: 'number' },
];

const TEAM_SALES_IMPORT_COLUMNS: ImportColumn[] = [
  { key: 'teamName', label: 'نام تیم', required: true, type: 'string' },
  { key: 'leaderSales', label: 'فروش شخصی سرگروه', required: true, type: 'number' },
];

export function TeamCommissionTab() {
  const { salesPersons, teams, addTeam, updateTeam, removeTeam, currentPeriod, getMonthlyData, addTeamCommission, removeTeamCommission } = useCommissionStore();
  const data = getMonthlyData(currentPeriod);

  // Team management state
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editTeamId, setEditTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [personalPercent, setPersonalPercent] = useState('3');
  const [teamPercent, setTeamPercent] = useState('1');

  // Commission calc state
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [leaderSales, setLeaderSales] = useState('');

  const resetTeamForm = () => {
    setTeamName(''); setLeaderId(''); setSelectedMembers([]);
    setPersonalPercent('3'); setTeamPercent('1'); setEditTeamId(null);
  };

  const handleSaveTeam = () => {
    if (!teamName.trim() || !leaderId) return;
    const teamData = { name: teamName, leaderId, memberIds: [leaderId, ...selectedMembers.filter(id => id !== leaderId)], personalPercent: parseFloat(personalPercent) || 0, teamPercent: parseFloat(teamPercent) || 0 };
    if (editTeamId) { updateTeam(editTeamId, teamData); }
    else { addTeam(teamData); }
    resetTeamForm(); setTeamDialogOpen(false);
  };

  const handleEditTeam = (team: Team) => {
    setEditTeamId(team.id); setTeamName(team.name); setLeaderId(team.leaderId);
    setSelectedMembers(team.memberIds.filter(id => id !== team.leaderId));
    setPersonalPercent(team.personalPercent.toString()); setTeamPercent(team.teamPercent.toString());
    setTeamDialogOpen(true);
  };

  const toggleMember = (id: string) => {
    if (id === leaderId) return;
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  // Calculate team commission
  const selectedTeam = teams.find(t => t.id === selectedTeamId);
  const leaderSalesNum = parseFloat(leaderSales) || 0;

  const teamCalc = useMemo(() => {
    if (!selectedTeam || leaderSalesNum <= 0) return null;
    const personalCommission = leaderSalesNum * (selectedTeam.personalPercent / 100);

    // Sum sales from all team members in current period
    let totalTeamSales = leaderSalesNum;
    for (const memberId of selectedTeam.memberIds) {
      if (memberId === selectedTeam.leaderId) continue;
      const memberSales = getPersonTotalSales(useCommissionStore.getState(), currentPeriod, memberId);
      totalTeamSales += memberSales;
    }

    const teamCommissionAmount = totalTeamSales * (selectedTeam.teamPercent / 100);
    const totalLeaderCommission = personalCommission + teamCommissionAmount;

    return { personalCommission, totalTeamSales, teamCommissionAmount, totalLeaderCommission };
  }, [selectedTeam, leaderSalesNum, currentPeriod, data]);

  const handleAddCommission = () => {
    if (!selectedTeamId || !teamCalc || leaderSalesNum <= 0) return;
    addTeamCommission(currentPeriod, {
      teamId: selectedTeamId,
      period: currentPeriod,
      leaderPersonalSales: leaderSalesNum,
      leaderPersonalCommission: teamCalc.personalCommission,
      totalTeamSales: teamCalc.totalTeamSales,
      teamCommissionAmount: teamCalc.teamCommissionAmount,
      totalLeaderCommission: teamCalc.totalLeaderCommission,
    });
    setSelectedTeamId(''); setLeaderSales('');
  };

  const getPersonName = (id: string) => salesPersons.find(sp => sp.id === id)?.name || 'نامشخص';

  const totalTeamComm = data.teamCommissions.reduce((s, tc) => s + tc.totalLeaderCommission, 0);

  // Handle Excel import - Team definitions
  const handleTeamImport = (rows: Record<string, string | number>[]) => {
    for (const row of rows) {
      const teamName = String(row.teamName || '').trim();
      const leaderName = String(row.leaderName || '').trim();
      const leaderCode = String(row.leaderCode || '').trim() || leaderName;
      const memberNamesStr = String(row.memberNames || '').trim();
      const personalPercent = Number(row.personalPercent) || 0;
      const teamPercent = Number(row.teamPercent) || 0;
      if (!teamName || !leaderName) continue;

      // Find or create leader
      let leader = salesPersons.find(sp => sp.name.trim() === leaderName);
      if (!leader) leader = salesPersons.find(sp => sp.code.trim() === leaderCode);
      let leaderId = leader?.id;
      if (!leaderId) {
        useCommissionStore.getState().addSalesPerson(leaderName, leaderCode);
        const state = useCommissionStore.getState();
        leaderId = state.salesPersons.find(sp => sp.name.trim() === leaderName)?.id;
      }

      // Find or create members
      const memberIds: string[] = [];
      if (leaderId) memberIds.push(leaderId);
      if (memberNamesStr) {
        const memberNames = memberNamesStr.split(/[,،]/).map(n => n.trim()).filter(Boolean);
        for (const mName of memberNames) {
          let member = salesPersons.find(sp => sp.name.trim() === mName);
          if (!member) {
            const st = useCommissionStore.getState();
            member = st.salesPersons.find(sp => sp.name.trim() === mName);
          }
          let memberId = member?.id;
          if (!memberId) {
            useCommissionStore.getState().addSalesPerson(mName, mName);
            const st = useCommissionStore.getState();
            memberId = st.salesPersons.find(sp => sp.name.trim() === mName)?.id;
          }
          if (memberId && !memberIds.includes(memberId)) memberIds.push(memberId);
        }
      }

      if (leaderId) {
        addTeam({ name: teamName, leaderId, memberIds, personalPercent, teamPercent });
      }
    }
  };

  // Handle Excel import - Team sales (commission records)
  const handleTeamSalesImport = (rows: Record<string, string | number>[]) => {
    for (const row of rows) {
      const teamName = String(row.teamName || '').trim();
      const leaderSales = Number(row.leaderSales) || 0;
      if (!teamName || leaderSales <= 0) continue;

      const team = teams.find(t => t.name.trim() === teamName);
      if (!team) continue;

      const personalCommission = leaderSales * (team.personalPercent / 100);
      let totalTeamSales = leaderSales;
      for (const memberId of team.memberIds) {
        if (memberId === team.leaderId) continue;
        const memberSales = getPersonTotalSales(useCommissionStore.getState(), currentPeriod, memberId);
        totalTeamSales += memberSales;
      }
      const teamCommissionAmount = totalTeamSales * (team.teamPercent / 100);
      const totalLeaderCommission = personalCommission + teamCommissionAmount;

      addTeamCommission(currentPeriod, {
        teamId: team.id,
        period: currentPeriod,
        leaderPersonalSales: leaderSales,
        leaderPersonalCommission: personalCommission,
        totalTeamSales,
        teamCommissionAmount,
        totalLeaderCommission,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Team Management Card */}
      <Card className="rounded-2xl shadow-md border-t-4 border-t-indigo-500 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-50/80 to-transparent flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-1.5 rounded-lg bg-indigo-100/80"><Users className="h-5 w-5 text-indigo-600" /></div>
            مدیریت تیم‌های فروش
          </CardTitle>
          <div className="flex items-center gap-2">
            <ExcelImport
              title="تعریف تیم‌ها"
              columns={TEAM_IMPORT_COLUMNS}
              onImport={handleTeamImport}
              theme="indigo"
            />
            <Dialog open={teamDialogOpen} onOpenChange={(open) => { setTeamDialogOpen(open); if (!open) resetTeamForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 shadow-md shadow-indigo-500/20 rounded-xl active:scale-[0.98]">
                <Plus className="h-4 w-4" />ایجاد تیم
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="sm:max-w-lg rounded-2xl border-t-4 border-t-indigo-500">
              <DialogHeader>
                <DialogTitle className="gradient-text">{editTeamId ? 'ویرایش تیم' : 'ایجاد تیم جدید'}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">نام تیم</label>
                  <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="مثلاً: تیم فروش شمال" className="focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">سرگروه تیم</label>
                  <Select value={leaderId} onValueChange={(val) => { setLeaderId(val); if (!selectedMembers.includes(val)) setSelectedMembers(prev => [...prev, val]); }}>
                    <SelectTrigger><SelectValue placeholder="انتخاب سرگروه" /></SelectTrigger>
                    <SelectContent>{salesPersons.map(sp => (<SelectItem key={sp.id} value={sp.id}>{sp.name} ({sp.code})</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">اعضای تیم (علاوه بر سرگروه)</label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-xl p-3 bg-gray-50">
                    {salesPersons.filter(sp => sp.id !== leaderId).map(sp => (
                      <label key={sp.id} className="flex items-center gap-2 cursor-pointer text-sm hover:bg-indigo-50 rounded-lg p-1.5 transition-colors">
                        <input type="checkbox" checked={selectedMembers.includes(sp.id)} onChange={() => toggleMember(sp.id)} className="accent-indigo-600" />
                        <span>{sp.name}</span>
                      </label>
                    ))}
                    {salesPersons.filter(sp => sp.id !== leaderId).length === 0 && (
                      <p className="text-xs text-muted-foreground col-span-2 text-center">ابتدا فروشنده اضافه کنید</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">درصد فروش شخصی سرگروه</label>
                    <Input type="number" value={personalPercent} onChange={(e) => setPersonalPercent(e.target.value)} dir="ltr" className="text-left font-mono focus-visible:ring-indigo-500/30" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">درصد از کل فروش تیم</label>
                    <Input type="number" value={teamPercent} onChange={(e) => setTeamPercent(e.target.value)} dir="ltr" className="text-left font-mono focus-visible:ring-indigo-500/30" />
                  </div>
                </div>
                <Button onClick={handleSaveTeam} className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 shadow-md shadow-indigo-500/20 rounded-xl active:scale-[0.98]">
                  {editTeamId ? 'ذخیره تغییرات' : 'ایجاد تیم'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 text-indigo-200" />
              <p className="font-semibold text-indigo-800 mb-1">هنوز تیمی ایجاد نشده</p>
              <p className="text-sm">یک تیم با سرگروه و اعضا بسازید</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map(team => {
                const leaderName = getPersonName(team.leaderId);
                return (
                  <div key={team.id} className="border border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white rounded-xl p-4 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-amber-500" />
                        <h4 className="font-bold text-indigo-800">{team.name}</h4>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-indigo-50" onClick={() => handleEditTeam(team)}><Pencil className="h-3.5 w-3.5 text-indigo-500" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-red-50" onClick={() => { if (confirm('آیا از حذف اطمینان دارید؟')) removeTeam(team.id); }}><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-[10px] font-bold flex items-center justify-center">{leaderName.charAt(0)}</div>
                      <span className="font-medium text-indigo-700">سرگروه: {leaderName}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {team.memberIds.map(mid => (
                        <Badge key={mid} variant="secondary" className={cn('text-[10px]', mid === team.leaderId ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700')}>
                          {mid === team.leaderId && <Crown className="h-2.5 w-2.5 ml-0.5" />}
                          {getPersonName(mid)}
                        </Badge>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white rounded-lg p-2 border border-indigo-100">
                        <p className="text-indigo-500">فروش شخصی</p>
                        <p className="font-bold text-indigo-800">{formatPercent(team.personalPercent)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-indigo-100">
                        <p className="text-indigo-500">از فروش تیم</p>
                        <p className="font-bold text-indigo-800">{formatPercent(team.teamPercent)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commission Calculation Card */}
      {teams.length > 0 && (
        <Card className="rounded-2xl shadow-md border-t-4 border-t-blue-500 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50/80 to-transparent pb-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg">
                <div className="p-1.5 rounded-lg bg-blue-100/80"><UserCheck className="h-5 w-5 text-blue-600" /></div>
                محاسبه پورسانت تیمی
              </div>
              <ExcelImport
                title="فروش سرگروه‌ها"
                columns={TEAM_SALES_IMPORT_COLUMNS}
                onImport={handleTeamSalesImport}
                theme="blue"
              />
            </CardTitle>
            <p className="text-sm text-muted-foreground leading-relaxed">
              پورسانت سرگروه = (درصد شخصی × فروش شخصی) + (درصد تیمی × کل فروش تیم)
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">انتخاب تیم</label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger><SelectValue placeholder="انتخاب تیم" /></SelectTrigger>
                  <SelectContent>{teams.map(t => (<SelectItem key={t.id} value={t.id}>{t.name} — سرگروه: {getPersonName(t.leaderId)}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">فروش شخصی سرگروه (ریال)</label>
                <Input type="number" value={leaderSales} onChange={(e) => setLeaderSales(e.target.value)} placeholder="مبلغ فروش سرگروه" dir="ltr" className="text-left font-mono tabular-nums focus-visible:ring-blue-500/30 focus-visible:border-blue-500" />
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddCommission} disabled={!selectedTeamId || !leaderSales}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-md shadow-blue-500/20 rounded-xl gap-1.5 active:scale-[0.98]">
                  <Plus className="h-4 w-4" />محاسبه و ثبت
                </Button>
              </div>
            </div>

            {/* Live Preview */}
            {teamCalc && selectedTeam && leaderSalesNum > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-blue-600" />
                  <span className="font-bold text-blue-800">پیش‌نمایش محاسبه — {selectedTeam.name}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <p className="text-[10px] text-blue-500">فروش شخصی سرگروه</p>
                    <p className="text-sm font-bold text-blue-800" dir="ltr">{formatNumber(leaderSalesNum)} ریال</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <p className="text-[10px] text-blue-500">پورسانت شخصی ({formatPercent(selectedTeam.personalPercent)})</p>
                    <p className="text-sm font-bold text-blue-800" dir="ltr">{formatCurrency(teamCalc.personalCommission)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <p className="text-[10px] text-blue-500">کل فروش تیم</p>
                    <p className="text-sm font-bold text-blue-800" dir="ltr">{formatNumber(teamCalc.totalTeamSales)} ریال</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <p className="text-[10px] text-blue-500">پورسانت تیمی ({formatPercent(selectedTeam.teamPercent)})</p>
                    <p className="text-sm font-bold text-blue-800" dir="ltr">{formatCurrency(teamCalc.teamCommissionAmount)}</p>
                  </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-emerald-700">مجموع پورسانت سرگروه</span>
                  <span className="text-lg font-extrabold text-emerald-800" dir="ltr">{formatCurrency(teamCalc.totalLeaderCommission)}</span>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700 leading-relaxed space-y-1">
                  <p className="font-bold">جزئیات محاسبه:</p>
                  <p>• فروش شخصی {getPersonName(selectedTeam.leaderId)}: {formatNumber(leaderSalesNum)} ریال × {formatPercent(selectedTeam.personalPercent)} = {formatCurrency(teamCalc.personalCommission)}</p>
                  <p>• کل فروش تیم: {formatNumber(teamCalc.totalTeamSales)} ریال × {formatPercent(selectedTeam.teamPercent)} = {formatCurrency(teamCalc.teamCommissionAmount)}</p>
                  <p className="font-bold text-emerald-700">مجموع = {formatCurrency(teamCalc.personalCommission)} + {formatCurrency(teamCalc.teamCommissionAmount)} = {formatCurrency(teamCalc.totalLeaderCommission)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {data.teamCommissions.length > 0 && (
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white rounded-2xl card-hover-lift shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-600 font-semibold mb-1">مجموع پورسانت تیمی</p>
            <p className="text-xl font-extrabold tracking-tight text-blue-700 animate-count-up" dir="ltr">{formatCurrency(totalTeamComm)}</p>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {data.teamCommissions.length > 0 && (
        <Card className="rounded-2xl shadow-sm border overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="table-zebra">
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-blue-50/80 to-indigo-50/30">
                    <TableHead className="text-right font-semibold text-blue-800 text-xs">ردیف</TableHead>
                    <TableHead className="text-right font-semibold text-blue-800 text-xs">تیم</TableHead>
                    <TableHead className="text-right font-semibold text-blue-800 text-xs">سرگروه</TableHead>
                    <TableHead className="text-right font-semibold text-blue-800 text-xs">فروش شخصی</TableHead>
                    <TableHead className="text-right font-semibold text-blue-800 text-xs">کل فروش تیم</TableHead>
                    <TableHead className="text-right font-semibold text-blue-800 text-xs">پورسانت شخصی</TableHead>
                    <TableHead className="text-right font-semibold text-blue-800 text-xs">پورسانت تیمی</TableHead>
                    <TableHead className="text-right font-semibold text-blue-800 text-xs">مجموع</TableHead>
                    <TableHead className="text-right font-semibold text-blue-800 text-xs">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.teamCommissions.map((tc, idx) => {
                    const team = teams.find(t => t.id === tc.teamId);
                    return (
                      <TableRow key={tc.id}>
                        <TableCell className="text-muted-foreground text-xs">{toPersianDigits(idx + 1)}</TableCell>
                        <TableCell className="font-medium">{team?.name || '—'}</TableCell>
                        <TableCell>{getPersonName(team?.leaderId || '')}</TableCell>
                        <TableCell className="text-left font-mono tabular-nums" dir="ltr">{formatNumber(tc.leaderPersonalSales)}</TableCell>
                        <TableCell className="text-left font-mono tabular-nums" dir="ltr">{formatNumber(tc.totalTeamSales)}</TableCell>
                        <TableCell className="text-left font-mono tabular-nums text-blue-600" dir="ltr">{formatNumber(tc.leaderPersonalCommission)}</TableCell>
                        <TableCell className="text-left font-mono tabular-nums text-indigo-600" dir="ltr">{formatNumber(tc.teamCommissionAmount)}</TableCell>
                        <TableCell className="font-bold text-emerald-700 text-left font-mono tabular-nums" dir="ltr">{formatNumber(tc.totalLeaderCommission)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-50 active:scale-90" onClick={() => { if (confirm('آیا از حذف اطمینان دارید؟')) removeTeamCommission(currentPeriod, tc.id); }}><Trash2 className="h-4 w-4 text-red-400" /></Button></TableCell>
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
