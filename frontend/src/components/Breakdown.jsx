import { categoryMeta, formatCategory, formatMoney } from '../format.js';

const R = 42;
const C = 2 * Math.PI * R;

/**
 * Donut chart of spend per category, drawn with plain SVG (no chart library).
 * Each segment is a circle stroke with a dasharray/dashoffset pair.
 */
export default function Breakdown({ summary, onPick, active }) {
  const total = Number(summary.total) || 0;
  const entries = Object.entries(summary.byCategory || {})
    .map(([cat, amt]) => [cat, Number(amt)])
    .sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    return (
      <div className="empty compact">
        <span aria-hidden="true">🥧</span>
        <p>Nothing to chart for this period.</p>
      </div>
    );
  }

  let offset = 0;
  const segments = entries.map(([cat, amt]) => {
    const frac = total > 0 ? amt / total : 0;
    const seg = { cat, amt, frac, dash: frac * C, offset };
    offset += frac * C;
    return seg;
  });

  return (
    <div className="breakdown">
      <svg viewBox="0 0 100 100" className="donut" role="img" aria-label="Spending by category">
        <circle cx="50" cy="50" r={R} className="donut-track" />
        {segments.map((s) => (
          <circle
            key={s.cat}
            cx="50"
            cy="50"
            r={R}
            className={`donut-seg ${active && active !== s.cat ? 'dim' : ''}`}
            stroke={categoryMeta(s.cat).color}
            strokeDasharray={`${s.dash} ${C - s.dash}`}
            strokeDashoffset={-s.offset}
            onClick={() => onPick(active === s.cat ? '' : s.cat)}
          />
        ))}
        <text x="50" y="47" className="donut-label">Total</text>
        <text x="50" y="59" className="donut-value">{formatMoney(total)}</text>
      </svg>

      <ul className="legend">
        {segments.map((s) => (
          <li key={s.cat}>
            <button
              type="button"
              className={`legend-row ${active === s.cat ? 'active' : ''}`}
              onClick={() => onPick(active === s.cat ? '' : s.cat)}
            >
              <span className="dot" style={{ background: categoryMeta(s.cat).color }} />
              <span className="legend-name">{formatCategory(s.cat)}</span>
              <span className="legend-pct">{Math.round(s.frac * 100)}%</span>
              <span className="legend-amt">{formatMoney(s.amt)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
