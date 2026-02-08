'use client'

import { useState } from 'react'
import { Search, Globe, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExternalRecipeCard } from './external-recipe-card'
import {
  useDiscoverRecipes,
  useExternalRecipeSearch,
  useExternalCuisines,
  useExternalSources,
  type ExternalSearchParams,
} from '@/hooks/use-recipes'
import type { ExternalRecipeSource } from '@meal-planning/shared-types'

interface DiscoverSectionProps {
  onRecipeImported?: () => void
}

export function DiscoverSection({ onRecipeImported }: DiscoverSectionProps) {
  const [activeTab, setActiveTab] = useState<'discover' | 'search'>('discover')
  const [discoverCategory, setDiscoverCategory] = useState<string>('')
  const [discoverCuisine, setDiscoverCuisine] = useState<string>('')
  const [searchParams, setSearchParams] = useState<ExternalSearchParams | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSource, setSearchSource] = useState<ExternalRecipeSource | 'all'>('all')

  const { data: cuisines } = useExternalCuisines()
  const { data: sources } = useExternalSources()

  const {
    data: discoverData,
    isLoading: isDiscoverLoading,
    refetch: refetchDiscover,
  } = useDiscoverRecipes({
    category: discoverCategory || undefined,
    cuisine: discoverCuisine || undefined,
    number: 18,
  })

  const {
    data: searchData,
    isLoading: isSearchLoading,
  } = useExternalRecipeSearch(searchParams)

  const handleSearch = () => {
    if (!searchQuery.trim()) return
    setSearchParams({
      query: searchQuery,
      source: searchSource === 'all' ? undefined : searchSource,
      limit: 20,
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const availableSources = sources?.filter(s => s.available) || []

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'discover' | 'search')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="discover">추천 레시피</TabsTrigger>
          <TabsTrigger value="search">검색</TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select value={discoverCuisine || 'all'} onValueChange={(v) => setDiscoverCuisine(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[160px] bg-white">
                <SelectValue placeholder="요리 종류" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {cuisines?.map((cuisine) => (
                  <SelectItem key={cuisine} value={cuisine}>
                    {cuisine}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={discoverCategory || 'all'} onValueChange={(v) => setDiscoverCategory(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[160px] bg-white">
                <SelectValue placeholder="카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="breakfast">아침</SelectItem>
                <SelectItem value="lunch">점심</SelectItem>
                <SelectItem value="dinner">저녁</SelectItem>
                <SelectItem value="dessert">디저트</SelectItem>
                <SelectItem value="vegetarian">채식</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => refetchDiscover()}
              disabled={isDiscoverLoading}
              className="bg-white"
            >
              <RefreshCw className={`h-4 w-4 ${isDiscoverLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {isDiscoverLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : discoverData ? (
            <div className="space-y-4">
              {discoverData.spoonacular.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Spoonacular</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {discoverData.spoonacular.map((recipe) => (
                      <ExternalRecipeCard
                        key={`spoon-${recipe.external_id}`}
                        recipe={recipe}
                        onImported={onRecipeImported}
                      />
                    ))}
                  </div>
                </div>
              )}

              {discoverData.themealdb.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">TheMealDB</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {discoverData.themealdb.map((recipe) => (
                      <ExternalRecipeCard
                        key={`mealdb-${recipe.external_id}`}
                        recipe={recipe}
                        onImported={onRecipeImported}
                      />
                    ))}
                  </div>
                </div>
              )}

              {discoverData.total === 0 && (
                <p className="text-center text-gray-500 py-8">
                  추천 레시피가 없습니다. 필터를 변경해 보세요.
                </p>
              )}
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="레시피 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10 bg-white"
              />
            </div>
            <Select value={searchSource} onValueChange={(v) => setSearchSource(v as ExternalRecipeSource | 'all')}>
              <SelectTrigger className="w-[150px] bg-white">
                <SelectValue placeholder="소스" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 소스</SelectItem>
                {availableSources.map((source) => (
                  <SelectItem key={source.id} value={source.id}>
                    {source.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} disabled={isSearchLoading || !searchQuery.trim()}>
              {isSearchLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {isSearchLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : searchData ? (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                {searchData.total}개의 결과
              </p>
              {searchData.results.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchData.results.map((recipe) => (
                    <ExternalRecipeCard
                      key={`${recipe.source}-${recipe.external_id}`}
                      recipe={recipe}
                      onImported={onRecipeImported}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  검색 결과가 없습니다. 다른 검색어를 시도해 보세요.
                </p>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              검색어를 입력하여 외부 레시피를 찾아보세요.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
