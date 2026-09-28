// Indian Rupee with Indian digit grouping, e.g. ₹1,23,456.50
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const moneyCompact = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatMoney(value) {
  return money.format(Number(value) || 0);
}

export function formatMoneyWhole(value) {
  return moneyCompact.format(Number(value) || 0);
}

// "ENTERTAINMENT" -> "Entertainment"
export function formatCategory(value) {
  if (!value) return '';
  return value.charAt(0) + value.slice(1).toLowerCase();
}

// "2026-09-28" -> "28 Sept 2026"
export function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// "2026-09" -> "September 2026"
export function formatMonth(ym) {
  if (!ym) return 'All time';
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

// Icon + colour per category, shared by chips, list rows and the donut chart.
export const CATEGORY_META = {
  FOOD: { icon: '🍜', color: '#f59e0b' },
  TRANSPORT: { icon: '🚌', color: '#3b82f6' },
  HOUSING: { icon: '🏠', color: '#8b5cf6' },
  UTILITIES: { icon: '💡', color: '#06b6d4' },
  ENTERTAINMENT: { icon: '🎬', color: '#ec4899' },
  HEALTH: { icon: '💊', color: '#10b981' },
  SHOPPING: { icon: '🛍️', color: '#f97316' },
  EDUCATION: { icon: '📚', color: '#6366f1' },
  OTHER: { icon: '📦', color: '#94a3b8' },
};

export function categoryMeta(cat) {
  return CATEGORY_META[cat] || CATEGORY_META.OTHER;
}
