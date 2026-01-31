'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { IngredientList } from './ingredient-list'
import { InstructionList } from './instruction-list'
import { useCreateRecipe, useUpdateRecipe } from '@/hooks/use-recipes'
import { toast } from '@/hooks/use-toast'
import type {
  CreateRecipeRequest,
  RecipeWithDetails,
  RecipeDifficulty,
  RecipeCategory,
  CreateIngredientRequest,
  CreateInstructionRequest,
} from '@meal-planning/shared-types'

const CATEGORIES: { value: RecipeCategory; label: string }[] = [
  { value: 'breakfast', label: '아침' },
  { value: 'lunch', label: '점심' },
  { value: 'dinner', label: '저녁' },
  { value: 'snack', label: '간식' },
  { value: 'dessert', label: '디저트' },
  { value: 'appetizer', label: '에피타이저' },
  { value: 'side', label: '반찬' },
  { value: 'drink', label: '음료' },
]

const DIFFICULTIES: { value: RecipeDifficulty; label: string }[] = [
  { value: 'easy', label: '쉬움' },
  { value: 'medium', label: '보통' },
  { value: 'hard', label: '어려움' },
]

const recipeSchema = z.object({
  title: z.string().min(1, '제목을 입력해 주세요').max(200, '제목이 너무 깁니다'),
  description: z.string().max(2000, '설명이 너무 깁니다').optional(),
  image_url: z.string().url('올바른 URL을 입력해 주세요').optional().or(z.literal('')),
  prep_time_minutes: z.coerce.number().min(0).max(1440).optional(),
  cook_time_minutes: z.coerce.number().min(0).max(1440).optional(),
  servings: z.coerce.number().min(1, '1인분 이상이어야 합니다').max(100),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  source_url: z.string().url('올바른 URL을 입력해 주세요').optional().or(z.literal('')),
})

type RecipeFormValues = z.infer<typeof recipeSchema>

interface RecipeFormProps {
  initialData?: RecipeWithDetails
  mode: 'create' | 'edit'
}

