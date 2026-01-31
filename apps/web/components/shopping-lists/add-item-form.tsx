'use client'

import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ShoppingCategory, CreateShoppingItemRequest } from '@meal-planning/shared-types'

const CATEGORIES: { value: ShoppingCategory; label: string }[] = [
  { value: 'produce', label: '채소/과일' },
  { value: 'meat', label: '육류' },
  { value: 'dairy', label: '유제품' },
  { value: 'bakery', label: '빵/베이커리' },
  { value: 'frozen', label: '냉동식품' },
  { value: 'pantry', label: '식료품' },
  { value: 'beverages', label: '음료' },
  { value: 'other', label: '기타' },
]

const UNITS = ['g', 'kg', 'ml', 'L', '개', '팩', '통', '봉지', '병', '캔']

interface AddItemFormProps {
  onSubmit: (data: CreateShoppingItemRequest) => Promise<void>
  isPending?: boolean
}

export function AddItemForm({ onSubmit, isPending }: AddItemFormProps) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('1')
  const [unit, setUnit] = useState('개')
  const [category, setCategory] = useState<ShoppingCategory>('other')
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) return

    await onSubmit({
      ingredient_name: name.trim(),
      amount: parseFloat(amount) || 1,
      unit,
      category,
    })

    setName('')
    setAmount('1')
    setUnit('개')
    setCategory('other')
    setIsExpanded(false)
  }

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition-colors"
      >
        <Plus className="h-5 w-5" />
        항목 추가
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded-lg space-y-3 bg-gray-50">
      <div className="flex gap-2">
        <Input
          placeholder="재료명"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
          autoFocus
        />
        <Input
          type="number"
          placeholder="양"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-20"
          min={0}
          step={0.1}
        />
        <Select value={unit} onValueChange={setUnit}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNITS.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Select value={category} onValueChange={(v) => setCategory(v as ShoppingCategory)}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="카테고리" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button type="button" variant="outline" onClick={() => setIsExpanded(false)}>
          취소
        </Button>
        <Button type="submit" disabled={!name.trim() || isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          추가
        </Button>
      </div>
    </form>
  )
}
