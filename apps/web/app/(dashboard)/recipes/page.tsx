'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search, SlidersHorizontal, ChefHat, Heart, Clock, Users, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RecipeFiltersComponent, type RecipeFilters } from '@/components/recipes/recipe-filters'
import { DiscoverSection } from '@/components/recipes/discover-section'
import { RecipeSpeedDial } from '@/components/recipes/recipe-speed-dial'
import { FavoriteButton } from '@/components/recipes/favorite-button'
import { RecipeStats } from '@/components/recipes/recipe-stats'
import { RecipeImage } from '@/components/recipes/recipe-image'
import { useRecipes, useBrowseRecipes } from '@/hooks/use-recipes'
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

const CATEGORY_COLORS: Record<RecipeCategory, string> = {
  breakfast: 'bg-amber-100 text-amber-700',
  lunch: 'bg-orange-100 text-orange-700',
  dinner: 'bg-rose-100 text-rose-700',
  snack: 'bg-pink-100 text-pink-700',
  dessert: 'bg-purple-100 text-purple-700',
  appetizer: 'bg-yellow-100 text-yellow-700',
  side: 'bg-emerald-100 text-emerald-700',
  drink: 'bg-sky-100 text-sky-700',
}

const DIFFICULTY_LABELS: Record<RecipeDifficulty, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
}

const DIFFICULTY_COLORS: Record<RecipeDifficulty, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  hard: 'bg-red-100 text-red-700',
}

