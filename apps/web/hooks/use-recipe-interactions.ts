'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  Recipe,
  RecipeRating,
  RecipeRatingWithUser,
  RecipeStats,
  CreateRecipeRatingRequest,
  UpdateRecipeRatingRequest,
  ApiResponse,
  PaginatedResponse,
} from '@meal-planning/shared-types'

const RECIPES_KEY = 'recipes'
const RATINGS_KEY = 'ratings'
const FAVORITES_KEY = 'favorites'
const STATS_KEY = 'stats'

// ========== Rating Hooks ==========

export function useRecipeStats(recipeId: string) {
  return useQuery({
    queryKey: [RECIPES_KEY, recipeId, STATS_KEY],
    queryFn: async () => {
      const response = await api.get<ApiResponse<RecipeStats>>(`/recipes/${recipeId}/stats`)
      return response.data
    },
    enabled: Boolean(recipeId),
  })
}

export function useRecipeRatings(recipeId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: [RECIPES_KEY, recipeId, RATINGS_KEY, page, limit],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<RecipeRatingWithUser>>(
        `/recipes/${recipeId}/ratings?page=${page}&limit=${limit}`
      )
      return response
    },
    enabled: Boolean(recipeId),
  })
}

export function useMyRating(recipeId: string) {
  return useQuery({
    queryKey: [RECIPES_KEY, recipeId, RATINGS_KEY, 'mine'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<RecipeRating | null>>(
        `/recipes/${recipeId}/ratings/mine`
      )
      return response.data
    },
    enabled: Boolean(recipeId),
  })
}

export function useRateRecipe(recipeId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateRecipeRatingRequest) => {
      const response = await api.post<ApiResponse<RecipeRating>>(
        `/recipes/${recipeId}/ratings`,
        data
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY, recipeId, RATINGS_KEY] })
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY, recipeId, STATS_KEY] })
    },
  })
}

export function useUpdateRating(recipeId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateRecipeRatingRequest) => {
      const response = await api.patch<ApiResponse<RecipeRating>>(
        `/recipes/${recipeId}/ratings`,
        data
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY, recipeId, RATINGS_KEY] })
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY, recipeId, STATS_KEY] })
    },
  })
}

export function useDeleteRating(recipeId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await api.delete(`/recipes/${recipeId}/ratings`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY, recipeId, RATINGS_KEY] })
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY, recipeId, STATS_KEY] })
    },
  })
}

// ========== Favorite Hooks ==========

export function useIsFavorite(recipeId: string) {
  return useQuery({
    queryKey: [RECIPES_KEY, recipeId, FAVORITES_KEY],
    queryFn: async () => {
      const response = await api.get<ApiResponse<boolean>>(
        `/recipes/${recipeId}/favorites/check`
      )
      return response.data
    },
    enabled: Boolean(recipeId),
  })
}

export function useFavoriteRecipes(page = 1, limit = 20) {
  return useQuery({
    queryKey: [FAVORITES_KEY, page, limit],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Recipe>>(
        `/recipes/favorites?page=${page}&limit=${limit}`
      )
      return response
    },
  })
}

export function useAddFavorite(recipeId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<ApiResponse<boolean>>(
        `/recipes/${recipeId}/favorites`
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY, recipeId, FAVORITES_KEY] })
      queryClient.invalidateQueries({ queryKey: [FAVORITES_KEY] })
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY, recipeId, STATS_KEY] })
    },
  })
}

export function useRemoveFavorite(recipeId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await api.delete<ApiResponse<boolean>>(
        `/recipes/${recipeId}/favorites`
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY, recipeId, FAVORITES_KEY] })
      queryClient.invalidateQueries({ queryKey: [FAVORITES_KEY] })
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY, recipeId, STATS_KEY] })
    },
  })
}

export function useToggleFavorite(recipeId: string) {
  const queryClient = useQueryClient()
  const { data: isFavorite } = useIsFavorite(recipeId)

  const addFavorite = useAddFavorite(recipeId)
  const removeFavorite = useRemoveFavorite(recipeId)

  return {
    isFavorite,
    isPending: addFavorite.isPending || removeFavorite.isPending,
    toggle: async () => {
      if (isFavorite) {
        await removeFavorite.mutateAsync()
      } else {
        await addFavorite.mutateAsync()
      }
    },
  }
}
