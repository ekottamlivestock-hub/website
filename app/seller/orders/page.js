'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatPrice, formatDate, sendNotification } from '@/lib/helpers'
import StatusBadge from '@/components/StatusBadge'
import ProtectedRoute from '@/components/ProtectedRoute'
import toast from 'react-hot-toast'
import { Loader2, CheckCircle, Truck, Package } from 'lucide-react'

export default function SellerOrdersPage() {
  return (
    <ProtectedRoute requiredRole="seller">
      <OrdersContent />
    </ProtectedRoute>
  )
}

function OrdersContent() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase
      .from('orders')
      .select('*, listings(title), profiles!orders_buyer_id_fkey(full_name)')
      .eq('seller_id', session.user.id)
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchOrders() }, [])

  const updateStatus = async (order, newStatus, notifType, notifMsg) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', order.id)
    if (error) { toast.error('Failed to update'); return }
    await sendNotification(order.buyer_id, notifType, notifMsg, { order_id: order.id })
    toast.success(`Order ${newStatus}`)
    fetchOrders()
  }

  if (loading) return <div className="page-container flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Orders</h1>
      {orders.length === 0 ? (
        <div className="text-center py-16 text-stone-400">No orders yet</div>
      ) : (
        <div className="space-y-4">
          {orders.map(o => (
            <div key={o.id} className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-stone-800">{o.listings?.title || 'Order'}</p>
                  <p className="text-sm text-stone-400">Buyer: {o.profiles?.full_name} · Qty: {o.quantity} · {formatDate(o.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-primary-600">{formatPrice(o.total_price)}</span>
                  <StatusBadge status={o.status} />
                </div>
              </div>
              {o.delivery_address && (
                <p className="text-xs text-stone-400 mt-2">Delivery: {o.delivery_address}</p>
              )}
              <div className="flex gap-2 mt-4">
                {o.status === 'pending' && (
                  <button onClick={() => updateStatus(o, 'confirmed', 'order_confirmed', `Your order for "${o.listings?.title}" has been confirmed`)}
                    className="btn-primary text-xs px-4 py-2 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Confirm</button>
                )}
                {o.status === 'confirmed' && (
                  <button onClick={() => updateStatus(o, 'shipped', 'order_shipped', `Your order for "${o.listings?.title}" has been shipped`)}
                    className="btn-primary text-xs px-4 py-2 flex items-center gap-1"><Truck className="w-3 h-3" /> Mark Shipped</button>
                )}
                {o.status === 'shipped' && (
                  <button onClick={() => updateStatus(o, 'delivered', 'order_delivered', `Your order for "${o.listings?.title}" has been delivered`)}
                    className="btn-primary text-xs px-4 py-2 flex items-center gap-1"><Package className="w-3 h-3" /> Mark Delivered</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
