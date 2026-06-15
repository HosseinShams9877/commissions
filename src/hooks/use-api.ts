'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import type {
  SalesPerson,
  PercentageCommission,
  TieredCommission,
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
  CommissionPeriod,
} from '@/lib/types';

// ============================================================
// Query Key Factory
// ============================================================
export const queryKeys = {
  salesPersons: {
    all: ['sales-persons'] as const,
    detail: (id: string) => ['sales-persons', id] as const,
  },
  percentageCommissions: {
    period: (year: number, month: number) => ['percentage-commissions', year, month] as const,
  },
  tieredCommissions: {
    period: (year: number, month: number) => ['tiered-commissions', year, month] as const,
  },
  finderFees: {
    period: (year: number, month: number) => ['finder-fees', year, month] as const,
  },
  testCosts: {
    period: (year: number, month: number) => ['test-costs', year, month] as const,
  },
  repairCosts: {
    period: (year: number, month: number) => ['repair-costs', year, month] as const,
  },
  salesShares: {
    period: (year: number, month: number) => ['sales-shares', year, month] as const,
  },
  teamCommissions: {
    period: (year: number, month: number) => ['team-commissions', year, month] as const,
  },
  bonusPenalties: {
    period: (year: number, month: number) => ['bonus-penalties', year, month] as const,
  },
  salesTargets: {
    period: (year: number, month: number) => ['sales-targets', year, month] as const,
  },
  collections: {
    period: (year: number, month: number) => ['collections', year, month] as const,
  },
  settlements: {
    period: (year: number, month: number) => ['settlements', year, month] as const,
  },
  teams: {
    all: ['teams'] as const,
  },
  dashboard: {
    period: (year: number, month: number) => ['dashboard', year, month] as const,
  },
  financialReport: {
    filters: (filters: Record<string, unknown>) => ['financial-report', filters] as const,
  },
} as const;

// ============================================================
// API Response Types
// ============================================================
interface SalesPersonsResponse {
  salesPersons: SalesPerson[];
}

interface SalesPersonResponse {
  salesPerson: SalesPerson;
}

interface PercentageCommissionsResponse {
  percentageCommissions: PercentageCommission[];
}

interface PercentageCommissionResponse {
  percentageCommission: PercentageCommission;
}

interface TieredCommissionsResponse {
  tieredCommissions: TieredCommission[];
}

interface TieredCommissionResponse {
  tieredCommission: TieredCommission;
}

interface FinderFeesResponse {
  finderFees: FinderFee[];
}

interface FinderFeeResponse {
  finderFee: FinderFee;
}

interface TestCostsResponse {
  testCosts: TestCost[];
}

interface TestCostResponse {
  testCost: TestCost;
}

interface RepairCostsResponse {
  repairCosts: RepairCost[];
}

interface RepairCostResponse {
  repairCost: RepairCost;
}

interface SalesSharesResponse {
  salesShares: SalesShare[];
}

interface SalesShareResponse {
  salesShare: SalesShare;
}

interface TeamCommissionsResponse {
  teamCommissions: TeamCommission[];
}

interface TeamCommissionResponse {
  teamCommission: TeamCommission;
}

interface BonusPenaltiesResponse {
  bonusPenalties: BonusPenalty[];
}

interface BonusPenaltyResponse {
  bonusPenalty: BonusPenalty;
}

interface SalesTargetsResponse {
  salesTargets: SalesTarget[];
}

interface SalesTargetResponse {
  salesTarget: SalesTarget;
}

interface CollectionsResponse {
  collections: Collection[];
}

interface CollectionResponse {
  collection: Collection;
}

interface SettlementsResponse {
  settlements: Settlement[];
}

interface SettlementResponse {
  settlement: Settlement;
}

interface TeamsResponse {
  teams: Team[];
}

interface TeamResponse {
  team: Team;
}

