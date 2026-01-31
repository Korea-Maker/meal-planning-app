'use client'

import { Trash2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import type { ShoppingItem } from '@meal-planning/shared-types'

interface ShoppingItemProps {
  item: ShoppingItem
  onCheck: (itemId: string) => void
  onDelete: (itemId: string) => void
}

export function ShoppingItemRow({ item, onCheck, onDelete }: ShoppingItemProps) {
  return (
    <div
      className={`group flex items-center gap-3 p-3 rounded-md hover:bg-gray-50 transition-colors ${
        item.is_checked ? 'opacity-60' : ''
      }`}
    >
      <Checkbox
        checked={item.is_checked}
        onCheckedChange={() => onCheck(item.id)}
        className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
      />

      <div className="flex-1 min-w-0">
        <p
          className={`font-medium ${
            item.is_checked ? 'line-through text-gray-400' : ''
          }`}
        >
          {item.ingredient_name}
        </p>
        <p className="text-sm text-gray-500">
          {item.amount} {item.unit}
          {item.notes && <span className="ml-2">({item.notes})</span>}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
        onClick={() => onDelete(item.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
