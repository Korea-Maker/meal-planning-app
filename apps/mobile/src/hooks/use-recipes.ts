import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type {
  Recipe,
  RecipeWithDetails,
  ApiResponse,
  PaginatedResponse,
  RecipeSearchParams,
  CreateRecipeRequest,
  UpdateRecipeRequest,
} from '@meal-planning/shared-types';

const RECIPES_KEY = 'recipes';

export function useRecipes(params?: RecipeSearchParams) {
  return useQuery({
    queryKey: [RECIPES_KEY, params],
    queryFn: async () => {
      let endpoint = '/recipes';

      if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams();
        if (params.query) searchParams.append('query', params.query);
        if (params.difficulty) searchParams.append('difficulty', params.difficulty);
        if (params.max_prep_time) searchParams.append('max_prep_time', String(params.max_prep_time));
        if (params.max_cook_time) searchParams.append('max_cook_time', String(params.max_cook_time));
        if (params.page) searchParams.append('page', String(params.page));
        if (params.limit) searchParams.append('limit', String(params.limit));
        if (params.categories?.length) {
          params.categories.forEach(cat => searchParams.append('categories', cat));
        }

        const queryString = searchParams.toString();
        endpoint = queryString ? `/recipes/search?${queryString}` : '/recipes';
      }

      return api.get<PaginatedResponse<Recipe>>(endpoint);
    },
  });
}

export interface UseRecipeOptions {
  enabled?: boolean;
}

export function useRecipe(id: string, options?: UseRecipeOptions) {
  const isEnabled = options?.enabled !== undefined ? options.enabled : Boolean(id);

  return useQuery({
    queryKey: [RECIPES_KEY, id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<RecipeWithDetails>>(`/recipes/${id}`);
      return response.data;
    },
    enabled: isEnabled,
  });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRecipeRequest) => {
      const response = await api.post<ApiResponse<Recipe>>('/recipes', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY] });
    },
  });
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRecipeRequest }) => {
      const response = await api.patch<ApiResponse<Recipe>>(`/recipes/${id}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY] });
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY, id] });
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/recipes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECIPES_KEY] });
    },
  });
}

export function useAdjustServings() {
  return useMutation({
    mutationFn: async ({ id, servings }: { id: string; servings: number }) => {
      const response = await api.post<ApiResponse<RecipeWithDetails>>(
        `/recipes/${id}/adjust-servings`,
        { servings }
      );
      return response.data;
    },
  });
}

export function useBrowseRecipes(params?: { query?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['browse-recipes', params],
    queryFn: async () => {
      let endpoint = '/recipes/browse';
      if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams();
        if (params.query) searchParams.append('query', params.query);
        if (params.page) searchParams.append('page', String(params.page));
        if (params.limit) searchParams.append('limit', String(params.limit));
        const qs = searchParams.toString();
        if (qs) endpoint += `?${qs}`;
      }
      return api.get<PaginatedResponse<Recipe>>(endpoint);
    },
  });
}
