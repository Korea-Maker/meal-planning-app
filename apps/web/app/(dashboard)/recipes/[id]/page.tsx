'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Clock,
  Users,
  ChefHat,
  Edit,
  Trash2,
  Share2,
  Minus,
  Plus,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useRecipe, useDeleteRecipe, useAdjustServings } from '@/hooks/use-recipes'
import { toast } from '@/hooks/use-toast'

const DIFFICULTY_LABELS = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
}

const CATEGORY_LABELS: Record<string, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
  dessert: '디저트',
  appetizer: '에피타이저',
  side: '반찬',
  drink: '음료',
}

interface Props {
  params: Promise<{ id: string }>
}

export default function RecipeDetailPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const { data: recipe, isLoading, error } = useRecipe(id)
  const deleteRecipe = useDeleteRecipe()
  const adjustServings = useAdjustServings(id)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [adjustedServings, setAdjustedServings] = useState<number | null>(null)

  const currentServings = adjustedServings ?? recipe?.servings ?? 2
  const originalServings = recipe?.servings ?? 2
  const servingsMultiplier = currentServings / originalServings

  const handleDelete = async () => {
    try {
      await deleteRecipe.mutateAsync(id)
      toast({
        title: '레시피 삭제 완료',
        description: '레시피가 삭제되었습니다',
        variant: 'success',
      })
      router.push('/recipes')
    } catch (error) {
      toast({
        title: '삭제 실패',
        description: error instanceof Error ? error.message : '레시피 삭제에 실패했습니다',
        variant: 'destructive',
      })
    }
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast({
        title: '링크 복사 완료',
        description: '레시피 링크가 클립보드에 복사되었습니다',
      })
    } catch {
      toast({
        title: '복사 실패',
        description: '링크 복사에 실패했습니다',
        variant: 'destructive',
      })
    }
  }

  const increaseServings = () => {
    setAdjustedServings(Math.min(currentServings + 1, 100))
  }

  const decreaseServings = () => {
    setAdjustedServings(Math.max(currentServings - 1, 1))
  }

  const formatAmount = (amount: number): string => {
    const adjusted = amount * servingsMultiplier
    if (adjusted === Math.floor(adjusted)) {
      return adjusted.toString()
    }
    return adjusted.toFixed(1)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">레시피를 찾을 수 없습니다</p>
        <Button variant="outline" asChild>
          <Link href="/recipes">레시피 목록으로</Link>
        </Button>
      </div>
    )
  }

  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/recipes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">{recipe.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/recipes/${id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              수정
            </Link>
          </Button>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                삭제
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>레시피 삭제</DialogTitle>
                <DialogDescription>
                  정말로 이 레시피를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  취소
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteRecipe.isPending}
                >
                  {deleteRecipe.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  삭제
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {recipe.image_url && (
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={recipe.image_url}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {recipe.description && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-gray-700">{recipe.description}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>재료</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={decreaseServings}
                    disabled={currentServings <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-normal w-16 text-center">
                    {currentServings}인분
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={increaseServings}
                    disabled={currentServings >= 100}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!recipe.ingredients || recipe.ingredients.length === 0 ? (
                <p className="text-gray-500">등록된 재료가 없습니다</p>
              ) : (
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient) => (
                    <li
                      key={ingredient.id}
                      className="flex items-center justify-between py-2 border-b last:border-b-0"
                    >
                      <span className="font-medium">{ingredient.name}</span>
                      <span className="text-gray-600">
                        {formatAmount(ingredient.amount)} {ingredient.unit}
                        {ingredient.notes && (
                          <span className="text-gray-400 ml-2">({ingredient.notes})</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>조리 순서</CardTitle>
            </CardHeader>
            <CardContent>
              {!recipe.instructions || recipe.instructions.length === 0 ? (
                <p className="text-gray-500">등록된 조리 순서가 없습니다</p>
              ) : (
                <ol className="space-y-4">
                  {recipe.instructions.map((instruction) => (
                    <li key={instruction.id} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                        {instruction.step_number}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-gray-700">{instruction.description}</p>
                        {instruction.image_url && (
                          <img
                            src={instruction.image_url}
                            alt={`${instruction.step_number}단계`}
                            className="mt-2 rounded-md max-w-sm"
                          />
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">총 조리 시간</p>
                  <p className="font-medium">
                    {totalTime > 0 ? `${totalTime}분` : '미입력'}
                  </p>
                </div>
              </div>

              {recipe.prep_time_minutes && (
                <div className="flex items-center gap-3 pl-8">
                  <div>
                    <p className="text-sm text-gray-500">준비 시간</p>
                    <p className="font-medium">{recipe.prep_time_minutes}분</p>
                  </div>
                </div>
              )}

              {recipe.cook_time_minutes && (
                <div className="flex items-center gap-3 pl-8">
                  <div>
                    <p className="text-sm text-gray-500">조리 시간</p>
                    <p className="font-medium">{recipe.cook_time_minutes}분</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">기본 인분</p>
                  <p className="font-medium">{recipe.servings}인분</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <ChefHat className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">난이도</p>
                  <p className="font-medium">{DIFFICULTY_LABELS[recipe.difficulty]}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {recipe.categories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">카테고리</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {recipe.categories.map((category) => (
                    <span
                      key={category}
                      className="px-3 py-1 text-sm bg-primary/10 text-primary rounded-full"
                    >
                      {CATEGORY_LABELS[category] || category}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {recipe.tags && recipe.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">태그</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {recipe.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(recipe.calories || recipe.protein_grams || recipe.carbs_grams || recipe.fat_grams) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">영양 정보 (1인분)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {recipe.calories && (
                    <div>
                      <p className="text-gray-500">칼로리</p>
                      <p className="font-medium">{recipe.calories} kcal</p>
                    </div>
                  )}
                  {recipe.protein_grams && (
                    <div>
                      <p className="text-gray-500">단백질</p>
                      <p className="font-medium">{recipe.protein_grams}g</p>
                    </div>
                  )}
                  {recipe.carbs_grams && (
                    <div>
                      <p className="text-gray-500">탄수화물</p>
                      <p className="font-medium">{recipe.carbs_grams}g</p>
                    </div>
                  )}
                  {recipe.fat_grams && (
                    <div>
                      <p className="text-gray-500">지방</p>
                      <p className="font-medium">{recipe.fat_grams}g</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {recipe.source_url && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">출처</CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href={recipe.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline text-sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  원본 레시피 보기
                </a>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