interface DashboardResponse {
  totalSales: number;
  totalCommissions: number;
  totalDeductions: number;
  totalBonusPenalties: number;
  netPayable: number;
  salesPersonsCount: number;
  period: CommissionPeriod;
  topPerformers: Array<{
    salesPersonId: string;
    salesPersonName: string;
    totalSales: number;
    totalCommission: number;
  }>;
}

interface FinancialReportResponse {
  period: CommissionPeriod;
  salesPersons: Array<{
    id: string;
    name: string;
    code: string;
    totalSales: number;
    percentageCommission: number;
    tieredCommission: number;
    finderFees: number;
    testCosts: number;
    repairCosts: number;
    salesShare: number;
    bonusPenalties: number;
    collections: number;
    settlements: number;
    netPayable: number;
  }>;
  totals: {
    totalSales: number;
    totalCommissions: number;
    totalDeductions: number;
    totalBonusPenalties: number;
    totalCollections: number;
    totalSettlements: number;
    netPayable: number;
  };
}

interface SuccessResponse {
  success: boolean;
}

interface SyncDataResponse {
  success: boolean;
  results?: {
    salesPersons: number;
    teams: number;
    records: number;
    errors: string[];
  };
}

// ============================================================
// Helper: invalidate all period-based queries for a given year/month
// ============================================================
function invalidatePeriodQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  year: number,
  month: number
) {
  queryClient.invalidateQueries({ queryKey: queryKeys.percentageCommissions.period(year, month) });
  queryClient.invalidateQueries({ queryKey: queryKeys.tieredCommissions.period(year, month) });
  queryClient.invalidateQueries({ queryKey: queryKeys.finderFees.period(year, month) });
  queryClient.invalidateQueries({ queryKey: queryKeys.testCosts.period(year, month) });
  queryClient.invalidateQueries({ queryKey: queryKeys.repairCosts.period(year, month) });
  queryClient.invalidateQueries({ queryKey: queryKeys.salesShares.period(year, month) });
  queryClient.invalidateQueries({ queryKey: queryKeys.teamCommissions.period(year, month) });
  queryClient.invalidateQueries({ queryKey: queryKeys.bonusPenalties.period(year, month) });
  queryClient.invalidateQueries({ queryKey: queryKeys.salesTargets.period(year, month) });
  queryClient.invalidateQueries({ queryKey: queryKeys.collections.period(year, month) });
  queryClient.invalidateQueries({ queryKey: queryKeys.settlements.period(year, month) });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.period(year, month) });
  queryClient.invalidateQueries({ queryKey: queryKeys.financialReport.filters({ year, month }) });
}

// ============================================================
// Sales Person Hooks
// ============================================================

export function useSalesPersons() {
  return useQuery<SalesPersonsResponse>({
    queryKey: queryKeys.salesPersons.all,
    queryFn: () => apiClient.get<SalesPersonsResponse>('/sales-persons'),
  });
}

export function useSalesPerson(id: string) {
  return useQuery<SalesPersonResponse>({
    queryKey: queryKeys.salesPersons.detail(id),
    queryFn: () => apiClient.get<SalesPersonResponse>('/sales-persons', { id }),
    enabled: !!id,
  });
}

export function useCreateSalesPerson() {
  const queryClient = useQueryClient();
  return useMutation<SalesPersonResponse, Error, Omit<SalesPerson, 'id'>>({
    mutationFn: (data) => apiClient.post<SalesPersonResponse>('/sales-persons', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.salesPersons.all });
      toast.success('فروشنده با موفقیت ایجاد شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در ایجاد فروشنده');
    },
  });
}

export function useUpdateSalesPerson() {
  const queryClient = useQueryClient();
  return useMutation<SalesPersonResponse, Error, Partial<SalesPerson> & { id: string }>({
    mutationFn: (data) => apiClient.put<SalesPersonResponse>('/sales-persons', data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.salesPersons.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.salesPersons.detail(variables.id) });
      toast.success('فروشنده با موفقیت بروزرسانی شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در بروزرسانی فروشنده');
    },
  });
}

