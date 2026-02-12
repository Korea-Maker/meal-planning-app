'use client'

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { addDays, format, isBefore, startOfDay } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useQueryClient } from '@tanstack/react-query'
import { useDiscoverRecipes } from '@/hooks/use-recipes'
import { useCreateMealPlan } from '@/hooks/use-meal-plan'
import { toast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import type { MealType, MealSlotWithRecipe } from '@meal-planning/shared-types'

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: '아침' },
  { value: 'lunch', label: '점심' },
  { value: 'dinner', label: '저녁' },
  { value: 'snack', label: '간식' },
]

const CUISINES = [
  { value: '', label: '전체 요리' },
  { value: 'Korean', label: '한식' },
  { value: 'Japanese', label: '일식' },
  { value: 'Chinese', label: '중식' },
  { value: 'Italian', label: '이탈리안' },
  { value: 'Mexican', label: '멕시칸' },
  { value: 'American', label: '미국식' },
]

interface AutoFillDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  weekStart: string
  existingSlots: MealSlotWithRecipe[]
  mealPlanId?: string
}

export function AutoFillDialog({
  open,
  onOpenChange,
  weekStart,
  existingSlots,
  mealPlanId,
}: AutoFillDialogProps) {
  const [selectedMealTypes, setSelectedMealTypes] = useState<MealType[]>(['lunch', 'dinner'])
  const [cuisine, setCuisine] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const queryClient = useQueryClient()
  const { data: breakfastData, isFetching: isBreakfastFetching } = useDiscoverRecipes(
    selectedMealTypes.includes('breakfast')
      ? { cuisine: cuisine || undefined, meal_type: 'breakfast' }
      : undefined
  )
  const { data: lunchData, isFetching: isLunchFetching } = useDiscoverRecipes(
    selectedMealTypes.includes('lunch')
      ? { cuisine: cuisine || undefined, meal_type: 'lunch' }
      : undefined
  )
  const { data: dinnerData, isFetching: isDinnerFetching } = useDiscoverRecipes(
    selectedMealTypes.includes('dinner')
      ? { cuisine: cuisine || undefined, meal_type: 'dinner' }
      : undefined
  )
  const { data: snackData, isFetching: isSnackFetching } = useDiscoverRecipes(
    selectedMealTypes.includes('snack')
      ? { cuisine: cuisine || undefined, meal_type: 'snack' }
      : undefined
  )
  const isDiscoverFetching = isBreakfastFetching || isLunchFetching || isDinnerFetching || isSnackFetching
  const createMealPlan = useCreateMealPlan()

  const handleMealTypeToggle = (mealType: MealType) => {
    setSelectedMealTypes((prev) =>
      prev.includes(mealType)
        ? prev.filter((t) => t !== mealType)
        : [...prev, mealType]
    )
  }

  const handleAutoFill = async () => {
    if (selectedMealTypes.length === 0) {
      toast({ title: '식사 시간대를 선택해주세요', variant: 'destructive' })
      return
    }

    // Build meal-type-specific recipe pools
    const recipesByMealType: Record<MealType, Array<{ source: string; external_id: string }>> = {
      breakfast: [
        ...(breakfastData?.korean_seed || []),
        ...(breakfastData?.spoonacular || []),
        ...(breakfastData?.themealdb || []),
      ],
      lunch: [
        ...(lunchData?.korean_seed || []),
        ...(lunchData?.spoonacular || []),
        ...(lunchData?.themealdb || []),
      ],
      dinner: [
        ...(dinnerData?.korean_seed || []),
        ...(dinnerData?.spoonacular || []),
        ...(dinnerData?.themealdb || []),
      ],
      snack: [
        ...(snackData?.korean_seed || []),
        ...(snackData?.spoonacular || []),
        ...(snackData?.themealdb || []),
      ],
    }

    const hasAnyRecipes = selectedMealTypes.some(mt => recipesByMealType[mt].length > 0)
    if (!hasAnyRecipes) {
      toast({ title: '추천 레시피가 없습니다', variant: 'destructive' })
      return
    }

    setIsLoading(true)

    try {
      // 빈 슬롯 찾기 (오늘 이전 날짜는 건너뜀)
      const existingKeys = new Set(
        existingSlots.map((s) => `${s.date}-${s.meal_type}`)
      )

      const slotsToFill: { date: string; meal_type: MealType }[] = []
      const weekStartDate = new Date(weekStart)
      const today = startOfDay(new Date())

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const dayDate = addDays(weekStartDate, dayOffset)

        // 오늘 이전 날짜는 건너뜀
        if (isBefore(startOfDay(dayDate), today)) {
          continue
        }

        const date = format(dayDate, 'yyyy-MM-dd')
        for (const mealType of selectedMealTypes) {
          const key = `${date}-${mealType}`
          if (!existingKeys.has(key)) {
            slotsToFill.push({ date, meal_type: mealType })
          }
        }
      }

      if (slotsToFill.length === 0) {
        toast({ title: '채울 빈 슬롯이 없습니다' })
        onOpenChange(false)
        return
      }

      // Track index per meal type for cycling
      const mealTypeIndex: Record<MealType, number> = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 }

      const quickPlanSlots = slotsToFill
        .map((slot) => {
          const pool = recipesByMealType[slot.meal_type]
          if (pool.length === 0) return null
          const recipe = pool[mealTypeIndex[slot.meal_type] % pool.length]
          mealTypeIndex[slot.meal_type]++
          return {
            source: recipe.source,
            external_id: recipe.external_id,
            date: slot.date,
            meal_type: slot.meal_type,
            servings: 2,
          }
        })
        .filter((s): s is NonNullable<typeof s> => s !== null)

      if (quickPlanSlots.length === 0) {
        toast({ title: '채울 수 있는 레시피가 없습니다' })
        onOpenChange(false)
        return
      }

      await api.post('/meal-plans/quick-plan', {
        week_start_date: weekStart,
        slots: quickPlanSlots,
      })

      // 식사계획 및 레시피 캐시 갱신
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] })
      queryClient.invalidateQueries({ queryKey: ['recipes'] })

      toast({
        title: '자동 채우기 완료',
        description: `${quickPlanSlots.length}개의 레시피가 추가되었습니다`,
      })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: '자동 채우기 실패',
        description: '다시 시도해주세요',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            추천으로 자동 채우기
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">채울 식사 시간대</Label>
            <div className="grid grid-cols-2 gap-3">
              {MEAL_TYPES.map((mealType) => (
                <div key={mealType.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`meal-type-${mealType.value}`}
                    checked={selectedMealTypes.includes(mealType.value)}
                    onCheckedChange={() => handleMealTypeToggle(mealType.value)}
                  />
                  <label
                    htmlFor={`meal-type-${mealType.value}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {mealType.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">요리 종류 (선택)</Label>
            <Select value={cuisine} onValueChange={setCuisine}>
              <SelectTrigger>
                <SelectValue placeholder="전체 요리" />
              </SelectTrigger>
              <SelectContent>
                {CUISINES.map((c) => (
                  <SelectItem key={c.value} value={c.value || 'all'}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-muted-foreground">
            빈 슬롯에 추천 레시피가 자동으로 채워집니다. 이미 레시피가 있는 슬롯은
            건너뜁니다.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            취소
          </Button>
          <Button onClick={handleAutoFill} disabled={selectedMealTypes.length === 0 || isLoading || isDiscoverFetching}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                채우는 중...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                자동 채우기
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
