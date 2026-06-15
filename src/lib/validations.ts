import { z } from 'zod';

// ====== Common ======
export const periodFilterSchema = z.object({
  periodYear: z.coerce.number().int().optional(),
  periodMonth: z.coerce.number().int().min(1).max(12).optional(),
  salesPersonId: z.string().optional(),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});

// ====== SalesPerson ======
export const salesPersonCreateSchema = z.object({
  name: z.string().min(1, 'نام الزامی است'),
  code: z.string().min(1, 'کد الزامی است'),
  bankName: z.string().optional(),
  cardNumber: z.string().optional(),
  shebaNumber: z.string().optional(),
  defaultPercentage: z.number().min(0).default(0),
});

export const salesPersonUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'نام الزامی است').optional(),
  code: z.string().min(1, 'کد الزامی است').optional(),
  bankName: z.string().nullable().optional(),
  cardNumber: z.string().nullable().optional(),
  shebaNumber: z.string().nullable().optional(),
  defaultPercentage: z.number().min(0).optional(),
  active: z.boolean().optional(),
});

// ====== PercentageCommission ======
export const percentageCommissionCreateSchema = z.object({
  salesPersonId: z.string().min(1, 'شناسه فروشنده الزامی است'),
  periodYear: z.number().int().min(1300, 'سال نامعتبر است'),
  periodMonth: z.number().int().min(1).max(12, 'ماه نامعتبر است'),
  salesAmount: z.number().min(0, 'مبلغ فروش نمی‌تواند منفی باشد'),
  percentage: z.number().min(0).max(100, 'درصد باید بین ۰ تا ۱۰۰ باشد'),
});

export const percentageCommissionUpdateSchema = z.object({
  id: z.string().min(1),
  salesPersonId: z.string().min(1).optional(),
  periodYear: z.number().int().min(1300).optional(),
  periodMonth: z.number().int().min(1).max(12).optional(),
  salesAmount: z.number().min(0).optional(),
  percentage: z.number().min(0).max(100).optional(),
});

// ====== Tier (sub-schema) ======
export const tierSchema = z.object({
  id: z.string().optional(),
  fromAmount: z.number().min(0),
  toAmount: z.number().min(0),
  percentage: z.number().min(0).max(100),
});

// ====== TieredCommission ======
export const tieredCommissionCreateSchema = z.object({
  salesPersonId: z.string().min(1, 'شناسه فروشنده الزامی است'),
  periodYear: z.number().int().min(1300, 'سال نامعتبر است'),
  periodMonth: z.number().int().min(1).max(12, 'ماه نامعتبر است'),
  salesAmount: z.number().min(0, 'مبلغ فروش نمی‌تواند منفی باشد'),
  mode: z.enum(['proportional', 'stepped']).default('proportional'),
  tiers: z.array(tierSchema).min(1, 'حداقل یک پله الزامی است'),
});

export const tieredCommissionUpdateSchema = z.object({
  id: z.string().min(1),
  salesPersonId: z.string().min(1).optional(),
  periodYear: z.number().int().min(1300).optional(),
  periodMonth: z.number().int().min(1).max(12).optional(),
  salesAmount: z.number().min(0).optional(),
  mode: z.enum(['proportional', 'stepped']).optional(),
  tiers: z.array(tierSchema).min(1).optional(),
});

// ====== FinderFee ======
export const finderFeeCreateSchema = z.object({
  salesPersonId: z.string().min(1, 'شناسه فروشنده الزامی است'),
  periodYear: z.number().int().min(1300, 'سال نامعتبر است'),
  periodMonth: z.number().int().min(1).max(12, 'ماه نامعتبر است'),
  description: z.string().min(1, 'توضیحات الزامی است'),
  amount: z.number().min(0, 'مبلغ نمی‌تواند منفی باشد'),
});

export const finderFeeUpdateSchema = z.object({
  id: z.string().min(1),
  salesPersonId: z.string().min(1).optional(),
  periodYear: z.number().int().min(1300).optional(),
  periodMonth: z.number().int().min(1).max(12).optional(),
  description: z.string().min(1).optional(),
  amount: z.number().min(0).optional(),
});

