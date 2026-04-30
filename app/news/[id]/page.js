'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Calendar, ArrowLeft, Loader2, Newspaper,
  ChevronLeft, ChevronRight,
} from 'lucide-react'

const formatNewsDate = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function NewsDetailPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params?.id
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const photoRailRef = useRef(null)

  useEffect(() => {
    if (!postId) return
    let mounted = true
    const load = async () => {
      const { data, error } = await supabase
        .from('news_posts')
        .select('id, title, body, news_date, is_published, created_at, news_post_media(url, sort_order)')
        .eq('id', postId)
        .maybeSingle()
      if (!mounted) return
      if (error || !data || !data.is_published) {
        setNotFound(true)
      } else {
        setPost(data)
      }
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [postId])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (notFound || !post) {
    return (
      <div className="page-section py-20 text-center">
        <Newspaper className="w-12 h-12 text-surface-300 mx-auto mb-4" />
        <h1 className="section-heading mb-2">News not found</h1>
        <p className="text-sm text-surface-500 mb-6">
          This article may have been removed or unpublished.
        </p>
        <Link href="/news" className="btn-primary text-sm">
          Back to all news
        </Link>
      </div>
    )
  }

  const photos = (post.news_post_media || [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  const scrollByAmount = (dir) => {
    const el = photoRailRef.current
    if (!el) return
    const step = Math.min(el.clientWidth * 0.85, 600)
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  return (
    <article className="min-h-screen bg-surface-50 pb-20">
      <div className="page-section pt-8">
        <button
          onClick={() => router.push('/news')}
          className="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-primary-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> All news
        </button>
      </div>

      <div className="page-section">
        <div className="max-w-3xl">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-surface-500 mb-3">
            <Calendar className="w-3 h-3" />
            {formatNewsDate(post.news_date)}
          </div>
          <h1 className="font-display text-display-xl text-surface-ink text-balance leading-tight">
            {post.title}
          </h1>
        </div>
      </div>

      {photos.length > 0 && (
        <div className="page-section mt-10 relative">
          {photos.length > 1 && (
            <div className="hidden md:flex absolute -top-12 right-4 lg:right-8 items-center gap-2 z-10">
              <button
                type="button"
                aria-label="Previous photo"
                onClick={() => scrollByAmount(-1)}
                className="rail-nav"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={2.25} />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={() => scrollByAmount(1)}
                className="rail-nav"
              >
                <ChevronRight className="w-4 h-4" strokeWidth={2.25} />
              </button>
            </div>
          )}

          <div ref={photoRailRef} className="h-rail h-rail-mask">
            {photos.map((photo, i) => (
              <div
                key={i}
                className="w-[88vw] max-w-[820px] sm:w-[80vw] lg:w-[820px]"
              >
                <div className="relative aspect-[16/9] rounded-3xl overflow-hidden bg-surface-100 border border-surface-200/70 shadow-soft">
                  <Image
                    src={photo.url}
                    alt=""
                    fill
                    sizes="(min-width:1024px) 820px, 88vw"
                    quality={92}
                    priority={i === 0}
                    className="object-cover"
                  />
                </div>
              </div>
            ))}
          </div>

          {photos.length > 1 && (
            <div className="md:hidden mt-1 flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-widest text-surface-500">
              <ChevronLeft className="w-3 h-3" />
              <span>Swipe</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          )}
        </div>
      )}

      <div className="page-section mt-10">
        <div className="max-w-3xl">
          <div className="prose prose-stone max-w-none whitespace-pre-wrap text-surface-700 leading-relaxed text-[1.05rem]">
            {post.body}
          </div>
        </div>
      </div>
    </article>
  )
}