export function useDeleteSalesPerson() {
  const queryClient = useQueryClient();
  return useMutation<SuccessResponse, Error, string>({
    mutationFn: (id) => apiClient.del<SuccessResponse>('/sales-persons', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.salesPersons.all });
      toast.success('فروشنده با موفقیت حذف شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در حذف فروشنده');
    },
  });
}

// ============================================================
// Percentage Commission Hooks
// ============================================================

export function usePercentageCommissions(year: number, month: number) {
  return useQuery<PercentageCommissionsResponse>({
    queryKey: queryKeys.percentageCommissions.period(year, month),
    queryFn: () => apiClient.get<PercentageCommissionsResponse>('/percentage-commissions', { year, month }),
    enabled: !!year && !!month,
  });
}

export function useCreatePercentageCommission() {
  const queryClient = useQueryClient();
  return useMutation<
    PercentageCommissionResponse,
    Error,
    Omit<PercentageCommission, 'id' | 'commissionAmount'> & { periodYear: number; periodMonth: number }
  >({
    mutationFn: (data) => apiClient.post<PercentageCommissionResponse>('/percentage-commissions', data),
    onSuccess: (_data, variables) => {
      invalidatePeriodQueries(queryClient, variables.periodYear, variables.periodMonth);
      toast.success('پورسانت درصدی با موفقیت ایجاد شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در ایجاد پورسانت درصدی');
    },
  });
}

export function useDeletePercentageCommission() {
  const queryClient = useQueryClient();
  return useMutation<SuccessResponse, Error, { id: string; year: number; month: number }>({
    mutationFn: ({ id }) => apiClient.del<SuccessResponse>('/percentage-commissions', { id }),
    onSuccess: (_data, variables) => {
      invalidatePeriodQueries(queryClient, variables.year, variables.month);
      toast.success('پورسانت درصدی با موفقیت حذف شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در حذف پورسانت درصدی');
    },
  });
}

// ============================================================
// Tiered Commission Hooks
// ============================================================

export function useTieredCommissions(year: number, month: number) {
  return useQuery<TieredCommissionsResponse>({
    queryKey: queryKeys.tieredCommissions.period(year, month),
    queryFn: () => apiClient.get<TieredCommissionsResponse>('/tiered-commissions', { year, month }),
    enabled: !!year && !!month,
  });
}

export function useCreateTieredCommission() {
  const queryClient = useQueryClient();
  return useMutation<
    TieredCommissionResponse,
    Error,
    Omit<TieredCommission, 'id' | 'commissionAmount'> & { periodYear: number; periodMonth: number }
  >({
    mutationFn: (data) => apiClient.post<TieredCommissionResponse>('/tiered-commissions', data),
    onSuccess: (_data, variables) => {
      invalidatePeriodQueries(queryClient, variables.periodYear, variables.periodMonth);
      toast.success('پورسانت پلکانی با موفقیت ایجاد شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در ایجاد پورسانت پلکانی');
    },
  });
}

export function useDeleteTieredCommission() {
  const queryClient = useQueryClient();
  return useMutation<SuccessResponse, Error, { id: string; year: number; month: number }>({
    mutationFn: ({ id }) => apiClient.del<SuccessResponse>('/tiered-commissions', { id }),
    onSuccess: (_data, variables) => {
      invalidatePeriodQueries(queryClient, variables.year, variables.month);
      toast.success('پورسانت پلکانی با موفقیت حذف شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در حذف پورسانت پلکانی');
    },
  });
}

// ============================================================
// Finder Fee Hooks
// ============================================================

export function useFinderFees(year: number, month: number) {
  return useQuery<FinderFeesResponse>({
    queryKey: queryKeys.finderFees.period(year, month),
    queryFn: () => apiClient.get<FinderFeesResponse>('/finder-fees', { year, month }),
    enabled: !!year && !!month,
  });
}

