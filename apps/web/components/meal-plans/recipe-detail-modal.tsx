'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Clock,
  Users,
  ChefHat,
  ExternalLink,
  Minus,
  Plus,
  Flame,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { useRecipe } from '@/hooks/use-recipes'
import { Skeleton } from '@/components/ui/skeleton'
import { FavoriteButton } from '@/components/recipes/favorite-button'
import { StarRating } from '@/components/recipes/star-rating'

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
}

const CATEGORY_LABELS: Record<string, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
  dessert: '디저트',
  appetizer: '에피타이저',
  side: '반찬',
  drink: '음료',
}

interface RecipeDetailModalProps {
  recipeId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RecipeDetailModal({ recipeId, open, onOpenChange }: RecipeDetailModalProps) {
  const { data: recipe, isLoading } = useRecipe(recipeId || '', {
    enabled: !!recipeId && open,
  })

  const [adjustedServings, setAdjustedServings] = useState<number | null>(null)

  const currentServings = adjustedServings ?? recipe?.servings ?? 2
  const originalServings = recipe?.servings ?? 2
  const servingsMultiplier = currentServings / originalServings

  const formatAmount = (amount: number): string => {
    const adjusted = amount * servingsMultiplier
    if (adjusted === Math.floor(adjusted)) {
      return adjusted.toString()
    }
    return adjusted.toFixed(1)
  }

  const totalTime = (recipe?.prep_time_minutes ?? 0) + (recipe?.cook_time_minutes ?? 0)

  // Reset adjusted servings when modal closes or recipe changes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setAdjustedServings(null)
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <VisuallyHidden>
              <DialogTitle>레시피 로딩 중</DialogTitle>
              <DialogDescription>레시피 정보를 불러오고 있습니다</DialogDescription>
            </VisuallyHidden>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : recipe ? (
          <>
            {/* Header with image */}
            {recipe.image_url ? (
              <div className="relative h-56 bg-muted">
                <img
                  src={recipe.image_url}
                  alt={recipe.title}
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <DialogHeader>
                    <DialogTitle className="text-2xl text-white pr-10">{recipe.title}</DialogTitle>
                    <VisuallyHidden>
                      <DialogDescription>레시피 상세 정보</DialogDescription>
                    </VisuallyHidden>
                  </DialogHeader>
                  <div className="flex items-center gap-3 mt-2">
                    {recipe.categories?.map((cat) => (
                      <span
                        key={cat}
                        className="px-2 py-0.5 text-xs bg-white/20 text-white rounded-full backdrop-blur-sm"
                      >
                        {CATEGORY_LABELS[cat] || cat}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Close and favorite buttons */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <FavoriteButton recipeId={recipe.id} variant="icon" size="sm" className="bg-white/20 backdrop-blur-sm hover:bg-white/40" />
                </div>
              </div>
            ) : (
              <DialogHeader className="p-6 pb-0">
                <div className="flex items-start justify-between">
                  <DialogTitle className="text-2xl">{recipe.title}</DialogTitle>
                  <FavoriteButton recipeId={recipe.id} variant="icon" size="sm" />
                </div>
                <VisuallyHidden>
                  <DialogDescription>레시피 상세 정보</DialogDescription>
                </VisuallyHidden>
                {recipe.categories?.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    {recipe.categories.map((cat) => (
                      <span
                        key={cat}
                        className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full"
                      >
                        {CATEGORY_LABELS[cat] || cat}
                      </span>
                    ))}
                  </div>
                )}
              </DialogHeader>
            )}

            <div className="p-6 space-y-6">
              {/* Quick info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {totalTime > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {totalTime}분
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {recipe.servings}인분
                </span>
                <span className="flex items-center gap-1">
                  <ChefHat className="h-4 w-4" />
                  {DIFFICULTY_LABELS[recipe.difficulty] || recipe.difficulty}
                </span>
                {recipe.calories && (
                  <span className="flex items-center gap-1">
                    <Flame className="h-4 w-4" />
                    {recipe.calories}kcal
                  </span>
                )}
              </div>

              {/* Description */}
              {recipe.description && (
                <p className="text-muted-foreground">{recipe.description}</p>
              )}

              {/* Ingredients */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">재료</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setAdjustedServings(Math.max(currentServings - 1, 1))}
                      disabled={currentServings <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm w-14 text-center">{currentServings}인분</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setAdjustedServings(Math.min(currentServings + 1, 100))}
                      disabled={currentServings >= 100}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {recipe.ingredients && recipe.ingredients.length > 0 ? (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {recipe.ingredients.map((ingredient) => (
                      <li
                        key={ingredient.id}
                        className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg"
                      >
                        <span className="font-medium">{ingredient.name}</span>
                        <span className="text-muted-foreground text-sm">
                          {formatAmount(ingredient.amount)} {ingredient.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">등록된 재료가 없습니다</p>
                )}
              </div>

              {/* Instructions */}
              <div>
                <h3 className="font-semibold text-lg mb-3">조리 순서</h3>
                {recipe.instructions && recipe.instructions.length > 0 ? (
                  <ol className="space-y-4">
                    {recipe.instructions.map((instruction) => (
                      <li key={instruction.id} className="flex gap-3">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                          {instruction.step_number}
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p className="text-foreground">{instruction.description}</p>
                          {instruction.image_url && (
                            <img
                              src={instruction.image_url}
                              alt={`${instruction.step_number}단계`}
                              className="mt-2 rounded-lg max-w-xs"
                            />
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-muted-foreground text-sm">등록된 조리 순서가 없습니다</p>
                )}
              </div>

              {/* Nutrition info */}
              {(recipe.calories || recipe.protein_grams || recipe.carbs_grams || recipe.fat_grams) && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">영양 정보 (1인분)</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {recipe.calories && (
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <p className="text-2xl font-bold text-orange-600">{recipe.calories}</p>
                        <p className="text-xs text-muted-foreground">kcal</p>
                      </div>
                    )}
                    {recipe.protein_grams && (
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">{recipe.protein_grams}g</p>
                        <p className="text-xs text-muted-foreground">단백질</p>
                      </div>
                    )}
                    {recipe.carbs_grams && (
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{recipe.carbs_grams}g</p>
                        <p className="text-xs text-muted-foreground">탄수화물</p>
                      </div>
                    )}
                    {recipe.fat_grams && (
                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <p className="text-2xl font-bold text-yellow-600">{recipe.fat_grams}g</p>
                        <p className="text-xs text-muted-foreground">지방</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Source URL */}
              {recipe.source_url && (
                <a
                  href={recipe.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline text-sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  원본 레시피 보기
                </a>
              )}

              {/* Footer actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" asChild>
                  <Link href={`/recipes/${recipe.id}`}>
                    상세 페이지로 이동
                  </Link>
                </Button>
                <Button onClick={() => onOpenChange(false)}>
                  닫기
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-6 text-center text-muted-foreground">
            <VisuallyHidden>
              <DialogTitle>레시피 없음</DialogTitle>
              <DialogDescription>요청한 레시피를 찾을 수 없습니다</DialogDescription>
            </VisuallyHidden>
            레시피를 찾을 수 없습니다
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
