'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Clock, Users, ExternalLink, Plus, Loader2, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useExternalRecipe, useImportExternalRecipe } from '@/hooks/use-recipes'
import { useWeekMealPlan, useCreateMealPlan } from '@/hooks/use-meal-plan'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import type { ExternalRecipePreview, ExternalRecipeSource, MealType } from '@meal-planning/shared-types'

const mealTypeLabels: Record<MealType, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
}

function getWeekDates(): { date: string; label: string }[] {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)

  const days = ['월', '화', '수', '목', '금', '토', '일']
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return {
      date: d.toISOString().split('T')[0],
      label: `${days[i]} (${d.getMonth() + 1}/${d.getDate()})`,
    }
  })
}

function getWeekStart(): string {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  return monday.toISOString().split('T')[0]
}

interface ExternalRecipeCardProps {
  recipe: ExternalRecipePreview
  onImported?: () => void
}

const sourceLabels: Record<ExternalRecipeSource, string> = {
  spoonacular: 'Spoonacular',
  themealdb: 'TheMealDB',
  korean_seed: '한국 시드',
  foodsafetykorea: '식품안전나라',
  mafra: '농식품정보원',
}

const sourceBadgeColors: Record<ExternalRecipeSource, string> = {
  spoonacular: 'bg-green-100 text-green-800',
  themealdb: 'bg-orange-100 text-orange-800',
  korean_seed: 'bg-blue-100 text-blue-800',
  foodsafetykorea: 'bg-red-100 text-red-800',
  mafra: 'bg-purple-100 text-purple-800',
}

