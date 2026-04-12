'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatPrice, formatDate } from '@/lib/helpers'
import StatusBadge from '@/components/StatusBadge'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Loader2 } from 'lucide-react'

export default function AdminOrdersPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <OrdersContent />
    </ProtectedRoute>
  )
}

function OrdersContent() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, listings(title), profiles!orders_buyer_id_fkey(full_name), profiles!orders_seller_id_fkey(full_name)')
        .order('created_at', { ascending: false })
      setOrders(data || [])
      setLoading(false)
    }
    fetchOrders()
  }, [])

  if (loading) return <div className="page-container flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">All Orders</h1>
      {orders.length === 0 ? (
        <div className="text-center py-16 text-stone-400">No orders yet</div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50/50 border-b border-stone-100">
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Order</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500 hidden sm:table-cell">Listing</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500 hidden md:table-cell">Buyer</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500 hidden md:table-cell">Payment</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500 hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-stone-50/50">
                    <td className="px-4 py-3 font-medium text-stone-600 text-xs">#{o.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-stone-700 truncate max-w-[180px] hidden sm:table-cell">{o.listings?.title}</td>
                    <td className="px-4 py-3 text-stone-500 hidden md:table-cell">{o.profiles?.full_name}</td>
                    <td className="px-4 py-3 font-semibold text-primary-600">{formatPrice(o.total_price)}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} size="xs" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><StatusBadge status={o.payment_status} size="xs" /></td>
                    <td className="px-4 py-3 text-stone-400 hidden lg:table-cell">{formatDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