export default function RecipesPage() {
  const [activeTab, setActiveTab] = useState<'discover' | 'browse' | 'mine'>('discover')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<RecipeFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  // My recipes (current user)
  const { data: myData, isLoading: isMyLoading, refetch: refetchMy } = useRecipes({
    query: search || undefined,
    categories: filters.category ? [filters.category] : undefined,
    difficulty: filters.difficulty,
    max_cook_time: filters.maxCookTime,
    page,
    limit: 24,
  })

  // Browse all recipes (all users)
  const { data: browseData, isLoading: isBrowseLoading, refetch: refetchBrowse } = useBrowseRecipes({
    query: search || undefined,
    categories: filters.category ? [filters.category] : undefined,
    difficulty: filters.difficulty,
    max_cook_time: filters.maxCookTime,
    page,
    limit: 24,
  })

  const { data: favoritesData, isLoading: isFavoritesLoading } = useFavoriteRecipes()

  // Select data based on active tab
  const data = activeTab === 'mine' ? myData : activeTab === 'browse' ? browseData : null
  const isLoading = activeTab === 'mine' ? isMyLoading : activeTab === 'browse' ? isBrowseLoading : false
  const refetch = activeTab === 'mine' ? refetchMy : refetchBrowse

  const allRecipes = data?.data || []
  const favoriteRecipes = favoritesData?.data || []
  const recipes = showFavoritesOnly ? favoriteRecipes : allRecipes
  const isLoadingRecipes = showFavoritesOnly ? isFavoritesLoading : isLoading

  const hasActiveFilters = Boolean(filters.category || filters.difficulty || filters.maxCookTime)

  const handleExternalRecipeImported = () => {
    refetchMy()
    refetchBrowse()
  }

  // Reset search and page when switching tabs
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab as 'discover' | 'browse' | 'mine')
    setSearch('')
    setFilters({})
    setShowFilters(false)
    setShowFavoritesOnly(false)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <ChefHat className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">레시피</h1>
          </div>
          <p className="text-muted-foreground ml-13">다양한 레시피를 탐색하고 관리하세요</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="discover" className="text-base">
            <Globe className="h-4 w-4 mr-2" />
            추천
          </TabsTrigger>
          <TabsTrigger value="browse" className="text-base">
            <Search className="h-4 w-4 mr-2" />
            전체
          </TabsTrigger>
          <TabsTrigger value="mine" className="text-base">
            <ChefHat className="h-4 w-4 mr-2" />
            내 레시피
          </TabsTrigger>
        </TabsList>

        {/* Discover Tab */}
        <TabsContent value="discover" className="space-y-6">
          <DiscoverSection onRecipeImported={handleExternalRecipeImported} />
        </TabsContent>

        {/* Browse Tab (All Recipes) */}
        <TabsContent value="browse" className="space-y-6">
          {/* Search & Filters */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="모든 레시피 검색..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="pl-11 h-11 rounded-xl bg-white border-2 border-primary/20 shadow-sm focus:border-primary focus:shadow-md placeholder:text-muted-foreground/60"
                  disabled={showFavoritesOnly}
                />
              </div>
              <Button
                variant={showFavoritesOnly ? 'default' : 'outline'}
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className="shrink-0 h-11 rounded-xl"
              >
                <Heart className={`h-4 w-4 mr-2 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                즐겨찾기
              </Button>
              <Button
                variant={showFilters || hasActiveFilters ? 'default' : 'outline'}
                onClick={() => setShowFilters(!showFilters)}
                className="shrink-0 h-11 rounded-xl"
                disabled={showFavoritesOnly}
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                필터
                {hasActiveFilters && (
                  <span className="ml-1.5 px-2 py-0.5 text-xs bg-white/20 rounded-full font-medium">
                    {[filters.category, filters.difficulty, filters.maxCookTime].filter(Boolean).length}
                  </span>
                )}
              </Button>
            </div>

            {showFilters && !showFavoritesOnly && (
              <div className="animate-slide-up">
                <RecipeFiltersComponent filters={filters} onChange={setFilters} />
              </div>
            )}
          </div>

          {/* Recipe Grid */}
          {isLoadingRecipes ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-primary border-t-transparent" />
              <p className="text-muted-foreground">레시피를 불러오는 중...</p>
            </div>
          ) : recipes.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-2 text-lg font-medium">
                  {search || hasActiveFilters ? '검색 결과가 없습니다' : '레시피가 없습니다'}
                </p>
                <p className="text-muted-foreground/70 text-sm mb-6">
                  {search || hasActiveFilters ? '다른 검색어를 시도해보세요' : '다른 사용자들이 레시피를 추가하면 여기에 표시됩니다'}
                </p>
                {(search || hasActiveFilters) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch('')
                      setFilters({})
                    }}
                    className="rounded-xl"
                  >
                    필터 초기화
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <RecipeGridSection recipes={recipes} data={data} page={page} setPage={setPage} />
          )}
        </TabsContent>

        {/* Mine Tab (My Recipes) */}
        <TabsContent value="mine" className="space-y-6">
          {/* Search & Filters */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="내 레시피 검색..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="pl-11 h-11 rounded-xl bg-white border-2 border-primary/20 shadow-sm focus:border-primary focus:shadow-md placeholder:text-muted-foreground/60"
                  disabled={showFavoritesOnly}
                />
              </div>
              <Button
                variant={showFavoritesOnly ? 'default' : 'outline'}
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className="shrink-0 h-11 rounded-xl"
              >
                <Heart className={`h-4 w-4 mr-2 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                즐겨찾기
              </Button>
              <Button
                variant={showFilters || hasActiveFilters ? 'default' : 'outline'}
                onClick={() => setShowFilters(!showFilters)}
                className="shrink-0 h-11 rounded-xl"
                disabled={showFavoritesOnly}
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                필터
                {hasActiveFilters && (
                  <span className="ml-1.5 px-2 py-0.5 text-xs bg-white/20 rounded-full font-medium">
                    {[filters.category, filters.difficulty, filters.maxCookTime].filter(Boolean).length}
                  </span>
                )}
              </Button>
            </div>

            {showFilters && !showFavoritesOnly && (
              <div className="animate-slide-up">
                <RecipeFiltersComponent filters={filters} onChange={setFilters} />
              </div>
            )}
          </div>

          {/* Recipe Grid */}
          {isLoadingRecipes ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-primary border-t-transparent" />
              <p className="text-muted-foreground">레시피를 불러오는 중...</p>
            </div>
          ) : recipes.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ChefHat className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-2 text-lg font-medium">
                  {search || hasActiveFilters ? '검색 결과가 없습니다' : '아직 레시피가 없습니다'}
                </p>
                <p className="text-muted-foreground/70 text-sm mb-6">
                  {search || hasActiveFilters ? '다른 검색어를 시도해보세요' : '첫 레시피를 추가해보세요'}
                </p>
                {(search || hasActiveFilters) ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch('')
                      setFilters({})
                    }}
                    className="rounded-xl"
                  >
                    필터 초기화
                  </Button>
                ) : (
                  <Button variant="gradient" asChild className="rounded-xl">
                    <Link href="/recipes/new">
                      <Plus className="h-4 w-4 mr-2" />첫 레시피 추가하기
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <RecipeGridSection recipes={recipes} data={data} page={page} setPage={setPage} />
          )}
        </TabsContent>
      </Tabs>
      {activeTab === 'mine' && <RecipeSpeedDial />}
    </div>
  )
}

