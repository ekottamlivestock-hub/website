'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, Newspaper, Calendar } from 'lucide-react'

const HOME_NEWS_LIMIT = 5

const formatNewsDate = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default function NewsRail() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const railRef = useRef(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const { data, error } = await supabase
        .from('news_posts')
        .select('id, title, body, news_date, created_at, news_post_media(url, sort_order)')
        .eq('is_published', true)
        .order('news_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(HOME_NEWS_LIMIT)
      if (!mounted) return
      if (error) {
        console.warn('[NewsRail] load failed', error)
        setPosts([])
      } else {
        setPosts(data || [])
      }
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  // Hide section completely on the home page if admin hasn't published any.
  // Skeletons during load look better than a flash of empty state.
  if (!loading && posts.length === 0) return null

  const scrollByAmount = (dir) => {
    const el = railRef.current
    if (!el) return
    const step = Math.min(el.clientWidth * 0.85, 360)
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  return (
    <section className="page-section pt-16 sm:pt-20 relative">
      <div className="flex items-end justify-between mb-8 gap-4">
        <div>
          <div className="section-eyebrow">From the desk</div>
          <h2 className="section-heading">
            We in <span className="italic text-primary-700">news</span>.
          </h2>
          <p className="mt-3 max-w-xl text-sm text-surface-600 leading-relaxed">
            Updates from the ekottam team — announcements, partnerships, and stories from the field.
          </p>
        </div>
        <Link href="/news" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-800 hover:text-primary-900">
          See all <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="relative">
        <div className="hidden md:flex absolute -top-14 right-0 items-center gap-2 z-10">
          <button
            type="button"
            aria-label="Scroll news left"
            onClick={() => scrollByAmount(-1)}
            className="rail-nav"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.25} />
          </button>
          <button
            type="button"
            aria-label="Scroll news right"
            onClick={() => scrollByAmount(1)}
            className="rail-nav"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={2.25} />
          </button>
        </div>

        <div ref={railRef} className="h-rail h-rail-mask">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[82vw] max-w-[340px] sm:w-[48vw] sm:max-w-[320px] lg:w-[320px]"
                >
                  <NewsCardSkeleton />
                </div>
              ))
            : posts.map((post, idx) => (
                <div
                  key={post.id}
                  className="w-[82vw] max-w-[340px] sm:w-[48vw] sm:max-w-[320px] lg:w-[320px] animate-reveal"
                  style={{ animationDelay: `${Math.min(idx, 5) * 60}ms` }}
                >
                  <NewsCard post={post} />
                </div>
              ))}
        </div>

        <div className="md:hidden mt-1 flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-widest text-surface-500">
          <ChevronLeft className="w-3 h-3" />
          <span>Swipe</span>
          <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    </section>
  )
}

function NewsCard({ post }) {
  const photos = (post.news_post_media || [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const cover = photos[0]?.url

  return (
    <Link
      href={`/news/${post.id}`}
      className="group block bg-white rounded-3xl border border-surface-200/70 overflow-hidden
        hover:shadow-lift hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className="relative aspect-[16/10] bg-surface-100 overflow-hidden">
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            sizes="(min-width:1024px) 320px, 80vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-surface-300">
            <Newspaper className="w-10 h-10" />
          </div>
        )}
        {photos.length > 1 && (
          <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 text-white text-[10px] font-semibold rounded-full">
            {photos.length} photos
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-surface-500 mb-2">
          <Calendar className="w-3 h-3" />
          {formatNewsDate(post.news_date)}
        </div>
        <h3 className="font-display text-lg text-surface-ink leading-snug line-clamp-2 group-hover:text-primary-800 transition-colors">
          {post.title}
        </h3>
        <p className="mt-2 text-sm text-surface-600 leading-relaxed line-clamp-2">
          {post.body}
        </p>
      </div>
    </Link>
  )
}

function NewsCardSkeleton() {
  return (
    <div className="bg-white rounded-3xl border border-surface-200/70 overflow-hidden animate-pulse">
      <div className="aspect-[16/10] bg-surface-200/60" />
      <div className="p-5 space-y-3">
        <div className="h-3 w-1/3 bg-surface-200/70 rounded" />
        <div className="h-4 w-5/6 bg-surface-200/70 rounded" />
        <div className="h-3 w-full bg-surface-200/50 rounded" />
        <div className="h-3 w-2/3 bg-surface-200/50 rounded" />
      </div>
    </div>
  )
}
