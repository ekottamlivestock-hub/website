'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { INDIAN_STATES, formatDate } from '@/lib/helpers'
import StarRating from '@/components/StarRating'
import ProtectedRoute from '@/components/ProtectedRoute'
import toast from 'react-hot-toast'
import { Loader2, Save, User, MapPin, Phone, Mail, Star } from 'lucide-react'

export default function ProfilePage() {
  return (
    <ProtectedRoute requiredRole="any">
      <ProfileContent />
    </ProtectedRoute>
  )
}

function ProfileContent() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [reviews, setReviews] = useState([])
  const [form, setForm] = useState({ phone: '', state: '', city: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setLoading(false)
          return
        }
        setUser(session.user)

        const { data: prof, error: profErr } = await supabase
          .from('profiles').select('*').eq('id', session.user.id).maybeSingle()
        if (profErr) console.error('Profile fetch error:', profErr)
        setProfile(prof || null)
        setForm({ phone: prof?.phone || '', state: prof?.state || '', city: prof?.city || '' })

        const { data: revs, error: revErr } = await supabase
          .from('reviews').select('*, profiles!reviews_reviewer_id_fkey(full_name)')
          .eq('reviewee_id', session.user.id).order('created_at', { ascending: false })
        if (revErr) console.error('Reviews fetch error:', revErr)
        setReviews(revs || [])
      } catch (err) {
        console.error('Profile load error:', err)
        toast.error('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').update({
        phone: form.phone, state: form.state, city: form.city,
      }).eq('id', user.id)
      if (error) throw error
      toast.success('Profile updated!')
    } catch { toast.error('Failed to update') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="page-container flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null

  return (
    <div className="page-container max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">My Profile</h1>

      <div className="bg-white rounded-2xl border border-stone-100 p-6 shadow-sm mb-6">
        <div className="flex items-center gap-4 mb-6">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" width={64} height={64} className="rounded-full ring-4 ring-stone-100" />
          ) : (
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary-600" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-stone-800">{profile?.full_name || 'User'}</h2>
            <p className="text-sm text-stone-400 flex items-center gap-1"><Mail className="w-3 h-3" /> {user?.email}</p>
            <p className="text-xs text-stone-400 mt-1 capitalize">Role: {profile?.role} · Joined: {formatDate(profile?.created_at)}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="input-label flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</label>
            <input type="tel" id="phone" name="phone" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))}
              className="input-field" placeholder="10-digit mobile number" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label flex items-center gap-1"><MapPin className="w-3 h-3" /> State</label>
              <select id="state" name="state" value={form.state} onChange={e => setForm(f => ({...f, state: e.target.value}))} className="input-field">
                <option value="">Select State</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">City</label>
              <input type="text" id="city" name="city" value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))}
                className="input-field" placeholder="City" />
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Seller Stats */}
      {profile?.role === 'seller' && (
        <div className="bg-white rounded-2xl border border-stone-100 p-6 shadow-sm mb-6">
          <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-amber-400" /> Seller Stats</h3>
          <div className="flex items-center gap-6">
            {avgRating && (
              <div>
                <p className="text-2xl font-bold text-stone-800">{avgRating}</p>
                <StarRating rating={parseFloat(avgRating)} size={14} />
                <p className="text-xs text-stone-400">{reviews.length} reviews</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 p-6 shadow-sm">
          <h3 className="font-semibold text-stone-800 mb-4">Reviews Received</h3>
          <div className="space-y-4">
            {reviews.map(r => (
              <div key={r.id} className="border-b border-stone-50 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <StarRating rating={r.rating} size={14} />
                  <span className="text-xs text-stone-400">{formatDate(r.created_at)}</span>
                </div>
                {r.comment && <p className="text-sm text-stone-600">{r.comment}</p>}
                <p className="text-xs text-stone-400 mt-1">— {r.profiles?.full_name || 'Anonymous'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
