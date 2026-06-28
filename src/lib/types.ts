export interface SalesPerson {
  id: string;
  name: string;
  code: string;
  bankName?: string;
  cardNumber?: string;
  shebaNumber?: string;
  defaultPercentage?: number; // درصد پیش‌فرض پورسانت
}

export interface PercentageCommission {
  id: string;
  salesPersonId: string;
  salesAmount: number;
  percentage: number;
  commissionAmount: number;
}

export interface Tier {
  id?: string;
  fromAmount: number;
  toAmount: number; // 0 means infinity
  percentage: number;
  daysRange?: number | null;
}

export interface TieredCommission {
  id: string;
  salesPersonId: string;
  salesAmount: number;
  commissionAmount: number;
  tiers: Tier[];
  mode: 'proportional' | 'stepped';
  days?: number | null;      
  effectivePercentage?: number | null;
}

export interface FinderFee {
  id: string;
  salesPersonId: string;
  description: string;
  amount: number;
}

export interface TestCost {
  id: string;
  salesPersonId: string;
  description: string;
  amount: number;
}

export interface RepairCost {
  id: string;
  salesPersonId: string;
  description: string;
  amount: number;
}

export interface SalesShare {
  id: string;
  salesPersonId: string;
  totalSales: number;
  sharePercentage: number;
  shareAmount: number;
}

// ====== تیم فروش ======
export interface Team {
  id: string;
  name: string;
  leaderId: string;
  memberIds: string[];
  personalPercent: number;
  teamPercent: number;
}

export interface TeamCommission {
  id: string;
  teamId: string;
  period: CommissionPeriod;
  leaderPersonalSales: number;
  leaderPersonalCommission: number;
  totalTeamSales: number;
  teamCommissionAmount: number;
  totalLeaderCommission: number;
}

// ====== پاداش / جریمه ======
export interface BonusPenalty {
  id: string;
  salesPersonId: string;
  type: 'bonus' | 'penalty';
  amount: number;
  reason: string;
}

// ====== هدف فروش ======
export interface SalesTarget {
  id: string;
  salesPersonId: string;
  targetAmount: number;
  achievedAmount: number;
  targetPercent: number;
  bonusPercent?: number;
}

// ====== وصول ======
export interface Collection {
  id: string;
  salesPersonId: string;
  amount: number;
  date: string;
  description: string;
}

// ====== تسویه ======
export interface Settlement {
  id: string;
  salesPersonId: string;
  amount: number;
  date: string;
  description: string;
}

export interface CommissionPeriod {
  year: number;
  month: number;
}

export interface MonthlyData {
  period: CommissionPeriod;
  percentageCommissions: PercentageCommission[];
  tieredCommissions: TieredCommission[];
  finderFees: FinderFee[];
  testCosts: TestCost[];
  repairCosts: RepairCost[];
  salesShares: SalesShare[];
  teamCommissions: TeamCommission[];
  bonusPenalties: BonusPenalty[];
  salesTargets: SalesTarget[];
  collections: Collection[];
  settlements: Settlement[];
}
