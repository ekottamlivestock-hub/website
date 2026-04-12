'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatPrice, formatDate } from '@/lib/helpers'
import StatusBadge from '@/components/StatusBadge'
import StarRating from '@/components/StarRating'
import ProtectedRoute from '@/components/ProtectedRoute'
import toast from 'react-hot-toast'
import { Loader2, X, MessageSquare } from 'lucide-react'

export default function BuyerOrdersPage() {
  return (
    <ProtectedRoute requiredRole="any">
      <OrdersContent />
    </ProtectedRoute>
  )
}

function OrdersContent() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [reviewModal, setReviewModal] = useState(null)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [submitting, setSubmitting] = useState(false)

  const fetchOrders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase
      .from('orders')
      .select('*, listings(title, seller_id), reviews(id)')
      .eq('buyer_id', session.user.id)
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchOrders() }, [])

  const submitReview = async () => {
    if (!reviewForm.rating) { toast.error('Please select a rating'); return }
    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { error } = await supabase.from('reviews').insert({
        order_id: reviewModal.id,
        reviewer_id: session.user.id,
        reviewee_id: reviewModal.listings?.seller_id,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      })
      if (error) throw error
      toast.success('Review submitted!')
      setReviewModal(null)
      setReviewForm({ rating: 5, comment: '' })
      fetchOrders()
    } catch {
      toast.error('Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="page-container flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>

  const statusSteps = ['pending', 'confirmed', 'shipped', 'delivered']

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">My Orders</h1>
      {orders.length === 0 ? (
        <div className="text-center py-16 text-stone-400">No orders yet</div>
      ) : (
        <div className="space-y-4">
          {orders.map(o => {
            const currentStep = statusSteps.indexOf(o.status)
            const hasReview = o.reviews && o.reviews.length > 0
            return (
              <div key={o.id} className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="font-semibold text-stone-800">{o.listings?.title || 'Order'}</p>
                    <p className="text-xs text-stone-400">Qty: {o.quantity} · {formatDate(o.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-primary-600">{formatPrice(o.total_price)}</span>
                    <StatusBadge status={o.status} />
                  </div>
                </div>

                {/* Status Timeline */}
                {o.status !== 'cancelled' && (
                  <div className="flex items-center gap-1 mb-4">
                    {statusSteps.map((step, i) => (
                      <div key={step} className="flex items-center flex-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          i <= currentStep ? 'bg-primary-600 text-white' : 'bg-stone-200 text-stone-400'
                        }`}>{i + 1}</div>
                        {i < statusSteps.length - 1 && (
                          <div className={`flex-1 h-1 mx-1 rounded ${
                            i < currentStep ? 'bg-primary-600' : 'bg-stone-200'
                          }`} />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Review Button */}
                {o.status === 'delivered' && !hasReview && (
                  <button onClick={() => setReviewModal(o)}
                    className="btn-outline text-xs px-4 py-2 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Leave Review
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setReviewModal(null)} />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 animate-bounce-in shadow-2xl">
            <button onClick={() => setReviewModal(null)} className="absolute top-4 right-4 text-stone-400"><X className="w-5 h-5" /></button>
            <h3 className="text-lg font-bold text-stone-800 mb-4">Leave a Review</h3>
            <div className="space-y-4">
              <div>
                <label className="input-label">Rating</label>
                <StarRating rating={reviewForm.rating} interactive onChange={(r) => setReviewForm(f => ({...f, rating: r}))} size={28} />
              </div>
              <div>
                <label className="input-label">Comment</label>
                <textarea value={reviewForm.comment} onChange={(e) => setReviewForm(f => ({...f, comment: e.target.value}))}
                  rows={3} className="input-field" placeholder="Share your experience..." />
              </div>
              <button onClick={submitReview} disabled={submitting} className="w-full btn-primary">
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
