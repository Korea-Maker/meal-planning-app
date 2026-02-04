'use client'

import { Heart, Star, Users } from 'lucide-react'
import { useRecipeStats } from '@/hooks/use-recipe-interactions'
import { Skeleton } from '@/components/ui/skeleton'

interface RecipeStatsProps {
  recipeId: string
  compact?: boolean
}

export function RecipeStats({ recipeId, compact = false }: RecipeStatsProps) {
  const { data: stats, isLoading } = useRecipeStats(recipeId)

  if (isLoading) {
    return compact ? (
      <Skeleton className="h-4 w-20" />
    ) : (
      <div className="flex gap-4">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-16" />
      </div>
    )
  }

  if (!stats) return null

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {stats.average_rating !== null && (
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            {stats.average_rating.toFixed(1)}
            <span className="text-xs">({stats.total_ratings})</span>
          </span>
        )}
        {stats.favorites_count > 0 && (
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5 text-red-500" />
            {stats.favorites_count}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full">
        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        <span className="font-medium">
          {stats.average_rating !== null ? stats.average_rating.toFixed(1) : '-'}
        </span>
        <span className="text-sm text-muted-foreground">
          ({stats.total_ratings} 평가)
        </span>
      </div>

      <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full">
        <Heart className="h-4 w-4 text-red-500" />
        <span className="font-medium">{stats.favorites_count}</span>
        <span className="text-sm text-muted-foreground">즐겨찾기</span>
      </div>
    </div>
  )
}
