'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { slugify } from '@/lib/helpers'
import ProtectedRoute from '@/components/ProtectedRoute'
import toast from 'react-hot-toast'
import { Loader2, Plus, Edit2, Trash2, X, Save, ToggleLeft, ToggleRight } from 'lucide-react'

export default function AdminCategoriesPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <CategoriesContent />
    </ProtectedRoute>
  )
}

function CategoriesContent() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [submitting, setSubmitting] = useState(false)

  const fetchCategories = async () => {
    const { data } = await supabase.from('animal_categories').select('*').order('name')
    setCategories(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchCategories() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSubmitting(true)
    try {
      if (editId) {
        // Keep the slug stable on edit — bookmarked / indexed URLs like
        // /listings?category=cow would 404 if we re-derived the slug
        // from a renamed category. Only the display name and description
        // change here.
        await supabase.from('animal_categories').update({
          name: form.name, description: form.description
        }).eq('id', editId)
        toast.success('Category updated')
      } else {
        await supabase.from('animal_categories').insert({
          name: form.name, slug: slugify(form.name), description: form.description, is_active: true,
        })
        toast.success('Category added')
      }
      setForm({ name: '', description: '' })
      setEditId(null)
      setShowForm(false)
      fetchCategories()
    } catch { toast.error('Failed') }
    finally { setSubmitting(false) }
  }

  const toggleActive = async (id, current) => {
    await supabase.from('animal_categories').update({ is_active: !current }).eq('id', id)
    fetchCategories()
  }

  const deleteCategory = async (id) => {
    const { count } = await supabase.from('listings').select('*', { count: 'exact', head: true }).eq('category_id', id)
    if (count > 0) { toast.error('Cannot delete: listings exist in this category'); return }
    if (!confirm('Delete this category?')) return
    await supabase.from('animal_categories').delete().eq('id', id)
    toast.success('Category deleted')
    fetchCategories()
  }

  const startEdit = (cat) => {
    setForm({ name: cat.name, description: cat.description || '' })
    setEditId(cat.id)
    setShowForm(true)
  }

  if (loading) return <div className="page-container flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>

  return (
    <div className="page-container max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Animal Categories</h1>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', description: '' }) }}
          className="btn-primary text-sm flex items-center gap-1"><Plus className="w-4 h-4" /> Add</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-100 p-5 mb-6 shadow-sm space-y-4">
          <div>
            <label className="input-label">Category Name *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
              className="input-field" placeholder="e.g., Horse" required />
          </div>
          <div>
            <label className="input-label">Description</label>
            <input type="text" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
              className="input-field" placeholder="Brief description" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => { setShowForm(false); setEditId(null) }} className="btn-ghost border border-stone-200 text-sm">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary text-sm flex items-center gap-1">
              <Save className="w-4 h-4" /> {editId ? 'Update' : 'Add Category'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm divide-y divide-stone-50">
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center justify-between p-4 hover:bg-stone-50/50">
            <div>
              <p className="font-medium text-stone-800">{cat.name}</p>
              <p className="text-xs text-stone-400">{cat.slug} · {cat.description || 'No description'}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => toggleActive(cat.id, cat.is_active)}
                className={`p-1.5 rounded ${cat.is_active ? 'text-emerald-500' : 'text-stone-300'}`}>
                {cat.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              </button>
              <button onClick={() => startEdit(cat)} className="p-1.5 text-stone-400 hover:text-blue-600 rounded"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => deleteCategory(cat.id)} className="p-1.5 text-stone-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
