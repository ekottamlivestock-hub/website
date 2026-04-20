'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { timeAgo, getNotificationColor } from '@/lib/helpers'
import ProtectedRoute from '@/components/ProtectedRoute'
import toast from 'react-hot-toast'
import { Loader2, Bell, CheckCheck, Package, ShieldCheck, Store, AlertCircle, Truck } from 'lucide-react'

const typeIcons = {
  new_order: Package,
  order_confirmed: CheckCheck,
  order_shipped: Truck,
  order_delivered: Package,
  listing_approved: ShieldCheck,
  listing_rejected: AlertCircle,
  new_listing_pending: Bell,
  new_seller_application: Store,
  seller_approved: ShieldCheck,
  seller_rejected: AlertCircle,
}

export default function NotificationsPage() {
  return (
    <ProtectedRoute requiredRole="any">
      <NotificationsContent />
    </ProtectedRoute>
  )
}

function NotificationsContent() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    setNotifications(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchNotifications() }, [])

  const markAsRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllRead = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('notifications').update({ is_read: true })
      .eq('user_id', session.user.id).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    toast.success('All marked as read')
  }

  if (loading) return <div className="page-container flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="page-container max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Notifications</h1>
          {unreadCount > 0 && <p className="text-sm text-stone-400">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-ghost text-sm text-primary-600 flex items-center gap-1">
            <CheckCheck className="w-4 h-4" /> Mark All Read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-stone-300" />
          </div>
          <p className="text-stone-400">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const Icon = typeIcons[n.type] || Bell
            const color = getNotificationColor(n.type)
            return (
              <button
                key={n.id}
                onClick={() => !n.is_read && markAsRead(n.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  n.is_read
                    ? 'bg-white border-stone-100'
                    : 'bg-primary-50/30 border-primary-100 hover:bg-primary-50/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    n.is_read ? 'bg-stone-100' : 'bg-white'
                  }`}>
                    <Icon className={`w-4 h-4 ${n.is_read ? 'text-stone-400' : color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${n.is_read ? 'text-stone-500' : 'text-stone-800 font-medium'}`}>
                      {n.message}
                    </p>
                    <p className="text-xs text-stone-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 shrink-0" />}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
