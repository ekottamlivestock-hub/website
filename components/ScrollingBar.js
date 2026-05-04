'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Sitewide marquee that lives below the navbar on every page. Pulls
// active rows from `scrolling_announcements` and ticker-scrolls them
// horizontally. When zero rows are active it returns null so the bar
// vanishes entirely (no ghost gap below the navbar).
//
// LAYOUT NOTE
// -----------
// Layout.js renders <main className="pt-16">, which clears the fixed
// 64px navbar. When this bar is mounted with content, we set
// `data-scrollbar="on"` on <body>, and globals.css bumps <main>'s top
// padding to clear navbar + bar together. When the bar unmounts (or
// has zero items) the attribute is removed and main reverts to pt-16.

const DOT_CLASS = {
  red:   'bg-red-500',
  green: 'bg-emerald-500',
  blue:  'bg-blue-500',
}

export default function ScrollingBar() {
  const [items, setItems] = useState(null) // null = loading; [] = none; [...] = render

  useEffect(() => {
    let cancelled = false

    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('scrolling_announcements')
        .select('id, text, color')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })
      if (cancelled) return
      if (error) {
        // Fail silently — the bar is non-essential chrome. Log to console
        // so admins notice in dev tools but don't disrupt the page.
        console.warn('ScrollingBar fetch failed:', error.message)
        setItems([])
        return
      }
      setItems(data || [])
    }

    fetchItems()

    // Realtime subscription so admin add/pause/delete reflects on every
    // open tab without a refresh. Subscribed once per mount; cleaned up
    // on unmount.
    const channel = supabase
      .channel('scrolling-announcements-public')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scrolling_announcements' },
        () => fetchItems()
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  // Toggle the body attribute so globals.css can adjust <main>'s top
  // padding. The attribute approach keeps layout.js a server component.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const on = Array.isArray(items) && items.length > 0
    if (on) {
      document.body.setAttribute('data-scrollbar', 'on')
    } else {
      document.body.removeAttribute('data-scrollbar')
    }
    return () => {
      // On unmount, also clear so a navigation that drops the bar
      // doesn't leave behind stale padding.
      document.body.removeAttribute('data-scrollbar')
    }
  }, [items])

  // Loading and empty both render null — no flash of empty bar.
  if (!Array.isArray(items) || items.length === 0) return null

  // Duplicate the list so the marquee loops seamlessly when the track
  // translates by exactly -50%.
  const loop = [...items, ...items]

  return (
    <div
      className="fixed top-16 left-0 right-0 z-40 h-10
                 bg-surface-ink/95 backdrop-blur-md
                 border-b border-white/10
                 overflow-hidden select-none
                 shadow-[0_4px_20px_-12px_rgba(0,0,0,0.45)]"
      role="region"
      aria-label="Site announcements"
    >
      {/* Edge fade mask — the rail looks infinite at both ends. */}
      <div className="h-full marquee-mask">
        <div className="marquee-track flex items-center h-full whitespace-nowrap">
          {loop.map((item, i) => (
            <span
              key={`${item.id}-${i}`}
              className="inline-flex items-center gap-2.5 px-7 shrink-0"
              aria-hidden={i >= items.length}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${DOT_CLASS[item.color] || 'bg-surface-400'}
                            shadow-[0_0_10px_currentColor]`}
              />
              <span className="font-display italic text-[14px] text-surface-50/95
                               tracking-[0.02em] leading-none">
                {item.text}
              </span>
              {/* Tasteful divider between items. */}
              <span className="ml-7 w-1 h-1 rounded-full bg-white/15" aria-hidden="true" />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
