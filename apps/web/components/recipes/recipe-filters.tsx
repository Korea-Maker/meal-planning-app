'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { RecipeCategory, RecipeDifficulty } from '@meal-planning/shared-types'

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

const MAX_COOK_TIMES = [
  { value: '15', label: '15분 이내' },
  { value: '30', label: '30분 이내' },
  { value: '60', label: '1시간 이내' },
  { value: '120', label: '2시간 이내' },
]

export interface RecipeFilters {
  category?: RecipeCategory
  difficulty?: RecipeDifficulty
  maxCookTime?: number
}

interface RecipeFiltersProps {
  filters: RecipeFilters
  onChange: (filters: RecipeFilters) => void
}

export function RecipeFiltersComponent({ filters, onChange }: RecipeFiltersProps) {
  const hasActiveFilters = filters.category || filters.difficulty || filters.maxCookTime

  const handleCategoryChange = (value: string) => {
    onChange({
      ...filters,
      category: value === 'all' ? undefined : (value as RecipeCategory),
    })
  }

  const handleDifficultyChange = (value: string) => {
    onChange({
      ...filters,
      difficulty: value === 'all' ? undefined : (value as RecipeDifficulty),
    })
  }

  const handleMaxCookTimeChange = (value: string) => {
    onChange({
      ...filters,
      maxCookTime: value === 'all' ? undefined : parseInt(value),
    })
  }

  const clearFilters = () => {
    onChange({})
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={filters.category || 'all'}
        onValueChange={handleCategoryChange}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="카테고리" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 카테고리</SelectItem>
          {CATEGORIES.map((category) => (
            <SelectItem key={category.value} value={category.value}>
              {category.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.difficulty || 'all'}
        onValueChange={handleDifficultyChange}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="난이도" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 난이도</SelectItem>
          {DIFFICULTIES.map((difficulty) => (
            <SelectItem key={difficulty.value} value={difficulty.value}>
              {difficulty.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.maxCookTime?.toString() || 'all'}
        onValueChange={handleMaxCookTimeChange}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="조리 시간" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 시간</SelectItem>
          {MAX_COOK_TIMES.map((time) => (
            <SelectItem key={time.value} value={time.value}>
              {time.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-4 w-4 mr-1" />
          필터 초기화
        </Button>
      )}
    </div>
  )
}
