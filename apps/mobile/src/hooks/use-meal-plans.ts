import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type {
  MealPlan,
  MealPlanWithSlots,
  MealSlotWithRecipe,
  ApiResponse,
  PaginatedResponse,
  CreateMealPlanRequest,
  CreateMealSlotRequest,
  UpdateMealSlotRequest,
} from '@meal-planning/shared-types';

const MEAL_PLANS_KEY = 'meal-plans';

export function useMealPlans() {
  return useQuery({
    queryKey: [MEAL_PLANS_KEY],
    queryFn: () => api.get<PaginatedResponse<MealPlan>>('/meal-plans'),
  });
}

export function useMealPlan(id: string) {
  return useQuery({
    queryKey: [MEAL_PLANS_KEY, id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<MealPlanWithSlots>>(`/meal-plans/${id}`);
      return response.data;
    },
    enabled: Boolean(id),
  });
}

export function useWeekMealPlan(weekStartDate: string) {
  return useQuery({
    queryKey: [MEAL_PLANS_KEY, 'week', weekStartDate],
    queryFn: async () => {
      const response = await api.get<ApiResponse<MealPlanWithSlots | null>>(
        `/meal-plans/week/${weekStartDate}`
      );
      return response.data;
    },
    enabled: Boolean(weekStartDate),
  });
}

export function useCreateMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMealPlanRequest) => {
      const response = await api.post<ApiResponse<MealPlan>>('/meal-plans', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEAL_PLANS_KEY] });
    },
  });
}

export function useAddMealSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mealPlanId, data }: { mealPlanId: string; data: CreateMealSlotRequest }) => {
      const response = await api.post<ApiResponse<MealSlotWithRecipe>>(
        `/meal-plans/${mealPlanId}/slots`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEAL_PLANS_KEY] });
    },
  });
}

export function useUpdateMealSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      mealPlanId,
      slotId,
      data,
    }: {
      mealPlanId: string;
      slotId: string;
      data: UpdateMealSlotRequest;
    }) => {
      const response = await api.patch<ApiResponse<MealSlotWithRecipe>>(
        `/meal-plans/${mealPlanId}/slots/${slotId}`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEAL_PLANS_KEY] });
    },
  });
}

export function useDeleteMealSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mealPlanId, slotId }: { mealPlanId: string; slotId: string }) => {
      await api.delete(`/meal-plans/${mealPlanId}/slots/${slotId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEAL_PLANS_KEY] });
    },
  });
}

export function useDeleteMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/meal-plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEAL_PLANS_KEY] });
    },
  });
}

export function useQuickPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { week_start_date: string; slots: Array<{ source: string; external_id: string; date: string; meal_type: string; servings: number }> }) => {
      const response = await api.post<ApiResponse<MealPlanWithSlots>>('/meal-plans/quick-plan', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEAL_PLANS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

export function useGenerateShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mealPlanId: string) => {
      const response = await api.post<ApiResponse<{ shopping_list_id: string }>>(
        '/shopping-lists/generate',
        { meal_plan_id: mealPlanId }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });
}
