'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, ShoppingBag, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useShoppingLists, useCreateShoppingList } from '@/hooks/use-shopping-list'
import { toast } from '@/hooks/use-toast'

export default function ShoppingListsPage() {
  const { data, isLoading } = useShoppingLists()
  const createList = useCreateShoppingList()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [newListName, setNewListName] = useState('')

  const shoppingLists = data?.data || []

  const handleCreateList = async () => {
    if (!newListName.trim()) return

    try {
      await createList.mutateAsync({ name: newListName.trim() })
      toast({
        title: '목록 생성됨',
        description: '새 장보기 목록이 생성되었습니다',
        variant: 'success',
      })
      setNewListName('')
      setDialogOpen(false)
    } catch (error) {
      toast({
        title: '오류',
        description: '목록을 생성할 수 없습니다',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">장보기 목록</h1>
          <p className="text-gray-600">필요한 재료를 관리하세요</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />새 목록
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 장보기 목록</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="목록 이름 (예: 이번 주 장보기)"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateList()
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                취소
              </Button>
              <Button
                onClick={handleCreateList}
                disabled={!newListName.trim() || createList.isPending}
              >
                {createList.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                생성
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : shoppingLists.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingBag className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">아직 장보기 목록이 없습니다</p>
            <p className="text-sm text-gray-400 mb-4">
              식사 계획에서 자동으로 장보기 목록을 생성하거나 직접 만들 수 있습니다
            </p>
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />첫 목록 만들기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shoppingLists.map((list) => (
            <Link key={list.id} href={`/shopping-lists/${list.id}`}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardHeader>
                  <CardTitle className="text-lg">{list.name}</CardTitle>
                  <CardDescription>
                    {new Date(list.created_at).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {list.meal_plan_id && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      식사 계획 연결됨
                    </span>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
