import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const periods = await db.$queryRaw<{ year: number; month: number }[]>`
      SELECT DISTINCT 
        periodYear as year, 
        periodMonth as month 
      FROM (
        SELECT periodYear, periodMonth FROM percentage_commissions
        UNION
        SELECT periodYear, periodMonth FROM tiered_commissions
        UNION
        SELECT periodYear, periodMonth FROM finder_fees
        UNION
        SELECT periodYear, periodMonth FROM test_costs
        UNION
        SELECT periodYear, periodMonth FROM repair_costs
        UNION
        SELECT periodYear, periodMonth FROM sales_shares
        UNION
        SELECT periodYear, periodMonth FROM team_commissions
        UNION
        SELECT periodYear, periodMonth FROM bonus_penalties
        UNION
        SELECT periodYear, periodMonth FROM sales_targets
        UNION
        SELECT periodYear, periodMonth FROM collections
        UNION
        SELECT periodYear, periodMonth FROM settlements
      ) AS all_periods
      ORDER BY periodYear DESC, periodMonth DESC
    `;

    return NextResponse.json({ 
      success: true, 
      data: periods 
    });
  } catch (error) {
    console.error('Error fetching periods:', error);
    return NextResponse.json(
      { success: false, message: 'خطا در دریافت دوره‌ها' },
      { status: 500 }
    );
  }
}