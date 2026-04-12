'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ProtectedRoute from '@/components/ProtectedRoute'
import toast from 'react-hot-toast'
import { Loader2, Plus, Edit2, Trash2, Save, ToggleLeft, ToggleRight } from 'lucide-react'

export default function AdminBreedsPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <BreedsContent />
    </ProtectedRoute>
  )
}

function BreedsContent() {
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [breeds, setBreeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchCats = async () => {
      const { data } = await supabase.from('animal_categories').select('*').order('name')
      setCategories(data || [])
      if (data?.length > 0) setSelectedCategory(data[0].id)
      setLoading(false)
    }
    fetchCats()
  }, [])

  useEffect(() => {
    if (!selectedCategory) return
    const fetchBreeds = async () => {
      const { data } = await supabase.from('animal_breeds').select('*').eq('category_id', selectedCategory).order('name')
      setBreeds(data || [])
    }
    fetchBreeds()
  }, [selectedCategory])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Name required'); return }
    setSubmitting(true)
    try {
      if (editId) {
        await supabase.from('animal_breeds').update({ name: form.name, description: form.description }).eq('id', editId)
        toast.success('Breed updated')
      } else {
        await supabase.from('animal_breeds').insert({
          category_id: selectedCategory, name: form.name, description: form.description, is_active: true,
        })
        toast.success('Breed added')
      }
      setForm({ name: '', description: '' }); setEditId(null); setShowForm(false)
      const { data } = await supabase.from('animal_breeds').select('*').eq('category_id', selectedCategory).order('name')
      setBreeds(data || [])
    } catch { toast.error('Failed') }
    finally { setSubmitting(false) }
  }

  const toggleActive = async (id, current) => {
    await supabase.from('animal_breeds').update({ is_active: !current }).eq('id', id)
    const { data } = await supabase.from('animal_breeds').select('*').eq('category_id', selectedCategory).order('name')
    setBreeds(data || [])
  }

  const deleteBreed = async (id) => {
    const { count } = await supabase.from('listings').select('*', { count: 'exact', head: true }).eq('breed_id', id)
    if (count > 0) { toast.error('Cannot delete: listings use this breed'); return }
    if (!confirm('Delete this breed?')) return
    await supabase.from('animal_breeds').delete().eq('id', id)
    toast.success('Breed deleted')
    const { data } = await supabase.from('animal_breeds').select('*').eq('category_id', selectedCategory).order('name')
    setBreeds(data || [])
  }

  if (loading) return <div className="page-container flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>

  return (
    <div className="page-container max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Manage Breeds</h1>

      <div className="flex items-center gap-4 mb-6">
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="input-field max-w-xs">
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', description: '' }) }}
          className="btn-primary text-sm flex items-center gap-1"><Plus className="w-4 h-4" /> Add Breed</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-100 p-5 mb-6 shadow-sm space-y-4">
          <div>
            <label className="input-label">Breed Name *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
              className="input-field" placeholder="e.g., Gir" required />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost border border-stone-200 text-sm">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary text-sm"><Save className="w-4 h-4 inline mr-1" /> {editId ? 'Update' : 'Add Breed'}</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm divide-y divide-stone-50">
        {breeds.length === 0 ? (
          <div className="p-8 text-center text-stone-400 text-sm">No breeds for this category</div>
        ) : breeds.map(b => (
          <div key={b.id} className="flex items-center justify-between p-4">
            <p className="font-medium text-stone-700">{b.name}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => toggleActive(b.id, b.is_active)} className={b.is_active ? 'text-emerald-500' : 'text-stone-300'}>
                {b.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              </button>
              <button onClick={() => { setForm({ name: b.name, description: '' }); setEditId(b.id); setShowForm(true) }}
                className="p-1.5 text-stone-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => deleteBreed(b.id)} className="p-1.5 text-stone-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
