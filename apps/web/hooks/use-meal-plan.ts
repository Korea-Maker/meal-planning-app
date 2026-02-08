'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  MealPlan,
  MealPlanWithSlots,
  CreateMealPlanRequest,
  CreateMealSlotRequest,
  UpdateMealSlotRequest,
  MealSlotWithRecipe,
  PaginatedResponse,
  ApiResponse,
} from '@meal-planning/shared-types'

const MEAL_PLANS_KEY = 'meal-plans'

export function useMealPlans() {
  return useQuery({
    queryKey: [MEAL_PLANS_KEY],
    queryFn: () => api.get<PaginatedResponse<MealPlan>>('/meal-plans'),
  })
}

export function useMealPlan(id: string) {
  return useQuery({
    queryKey: [MEAL_PLANS_KEY, id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<MealPlanWithSlots>>(`/meal-plans/${id}`)
      return response.data
    },
    enabled: Boolean(id),
  })
}

export function useWeekMealPlan(weekStartDate: string) {
  return useQuery({
    queryKey: [MEAL_PLANS_KEY, 'week', weekStartDate],
    queryFn: async () => {
      const response = await api.get<ApiResponse<MealPlanWithSlots | null>>(`/meal-plans/week/${weekStartDate}`)
      return response.data
    },
    enabled: Boolean(weekStartDate),
  })
}

export function useCreateMealPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateMealPlanRequest) => {
      const response = await api.post<ApiResponse<MealPlanWithSlots>>('/meal-plans', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEAL_PLANS_KEY] })
    },
  })
}

export function useAddMealSlot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ mealPlanId, data }: { mealPlanId: string; data: CreateMealSlotRequest }) => {
      const response = await api.post<ApiResponse<MealSlotWithRecipe>>(`/meal-plans/${mealPlanId}/slots`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEAL_PLANS_KEY] })
    },
  })
}

export function useUpdateMealSlot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ mealPlanId, slotId, data }: { mealPlanId: string; slotId: string; data: UpdateMealSlotRequest }) => {
      const response = await api.patch<ApiResponse<MealSlotWithRecipe>>(`/meal-plans/${mealPlanId}/slots/${slotId}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEAL_PLANS_KEY] })
    },
  })
}

export function useDeleteMealSlot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ mealPlanId, slotId }: { mealPlanId: string; slotId: string }) => {
      await api.delete<void>(`/meal-plans/${mealPlanId}/slots/${slotId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEAL_PLANS_KEY] })
    },
  })
}

export function useDeleteMealPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (mealPlanId: string) => {
      await api.delete<void>(`/meal-plans/${mealPlanId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEAL_PLANS_KEY] })
    },
  })
}

export function useGenerateShoppingList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      mealPlanId: string
      dates?: string[]
      mealTypes?: string[]
    }) => {
      const response = await api.post<ApiResponse<{ id: string }>>('/shopping-lists/generate', {
        meal_plan_id: params.mealPlanId,
        dates: params.dates,
        meal_types: params.mealTypes,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] })
    },
  })
}
