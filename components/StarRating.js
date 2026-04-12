'use client'

import { Star } from 'lucide-react'

export default function StarRating({ rating = 0, max = 5, size = 16, interactive = false, onChange }) {
  const handleClick = (value) => {
    if (interactive && onChange) {
      onChange(value)
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const value = i + 1
        const isFilled = value <= Math.round(rating)
        return (
          <button
            key={i}
            type={interactive ? 'button' : undefined}
            onClick={() => handleClick(value)}
            disabled={!interactive}
            className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform disabled:cursor-default`}
            aria-label={`${value} star${value > 1 ? 's' : ''}`}
          >
            <Star
              size={size}
              className={isFilled ? 'text-amber-400 fill-amber-400' : 'text-stone-300'}
            />
          </button>
        )
      })}
    </div>
  )
}
