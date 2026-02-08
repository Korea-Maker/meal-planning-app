'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChefHat } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RecipeImageProps {
  src?: string | null
  alt: string
  fill?: boolean
  width?: number
  height?: number
  className?: string
  fallbackClassName?: string
  priority?: boolean
}

export function RecipeImage({
  src,
  alt,
  fill = true,
  width,
  height,
  className = 'object-cover',
  fallbackClassName = '',
  priority = false,
}: RecipeImageProps) {
  const [hasError, setHasError] = useState(false)

  if (!src || hasError) {
    return (
      <div className={cn(
        'w-full h-full bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center',
        fallbackClassName
      )}>
        <ChefHat className="h-12 w-12 text-primary/20" />
      </div>
    )
  }

  // Convert http:// to https:// for mixed content safety
  const safeSrc = src.startsWith('http://') ? src.replace('http://', 'https://') : src

  if (fill) {
    return (
      <Image
        src={safeSrc}
        alt={alt}
        fill
        onError={() => setHasError(true)}
        className={className}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={priority}
      />
    )
  }

  return (
    <Image
      src={safeSrc}
      alt={alt}
      width={width || 400}
      height={height || 300}
      onError={() => setHasError(true)}
      className={className}
      priority={priority}
    />
  )
}
