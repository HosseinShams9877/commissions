// Tiered commission calculation functions shared between client and server

export interface Tier {
  id?: string;
  fromAmount: number;
  toAmount: number;
  percentage: number;
}

// ====== Tiered commission calculation (proportional) ======
function calculateProportionalCommission(salesAmount: number, tiers: Tier[]): number {
  if (tiers.length === 0 || salesAmount <= 0) return 0;

  const boundaries: { amount: number; percentage: number }[] = [];
  for (let i = 0; i < tiers.length; i++) {
    if (i === 0) boundaries.push({ amount: tiers[i].fromAmount, percentage: 0 });
    if (tiers[i].toAmount !== 0) boundaries.push({ amount: tiers[i].toAmount, percentage: tiers[i].percentage });
  }

  if (salesAmount <= (tiers[0]?.fromAmount ?? 0)) return 0;

  const lastTier = tiers[tiers.length - 1];
  if (lastTier.toAmount === 0 && salesAmount >= lastTier.fromAmount) {
    return salesAmount * (lastTier.percentage / 100);
  }

  const lastBoundary = boundaries[boundaries.length - 1];
  if (lastBoundary && salesAmount >= lastBoundary.amount) {
    return salesAmount * (lastBoundary.percentage / 100);
  }

  for (let i = 0; i < boundaries.length - 1; i++) {
    const lower = boundaries[i]; const upper = boundaries[i + 1];
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
function calculateSteppedCommission(salesAmount: number, tiers: Tier[]): number {
  if (tiers.length === 0 || salesAmount <= 0) return 0;
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (salesAmount >= tiers[i].fromAmount) {
      return salesAmount * (tiers[i].percentage / 100);
    }
  }
  return 0;
}

export function calculateTieredCommission(salesAmount: number, tiers: Tier[], mode: 'proportional' | 'stepped'): number {
  return mode === 'stepped' ? calculateSteppedCommission(salesAmount, tiers) : calculateProportionalCommission(salesAmount, tiers);
}