export function useCreateFinderFee() {
  const queryClient = useQueryClient();
  return useMutation<
    FinderFeeResponse,
    Error,
    Omit<FinderFee, 'id'> & { periodYear: number; periodMonth: number }
  >({
    mutationFn: (data) => apiClient.post<FinderFeeResponse>('/finder-fees', data),
    onSuccess: (_data, variables) => {
      invalidatePeriodQueries(queryClient, variables.periodYear, variables.periodMonth);
      toast.success('حق‌النصب با موفقیت ایجاد شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در ایجاد حق‌النصب');
    },
  });
}

export function useDeleteFinderFee() {
  const queryClient = useQueryClient();
  return useMutation<SuccessResponse, Error, { id: string; year: number; month: number }>({
    mutationFn: ({ id }) => apiClient.del<SuccessResponse>('/finder-fees', { id }),
    onSuccess: (_data, variables) => {
      invalidatePeriodQueries(queryClient, variables.year, variables.month);
      toast.success('حق‌النصب با موفقیت حذف شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در حذف حق‌النصب');
    },
  });
}

// ============================================================
// Test Cost Hooks
// ============================================================

export function useTestCosts(year: number, month: number) {
  return useQuery<TestCostsResponse>({
    queryKey: queryKeys.testCosts.period(year, month),
    queryFn: () => apiClient.get<TestCostsResponse>('/test-costs', { year, month }),
    enabled: !!year && !!month,
  });
}

export function useCreateTestCost() {
  const queryClient = useQueryClient();
  return useMutation<
    TestCostResponse,
    Error,
    Omit<TestCost, 'id'> & { periodYear: number; periodMonth: number }
  >({
    mutationFn: (data) => apiClient.post<TestCostResponse>('/test-costs', data),
    onSuccess: (_data, variables) => {
      invalidatePeriodQueries(queryClient, variables.periodYear, variables.periodMonth);
      toast.success('هزینه تست با موفقیت ایجاد شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در ایجاد هزینه تست');
    },
  });
}

export function useDeleteTestCost() {
  const queryClient = useQueryClient();
  return useMutation<SuccessResponse, Error, { id: string; year: number; month: number }>({
    mutationFn: ({ id }) => apiClient.del<SuccessResponse>('/test-costs', { id }),
    onSuccess: (_data, variables) => {
      invalidatePeriodQueries(queryClient, variables.year, variables.month);
      toast.success('هزینه تست با موفقیت حذف شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در حذف هزینه تست');
    },
  });
}

// ============================================================
// Repair Cost Hooks
// ============================================================

export function useRepairCosts(year: number, month: number) {
  return useQuery<RepairCostsResponse>({
    queryKey: queryKeys.repairCosts.period(year, month),
    queryFn: () => apiClient.get<RepairCostsResponse>('/repair-costs', { year, month }),
    enabled: !!year && !!month,
  });
}

export function useCreateRepairCost() {
  const queryClient = useQueryClient();
  return useMutation<
    RepairCostResponse,
    Error,
    Omit<RepairCost, 'id'> & { periodYear: number; periodMonth: number }
  >({
    mutationFn: (data) => apiClient.post<RepairCostResponse>('/repair-costs', data),
    onSuccess: (_data, variables) => {
      invalidatePeriodQueries(queryClient, variables.periodYear, variables.periodMonth);
      toast.success('هزینه تعمیرات با موفقیت ایجاد شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در ایجاد هزینه تعمیرات');
    },
  });
}

export function useDeleteRepairCost() {
  const queryClient = useQueryClient();
  return useMutation<SuccessResponse, Error, { id: string; year: number; month: number }>({
    mutationFn: ({ id }) => apiClient.del<SuccessResponse>('/repair-costs', { id }),
    onSuccess: (_data, variables) => {
      invalidatePeriodQueries(queryClient, variables.year, variables.month);
      toast.success('هزینه تعمیرات با موفقیت حذف شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در حذف هزینه تعمیرات');
    },
  });
}

