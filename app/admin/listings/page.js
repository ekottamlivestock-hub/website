'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatPrice, formatDate, sendNotification } from '@/lib/helpers'
import StatusBadge from '@/components/StatusBadge'
import ProtectedRoute from '@/components/ProtectedRoute'
import toast from 'react-hot-toast'
import { Loader2, Check, X, MessageCircle, Eye } from 'lucide-react'

export default function AdminListingsPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <ListingsContent />
    </ProtectedRoute>
  )
}

function ListingsContent() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending_review')
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [processing, setProcessing] = useState(false)

  const fetchListings = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('listings')
      .select(`*, profiles(full_name, avatar_url), animal_categories(name), listing_media(url, sort_order)`)
      .order('created_at', { ascending: false })

    if (tab !== 'all') query = query.eq('status', tab)

    const { data } = await query
    setListings(data || [])
    setLoading(false)
  }, [tab])

  useEffect(() => { fetchListings() }, [fetchListings])

  const handleAction = async (listing, action, note = '') => {
    setProcessing(true)
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const newStatus = action === 'approved' ? 'approved' : 'rejected'
      await supabase.from('listings').update({ status: newStatus }).eq('id', listing.id)
      await supabase.from('listing_approvals').insert({
        listing_id: listing.id, admin_id: session.user.id, action, note,
      })

      const notifType = action === 'approved' ? 'listing_approved' : 'listing_rejected'
      const msg = action === 'approved'
        ? `Your listing "${listing.title}" has been approved!`
        : `Your listing "${listing.title}" was rejected. Reason: ${note}`
      await sendNotification(listing.seller_id, notifType, msg, { listing_id: listing.id })

      toast.success(`Listing ${action}`)
      setRejectModal(null)
      setRejectNote('')
      fetchListings()
    } catch { toast.error('Action failed') }
    finally { setProcessing(false) }
  }

  const tabs = [
    { key: 'pending_review', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all', label: 'All' },
  ]

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Manage Listings</h1>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.key ? 'bg-primary-600 text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 text-stone-400">No listings in this category</div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50/50 border-b border-stone-100">
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Listing</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500 hidden sm:table-cell">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500 hidden md:table-cell">Seller</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Price</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500 hidden md:table-cell">Date</th>
                  <th className="px-4 py-3 text-right font-medium text-stone-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {listings.map(l => (
                  <tr key={l.id} className="hover:bg-stone-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {l.listing_media?.[0]?.url && (
                          <Image src={l.listing_media[0].url} alt="" width={40} height={40} className="w-10 h-10 rounded-lg object-cover" />
                        )}
                        <span className="font-medium text-stone-700 truncate max-w-[180px]">{l.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-500 hidden sm:table-cell">{l.animal_categories?.name}</td>
                    <td className="px-4 py-3 text-stone-500 hidden md:table-cell">{l.profiles?.full_name}</td>
                    <td className="px-4 py-3 font-semibold text-primary-600">{formatPrice(l.price)}</td>
                    <td className="px-4 py-3"><StatusBadge status={l.status} size="xs" /></td>
                    <td className="px-4 py-3 text-stone-400 hidden md:table-cell">{formatDate(l.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/listings/${l.id}`} className="p-1.5 text-stone-400 hover:text-stone-600 rounded"><Eye className="w-4 h-4" /></Link>
                        {l.status === 'pending_review' && (
                          <>
                            <button onClick={() => handleAction(l, 'approved')} disabled={processing}
                              className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setRejectModal(l)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRejectModal(null)} />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 animate-bounce-in shadow-2xl">
            <h3 className="text-lg font-bold text-stone-800 mb-4">Reject Listing</h3>
            <p className="text-sm text-stone-500 mb-3">Listing: <strong>{rejectModal.title}</strong></p>
            <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
              rows={3} className="input-field mb-4" placeholder="Reason for rejection..." />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)} className="flex-1 btn-ghost border border-stone-200">Cancel</button>
              <button onClick={() => handleAction(rejectModal, 'rejected', rejectNote)} disabled={processing}
                className="flex-1 btn-danger">{processing ? 'Rejecting...' : 'Reject'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
