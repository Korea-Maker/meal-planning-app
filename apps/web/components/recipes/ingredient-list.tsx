'use client'

import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CreateIngredientRequest } from '@meal-planning/shared-types'

const UNITS = [
  { value: 'g', label: '그램 (g)' },
  { value: 'kg', label: '킬로그램 (kg)' },
  { value: 'ml', label: '밀리리터 (ml)' },
  { value: 'L', label: '리터 (L)' },
  { value: '개', label: '개' },
  { value: '조각', label: '조각' },
  { value: '큰술', label: '큰술' },
  { value: '작은술', label: '작은술' },
  { value: '컵', label: '컵' },
  { value: '줌', label: '줌' },
  { value: '꼬집', label: '꼬집' },
  { value: '장', label: '장' },
  { value: '줄기', label: '줄기' },
  { value: '뿌리', label: '뿌리' },
  { value: '마리', label: '마리' },
  { value: '봉지', label: '봉지' },
  { value: '적당량', label: '적당량' },
]

interface IngredientListProps {
  ingredients: CreateIngredientRequest[]
  onChange: (ingredients: CreateIngredientRequest[]) => void
  errors?: Record<number, string>
}

export function IngredientList({ ingredients, onChange, errors = {} }: IngredientListProps) {
  const addIngredient = () => {
    const newIngredient: CreateIngredientRequest = {
      name: '',
      amount: 1,
      unit: 'g',
      order_index: ingredients.length,
    }
    onChange([...ingredients, newIngredient])
  }

  const removeIngredient = (index: number) => {
    const updated = ingredients
      .filter((_, i) => i !== index)
      .map((ing, i) => ({ ...ing, order_index: i }))
    onChange(updated)
  }

  const updateIngredient = (
    index: number,
    field: keyof CreateIngredientRequest,
    value: string | number
  ) => {
    const updated = ingredients.map((ing, i) =>
      i === index ? { ...ing, [field]: value } : ing
    )
    onChange(updated)
  }

  const moveIngredient = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= ingredients.length) return

    const updated = [...ingredients]
    const [removed] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, removed)

    onChange(updated.map((ing, i) => ({ ...ing, order_index: i })))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">재료</h3>
        <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
          <Plus className="h-4 w-4 mr-1" />
          재료 추가
        </Button>
      </div>

      {ingredients.length === 0 ? (
        <div className="text-center py-6 text-gray-500 border border-dashed rounded-md">
          재료를 추가해 주세요
        </div>
      ) : (
        <div className="space-y-2">
          {ingredients.map((ingredient, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 p-2 bg-gray-50 rounded-md ${
                errors[index] ? 'ring-2 ring-red-500' : ''
              }`}
            >
              <div className="flex items-center gap-1 text-gray-400">
                <button
                  type="button"
                  className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                  onClick={() => moveIngredient(index, index - 1)}
                  disabled={index === 0}
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              </div>

              <Input
                placeholder="재료명"
                value={ingredient.name}
                onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                className="flex-1 min-w-[120px]"
              />

              <Input
                type="number"
                placeholder="양"
                value={ingredient.amount}
                onChange={(e) => updateIngredient(index, 'amount', parseFloat(e.target.value) || 0)}
                className="w-20"
                min={0}
                step={0.1}
              />

              <Select
                value={ingredient.unit}
                onValueChange={(value) => updateIngredient(index, 'unit', value)}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeIngredient(index)}
                className="text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {Object.keys(errors).length > 0 && (
        <p className="text-sm text-red-500">모든 재료의 이름을 입력해 주세요</p>
      )}
    </div>
  )
}
