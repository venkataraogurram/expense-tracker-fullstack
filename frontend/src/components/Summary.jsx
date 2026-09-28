import { formatMoney, formatCategory } from '../format.js';

export default function Summary({ summary }) {
  const entries = Object.entries(summary.byCategory || {}).sort((a, b) => b[1] - a[1]);
  const total = Number(summary.total) || 0;

  return (
    <section className="summary">
      <div className="stat">
        <span className="stat-label">Total spent</span>
        <span className="stat-value">{formatMoney(total)}</span>
      </div>
      <div className="stat">
        <span className="stat-label">Expenses</span>
        <span className="stat-value">{summary.count}</span>
      </div>
      <div className="breakdown">
        {entries.length === 0 && <span className="muted">No data for this period</span>}
        {entries.map(([cat, amt]) => {
          const pct = total > 0 ? (Number(amt) / total) * 100 : 0;
          return (
            <div className="bar-row" key={cat}>
              <span className="bar-label">{formatCategory(cat)}</span>
              <div className="bar">
                <div className="bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="bar-amount">{formatMoney(amt)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
