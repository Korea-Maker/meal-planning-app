'use client'

import { MealCalendar } from '@/components/meal-plans/meal-calendar'

export default function MealPlansPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">식사 계획</h1>
        <p className="text-gray-600">주간 식사를 계획하고 관리하세요</p>
      </div>

      <MealCalendar />
    </div>
  )
}
