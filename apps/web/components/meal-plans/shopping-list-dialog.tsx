'use client'

import { useState } from 'react'
import { ShoppingCart, Calendar, UtensilsCrossed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

const DAY_LABELS: Record<string, string> = {
  0: '일',
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금',
  6: '토',
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
}

interface ShoppingListDialogProps {
  mealPlan: {
    id: string
    week_start_date: string
  } | null
  slots: Array<{
    date: string
    meal_type: string
    recipe?: { title: string } | null
  }>
  onGenerate: (params: { mealPlanId: string; dates?: string[]; mealTypes?: string[] }) => Promise<void>
  isPending: boolean
}

export function ShoppingListDialog({ mealPlan, slots, onGenerate, isPending }: ShoppingListDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [selectedMealTypes, setSelectedMealTypes] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<'all' | 'custom'>('all')

  // Get unique dates and meal types from slots
  const availableDates = [...new Set(slots.map(s => s.date))].sort()
  const availableMealTypes = [...new Set(slots.map(s => s.meal_type))]

  const handleGenerate = async () => {
    if (!mealPlan) return

    const params: { mealPlanId: string; dates?: string[]; mealTypes?: string[] } = {
      mealPlanId: mealPlan.id,
    }

    if (mode === 'custom') {
      if (selectedDates.size > 0) {
        params.dates = [...selectedDates]
      }
      if (selectedMealTypes.size > 0) {
        params.mealTypes = [...selectedMealTypes]
      }
    }

    await onGenerate(params)
    setOpen(false)
  }

  const toggleDate = (date: string) => {
    const newSet = new Set(selectedDates)
    if (newSet.has(date)) {
      newSet.delete(date)
    } else {
      newSet.add(date)
    }
    setSelectedDates(newSet)
  }

  const toggleMealType = (type: string) => {
    const newSet = new Set(selectedMealTypes)
    if (newSet.has(type)) {
      newSet.delete(type)
    } else {
      newSet.add(type)
    }
    setSelectedMealTypes(newSet)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    const dayOfWeek = DAY_LABELS[date.getDay().toString()] || ''
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}/${day} (${dayOfWeek})`
  }

  // Count slots per date
  const slotsPerDate = availableDates.reduce((acc, date) => {
    acc[date] = slots.filter(s => s.date === date).length
    return acc
  }, {} as Record<string, number>)

  // Count slots per meal type
  const slotsPerType = availableMealTypes.reduce((acc, type) => {
    acc[type] = slots.filter(s => s.meal_type === type).length
    return acc
  }, {} as Record<string, number>)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={!mealPlan || isPending}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          장보기 목록
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>장보기 목록 생성</DialogTitle>
          <DialogDescription>
            전체 식사 계획 또는 특정 날짜/식사만 선택하여 장보기 목록을 생성합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Mode selection */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('all')}
              className="flex-1"
            >
              전체 주간
            </Button>
            <Button
              variant={mode === 'custom' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('custom')}
              className="flex-1"
            >
              선택 생성
            </Button>
          </div>

          {mode === 'custom' && (
            <>
              {/* Date selection */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">날짜 선택</span>
                  <span className="text-xs text-muted-foreground">(선택하지 않으면 전체)</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {availableDates.map(date => (
                    <label
                      key={date}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedDates.has(date) ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                      }`}
                    >
                      <Checkbox
                        checked={selectedDates.has(date)}
                        onCheckedChange={() => toggleDate(date)}
                      />
                      <div className="text-xs">
                        <div className="font-medium">{formatDate(date)}</div>
                        <div className="text-muted-foreground">{slotsPerDate[date]}끼</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Meal type selection */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">식사 유형 선택</span>
                  <span className="text-xs text-muted-foreground">(선택하지 않으면 전체)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {availableMealTypes.map(type => (
                    <label
                      key={type}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedMealTypes.has(type) ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                      }`}
                    >
                      <Checkbox
                        checked={selectedMealTypes.has(type)}
                        onCheckedChange={() => toggleMealType(type)}
                      />
                      <div className="text-xs">
                        <div className="font-medium">{MEAL_TYPE_LABELS[type] || type}</div>
                        <div className="text-muted-foreground">{slotsPerType[type]}개 레시피</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button onClick={handleGenerate} disabled={isPending}>
            {isPending ? '생성 중...' : '장보기 목록 생성'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
