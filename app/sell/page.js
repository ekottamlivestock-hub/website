'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { INDIAN_STATES, VACCINATION_TAGS, sendNotification } from '@/lib/helpers'
import ImageUploader from '@/components/ImageUploader'
import ProtectedRoute from '@/components/ProtectedRoute'
import toast from 'react-hot-toast'
import { Loader2, Save, Send, X } from 'lucide-react'

export default function CreateListingPage() {
  return (
    <ProtectedRoute requiredRole="seller">
      <CreateListingContent />
    </ProtectedRoute>
  )
}

function CreateListingContent() {
  const [categories, setCategories] = useState([])
  const [breeds, setBreeds] = useState([])
  const [images, setImages] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({
    title: '', category_id: '', breed_id: '', description: '',
    price: '', price_type: 'fixed', quantity: 1,
    age_value: '', age_unit: 'months', gender: 'unknown',
    weight_kg: '', health_status: 'healthy',
    vaccination_tags: [], state: '', city: '',
  })
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user)
      const { data: cats } = await supabase
        .from('animal_categories')
        .select('*')
        .eq('is_active', true)
        .order('name')
      setCategories(cats || [])
    }
    init()
  }, [])

  useEffect(() => {
    const fetchBreeds = async () => {
      if (!form.category_id) { setBreeds([]); return }
      const { data } = await supabase
        .from('animal_breeds')
        .select('*')
        .eq('category_id', form.category_id)
        .eq('is_active', true)
        .order('name')
      setBreeds(data || [])
    }
    fetchBreeds()
  }, [form.category_id])

  const toggleVacTag = (tag) => {
    setForm(f => ({
      ...f,
      vaccination_tags: f.vaccination_tags.includes(tag)
        ? f.vaccination_tags.filter(t => t !== tag)
        : [...f.vaccination_tags, tag]
    }))
  }

  const handleSubmit = async (status) => {
    if (!form.title || !form.category_id || !form.price) {
      toast.error('Please fill in title, category, and price')
      return
    }
    setSubmitting(true)
    try {
      const { data: listing, error } = await supabase
        .from('listings')
        .insert({
          seller_id: user.id,
          title: form.title,
          category_id: form.category_id,
          breed_id: form.breed_id || null,
          description: form.description,
          price: parseFloat(form.price),
          price_type: form.price_type,
          quantity: parseInt(form.quantity) || 1,
          age_value: form.age_value ? parseInt(form.age_value) : null,
          age_unit: form.age_value ? form.age_unit : null,
          gender: form.gender,
          weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
          health_status: form.health_status,
          vaccination_tags: form.vaccination_tags,
          state: form.state,
          city: form.city,
          status: status,
        })
        .select()
        .single()

      if (error) throw error

      // Upload media
      if (images.length > 0) {
        const mediaRows = images.map((url, i) => ({
          listing_id: listing.id,
          url,
          media_type: 'image',
          sort_order: i,
        }))
        await supabase.from('listing_media').insert(mediaRows)
      }

      // Notify admin if submitting for review
      if (status === 'pending_review') {
        const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
        for (const admin of (admins || [])) {
          await sendNotification(admin.id, 'new_listing_pending',
            `New listing "${form.title}" needs review`,
            { listing_id: listing.id })
        }
      }

      toast.success(status === 'draft' ? 'Draft saved!' : 'Listing submitted for review!')
      router.push('/seller/listings')
    } catch (err) {
      toast.error('Failed to create listing')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-container max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Create New Listing</h1>

      <div className="bg-white rounded-2xl border border-stone-100 p-6 shadow-sm space-y-6">
        {/* Title */}
        <div>
          <label className="input-label">Title *</label>
          <input type="text" id="title" name="title" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
            className="input-field" placeholder="e.g., 2 Year Old Gir Cow, Healthy & Vaccinated" required />
        </div>

        {/* Category & Breed */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="input-label">Category *</label>
            <select id="category_id" name="category_id" value={form.category_id} onChange={e => setForm(f => ({...f, category_id: e.target.value, breed_id: ''}))}
              className="input-field" required>
              <option value="">Select Category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Breed</label>
            <select id="breed_id" name="breed_id" value={form.breed_id} onChange={e => setForm(f => ({...f, breed_id: e.target.value}))}
              className="input-field" disabled={!form.category_id}>
              <option value="">Select Breed</option>
              {breeds.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="input-label">Description</label>
          <textarea id="description" name="description" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
            rows={4} className="input-field" placeholder="Describe your animal in detail — breed quality, milk yield, temperament, etc." />
        </div>

        {/* Price */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="input-label">Price (₹) *</label>
            <input type="number" id="price" name="price" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))}
              className="input-field" placeholder="Enter price" min="0" required />
          </div>
          <div>
            <label className="input-label">Price Type</label>
            <select id="price_type" name="price_type" value={form.price_type} onChange={e => setForm(f => ({...f, price_type: e.target.value}))} className="input-field">
              <option value="fixed">Fixed Price</option>
              <option value="negotiable">Negotiable</option>
              <option value="auction">Auction</option>
            </select>
          </div>
        </div>

        {/* Quantity, Age, Gender */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="input-label">Quantity</label>
            <input type="number" id="quantity" name="quantity" value={form.quantity} onChange={e => setForm(f => ({...f, quantity: e.target.value}))}
              className="input-field" min="1" />
          </div>
          <div>
            <label className="input-label">Age</label>
            <input type="number" id="age_value" name="age_value" value={form.age_value} onChange={e => setForm(f => ({...f, age_value: e.target.value}))}
              className="input-field" placeholder="Age" min="0" />
          </div>
          <div>
            <label className="input-label">Unit</label>
            <select id="age_unit" name="age_unit" value={form.age_unit} onChange={e => setForm(f => ({...f, age_unit: e.target.value}))} className="input-field">
              <option value="days">Days</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>
          <div>
            <label className="input-label">Weight (kg)</label>
            <input type="number" id="weight_kg" name="weight_kg" value={form.weight_kg} onChange={e => setForm(f => ({...f, weight_kg: e.target.value}))}
              className="input-field" placeholder="Optional" min="0" />
          </div>
        </div>

        {/* Gender */}
        <div>
          <label className="input-label">Gender</label>
          <div className="flex gap-3">
            {['male', 'female', 'unknown'].map(g => (
              <label key={g} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all ${
                form.gender === g ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-stone-200 text-stone-600'
              }`}>
                <input type="radio" name="gender" value={g} checked={form.gender === g}
                  onChange={e => setForm(f => ({...f, gender: e.target.value}))} className="sr-only" />
                <span className="text-sm font-medium capitalize">{g}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Health Status */}
        <div>
          <label className="input-label">Health Status</label>
          <select id="health_status" name="health_status" value={form.health_status} onChange={e => setForm(f => ({...f, health_status: e.target.value}))} className="input-field">
            <option value="healthy">Healthy</option>
            <option value="vaccinated">Vaccinated</option>
            <option value="certified">Certified</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>

        {/* Vaccination Tags */}
        <div>
          <label className="input-label">Vaccination Tags</label>
          <div className="flex flex-wrap gap-2">
            {VACCINATION_TAGS.map(tag => (
              <button key={tag} type="button" onClick={() => toggleVacTag(tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  form.vaccination_tags.includes(tag)
                    ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}>
                {form.vaccination_tags.includes(tag) && '✓ '}{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="input-label">State</label>
            <select id="state" name="state" value={form.state} onChange={e => setForm(f => ({...f, state: e.target.value}))} className="input-field">
              <option value="">Select State</option>
              {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">City</label>
            <input type="text" id="city" name="city" value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))}
              className="input-field" placeholder="City / Village" />
          </div>
        </div>

        {/* Images */}
        <div>
          <label className="input-label">Photos</label>
          <ImageUploader images={images} onImagesChange={setImages} folder={user?.id} maxFiles={6} />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-stone-100">
          <button onClick={() => handleSubmit('draft')} disabled={submitting}
            className="flex-1 btn-ghost border border-stone-200 flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> Save as Draft
          </button>
          <button onClick={() => handleSubmit('pending_review')} disabled={submitting}
            className="flex-1 btn-primary flex items-center justify-center gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? 'Submitting...' : 'Submit for Review'}
          </button>
        </div>
      </div>
    </div>
  )
}
