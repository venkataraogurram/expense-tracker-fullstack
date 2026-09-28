import { useState } from 'react';
import { formatCategory } from '../format.js';

function today() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY = { title: '', amount: '', category: 'FOOD', date: today(), notes: '' };

export default function ExpenseForm({ categories, initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ? { ...EMPTY, ...initial } : EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await onSave({
        title: form.title.trim(),
        amount: form.amount === '' ? null : Number(form.amount),
        category: form.category,
        date: form.date,
        notes: form.notes.trim() || null,
      });
      if (!initial) setForm({ ...EMPTY, category: form.category, date: form.date });
      setErrors({});
      setMessage(initial ? 'Saved.' : 'Expense added.');
    } catch (err) {
      // Server-side validation errors come back keyed by field name.
      setErrors(err.details || { _form: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <label>
        Title
        <input
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Groceries"
          maxLength={100}
        />
        {errors.title && <span className="field-error">{errors.title}</span>}
      </label>

      <div className="row">
        <label>
          Amount
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            placeholder="0.00"
          />
          {errors.amount && <span className="field-error">{errors.amount}</span>}
        </label>
        <label>
          Date
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          {errors.date && <span className="field-error">{errors.date}</span>}
        </label>
      </div>

      <label>
        Category
        <select value={form.category} onChange={(e) => set('category', e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {formatCategory(c)}
            </option>
          ))}
        </select>
        {errors.category && <span className="field-error">{errors.category}</span>}
      </label>

      <label>
        Notes <span className="muted">(optional)</span>
        <textarea
          rows={2}
          value={form.notes || ''}
          onChange={(e) => set('notes', e.target.value)}
          maxLength={500}
        />
        {errors.notes && <span className="field-error">{errors.notes}</span>}
      </label>

      {errors._form && <div className="banner error">{errors._form}</div>}
      {message && <div className="banner ok">{message}</div>}

      <div className="actions">
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Add expense'}
        </button>
        {onCancel && (
          <button type="button" className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
