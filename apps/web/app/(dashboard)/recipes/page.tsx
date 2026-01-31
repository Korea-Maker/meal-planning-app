'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RecipeFiltersComponent, type RecipeFilters } from '@/components/recipes/recipe-filters'
import { URLImportDialog } from '@/components/recipes/url-import-dialog'
import { DiscoverSection } from '@/components/recipes/discover-section'
import { useRecipes } from '@/hooks/use-recipes'
import { useQueryClient } from '@tanstack/react-query'
import type { Recipe, RecipeCategory, RecipeDifficulty } from '@meal-planning/shared-types'

const CATEGORY_LABELS: Record<RecipeCategory, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
  dessert: '디저트',
  appetizer: '에피타이저',
  side: '반찬',
  drink: '음료',
}

const DIFFICULTY_LABELS: Record<RecipeDifficulty, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
}

export default function RecipesPage() {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<RecipeFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useRecipes({
    query: search || undefined,
    categories: filters.category ? [filters.category] : undefined,
    difficulty: filters.difficulty,
    max_cook_time: filters.maxCookTime,
  })

  const recipes = data?.data || []

  const hasActiveFilters = Boolean(filters.category || filters.difficulty || filters.maxCookTime)

  const handleExternalRecipeImported = () => {
    refetch()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">레시피</h1>
          <p className="text-gray-600">나만의 레시피 컬렉션을 관리하세요</p>
        </div>
        <div className="flex gap-2">
          <URLImportDialog />
          <Button asChild>
            <Link href="/recipes/new">
              <Plus className="h-4 w-4 mr-2" />새 레시피
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="레시피 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={showFilters || hasActiveFilters ? 'default' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            className="shrink-0"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            필터
            {hasActiveFilters && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
                {[filters.category, filters.difficulty, filters.maxCookTime].filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>

        {showFilters && (
          <RecipeFiltersComponent filters={filters} onChange={setFilters} />
        )}
      </div>

      {/* 외부 레시피 탐색 섹션 */}
      <DiscoverSection onRecipeImported={handleExternalRecipeImported} />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : recipes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 mb-4">
              {search || hasActiveFilters ? '검색 결과가 없습니다' : '아직 레시피가 없습니다'}
            </p>
            {(search || hasActiveFilters) ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('')
                  setFilters({})
                }}
              >
                필터 초기화
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link href="/recipes/new">
                  <Plus className="h-4 w-4 mr-2" />첫 레시피 추가하기
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            {data?.meta?.total || recipes.length}개의 레시피
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipes.map((recipe) => (
              <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                  {recipe.image_url && (
                    <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
                      <img
                        src={recipe.image_url}
                        alt={recipe.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2">{recipe.title}</CardTitle>
                      <span className="shrink-0 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {DIFFICULTY_LABELS[recipe.difficulty]}
                      </span>
                    </div>
                    <CardDescription>
                      {recipe.prep_time_minutes && `준비 ${recipe.prep_time_minutes}분`}
                      {recipe.prep_time_minutes && recipe.cook_time_minutes && ' · '}
                      {recipe.cook_time_minutes && `조리 ${recipe.cook_time_minutes}분`}
                      {(recipe.prep_time_minutes || recipe.cook_time_minutes) && ' · '}
                      {recipe.servings}인분
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {recipe.categories.map((category) => (
                        <span
                          key={category}
                          className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                        >
                          {CATEGORY_LABELS[category] || category}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
