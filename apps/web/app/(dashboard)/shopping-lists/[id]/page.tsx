'use client'

import { use, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ChevronDown,
  Loader2,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AddItemForm } from '@/components/shopping-lists/add-item-form'
import {
  useShoppingList,
  useAddShoppingItem,
  useCheckShoppingItem,
  useDeleteShoppingItem,
  useDeleteShoppingList,
} from '@/hooks/use-shopping-list'
import { toast } from '@/hooks/use-toast'
import type { ShoppingCategory, ShoppingItem, CreateShoppingItemRequest } from '@meal-planning/shared-types'

const CATEGORY_LABELS: Record<ShoppingCategory, string> = {
  produce: '채소/과일',
  meat: '육류',
  dairy: '유제품',
  bakery: '빵/베이커리',
  frozen: '냉동식품',
  pantry: '식료품',
  beverages: '음료',
  other: '기타',
}

const CATEGORY_ICONS: Record<ShoppingCategory, string> = {
  produce: '🥬',
  meat: '🥩',
  dairy: '🥛',
  bakery: '🍞',
  frozen: '🧊',
  pantry: '🌾',
  beverages: '🥤',
  other: '📦',
}

const CATEGORY_ORDER: ShoppingCategory[] = [
  'produce',
  'meat',
  'dairy',
  'bakery',
  'frozen',
  'pantry',
  'beverages',
  'other',
]

interface CategorySectionProps {
  category: ShoppingCategory
  items: ShoppingItem[]
  onCheck: (id: string) => void
  onDelete: (id: string) => void
}

function CategorySection({ category, items, onCheck, onDelete }: CategorySectionProps) {
  const [expanded, setExpanded] = useState(true)
  const icon = CATEGORY_ICONS[category]
  const label = CATEGORY_LABELS[category]
  const checkedCount = items.filter((i) => i.is_checked).length
  const progress = Math.round((checkedCount / items.length) * 100)

  return (
    <div className="bg-card rounded-2xl border-2 border-border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div className="text-left">
            <h3 className="font-semibold text-card-foreground">{label}</h3>
            <p className="text-xs text-muted-foreground">
              {checkedCount} / {items.length} 완료
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <ChevronDown
            className={`h-5 w-5 text-muted-foreground transition-transform ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-1">
          {items.map((item) => (
            <ShoppingItemRow
              key={item.id}
              item={item}
              onCheck={onCheck}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface ShoppingItemRowProps {
  item: ShoppingItem
  onCheck: (id: string) => void
  onDelete: (id: string) => void
}

function ShoppingItemRow({ item, onCheck, onDelete }: ShoppingItemRowProps) {
  return (
    <div
      className={`group flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-all ${
        item.is_checked ? 'opacity-60' : ''
      }`}
    >
      <Checkbox
        checked={item.is_checked}
        onCheckedChange={() => onCheck(item.id)}
        className="h-5 w-5 rounded-md data-[state=checked]:bg-primary"
      />

      <div className="flex-1 min-w-0">
        <p
          className={`font-medium transition-all ${
            item.is_checked ? 'line-through text-muted-foreground' : 'text-card-foreground'
          }`}
        >
          {item.ingredient_name}
        </p>
        <p className="text-sm text-muted-foreground">
          {item.amount} {item.unit}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(item.id)}
        className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

interface Props {
  params: Promise<{ id: string }>
}

export default function ShoppingListDetailPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()

  const { data: shoppingList, isLoading } = useShoppingList(id)
  const addItem = useAddShoppingItem(id)
  const checkItem = useCheckShoppingItem(id)
  const deleteItem = useDeleteShoppingItem(id)
  const deleteList = useDeleteShoppingList()

  const [hideChecked, setHideChecked] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const itemsByCategory = useMemo(() => {
    if (!shoppingList?.items) return new Map<ShoppingCategory, ShoppingItem[]>()

    const map = new Map<ShoppingCategory, ShoppingItem[]>()
    shoppingList.items.forEach((item) => {
      if (hideChecked && item.is_checked) return
      const existing = map.get(item.category) || []
      map.set(item.category, [...existing, item])
    })

    return map
  }, [shoppingList?.items, hideChecked])

  const stats = useMemo(() => {
    if (!shoppingList?.items) return { total: 0, checked: 0, percentage: 0 }

    const total = shoppingList.items.length
    const checked = shoppingList.items.filter((i) => i.is_checked).length
    const percentage = total > 0 ? Math.round((checked / total) * 100) : 0

    return { total, checked, percentage }
  }, [shoppingList?.items])

  const handleAddItem = async (data: CreateShoppingItemRequest) => {
    try {
      await addItem.mutateAsync(data)
      toast({
        title: '항목 추가됨',
        description: `${data.ingredient_name}이(가) 추가되었습니다`,
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: '오류',
        description: '항목을 추가할 수 없습니다',
        variant: 'destructive',
      })
    }
  }

  const handleCheckItem = async (itemId: string) => {
    try {
      await checkItem.mutateAsync(itemId)
    } catch (error) {
      toast({
        title: '오류',
        description: '항목 상태를 변경할 수 없습니다',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteItem.mutateAsync(itemId)
      toast({
        title: '삭제됨',
        description: '항목이 삭제되었습니다',
      })
    } catch (error) {
      toast({
        title: '오류',
        description: '항목을 삭제할 수 없습니다',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteList = async () => {
    try {
      await deleteList.mutateAsync(id)
      toast({
        title: '목록 삭제됨',
        description: '장보기 목록이 삭제되었습니다',
        variant: 'success',
      })
      router.push('/shopping-lists')
    } catch (error) {
      toast({
        title: '오류',
        description: '목록을 삭제할 수 없습니다',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!shoppingList) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">장보기 목록을 찾을 수 없습니다</p>
        <Button variant="outline" asChild>
          <Link href="/shopping-lists">목록으로 돌아가기</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/shopping-lists">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">{shoppingList.name}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHideChecked(!hideChecked)}
          >
            {hideChecked ? (
              <>
                <Eye className="h-4 w-4 mr-2" />
                모두 표시
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                완료 숨기기
              </>
            )}
          </Button>

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                목록 삭제
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>장보기 목록 삭제</DialogTitle>
                <DialogDescription>
                  정말로 이 장보기 목록을 삭제하시겠습니까? 모든 항목이 함께 삭제됩니다.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  취소
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteList}
                  disabled={deleteList.isPending}
                >
                  {deleteList.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  삭제
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Progress Card */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5 rounded-2xl p-6 border border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-card-foreground">장보기 진행률</h2>
            <p className="text-muted-foreground">
              {stats.checked} / {stats.total} 항목 완료
            </p>
          </div>
          <span className="text-4xl font-bold text-primary">{stats.percentage}%</span>
        </div>
        <Progress value={stats.percentage} className="h-3" />
      </div>

      {/* Category Sections */}
      <div className="space-y-4">
        {CATEGORY_ORDER.map((category) => {
          const items = itemsByCategory.get(category)
          if (!items || items.length === 0) return null

          return (
            <CategorySection
              key={category}
              category={category}
              items={items}
              onCheck={handleCheckItem}
              onDelete={handleDeleteItem}
            />
          )
        })}
      </div>

      {/* Empty State */}
      {shoppingList.items.length === 0 && (
        <div className="bg-card rounded-2xl border-2 border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground mb-4">아직 항목이 없습니다</p>
        </div>
      )}

      {/* Add Item Form */}
      <AddItemForm onSubmit={handleAddItem} isPending={addItem.isPending} />
    </div>
  )
}