// ====== TestCost ======
export const testCostCreateSchema = z.object({
  salesPersonId: z.string().min(1, 'شناسه فروشنده الزامی است'),
  periodYear: z.number().int().min(1300, 'سال نامعتبر است'),
  periodMonth: z.number().int().min(1).max(12, 'ماه نامعتبر است'),
  description: z.string().min(1, 'توضیحات الزامی است'),
  amount: z.number().min(0, 'مبلغ نمی‌تواند منفی باشد'),
});

export const testCostUpdateSchema = z.object({
  id: z.string().min(1),
  salesPersonId: z.string().min(1).optional(),
  periodYear: z.number().int().min(1300).optional(),
  periodMonth: z.number().int().min(1).max(12).optional(),
  description: z.string().min(1).optional(),
  amount: z.number().min(0).optional(),
});

// ====== RepairCost ======
export const repairCostCreateSchema = z.object({
  salesPersonId: z.string().min(1, 'شناسه فروشنده الزامی است'),
  periodYear: z.number().int().min(1300, 'سال نامعتبر است'),
  periodMonth: z.number().int().min(1).max(12, 'ماه نامعتبر است'),
  description: z.string().min(1, 'توضیحات الزامی است'),
  amount: z.number().min(0, 'مبلغ نمی‌تواند منفی باشد'),
});

export const repairCostUpdateSchema = z.object({
  id: z.string().min(1),
  salesPersonId: z.string().min(1).optional(),
  periodYear: z.number().int().min(1300).optional(),
  periodMonth: z.number().int().min(1).max(12).optional(),
  description: z.string().min(1).optional(),
  amount: z.number().min(0).optional(),
});

// ====== SalesShare ======
export const salesShareCreateSchema = z.object({
  salesPersonId: z.string().min(1, 'شناسه فروشنده الزامی است'),
  periodYear: z.number().int().min(1300, 'سال نامعتبر است'),
  periodMonth: z.number().int().min(1).max(12, 'ماه نامعتبر است'),
  totalSales: z.number().min(0, 'مبلغ کل فروش نمی‌تواند منفی باشد'),
  sharePercentage: z.number().min(0).max(100, 'درصد باید بین ۰ تا ۱۰۰ باشد'),
});

export const salesShareUpdateSchema = z.object({
  id: z.string().min(1),
  salesPersonId: z.string().min(1).optional(),
  periodYear: z.number().int().min(1300).optional(),
  periodMonth: z.number().int().min(1).max(12).optional(),
  totalSales: z.number().min(0).optional(),
  sharePercentage: z.number().min(0).max(100).optional(),
});

// ====== Team ======
export const teamCreateSchema = z.object({
  name: z.string().min(1, 'نام تیم الزامی است'),
  leaderId: z.string().min(1, 'شناسه سرگروه الزامی است'),
  personalPercent: z.number().min(0).default(0),
  teamPercent: z.number().min(0).default(0),
  memberIds: z.array(z.string()).default([]),
});

export const teamUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  leaderId: z.string().min(1).optional(),
  personalPercent: z.number().min(0).optional(),
  teamPercent: z.number().min(0).optional(),
  memberIds: z.array(z.string()).optional(),
});

// ====== TeamCommission ======
export const teamCommissionCreateSchema = z.object({
  teamId: z.string().min(1, 'شناسه تیم الزامی است'),
  periodYear: z.number().int().min(1300, 'سال نامعتبر است'),
  periodMonth: z.number().int().min(1).max(12, 'ماه نامعتبر است'),
  leaderPersonalSales: z.number().min(0).default(0),
  leaderPersonalCommission: z.number().min(0).default(0),
  totalTeamSales: z.number().min(0).default(0),
  teamCommissionAmount: z.number().min(0).default(0),
  totalLeaderCommission: z.number().min(0).default(0),
});

