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
import { FavoriteButton } from '@/components/recipes/favorite-button'
import { RecipeStats } from '@/components/recipes/recipe-stats'
import { useRecipes } from '@/hooks/use-recipes'
import { useFavoriteRecipes } from '@/hooks/use-recipe-interactions'
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
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useRecipes({
    query: search || undefined,
    categories: filters.category ? [filters.category] : undefined,
    difficulty: filters.difficulty,
    max_cook_time: filters.maxCookTime,
    page,
    limit: 24,
  })

  const { data: favoritesData, isLoading: isFavoritesLoading } = useFavoriteRecipes()

  const allRecipes = data?.data || []
  const favoriteRecipes = favoritesData?.data || []
  const recipes = showFavoritesOnly ? favoriteRecipes : allRecipes
  const isLoadingRecipes = showFavoritesOnly ? isFavoritesLoading : isLoading

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
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-10"
              disabled={showFavoritesOnly}
            />
          </div>
          <Button
            variant={showFavoritesOnly ? 'default' : 'outline'}
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className="shrink-0"
          >
            ❤️ 즐겨찾기
          </Button>
          <Button
            variant={showFilters || hasActiveFilters ? 'default' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            className="shrink-0"
            disabled={showFavoritesOnly}
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

        {showFilters && !showFavoritesOnly && (
          <RecipeFiltersComponent filters={filters} onChange={setFilters} />
        )}
      </div>

      {/* 외부 레시피 탐색 섹션 */}
      <DiscoverSection onRecipeImported={handleExternalRecipeImported} />

      {isLoadingRecipes ? (
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
            {data?.meta?.total_pages && data.meta.total_pages > 1 && (
              <span className="ml-2">
                (페이지 {page} / {data.meta.total_pages})
              </span>
            )}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipes.map((recipe) => (
              <Card key={recipe.id} className="cursor-pointer hover:shadow-md transition-shadow h-full relative group">
                <Link href={`/recipes/${recipe.id}`} className="block">
                  {recipe.image_url && (
                    <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden relative">
                      <img
                        src={recipe.image_url}
                        alt={recipe.title}
                        className="w-full h-full object-contain"
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
                  <CardContent className="space-y-2">
                    <RecipeStats recipeId={recipe.id} compact />
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
                </Link>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <FavoriteButton recipeId={recipe.id} size="sm" />
                </div>
              </Card>
            ))}
          </div>

          {/* 페이지네이션 */}
          {data?.meta?.total_pages && data.meta.total_pages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                이전
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, data.meta.total_pages) }, (_, i) => {
                  let pageNum: number
                  if (data.meta.total_pages <= 5) {
                    pageNum = i + 1
                  } else if (page <= 3) {
                    pageNum = i + 1
                  } else if (page >= data.meta.total_pages - 2) {
                    pageNum = data.meta.total_pages - 4 + i
                  } else {
                    pageNum = page - 2 + i
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      className="w-10"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.meta.total_pages, p + 1))}
                disabled={page === data.meta.total_pages}
              >
                다음
              </Button>
              <div className="flex items-center gap-2 ml-4 pl-4 border-l">
                <Input
                  type="number"
                  min={1}
                  max={data.meta.total_pages}
                  value={page}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    if (val >= 1 && val <= data.meta.total_pages) {
                      setPage(val)
                    }
                  }}
                  className="w-16 text-center"
                />
                <span className="text-sm text-gray-500">/ {data.meta.total_pages}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
