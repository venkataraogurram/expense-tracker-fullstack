import { formatCategory } from '../format.js';

export default function Filters({ categories, filters, onChange }) {
  function set(field, value) {
    onChange({ ...filters, [field]: value });
  }

  return (
    <div className="filters">
      <label>
        Month
        <input
          type="month"
          value={filters.month}
          onChange={(e) => set('month', e.target.value)}
        />
      </label>
      <label>
        Category
        <select value={filters.category} onChange={(e) => set('category', e.target.value)}>
          <option value="">All</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {formatCategory(c)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="btn ghost"
        onClick={() => onChange({ category: '', month: '' })}
      >
        Show all
      </button>
    </div>
  );
}