// ============================================================
// Sales Share Hooks
// ============================================================

export function useSalesShares(year: number, month: number) {
  return useQuery<SalesSharesResponse>({
    queryKey: queryKeys.salesShares.period(year, month),
    queryFn: () => apiClient.get<SalesSharesResponse>('/sales-shares', { year, month }),
    enabled: !!year && !!month,
  });
}

export function useCreateSalesShare() {
  const queryClient = useQueryClient();
  return useMutation<
    SalesShareResponse,
    Error,
    Omit<SalesShare, 'id' | 'shareAmount'> & { periodYear: number; periodMonth: number }
  >({
    mutationFn: (data) => apiClient.post<SalesShareResponse>('/sales-shares', data),
    onSuccess: (_data, variables) => {
      invalidatePeriodQueries(queryClient, variables.periodYear, variables.periodMonth);
      toast.success('سهم از فروش با موفقیت ایجاد شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در ایجاد سهم از فروش');
    },
  });
}

export function useDeleteSalesShare() {
  const queryClient = useQueryClient();
  return useMutation<SuccessResponse, Error, { id: string; year: number; month: number }>({
    mutationFn: ({ id }) => apiClient.del<SuccessResponse>('/sales-shares', { id }),
    onSuccess: (_data, variables) => {
      invalidatePeriodQueries(queryClient, variables.year, variables.month);
      toast.success('سهم از فروش با موفقیت حذف شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در حذف سهم از فروش');
    },
  });
}

// ============================================================
// Team Commission Hooks
// ============================================================

export function useTeamCommissions(year: number, month: number) {
  return useQuery<TeamCommissionsResponse>({
    queryKey: queryKeys.teamCommissions.period(year, month),
    queryFn: () => apiClient.get<TeamCommissionsResponse>('/team-commissions', { year, month }),
    enabled: !!year && !!month,
  });
}

export function useCreateTeamCommission() {
  const queryClient = useQueryClient();
  return useMutation<
    TeamCommissionResponse,
    Error,
    Omit<TeamCommission, 'id'> & { periodYear: number; periodMonth: number }
  >({
    mutationFn: (data) => apiClient.post<TeamCommissionResponse>('/team-commissions', data),
    onSuccess: (_data, variables) => {
      invalidatePeriodQueries(queryClient, variables.periodYear, variables.periodMonth);
      toast.success('پورسانت تیمی با موفقیت ایجاد شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در ایجاد پورسانت تیمی');
    },
  });
}

export function useDeleteTeamCommission() {
  const queryClient = useQueryClient();
  return useMutation<SuccessResponse, Error, { id: string; year: number; month: number }>({
    mutationFn: ({ id }) => apiClient.del<SuccessResponse>('/team-commissions', { id }),
    onSuccess: (_data, variables) => {
      invalidatePeriodQueries(queryClient, variables.year, variables.month);
      toast.success('پورسانت تیمی با موفقیت حذف شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در حذف پورسانت تیمی');
    },
  });
}

// ============================================================
// Bonus / Penalty Hooks
// ============================================================

export function useBonusPenalties(year: number, month: number) {
  return useQuery<BonusPenaltiesResponse>({
    queryKey: queryKeys.bonusPenalties.period(year, month),
    queryFn: () => apiClient.get<BonusPenaltiesResponse>('/bonus-penalties', { year, month }),
    enabled: !!year && !!month,
  });
}

export function useCreateBonusPenalty() {
  const queryClient = useQueryClient();
  return useMutation<
    BonusPenaltyResponse,
    Error,
    Omit<BonusPenalty, 'id'> & { periodYear: number; periodMonth: number }
  >({
    mutationFn: (data) => apiClient.post<BonusPenaltyResponse>('/bonus-penalties', data),
    onSuccess: (_data, variables) => {
      invalidatePeriodQueries(queryClient, variables.periodYear, variables.periodMonth);
      toast.success('پاداش/جریمه با موفقیت ایجاد شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در ایجاد پاداش/جریمه');
    },
  });
}

