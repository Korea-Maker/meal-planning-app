'use client'

import { use, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  Loader2,
  Trash2,
  Eye,
  EyeOff,
  CheckCheck,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ShoppingItemRow } from '@/components/shopping-lists/shopping-item'
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/shopping-lists">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{shoppingList.name}</h1>
            <p className="text-gray-600">
              {stats.checked}/{stats.total} 완료 ({stats.percentage}%)
            </p>
          </div>
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

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-green-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${stats.percentage}%` }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {CATEGORY_ORDER.map((category) => {
          const items = itemsByCategory.get(category)
          if (!items || items.length === 0) return null

          return (
            <Card key={category}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {CATEGORY_LABELS[category]}
                  <span className="text-sm font-normal text-gray-500">
                    ({items.filter((i) => i.is_checked).length}/{items.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {items.map((item) => (
                  <ShoppingItemRow
                    key={item.id}
                    item={item}
                    onCheck={handleCheckItem}
                    onDelete={handleDeleteItem}
                  />
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {shoppingList.items.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">아직 항목이 없습니다</p>
          </CardContent>
        </Card>
      )}

      <AddItemForm onSubmit={handleAddItem} isPending={addItem.isPending} />
    </div>
  )
}
