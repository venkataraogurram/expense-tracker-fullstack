import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import Summary from './components/Summary.jsx';
import Filters from './components/Filters.jsx';
import ExpenseForm from './components/ExpenseForm.jsx';
import ExpenseList from './components/ExpenseList.jsx';

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Converts a "YYYY-MM" month into the from/to query params the API expects.
function monthRange(month) {
  if (!month) return { from: '', to: '' };
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}

export default function App() {
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ total: 0, count: 0, byCategory: {} });
  const [filters, setFilters] = useState({ category: '', month: currentMonth() });
  const [editing, setEditing] = useState(null); // expense being edited, or null
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const q = { category: filters.category, ...monthRange(filters.month) };
      const [list, sum] = await Promise.all([api.list(q), api.summary(q)]);
      setExpenses(list);
      setSummary(sum);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    api.categories().then(setCategories).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(expense) {
    if (editing) {
      await api.update(editing.id, expense);
      setEditing(null);
    } else {
      await api.create(expense);
    }
    await load();
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.remove(id);
      if (editing?.id === id) setEditing(null);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Expense Tracker</h1>
        <p className="subtitle">Spring Boot · React · MySQL</p>
      </header>

      {error && <div className="banner error">{error}</div>}

      <Summary summary={summary} />

      <div className="layout">
        <section className="card">
          <h2>{editing ? 'Edit expense' : 'Add expense'}</h2>
          <ExpenseForm
            key={editing?.id ?? 'new'}
            categories={categories}
            initial={editing}
            onSave={handleSave}
            onCancel={editing ? () => setEditing(null) : null}
          />
        </section>

        <section className="card">
          <h2>Expenses</h2>
          <Filters categories={categories} filters={filters} onChange={setFilters} />
          {loading ? (
            <p className="muted">Loading…</p>
          ) : (
            <ExpenseList expenses={expenses} onEdit={setEditing} onDelete={handleDelete} />
          )}
        </section>
      </div>
    </div>
  );
}