export function useDeleteBonusPenalty() {
  const queryClient = useQueryClient();
  return useMutation<SuccessResponse, Error, { id: string; year: number; month: number }>({
    mutationFn: ({ id }) => apiClient.del<SuccessResponse>('/bonus-penalties', { id }),
    onSuccess: (_data, variables) => {
      invalidatePeriodQueries(queryClient, variables.year, variables.month);
      toast.success('پاداش/جریمه با موفقیت حذف شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در حذف پاداش/جریمه');
    },
  });
}

// ============================================================
// Sales Target Hooks
// ============================================================

export function useSalesTargets(year: number, month: number) {
  return useQuery<SalesTargetsResponse>({
    queryKey: queryKeys.salesTargets.period(year, month),
    queryFn: () => apiClient.get<SalesTargetsResponse>('/sales-targets', { year, month }),
    enabled: !!year && !!month,
  });
}

export function useCreateSalesTarget() {
  const queryClient = useQueryClient();
  return useMutation<
    SalesTargetResponse,
    Error,
    Omit<SalesTarget, 'id' | 'achievedAmount' | 'targetPercent'> & { periodYear: number; periodMonth: number }
  >({
    mutationFn: (data) => apiClient.post<SalesTargetResponse>('/sales-targets', data),
    onSuccess: (_data, variables) => {
      invalidatePeriodQueries(queryClient, variables.periodYear, variables.periodMonth);
      toast.success('هدف فروش با موفقیت ایجاد شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در ایجاد هدف فروش');
    },
  });
}

export function useUpdateSalesTarget() {
  const queryClient = useQueryClient();
  return useMutation<
    SalesTargetResponse,
    Error,
    Partial<SalesTarget> & { id: string; periodYear: number; periodMonth: number }
  >({
    mutationFn: (data) => apiClient.put<SalesTargetResponse>('/sales-targets', data),
    onSuccess: (_data, variables) => {
      invalidatePeriodQueries(queryClient, variables.periodYear, variables.periodMonth);
      toast.success('هدف فروش با موفقیت بروزرسانی شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در بروزرسانی هدف فروش');
    },
  });
}

export function useDeleteSalesTarget() {
  const queryClient = useQueryClient();
  return useMutation<SuccessResponse, Error, { id: string; year: number; month: number }>({
    mutationFn: ({ id }) => apiClient.del<SuccessResponse>('/sales-targets', { id }),
    onSuccess: (_data, variables) => {
      invalidatePeriodQueries(queryClient, variables.year, variables.month);
      toast.success('هدف فروش با موفقیت حذف شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در حذف هدف فروش');
    },
  });
}

// ============================================================
// Collection Hooks
// ============================================================

