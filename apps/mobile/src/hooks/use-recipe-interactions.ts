import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type {
  RecipeStats,
  RecipeRating,
  CreateRecipeRatingRequest,
  UpdateRecipeRatingRequest,
  ApiResponse,
} from '@meal-planning/shared-types';

const RECIPE_INTERACTIONS_KEY = 'recipe-interactions';
const RECIPES_KEY = 'recipes';

/**
 * Fetch recipe statistics (average rating, total ratings, favorites count)
 */
export function useRecipeStats(recipeId: string) {
  return useQuery({
    queryKey: [RECIPE_INTERACTIONS_KEY, 'stats', recipeId],
    queryFn: async () => {
      const response = await api.get<ApiResponse<RecipeStats>>(`/recipes/${recipeId}/stats`);
      return response.data;
    },
    enabled: Boolean(recipeId),
  });
}

/**
 * Fetch current user's rating for a recipe
 */
export function useMyRating(recipeId: string) {
  return useQuery({
    queryKey: [RECIPE_INTERACTIONS_KEY, 'my-rating', recipeId],
    queryFn: async () => {
      const response = await api.get<ApiResponse<RecipeRating | null>>(`/recipes/${recipeId}/ratings/me`);
      return response.data;
    },
    enabled: Boolean(recipeId),
  });
}

/**
 * Create a new rating for a recipe
 */
export function useRateRecipe(recipeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRecipeRatingRequest) => {
      const response = await api.post<ApiResponse<RecipeRating>>(
        `/recipes/${recipeId}/ratings`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate stats, my rating, and recipe details
      queryClient.invalidateQueries({ queryKey: [RECIPE_INTERACTIONS_KEY, 'stats', recipeId] });
      queryClient.invalidateQueries({ queryKey: [RECIPE_INTERACTIONS_KEY, 'my-rating', recipeId] });
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY, recipeId] });
    },
  });
}

/**
 * Update an existing rating
 */
export function useUpdateRating(recipeId: string, ratingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateRecipeRatingRequest) => {
      const response = await api.patch<ApiResponse<RecipeRating>>(
        `/recipes/${recipeId}/ratings/${ratingId}`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate stats, my rating, and recipe details
      queryClient.invalidateQueries({ queryKey: [RECIPE_INTERACTIONS_KEY, 'stats', recipeId] });
      queryClient.invalidateQueries({ queryKey: [RECIPE_INTERACTIONS_KEY, 'my-rating', recipeId] });
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY, recipeId] });
    },
  });
}

/**
 * Delete a rating
 */
export function useDeleteRating(recipeId: string, ratingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.delete(`/recipes/${recipeId}/ratings/${ratingId}`);
    },
    onSuccess: () => {
      // Invalidate stats, my rating, and recipe details
      queryClient.invalidateQueries({ queryKey: [RECIPE_INTERACTIONS_KEY, 'stats', recipeId] });
      queryClient.invalidateQueries({ queryKey: [RECIPE_INTERACTIONS_KEY, 'my-rating', recipeId] });
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY, recipeId] });
    },
  });
}

/**
 * Check if recipe is favorited by current user
 */
export function useIsFavorite(recipeId: string) {
  return useQuery({
    queryKey: [RECIPE_INTERACTIONS_KEY, 'is-favorite', recipeId],
    queryFn: async () => {
      const response = await api.get<ApiResponse<boolean>>(`/recipes/${recipeId}/favorite`);
      return response.data;
    },
    enabled: Boolean(recipeId),
  });
}

/**
 * Toggle favorite status for a recipe
 */
export function useToggleFavorite(recipeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<ApiResponse<{ is_favorite: boolean }>>(
        `/recipes/${recipeId}/favorite/toggle`
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate favorite status, stats, and recipe details
      queryClient.invalidateQueries({ queryKey: [RECIPE_INTERACTIONS_KEY, 'is-favorite', recipeId] });
      queryClient.invalidateQueries({ queryKey: [RECIPE_INTERACTIONS_KEY, 'stats', recipeId] });
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY, recipeId] });
    },
  });
}