export const teamCommissionUpdateSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1).optional(),
  periodYear: z.number().int().min(1300).optional(),
  periodMonth: z.number().int().min(1).max(12).optional(),
  leaderPersonalSales: z.number().min(0).optional(),
  leaderPersonalCommission: z.number().min(0).optional(),
  totalTeamSales: z.number().min(0).optional(),
  teamCommissionAmount: z.number().min(0).optional(),
  totalLeaderCommission: z.number().min(0).optional(),
});

// ====== BonusPenalty ======
export const bonusPenaltyCreateSchema = z.object({
  salesPersonId: z.string().min(1, 'شناسه فروشنده الزامی است'),
  periodYear: z.number().int().min(1300, 'سال نامعتبر است'),
  periodMonth: z.number().int().min(1).max(12, 'ماه نامعتبر است'),
  type: z.enum(['bonus', 'penalty'], { message: 'نوع باید پاداش یا جریمه باشد' }),
  amount: z.number().min(0, 'مبلغ نمی‌تواند منفی باشد'),
  reason: z.string().min(1, 'دلیل الزامی است'),
});

export const bonusPenaltyUpdateSchema = z.object({
  id: z.string().min(1),
  salesPersonId: z.string().min(1).optional(),
  periodYear: z.number().int().min(1300).optional(),
  periodMonth: z.number().int().min(1).max(12).optional(),
  type: z.enum(['bonus', 'penalty']).optional(),
  amount: z.number().min(0).optional(),
  reason: z.string().min(1).optional(),
});

// ====== SalesTarget ======
export const salesTargetCreateSchema = z.object({
  salesPersonId: z.string().min(1, 'شناسه فروشنده الزامی است'),
  periodYear: z.number().int().min(1300, 'سال نامعتبر است'),
  periodMonth: z.number().int().min(1).max(12, 'ماه نامعتبر است'),
  targetAmount: z.number().min(0, 'مبلغ هدف نمی‌تواند منفی باشد'),
  achievedAmount: z.number().min(0).default(0),
  targetPercent: z.number().min(0).default(0),
  bonusPercent: z.number().min(0).default(0),
});

export const salesTargetUpdateSchema = z.object({
  id: z.string().min(1),
  salesPersonId: z.string().min(1).optional(),
  periodYear: z.number().int().min(1300).optional(),
  periodMonth: z.number().int().min(1).max(12).optional(),
  targetAmount: z.number().min(0).optional(),
  achievedAmount: z.number().min(0).optional(),
  targetPercent: z.number().min(0).optional(),
  bonusPercent: z.number().min(0).optional(),
});

// ====== Collection ======
export const collectionCreateSchema = z.object({
  salesPersonId: z.string().min(1, 'شناسه فروشنده الزامی است'),
  periodYear: z.number().int().min(1300, 'سال نامعتبر است'),
  periodMonth: z.number().int().min(1).max(12, 'ماه نامعتبر است'),
  amount: z.number().min(0, 'مبلغ نمی‌تواند منفی باشد'),
  date: z.string().min(1, 'تاریخ الزامی است'),
  description: z.string().min(1, 'توضیحات الزامی است'),
});

export const collectionUpdateSchema = z.object({
  id: z.string().min(1),
  salesPersonId: z.string().min(1).optional(),
  periodYear: z.number().int().min(1300).optional(),
  periodMonth: z.number().int().min(1).max(12).optional(),
  amount: z.number().min(0).optional(),
  date: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
});

// ====== Settlement ======
export const settlementCreateSchema = z.object({
  salesPersonId: z.string().min(1, 'شناسه فروشنده الزامی است'),
  periodYear: z.number().int().min(1300, 'سال نامعتبر است'),
  periodMonth: z.number().int().min(1).max(12, 'ماه نامعتبر است'),
  amount: z.number().min(0, 'مبلغ نمی‌تواند منفی باشد'),
  date: z.string().min(1, 'تاریخ الزامی است'),
  description: z.string().min(1, 'توضیحات الزامی است'),
});

export const settlementUpdateSchema = z.object({
  id: z.string().min(1),
  salesPersonId: z.string().min(1).optional(),
  periodYear: z.number().int().min(1300).optional(),
  periodMonth: z.number().int().min(1).max(12).optional(),
  amount: z.number().min(0).optional(),
  date: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
});

