'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatPrice, timeAgo } from '@/lib/helpers'
import StatusBadge from '@/components/StatusBadge'
import ProtectedRoute from '@/components/ProtectedRoute'
import { usePushNotifications } from '@/lib/usePushNotifications'
import { Package, ListChecks, Clock, CheckCircle, DollarSign, Plus, ArrowRight, Loader2, BellRing } from 'lucide-react'

export default function SellerDashboard() {
  return (
    <ProtectedRoute requiredRole="seller">
      <DashboardContent />
    </ProtectedRoute>
  )
}

function DashboardContent() {
  const [stats, setStats] = useState({})
  const [recentListings, setRecentListings] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const { isSupported, isSubscribed, subscribeToPush } = usePushNotifications()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const uid = session.user.id

      // Stats
      const [totalL, pendingL, approvedL, orders] = await Promise.all([
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('seller_id', uid),
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('seller_id', uid).eq('status', 'pending_review'),
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('seller_id', uid).eq('status', 'approved'),
        supabase.from('orders').select('total_price, status').eq('seller_id', uid),
      ])

      const earnings = (orders.data || [])
        .filter(o => ['confirmed', 'shipped', 'delivered'].includes(o.status))
        .reduce((sum, o) => sum + (o.total_price || 0), 0)

      setStats({
        total: totalL.count || 0,
        pending: pendingL.count || 0,
        approved: approvedL.count || 0,
        orders: orders.data?.length || 0,
        earnings,
      })

      // Recent listings
      const { data: listings } = await supabase
        .from('listings')
        .select('id, title, status, price, created_at')
        .eq('seller_id', uid)
        .order('created_at', { ascending: false })
        .limit(5)
      setRecentListings(listings || [])

      // Recent orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, total_price, status, created_at, listings(title), profiles!orders_buyer_id_fkey(full_name)')
        .eq('seller_id', uid)
        .order('created_at', { ascending: false })
        .limit(5)
      setRecentOrders(ordersData || [])

      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) {
    return <div className="page-container flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
  }

  const statCards = [
    { icon: ListChecks, label: 'Total Listings', value: stats.total, color: 'bg-blue-50 text-blue-600' },
    { icon: Clock, label: 'Pending Review', value: stats.pending, color: 'bg-amber-50 text-amber-600' },
    { icon: CheckCircle, label: 'Approved', value: stats.approved, color: 'bg-emerald-50 text-emerald-600' },
    { icon: Package, label: 'Total Orders', value: stats.orders, color: 'bg-purple-50 text-purple-600' },
    { icon: DollarSign, label: 'Earnings', value: formatPrice(stats.earnings), color: 'bg-primary-50 text-primary-600' },
  ]

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Seller Dashboard</h1>
        <div className="flex items-center gap-3">
          {isSupported && !isSubscribed && (
            <button onClick={subscribeToPush} className="hidden sm:flex items-center gap-1.5 text-sm bg-purple-100 text-purple-700 px-4 py-2.5 rounded-xl hover:bg-purple-200 transition-colors font-medium">
              <BellRing className="w-4 h-4" /> Enable Alerts
            </button>
          )}
          <Link href="/sell" className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus className="w-4 h-4" /> New Listing
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((s, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-stone-800">{s.value}</p>
            <p className="text-xs text-stone-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Listings */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-stone-100">
            <h3 className="font-semibold text-stone-800">Recent Listings</h3>
            <Link href="/seller/listings" className="text-sm text-primary-600 flex items-center gap-1">View All <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="divide-y divide-stone-50">
            {recentListings.length === 0 ? (
              <div className="p-8 text-center text-sm text-stone-400">No listings yet</div>
            ) : recentListings.map(l => (
              <Link key={l.id} href={`/listings/${l.id}`} className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-700 truncate">{l.title}</p>
                  <p className="text-xs text-stone-400">{timeAgo(l.created_at)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-primary-600">{formatPrice(l.price)}</span>
                  <StatusBadge status={l.status} size="xs" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-stone-100">
            <h3 className="font-semibold text-stone-800">Recent Orders</h3>
            <Link href="/seller/orders" className="text-sm text-primary-600 flex items-center gap-1">View All <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="divide-y divide-stone-50">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-sm text-stone-400">No orders yet</div>
            ) : recentOrders.map(o => (
              <div key={o.id} className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-700 truncate">{o.listings?.title || 'Order'}</p>
                  <p className="text-xs text-stone-400">{o.profiles?.full_name} · {timeAgo(o.created_at)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-primary-600">{formatPrice(o.total_price)}</span>
                  <StatusBadge status={o.status} size="xs" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
