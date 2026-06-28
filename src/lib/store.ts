'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  SalesPerson,
  PercentageCommission,
  TieredCommission,
  Tier,
  FinderFee,
  TestCost,
  RepairCost,
  SalesShare,
  Team,
  TeamCommission,
  BonusPenalty,
  SalesTarget,
  Collection,
  Settlement,
  MonthlyData,
  CommissionPeriod,
} from './types';
import { getCurrentShamsiDate } from './utils';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

interface CommissionStore {
  salesPersons: SalesPerson[];
  addSalesPerson: (name: string, code: string, bankName?: string, cardNumber?: string, shebaNumber?: string, defaultPercentage?: number) => void;
  removeSalesPerson: (id: string) => void;
  updateSalesPerson: (id: string, data: Partial<Omit<SalesPerson, 'id'>>) => void;

  // Teams
  teams: Team[];
  addTeam: (team: Omit<Team, 'id'>) => void;
  updateTeam: (id: string, data: Partial<Omit<Team, 'id'>>) => void;
  removeTeam: (id: string) => void;

  currentPeriod: CommissionPeriod;
  setCurrentPeriod: (period: CommissionPeriod) => void;

  monthlyDataMap: Record<string, MonthlyData>;
  getMonthlyData: (period: CommissionPeriod) => MonthlyData;
  getSavedPeriods: () => CommissionPeriod[];
  clearMonthData: (period: CommissionPeriod) => void;
  exportAllData: () => string;
  importAllData: (json: string) => boolean;
  exportMonthData: (period: CommissionPeriod) => string;
  importMonthData: (period: CommissionPeriod, json: string) => boolean;

  addPercentageCommission: (period: CommissionPeriod, data: Omit<PercentageCommission, 'id' | 'commissionAmount'>) => void;
  removePercentageCommission: (period: CommissionPeriod, id: string) => void;

  addTieredCommission: (period: CommissionPeriod, data: Omit<TieredCommission, 'id' | 'commissionAmount'>) => void;
  removeTieredCommission: (period: CommissionPeriod, id: string) => void;

  addFinderFee: (period: CommissionPeriod, data: Omit<FinderFee, 'id'>) => void;
  removeFinderFee: (period: CommissionPeriod, id: string) => void;

  addTestCost: (period: CommissionPeriod, data: Omit<TestCost, 'id'>) => void;
  removeTestCost: (period: CommissionPeriod, id: string) => void;

  addRepairCost: (period: CommissionPeriod, data: Omit<RepairCost, 'id'>) => void;
  removeRepairCost: (period: CommissionPeriod, id: string) => void;

  addSalesShare: (period: CommissionPeriod, data: Omit<SalesShare, 'id' | 'shareAmount'>) => void;
  removeSalesShare: (period: CommissionPeriod, id: string) => void;

  // Team Commission
  addTeamCommission: (period: CommissionPeriod, data: Omit<TeamCommission, 'id'>) => void;
  removeTeamCommission: (period: CommissionPeriod, id: string) => void;

  // Bonus / Penalty
  addBonusPenalty: (period: CommissionPeriod, data: Omit<BonusPenalty, 'id'>) => void;
  removeBonusPenalty: (period: CommissionPeriod, id: string) => void;

  // Sales Target
  addSalesTarget: (period: CommissionPeriod, data: Omit<SalesTarget, 'id' | 'achievedAmount' | 'targetPercent'>) => void;
  updateSalesTarget: (period: CommissionPeriod, id: string, data: Partial<SalesTarget>) => void;
  removeSalesTarget: (period: CommissionPeriod, id: string) => void;

  // Collections (وصول)
  addCollection: (period: CommissionPeriod, data: Omit<Collection, 'id'>) => void;
  removeCollection: (period: CommissionPeriod, id: string) => void;

  // Settlements (تسویه)
  addSettlement: (period: CommissionPeriod, data: Omit<Settlement, 'id'>) => void;
  removeSettlement: (period: CommissionPeriod, id: string) => void;

