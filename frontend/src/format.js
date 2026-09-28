// Indian Rupee with Indian digit grouping, e.g. ₹1,23,456.50
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export function formatMoney(value) {
  return money.format(Number(value) || 0);
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
