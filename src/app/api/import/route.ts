import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/import — import data from JSON
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { salesPersons, teams, monthlyDataMap, monthlyData } = body;

    const results = {
      salesPersons: 0,
      teams: 0,
      records: 0,
      errors: [] as string[],
    };

    // Import sales persons
    if (salesPersons && Array.isArray(salesPersons)) {
      for (const sp of salesPersons) {
        try {
          await db.salesPerson.upsert({
            where: { code: sp.code },
            update: {
              name: sp.name,
              bankName: sp.bankName || null,
              cardNumber: sp.cardNumber || null,
              shebaNumber: sp.shebaNumber || null,
              defaultPercentage: sp.defaultPercentage || 0,
            },
            create: {
              id: sp.id,
              name: sp.name,
              code: sp.code,
              bankName: sp.bankName || null,
              cardNumber: sp.cardNumber || null,
              shebaNumber: sp.shebaNumber || null,
              defaultPercentage: sp.defaultPercentage || 0,
            },
          });
          results.salesPersons++;
        } catch (err: any) {
          results.errors.push(`SalesPerson ${sp.name}: ${err.message}`);
        }
      }
    }

    // Import teams
    if (teams && Array.isArray(teams)) {
      for (const team of teams) {
        try {
          const existingTeam = await db.team.findUnique({ where: { id: team.id } });
          if (existingTeam) {
            await db.team.update({
              where: { id: team.id },
              data: {
                name: team.name,
                leaderId: team.leaderId,
                personalPercent: team.personalPercent || 0,
                teamPercent: team.teamPercent || 0,
              },
            });
            // Update members
            await db.teamMember.deleteMany({ where: { teamId: team.id } });
            if (team.memberIds && Array.isArray(team.memberIds)) {
              for (const memberId of team.memberIds) {
                await db.teamMember.create({
                  data: { teamId: team.id, personId: memberId },
                });
              }
            }
          } else {
            await db.team.create({
              data: {
                id: team.id,
                name: team.name,
                leaderId: team.leaderId,
                personalPercent: team.personalPercent || 0,
                teamPercent: team.teamPercent || 0,
                members: {
                  create: (team.memberIds || []).map((personId: string) => ({ personId })),
                },
              },
            });
          }
          results.teams++;
        } catch (err: any) {
          results.errors.push(`Team ${team.name}: ${err.message}`);
        }
      }
    }

    // Import monthly data (single month or multiple)
    const dataToImport = monthlyDataMap
      ? Object.values(monthlyDataMap)
      : monthlyData
        ? [monthlyData]
        : [];

    for (const monthData of dataToImport) {
      if (!monthData?.period) continue;
      const { year, month } = monthData.period;

      // Helper to import a collection of records
      const importRecords = async (records: any[], modelName: string, createFn: (r: any) => any) => {
        for (const record of records) {
          try {
            await createFn(record);
            results.records++;
          } catch (err: any) {
            results.errors.push(`${modelName}: ${err.message}`);
          }
        }
      };

      // Percentage Commissions
      if (monthData.percentageCommissions) {
        await importRecords(monthData.percentageCommissions, 'PercentageCommission', async (r: any) => {
          await db.percentageCommission.upsert({
            where: { id: r.id },
            update: {},
            create: {
              id: r.id,
              salesPersonId: r.salesPersonId,
              periodYear: year,
              periodMonth: month,
              salesAmount: r.salesAmount,
              percentage: r.percentage,
              commissionAmount: r.commissionAmount,
            },
          });
        });
      }

      // Tiered Commissions
      if (monthData.tieredCommissions) {
        await importRecords(monthData.tieredCommissions, 'TieredCommission', async (r: any) => {
          const tiersJson = r.tiersJson || JSON.stringify(r.tiers || []);
          await db.tieredCommission.upsert({
            where: { id: r.id },
            update: {},
            create: {
              id: r.id,
              salesPersonId: r.salesPersonId,
              periodYear: year,
              periodMonth: month,
              salesAmount: r.salesAmount,
              commissionAmount: r.commissionAmount,
              mode: r.mode || 'proportional',
              tiersJson,
            },
          });
        });
      }

      // Finder Fees
      if (monthData.finderFees) {
        await importRecords(monthData.finderFees, 'FinderFee', async (r: any) => {
          await db.finderFee.upsert({
            where: { id: r.id },
            update: {},
            create: {
              id: r.id,
              salesPersonId: r.salesPersonId,
              periodYear: year,
              periodMonth: month,
              description: r.description,
              amount: r.amount,
            },
          });
        });
      }

      // Test Costs
      if (monthData.testCosts) {
        await importRecords(monthData.testCosts, 'TestCost', async (r: any) => {
          await db.testCost.upsert({
            where: { id: r.id },
            update: {},
            create: {
              id: r.id,
              salesPersonId: r.salesPersonId,
              periodYear: year,
              periodMonth: month,
              description: r.description,
              amount: r.amount,
            },
          });
        });
      }

      // Repair Costs
      if (monthData.repairCosts) {
        await importRecords(monthData.repairCosts, 'RepairCost', async (r: any) => {
          await db.repairCost.upsert({
            where: { id: r.id },
            update: {},
            create: {
              id: r.id,
              salesPersonId: r.salesPersonId,
              periodYear: year,
              periodMonth: month,
              description: r.description,
              amount: r.amount,
            },
          });
        });
      }

      // Sales Shares
      if (monthData.salesShares) {
        await importRecords(monthData.salesShares, 'SalesShare', async (r: any) => {
          await db.salesShare.upsert({
            where: { id: r.id },
            update: {},
            create: {
              id: r.id,
              salesPersonId: r.salesPersonId,
              periodYear: year,
              periodMonth: month,
              totalSales: r.totalSales,
              sharePercentage: r.sharePercentage,
              shareAmount: r.shareAmount,
            },
          });
        });
      }

      // Team Commissions
      if (monthData.teamCommissions) {
        await importRecords(monthData.teamCommissions, 'TeamCommission', async (r: any) => {
          await db.teamCommission.upsert({
            where: { id: r.id },
            update: {},
            create: {
              id: r.id,
              teamId: r.teamId,
              periodYear: year,
              periodMonth: month,
              leaderPersonalSales: r.leaderPersonalSales,
              leaderPersonalCommission: r.leaderPersonalCommission,
              totalTeamSales: r.totalTeamSales,
              teamCommissionAmount: r.teamCommissionAmount,
              totalLeaderCommission: r.totalLeaderCommission,
            },
          });
        });
      }

      // Bonus Penalties
      if (monthData.bonusPenalties) {
        await importRecords(monthData.bonusPenalties, 'BonusPenalty', async (r: any) => {
          await db.bonusPenalty.upsert({
            where: { id: r.id },
            update: {},
            create: {
              id: r.id,
              salesPersonId: r.salesPersonId,
              periodYear: year,
              periodMonth: month,
              type: r.type,
              amount: r.amount,
              reason: r.reason,
            },
          });
        });
      }

      // Sales Targets
      if (monthData.salesTargets) {
        await importRecords(monthData.salesTargets, 'SalesTarget', async (r: any) => {
          await db.salesTarget.upsert({
            where: { id: r.id },
            update: {},
            create: {
              id: r.id,
              salesPersonId: r.salesPersonId,
              periodYear: year,
              periodMonth: month,
              targetAmount: r.targetAmount,
              achievedAmount: r.achievedAmount || 0,
              targetPercent: r.targetPercent || 0,
              bonusPercent: r.bonusPercent || 0,
            },
          });
        });
      }

      // Collections
      if (monthData.collections) {
        await importRecords(monthData.collections, 'Collection', async (r: any) => {
          await db.collection.upsert({
            where: { id: r.id },
            update: {},
            create: {
              id: r.id,
              salesPersonId: r.salesPersonId,
              periodYear: year,
              periodMonth: month,
              amount: r.amount,
              date: r.date,
              description: r.description,
            },
          });
        });
      }

      // Settlements
      if (monthData.settlements) {
        await importRecords(monthData.settlements, 'Settlement', async (r: any) => {
          await db.settlement.upsert({
            where: { id: r.id },
            update: {},
            create: {
              id: r.id,
              salesPersonId: r.salesPersonId,
              periodYear: year,
              periodMonth: month,
              amount: r.amount,
              date: r.date,
              description: r.description,
            },
          });
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Failed to import data:', error);
    return NextResponse.json({ error: 'Failed to import data' }, { status: 500 });
  }
}
