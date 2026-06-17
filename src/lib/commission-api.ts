// src/lib/commission-api.ts
import apiClient from './api';

// ============ Types ============
export interface CommissionPeriod {
  year: number;
  month: number;
}

export interface SalesPerson {
  id: string;
  name: string;
  code: string;
  bankName?: string;
  cardNumber?: string;
  shebaNumber?: string;
  defaultPercentage?: number;
}

export interface PercentageCommission {
  id: string;
  salesPersonId: string;
  year: number;
  month: number;
  salesAmount: number;
  percentage: number;
  commissionAmount: number;
  description?: string;
  salesPerson?: SalesPerson;
}

export interface Tier {
  fromAmount: number;
  toAmount: number;
  percentage: number;
}

export interface TieredCommission {
  id: string;
  salesPersonId: string;
  year: number;
  month: number;
  salesAmount: number;
  tiers: Tier[];
  mode: 'proportional' | 'stepped';
  commissionAmount: number;
  description?: string;
  salesPerson?: SalesPerson;
}

export interface FinderFee {
  id: string;
  salesPersonId: string;
  year: number;
  month: number;
  amount: number;
  description?: string;
  salesPerson?: SalesPerson;
}

export interface TestCost {
  id: string;
  salesPersonId: string;
  year: number;
  month: number;
  amount: number;
  description?: string;
  salesPerson?: SalesPerson;
}

export interface RepairCost {
  id: string;
  salesPersonId: string;
  year: number;
  month: number;
  amount: number;
  description?: string;
  salesPerson?: SalesPerson;
}

export interface SalesShare {
  id: string;
  salesPersonId: string;
  year: number;
  month: number;
  totalSales: number;
  sharePercentage: number;
  shareAmount: number;
  description?: string;
  salesPerson?: SalesPerson;
}

export interface Team {
  id: string;
  name: string;
  leaderId: string;
  memberIds: string[];
  description?: string;
}

export interface TeamCommission {
  id: string;
  teamId: string;
  year: number;
  month: number;
  totalSales: number;
  leaderCommission: number;
  memberCommission: number;
  memberIds: string[];
  totalLeaderCommission: number;
  totalMemberCommission: number;
  description?: string;
  team?: Team;
}

export interface BonusPenalty {
  id: string;
  salesPersonId: string;
  year: number;
  month: number;
  type: 'bonus' | 'penalty';
  amount: number;
  description?: string;
  salesPerson?: SalesPerson;
}

export interface SalesTarget {
  id: string;
  salesPersonId: string;
  year: number;
  month: number;
  targetAmount: number;
  achievedAmount: number;
  targetPercent: number;
  description?: string;
  salesPerson?: SalesPerson;
}

export interface Collection {
  id: string;
  salesPersonId: string;
  year: number;
  month: number;
  amount: number;
  description?: string;
  salesPerson?: SalesPerson;
}

export interface Settlement {
  id: string;
  salesPersonId: string;
  year: number;
  month: number;
  amount: number;
  description?: string;
  salesPerson?: SalesPerson;
}

// ============ API Functions ============

// -------- Sales Persons --------
export const salesPersonApi = {
  getAll: () => apiClient.get<{ success: boolean; data: SalesPerson[] }>('/sales-persons'),
  getById: (id: string) => apiClient.get<{ success: boolean; data: SalesPerson }>(`/sales-persons/${id}`),
  create: (data: Omit<SalesPerson, 'id'>) => 
    apiClient.post<{ success: boolean; data: SalesPerson }>('/sales-persons', data),
  update: (id: string, data: Partial<SalesPerson>) => 
    apiClient.put<{ success: boolean; data: SalesPerson }>(`/sales-persons/${id}`, data),
  delete: (id: string) => 
    apiClient.del<{ success: boolean }>(`/sales-persons/${id}`),
};

// -------- Teams --------
export const teamApi = {
  getAll: () => apiClient.get<{ success: boolean; data: Team[] }>('/teams'),
  getById: (id: string) => apiClient.get<{ success: boolean; data: Team }>(`/teams/${id}`),
  create: (data: Omit<Team, 'id'>) => 
    apiClient.post<{ success: boolean; data: Team }>('/teams', data),
  update: (id: string, data: Partial<Team>) => 
    apiClient.put<{ success: boolean; data: Team }>(`/teams/${id}`, data),
  delete: (id: string) => 
    apiClient.del<{ success: boolean }>(`/teams/${id}`),
};

// -------- Percentage Commission --------
export const percentageApi = {
  getByPeriod: (year: number, month: number) => 
    apiClient.get<{ success: boolean; data: PercentageCommission[] }>(
      '/commissions/percentage',
      { year, month }
    ),
  create: (data: Omit<PercentageCommission, 'id' | 'commissionAmount'>) => 
    apiClient.post<{ success: boolean; data: PercentageCommission }>(
      '/commissions/percentage',
      data
    ),
  delete: (id: string) => 
    apiClient.del<{ success: boolean }>(`/commissions/percentage/${id}`),
};