// Recipe Grid Component (shared between Browse and Mine tabs)
function RecipeGridSection({
  recipes,
  data,
  page,
  setPage,
}: {
  recipes: Recipe[]
  data: any
  page: number
  setPage: React.Dispatch<React.SetStateAction<number>>
}) {
  return (
    <>
      {/* Recipe Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{data?.meta?.total || recipes.length}</span>개의 레시피
          {data?.meta?.total_pages && data.meta.total_pages > 1 && (
            <span className="ml-2 text-muted-foreground/70">
              (페이지 {page} / {data.meta.total_pages})
            </span>
          )}
        </p>
      </div>

      {/* Recipe Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {recipes.map((recipe) => (
          <Card
            key={recipe.id}
            className="group cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full relative overflow-hidden"
          >
            <Link href={`/recipes/${recipe.id}`} className="block">
              <div className="aspect-video bg-muted rounded-t-2xl overflow-hidden relative">
                <RecipeImage
                  src={recipe.image_url}
                  alt={recipe.title}
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                    {recipe.title}
                  </CardTitle>
                  <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${DIFFICULTY_COLORS[recipe.difficulty]}`}>
                    {DIFFICULTY_LABELS[recipe.difficulty]}
                  </span>
                </div>
                <CardDescription className="flex items-center gap-3 text-sm">
                  {recipe.cook_time_minutes && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {(recipe.prep_time_minutes || 0) + recipe.cook_time_minutes}분
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {recipe.servings}인분
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <RecipeStats recipeId={recipe.id} compact />
                <div className="flex flex-wrap gap-1.5">
                  {recipe.categories.slice(0, 3).map((category) => (
                    <span
                      key={category}
                      className={`px-2.5 py-1 text-xs rounded-full font-medium ${CATEGORY_COLORS[category] || 'bg-muted text-muted-foreground'}`}
                    >
                      {CATEGORY_LABELS[category] || category}
                    </span>
                  ))}
                  {recipe.categories.length > 3 && (
                    <span className="px-2.5 py-1 text-xs rounded-full bg-muted text-muted-foreground font-medium">
                      +{recipe.categories.length - 3}
                    </span>
                  )}
                </div>
              </CardContent>
            </Link>
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-1 group-hover:translate-y-0">
              <FavoriteButton recipeId={recipe.id} size="sm" />
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {data?.meta?.total_pages && data.meta.total_pages > 1 && (
        <div className="flex flex-wrap justify-center items-center gap-2 mt-8 pt-6 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-xl"
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
                  variant={page === pageNum ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  className={`w-10 rounded-xl ${page === pageNum ? 'shadow-md' : ''}`}
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
            className="rounded-xl"
          >
            다음
          </Button>
          <div className="flex items-center gap-2 ml-4 pl-4 border-l border-border/50">
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
              className="w-16 text-center rounded-xl h-9"
            />
            <span className="text-sm text-muted-foreground">/ {data.meta.total_pages}</span>
          </div>
        </div>
      )}
    </>
  )
}
