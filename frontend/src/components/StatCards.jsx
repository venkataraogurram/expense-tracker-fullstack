import { categoryMeta, formatCategory, formatMoney } from '../format.js';

export default function StatCards({ summary, periodLabel }) {
  const total = Number(summary.total) || 0;
  const count = summary.count || 0;
  const entries = Object.entries(summary.byCategory || {}).sort((a, b) => b[1] - a[1]);
  const top = entries[0];
  const average = count > 0 ? total / count : 0;

  return (
    <section className="stats">
      <div className="stat accent">
        <span className="stat-label">Total spent · {periodLabel}</span>
        <span className="stat-value">{formatMoney(total)}</span>
        <span className="stat-icon" aria-hidden="true">💸</span>
      </div>

      <div className="stat">
        <span className="stat-label">Transactions</span>
        <span className="stat-value">{count}</span>
        <span className="stat-sub">avg {formatMoney(average)} each</span>
        <span className="stat-icon" aria-hidden="true">🧾</span>
      </div>

      <div className="stat">
        <span className="stat-label">Top category</span>
        {top ? (
          <>
            <span className="stat-value">{formatCategory(top[0])}</span>
            <span className="stat-sub">
              {formatMoney(top[1])} · {total > 0 ? Math.round((Number(top[1]) / total) * 100) : 0}% of total
            </span>
            <span className="stat-icon" aria-hidden="true">{categoryMeta(top[0]).icon}</span>
          </>
        ) : (
          <>
            <span className="stat-value">—</span>
            <span className="stat-sub">No expenses yet</span>
            <span className="stat-icon" aria-hidden="true">📊</span>
          </>
        )}
      </div>
    </section>
  );
}
