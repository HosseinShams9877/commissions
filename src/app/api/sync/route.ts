import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { syncSchema } from '@/lib/validations';
import { calculateTieredCommission } from '@/lib/commission-calculations';

// POST /api/sync — sync localStorage data to database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = syncSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join('، ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const data = parsed.data;
    const results = {
      salesPersons: { upserted: 0, errors: 0 },
      teams: { upserted: 0, errors: 0 },
      percentageCommissions: { upserted: 0, errors: 0 },
      tieredCommissions: { upserted: 0, errors: 0 },
      finderFees: { upserted: 0, errors: 0 },
      testCosts: { upserted: 0, errors: 0 },
      repairCosts: { upserted: 0, errors: 0 },
      salesShares: { upserted: 0, errors: 0 },
      teamCommissions: { upserted: 0, errors: 0 },
      bonusPenalties: { upserted: 0, errors: 0 },
      salesTargets: { upserted: 0, errors: 0 },
      collections: { upserted: 0, errors: 0 },
      settlements: { upserted: 0, errors: 0 },
    };

    // 1. Sync SalesPersons — upsert by code (unique field)
    if (data.salesPersons) {
      for (const sp of data.salesPersons) {
        try {
          await db.salesPerson.upsert({
            where: { code: sp.code },
            update: {
              name: sp.name,
              bankName: sp.bankName ?? null,
              cardNumber: sp.cardNumber ?? null,
              shebaNumber: sp.shebaNumber ?? null,
              defaultPercentage: sp.defaultPercentage ?? 0,
            },
            create: {
              id: sp.id,
              name: sp.name,
              code: sp.code,
              bankName: sp.bankName ?? null,
              cardNumber: sp.cardNumber ?? null,
              shebaNumber: sp.shebaNumber ?? null,
              defaultPercentage: sp.defaultPercentage ?? 0,
            },
          });
          results.salesPersons.upserted++;
        } catch (error) {
          console.error(`Failed to sync sales person ${sp.code}:`, error);
          results.salesPersons.errors++;
        }
      }
    }

    // 2. Sync Teams — upsert with members
    if (data.teams) {
      for (const team of data.teams) {
        try {
          // Try to find existing team by id
          const existing = await db.team.findUnique({ where: { id: team.id } });

          if (existing) {
            // Update team and replace members
            await db.teamMember.deleteMany({ where: { teamId: team.id } });
            await db.team.update({
              where: { id: team.id },
              data: {
                name: team.name,
                leaderId: team.leaderId,
                personalPercent: team.personalPercent ?? 0,
                teamPercent: team.teamPercent ?? 0,
                members: {
                  create: (team.memberIds ?? []).map((personId) => ({ personId })),
                },
              },
            });
          } else {
            // Create new team with members
            await db.team.create({
              data: {
                id: team.id,
                name: team.name,
                leaderId: team.leaderId,
                personalPercent: team.personalPercent ?? 0,
                teamPercent: team.teamPercent ?? 0,
                members: {
                  create: (team.memberIds ?? []).map((personId) => ({ personId })),
                },
              },
            });
          }
          results.teams.upserted++;
        } catch (error) {
          console.error(`Failed to sync team ${team.id}:`, error);
          results.teams.errors++;
        }
      }
    }

    // 3. Sync Monthly Data
    if (data.monthlyDataMap) {
      for (const [, monthlyData] of Object.entries(data.monthlyDataMap)) {
        const periodYear = monthlyData.period.year;
        const periodMonth = monthlyData.period.month;

        // Percentage Commissions
        if (monthlyData.percentageCommissions) {
          for (const pc of monthlyData.percentageCommissions) {
            try {
              const commissionAmount = pc.salesAmount * (pc.percentage / 100);
              await db.percentageCommission.upsert({
                where: { id: pc.id },
                update: {
                  salesPersonId: pc.salesPersonId,
                  periodYear,
                  periodMonth,
                  salesAmount: pc.salesAmount,
                  percentage: pc.percentage,
                  commissionAmount,
                },
                create: {
                  id: pc.id,
                  salesPersonId: pc.salesPersonId,
                  periodYear,
                  periodMonth,
                  salesAmount: pc.salesAmount,
                  percentage: pc.percentage,
                  commissionAmount,
                },
              });
              results.percentageCommissions.upserted++;
            } catch (error) {
              console.error(`Failed to sync percentage commission ${pc.id}:`, error);
              results.percentageCommissions.errors++;
            }
          }
        }

        // Tiered Commissions
        if (monthlyData.tieredCommissions) {
          for (const tc of monthlyData.tieredCommissions) {
            try {
              const commissionAmount = calculateTieredCommission(
                tc.salesAmount,
                tc.tiers,
                tc.mode
              );
              await db.tieredCommission.upsert({
                where: { id: tc.id },
                update: {
                  salesPersonId: tc.salesPersonId,
                  periodYear,
                  periodMonth,
                  salesAmount: tc.salesAmount,
                  commissionAmount,
                  mode: tc.mode,
                  tiersJson: JSON.stringify(tc.tiers),
                },
                create: {
                  id: tc.id,
                  salesPersonId: tc.salesPersonId,
                  periodYear,
                  periodMonth,
                  salesAmount: tc.salesAmount,
                  commissionAmount: tc.commissionAmount ?? commissionAmount,
                  mode: tc.mode,
                  tiersJson: JSON.stringify(tc.tiers),
                },
              });
              results.tieredCommissions.upserted++;
            } catch (error) {
              console.error(`Failed to sync tiered commission ${tc.id}:`, error);
              results.tieredCommissions.errors++;
            }
          }
        }

        // Finder Fees
        if (monthlyData.finderFees) {
          for (const ff of monthlyData.finderFees) {
            try {
              await db.finderFee.upsert({
                where: { id: ff.id },
                update: {
                  salesPersonId: ff.salesPersonId,
                  periodYear,
                  periodMonth,
                  description: ff.description,
                  amount: ff.amount,
                },
                create: {
                  id: ff.id,
                  salesPersonId: ff.salesPersonId,
                  periodYear,
                  periodMonth,
                  description: ff.description,
                  amount: ff.amount,
                },
              });
              results.finderFees.upserted++;
            } catch (error) {
              console.error(`Failed to sync finder fee ${ff.id}:`, error);
              results.finderFees.errors++;
            }
          }
        }

        // Test Costs
        if (monthlyData.testCosts) {
          for (const tc of monthlyData.testCosts) {
            try {
              await db.testCost.upsert({
                where: { id: tc.id },
                update: {
                  salesPersonId: tc.salesPersonId,
                  periodYear,
                  periodMonth,
                  description: tc.description,
                  amount: tc.amount,
                },
                create: {
                  id: tc.id,
                  salesPersonId: tc.salesPersonId,
                  periodYear,
                  periodMonth,
                  description: tc.description,
                  amount: tc.amount,
                },
              });
              results.testCosts.upserted++;
            } catch (error) {
              console.error(`Failed to sync test cost ${tc.id}:`, error);
              results.testCosts.errors++;
            }
          }
        }

        // Repair Costs
        if (monthlyData.repairCosts) {
          for (const rc of monthlyData.repairCosts) {
            try {
              await db.repairCost.upsert({
                where: { id: rc.id },
                update: {
                  salesPersonId: rc.salesPersonId,
                  periodYear,
                  periodMonth,
                  description: rc.description,
                  amount: rc.amount,
                },
                create: {
                  id: rc.id,
                  salesPersonId: rc.salesPersonId,
                  periodYear,
                  periodMonth,
                  description: rc.description,
                  amount: rc.amount,
                },
              });
              results.repairCosts.upserted++;
            } catch (error) {
              console.error(`Failed to sync repair cost ${rc.id}:`, error);
              results.repairCosts.errors++;
            }
          }
        }

        // Sales Shares
        if (monthlyData.salesShares) {
          for (const ss of monthlyData.salesShares) {
            try {
              await db.salesShare.upsert({
                where: { id: ss.id },
                update: {
                  salesPersonId: ss.salesPersonId,
                  periodYear,
                  periodMonth,
                  totalSales: ss.totalSales,
                  sharePercentage: ss.sharePercentage,
                  shareAmount: ss.shareAmount,
                },
                create: {
                  id: ss.id,
                  salesPersonId: ss.salesPersonId,
                  periodYear,
                  periodMonth,
                  totalSales: ss.totalSales,
                  sharePercentage: ss.sharePercentage,
                  shareAmount: ss.shareAmount,
                },
              });
              results.salesShares.upserted++;
            } catch (error) {
              console.error(`Failed to sync sales share ${ss.id}:`, error);
              results.salesShares.errors++;
            }
          }
        }

        // Team Commissions
        if (monthlyData.teamCommissions) {
          for (const tc of monthlyData.teamCommissions) {
            try {
              await db.teamCommission.upsert({
                where: { id: tc.id },
                update: {
                  teamId: tc.teamId,
                  periodYear,
                  periodMonth,
                  leaderPersonalSales: tc.leaderPersonalSales,
                  leaderPersonalCommission: tc.leaderPersonalCommission,
                  totalTeamSales: tc.totalTeamSales,
                  teamCommissionAmount: tc.teamCommissionAmount,
                  totalLeaderCommission: tc.totalLeaderCommission,
                },
                create: {
                  id: tc.id,
                  teamId: tc.teamId,
                  periodYear,
                  periodMonth,
                  leaderPersonalSales: tc.leaderPersonalSales,
                  leaderPersonalCommission: tc.leaderPersonalCommission,
                  totalTeamSales: tc.totalTeamSales,
                  teamCommissionAmount: tc.teamCommissionAmount,
                  totalLeaderCommission: tc.totalLeaderCommission,
                },
              });
              results.teamCommissions.upserted++;
            } catch (error) {
              console.error(`Failed to sync team commission ${tc.id}:`, error);
              results.teamCommissions.errors++;
            }
          }
        }

        // Bonus Penalties
        if (monthlyData.bonusPenalties) {
          for (const bp of monthlyData.bonusPenalties) {
            try {
              await db.bonusPenalty.upsert({
                where: { id: bp.id },
                update: {
                  salesPersonId: bp.salesPersonId,
                  periodYear,
                  periodMonth,
                  type: bp.type,
                  amount: bp.amount,
                  reason: bp.reason,
                },
                create: {
                  id: bp.id,
                  salesPersonId: bp.salesPersonId,
                  periodYear,
                  periodMonth,
                  type: bp.type,
                  amount: bp.amount,
                  reason: bp.reason,
                },
              });
              results.bonusPenalties.upserted++;
            } catch (error) {
              console.error(`Failed to sync bonus/penalty ${bp.id}:`, error);
              results.bonusPenalties.errors++;
            }
          }
        }

        // Sales Targets
        if (monthlyData.salesTargets) {
          for (const st of monthlyData.salesTargets) {
            try {
              await db.salesTarget.upsert({
                where: { id: st.id },
                update: {
                  salesPersonId: st.salesPersonId,
                  periodYear,
                  periodMonth,
                  targetAmount: st.targetAmount,
                  achievedAmount: st.achievedAmount,
                  targetPercent: st.targetPercent,
                  bonusPercent: st.bonusPercent ?? 0,
                },
                create: {
                  id: st.id,
                  salesPersonId: st.salesPersonId,
                  periodYear,
                  periodMonth,
                  targetAmount: st.targetAmount,
                  achievedAmount: st.achievedAmount,
                  targetPercent: st.targetPercent,
                  bonusPercent: st.bonusPercent ?? 0,
                },
              });
              results.salesTargets.upserted++;
            } catch (error) {
              console.error(`Failed to sync sales target ${st.id}:`, error);
              results.salesTargets.errors++;
            }
          }
        }

        // Collections
        if (monthlyData.collections) {
          for (const c of monthlyData.collections) {
            try {
              await db.collection.upsert({
                where: { id: c.id },
                update: {
                  salesPersonId: c.salesPersonId,
                  periodYear,
                  periodMonth,
                  amount: c.amount,
                  date: c.date,
                  description: c.description,
                },
                create: {
                  id: c.id,
                  salesPersonId: c.salesPersonId,
                  periodYear,
                  periodMonth,
                  amount: c.amount,
                  date: c.date,
                  description: c.description,
                },
              });
              results.collections.upserted++;
            } catch (error) {
              console.error(`Failed to sync collection ${c.id}:`, error);
              results.collections.errors++;
            }
          }
        }

        // Settlements
        if (monthlyData.settlements) {
          for (const s of monthlyData.settlements) {
            try {
              await db.settlement.upsert({
                where: { id: s.id },
                update: {
                  salesPersonId: s.salesPersonId,
                  periodYear,
                  periodMonth,
                  amount: s.amount,
                  date: s.date,
                  description: s.description,
                },
                create: {
                  id: s.id,
                  salesPersonId: s.salesPersonId,
                  periodYear,
                  periodMonth,
                  amount: s.amount,
                  date: s.date,
                  description: s.description,
                },
              });
              results.settlements.upserted++;
            } catch (error) {
              console.error(`Failed to sync settlement ${s.id}:`, error);
              results.settlements.errors++;
            }
          }
        }
      }
    }

    const totalUpserted = Object.values(results).reduce((sum, r) => sum + r.upserted, 0);
    const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors, 0);

    return NextResponse.json({
      success: true,
      message: `همگام‌سازی انجام شد: ${totalUpserted} رکورد با موفقیت، ${totalErrors} خطا`,
      results,
      totalUpserted,
      totalErrors,
    });
  } catch (error) {
    console.error('Failed to sync data:', error);
    return NextResponse.json(
      { error: 'همگام‌سازی داده‌ها ناموفق بود' },
      { status: 500 }
    );
  }
}
