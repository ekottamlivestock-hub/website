'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { formatPrice, formatDate } from '@/lib/helpers'
import StatusBadge from '@/components/StatusBadge'
import ProtectedRoute from '@/components/ProtectedRoute'
import toast from 'react-hot-toast'
import { Loader2, Eye, Edit, Pause, Play, Trash2, AlertCircle } from 'lucide-react'

export default function SellerListingsPage() {
  return (
    <ProtectedRoute requiredRole="seller">
      <ListingsContent />
    </ProtectedRoute>
  )
}

function ListingsContent() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchListings = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase
      .from('listings')
      .select(`*, listing_media(url, sort_order), animal_categories(name), listing_approvals(note, action, created_at)`)
      .eq('seller_id', session.user.id)
      .order('created_at', { ascending: false })
    setListings(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchListings() }, [])

  const togglePause = async (id, currentStatus) => {
    const newStatus = currentStatus === 'paused' ? 'approved' : 'paused'
    const { error } = await supabase.from('listings').update({ status: newStatus }).eq('id', id)
    if (error) { toast.error('Failed to update'); return }
    toast.success(newStatus === 'paused' ? 'Listing paused' : 'Listing resumed')
    fetchListings()
  }

  const deleteListing = async (id) => {
    if (!confirm('Delete this draft?')) return

    // 1. Fetch media URLs to prevent storage leakage
    const { data: media } = await supabase.from('listing_media').select('url').eq('listing_id', id)
    if (media && media.length > 0) {
      const paths = media.map(m => m.url.split('/public/listing-media/')[1]).filter(Boolean)
      if (paths.length > 0) {
        await supabase.storage.from('listing-media').remove(paths)
      }
    }

    // 2. Delete the listing row
    const { error } = await supabase.from('listings').delete().eq('id', id)
    if (error) { toast.error('Failed to delete'); return }
    toast.success('Draft deleted')
    fetchListings()
  }

  if (loading) return <div className="page-container flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">My Listings</h1>
        <Link href="/sell" className="btn-primary text-sm">+ New Listing</Link>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-stone-400 mb-4">You haven&apos;t created any listings yet</p>
          <Link href="/sell" className="btn-primary text-sm">Create Your First Listing</Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/50">
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Listing</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500 hidden sm:table-cell">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Price</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500 hidden md:table-cell">Views</th>
                  <th className="px-4 py-3 text-left font-medium text-stone-500 hidden md:table-cell">Date</th>
                  <th className="px-4 py-3 text-right font-medium text-stone-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {listings.map(l => {
                  const thumb = l.listing_media?.[0]?.url
                  const rejection = l.listing_approvals?.find(a => a.action === 'rejected')
                  return (
                    <tr key={l.id} className="hover:bg-stone-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {thumb && (
                            <Image src={thumb} alt="" width={40} height={40} className="w-10 h-10 rounded-lg object-cover" />
                          )}
                          <span className="font-medium text-stone-700 truncate max-w-[200px]">{l.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-stone-500 hidden sm:table-cell">{l.animal_categories?.name}</td>
                      <td className="px-4 py-3 font-semibold text-primary-600">{formatPrice(l.price)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={l.status} size="xs" />
                        {l.status === 'rejected' && rejection?.note && (
                          <div className="mt-1 text-xs text-red-500 flex items-start gap-1 max-w-[200px]">
                            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                            <span className="truncate">{rejection.note}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-500 hidden md:table-cell">{l.view_count || 0}</td>
                      <td className="px-4 py-3 text-stone-400 hidden md:table-cell">{formatDate(l.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/listings/${l.id}`} className="p-1.5 text-stone-400 hover:text-stone-600 rounded">
                            <Eye className="w-4 h-4" />
                          </Link>
                          {['draft', 'rejected'].includes(l.status) && (
                            <Link href={`/seller/listings/${l.id}/edit`} className="p-1.5 text-stone-400 hover:text-blue-600 rounded inline-block">
                              <Edit className="w-4 h-4" />
                            </Link>
                          )}
                          {['approved', 'paused'].includes(l.status) && (
                            <button onClick={() => togglePause(l.id, l.status)}
                              className="p-1.5 text-stone-400 hover:text-amber-600 rounded">
                              {l.status === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                            </button>
                          )}
                          {l.status === 'draft' && (
                            <button onClick={() => deleteListing(l.id)}
                              className="p-1.5 text-stone-400 hover:text-red-600 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
