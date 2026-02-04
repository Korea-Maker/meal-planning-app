'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { StarRating } from './star-rating'
import {
  useMyRating,
  useRateRecipe,
  useUpdateRating,
  useDeleteRating,
} from '@/hooks/use-recipe-interactions'
import { toast } from '@/hooks/use-toast'

interface RatingFormProps {
  recipeId: string
  onSuccess?: () => void
}

export function RatingForm({ recipeId, onSuccess }: RatingFormProps) {
  const { data: myRating, isLoading: isLoadingRating } = useMyRating(recipeId)
  const rateRecipe = useRateRecipe(recipeId)
  const updateRating = useUpdateRating(recipeId)
  const deleteRating = useDeleteRating(recipeId)

  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  const hasExistingRating = Boolean(myRating)
  const isPending = rateRecipe.isPending || updateRating.isPending || deleteRating.isPending

  useEffect(() => {
    if (myRating) {
      setRating(myRating.rating)
      setReview(myRating.review || '')
    }
  }, [myRating])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      toast({
        title: '평점 필요',
        description: '별점을 선택해주세요',
        variant: 'destructive',
      })
      return
    }

    try {
      if (hasExistingRating) {
        await updateRating.mutateAsync({ rating, review: review || undefined })
        toast({ title: '평점 수정됨', description: '평점이 수정되었습니다' })
      } else {
        await rateRecipe.mutateAsync({ rating, review: review || undefined })
        toast({ title: '평점 등록됨', description: '평점이 등록되었습니다' })
      }
      setIsEditing(false)
      onSuccess?.()
    } catch {
      toast({
        title: '오류',
        description: '평점을 저장할 수 없습니다',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    try {
      await deleteRating.mutateAsync()
      setRating(0)
      setReview('')
      setIsEditing(false)
      toast({ title: '평점 삭제됨', description: '평점이 삭제되었습니다' })
      onSuccess?.()
    } catch {
      toast({
        title: '오류',
        description: '평점을 삭제할 수 없습니다',
        variant: 'destructive',
      })
    }
  }

  if (isLoadingRating) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Show compact view when user has rated and is not editing
  if (hasExistingRating && !isEditing) {
    return (
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">내 평점</span>
            <StarRating value={myRating!.rating} readonly size="sm" />
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            수정
          </Button>
        </div>
        {myRating!.review && (
          <p className="text-sm text-muted-foreground">{myRating!.review}</p>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {hasExistingRating ? '평점 수정' : '이 레시피를 평가해주세요'}
        </label>
        <StarRating value={rating} onChange={setRating} size="lg" />
      </div>

      <div className="space-y-2">
        <label htmlFor="review" className="text-sm font-medium">
          리뷰 (선택)
        </label>
        <Textarea
          id="review"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="이 레시피에 대한 의견을 남겨주세요..."
          rows={3}
          maxLength={500}
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground text-right">
          {review.length}/500
        </p>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending || rating === 0}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              저장 중...
            </>
          ) : hasExistingRating ? (
            '수정'
          ) : (
            '평점 등록'
          )}
        </Button>

        {hasExistingRating && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRating(myRating!.rating)
                setReview(myRating!.review || '')
                setIsEditing(false)
              }}
              disabled={isPending}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              삭제
            </Button>
          </>
        )}
      </div>
    </form>
  )
}