export function ExternalRecipeCard({ recipe, onImported }: ExternalRecipeCardProps) {
  const [showDetail, setShowDetail] = useState(false)
  const [showAddToPlan, setShowAddToPlan] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedMealType, setSelectedMealType] = useState<MealType>('dinner')
  const [isAddingToPlan, setIsAddingToPlan] = useState(false)

  const { toast } = useToast()
  const importRecipe = useImportExternalRecipe()
  const createMealPlan = useCreateMealPlan()

  const weekStart = getWeekStart()
  const weekDates = getWeekDates()
  const { data: weekPlan } = useWeekMealPlan(weekStart)

  const { data: detail, isLoading: isLoadingDetail } = useExternalRecipe(
    showDetail ? recipe.source : null,
    showDetail ? recipe.external_id : null
  )

  const handleImport = async () => {
    try {
      await importRecipe.mutateAsync({
        source: recipe.source,
        externalId: recipe.external_id,
      })
      toast({
        title: '레시피 가져오기 완료',
        description: `"${recipe.title}" 레시피가 내 컬렉션에 추가되었습니다.`,
      })
      setShowDetail(false)
      onImported?.()
    } catch {
      toast({
        variant: 'destructive',
        title: '레시피 가져오기 실패',
        description: '다시 시도해 주세요.',
      })
    }
  }

  const handleAddToPlan = async () => {
    if (!selectedDate) {
      toast({ variant: 'destructive', title: '날짜를 선택해주세요' })
      return
    }

    setIsAddingToPlan(true)
    try {
      let mealPlanId = weekPlan?.id

      if (!mealPlanId) {
        const newPlan = await createMealPlan.mutateAsync({ week_start_date: weekStart })
        mealPlanId = newPlan?.id
      }

      if (!mealPlanId) {
        throw new Error('식사 계획을 생성할 수 없습니다')
      }

      await api.post(`/meal-plans/${mealPlanId}/slots/from-external`, {
        source: recipe.source,
        external_id: recipe.external_id,
        date: selectedDate,
        meal_type: selectedMealType,
        servings: recipe.servings || 2,
      })

      toast({
        title: '식사계획에 추가 완료',
        description: `"${recipe.title}"이(가) 식사계획에 추가되었습니다.`,
      })
      setShowAddToPlan(false)
      setShowDetail(false)
      onImported?.()
    } catch {
      toast({
        variant: 'destructive',
        title: '식사계획 추가 실패',
        description: '다시 시도해 주세요.',
      })
    } finally {
      setIsAddingToPlan(false)
    }
  }

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowDetail(true)}>
        <div className="relative aspect-video bg-gray-100">
          {recipe.image_url ? (
            <Image
              src={recipe.image_url}
              alt={recipe.title}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400">이미지 없음</span>
            </div>
          )}
          <Badge className={`absolute top-2 right-2 ${sourceBadgeColors[recipe.source]}`}>
            {sourceLabels[recipe.source]}
          </Badge>
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg line-clamp-2 mb-2">{recipe.title}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {recipe.ready_in_minutes && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{recipe.ready_in_minutes}분</span>
              </div>
            )}
            {recipe.servings && (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{recipe.servings}인분</span>
              </div>
            )}
          </div>
          {(recipe.category || recipe.area) && (
            <div className="flex gap-2 mt-2">
              {recipe.category && (
                <Badge variant="secondary" className="text-xs">
                  {recipe.category}
                </Badge>
              )}
              {recipe.area && (
                <Badge variant="outline" className="text-xs">
                  {recipe.area}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {recipe.title}
              <Badge className={sourceBadgeColors[recipe.source]}>
                {sourceLabels[recipe.source]}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              외부 레시피 상세 정보
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : detail ? (
            <div className="space-y-4">
              {detail.image_url && (
                <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                  <Image
                    src={detail.image_url}
                    alt={detail.title}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 672px"
                  />
                </div>
              )}

              {detail.description && (
                <p className="text-gray-600 text-sm">{detail.description}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm">
                {detail.prep_time_minutes && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>준비: {detail.prep_time_minutes}분</span>
                  </div>
                )}
                {detail.cook_time_minutes && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>조리: {detail.cook_time_minutes}분</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span>{detail.servings}인분</span>
                </div>
              </div>

              {detail.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {detail.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {detail.calories && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">영양 정보 (1인분)</h4>
                  <div className="grid grid-cols-4 gap-4 text-sm text-center">
                    <div>
                      <div className="text-lg font-semibold">{detail.calories}</div>
                      <div className="text-gray-500">칼로리</div>
                    </div>
                    {detail.protein_grams && (
                      <div>
                        <div className="text-lg font-semibold">{Math.round(detail.protein_grams)}g</div>
                        <div className="text-gray-500">단백질</div>
                      </div>
                    )}
                    {detail.carbs_grams && (
                      <div>
                        <div className="text-lg font-semibold">{Math.round(detail.carbs_grams)}g</div>
                        <div className="text-gray-500">탄수화물</div>
                      </div>
                    )}
                    {detail.fat_grams && (
                      <div>
                        <div className="text-lg font-semibold">{Math.round(detail.fat_grams)}g</div>
                        <div className="text-gray-500">지방</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {detail.ingredients.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">재료</h4>
                  <ul className="text-sm space-y-1">
                    {detail.ingredients.map((ing, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full" />
                        <span>
                          {ing.name} - {ing.amount} {ing.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {detail.instructions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">조리 방법</h4>
                  <ol className="text-sm space-y-2">
                    {detail.instructions.map((inst, idx) => (
                      <li key={idx} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs">
                          {inst.step_number}
                        </span>
                        <span>{inst.description}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {detail.source_url && (
                <a
                  href={detail.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  원본 레시피 보기
                </a>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">레시피 정보를 불러올 수 없습니다.</p>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowDetail(false)}>
              닫기
            </Button>
            <Popover open={showAddToPlan} onOpenChange={setShowAddToPlan}>
              <PopoverTrigger asChild>
                <Button variant="outline" disabled={!detail}>
                  <Calendar className="h-4 w-4 mr-2" />
                  식사계획에 추가
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">날짜 선택</p>
                    <Select value={selectedDate} onValueChange={setSelectedDate}>
                      <SelectTrigger>
                        <SelectValue placeholder="날짜를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {weekDates.map((d) => (
                          <SelectItem key={d.date} value={d.date}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">식사 시간</p>
                    <Select value={selectedMealType} onValueChange={(v) => setSelectedMealType(v as MealType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(mealTypeLabels) as MealType[]).map((type) => (
                          <SelectItem key={type} value={type}>
                            {mealTypeLabels[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddToPlan} className="w-full" disabled={!selectedDate || isAddingToPlan}>
                    {isAddingToPlan ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    추가하기
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button onClick={handleImport} disabled={importRecipe.isPending || !detail}>
              {importRecipe.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              내 레시피로 가져오기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
