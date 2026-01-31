'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RecipeForm } from '@/components/recipes/recipe-form'
import { useRecipe } from '@/hooks/use-recipes'

interface Props {
  params: Promise<{ id: string }>
}

export default function EditRecipePage({ params }: Props) {
  const { id } = use(params)
  const { data: recipe, isLoading, error } = useRecipe(id)

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/recipes/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">레시피 수정</h1>
          <p className="text-gray-600">{recipe.title}</p>
        </div>
      </div>

      <RecipeForm mode="edit" initialData={recipe} />
    </div>
  )
}
