'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/helpers'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Users, Store, ListChecks, Package, DollarSign, Clock, ShieldCheck, Flag, Loader2, ArrowRight, Megaphone } from 'lucide-react'

export default function AdminDashboard() {
  return (
    <ProtectedRoute requiredRole="admin">
      <DashboardContent />
    </ProtectedRoute>
  )
}

function DashboardContent() {
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const [users, sellers, pendingSellers, totalListings, pendingListings, approvedListings, orders, reports] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'seller'),
        supabase.from('seller_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('listings').select('*', { count: 'exact', head: true }),
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('orders').select('total_price, status'),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      ])

      // Revenue counts only orders the seller has actually committed to —
      // pending orders may still be cancelled, and cancelled orders never
      // produced money. Same shape as the buyer dashboard's "total spent".
      const FULFILLED = new Set(['confirmed', 'shipped', 'delivered'])
      const revenue = (orders.data || [])
        .filter(o => FULFILLED.has(o.status))
        .reduce((sum, o) => sum + (o.total_price || 0), 0)

      setStats({
        users: users.count || 0,
        sellers: sellers.count || 0,
        pendingSellers: pendingSellers.count || 0,
        totalListings: totalListings.count || 0,
        pendingListings: pendingListings.count || 0,
        approvedListings: approvedListings.count || 0,
        orders: orders.data?.length || 0,
        revenue, openReports: reports.count || 0,
      })
      setLoading(false)
    }
    fetchStats()
  }, [])

  if (loading) return <div className="page-container flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>

  const cards = [
    { icon: Users, label: 'Total Users', value: stats.users, color: 'bg-blue-50 text-blue-600' },
    { icon: Store, label: 'Sellers', value: stats.sellers, color: 'bg-purple-50 text-purple-600' },
    { icon: Clock, label: 'Pending Sellers', value: stats.pendingSellers, color: 'bg-amber-50 text-amber-600', href: '/admin/sellers' },
    { icon: ListChecks, label: 'Total Listings', value: stats.totalListings, color: 'bg-emerald-50 text-emerald-600' },
    { icon: Clock, label: 'Pending Listings', value: stats.pendingListings, color: 'bg-amber-50 text-amber-600', href: '/admin/listings' },
    { icon: ShieldCheck, label: 'Approved', value: stats.approvedListings, color: 'bg-emerald-50 text-emerald-600' },
    { icon: Package, label: 'Total Orders', value: stats.orders, color: 'bg-blue-50 text-blue-600', href: '/admin/orders' },
    { icon: DollarSign, label: 'Revenue', value: formatPrice(stats.revenue), color: 'bg-primary-50 text-primary-600' },
    { icon: Flag, label: 'Open Reports', value: stats.openReports, color: 'bg-red-50 text-red-600', href: '/admin/reports' },
  ]

  const quickLinks = [
    { label: 'Analytics Dashboard', href: '/admin/analytics', desc: 'Revenue, orders & growth' },
    { label: 'Review Listings', href: '/admin/listings', desc: `${stats.pendingListings} pending` },
    { label: 'Seller Applications', href: '/admin/sellers', desc: `${stats.pendingSellers} pending` },
    { label: 'Manage Categories', href: '/admin/categories', desc: 'Add/edit animal types' },
    { label: 'Manage Breeds', href: '/admin/breeds', desc: 'Add breeds per category' },
    { label: 'Manage News', href: '/admin/news', desc: 'Home page news section' },
    { label: 'Manage Ads', href: '/admin/ads', desc: 'Home page ad images' },
    { label: 'Scrolling Bar', href: '/admin/scrolling', desc: 'Sitewide marquee announcements' },
    { label: 'View Reports', href: '/admin/reports', desc: `${stats.openReports} open` },
    { label: 'All Orders', href: '/admin/orders', desc: `${stats.orders} total` },
  ]

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
        {cards.map((c, i) => {
          const Wrapper = c.href ? Link : 'div'
          return (
            <Wrapper key={i} href={c.href || '#'} className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.color}`}>
                <c.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-stone-800">{c.value}</p>
              <p className="text-xs text-stone-400">{c.label}</p>
            </Wrapper>
          )
        })}
      </div>

      <h2 className="text-lg font-semibold text-stone-800 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickLinks.map((q, i) => (
          <Link key={i} href={q.href} className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm 
            hover:shadow-md hover:border-primary-200 transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-stone-800 group-hover:text-primary-600 transition-colors">{q.label}</p>
                <p className="text-xs text-stone-400 mt-1">{q.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-primary-600 transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
