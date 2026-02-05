'use client'

import { useRef, useEffect, useCallback } from 'react'
import { GripVertical, X, Clock, Users, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { MealSlotWithRecipe } from '@meal-planning/shared-types'

interface MealSlotProps {
  slot: MealSlotWithRecipe
  onDelete?: (slotId: string) => void
  onDragStart?: (slot: MealSlotWithRecipe, e: React.DragEvent) => void
  onClick?: (recipeId: string) => void
  compact?: boolean
}

export function MealSlot({ slot, onDelete, onDragStart, onClick, compact = false }: MealSlotProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const dragPreviewRef = useRef<HTMLDivElement | null>(null)
  const isDraggingRef = useRef(false)

  // Create and show custom drag preview that follows mouse
  const createDragPreview = useCallback((x: number, y: number) => {
    if (dragPreviewRef.current) return

    const preview = document.createElement('div')
    preview.id = 'custom-drag-preview'
    preview.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 99999;
      background: white;
      border: 2px solid hsl(var(--primary));
      border-radius: 12px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      padding: 12px;
      max-width: 200px;
      transform: translate(-50%, -50%);
      left: ${x}px;
      top: ${y}px;
    `
    preview.innerHTML = `
      <p style="font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0;">${slot.recipe.title}</p>
      <p style="font-size: 12px; color: #6b7280; margin: 4px 0 0 0;">${slot.servings}인분</p>
    `
    document.body.appendChild(preview)
    dragPreviewRef.current = preview
  }, [slot.recipe.title, slot.servings])

  const updateDragPreview = useCallback((x: number, y: number) => {
    if (dragPreviewRef.current) {
      dragPreviewRef.current.style.left = `${x}px`
      dragPreviewRef.current.style.top = `${y}px`
    }
  }, [])

  const removeDragPreview = useCallback(() => {
    if (dragPreviewRef.current) {
      dragPreviewRef.current.remove()
      dragPreviewRef.current = null
    }
  }, [])

  // Handle drag events
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    isDraggingRef.current = true

    // Set drag data
    e.dataTransfer.setData('text/plain', slot.id)
    e.dataTransfer.effectAllowed = 'move'

    // Use a transparent 1x1 pixel image to hide native drag preview
    const emptyImg = new Image()
    emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    e.dataTransfer.setDragImage(emptyImg, 0, 0)

    // Create custom preview at mouse position
    createDragPreview(e.clientX, e.clientY)

    onDragStart?.(slot, e)
  }

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    // e.clientX/Y can be 0 at the end of drag, ignore those
    if (e.clientX === 0 && e.clientY === 0) return
    updateDragPreview(e.clientX, e.clientY)
  }, [updateDragPreview])

  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false
    removeDragPreview()
  }, [removeDragPreview])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      removeDragPreview()
    }
  }, [removeDragPreview])

  // Compact view for desktop 7-column layout
  if (compact) {
    return (
      <div
        ref={elementRef}
        draggable
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onClick={() => onClick?.(slot.recipe.id)}
        className="
          group flex items-center gap-2 bg-white border rounded-xl shadow-sm
          hover:shadow-md hover:border-primary/30 p-2 transition-all duration-200
          cursor-pointer select-none
        "
      >
        <div className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors p-0.5">
          <GripVertical className="h-3.5 w-3.5" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-xs truncate">{slot.recipe.title}</p>
          <div className="flex items-center gap-2 text-muted-foreground text-[10px]">
            <span className="flex items-center gap-0.5">
              <Users className="h-2.5 w-2.5" />
              {slot.servings}인분
            </span>
          </div>
        </div>

        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-all
              text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(slot.id)
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    )
  }

  // Full view for tablet/mobile
  return (
    <div
      ref={elementRef}
      draggable
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onClick={() => onClick?.(slot.recipe.id)}
      className="group relative bg-card rounded-xl border-2 border-border
        hover:border-primary/40 hover:shadow-lg transition-all duration-200
        overflow-hidden cursor-pointer select-none"
    >
      {/* Drag handle indicator */}
      <div
        className="absolute top-2 left-2 z-10 p-1.5 rounded-lg bg-black/5
          opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Delete button */}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onDelete(slot.id)
          }}
          className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full
            bg-black/5 hover:bg-destructive hover:text-destructive-foreground
            opacity-0 group-hover:opacity-100 transition-all"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}

      {/* Recipe image (if available) */}
      {slot.recipe.image_url && (
        <div className="relative w-full h-28 bg-muted pointer-events-none">
          <img
            src={slot.recipe.image_url}
            alt={slot.recipe.title}
            className="w-full h-full object-contain"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        <h4 className="font-semibold text-card-foreground leading-snug line-clamp-2 mb-2">
          {slot.recipe.title}
        </h4>

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {slot.servings}인분
          </span>

          {slot.recipe.cook_time_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {slot.recipe.cook_time_minutes}분
            </span>
          )}

          {slot.recipe.calories && (
            <span className="flex items-center gap-1">
              <Flame className="h-3.5 w-3.5" />
              {slot.recipe.calories}kcal
            </span>
          )}
        </div>

        {/* Notes */}
        {slot.notes && (
          <p className="mt-2 text-sm text-muted-foreground italic
            border-l-2 border-primary/30 pl-2 line-clamp-2">
            {slot.notes}
          </p>
        )}
      </div>
    </div>
  )
}

interface EmptySlotProps {
  onClick: () => void
  compact?: boolean
}

export function EmptySlot({ onClick, compact = false }: EmptySlotProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full border-2 border-dashed border-muted-foreground/20 rounded-xl
        hover:border-primary hover:bg-primary/5 transition-all duration-200
        flex items-center justify-center text-muted-foreground hover:text-primary
        ${compact ? 'h-10 text-xs' : 'h-14 text-sm'}
      `}
    >
      <span className="font-medium">+ 추가</span>
    </button>
  )
}
