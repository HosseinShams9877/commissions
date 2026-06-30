// Tiered commission calculation functions shared between client and server

export interface Tier {
  id?: string;
  fromAmount: number;
  toAmount: number;
  percentage: number;
}
// ====== Tiered commission calculation (proportional) ======
function calculateProportionalCommission(salesAmount: number, tiers: Tier[], days?: number): number {
  if (tiers.length === 0 || salesAmount <= 0) return 0;

  // ✅ فیلتر بر اساس days
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

  // ✅ محاسبه با پله‌های انتخاب شده
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

  // ✅ فیلتر بر اساس days
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

  // ✅ محاسبه با پله‌های انتخاب شده
  for (let i = selectedTiers.length - 1; i >= 0; i--) {
    if (salesAmount >= selectedTiers[i].fromAmount) {
      return salesAmount * (selectedTiers[i].percentage / 100);
    }
  }
  return 0;
}

export function calculateTieredCommission(
  salesAmount: number, 
  tiers: Tier[], 
  mode: 'proportional' | 'stepped', 
  days?: number  // ← این رو اضافه کن
): number {
  return mode === 'stepped' 
    ? calculateSteppedCommission(salesAmount, tiers, days) 
    : calculateProportionalCommission(salesAmount, tiers, days);
}