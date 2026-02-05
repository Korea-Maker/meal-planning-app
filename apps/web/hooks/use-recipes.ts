'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  Recipe,
  RecipeWithDetails,
  CreateRecipeRequest,
  UpdateRecipeRequest,
  PaginatedResponse,
  RecipeSearchParams,
  URLExtractionRequest,
  URLExtractionResponse,
  ApiResponse,
  ExternalRecipeSource,
  DiscoverRecipesResponse,
  ExternalSearchResponse,
  ExternalRecipeDetail,
  ExternalSourceInfo,
} from '@meal-planning/shared-types'

const RECIPES_KEY = 'recipes'

export function useRecipes(params?: RecipeSearchParams) {
  const queryParams = new URLSearchParams()

  // 검색 파라미터가 있는지 확인
  const hasSearchParams = params?.query || params?.categories?.length ||
    params?.difficulty || params?.max_prep_time || params?.max_cook_time

  if (params?.query) queryParams.set('query', params.query)
  if (params?.categories?.length) queryParams.set('categories', params.categories.join(','))
  if (params?.difficulty) queryParams.set('difficulty', params.difficulty)
  if (params?.max_prep_time) queryParams.set('max_prep_time', params.max_prep_time.toString())
  if (params?.max_cook_time) queryParams.set('max_cook_time', params.max_cook_time.toString())

  // 페이지네이션 (기본값: 100개)
  queryParams.set('page', (params?.page || 1).toString())
  queryParams.set('limit', (params?.limit || 100).toString())

  const queryString = queryParams.toString()
  // 검색 파라미터가 있으면 /recipes/search 사용, 없으면 /recipes 사용
  const endpoint = hasSearchParams
    ? `/recipes/search?${queryString}`
    : `/recipes?${queryString}`

  return useQuery({
    queryKey: [RECIPES_KEY, params],
    queryFn: () => api.get<PaginatedResponse<Recipe>>(endpoint),
  })
}

interface UseRecipeOptions {
  enabled?: boolean
}

export function useRecipe(id: string, options?: UseRecipeOptions) {
  const isEnabled = options?.enabled !== undefined ? options.enabled : Boolean(id)

  return useQuery({
    queryKey: [RECIPES_KEY, id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<RecipeWithDetails>>(`/recipes/${id}`)
      return response.data
    },
    enabled: isEnabled,
  })
}

export function useCreateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateRecipeRequest) => {
      const response = await api.post<ApiResponse<RecipeWithDetails>>('/recipes', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY] })
    },
  })
}

export function useUpdateRecipe(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateRecipeRequest) => {
      const response = await api.patch<ApiResponse<RecipeWithDetails>>(`/recipes/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY] })
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY, id] })
    },
  })
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/recipes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY] })
    },
  })
}

export function useAdjustServings(id: string) {
  return useMutation({
    mutationFn: async (servings: number) => {
      const response = await api.post<ApiResponse<RecipeWithDetails>>(
        `/recipes/${id}/adjust-servings?servings=${servings}`
      )
      return response.data
    },
  })
}

export function useExtractRecipeFromUrl() {
  return useMutation({
    mutationFn: (data: URLExtractionRequest) =>
      api.post<URLExtractionResponse>('/recipes/extract-from-url', data),
  })
}

// ==================== External Recipe Hooks ====================

const EXTERNAL_RECIPES_KEY = 'external-recipes'

export interface DiscoverParams {
  category?: string
  cuisine?: string
  number?: number
}

export function useDiscoverRecipes(params?: DiscoverParams) {
  const queryParams = new URLSearchParams()

  if (params?.category) queryParams.set('category', params.category)
  if (params?.cuisine) queryParams.set('cuisine', params.cuisine)
  if (params?.number) queryParams.set('number', params.number.toString())

  const queryString = queryParams.toString()
  const endpoint = queryString ? `/recipes/discover?${queryString}` : '/recipes/discover'

  return useQuery({
    queryKey: [EXTERNAL_RECIPES_KEY, 'discover', params],
    queryFn: async () => {
      const response = await api.get<ApiResponse<DiscoverRecipesResponse>>(endpoint)
      return response.data
    },
  })
}

export interface ExternalSearchParams {
  query: string
  source?: ExternalRecipeSource
  cuisine?: string
  maxReadyTime?: number
  page?: number
  limit?: number
}

export function useExternalRecipeSearch(params: ExternalSearchParams | null) {
  return useQuery({
    queryKey: [EXTERNAL_RECIPES_KEY, 'search', params],
    queryFn: async () => {
      if (!params) return null

      const queryParams = new URLSearchParams()
      queryParams.set('query', params.query)
      if (params.source) queryParams.set('source', params.source)
      if (params.cuisine) queryParams.set('cuisine', params.cuisine)
      if (params.maxReadyTime) queryParams.set('max_ready_time', params.maxReadyTime.toString())
      if (params.page) queryParams.set('page', params.page.toString())
      if (params.limit) queryParams.set('limit', params.limit.toString())

      const response = await api.get<ApiResponse<ExternalSearchResponse>>(
        `/recipes/search/external?${queryParams.toString()}`
      )
      return response.data
    },
    enabled: !!params?.query,
  })
}

export function useExternalRecipe(source: ExternalRecipeSource | null, externalId: string | null) {
  return useQuery({
    queryKey: [EXTERNAL_RECIPES_KEY, source, externalId],
    queryFn: async () => {
      if (!source || !externalId) return null
      const response = await api.get<ApiResponse<ExternalRecipeDetail>>(
        `/recipes/external/${source}/${externalId}`
      )
      return response.data
    },
    enabled: !!source && !!externalId,
  })
}

export function useExternalSources() {
  return useQuery({
    queryKey: [EXTERNAL_RECIPES_KEY, 'sources'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<ExternalSourceInfo[]>>('/recipes/external/sources')
      return response.data
    },
    staleTime: 1000 * 60 * 60, // 1시간
  })
}

export function useExternalCuisines() {
  return useQuery({
    queryKey: [EXTERNAL_RECIPES_KEY, 'cuisines'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<string[]>>('/recipes/external/cuisines')
      return response.data
    },
    staleTime: 1000 * 60 * 60, // 1시간
  })
}

export function useExternalCategories() {
  return useQuery({
    queryKey: [EXTERNAL_RECIPES_KEY, 'categories'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Array<{ idCategory: string; strCategory: string; strCategoryThumb: string; strCategoryDescription: string }>>>('/recipes/external/categories')
      return response.data
    },
    staleTime: 1000 * 60 * 60, // 1시간
  })
}

export function useImportExternalRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ source, externalId }: { source: ExternalRecipeSource; externalId: string }) => {
      const response = await api.post<ApiResponse<RecipeWithDetails>>(
        `/recipes/import/${source}/${externalId}`
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY] })
    },
  })
}
