'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Calendar, Newspaper, Loader2, ChevronRight } from 'lucide-react'

const formatNewsDate = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default function NewsArchivePage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const { data, error } = await supabase
        .from('news_posts')
        .select('id, title, body, news_date, created_at, news_post_media(url, sort_order)')
        .eq('is_published', true)
        .order('news_date', { ascending: false })
        .order('created_at', { ascending: false })
      if (!mounted) return
      if (error) {
        console.warn('[NewsArchive] load failed', error)
        setPosts([])
      } else {
        setPosts(data || [])
      }
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  return (
    <div className="min-h-screen bg-surface-50">
      <section className="page-section pt-12 pb-6">
        <div className="section-eyebrow">From the desk</div>
        <h1 className="section-heading">
          We in <span className="italic text-primary-700">news</span>.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-surface-600 leading-relaxed">
          Every news update from the ekottam team — newest first.
        </p>
      </section>

      <section className="page-section pb-20">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-surface-200/70 p-12 text-center">
            <Newspaper className="w-12 h-12 text-surface-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-surface-700 mb-1">No news yet</h3>
            <p className="text-sm text-surface-500">Check back soon — updates from our team will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post, idx) => (
              <NewsArchiveCard key={post.id} post={post} idx={idx} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function NewsArchiveCard({ post, idx }) {
  const photos = (post.news_post_media || [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const cover = photos[0]?.url

  return (
    <Link
      href={`/news/${post.id}`}
      className="group block bg-white rounded-3xl border border-surface-200/70 overflow-hidden
        hover:shadow-lift hover:-translate-y-0.5 transition-all duration-300 animate-reveal"
      style={{ animationDelay: `${Math.min(idx, 8) * 50}ms` }}
    >
      <div className="relative aspect-[16/10] bg-surface-100 overflow-hidden">
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw"
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
      <div className="p-6">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-surface-500 mb-2">
          <Calendar className="w-3 h-3" />
          {formatNewsDate(post.news_date)}
        </div>
        <h3 className="font-display text-xl text-surface-ink leading-snug line-clamp-2 group-hover:text-primary-800 transition-colors">
          {post.title}
        </h3>
        <p className="mt-3 text-sm text-surface-600 leading-relaxed line-clamp-3">
          {post.body}
        </p>
        <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-800 group-hover:text-primary-900">
          Read more <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  )
}