export function RecipeForm({ initialData, mode }: RecipeFormProps) {
  const router = useRouter()
  const createRecipe = useCreateRecipe()
  const updateRecipe = useUpdateRecipe(initialData?.id || '')

  const [ingredients, setIngredients] = useState<CreateIngredientRequest[]>(
    initialData?.ingredients?.map((ing, index) => ({
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      notes: ing.notes || undefined,
      order_index: index,
    })) || []
  )

  const [instructions, setInstructions] = useState<CreateInstructionRequest[]>(
    initialData?.instructions?.map((inst) => ({
      step_number: inst.step_number,
      description: inst.description,
      image_url: inst.image_url || undefined,
    })) || []
  )

  const [selectedCategories, setSelectedCategories] = useState<RecipeCategory[]>(
    initialData?.categories || []
  )

  const [ingredientErrors, setIngredientErrors] = useState<Record<number, string>>({})
  const [instructionErrors, setInstructionErrors] = useState<Record<number, string>>({})

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      image_url: initialData?.image_url || '',
      prep_time_minutes: initialData?.prep_time_minutes || undefined,
      cook_time_minutes: initialData?.cook_time_minutes || undefined,
      servings: initialData?.servings || 2,
      difficulty: initialData?.difficulty || 'medium',
      source_url: initialData?.source_url || '',
    },
  })

  const difficulty = watch('difficulty')

  const toggleCategory = (category: RecipeCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    )
  }

  const validateIngredientsAndInstructions = (): boolean => {
    const ingErrors: Record<number, string> = {}
    const instErrors: Record<number, string> = {}

    ingredients.forEach((ing, index) => {
      if (!ing.name.trim()) {
        ingErrors[index] = '재료명을 입력해 주세요'
      }
    })

    instructions.forEach((inst, index) => {
      if (!inst.description.trim()) {
        instErrors[index] = '설명을 입력해 주세요'
      }
    })

    setIngredientErrors(ingErrors)
    setInstructionErrors(instErrors)

    return Object.keys(ingErrors).length === 0 && Object.keys(instErrors).length === 0
  }

  const onSubmit = async (data: RecipeFormValues) => {
    if (!validateIngredientsAndInstructions()) {
      toast({
        title: '입력 오류',
        description: '모든 필수 항목을 입력해 주세요',
        variant: 'destructive',
      })
      return
    }

    if (ingredients.length === 0) {
      toast({
        title: '재료 필요',
        description: '최소 하나 이상의 재료를 추가해 주세요',
        variant: 'destructive',
      })
      return
    }

    if (instructions.length === 0) {
      toast({
        title: '조리 순서 필요',
        description: '최소 하나 이상의 조리 단계를 추가해 주세요',
        variant: 'destructive',
      })
      return
    }

    const recipeData: CreateRecipeRequest = {
      title: data.title,
      description: data.description || undefined,
      image_url: data.image_url || undefined,
      prep_time_minutes: data.prep_time_minutes || undefined,
      cook_time_minutes: data.cook_time_minutes || undefined,
      servings: data.servings,
      difficulty: data.difficulty,
      categories: selectedCategories,
      source_url: data.source_url || undefined,
      ingredients,
      instructions,
    }

    try {
      if (mode === 'create') {
        await createRecipe.mutateAsync(recipeData)
        toast({
          title: '레시피 생성 완료',
          description: '새 레시피가 추가되었습니다',
          variant: 'success',
        })
      } else {
        await updateRecipe.mutateAsync(recipeData)
        toast({
          title: '레시피 수정 완료',
          description: '레시피가 수정되었습니다',
          variant: 'success',
        })
      }
      router.push('/recipes')
    } catch (error) {
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '레시피 저장에 실패했습니다',
        variant: 'destructive',
      })
    }
  }

  const isPending = createRecipe.isPending || updateRecipe.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              제목 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="레시피 제목을 입력하세요"
              {...register('title')}
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              placeholder="레시피에 대한 간단한 설명을 입력하세요"
              rows={3}
              {...register('description')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">이미지 URL</Label>
            <Input
              id="image_url"
              type="url"
              placeholder="https://example.com/image.jpg"
              {...register('image_url')}
              className={errors.image_url ? 'border-red-500' : ''}
            />
            {errors.image_url && <p className="text-sm text-red-500">{errors.image_url.message}</p>}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prep_time_minutes">준비 시간 (분)</Label>
              <Input
                id="prep_time_minutes"
                type="number"
                min={0}
                max={1440}
                placeholder="0"
                {...register('prep_time_minutes')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cook_time_minutes">조리 시간 (분)</Label>
              <Input
                id="cook_time_minutes"
                type="number"
                min={0}
                max={1440}
                placeholder="0"
                {...register('cook_time_minutes')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="servings">
                인분 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="servings"
                type="number"
                min={1}
                max={100}
                {...register('servings')}
                className={errors.servings ? 'border-red-500' : ''}
              />
              {errors.servings && (
                <p className="text-sm text-red-500">{errors.servings.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>난이도</Label>
              <Select
                value={difficulty}
                onValueChange={(value: RecipeDifficulty) => setValue('difficulty', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="난이도 선택" />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((diff) => (
                    <SelectItem key={diff.value} value={diff.value}>
                      {diff.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>카테고리</Label>
            <div className="flex flex-wrap gap-3">
              {CATEGORIES.map((category) => (
                <label
                  key={category.value}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedCategories.includes(category.value)}
                    onCheckedChange={() => toggleCategory(category.value)}
                  />
                  <span className="text-sm">{category.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source_url">출처 URL</Label>
            <Input
              id="source_url"
              type="url"
              placeholder="https://example.com/recipe"
              {...register('source_url')}
              className={errors.source_url ? 'border-red-500' : ''}
            />
            {errors.source_url && (
              <p className="text-sm text-red-500">{errors.source_url.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>재료</CardTitle>
        </CardHeader>
        <CardContent>
          <IngredientList
            ingredients={ingredients}
            onChange={setIngredients}
            errors={ingredientErrors}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>조리 순서</CardTitle>
        </CardHeader>
        <CardContent>
          <InstructionList
            instructions={instructions}
            onChange={setInstructions}
            errors={instructionErrors}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          취소
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {mode === 'create' ? '레시피 생성' : '레시피 수정'}
        </Button>
      </div>
    </form>
  )
}
