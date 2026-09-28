import { useState } from 'react';
import { categoryMeta, formatCategory, formatDate, formatMoney } from '../format.js';

export default function ExpenseList({ expenses, loading, onEdit, onDelete }) {
  const [confirmId, setConfirmId] = useState(null);

  if (loading && expenses.length === 0) {
    return (
      <ul className="rows" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="row skeleton">
            <span className="avatar" />
            <span className="sk-line w40" />
            <span className="sk-line w20" />
          </li>
        ))}
      </ul>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="empty">
        <span aria-hidden="true">🗒️</span>
        <h3>No expenses here</h3>
        <p>Try another period or category, or add your first expense on the left.</p>
      </div>
    );
  }

  return (
    <ul className="rows">
      {expenses.map((e) => {
        const { icon, color } = categoryMeta(e.category);
        const confirming = confirmId === e.id;
        return (
          <li key={e.id} className={`row ${confirming ? 'confirming' : ''}`}>
            <span className="avatar" style={{ '--cat': color }} aria-hidden="true">
              {icon}
            </span>

            <div className="row-main">
              <div className="row-title">{e.title}</div>
              <div className="row-meta">
                <span className="tag" style={{ '--cat': color }}>{formatCategory(e.category)}</span>
                <span>{formatDate(e.date)}</span>
                {e.notes && <span className="notes" title={e.notes}>· {e.notes}</span>}
              </div>
            </div>

            <div className="row-amount">{formatMoney(e.amount)}</div>

            <div className="row-actions">
              {confirming ? (
                <>
                  <span className="muted small">Delete?</span>
                  <button
                    type="button"
                    className="btn small danger solid"
                    onClick={() => {
                      setConfirmId(null);
                      onDelete(e.id);
                    }}
                  >
                    Yes
                  </button>
                  <button type="button" className="btn small" onClick={() => setConfirmId(null)}>
                    No
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="icon-btn" title="Edit" aria-label={`Edit ${e.title}`} onClick={() => onEdit(e)}>
                    ✏️
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Delete"
                    aria-label={`Delete ${e.title}`}
                    onClick={() => setConfirmId(e.id)}
                  >
                    🗑️
                  </button>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