  // Auto-backup
  lastBackupDate: string | null;
  performAutoBackup: () => void;
}

function getPeriodKey(period: CommissionPeriod): string {
  return `${period.year}-${period.month.toString().padStart(2, '0')}`;
}

function getEmptyMonthlyData(period: CommissionPeriod): MonthlyData {
  return {
    period,
    percentageCommissions: [],
    tieredCommissions: [],
    finderFees: [],
    testCosts: [],
    repairCosts: [],
    salesShares: [],
    teamCommissions: [],
    bonusPenalties: [],
    salesTargets: [],
    collections: [],
    settlements: [],
  };
}
// ====== Tiered commission calculation (proportional) ======
function calculateProportionalCommission(salesAmount: number, tiers: Tier[], days?: number): number {
  if (tiers.length === 0 || salesAmount <= 0) return 0;

  const tiersWithDays = tiers.filter(t => t.daysRange !== undefined && t.daysRange !== null && t.daysRange > 0);
  const tiersWithoutDays = tiers.filter(t => t.daysRange === undefined || t.daysRange === null || t.daysRange === 0);

  let selectedTiers: Tier[] = [];

  if (days !== undefined && days !== null && days > 0) {
    const matchedTiers = tiersWithDays.filter(t => days <= t.daysRange);
    
    if (matchedTiers.length > 0) {
      const sortedMatched = [...matchedTiers].sort((a, b) => Number(a.daysRange) - Number(b.daysRange));
     
      selectedTiers = [sortedMatched[0]];
    } else {
      selectedTiers = tiersWithoutDays;
    }
  } else {
    selectedTiers = tiersWithoutDays;
  }

  if (selectedTiers.length === 0) {
    selectedTiers = tiers;
  }

  const boundaries: { amount: number; percentage: number }[] = [];
  for (let i = 0; i < selectedTiers.length; i++) {
    if (i === 0) boundaries.push({ amount: selectedTiers[i].fromAmount, percentage: 0 });
    if (selectedTiers[i].toAmount !== 0) {
      boundaries.push({
        amount: selectedTiers[i].toAmount,
        percentage: selectedTiers[i].percentage,
      });
    }
  }

  if (salesAmount <= (selectedTiers[0]?.fromAmount ?? 0)) return 0;

  const lastTier = selectedTiers[selectedTiers.length - 1];
  if (lastTier.toAmount === 0 && salesAmount >= lastTier.fromAmount) {
    return salesAmount * (lastTier.percentage / 100);
  }

  const lastBoundary = boundaries[boundaries.length - 1];
  if (lastBoundary && salesAmount >= lastBoundary.amount) {
    return salesAmount * (lastBoundary.percentage / 100);
  }

  for (let i = 0; i < boundaries.length - 1; i++) {
    const lower = boundaries[i];
    const upper = boundaries[i + 1];
    if (salesAmount >= lower.amount && salesAmount < upper.amount) {
      const range = upper.amount - lower.amount;
      const progress = (salesAmount - lower.amount) / range;
      const effectivePercentage = lower.percentage + (upper.percentage - lower.percentage) * progress;
      return salesAmount * (effectivePercentage / 100);
    }
  }
  return 0;
}

// ====== Stepped (ceiling) tiered commission ======
function calculateSteppedCommission(salesAmount: number, tiers: Tier[], days?: number): number {
  if (tiers.length === 0 || salesAmount <= 0) return 0;

  const tiersWithDays = tiers.filter(t => t.daysRange !== undefined && t.daysRange !== null && t.daysRange > 0);
  const tiersWithoutDays = tiers.filter(t => t.daysRange === undefined || t.daysRange === null || t.daysRange === 0);

  let selectedTiers: Tier[] = [];


  if (days !== undefined && days !== null && days > 0) {
    const matchedTiers = tiersWithDays.filter(t => days <= t.daysRange);
    
    if (matchedTiers.length > 0) {
      const sortedMatched = [...matchedTiers].sort((a, b) => Number(a.daysRange) - Number(b.daysRange));
   
      selectedTiers = [sortedMatched[0]];
      
    } else {
      selectedTiers = tiersWithoutDays;
    }
  } else {
    selectedTiers = tiersWithoutDays;
  }

  if (selectedTiers.length === 0) {
    selectedTiers = tiers;
  }


  for (let i = selectedTiers.length - 1; i >= 0; i--) {
    if (salesAmount >= selectedTiers[i].fromAmount) {
      return salesAmount * (selectedTiers[i].percentage / 100);
    }
  }
  return 0;
}

