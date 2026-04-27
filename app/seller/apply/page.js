'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { INDIAN_STATES, sendNotification } from '@/lib/helpers'
import ImageUploader from '@/components/ImageUploader'
import ProtectedRoute from '@/components/ProtectedRoute'
import toast from 'react-hot-toast'
import { Store, Clock, XCircle, CheckCircle, Loader2 } from 'lucide-react'

export default function SellerApplyPage() {
  return (
    <ProtectedRoute requiredRole="any">
      <ApplyContent />
    </ProtectedRoute>
  )
}

function ApplyContent() {
  const [profile, setProfile] = useState(null)
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    business_name: '', business_type: 'individual', state: '', city: '', address: '', about: '',
  })
  const [idProofUrl, setIdProofUrl] = useState([])
  const [farmPhotoUrl, setFarmPhotoUrl] = useState([])
  const [existingApp, setExistingApp] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setUserId(session.user.id)

      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()
      if (profErr) console.error('Profile fetch error:', profErr)
      setProfile(prof || null)

      if (prof?.seller_status === 'approved') {
        router.push('/seller/dashboard')
        return
      }

      // Check existing application
      const { data: app } = await supabase
        .from('seller_applications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setExistingApp(app)
      setLoading(false)
    }
    fetchData()
  }, [router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.business_name || !form.state || !form.city || !form.address) {
      toast.error('Please fill in all required fields')
      return
    }
    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      const { error } = await supabase.from('seller_applications').insert({
        user_id: session.user.id,
        business_name: form.business_name,
        business_type: form.business_type,
        state: form.state,
        city: form.city,
        address: form.address,
        about: form.about,
        id_proof_url: idProofUrl[0] || null,
        farm_photo_url: farmPhotoUrl[0] || null,
        status: 'pending',
      })
      if (error) throw error

      // Update profile
      await supabase
        .from('profiles')
        .update({ seller_status: 'pending', seller_requested_at: new Date().toISOString() })
        .eq('id', session.user.id)

      // Notify admin(s)
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
      for (const admin of (admins || [])) {
        await sendNotification(admin.id, 'new_seller_application', 
          `New seller application from ${profile?.full_name || 'a user'}`,
          { user_id: session.user.id })
      }

      toast.success('Application submitted successfully!')
      router.push('/')
    } catch (err) {
      toast.error('Failed to submit application')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="page-container flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
  }

  // Pending status
  if (profile?.seller_status === 'pending') {
    return (
      <div className="page-container max-w-lg mx-auto text-center py-20">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-stone-800 mb-2">Application Under Review</h1>
        <p className="text-stone-500 mb-6">Your seller application is being reviewed by our team. You&apos;ll receive a notification once it&apos;s processed.</p>
        <button onClick={() => router.push('/')} className="btn-outline">Go Home</button>
      </div>
    )
  }

  // Rejected status
  if (profile?.seller_status === 'rejected' && existingApp?.status === 'rejected') {
    return (
      <div className="page-container max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-stone-800 mb-2">Application Rejected</h1>
          {existingApp?.admin_note && (
            <div className="bg-red-50 text-red-700 text-sm p-4 rounded-xl mt-4 text-left">
              <strong>Rejection Reason:</strong> {existingApp.admin_note}
            </div>
          )}
          <p className="text-stone-500 mt-4 mb-6">You can reapply with updated information below.</p>
        </div>
        <ApplicationForm form={form} setForm={setForm} idProofUrl={idProofUrl} setIdProofUrl={setIdProofUrl}
          farmPhotoUrl={farmPhotoUrl} setFarmPhotoUrl={setFarmPhotoUrl} onSubmit={handleSubmit} submitting={submitting}
          userId={userId} />
      </div>
    )
  }

  return (
    <div className="page-container max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Store className="w-10 h-10 text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-stone-800 mb-2">Become a Seller</h1>
        <p className="text-stone-500">Fill in your details to start selling on ekottam. Applications are reviewed within 24 hours.</p>
      </div>
      <ApplicationForm form={form} setForm={setForm} idProofUrl={idProofUrl} setIdProofUrl={setIdProofUrl}
        farmPhotoUrl={farmPhotoUrl} setFarmPhotoUrl={setFarmPhotoUrl} onSubmit={handleSubmit} submitting={submitting}
        userId={userId} />
    </div>
  )
}

function ApplicationForm({ form, setForm, idProofUrl, setIdProofUrl, farmPhotoUrl, setFarmPhotoUrl, onSubmit, submitting, userId }) {
  return (
    <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-stone-100 p-6 shadow-sm space-y-5">
      <div>
        <label className="input-label">Business Name *</label>
        <input type="text" id="business_name" name="business_name" value={form.business_name} onChange={e => setForm(f => ({...f, business_name: e.target.value}))}
          className="input-field" placeholder="Your farm or business name" required />
      </div>
      <div>
        <label className="input-label">Business Type *</label>
        <select id="business_type" name="business_type" value={form.business_type} onChange={e => setForm(f => ({...f, business_type: e.target.value}))} className="input-field">
          <option value="individual">Individual Farmer</option>
          <option value="farm">Farm / FPO</option>
          <option value="dealer">Dealer / Trader</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="input-label">State *</label>
          <select id="state" name="state" value={form.state} onChange={e => setForm(f => ({...f, state: e.target.value}))} className="input-field" required>
            <option value="">Select State</option>
            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="input-label">City *</label>
          <input type="text" id="city" name="city" value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))}
            className="input-field" placeholder="City" required />
        </div>
      </div>
      <div>
        <label className="input-label">Full Address *</label>
        <textarea id="address" name="address" value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))}
          rows={3} className="input-field" placeholder="Complete farm/business address" required />
      </div>
      <div>
        <label className="input-label">About Yourself</label>
        <textarea id="about" name="about" value={form.about} onChange={e => setForm(f => ({...f, about: e.target.value}))}
          rows={3} className="input-field" placeholder="Tell us about your experience in animal trading..." />
      </div>
      <div>
        <label className="input-label">ID Proof (Upload)</label>
        <ImageUploader bucket="seller-docs" folder={userId} maxFiles={1} images={idProofUrl} onImagesChange={setIdProofUrl} />
      </div>
      <div>
        <label className="input-label">Farm Photo (Optional)</label>
        <ImageUploader bucket="seller-docs" folder={userId} maxFiles={1} images={farmPhotoUrl} onImagesChange={setFarmPhotoUrl} />
      </div>
      <button type="submit" disabled={submitting} className="w-full btn-primary flex items-center justify-center gap-2">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Store className="w-4 h-4" />}
        {submitting ? 'Submitting...' : 'Submit Application'}
      </button>
    </form>
  )
}
