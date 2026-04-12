'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate, sendNotification } from '@/lib/helpers'
import StatusBadge from '@/components/StatusBadge'
import ProtectedRoute from '@/components/ProtectedRoute'
import toast from 'react-hot-toast'
import { Loader2, Check, X, Eye, ChevronDown, ChevronUp } from 'lucide-react'

export default function AdminSellersPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <SellersContent />
    </ProtectedRoute>
  )
}

function SellersContent() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending')
  const [expandedId, setExpandedId] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [processing, setProcessing] = useState(false)

  const fetchApps = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('seller_applications')
      .select('*, profiles!seller_applications_user_id_fkey(full_name, avatar_url, phone)')
      .eq('status', tab)
      .order('created_at', { ascending: false })
    setApplications(data || [])
    setLoading(false)
  }, [tab])

  useEffect(() => { fetchApps() }, [fetchApps])

  const handleApprove = async (app) => {
    setProcessing(true)
    const { data: { session } } = await supabase.auth.getSession()
    try {
      await supabase.from('seller_applications').update({
        status: 'approved', reviewed_by: session.user.id, reviewed_at: new Date().toISOString(),
      }).eq('id', app.id)
      await supabase.from('profiles').update({ role: 'seller', seller_status: 'approved' }).eq('id', app.user_id)
      await sendNotification(app.user_id, 'seller_approved', 'Your seller application has been approved! You can now create listings.', {})
      toast.success('Seller approved!')
      fetchApps()
    } catch { toast.error('Failed') }
    finally { setProcessing(false) }
  }

  const handleReject = async () => {
    if (!rejectModal) return
    setProcessing(true)
    const { data: { session } } = await supabase.auth.getSession()
    try {
      await supabase.from('seller_applications').update({
        status: 'rejected', admin_note: rejectNote, reviewed_by: session.user.id, reviewed_at: new Date().toISOString(),
      }).eq('id', rejectModal.id)
      await supabase.from('profiles').update({ seller_status: 'rejected' }).eq('id', rejectModal.user_id)
      await sendNotification(rejectModal.user_id, 'seller_rejected', `Your seller application was rejected. Reason: ${rejectNote}`, {})
      toast.success('Application rejected')
      setRejectModal(null)
      setRejectNote('')
      fetchApps()
    } catch { toast.error('Failed') }
    finally { setProcessing(false) }
  }

  const tabs = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ]

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Seller Applications</h1>

      <div className="flex gap-2 mb-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              tab === t.key ? 'bg-primary-600 text-white' : 'bg-white text-stone-600 border border-stone-200'
            }`}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
      ) : applications.length === 0 ? (
        <div className="text-center py-16 text-stone-400">No applications</div>
      ) : (
        <div className="space-y-4">
          {applications.map(app => (
            <div key={app.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-stone-800">{app.profiles?.full_name || 'Unknown'}</p>
                  <p className="text-sm text-stone-400">{app.business_name} · {app.business_type} · {app.city}, {app.state}</p>
                  <p className="text-xs text-stone-400 mt-1">Applied: {formatDate(app.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={app.status} />
                  <button onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                    className="p-2 text-stone-400 hover:text-stone-600 rounded">
                    {expandedId === app.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {app.status === 'pending' && (
                    <>
                      <button onClick={() => handleApprove(app)} disabled={processing}
                        className="p-2 text-emerald-500 hover:bg-emerald-50 rounded"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setRejectModal(app)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              </div>

              {expandedId === app.id && (
                <div className="px-5 pb-5 border-t border-stone-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div><span className="text-stone-400">Address:</span> <span className="text-stone-700">{app.address}</span></div>
                  <div><span className="text-stone-400">Phone:</span> <span className="text-stone-700">{app.profiles?.phone || 'N/A'}</span></div>
                  <div className="sm:col-span-2"><span className="text-stone-400">About:</span> <span className="text-stone-700">{app.about || 'N/A'}</span></div>
                  {app.id_proof_url && (
                    <div><a href={app.id_proof_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">View ID Proof</a></div>
                  )}
                  {app.farm_photo_url && (
                    <div><a href={app.farm_photo_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">View Farm Photo</a></div>
                  )}
                  {app.admin_note && (
                    <div className="sm:col-span-2 bg-red-50 text-red-700 p-3 rounded-xl text-xs"><strong>Admin Note:</strong> {app.admin_note}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRejectModal(null)} />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 animate-bounce-in shadow-2xl">
            <h3 className="text-lg font-bold text-stone-800 mb-4">Reject Application</h3>
            <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
              rows={3} className="input-field mb-4" placeholder="Reason for rejection..." />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)} className="flex-1 btn-ghost border border-stone-200">Cancel</button>
              <button onClick={handleReject} disabled={processing} className="flex-1 btn-danger">{processing ? 'Rejecting...' : 'Reject'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
