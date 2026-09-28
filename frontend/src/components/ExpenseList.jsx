import { formatCategory, formatDate, formatMoney } from '../format.js';

export default function ExpenseList({ expenses, onEdit, onDelete }) {
  if (expenses.length === 0) {
    return <p className="muted">No expenses match these filters. Add one on the left.</p>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Title</th>
          <th>Category</th>
          <th className="num">Amount</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {expenses.map((e) => (
          <tr key={e.id}>
            <td className="nowrap">{formatDate(e.date)}</td>
            <td>
              <div>{e.title}</div>
              {e.notes && <div className="muted small">{e.notes}</div>}
            </td>
            <td>
              <span className={`tag tag-${e.category.toLowerCase()}`}>{formatCategory(e.category)}</span>
            </td>
            <td className="num">{formatMoney(e.amount)}</td>
            <td className="nowrap">
              <button type="button" className="btn small" onClick={() => onEdit(e)}>
                Edit
              </button>
              <button type="button" className="btn small danger" onClick={() => onDelete(e.id)}>
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
