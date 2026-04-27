'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate, sendNotification } from '@/lib/helpers'
import StatusBadge from '@/components/StatusBadge'
import ProtectedRoute from '@/components/ProtectedRoute'
import toast from 'react-hot-toast'
import { Loader2, Check, X, ChevronDown, ChevronUp, PauseCircle, PlayCircle, Trash2 } from 'lucide-react'

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
  const [confirmModal, setConfirmModal] = useState(null) // { type: 'suspend'|'unsuspend'|'remove', app }

  const fetchApps = useCallback(async () => {
    setLoading(true)
    const query = supabase
      .from('seller_applications')
      .select('*, profiles!seller_applications_user_id_fkey(full_name, avatar_url, phone, role, seller_status)')
      .order('created_at', { ascending: false })

    // For the "suspended" tab we filter by seller_status on the profile
    if (tab === 'suspended') {
      // Suspended sellers still have an approved application — filter by profile status
      const { data } = await supabase
        .from('seller_applications')
        .select('*, profiles!seller_applications_user_id_fkey(full_name, avatar_url, phone, role, seller_status)')
        .eq('status', 'approved')
        .eq('profiles.seller_status', 'suspended')
        .order('created_at', { ascending: false })
      setApplications((data || []).filter(a => a.profiles?.seller_status === 'suspended'))
    } else {
      const { data } = await query.eq('status', tab)
      setApplications(data || [])
    }
    setLoading(false)
  }, [tab])

  useEffect(() => { fetchApps() }, [fetchApps])

  // Helper to get admin session safely
  const getAdminSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error || !session) throw new Error('Admin session not found. Please log in again.')
    return session
  }

  // Updates a row and verifies a row was actually changed. Supabase silently
  // returns 0 rows when RLS blocks an UPDATE — without this check, a missing
  // policy would look like a success.
  const updateOrThrow = async (table, patch, match, label) => {
    const { data, error } = await supabase
      .from(table)
      .update(patch)
      .match(match)
      .select()
    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error(
        `${label} update affected 0 rows — likely an RLS policy is blocking it. Run the latest migration.`
      )
    }
    return data
  }

  const handleApprove = async (app) => {
    setProcessing(true)
    try {
      const session = await getAdminSession()
      await updateOrThrow(
        'seller_applications',
        {
          status: 'approved',
          reviewed_by: session.user.id,
          reviewed_at: new Date().toISOString(),
        },
        { id: app.id },
        'Application'
      )

      await updateOrThrow(
        'profiles',
        { role: 'seller', seller_status: 'approved' },
        { id: app.user_id },
        'Profile'
      )

      await sendNotification(
        app.user_id,
        'seller_approved',
        'Your seller application has been approved! You can now create listings.',
        {}
      )
      toast.success('Seller approved!')
      fetchApps()
    } catch (err) {
      toast.error(err.message || 'Failed to approve seller')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!rejectModal) return
    setProcessing(true)
    try {
      const session = await getAdminSession()
      await updateOrThrow(
        'seller_applications',
        {
          status: 'rejected',
          admin_note: rejectNote,
          reviewed_by: session.user.id,
          reviewed_at: new Date().toISOString(),
        },
        { id: rejectModal.id },
        'Application'
      )

      await updateOrThrow(
        'profiles',
        { seller_status: 'rejected' },
        { id: rejectModal.user_id },
        'Profile'
      )

      await sendNotification(
        rejectModal.user_id,
        'seller_rejected',
        `Your seller application was rejected. Reason: ${rejectNote}`,
        {}
      )
      toast.success('Application rejected')
      setRejectModal(null)
      setRejectNote('')
      fetchApps()
    } catch (err) {
      toast.error(err.message || 'Failed to reject application')
    } finally {
      setProcessing(false)
    }
  }

  const handleSuspend = async (app) => {
    setProcessing(true)
    try {
      await getAdminSession()
      await updateOrThrow(
        'profiles',
        { role: 'buyer', seller_status: 'suspended' },
        { id: app.user_id },
        'Profile'
      )

      await sendNotification(
        app.user_id,
        'seller_suspended',
        'Your seller account has been suspended by the admin. Please contact support for more information.',
        {}
      )
      toast.success('Seller suspended')
      setConfirmModal(null)
      fetchApps()
    } catch (err) {
      toast.error(err.message || 'Failed to suspend seller')
    } finally {
      setProcessing(false)
    }
  }

  const handleUnsuspend = async (app) => {
    setProcessing(true)
    try {
      await getAdminSession()
      await updateOrThrow(
        'profiles',
        { role: 'seller', seller_status: 'approved' },
        { id: app.user_id },
        'Profile'
      )

      await sendNotification(
        app.user_id,
        'seller_reactivated',
        'Your seller account has been reactivated. You can now create listings again.',
        {}
      )
      toast.success('Seller reactivated')
      setConfirmModal(null)
      fetchApps()
    } catch (err) {
      toast.error(err.message || 'Failed to reactivate seller')
    } finally {
      setProcessing(false)
    }
  }

  const handleRemove = async (app) => {
    setProcessing(true)
    try {
      await getAdminSession()
      // Revoke seller role and reset to not_applied (NOT NULL column).
      await updateOrThrow(
        'profiles',
        { role: 'buyer', seller_status: 'not_applied' },
        { id: app.user_id },
        'Profile'
      )

      // Mark the application as rejected/removed
      await updateOrThrow(
        'seller_applications',
        { status: 'rejected', admin_note: 'Seller removed by admin.' },
        { id: app.id },
        'Application'
      )

      await sendNotification(
        app.user_id,
        'seller_removed',
        'Your seller account has been removed by the admin. You may reapply in the future.',
        {}
      )
      toast.success('Seller removed')
      setConfirmModal(null)
      fetchApps()
    } catch (err) {
      toast.error(err.message || 'Failed to remove seller')
    } finally {
      setProcessing(false)
    }
  }

  const handleConfirm = async () => {
    if (!confirmModal) return
    const { type, app } = confirmModal
    if (type === 'suspend') await handleSuspend(app)
    else if (type === 'unsuspend') await handleUnsuspend(app)
    else if (type === 'remove') await handleRemove(app)
  }

  const tabs = [
    { key: 'pending',  label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'suspended', label: 'Suspended' },
    { key: 'rejected', label: 'Rejected' },
  ]

  const confirmLabels = {
    suspend:   { title: 'Suspend Seller?',    desc: 'This will revoke their seller role. They will no longer be able to create listings.', btn: 'Suspend', color: 'btn-danger' },
    unsuspend: { title: 'Reactivate Seller?', desc: 'This will restore their seller role and allow them to create listings again.',           btn: 'Reactivate', color: 'btn-primary' },
    remove:    { title: 'Remove Seller?',     desc: 'This will permanently revoke their seller status. They will need to reapply.',           btn: 'Remove', color: 'btn-danger' },
  }

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Seller Management</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              tab === t.key ? 'bg-primary-600 text-white' : 'bg-white text-stone-600 border border-stone-200'
            }`}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-16 text-stone-400">No applications</div>
      ) : (
        <div className="space-y-4">
          {applications.map(app => {
            const isSuspended = app.profiles?.seller_status === 'suspended'
            return (
              <div key={app.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-stone-800">{app.profiles?.full_name || 'Unknown'}</p>
                    <p className="text-sm text-stone-400">{app.business_name} · {app.business_type} · {app.city}, {app.state}</p>
                    <p className="text-xs text-stone-400 mt-1">Applied: {formatDate(app.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={isSuspended ? 'suspended' : app.status} />

                    <button onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                      className="p-2 text-stone-400 hover:text-stone-600 rounded">
                      {expandedId === app.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {/* Pending: approve / reject */}
                    {app.status === 'pending' && (
                      <>
                        <button onClick={() => handleApprove(app)} disabled={processing}
                          title="Approve"
                          className="p-2 text-emerald-500 hover:bg-emerald-50 rounded">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setRejectModal(app)}
                          title="Reject"
                          className="p-2 text-red-500 hover:bg-red-50 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {/* Approved: suspend + remove */}
                    {app.status === 'approved' && !isSuspended && (
                      <>
                        <button
                          onClick={() => setConfirmModal({ type: 'suspend', app })}
                          disabled={processing}
                          title="Suspend seller"
                          className="p-2 text-amber-500 hover:bg-amber-50 rounded"
                        >
                          <PauseCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmModal({ type: 'remove', app })}
                          disabled={processing}
                          title="Remove seller"
                          className="p-2 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {/* Suspended tab: reactivate + remove */}
                    {isSuspended && (
                      <>
                        <button
                          onClick={() => setConfirmModal({ type: 'unsuspend', app })}
                          disabled={processing}
                          title="Reactivate seller"
                          className="p-2 text-emerald-500 hover:bg-emerald-50 rounded"
                        >
                          <PlayCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmModal({ type: 'remove', app })}
                          disabled={processing}
                          title="Remove seller"
                          className="p-2 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                      <div className="sm:col-span-2 bg-red-50 text-red-700 p-3 rounded-xl text-xs">
                        <strong>Admin Note:</strong> {app.admin_note}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRejectModal(null)} />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-stone-800 mb-4">Reject Application</h3>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
              className="input-field mb-4"
              placeholder="Reason for rejection..."
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)} className="flex-1 btn-ghost border border-stone-200">Cancel</button>
              <button onClick={handleReject} disabled={processing} className="flex-1 btn-danger">
                {processing ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend / Unsuspend / Remove Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmModal(null)} />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-stone-800 mb-2">
              {confirmLabels[confirmModal.type].title}
            </h3>
            <p className="text-sm text-stone-500 mb-6">
              <span className="font-semibold text-stone-700">{confirmModal.app.profiles?.full_name}</span> — {confirmLabels[confirmModal.type].desc}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} className="flex-1 btn-ghost border border-stone-200">Cancel</button>
              <button
                onClick={handleConfirm}
                disabled={processing}
                className={`flex-1 ${confirmLabels[confirmModal.type].color}`}
              >
                {processing ? 'Processing...' : confirmLabels[confirmModal.type].btn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
