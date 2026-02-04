'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  totalRatings?: number
}

const sizeClasses = {
  sm: 'h-3.5 w-3.5',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
  showValue = false,
  totalRatings,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null)

  const displayValue = hoverValue ?? value

  const handleClick = (star: number) => {
    if (!readonly && onChange) {
      onChange(star)
    }
  }

  const handleMouseEnter = (star: number) => {
    if (!readonly) {
      setHoverValue(star)
    }
  }

  const handleMouseLeave = () => {
    setHoverValue(null)
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= displayValue
          const isHalfFilled = !isFilled && star - 0.5 <= displayValue

          return (
            <button
              key={star}
              type="button"
              onClick={() => handleClick(star)}
              onMouseEnter={() => handleMouseEnter(star)}
              onMouseLeave={handleMouseLeave}
              disabled={readonly}
              className={cn(
                'transition-colors focus:outline-none',
                readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
              )}
              aria-label={`${star}점`}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  'transition-colors',
                  isFilled
                    ? 'fill-yellow-400 text-yellow-400'
                    : isHalfFilled
                    ? 'fill-yellow-400/50 text-yellow-400'
                    : 'fill-transparent text-gray-300'
                )}
              />
            </button>
          )
        })}
      </div>

      {showValue && value > 0 && (
        <span className="text-sm text-muted-foreground ml-1">
          {value.toFixed(1)}
          {totalRatings !== undefined && (
            <span className="text-xs"> ({totalRatings})</span>
          )}
        </span>
      )}
    </div>
  )
}
