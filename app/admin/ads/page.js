'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ProtectedRoute from '@/components/ProtectedRoute'
import ImageUploader from '@/components/ImageUploader'
import { pathFromPublicUrl, removeFromBucket } from '@/lib/storage-cleanup'
import toast from 'react-hot-toast'
import {
  Loader2, Plus, Trash2, Save, ToggleLeft, ToggleRight, ArrowLeft,
  ImageIcon, ChevronUp, ChevronDown, X,
} from 'lucide-react'

export default function AdminAdsPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdsContent />
    </ProtectedRoute>
  )
}

function AdsContent() {
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUploader, setShowUploader] = useState(false)
  const [pendingImages, setPendingImages] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const fetchAds = async () => {
    const { data, error } = await supabase
      .from('home_ads')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (error) toast.error('Failed to load ads')
    setAds(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchAds() }, [])

  const saveNew = async () => {
    if (pendingImages.length === 0) {
      toast.error('Upload at least one image')
      return
    }
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      // Append to the end of the current order so existing positions stay stable.
      const baseOrder = ads.length === 0 ? 0 : Math.max(...ads.map(a => a.sort_order ?? 0)) + 1
      const rows = pendingImages.map((url, i) => ({
        image_url: url,
        sort_order: baseOrder + i,
        is_active: true,
        created_by: user?.id || null,
      }))
      const { error } = await supabase.from('home_ads').insert(rows)
      if (error) throw error
      toast.success(`${rows.length} ad${rows.length !== 1 ? 's' : ''} added`)
      setPendingImages([])
      setShowUploader(false)
      fetchAds()
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to add ads')
    } finally {
      setSubmitting(false)
    }
  }

  const cancelUploader = async () => {
    // The ImageUploader has already pushed each pending file to storage.
    // If admin walks away without saving, clean those out so they don't
    // sit in the bucket as orphans.
    if (pendingImages.length > 0) {
      const paths = pendingImages
        .map(url => pathFromPublicUrl(url, 'ad-media'))
        .filter(Boolean)
      if (paths.length > 0) await removeFromBucket('ad-media', paths)
    }
    setPendingImages([])
    setShowUploader(false)
  }

  const toggleActive = async (ad) => {
    const { error } = await supabase
      .from('home_ads')
      .update({ is_active: !ad.is_active })
      .eq('id', ad.id)
    if (error) { toast.error('Failed to update'); return }
    fetchAds()
  }

  const moveAd = async (ad, direction) => {
    const idx = ads.findIndex(a => a.id === ad.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= ads.length) return
    const other = ads[swapIdx]

    // Swap sort_order values. Two-step update to avoid landing on the
    // same order in case both happened to share one.
    const tempOrder = -1 - idx
    await supabase.from('home_ads').update({ sort_order: tempOrder }).eq('id', ad.id)
    await supabase.from('home_ads').update({ sort_order: ad.sort_order }).eq('id', other.id)
    await supabase.from('home_ads').update({ sort_order: other.sort_order }).eq('id', ad.id)
    fetchAds()
  }

  const deleteAd = async (ad) => {
    if (!confirm('Delete this ad?')) return
    try {
      const { error } = await supabase.from('home_ads').delete().eq('id', ad.id)
      if (error) throw error
      const path = pathFromPublicUrl(ad.image_url, 'ad-media')
      if (path) await removeFromBucket('ad-media', [path])
      toast.success('Ad deleted')
      fetchAds()
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete')
    }
  }

  if (loading) {
    return (
      <div className="page-container flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="page-container max-w-4xl mx-auto">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-primary-600 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </Link>

      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Home page ads</h1>
          <p className="text-sm text-stone-500">
            Promotional images shown on the home page after the news section. Not clickable — just images.
          </p>
        </div>
        {!showUploader && (
          <button onClick={() => setShowUploader(true)} className="btn-primary text-sm flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add ads
          </button>
        )}
      </div>

      {showUploader && (
        <div className="bg-white rounded-2xl border border-stone-100 p-6 mb-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-stone-800">Upload new ads</h2>
            <button onClick={cancelUploader} className="text-stone-400 hover:text-stone-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-stone-500">
            Upload one or more images. Each image becomes a separate ad and is added to the end of the rail.
          </p>

          <ImageUploader
            bucket="ad-media"
            folder=""
            maxFiles={10}
            maxSizeMB={5}
            images={pendingImages}
            onImagesChange={setPendingImages}
          />

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={cancelUploader}
              className="btn-ghost border border-stone-200 text-sm"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveNew}
              disabled={submitting || pendingImages.length === 0}
              className="btn-primary text-sm flex items-center gap-1"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save ads
            </button>
          </div>
        </div>
      )}

      {ads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 p-10 text-center">
          <ImageIcon className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-600 font-medium">No ads yet</p>
          <p className="text-xs text-stone-400 mt-1">
            Click &ldquo;Add ads&rdquo; to upload your first image.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ads.map((ad, idx) => (
            <div
              key={ad.id}
              className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden"
            >
              <div className="relative aspect-[16/10] bg-stone-100">
                <Image src={ad.image_url} alt="" fill sizes="(min-width:1024px) 33vw, 50vw" className="object-cover" />
                {!ad.is_active && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-stone-900/70 text-white text-[10px] font-semibold uppercase tracking-wider rounded-full">
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveAd(ad, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 text-stone-400 hover:text-primary-600 disabled:opacity-30 disabled:hover:text-stone-400 rounded"
                    title="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveAd(ad, 'down')}
                    disabled={idx === ads.length - 1}
                    className="p-1.5 text-stone-400 hover:text-primary-600 disabled:opacity-30 disabled:hover:text-stone-400 rounded"
                    title="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleActive(ad)}
                    className={`p-1.5 rounded ${ad.is_active ? 'text-emerald-500' : 'text-stone-300'}`}
                    title={ad.is_active ? 'Hide' : 'Show'}
                  >
                    {ad.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => deleteAd(ad)}
                    className="p-1.5 text-stone-400 hover:text-red-600 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
