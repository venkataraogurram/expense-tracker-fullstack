import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { categoryMeta, formatCategory, formatMonth } from './format.js';
import StatCards from './components/StatCards.jsx';
import Breakdown from './components/Breakdown.jsx';
import ExpenseForm from './components/ExpenseForm.jsx';
import ExpenseList from './components/ExpenseList.jsx';
import Toast from './components/Toast.jsx';

// Theme: ?theme=light|dark in the URL wins (handy for demos), then the saved
// choice, then the OS preference. Applied as <html data-theme="..."> for CSS.
function initialTheme() {
  const fromUrl = new URLSearchParams(window.location.search).get('theme');
  if (fromUrl === 'light' || fromUrl === 'dark') return fromUrl;
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function useTheme() {
  const [theme, setTheme] = useState(initialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))];
}

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
  const [month, setMonth] = useState(currentMonth());
  const [category, setCategory] = useState('');
  const [editing, setEditing] = useState(null); // expense being edited, or null
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [theme, toggleTheme] = useTheme();
  const formRef = useRef(null);

  const notify = useCallback((message, tone = 'success') => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const q = { category, ...monthRange(month) };
      // Summary ignores the category filter so the donut always shows the whole period.
      const [list, sum] = await Promise.all([api.list(q), api.summary(monthRange(month))]);
      setExpenses(list);
      setSummary(sum);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [category, month]);

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
      notify('Expense updated');
    } else {
      await api.create(expense);
      notify('Expense added');
    }
    await load();
  }

  async function handleDelete(id) {
    try {
      await api.remove(id);
      if (editing?.id === id) setEditing(null);
      notify('Expense deleted', 'neutral');
      await load();
    } catch (e) {
      notify(e.message, 'error');
    }
  }

  function startEdit(expense) {
    setEditing(expense);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">₹</span>
          <div>
            <h1>Expense Tracker</h1>
            <p>Spring Boot · React · MySQL</p>
          </div>
        </div>
        <div className="period">
          <label className="period-label">
            <span>Period</span>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </label>
          <button
            type="button"
            className={`btn ghost ${month === '' ? 'active' : ''}`}
            onClick={() => setMonth(month === '' ? currentMonth() : '')}
          >
            {month === '' ? 'This month' : 'All time'}
          </button>
          <button
            type="button"
            className="icon-btn theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle colour theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className="content">
        {error && (
          <div className="alert" role="alert">
            <strong>Could not reach the API.</strong> {error}
            <button type="button" className="btn small" onClick={load}>Retry</button>
          </div>
        )}

        <StatCards summary={summary} periodLabel={formatMonth(month)} />

        <div className="layout">
          <aside className="column">
            <section className="card" ref={formRef}>
              <div className="card-head">
                <h2>{editing ? 'Edit expense' : 'Add expense'}</h2>
                {editing && <span className="pill">#{editing.id}</span>}
              </div>
              <ExpenseForm
                key={editing?.id ?? 'new'}
                categories={categories}
                initial={editing}
                onSave={handleSave}
                onCancel={editing ? () => setEditing(null) : null}
              />
            </section>

            <section className="card">
              <div className="card-head">
                <h2>Breakdown</h2>
                <span className="muted small">{formatMonth(month)}</span>
              </div>
              <Breakdown summary={summary} onPick={setCategory} active={category} />
            </section>
          </aside>

          <section className="card list-card">
            <div className="card-head">
              <h2>Expenses</h2>
              <span className="muted small">
                {loading ? 'Loading…' : `${expenses.length} ${expenses.length === 1 ? 'item' : 'items'}`}
              </span>
            </div>

            <div className="chips" role="tablist" aria-label="Filter by category">
              <button
                type="button"
                className={`chip ${category === '' ? 'active' : ''}`}
                onClick={() => setCategory('')}
              >
                All
              </button>
              {categories.map((c) => (
                <CategoryChip key={c} value={c} active={category === c} onClick={() => setCategory(category === c ? '' : c)} />
              ))}
            </div>

            <ExpenseList
              expenses={expenses}
              loading={loading}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
          </section>
        </div>
      </main>

      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function CategoryChip({ value, active, onClick }) {
  const { icon, color } = categoryMeta(value);
  return (
    <button
      type="button"
      className={`chip ${active ? 'active' : ''}`}
      style={active ? { '--chip': color } : undefined}
      onClick={onClick}
    >
      <span aria-hidden="true">{icon}</span> {formatCategory(value)}
    </button>
  );
}
