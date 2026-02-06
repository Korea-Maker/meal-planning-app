'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, ShoppingBag, Loader2, ShoppingCart, Calendar, CheckCircle2 } from 'lucide-react'
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">장보기 목록</h1>
          </div>
          <p className="text-muted-foreground ml-13">필요한 재료를 관리하세요</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient">
              <Plus className="h-4 w-4 mr-2" />새 목록
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">새 장보기 목록</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="목록 이름 (예: 이번 주 장보기)"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateList()
                }}
                className="h-11 rounded-xl"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
                취소
              </Button>
              <Button
                onClick={handleCreateList}
                disabled={!newListName.trim() || createList.isPending}
                className="rounded-xl"
              >
                {createList.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                생성
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-primary border-t-transparent" />
          <p className="text-muted-foreground">장보기 목록을 불러오는 중...</p>
        </div>
      ) : shoppingLists.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/10 to-emerald-500/10 flex items-center justify-center mb-6">
              <ShoppingBag className="h-10 w-10 text-green-600/50" />
            </div>
            <p className="text-lg font-medium text-foreground mb-2">아직 장보기 목록이 없습니다</p>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              식사 계획에서 자동으로 장보기 목록을 생성하거나
              <br />직접 새 목록을 만들어보세요
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDialogOpen(true)} className="rounded-xl">
                <Plus className="h-4 w-4 mr-2" />직접 만들기
              </Button>
              <Button asChild className="rounded-xl">
                <Link href="/meal-plans">
                  <Calendar className="h-4 w-4 mr-2" />식사 계획에서 생성
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {shoppingLists.map((list) => (
            <Link key={list.id} href={`/shopping-lists/${list.id}`}>
              <Card className="group cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ShoppingBag className="h-5 w-5 text-green-600" />
                    </div>
                    {list.meal_plan_id && (
                      <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        식사 계획
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-3 group-hover:text-primary transition-colors">
                    {list.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <span>
                      {new Date(list.created_at).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      구매 준비 완료
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
