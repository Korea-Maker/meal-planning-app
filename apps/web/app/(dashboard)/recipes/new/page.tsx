'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { RecipeForm } from '@/components/recipes/recipe-form'
import type { RecipeWithDetails, CreateRecipeRequest } from '@meal-planning/shared-types'

export default function NewRecipePage() {
  const searchParams = useSearchParams()
  const isImported = searchParams.get('imported') === 'true'
  const [importedData, setImportedData] = useState<RecipeWithDetails | null>(null)

  useEffect(() => {
    if (isImported) {
      const storedRecipe = sessionStorage.getItem('importedRecipe')
      if (storedRecipe) {
        try {
          const parsed = JSON.parse(storedRecipe) as CreateRecipeRequest
          const converted: RecipeWithDetails = {
            id: '',
            user_id: '',
            title: parsed.title,
            description: parsed.description || null,
            image_url: parsed.image_url || null,
            prep_time_minutes: parsed.prep_time_minutes || null,
            cook_time_minutes: parsed.cook_time_minutes || null,
            servings: parsed.servings,
            difficulty: parsed.difficulty || 'medium',
            categories: parsed.categories || [],
            tags: parsed.tags || [],
            source_url: parsed.source_url || null,
            external_source: null,
            external_id: null,
            imported_at: null,
            calories: null,
            protein_grams: null,
            carbs_grams: null,
            fat_grams: null,
            nutrition_fetched: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ingredients: parsed.ingredients.map((ing, idx) => ({
              id: `temp-${idx}`,
              recipe_id: '',
              name: ing.name,
              amount: ing.amount,
              unit: ing.unit,
              notes: ing.notes || null,
              order_index: ing.order_index,
            })),
            instructions: parsed.instructions.map((inst, idx) => ({
              id: `temp-${idx}`,
              recipe_id: '',
              step_number: inst.step_number,
              description: inst.description,
              image_url: inst.image_url || null,
            })),
          }
          setImportedData(converted)
        } catch (error) {
          sessionStorage.removeItem('importedRecipe')
        }
      }
    }

    return () => {
      if (isImported) {
        sessionStorage.removeItem('importedRecipe')
      }
    }
  }, [isImported])

  const title = isImported ? 'URL에서 가져온 레시피' : '새 레시피'
  const description = isImported
    ? '추출된 정보를 확인하고 필요시 수정하세요'
    : '나만의 레시피를 추가하세요'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/recipes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-gray-600">{description}</p>
        </div>
      </div>

      <RecipeForm mode="create" initialData={importedData || undefined} />
    </div>
  )
}