// -------- Tiered Commission --------
export const tieredApi = {
  getByPeriod: (year: number, month: number) => 
    apiClient.get<{ success: boolean; data: TieredCommission[] }>(
      '/commissions/tiered',
      { year, month }
    ),
  create: (data: Omit<TieredCommission, 'id' | 'commissionAmount'>) => 
    apiClient.post<{ success: boolean; data: TieredCommission }>(
      '/commissions/tiered',
      data
    ),
  delete: (id: string) => 
    apiClient.del<{ success: boolean }>(`/commissions/tiered/${id}`),
};

// -------- Finder Fee --------
export const finderFeeApi = {
  getByPeriod: (year: number, month: number) => 
    apiClient.get<{ success: boolean; data: FinderFee[] }>(
      '/finder-fees',
      { year, month }
    ),
  create: (data: Omit<FinderFee, 'id'>) => 
    apiClient.post<{ success: boolean; data: FinderFee }>('/finder-fees', data),
  delete: (id: string) => 
    apiClient.del<{ success: boolean }>(`/finder-fees/${id}`),
};
// -------- Periods (لیست دوره‌های ذخیره شده) --------
export const periodApi = {
  getSavedPeriods: () => 
    apiClient.get<{ success: boolean; data: CommissionPeriod[] }>('/periods'),
};
// -------- Test Cost --------
export const testCostApi = {
  getByPeriod: (year: number, month: number) => 
    apiClient.get<{ success: boolean; data: TestCost[] }>(
      '/test-costs',
      { year, month }
    ),
  create: (data: Omit<TestCost, 'id'>) => 
    apiClient.post<{ success: boolean; data: TestCost }>('/test-costs', data),
  delete: (id: string) => 
    apiClient.del<{ success: boolean }>(`/test-costs/${id}`),
};

// -------- Repair Cost --------
export const repairCostApi = {
  getByPeriod: (year: number, month: number) => 
    apiClient.get<{ success: boolean; data: RepairCost[] }>(
      '/repair-costs',
      { year, month }
    ),
  create: (data: Omit<RepairCost, 'id'>) => 
    apiClient.post<{ success: boolean; data: RepairCost }>('/repair-costs', data),
  delete: (id: string) => 
    apiClient.del<{ success: boolean }>(`/repair-costs/${id}`),
};

// -------- Sales Share --------
export const salesShareApi = {
  getByPeriod: (year: number, month: number) => 
    apiClient.get<{ success: boolean; data: SalesShare[] }>(
      '/sales-shares',
      { year, month }
    ),
  create: (data: Omit<SalesShare, 'id' | 'shareAmount'>) => 
    apiClient.post<{ success: boolean; data: SalesShare }>('/sales-shares', data),
  delete: (id: string) => 
    apiClient.del<{ success: boolean }>(`/sales-shares/${id}`),
};

// -------- Team Commission --------
export const teamCommissionApi = {
  getByPeriod: (year: number, month: number) => 
    apiClient.get<{ success: boolean; data: TeamCommission[] }>(
      '/team-commissions',
      { year, month }
    ),
  create: (data: Omit<TeamCommission, 'id'>) => 
    apiClient.post<{ success: boolean; data: TeamCommission }>('/team-commissions', data),
  delete: (id: string) => 
    apiClient.del<{ success: boolean }>(`/team-commissions/${id}`),
};

// -------- Bonus Penalty --------
export const bonusPenaltyApi = {
  getByPeriod: (year: number, month: number) => 
    apiClient.get<{ success: boolean; data: BonusPenalty[] }>(
      '/bonus-penalties',
      { year, month }
    ),
  create: (data: Omit<BonusPenalty, 'id'>) => 
    apiClient.post<{ success: boolean; data: BonusPenalty }>('/bonus-penalties', data),
  delete: (id: string) => 
    apiClient.del<{ success: boolean }>(`/bonus-penalties/${id}`),
};

// -------- Sales Target --------
export const salesTargetApi = {
  getByPeriod: (year: number, month: number) => 
    apiClient.get<{ success: boolean; data: SalesTarget[] }>(
      '/sales-targets',
      { year, month }
    ),
  create: (data: Omit<SalesTarget, 'id' | 'achievedAmount' | 'targetPercent'>) => 
    apiClient.post<{ success: boolean; data: SalesTarget }>('/sales-targets', data),
  update: (id: string, data: Partial<SalesTarget>) => 
    apiClient.put<{ success: boolean; data: SalesTarget }>(`/sales-targets/${id}`, data),
  delete: (id: string) => 
    apiClient.del<{ success: boolean }>(`/sales-targets/${id}`),
};

// -------- Collection --------
export const collectionApi = {
  getByPeriod: (year: number, month: number) => 
    apiClient.get<{ success: boolean; data: Collection[] }>(
      '/collections',
      { year, month }
    ),
  create: (data: Omit<Collection, 'id'>) => 
    apiClient.post<{ success: boolean; data: Collection }>('/collections', data),
  delete: (id: string) => 
    apiClient.del<{ success: boolean }>(`/collections/${id}`),
};

// -------- Settlement --------
export const settlementApi = {
  getByPeriod: (year: number, month: number) => 
    apiClient.get<{ success: boolean; data: Settlement[] }>(
      '/settlements',
      { year, month }
    ),
  create: (data: Omit<Settlement, 'id'>) => 
    apiClient.post<{ success: boolean; data: Settlement }>('/settlements', data),
  delete: (id: string) => 
    apiClient.del<{ success: boolean }>(`/settlements/${id}`),
};