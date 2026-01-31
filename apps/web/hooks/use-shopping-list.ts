'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  ShoppingList,
  ShoppingListWithItems,
  CreateShoppingListRequest,
  CreateShoppingItemRequest,
  UpdateShoppingItemRequest,
  PaginatedResponse,
  ApiResponse,
} from '@meal-planning/shared-types'

const SHOPPING_LISTS_KEY = 'shopping-lists'

export function useShoppingLists() {
  return useQuery({
    queryKey: [SHOPPING_LISTS_KEY],
    queryFn: () => api.get<PaginatedResponse<ShoppingList>>('/shopping-lists'),
  })
}

export function useShoppingList(id: string) {
  return useQuery({
    queryKey: [SHOPPING_LISTS_KEY, id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<ShoppingListWithItems>>(`/shopping-lists/${id}`)
      return response.data
    },
    enabled: Boolean(id),
  })
}

export function useCreateShoppingList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateShoppingListRequest) => {
      const response = await api.post<ApiResponse<ShoppingListWithItems>>('/shopping-lists', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_LISTS_KEY] })
    },
  })
}

export function useAddShoppingItem(listId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateShoppingItemRequest) => {
      const response = await api.post<ApiResponse<ShoppingListWithItems>>(
        `/shopping-lists/${listId}/items`,
        data
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_LISTS_KEY, listId] })
    },
  })
}

export function useUpdateShoppingItem(listId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: UpdateShoppingItemRequest }) => {
      const response = await api.patch<ApiResponse<ShoppingListWithItems>>(
        `/shopping-lists/${listId}/items/${itemId}`,
        data
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_LISTS_KEY, listId] })
    },
  })
}

export function useCheckShoppingItem(listId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (itemId: string) =>
      api.post<void>(`/shopping-lists/${listId}/items/${itemId}/check`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_LISTS_KEY, listId] })
    },
  })
}

export function useDeleteShoppingItem(listId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (itemId: string) =>
      api.delete<void>(`/shopping-lists/${listId}/items/${itemId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_LISTS_KEY, listId] })
    },
  })
}

export function useDeleteShoppingList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/shopping-lists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_LISTS_KEY] })
    },
  })
}