export function calculateTieredCommission(salesAmount: number, tiers: Tier[], mode: 'proportional' | 'stepped', days?: number): number {
  return mode === 'stepped' 
    ? calculateSteppedCommission(salesAmount, tiers, days) 
    : calculateProportionalCommission(salesAmount, tiers, days);
}

export function getEffectiveTierPercentage(salesAmount: number, tiers: Tier[], days?: number): number {
  if (tiers.length === 0 || salesAmount <= 0) return 0;

  const tiersWithDays = tiers.filter(t => t.daysRange !== undefined && t.daysRange !== null && t.daysRange > 0);
  const tiersWithoutDays = tiers.filter(t => t.daysRange === undefined || t.daysRange === null || t.daysRange === 0);

  let selectedTiers: Tier[] = [];

  if (days !== undefined && days !== null && days > 0) {
    const matchedTiers = tiersWithDays.filter(t => days <= t.daysRange);
   
    
    if (matchedTiers.length > 0) {
      
      const sortedMatched = [...matchedTiers].sort((a, b) => Number(a.daysRange) - Number(b.daysRange));
     
      selectedTiers = [sortedMatched[0]];
     
    } else {
      selectedTiers = tiersWithoutDays;
    }
  } else {
    selectedTiers = tiersWithoutDays;
  }

  if (selectedTiers.length === 0) {
    selectedTiers = tiers;
  }

  const boundaries: { amount: number; percentage: number }[] = [];
  for (let i = 0; i < selectedTiers.length; i++) {
    if (i === 0) boundaries.push({ amount: selectedTiers[i].fromAmount, percentage: 0 });
    if (selectedTiers[i].toAmount !== 0) {
      boundaries.push({
        amount: selectedTiers[i].toAmount,
        percentage: selectedTiers[i].percentage,
      });
    }
  }

  if (salesAmount <= (selectedTiers[0]?.fromAmount ?? 0)) return 0;

  const lastTier = selectedTiers[selectedTiers.length - 1];
  if (lastTier.toAmount === 0 && salesAmount >= lastTier.fromAmount) return lastTier.percentage;

  const lastBoundary = boundaries[boundaries.length - 1];
  if (lastBoundary && salesAmount >= lastBoundary.amount) return lastBoundary.percentage;

  for (let i = 0; i < boundaries.length - 1; i++) {
    const lower = boundaries[i];
    const upper = boundaries[i + 1];
    if (salesAmount >= lower.amount && salesAmount < upper.amount) {
      const range = upper.amount - lower.amount;
      const progress = (salesAmount - lower.amount) / range;
      return lower.percentage + (upper.percentage - lower.percentage) * progress;
    }
  }
  return 0;
}
export function getSteppedTierPercentage(salesAmount: number, tiers: Tier[], days?: number): number {
  if (tiers.length === 0 || salesAmount <= 0) return 0;

  const tiersWithDays = tiers.filter(t => t.daysRange !== undefined && t.daysRange !== null && t.daysRange > 0);
  const tiersWithoutDays = tiers.filter(t => t.daysRange === undefined || t.daysRange === null || t.daysRange === 0);

  let selectedTiers: Tier[] = [];

  if (days !== undefined && days !== null && days > 0) {
    const matchedTiers = tiersWithDays.filter(t => days <= t.daysRange);
    
    if (matchedTiers.length > 0) {
      const sortedMatched = [...matchedTiers].sort((a, b) => Number(a.daysRange) - Number(b.daysRange));
      selectedTiers = [sortedMatched[0]];
    } else {
      selectedTiers = tiersWithoutDays;
    }
  } else {
    selectedTiers = tiersWithoutDays;
  }

  if (selectedTiers.length === 0) {
    selectedTiers = tiers;
  }
  for (let i = selectedTiers.length - 1; i >= 0; i--) {
    if (salesAmount >= selectedTiers[i].fromAmount) {
      return selectedTiers[i].percentage;
    }
  }
  return 0;
}
// ====== Get total sales for a person in a period ======
export function getPersonTotalSales(state: CommissionStore, period: CommissionPeriod, personId: string): number {
  const data = state.getMonthlyData(period);
  let total = 0;
  total += data.percentageCommissions.filter(pc => pc.salesPersonId === personId).reduce((s, pc) => s + pc.salesAmount, 0);
  total += data.tieredCommissions.filter(tc => tc.salesPersonId === personId).reduce((s, tc) => s + tc.salesAmount, 0);
  return total;
}

