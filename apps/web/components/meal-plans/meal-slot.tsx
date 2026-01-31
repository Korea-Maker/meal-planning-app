'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { X, GripVertical, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { MealSlotWithRecipe } from '@meal-planning/shared-types'

interface MealSlotProps {
  slot: MealSlotWithRecipe
  onDelete: (slotId: string) => void
  onServingsChange?: (slotId: string, servings: number) => void
}

export function MealSlot({ slot, onDelete, onServingsChange }: MealSlotProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slot.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 p-2 bg-white border rounded-md shadow-sm hover:shadow-md transition-shadow"
    >
      <button
        className="touch-none text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{slot.recipe.title}</p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {slot.servings}인분
          </span>
          {slot.notes && (
            <span className="truncate">· {slot.notes}</span>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
        onClick={() => onDelete(slot.id)}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}

interface EmptySlotProps {
  onClick: () => void
}

export function EmptySlot({ onClick }: EmptySlotProps) {
  return (
    <button
      onClick={onClick}
      className="w-full h-16 border-2 border-dashed border-gray-200 rounded-md hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center text-gray-400 hover:text-primary"
    >
      <span className="text-sm">+ 레시피 추가</span>
    </button>
  )
}
