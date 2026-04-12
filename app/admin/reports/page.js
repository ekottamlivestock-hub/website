'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/helpers'
import StatusBadge from '@/components/StatusBadge'
import ProtectedRoute from '@/components/ProtectedRoute'
import toast from 'react-hot-toast'
import { Loader2, CheckCircle, XCircle, Eye } from 'lucide-react'
import Link from 'next/link'

export default function AdminReportsPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <ReportsContent />
    </ProtectedRoute>
  )
}

function ReportsContent() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchReports = async () => {
    const { data } = await supabase
      .from('reports')
      .select('*, profiles!reports_reporter_id_fkey(full_name), listings(title)')
      .order('created_at', { ascending: false })
    setReports(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchReports() }, [])

  const updateStatus = async (id, status) => {
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('reports').update({
      status, resolved_by: session.user.id, resolved_at: new Date().toISOString()
    }).eq('id', id)
    toast.success(`Report ${status}`)
    fetchReports()
  }

  if (loading) return <div className="page-container flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Reports</h1>
      {reports.length === 0 ? (
        <div className="text-center py-16 text-stone-400">No reports</div>
      ) : (
        <div className="space-y-4">
          {reports.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-stone-800">Listing: {r.listings?.title || 'Unknown'}</p>
                  <p className="text-sm text-stone-400">Reporter: {r.profiles?.full_name} · Reason: {r.reason}</p>
                  <p className="text-xs text-stone-400 mt-1">{formatDate(r.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.status} />
                  {r.listing_id && (
                    <Link href={`/listings/${r.listing_id}`} className="p-2 text-stone-400 hover:text-stone-600 rounded"><Eye className="w-4 h-4" /></Link>
                  )}
                  {r.status === 'open' && (
                    <>
                      <button onClick={() => updateStatus(r.id, 'resolved')} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded"><CheckCircle className="w-4 h-4" /></button>
                      <button onClick={() => updateStatus(r.id, 'dismissed')} className="p-2 text-stone-400 hover:bg-stone-50 rounded"><XCircle className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
