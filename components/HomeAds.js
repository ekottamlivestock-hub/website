'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function HomeAds() {
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const railRef = useRef(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const { data, error } = await supabase
        .from('home_ads')
        .select('id, image_url, sort_order, created_at')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })
      if (!mounted) return
      if (error) {
        console.warn('[HomeAds] load failed', error)
        setAds([])
      } else {
        setAds(data || [])
      }
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  // Don't show the section at all when there are no active ads.
  if (!loading && ads.length === 0) return null

  const scrollByAmount = (dir) => {
    const el = railRef.current
    if (!el) return
    const step = Math.min(el.clientWidth * 0.85, 480)
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  return (
    <section className="page-section pt-16 sm:pt-20 pb-4 relative">
      <div className="flex items-end justify-between mb-8 gap-4">
        <div>
          <div className="section-eyebrow">Featured</div>
          <h2 className="section-heading">
            What&apos;s <span className="italic text-primary-700">happening</span>.
          </h2>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button
            type="button"
            aria-label="Scroll ads left"
            onClick={() => scrollByAmount(-1)}
            className="rail-nav"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.25} />
          </button>
          <button
            type="button"
            aria-label="Scroll ads right"
            onClick={() => scrollByAmount(1)}
            className="rail-nav"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={2.25} />
          </button>
        </div>
      </div>

      <div ref={railRef} className="h-rail h-rail-mask">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="w-[82vw] max-w-[420px] sm:w-[60vw] sm:max-w-[440px] lg:w-[440px]"
              >
                <div className="aspect-[16/9] rounded-3xl bg-surface-200/60 animate-pulse" />
              </div>
            ))
          : ads.map((ad, idx) => (
              <div
                key={ad.id}
                className="w-[82vw] max-w-[420px] sm:w-[60vw] sm:max-w-[440px] lg:w-[440px] animate-reveal"
                style={{ animationDelay: `${Math.min(idx, 5) * 60}ms` }}
              >
                <div className="relative aspect-[16/9] rounded-3xl overflow-hidden bg-surface-100 border border-surface-200/70 shadow-soft">
                  <Image
                    src={ad.image_url}
                    alt=""
                    fill
                    sizes="(min-width:1024px) 440px, 80vw"
                    quality={90}
                    className="object-cover"
                  />
                </div>
              </div>
            ))}
      </div>

      <div className="md:hidden mt-1 flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-widest text-surface-500">
        <ChevronLeft className="w-3 h-3" />
        <span>Swipe</span>
        <ChevronRight className="w-3 h-3" />
      </div>
    </section>
  )
}
