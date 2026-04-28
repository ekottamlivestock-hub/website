'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/helpers'
import StatusBadge from '@/components/StatusBadge'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Package, Heart, ShoppingCart, Loader2, ArrowRight } from 'lucide-react'

export default function BuyerDashboard() {
  return (
    <ProtectedRoute requiredRole="any">
      <DashboardContent />
    </ProtectedRoute>
  )
}

function DashboardContent() {
  const [stats, setStats] = useState({ orders: 0, wishlist: 0, spent: 0 })
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const uid = session.user.id

      const [ordersRes, wishlistRes] = await Promise.all([
        supabase.from('orders').select('*').eq('buyer_id', uid).order('created_at', { ascending: false }),
        supabase.from('wishlists').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      ])

      const orders = ordersRes.data || []
      // "Total Spent" = money actually committed: confirmed/shipped/delivered.
      // Exclude pending (not yet accepted) and cancelled (refunded / never paid).
      const FULFILLED = new Set(['confirmed', 'shipped', 'delivered'])
      const spent = orders
        .filter(o => FULFILLED.has(o.status))
        .reduce((sum, o) => sum + (o.total_price || 0), 0)
      const activeOrders = orders.filter(o => o.status !== 'cancelled').length
      setStats({ orders: activeOrders, wishlist: wishlistRes.count || 0, spent })
      setRecentOrders(orders.slice(0, 5))
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return <div className="page-container flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">My Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { icon: ShoppingCart, label: 'Active Orders', value: stats.orders, color: 'bg-blue-50 text-blue-600', href: '/buyer/orders' },
          { icon: Heart, label: 'Wishlist', value: stats.wishlist, color: 'bg-red-50 text-red-600', href: '/buyer/wishlist' },
          { icon: Package, label: 'Total Spent', value: formatPrice(stats.spent), color: 'bg-primary-50 text-primary-600', href: '/buyer/orders' },
        ].map((s, i) => (
          <Link key={i} href={s.href} className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-stone-800">{s.value}</p>
            <p className="text-xs text-stone-400 flex items-center gap-1">{s.label} <ArrowRight className="w-3 h-3" /></p>
          </Link>
        ))}
      </div>

      {recentOrders.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm">
          <div className="p-5 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-semibold text-stone-800">Recent Orders</h3>
            <Link href="/buyer/orders" className="text-sm text-primary-600">View All</Link>
          </div>
          <div className="divide-y divide-stone-50">
            {recentOrders.map(o => (
              <div key={o.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-700">Order #{o.id.slice(0, 8)}</p>
                  <p className="text-xs text-stone-400">{formatPrice(o.total_price)}</p>
                </div>
                <StatusBadge status={o.status} size="xs" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
