'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Link2, Check, AlertCircle, ChefHat } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useExtractRecipeFromUrl, useCreateRecipe } from '@/hooks/use-recipes'
import { toast } from '@/hooks/use-toast'
import type { CreateRecipeRequest, URLExtractionResponse } from '@meal-planning/shared-types'

const urlSchema = z.string().url('올바른 URL을 입력해 주세요')

type ExtractionState = 'idle' | 'extracting' | 'success' | 'error'

interface URLImportDialogProps {
  trigger?: React.ReactNode
}

export function URLImportDialog({ trigger }: URLImportDialogProps) {
  const router = useRouter()
  const extractRecipe = useExtractRecipeFromUrl()
  const createRecipe = useCreateRecipe()

  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [extractionState, setExtractionState] = useState<ExtractionState>('idle')
  const [extractedRecipe, setExtractedRecipe] = useState<CreateRecipeRequest | null>(null)
  const [confidence, setConfidence] = useState(0)

  const resetState = () => {
    setUrl('')
    setUrlError(null)
    setExtractionState('idle')
    setExtractedRecipe(null)
    setConfidence(0)
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      resetState()
    }
  }

  const validateUrl = (value: string): boolean => {
    try {
      urlSchema.parse(value)
      setUrlError(null)
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        setUrlError(error.errors[0].message)
      }
      return false
    }
  }

  const handleExtract = async () => {
    if (!validateUrl(url)) {
      return
    }

    setExtractionState('extracting')

    try {
      const response = await extractRecipe.mutateAsync({ url })

      if (response.success && response.recipe) {
        setExtractedRecipe(response.recipe)
        setConfidence(response.confidence)
        setExtractionState('success')
      } else {
        throw new Error(response.error || '레시피를 추출할 수 없습니다')
      }
    } catch (error) {
      setExtractionState('error')
      toast({
        title: '추출 실패',
        description: error instanceof Error ? error.message : '레시피 추출에 실패했습니다',
        variant: 'destructive',
      })
    }
  }

  const handleSave = async () => {
    if (!extractedRecipe) return

    try {
      await createRecipe.mutateAsync(extractedRecipe)
      toast({
        title: '레시피 저장 완료',
        description: '레시피가 성공적으로 저장되었습니다',
        variant: 'success',
      })
      setOpen(false)
      resetState()
      router.push('/recipes')
    } catch (error) {
      toast({
        title: '저장 실패',
        description: error instanceof Error ? error.message : '레시피 저장에 실패했습니다',
        variant: 'destructive',
      })
    }
  }

  const handleEdit = () => {
    if (!extractedRecipe) return

    sessionStorage.setItem('importedRecipe', JSON.stringify(extractedRecipe))
    setOpen(false)
    resetState()
    router.push('/recipes/new?imported=true')
  }

  const getConfidenceLabel = (value: number): { label: string; color: string } => {
    if (value >= 0.9) return { label: '높음', color: 'text-green-600' }
    if (value >= 0.7) return { label: '보통', color: 'text-yellow-600' }
    return { label: '낮음', color: 'text-red-600' }
  }

  const confidenceInfo = getConfidenceLabel(confidence)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Link2 className="h-4 w-4 mr-2" />
            URL에서 가져오기
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>URL에서 레시피 가져오기</DialogTitle>
          <DialogDescription>
            레시피 페이지 URL을 입력하면 자동으로 레시피 정보를 추출합니다.
          </DialogDescription>
        </DialogHeader>

        {extractionState === 'idle' || extractionState === 'error' ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipe-url">레시피 URL</Label>
              <div className="flex gap-2">
                <Input
                  id="recipe-url"
                  type="url"
                  placeholder="https://example.com/recipe/..."
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value)
                    if (urlError) validateUrl(e.target.value)
                  }}
                  className={urlError ? 'border-red-500' : ''}
                />
                <Button onClick={handleExtract} disabled={!url.trim()}>
                  추출
                </Button>
              </div>
              {urlError && <p className="text-sm text-red-500">{urlError}</p>}
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p>지원 사이트:</p>
              <ul className="list-disc list-inside ml-2">
                <li>Schema.org 레시피 마크업이 있는 사이트 (높은 정확도)</li>
                <li>일반 레시피 페이지 (AI 추출)</li>
              </ul>
            </div>

            {extractionState === 'error' && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-md">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="text-sm">
                  추출에 실패했습니다. URL을 확인하고 다시 시도해 주세요.
                </span>
              </div>
            )}
          </div>
        ) : null}

        {extractionState === 'extracting' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">레시피를 추출하는 중...</p>
            <p className="text-sm text-muted-foreground">잠시만 기다려 주세요</p>
          </div>
        )}

        {extractionState === 'success' && extractedRecipe && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                <span className="font-medium">추출 완료</span>
              </div>
              <div className="text-sm">
                신뢰도:{' '}
                <span className={`font-medium ${confidenceInfo.color}`}>
                  {confidenceInfo.label} ({Math.round(confidence * 100)}%)
                </span>
              </div>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-start gap-4">
                  {extractedRecipe.image_url ? (
                    <img
                      src={extractedRecipe.image_url}
                      alt={extractedRecipe.title}
                      className="w-24 h-24 object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center">
                      <ChefHat className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <CardTitle className="text-lg">{extractedRecipe.title}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {extractedRecipe.description || '설명 없음'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {extractedRecipe.prep_time_minutes && (
                    <span>준비 {extractedRecipe.prep_time_minutes}분</span>
                  )}
                  {extractedRecipe.cook_time_minutes && (
                    <span>조리 {extractedRecipe.cook_time_minutes}분</span>
                  )}
                  <span>{extractedRecipe.servings}인분</span>
                  <span>재료 {extractedRecipe.ingredients.length}개</span>
                  <span>단계 {extractedRecipe.instructions.length}개</span>
                </div>

                {extractedRecipe.categories && extractedRecipe.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {extractedRecipe.categories.map((cat) => (
                      <span
                        key={cat}
                        className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {confidence < 0.8 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 text-yellow-700 rounded-md">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">AI 추출 결과입니다</p>
                  <p>저장 전에 내용을 확인하고 필요시 수정해 주세요.</p>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {extractionState === 'success' ? (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={resetState}>
                다시 시도
              </Button>
              <Button variant="outline" onClick={handleEdit}>
                수정 후 저장
              </Button>
              <Button onClick={handleSave} disabled={createRecipe.isPending}>
                {createRecipe.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                바로 저장
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
