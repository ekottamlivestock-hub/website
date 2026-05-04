'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ProtectedRoute from '@/components/ProtectedRoute'
import toast from 'react-hot-toast'
import {
  Loader2, Plus, Trash2, Pause, Play, Megaphone, X,
} from 'lucide-react'

// Three colours the UI knows how to render. Mirrors the CHECK
// constraint in migration 021. If you ever add a fourth, update both
// places + ScrollingBar.js.
const COLOURS = [
  { value: 'red',   label: 'Red',   ring: 'ring-red-500',     dot: 'bg-red-500' },
  { value: 'green', label: 'Green', ring: 'ring-emerald-500', dot: 'bg-emerald-500' },
  { value: 'blue',  label: 'Blue',  ring: 'ring-blue-500',    dot: 'bg-blue-500' },
]

const dotClass = (color) =>
  COLOURS.find(c => c.value === color)?.dot || 'bg-surface-400'

export default function AdminScrollingPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <ScrollingContent />
    </ProtectedRoute>
  )
}

function ScrollingContent() {
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ text: '', color: 'green' })

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('scrolling_announcements')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (error) {
      toast.error('Failed to load announcements')
      setLoading(false)
      return
    }
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  const resetForm = () => {
    setForm({ text: '', color: 'green' })
    setShowForm(false)
  }

  const handleAdd = async (e) => {
    e?.preventDefault?.()
    const text = form.text.trim()
    if (!text) {
      toast.error('Announcement text is required')
      return
    }
    if (text.length > 200) {
      toast.error('Keep it under 200 characters')
      return
    }
    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { error } = await supabase
        .from('scrolling_announcements')
        .insert({
          text,
          color: form.color,
          is_active: true,
          created_by: session?.user?.id || null,
        })
      if (error) throw error
      toast.success('Announcement added')
      resetForm()
      fetchItems()
    } catch (err) {
      toast.error('Failed to add announcement')
    } finally {
      setSubmitting(false)
    }
  }

  const togglePause = async (item) => {
    const { error } = await supabase
      .from('scrolling_announcements')
      .update({ is_active: !item.is_active })
      .eq('id', item.id)
    if (error) {
      toast.error('Failed to update')
      return
    }
    toast.success(item.is_active ? 'Paused' : 'Resumed')
    fetchItems()
  }

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.text.slice(0, 60)}${item.text.length > 60 ? '…' : ''}"?`)) return
    const { error } = await supabase
      .from('scrolling_announcements')
      .delete()
      .eq('id', item.id)
    if (error) {
      toast.error('Failed to delete')
      return
    }
    toast.success('Deleted')
    fetchItems()
  }

  if (loading) {
    return (
      <div className="page-container flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  const activeCount = items.filter(i => i.is_active).length

  return (
    <div className="page-container max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-4 mb-6 flex-col sm:flex-row">
        <div>
          <div className="section-eyebrow">Sitewide</div>
          <h1 className="font-display text-display-md text-surface-ink">Scrolling announcements</h1>
          <p className="mt-1 text-sm text-surface-500">
            {activeCount === 0
              ? 'No live items — the bar is hidden across the site.'
              : `${activeCount} live ${activeCount === 1 ? 'item' : 'items'} scrolling on every page.`}
          </p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Add announcement
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          className="bg-white border border-surface-200/80 rounded-2xl p-6 shadow-soft mb-8"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary-700" />
              <span className="font-semibold text-surface-ink">New announcement</span>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="w-8 h-8 rounded-full hover:bg-surface-100 flex items-center justify-center text-surface-500"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <label className="input-label">Text</label>
              <input
                type="text"
                value={form.text}
                onChange={(e) => setForm(f => ({ ...f, text: e.target.value }))}
                maxLength={200}
                className="input-field"
                placeholder="e.g. New Gir cows added — 25 verified this week"
                autoFocus
              />
              <p className="mt-1 text-[11px] text-surface-400">{form.text.length} / 200</p>
            </div>

            <div>
              <label className="input-label">Bullet colour</label>
              <div className="flex gap-3">
                {COLOURS.map(c => {
                  const active = form.color === c.value
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color: c.value }))}
                      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all
                        ${active
                          ? 'bg-surface-ink text-surface-50 border-surface-ink'
                          : 'bg-white text-surface-600 border-surface-200 hover:border-surface-ink/40'}`}
                    >
                      <span className={`w-3 h-3 rounded-full ${c.dot} shadow-[0_0_0_3px_rgba(255,255,255,0.7)]`} />
                      <span className="text-sm font-semibold">{c.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Live preview */}
            <div>
              <label className="input-label">Preview</label>
              <div className="rounded-xl bg-surface-ink text-surface-50/95 px-5 py-3 flex items-center gap-3 overflow-hidden">
                <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass(form.color)} shadow-[0_0_8px_currentColor]`} />
                <span className="font-display italic text-[15px] tracking-wide truncate">
                  {form.text.trim() || 'Your announcement appears here…'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={resetForm} className="btn-ghost text-sm">
                Cancel
              </button>
              <button type="submit" disabled={submitting || !form.text.trim()} className="btn-primary text-sm">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {submitting ? 'Adding…' : 'Add announcement'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* List */}
      {items.length === 0 ? (
        <div className="bg-white border border-dashed border-surface-200 rounded-2xl py-16 text-center">
          <Megaphone className="w-8 h-8 text-surface-300 mx-auto mb-3" />
          <p className="text-surface-500 text-sm">No announcements yet.</p>
          <p className="text-surface-400 text-xs mt-1">
            Click <span className="font-semibold">Add announcement</span> to start the marquee.
          </p>
        </div>
      ) : (
        <ul className="bg-white border border-surface-200/80 rounded-2xl divide-y divide-surface-100 shadow-soft overflow-hidden">
          {items.map((item) => (
            <li
              key={item.id}
              className={`flex items-center gap-4 px-5 py-4 transition-colors
                ${item.is_active ? '' : 'bg-surface-50/60'}`}
            >
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotClass(item.color)}
                ${item.is_active ? 'shadow-[0_0_10px_currentColor]' : 'opacity-40'}`} />

              <div className="min-w-0 flex-1">
                <p className={`font-display italic text-[15px] tracking-wide truncate
                  ${item.is_active ? 'text-surface-ink' : 'text-surface-400 line-through'}`}>
                  {item.text}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-surface-400">
                  <span className="uppercase tracking-widest-plus font-semibold">
                    {item.color}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-surface-300" />
                  <span>{item.is_active ? 'Live' : 'Paused'}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => togglePause(item)}
                  className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-ink transition-colors"
                  aria-label={item.is_active ? 'Pause' : 'Resume'}
                  title={item.is_active ? 'Pause' : 'Resume'}
                >
                  {item.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="p-2 rounded-lg hover:bg-red-50 text-surface-500 hover:text-red-600 transition-colors"
                  aria-label="Delete"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
