'use client'

import { Heart, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useToggleFavorite } from '@/hooks/use-recipe-interactions'
import { toast } from '@/hooks/use-toast'

interface FavoriteButtonProps {
  recipeId: string
  variant?: 'default' | 'icon' | 'text'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

const buttonSizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-10 w-10',
}

export function FavoriteButton({
  recipeId,
  variant = 'icon',
  size = 'md',
  className,
}: FavoriteButtonProps) {
  const { isFavorite, isPending, toggle } = useToggleFavorite(recipeId)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      await toggle()
      toast({
        title: isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가',
        description: isFavorite
          ? '레시피가 즐겨찾기에서 제거되었습니다'
          : '레시피가 즐겨찾기에 추가되었습니다',
      })
    } catch {
      toast({
        title: '오류',
        description: '즐겨찾기를 변경할 수 없습니다',
        variant: 'destructive',
      })
    }
  }

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        disabled={isPending}
        className={cn(buttonSizeClasses[size], 'rounded-full', className)}
        aria-label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      >
        {isPending ? (
          <Loader2 className={cn(sizeClasses[size], 'animate-spin')} />
        ) : (
          <Heart
            className={cn(
              sizeClasses[size],
              'transition-colors',
              isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
            )}
          />
        )}
      </Button>
    )
  }

  if (variant === 'text') {
    return (
      <Button
        variant="ghost"
        onClick={handleClick}
        disabled={isPending}
        className={cn('gap-2', className)}
      >
        {isPending ? (
          <Loader2 className={cn(sizeClasses[size], 'animate-spin')} />
        ) : (
          <Heart
            className={cn(
              sizeClasses[size],
              'transition-colors',
              isFavorite ? 'fill-red-500 text-red-500' : ''
            )}
          />
        )}
        {isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
      </Button>
    )
  }

  return (
    <Button
      variant={isFavorite ? 'default' : 'outline'}
      onClick={handleClick}
      disabled={isPending}
      className={cn('gap-2', className)}
    >
      {isPending ? (
        <Loader2 className={cn(sizeClasses[size], 'animate-spin')} />
      ) : (
        <Heart
          className={cn(
            sizeClasses[size],
            'transition-colors',
            isFavorite ? 'fill-current' : ''
          )}
        />
      )}
      {isFavorite ? '즐겨찾기 됨' : '즐겨찾기 추가'}
    </Button>
  )
}
