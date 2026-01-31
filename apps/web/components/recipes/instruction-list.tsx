'use client'

import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { CreateInstructionRequest } from '@meal-planning/shared-types'

interface InstructionListProps {
  instructions: CreateInstructionRequest[]
  onChange: (instructions: CreateInstructionRequest[]) => void
  errors?: Record<number, string>
}

export function InstructionList({ instructions, onChange, errors = {} }: InstructionListProps) {
  const addInstruction = () => {
    const newInstruction: CreateInstructionRequest = {
      step_number: instructions.length + 1,
      description: '',
    }
    onChange([...instructions, newInstruction])
  }

  const removeInstruction = (index: number) => {
    const updated = instructions
      .filter((_, i) => i !== index)
      .map((inst, i) => ({ ...inst, step_number: i + 1 }))
    onChange(updated)
  }

  const updateInstruction = (index: number, description: string) => {
    const updated = instructions.map((inst, i) =>
      i === index ? { ...inst, description } : inst
    )
    onChange(updated)
  }

  const moveInstruction = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
    if (toIndex < 0 || toIndex >= instructions.length) return

    const updated = [...instructions]
    const [removed] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, removed)

    onChange(updated.map((inst, i) => ({ ...inst, step_number: i + 1 })))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">조리 순서</h3>
        <Button type="button" variant="outline" size="sm" onClick={addInstruction}>
          <Plus className="h-4 w-4 mr-1" />
          단계 추가
        </Button>
      </div>

      {instructions.length === 0 ? (
        <div className="text-center py-6 text-gray-500 border border-dashed rounded-md">
          조리 단계를 추가해 주세요
        </div>
      ) : (
        <div className="space-y-3">
          {instructions.map((instruction, index) => (
            <div
              key={index}
              className={`relative p-4 bg-gray-50 rounded-md ${
                errors[index] ? 'ring-2 ring-red-500' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    {instruction.step_number}
                  </div>
                  <div className="flex flex-col">
                    <button
                      type="button"
                      className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      onClick={() => moveInstruction(index, 'up')}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      onClick={() => moveInstruction(index, 'down')}
                      disabled={index === instructions.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1">
                  <Textarea
                    placeholder={`${instruction.step_number}단계 설명을 입력하세요...`}
                    value={instruction.description}
                    onChange={(e) => updateInstruction(index, e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeInstruction(index)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {Object.keys(errors).length > 0 && (
        <p className="text-sm text-red-500">모든 조리 단계의 설명을 입력해 주세요</p>
      )}
    </div>
  )
}
