'use client'

import { useState, useMemo, useCallback } from 'react'
import { format, addDays, startOfWeek, isSameDay, isToday as isDateToday } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, ShoppingCart, Loader2, Sparkles, UtensilsCrossed, Clock, Users, Flame, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MealSlot, EmptySlot } from './meal-slot'
import { RecipePickerDialog } from './recipe-picker-dialog'
import { AutoFillDialog } from './auto-fill-dialog'
import { RecipeDetailModal } from './recipe-detail-modal'
import { ShoppingListDialog } from './shopping-list-dialog'
import {
  useWeekMealPlan,
  useCreateMealPlan,
  useAddMealSlot,
  useUpdateMealSlot,
  useDeleteMealSlot,
  useDeleteMealPlan,
  useGenerateShoppingList,
} from '@/hooks/use-meal-plan'
import { toast } from '@/hooks/use-toast'
import type { Recipe, MealType, MealSlotWithRecipe } from '@meal-planning/shared-types'

const MEAL_TYPES: { value: MealType; label: string; icon: string }[] = [
  { value: 'breakfast', label: '아침', icon: '🌅' },
  { value: 'lunch', label: '점심', icon: '☀️' },
  { value: 'dinner', label: '저녁', icon: '🌙' },
  { value: 'snack', label: '간식', icon: '🍪' },
]

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const MEAL_COLORS: Record<MealType, { bg: string; border: string; text: string }> = {
  breakfast: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700' },
  lunch: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700' },
  dinner: { bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-700' },
  snack: { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-700' },
}

// Droppable meal section component
interface DroppableMealSectionProps {
  droppableId: string
  mealType: { value: MealType; label: string; icon: string }
  slots: MealSlotWithRecipe[]
  onAdd: () => void
  onDelete: (slotId: string) => void
  onDrop: (slotId: string, targetId: string) => void
  onRecipeClick?: (recipeId: string) => void
  compact?: boolean
}

function DroppableMealSection({
  droppableId,
  mealType,
  slots,
  onAdd,
  onDelete,
  onDrop,
  onRecipeClick,
  compact = false,
}: DroppableMealSectionProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const colors = MEAL_COLORS[mealType.value]

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const slotId = e.dataTransfer.getData('text/plain')
    if (slotId) {
      onDrop(slotId, droppableId)
    }
  }, [droppableId, onDrop])

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        rounded-xl p-3 transition-all duration-200 border min-h-[60px]
        ${colors.bg} ${colors.border}
        ${isDragOver ? 'ring-2 ring-primary ring-offset-2 scale-[1.02] shadow-lg bg-primary/10' : 'shadow-sm'}
        ${compact ? 'p-2' : 'p-3'}
      `}
    >
      <div className={`flex items-center gap-2 mb-2 ${compact ? 'mb-1' : 'mb-2'}`}>
        <span className={compact ? 'text-sm' : 'text-base'}>{mealType.icon}</span>
        <span className={`font-semibold ${colors.text} ${compact ? 'text-xs' : 'text-sm'}`}>
          {mealType.label}
        </span>
      </div>

      <div className={`space-y-2 ${compact ? 'space-y-1' : 'space-y-2'}`}>
        {slots.map((slot) => (
          <MealSlot key={slot.id} slot={slot} onDelete={onDelete} onClick={onRecipeClick} compact={compact} />
        ))}
      </div>

      {slots.length === 0 && (
        <EmptySlot onClick={onAdd} compact={compact} />
      )}
    </div>
  )
}

export function MealCalendar() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const today = new Date()
    const start = startOfWeek(today, { weekStartsOn: 1 })
    const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return Math.min(Math.max(diff, 0), 6)
  })

  const weekStartStr = format(weekStart, 'yyyy-MM-dd')

  const { data: mealPlan, isLoading } = useWeekMealPlan(weekStartStr)
  const createMealPlan = useCreateMealPlan()
  const addMealSlot = useAddMealSlot()
  const updateSlot = useUpdateMealSlot()
  const deleteMealSlot = useDeleteMealSlot()
  const deleteMealPlan = useDeleteMealPlan()
  const generateShoppingList = useGenerateShoppingList()

  const [pickerOpen, setPickerOpen] = useState(false)
  const [autoFillOpen, setAutoFillOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedMealType, setSelectedMealType] = useState<MealType>('dinner')
  const [recipeDetailOpen, setRecipeDetailOpen] = useState(false)
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)

  const handleRecipeClick = useCallback((recipeId: string) => {
    setSelectedRecipeId(recipeId)
    setRecipeDetailOpen(true)
  }, [])

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

  // Find slot by ID
  const findSlotById = useCallback((slotId: string): MealSlotWithRecipe | undefined => {
    return mealPlan?.slots?.find((s) => s.id === slotId)
  }, [mealPlan?.slots])

  const goToPreviousWeek = () => {
    setWeekStart((prev) => addDays(prev, -7))
  }

  const goToNextWeek = () => {
    setWeekStart((prev) => addDays(prev, 7))
  }

  const goToToday = () => {
    const today = new Date()
    setWeekStart(startOfWeek(today, { weekStartsOn: 1 }))
    const start = startOfWeek(today, { weekStartsOn: 1 })
    const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    setSelectedDayIndex(Math.min(Math.max(diff, 0), 6))
  }

  const handleSlotClick = async (date: Date, mealType: MealType) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    setSelectedDate(dateStr)
    setSelectedMealType(mealType)

    if (!mealPlan) {
      try {
        await createMealPlan.mutateAsync({ week_start_date: weekStartStr })
      } catch {
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
    const mealPlanId = mealPlan?.id
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
      toast({
        title: '레시피 추가됨',
        description: `${recipe.title}이(가) 추가되었습니다`,
        variant: 'success',
      })
    } catch {
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
    } catch {
      toast({
        title: '오류',
        description: '레시피를 삭제할 수 없습니다',
        variant: 'destructive',
      })
    }
  }

  const handleDrop = useCallback((slotId: string, targetId: string) => {
    if (!mealPlan?.id) return

    // Parse target droppableId (format: "YYYY-MM-DD-mealType")
    const lastDashIndex = targetId.lastIndexOf('-')
    if (lastDashIndex === -1) return

    const newDate = targetId.substring(0, lastDashIndex)
    const newMealType = targetId.substring(lastDashIndex + 1) as MealType

    // Validate
    if (!MEAL_TYPES.some((mt) => mt.value === newMealType)) return
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) return

    // Find current slot
    const currentSlot = findSlotById(slotId)
    if (!currentSlot) return

    // Skip if same position
    if (currentSlot.date === newDate && currentSlot.meal_type === newMealType) return

    // Update slot position
    updateSlot.mutate(
      {
        mealPlanId: mealPlan.id,
        slotId: slotId,
        data: { date: newDate, meal_type: newMealType },
      },
      {
        onSuccess: () => {
          toast({
            title: '이동됨',
            description: '식사가 이동되었습니다',
          })
        },
        onError: (error: Error & { response?: { status?: number } }) => {
          const isConflict = error.response?.status === 409 || error.message?.includes('409')
          toast({
            title: isConflict ? '이동 불가' : '오류',
            description: isConflict
              ? '해당 시간대에 이미 식사가 있습니다. 먼저 기존 식사를 삭제해주세요.'
              : '식사를 이동할 수 없습니다',
            variant: 'destructive',
          })
        },
      }
    )
  }, [mealPlan?.id, findSlotById, updateSlot])

  const handleGenerateShoppingList = async (params: { mealPlanId: string; dates?: string[]; mealTypes?: string[] }) => {
    if (generateShoppingList.isPending) return

    try {
      await generateShoppingList.mutateAsync(params)
      toast({
        title: '장보기 목록 생성됨',
        description: '장보기 목록이 생성되었습니다',
        variant: 'success',
      })
    } catch {
      toast({
        title: '오류',
        description: '장보기 목록을 생성할 수 없습니다',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteAllMeals = async () => {
    if (!mealPlan?.id) {
      toast({
        title: '삭제할 계획 없음',
        description: '삭제할 식사 계획이 없습니다',
        variant: 'destructive',
      })
      return
    }

    if (deleteMealPlan.isPending) return

    const confirmed = window.confirm('이번 주 식사 계획을 모두 삭제하시겠습니까?')
    if (!confirmed) return

    try {
      await deleteMealPlan.mutateAsync(mealPlan.id)
      toast({
        title: '삭제 완료',
        description: '이번 주 식사 계획이 모두 삭제되었습니다',
      })
    } catch {
      toast({
        title: '오류',
        description: '식사 계획을 삭제할 수 없습니다',
        variant: 'destructive',
      })
    }
  }

  const today = new Date()

  // Tablet view (md to xl): 3-day horizontal scroll with snap
  const renderTabletView = () => (
    <div className="hidden md:block xl:hidden">
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide">
        {weekDays.map((day) => {
          const isToday = isSameDay(day, today)
          const dateStr = format(day, 'yyyy-MM-dd')

          return (
            <div
              key={dateStr}
              className="flex-shrink-0 w-[calc(33.333%-12px)] min-w-[280px] snap-start"
            >
              <div
                className={`text-center py-4 rounded-t-2xl transition-all ${
                  isToday
                    ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg'
                    : 'bg-muted/50'
                }`}
              >
                <p className={`text-sm font-medium ${isToday ? '' : 'text-muted-foreground'}`}>
                  {WEEKDAYS[day.getDay()]}요일
                </p>
                <p className={`text-2xl font-bold ${isToday ? '' : 'text-foreground'}`}>
                  {format(day, 'M월 d일', { locale: ko })}
                </p>
              </div>

              <div className="border border-t-0 rounded-b-2xl p-4 space-y-4 min-h-[450px] bg-card">
                {MEAL_TYPES.map((mealType) => {
                  const droppableId = `${dateStr}-${mealType.value}`
                  const slots = slotsByDateAndType.get(droppableId) || []

                  return (
                    <DroppableMealSection
                      key={mealType.value}
                      droppableId={droppableId}
                      mealType={mealType}
                      slots={slots}
                      onAdd={() => handleSlotClick(day, mealType.value)}
                      onDelete={handleDeleteSlot}
                      onDrop={handleDrop}
                      onRecipeClick={handleRecipeClick}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  // Mobile view (below md): Grid calendar matching mobile app style
  const renderMobileView = () => {
    const MOBILE_DAYS = ['월', '화', '수', '목', '금', '토', '일']

    return (
      <div className="md:hidden space-y-0">
        {/* Day Headers */}
        <div className="flex bg-card border-b border-border">
          <div className="w-[52px] shrink-0" />
          {weekDays.map((day, idx) => {
            const isToday = isDateToday(day)
            return (
              <div
                key={idx}
                className={`flex-1 text-center py-2 ${isToday ? 'bg-primary/10 rounded-md mx-0.5' : ''}`}
              >
                <p className={`text-[11px] font-medium ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                  {MOBILE_DAYS[idx]}
                </p>
                <p className={`text-[11px] ${isToday ? 'text-primary font-semibold' : 'text-muted-foreground/70'}`}>
                  {format(day, 'M/d')}
                </p>
              </div>
            )
          })}
        </div>

        {/* Meal Type Rows */}
        {MEAL_TYPES.map((mealType) => (
          <div key={mealType.value} className="flex border-b border-border">
            {/* Meal type label */}
            <div className="w-[52px] shrink-0 flex flex-col items-center justify-center py-2">
              <span className="text-base">{mealType.icon}</span>
              <span className="text-[10px] text-muted-foreground">{mealType.label}</span>
            </div>
            {/* Day cells */}
            {weekDays.map((day, idx) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const key = `${dateStr}-${mealType.value}`
              const slots = slotsByDateAndType.get(key) || []
              const slot = slots[0]
              const colors = MEAL_COLORS[mealType.value]

              return (
                <button
                  key={idx}
                  onClick={() => slot ? handleRecipeClick(slot.recipe.id) : handleSlotClick(day, mealType.value)}
                  className={`
                    flex-1 min-h-[56px] mx-0.5 my-1 rounded-md border text-center flex flex-col items-center justify-center p-1 transition-all
                    ${slot
                      ? `${colors.bg} ${colors.border} border-solid shadow-sm active:scale-95`
                      : 'border-dashed border-border/60 active:bg-muted'
                    }
                  `}
                >
                  {slot ? (
                    <>
                      <span className={`text-[10px] font-semibold leading-tight line-clamp-2 ${colors.text}`}>
                        {slot.recipe.title}
                      </span>
                      {slot.servings && (
                        <span className="text-[9px] text-muted-foreground mt-0.5">{slot.servings}인분</span>
                      )}
                    </>
                  ) : (
                    <span className="text-lg text-muted-foreground/40">+</span>
                  )}
                </button>
              )
            })}
          </div>
        ))}

        {/* Generate Shopping List Button */}
        <div className="p-4">
          <Button
            onClick={() => mealPlan?.id && handleGenerateShoppingList({ mealPlanId: mealPlan.id })}
            disabled={!mealPlan || !mealPlan.slots?.length || generateShoppingList.isPending}
            className="w-full h-12 rounded-xl"
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
    )
  }

  // List view for desktop - shows all meals in a table format
  const renderListView = () => {
    // Group slots by date
    const slotsByDate = new Map<string, MealSlotWithRecipe[]>()
    weekDays.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const daySlots: MealSlotWithRecipe[] = []
      MEAL_TYPES.forEach((mealType) => {
        const key = `${dateStr}-${mealType.value}`
        const slots = slotsByDateAndType.get(key) || []
        daySlots.push(...slots)
      })
      slotsByDate.set(dateStr, daySlots)
    })

    return (
      <div className="hidden xl:block space-y-4">
        {weekDays.map((day) => {
          const isToday = isSameDay(day, today)
          const dateStr = format(day, 'yyyy-MM-dd')
          const daySlots = slotsByDate.get(dateStr) || []

          return (
            <div
              key={dateStr}
              className={`rounded-2xl border overflow-hidden ${
                isToday ? 'ring-2 ring-primary ring-offset-2' : ''
              }`}
            >
              {/* Date header */}
              <div
                className={`px-6 py-4 ${
                  isToday
                    ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground'
                    : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl font-bold ${isToday ? '' : 'text-foreground'}`}>
                      {format(day, 'd')}
                    </span>
                    <div>
                      <p className={`font-semibold ${isToday ? '' : 'text-foreground'}`}>
                        {format(day, 'EEEE', { locale: ko })}
                      </p>
                      <p className={`text-sm ${isToday ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {format(day, 'M월', { locale: ko })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {MEAL_TYPES.map((mealType) => {
                      const key = `${dateStr}-${mealType.value}`
                      const slots = slotsByDateAndType.get(key) || []
                      if (slots.length === 0) {
                        return (
                          <Button
                            key={mealType.value}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSlotClick(day, mealType.value)}
                            className={`${isToday ? 'bg-white/20 border-white/30 hover:bg-white/30 text-primary-foreground' : ''}`}
                          >
                            {mealType.icon} {mealType.label} 추가
                          </Button>
                        )
                      }
                      return null
                    })}
                  </div>
                </div>
              </div>

              {/* Meals list */}
              {daySlots.length > 0 ? (
                <div className="divide-y">
                  {MEAL_TYPES.map((mealType) => {
                    const key = `${dateStr}-${mealType.value}`
                    const slots = slotsByDateAndType.get(key) || []
                    const colors = MEAL_COLORS[mealType.value]

                    if (slots.length === 0) return null

                    return slots.map((slot) => (
                      <div
                        key={slot.id}
                        onClick={() => handleRecipeClick(slot.recipe.id)}
                        className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors group cursor-pointer"
                      >
                        {/* Meal type badge */}
                        <div className={`flex-shrink-0 px-3 py-1.5 rounded-full ${colors.bg} ${colors.text} text-sm font-medium`}>
                          {mealType.icon} {mealType.label}
                        </div>

                        {/* Recipe image */}
                        {slot.recipe.image_url ? (
                          <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted">
                            <img
                              src={slot.recipe.image_url}
                              alt={slot.recipe.title}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-20 h-20 rounded-xl bg-muted flex items-center justify-center">
                            <UtensilsCrossed className="h-8 w-8 text-muted-foreground/50" />
                          </div>
                        )}

                        {/* Recipe details */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-lg truncate">{slot.recipe.title}</h4>
                          <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {slot.servings}인분
                            </span>
                            {slot.recipe.cook_time_minutes && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {slot.recipe.cook_time_minutes}분
                              </span>
                            )}
                            {slot.recipe.calories && (
                              <span className="flex items-center gap-1">
                                <Flame className="h-4 w-4" />
                                {slot.recipe.calories}kcal
                              </span>
                            )}
                            {slot.recipe.categories?.[0] && (
                              <span className="px-2 py-0.5 rounded-full bg-muted text-xs">
                                {slot.recipe.categories[0]}
                              </span>
                            )}
                          </div>
                          {slot.notes && (
                            <p className="mt-1 text-sm text-muted-foreground italic truncate">
                              📝 {slot.notes}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteSlot(slot.id)
                            }}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            삭제
                          </Button>
                        </div>
                      </div>
                    ))
                  })}
                </div>
              ) : (
                <div className="px-6 py-8 text-center text-muted-foreground">
                  <UtensilsCrossed className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>등록된 식사가 없습니다</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousWeek} className="h-10 w-10">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="outline" onClick={goToToday} className="h-10 px-4">
            오늘
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextWeek} className="h-10 w-10">
            <ChevronRight className="h-5 w-5" />
          </Button>
          <div className="ml-3 flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold">
              {format(weekStart, 'yyyy년 M월 d일', { locale: ko })} -{' '}
              {format(addDays(weekStart, 6), 'M월 d일', { locale: ko })}
            </span>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setAutoFillOpen(true)}
            className="flex-1 sm:flex-none h-10"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">추천으로 채우기</span>
            <span className="sm:hidden">추천</span>
          </Button>
          <ShoppingListDialog
            mealPlan={mealPlan || null}
            slots={mealPlan?.slots || []}
            onGenerate={handleGenerateShoppingList}
            isPending={generateShoppingList.isPending}
          />
          <Button
            variant="outline"
            onClick={handleDeleteAllMeals}
            disabled={!mealPlan || deleteMealPlan.isPending}
            className="flex-1 sm:flex-none h-10 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            {deleteMealPlan.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            <span className="hidden sm:inline">전체 삭제</span>
            <span className="sm:hidden">삭제</span>
          </Button>
        </div>
      </div>

      {/* Calendar content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">식사 계획을 불러오는 중...</p>
        </div>
      ) : (
        <>
          {renderListView()}
          {renderTabletView()}
          {renderMobileView()}
        </>
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

      <RecipeDetailModal
        recipeId={selectedRecipeId}
        open={recipeDetailOpen}
        onOpenChange={setRecipeDetailOpen}
      />
    </div>
  )
}