// ====== Dashboard ======
export const dashboardQuerySchema = z.object({
  year: z.coerce.number().int().min(1300),
  month: z.coerce.number().int().min(1).max(12),
});

// ====== Financial Report ======
export const financialReportQuerySchema = z.object({
  fromYear: z.coerce.number().int().min(1300).optional(),
  fromMonth: z.coerce.number().int().min(1).max(12).optional(),
  toYear: z.coerce.number().int().min(1300).optional(),
  toMonth: z.coerce.number().int().min(1).max(12).optional(),
  salesPersonId: z.string().optional(),
});

// ====== Sync ======
export const tierSyncSchema = z.object({
  id: z.string(),
  fromAmount: z.number(),
  toAmount: z.number(),
  percentage: z.number(),
});

export const monthlyDataSyncSchema = z.object({
  period: z.object({ year: z.number(), month: z.number() }),
  percentageCommissions: z.array(z.object({
    id: z.string(),
    salesPersonId: z.string(),
    salesAmount: z.number(),
    percentage: z.number(),
    commissionAmount: z.number(),
  })).optional(),
  tieredCommissions: z.array(z.object({
    id: z.string(),
    salesPersonId: z.string(),
    salesAmount: z.number(),
    commissionAmount: z.number(),
    mode: z.enum(['proportional', 'stepped']),
    tiers: z.array(tierSyncSchema),
  })).optional(),
  finderFees: z.array(z.object({
    id: z.string(),
    salesPersonId: z.string(),
    description: z.string(),
    amount: z.number(),
  })).optional(),
  testCosts: z.array(z.object({
    id: z.string(),
    salesPersonId: z.string(),
    description: z.string(),
    amount: z.number(),
  })).optional(),
  repairCosts: z.array(z.object({
    id: z.string(),
    salesPersonId: z.string(),
    description: z.string(),
    amount: z.number(),
  })).optional(),
  salesShares: z.array(z.object({
    id: z.string(),
    salesPersonId: z.string(),
    totalSales: z.number(),
    sharePercentage: z.number(),
    shareAmount: z.number(),
  })).optional(),
  teamCommissions: z.array(z.object({
    id: z.string(),
    teamId: z.string(),
    leaderPersonalSales: z.number(),
    leaderPersonalCommission: z.number(),
    totalTeamSales: z.number(),
    teamCommissionAmount: z.number(),
    totalLeaderCommission: z.number(),
  })).optional(),
  bonusPenalties: z.array(z.object({
    id: z.string(),
    salesPersonId: z.string(),
    type: z.enum(['bonus', 'penalty']),
    amount: z.number(),
    reason: z.string(),
  })).optional(),
  salesTargets: z.array(z.object({
    id: z.string(),
    salesPersonId: z.string(),
    targetAmount: z.number(),
    achievedAmount: z.number(),
    targetPercent: z.number(),
    bonusPercent: z.number().optional(),
  })).optional(),
  collections: z.array(z.object({
    id: z.string(),
    salesPersonId: z.string(),
    amount: z.number(),
    date: z.string(),
    description: z.string(),
  })).optional(),
  settlements: z.array(z.object({
    id: z.string(),
    salesPersonId: z.string(),
    amount: z.number(),
    date: z.string(),
    description: z.string(),
  })).optional(),
});

export const syncSchema = z.object({
  salesPersons: z.array(z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    bankName: z.string().optional(),
    cardNumber: z.string().optional(),
    shebaNumber: z.string().optional(),
    defaultPercentage: z.number().optional(),
  })).optional(),
  teams: z.array(z.object({
    id: z.string(),
    name: z.string(),
    leaderId: z.string(),
    memberIds: z.array(z.string()).optional(),
    personalPercent: z.number().optional(),
    teamPercent: z.number().optional(),
  })).optional(),
  monthlyDataMap: z.record(z.string(), monthlyDataSyncSchema).optional(),
});
