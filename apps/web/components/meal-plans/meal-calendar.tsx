'use client'

import { useState, useMemo, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { format, addDays, startOfWeek, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, ShoppingCart, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MealSlot, EmptySlot } from './meal-slot'
import { RecipePickerDialog } from './recipe-picker-dialog'
import { AutoFillDialog } from './auto-fill-dialog'
import {
  useWeekMealPlan,
  useCreateMealPlan,
  useAddMealSlot,
  useDeleteMealSlot,
  useGenerateShoppingList,
} from '@/hooks/use-meal-plan'
import { toast } from '@/hooks/use-toast'
import type { Recipe, MealType, MealSlotWithRecipe } from '@meal-planning/shared-types'

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: '아침' },
  { value: 'lunch', label: '점심' },
  { value: 'dinner', label: '저녁' },
  { value: 'snack', label: '간식' },
]

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function MealCalendar() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )

  const weekStartStr = format(weekStart, 'yyyy-MM-dd')

  const { data: mealPlan, isLoading } = useWeekMealPlan(weekStartStr)
  const createMealPlan = useCreateMealPlan()
  const addMealSlot = useAddMealSlot()
  const deleteMealSlot = useDeleteMealSlot()
  const generateShoppingList = useGenerateShoppingList()

  const pendingMealPlanIdRef = useRef<string | null>(null)
  const isGeneratingRef = useRef(false)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [autoFillOpen, setAutoFillOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedMealType, setSelectedMealType] = useState<MealType>('dinner')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }, [weekStart])

  const slotsByDateAndType = useMemo(() => {
    const map = new Map<string, MealSlotWithRecipe[]>()

    if (mealPlan?.slots) {
      mealPlan.slots.forEach((slot) => {
        const key = `${slot.date}-${slot.meal_type}`
        const existing = map.get(key) || []
        map.set(key, [...existing, slot])
      })
    }

    return map
  }, [mealPlan?.slots])

  const goToPreviousWeek = () => {
    setWeekStart((prev) => addDays(prev, -7))
  }

  const goToNextWeek = () => {
    setWeekStart((prev) => addDays(prev, 7))
  }

  const goToToday = () => {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  const handleSlotClick = async (date: Date, mealType: MealType) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    setSelectedDate(dateStr)
    setSelectedMealType(mealType)

    if (!mealPlan) {
      try {
        const newMealPlan = await createMealPlan.mutateAsync({ week_start_date: weekStartStr })
        pendingMealPlanIdRef.current = newMealPlan?.id || null
      } catch (error) {
        toast({
          title: '오류',
          description: '식사 계획을 생성할 수 없습니다',
          variant: 'destructive',
        })
        return
      }
    }

    setPickerOpen(true)
  }

  const handleRecipeSelect = async (recipe: Recipe) => {
    const mealPlanId = mealPlan?.id || pendingMealPlanIdRef.current
    if (!mealPlanId) {
      toast({
        title: '오류',
        description: '식사 계획이 없습니다',
        variant: 'destructive',
      })
      return
    }

    try {
      await addMealSlot.mutateAsync({
        mealPlanId,
        data: {
          recipe_id: recipe.id,
          date: selectedDate,
          meal_type: selectedMealType,
          servings: recipe.servings,
        },
      })
      pendingMealPlanIdRef.current = null
      toast({
        title: '레시피 추가됨',
        description: `${recipe.title}이(가) 추가되었습니다`,
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: '오류',
        description: '레시피를 추가할 수 없습니다',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteSlot = async (slotId: string) => {
    if (!mealPlan?.id) return

    try {
      await deleteMealSlot.mutateAsync({ mealPlanId: mealPlan.id, slotId })
      toast({
        title: '삭제됨',
        description: '레시피가 식사 계획에서 제거되었습니다',
      })
    } catch (error) {
      toast({
        title: '오류',
        description: '레시피를 삭제할 수 없습니다',
        variant: 'destructive',
      })
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    // 드래그앤드롭 로직은 복잡하므로 기본 구현만 제공
    const { active, over } = event
    if (active.id !== over?.id) {
      // 슬롯 순서 변경 로직
    }
  }

  const handleGenerateShoppingList = async () => {
    if (!mealPlan?.id) {
      toast({
        title: '식사 계획 필요',
        description: '먼저 레시피를 추가해 주세요',
        variant: 'destructive',
      })
      return
    }

    if (isGeneratingRef.current || generateShoppingList.isPending) {
      return
    }

    isGeneratingRef.current = true

    try {
      await generateShoppingList.mutateAsync(mealPlan.id)
      toast({
        title: '장보기 목록 생성됨',
        description: '장보기 목록이 생성되었습니다',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: '오류',
        description: '장보기 목록을 생성할 수 없습니다',
        variant: 'destructive',
      })
    } finally {
      isGeneratingRef.current = false
    }
  }

  const today = new Date()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            오늘
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-2 font-medium">
            {format(weekStart, 'yyyy년 M월 d일', { locale: ko })} -{' '}
            {format(addDays(weekStart, 6), 'M월 d일', { locale: ko })}
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAutoFillOpen(true)}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            추천으로 채우기
          </Button>
          <Button
            onClick={handleGenerateShoppingList}
            disabled={!mealPlan || generateShoppingList.isPending}
          >
            {generateShoppingList.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4 mr-2" />
            )}
            장보기 목록 생성
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const isToday = isSameDay(day, today)
              const dateStr = format(day, 'yyyy-MM-dd')

              return (
                <div key={dateStr} className="min-w-0">
                  <div
                    className={`text-center py-2 rounded-t-lg ${
                      isToday ? 'bg-primary text-primary-foreground' : 'bg-gray-100'
                    }`}
                  >
                    <p className="text-xs">{WEEKDAYS[day.getDay()]}</p>
                    <p className="font-medium">{format(day, 'd')}</p>
                  </div>

                  <div className="border border-t-0 rounded-b-lg p-2 space-y-3 min-h-[400px] bg-white">
                    {MEAL_TYPES.map((mealType) => {
                      const key = `${dateStr}-${mealType.value}`
                      const slots = slotsByDateAndType.get(key) || []

                      return (
                        <div key={mealType.value} className="space-y-1">
                          <p className="text-xs font-medium text-gray-500 px-1">
                            {mealType.label}
                          </p>
                          <SortableContext
                            items={slots.map((s) => s.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {slots.map((slot) => (
                              <MealSlot
                                key={slot.id}
                                slot={slot}
                                onDelete={handleDeleteSlot}
                              />
                            ))}
                          </SortableContext>
                          <EmptySlot
                            onClick={() => handleSlotClick(day, mealType.value)}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </DndContext>
      )}

      <RecipePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleRecipeSelect}
        mealType={selectedMealType}
        date={selectedDate}
      />

      <AutoFillDialog
        open={autoFillOpen}
        onOpenChange={setAutoFillOpen}
        weekStart={weekStartStr}
        existingSlots={mealPlan?.slots || []}
        mealPlanId={mealPlan?.id}
      />
    </div>
  )
}
