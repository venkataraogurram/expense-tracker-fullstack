import { useState } from 'react';
import { categoryMeta, formatCategory } from '../format.js';

function today() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY = { title: '', amount: '', category: 'FOOD', date: today(), notes: '' };

export default function ExpenseForm({ categories, initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ? { ...EMPTY, ...initial, notes: initial.notes || '' } : EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
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
    } catch (err) {
      // Server-side validation errors come back keyed by field name.
      setErrors(err.details || { _form: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <label className="field">
        <span>Title</span>
        <input
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="e.g. Groceries"
          maxLength={100}
          autoFocus={!!initial}
          className={errors.title ? 'invalid' : ''}
        />
        {errors.title && <em className="field-error">{errors.title}</em>}
      </label>

      <div className="row">
        <label className="field">
          <span>Amount</span>
          <div className={`adorned ${errors.amount ? 'invalid' : ''}`}>
            <span className="adornment">₹</span>
            <input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              placeholder="0.00"
            />
          </div>
          {errors.amount && <em className="field-error">{errors.amount}</em>}
        </label>
        <label className="field">
          <span>Date</span>
          <input
            type="date"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
            className={errors.date ? 'invalid' : ''}
          />
          {errors.date && <em className="field-error">{errors.date}</em>}
        </label>
      </div>

      <fieldset className="field">
        <legend>Category</legend>
        <div className="cat-grid">
          {categories.map((c) => {
            const { icon, color } = categoryMeta(c);
            const selected = form.category === c;
            return (
              <button
                key={c}
                type="button"
                className={`cat ${selected ? 'selected' : ''}`}
                style={selected ? { '--cat': color } : undefined}
                onClick={() => set('category', c)}
                aria-pressed={selected}
              >
                <span aria-hidden="true">{icon}</span>
                <small>{formatCategory(c)}</small>
              </button>
            );
          })}
        </div>
        {errors.category && <em className="field-error">{errors.category}</em>}
      </fieldset>

      <label className="field">
        <span>Notes <span className="muted">(optional)</span></span>
        <textarea
          rows={2}
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          maxLength={500}
          placeholder="Anything worth remembering"
        />
        {errors.notes && <em className="field-error">{errors.notes}</em>}
      </label>

      {errors._form && <div className="alert">{errors._form}</div>}

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
