'use client'

import { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useRecipes } from '@/hooks/use-recipes'
import type { Recipe, MealType } from '@meal-planning/shared-types'

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
}

interface RecipePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (recipe: Recipe) => void
  mealType?: MealType
  date?: string
}

export function RecipePickerDialog({
  open,
  onOpenChange,
  onSelect,
  mealType,
  date,
}: RecipePickerDialogProps) {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useRecipes({ query: search || undefined })
  const recipes = data?.data || []

  const handleSelect = (recipe: Recipe) => {
    onSelect(recipe)
    onOpenChange(false)
    setSearch('')
  }

  const formattedDate = date
    ? new Date(date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
    : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            레시피 선택
            {mealType && date && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                {formattedDate} {MEAL_TYPE_LABELS[mealType]}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="레시피 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : recipes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {search ? '검색 결과가 없습니다' : '레시피가 없습니다'}
            </div>
          ) : (
            <div className="space-y-2">
              {recipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => handleSelect(recipe)}
                  className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-gray-50 transition-colors text-left"
                >
                  {recipe.image_url ? (
                    <img
                      src={recipe.image_url}
                      alt={recipe.title}
                      className="w-12 h-12 rounded object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                      No img
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{recipe.title}</p>
                    <p className="text-sm text-gray-500">
                      {recipe.cook_time_minutes && `${recipe.cook_time_minutes}분`}
                      {recipe.cook_time_minutes && recipe.servings && ' · '}
                      {recipe.servings}인분
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