export function useCollections(year: number, month: number) {
  return useQuery<CollectionsResponse>({
    queryKey: queryKeys.collections.period(year, month),
    queryFn: () => apiClient.get<CollectionsResponse>('/collections', { year, month }),
    enabled: !!year && !!month,
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation<
    CollectionResponse,
    Error,
    Omit<Collection, 'id'> & { periodYear: number; periodMonth: number }
  >({
    mutationFn: (data) => apiClient.post<CollectionResponse>('/collections', data),
    onSuccess: (_data, variables) => {
      invalidatePeriodQueries(queryClient, variables.periodYear, variables.periodMonth);
      toast.success('وصول با موفقیت ایجاد شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در ایجاد وصول');
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation<SuccessResponse, Error, { id: string; year: number; month: number }>({
    mutationFn: ({ id }) => apiClient.del<SuccessResponse>('/collections', { id }),
    onSuccess: (_data, variables) => {
      invalidatePeriodQueries(queryClient, variables.year, variables.month);
      toast.success('وصول با موفقیت حذف شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در حذف وصول');
    },
  });
}

// ============================================================
// Settlement Hooks
// ============================================================

export function useSettlements(year: number, month: number) {
  return useQuery<SettlementsResponse>({
    queryKey: queryKeys.settlements.period(year, month),
    queryFn: () => apiClient.get<SettlementsResponse>('/settlements', { year, month }),
    enabled: !!year && !!month,
  });
}

export function useCreateSettlement() {
  const queryClient = useQueryClient();
  return useMutation<
    SettlementResponse,
    Error,
    Omit<Settlement, 'id'> & { periodYear: number; periodMonth: number }
  >({
    mutationFn: (data) => apiClient.post<SettlementResponse>('/settlements', data),
    onSuccess: (_data, variables) => {
      invalidatePeriodQueries(queryClient, variables.periodYear, variables.periodMonth);
      toast.success('تسویه با موفقیت ایجاد شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در ایجاد تسویه');
    },
  });
}

export function useDeleteSettlement() {
  const queryClient = useQueryClient();
  return useMutation<SuccessResponse, Error, { id: string; year: number; month: number }>({
    mutationFn: ({ id }) => apiClient.del<SuccessResponse>('/settlements', { id }),
    onSuccess: (_data, variables) => {
      invalidatePeriodQueries(queryClient, variables.year, variables.month);
      toast.success('تسویه با موفقیت حذف شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در حذف تسویه');
    },
  });
}

// ============================================================
// Team Hooks
// ============================================================

export function useTeams() {
  return useQuery<TeamsResponse>({
    queryKey: queryKeys.teams.all,
    queryFn: () => apiClient.get<TeamsResponse>('/teams'),
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation<TeamResponse, Error, Omit<Team, 'id'>>({
    mutationFn: (data) => apiClient.post<TeamResponse>('/teams', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
      toast.success('تیم با موفقیت ایجاد شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در ایجاد تیم');
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  return useMutation<TeamResponse, Error, Partial<Team> & { id: string }>({
    mutationFn: (data) => apiClient.put<TeamResponse>('/teams', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
      toast.success('تیم با موفقیت بروزرسانی شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در بروزرسانی تیم');
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  return useMutation<SuccessResponse, Error, string>({
    mutationFn: (id) => apiClient.del<SuccessResponse>('/teams', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
      toast.success('تیم با موفقیت حذف شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در حذف تیم');
    },
  });
}

// ============================================================
// Dashboard Hook
// ============================================================

export function useDashboard(year: number, month: number) {
  return useQuery<DashboardResponse>({
    queryKey: queryKeys.dashboard.period(year, month),
    queryFn: () => apiClient.get<DashboardResponse>('/dashboard', { year, month }),
    enabled: !!year && !!month,
  });
}

// ============================================================
// Financial Report Hook
// ============================================================

export function useFinancialReport(filters: { year: number; month: number; salesPersonId?: string }) {
  return useQuery<FinancialReportResponse>({
    queryKey: queryKeys.financialReport.filters(filters),
    queryFn: () => apiClient.get<FinancialReportResponse>('/financial-report', filters as Record<string, string | number>),
    enabled: !!filters.year && !!filters.month,
  });
}

// ============================================================
// Sync Data Hook (localStorage → DB)
// ============================================================

export function useSyncData() {
  const queryClient = useQueryClient();
  return useMutation<SyncDataResponse, Error, Record<string, unknown>>({
    mutationFn: (data) => apiClient.post<SyncDataResponse>('/sync', data),
    onSuccess: () => {
      // Invalidate all queries to reflect synced data
      queryClient.invalidateQueries();
      toast.success('داده‌ها با موفقیت همگام‌سازی شد');
    },
    onError: (error) => {
      toast.error(error.message || 'خطا در همگام‌سازی داده‌ها');
    },
  });
}