// Use a fixed fallback; will be updated on client via setCurrentPeriod
const defaultPeriod: CommissionPeriod = { year: 1405, month: 1 };

function getClientDefaultPeriod(): CommissionPeriod {
  const shamsiNow = getCurrentShamsiDate();
  return { year: shamsiNow.year, month: shamsiNow.month };
}

export const useCommissionStore = create<CommissionStore>()(
  persist(
    (set, get) => ({
      salesPersons: [],
      addSalesPerson: (name, code, bankName, cardNumber, shebaNumber, defaultPercentage) => { const id = generateId(); set((s) => ({ salesPersons: [...s.salesPersons, { id, name, code, bankName, cardNumber, shebaNumber, defaultPercentage }] })); },
      removeSalesPerson: (id) => { set((s) => ({ salesPersons: s.salesPersons.filter((sp) => sp.id !== id) })); },
      updateSalesPerson: (id, data) => { set((s) => ({ salesPersons: s.salesPersons.map((sp) => sp.id === id ? { ...sp, ...data } : sp) })); },

      teams: [],
      addTeam: (team) => { const id = generateId(); set((s) => ({ teams: [...s.teams, { ...team, id }] })); },
      updateTeam: (id, data) => { set((s) => ({ teams: s.teams.map((t) => t.id === id ? { ...t, ...data } : t) })); },
      removeTeam: (id) => { set((s) => ({ teams: s.teams.filter((t) => t.id !== id) })); },

      currentPeriod: defaultPeriod,
      setCurrentPeriod: (period) => { set({ currentPeriod: period }); },

      monthlyDataMap: {},
      getMonthlyData: (period) => {
        const key = getPeriodKey(period);
        const raw = get().monthlyDataMap[key];
        if (!raw) return getEmptyMonthlyData(period);
        // Ensure new fields exist (migration for old data)
        return {
          ...getEmptyMonthlyData(period),
          ...raw,
          teamCommissions: raw.teamCommissions || [],
          bonusPenalties: raw.bonusPenalties || [],
          salesTargets: raw.salesTargets || [],
          collections: raw.collections || [],
          settlements: raw.settlements || [],
        };
      },

      getSavedPeriods: () => {
        const map = get().monthlyDataMap;
        return Object.keys(map).filter((key) => {
          const d = map[key];
          return d.percentageCommissions?.length > 0 || d.tieredCommissions?.length > 0 ||
            d.finderFees?.length > 0 || d.testCosts?.length > 0 || d.repairCosts?.length > 0 ||
            d.salesShares?.length > 0 || d.teamCommissions?.length > 0 ||
            d.bonusPenalties?.length > 0 || d.salesTargets?.length > 0 ||
            d.collections?.length > 0 || d.settlements?.length > 0;
        }).map((key) => { const [y, m] = key.split('-'); return { year: parseInt(y), month: parseInt(m) }; }).sort((a, b) => a.year !== b.year ? b.year - a.year : b.month - a.month);
      },
      clearMonthData: (period) => { const key = getPeriodKey(period); set((s) => { const nm = { ...s.monthlyDataMap }; delete nm[key]; return { monthlyDataMap: nm }; }); },
      exportAllData: () => { const s = get(); return JSON.stringify({ version: 3, exportDate: new Date().toISOString(), salesPersons: s.salesPersons, teams: s.teams, monthlyDataMap: s.monthlyDataMap }, null, 2); },
      importAllData: (json) => {
        try {
          const d = JSON.parse(json);
          if (!d.salesPersons) return false;
          set({
            salesPersons: d.salesPersons,
            teams: d.teams || [],
            monthlyDataMap: d.monthlyDataMap || {},
          });
          return true;
        } catch { return false; }
      },
      exportMonthData: (period) => {
        const key = getPeriodKey(period);
        const d = get().monthlyDataMap[key] || getEmptyMonthlyData(period);
        return JSON.stringify({ version: 3, exportDate: new Date().toISOString(), period, salesPersons: get().salesPersons, teams: get().teams, monthlyData: d }, null, 2);
      },
      importMonthData: (period, json) => {
        try {
          const d = JSON.parse(json);
          if (!d.monthlyData) return false;
          const key = getPeriodKey(period);
          set((s) => ({
            salesPersons: d.salesPersons || s.salesPersons,
            teams: d.teams || s.teams,
            monthlyDataMap: { ...s.monthlyDataMap, [key]: d.monthlyData },
          }));
          return true;
        } catch { return false; }
      },

      // Percentage Commission
      addPercentageCommission: (period, data) => {
        const id = generateId(); const commissionAmount = data.salesAmount * (data.percentage / 100); const key = getPeriodKey(period);
        set((s) => { const md = s.monthlyDataMap[key] || getEmptyMonthlyData(period); return { monthlyDataMap: { ...s.monthlyDataMap, [key]: { ...md, percentageCommissions: [...md.percentageCommissions, { ...data, id, commissionAmount }] } } }; });
      },
      removePercentageCommission: (period, id) => {
        const key = getPeriodKey(period);
        set((s) => { const md = s.monthlyDataMap[key] || getEmptyMonthlyData(period); return { monthlyDataMap: { ...s.monthlyDataMap, [key]: { ...md, percentageCommissions: md.percentageCommissions.filter((pc) => pc.id !== id) } } }; });
      },

      // Tiered Commission
      addTieredCommission: (period, data) => {
        const id = generateId();
        const commissionAmount = calculateTieredCommission(data.salesAmount, data.tiers, data.mode, data.days);
        
        // ✅ محاسبه درصد موثر
        let effectivePercentage = 0;
        if (data.mode === 'stepped') {
          effectivePercentage = getSteppedTierPercentage(data.salesAmount, data.tiers, data.days);
        } else {
          effectivePercentage = getEffectiveTierPercentage(data.salesAmount, data.tiers, data.days);
        }
        
        const key = getPeriodKey(period);
        set((s) => { 
          const md = s.monthlyDataMap[key] || getEmptyMonthlyData(period); 
          return { 
            monthlyDataMap: { 
              ...s.monthlyDataMap, 
              [key]: { 
                ...md, 
                tieredCommissions: [
                  ...md.tieredCommissions, 
                  { 
                    ...data, 
                    id, 
                    commissionAmount, 
                    days: data.days ?? null,
                    effectivePercentage  // ✅ حالا مقدار داره
                  }
                ] 
              } 
            } 
          }; 
        });
      },
      removeTieredCommission: (period, id) => {
        const key = getPeriodKey(period);
        set((s) => { const md = s.monthlyDataMap[key] || getEmptyMonthlyData(period); return { monthlyDataMap: { ...s.monthlyDataMap, [key]: { ...md, tieredCommissions: md.tieredCommissions.filter((tc) => tc.id !== id) } } }; });
      },

      // Finder Fee
      addFinderFee: (period, data) => {
        const id = generateId(); const key = getPeriodKey(period);
        set((s) => { const md = s.monthlyDataMap[key] || getEmptyMonthlyData(period); return { monthlyDataMap: { ...s.monthlyDataMap, [key]: { ...md, finderFees: [...md.finderFees, { ...data, id }] } } }; });
      },
      removeFinderFee: (period, id) => {
        const key = getPeriodKey(period);
        set((s) => { const md = s.monthlyDataMap[key] || getEmptyMonthlyData(period); return { monthlyDataMap: { ...s.monthlyDataMap, [key]: { ...md, finderFees: md.finderFees.filter((ff) => ff.id !== id) } } }; });
      },

      // Test Cost
      addTestCost: (period, data) => {
        const id = generateId(); const key = getPeriodKey(period);
        set((s) => { const md = s.monthlyDataMap[key] || getEmptyMonthlyData(period); return { monthlyDataMap: { ...s.monthlyDataMap, [key]: { ...md, testCosts: [...md.testCosts, { ...data, id }] } } }; });
      },
      removeTestCost: (period, id) => {
        const key = getPeriodKey(period);
        set((s) => { const md = s.monthlyDataMap[key] || getEmptyMonthlyData(period); return { monthlyDataMap: { ...s.monthlyDataMap, [key]: { ...md, testCosts: md.testCosts.filter((tc) => tc.id !== id) } } }; });
      },

      // Repair Cost
      addRepairCost: (period, data) => {
        const id = generateId(); const key = getPeriodKey(period);
        set((s) => { const md = s.monthlyDataMap[key] || getEmptyMonthlyData(period); return { monthlyDataMap: { ...s.monthlyDataMap, [key]: { ...md, repairCosts: [...md.repairCosts, { ...data, id }] } } }; });
      },
      removeRepairCost: (period, id) => {
        const key = getPeriodKey(period);
        set((s) => { const md = s.monthlyDataMap[key] || getEmptyMonthlyData(period); return { monthlyDataMap: { ...s.monthlyDataMap, [key]: { ...md, repairCosts: md.repairCosts.filter((rc) => rc.id !== id) } } }; });
      },

      // Sales Share
      addSalesShare: (period, data) => {
        const id = generateId(); const shareAmount = data.totalSales * (data.sharePercentage / 100); const key = getPeriodKey(period);
        set((s) => { const md = s.monthlyDataMap[key] || getEmptyMonthlyData(period); return { monthlyDataMap: { ...s.monthlyDataMap, [key]: { ...md, salesShares: [...md.salesShares, { ...data, id, shareAmount }] } } }; });
      },
      removeSalesShare: (period, id) => {
        const key = getPeriodKey(period);
        set((s) => { const md = s.monthlyDataMap[key] || getEmptyMonthlyData(period); return { monthlyDataMap: { ...s.monthlyDataMap, [key]: { ...md, salesShares: md.salesShares.filter((ss) => ss.id !== id) } } }; });
      },

      // Team Commission
      addTeamCommission: (period, data) => {
        const id = generateId(); const key = getPeriodKey(period);
        set((s) => { const md = s.monthlyDataMap[key] || getEmptyMonthlyData(period); return { monthlyDataMap: { ...s.monthlyDataMap, [key]: { ...md, teamCommissions: [...md.teamCommissions, { ...data, id }] } } }; });
      },
      removeTeamCommission: (period, id) => {
        const key = getPeriodKey(period);
        set((s) => { const md = s.monthlyDataMap[key] || getEmptyMonthlyData(period); return { monthlyDataMap: { ...s.monthlyDataMap, [key]: { ...md, teamCommissions: md.teamCommissions.filter((tc) => tc.id !== id) } } }; });
      },

      // Bonus / Penalty
      addBonusPenalty: (period, data) => {
        const id = generateId(); const key = getPeriodKey(period);
        set((s) => { const md = s.monthlyDataMap[key] || getEmptyMonthlyData(period); return { monthlyDataMap: { ...s.monthlyDataMap, [key]: { ...md, bonusPenalties: [...md.bonusPenalties, { ...data, id }] } } }; });
      },
      removeBonusPenalty: (period, id) => {
        const key = getPeriodKey(period);
        set((s) => { const md = s.monthlyDataMap[key] || getEmptyMonthlyData(period); return { monthlyDataMap: { ...s.monthlyDataMap, [key]: { ...md, bonusPenalties: md.bonusPenalties.filter((bp) => bp.id !== id) } } }; });
      },

      // Sales Target
      addSalesTarget: (period, data) => {
        const id = generateId(); const key = getPeriodKey(period);
        const achievedAmount = 0; const targetPercent = 0;
        set((s) => { const md = s.monthlyDataMap[key] || getEmptyMonthlyData(period); return { monthlyDataMap: { ...s.monthlyDataMap, [key]: { ...md, salesTargets: [...md.salesTargets, { ...data, id, achievedAmount, targetPercent }] } } }; });
      },
      updateSalesTarget: (period, id, data) => {
        const key = getPeriodKey(period);
        set((s) => { const md = s.monthlyDataMap[key] || getEmptyMonthlyData(period); return { monthlyDataMap: { ...s.monthlyDataMap, [key]: { ...md, salesTargets: md.salesTargets.map((st) => st.id === id ? { ...st, ...data } : st) } } }; });
      },
      removeSalesTarget: (period, id) => {
        const key = getPeriodKey(period);
        set((s) => { const md = s.monthlyDataMap[key] || getEmptyMonthlyData(period); return { monthlyDataMap: { ...s.monthlyDataMap, [key]: { ...md, salesTargets: md.salesTargets.filter((st) => st.id !== id) } } }; });
      },

      // Collections
      addCollection: (period, data) => {
        const id = generateId(); const key = getPeriodKey(period);
        set((s) => { const md = s.monthlyDataMap[key] || getEmptyMonthlyData(period); return { monthlyDataMap: { ...s.monthlyDataMap, [key]: { ...md, collections: [...md.collections, { ...data, id }] } } }; });
      },
      removeCollection: (period, id) => {
        const key = getPeriodKey(period);
        set((s) => { const md = s.monthlyDataMap[key] || getEmptyMonthlyData(period); return { monthlyDataMap: { ...s.monthlyDataMap, [key]: { ...md, collections: md.collections.filter((c) => c.id !== id) } } }; });
      },

      // Settlements
      addSettlement: (period, data) => {
        const id = generateId(); const key = getPeriodKey(period);
        set((s) => { const md = s.monthlyDataMap[key] || getEmptyMonthlyData(period); return { monthlyDataMap: { ...s.monthlyDataMap, [key]: { ...md, settlements: [...md.settlements, { ...data, id }] } } }; });
      },
      removeSettlement: (period, id) => {
        const key = getPeriodKey(period);
        set((s) => { const md = s.monthlyDataMap[key] || getEmptyMonthlyData(period); return { monthlyDataMap: { ...s.monthlyDataMap, [key]: { ...md, settlements: md.settlements.filter((st) => st.id !== id) } } }; });
      },

      // Auto-backup: saves a snapshot to localStorage with timestamp
      lastBackupDate: null,
      performAutoBackup: () => {
        try {
          const s = get();
          const backupKey = 'commission-calculator-auto-backup';
          const backupData = {
            timestamp: new Date().toISOString(),
            salesPersons: s.salesPersons,
            teams: s.teams,
            monthlyDataMap: s.monthlyDataMap,
          };
          localStorage.setItem(backupKey, JSON.stringify(backupData));
          set({ lastBackupDate: backupData.timestamp });
        } catch {
          // Silently fail — localStorage might be full
          console.warn('Auto-backup failed: localStorage might be full');
        }
      },
    }),
    { name: 'commission-calculator-storage' }
  )
);
