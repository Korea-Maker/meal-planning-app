'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import type { User, ApiResponse } from '@meal-planning/shared-types'

const profileSchema = z.object({
  name: z.string().min(1, '이름을 입력하세요').max(100),
  servings_default: z.number().min(1).max(20),
})

type ProfileForm = z.infer<typeof profileSchema>

export default function ProfilePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      servings_default: user?.servings_default || 4,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: ProfileForm) =>
      api.patch<ApiResponse<User>>('/users/me', data),
    onSuccess: () => {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
  })

  const onSubmit = (data: ProfileForm) => {
    mutation.mutate(data)
  }

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">프로필</h1>
        <p className="text-gray-600">계정 정보를 관리하세요</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
          <CardDescription>프로필 정보를 수정하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {success && (
              <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md">
                프로필이 업데이트되었습니다
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input id="email" value={user.email} disabled className="bg-gray-50" />
              <p className="text-xs text-gray-500">이메일은 변경할 수 없습니다</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="servings_default">기본 인분 수</Label>
              <Input
                id="servings_default"
                type="number"
                min={1}
                max={20}
                {...register('servings_default', { valueAsNumber: true })}
              />
              {errors.servings_default && (
                <p className="text-sm text-red-600">{errors.servings_default.message}</p>
              )}
              <p className="text-xs text-gray-500">
                레시피와 식사 계획의 기본 인분 수로 사용됩니다
              </p>
            </div>

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>식이 정보</CardTitle>
          <CardDescription>식이 제한 및 알러지 정보를 설정하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>식이 제한</Label>
              <p className="text-sm text-gray-500 mt-1">
                {user.dietary_restrictions.length > 0
                  ? user.dietary_restrictions.join(', ')
                  : '설정된 식이 제한이 없습니다'}
              </p>
            </div>
            <div>
              <Label>알러지</Label>
              <p className="text-sm text-gray-500 mt-1">
                {user.allergens.length > 0
                  ? user.allergens.join(', ')
                  : '설정된 알러지가 없습니다'}
              </p>
            </div>
            <Button variant="outline" disabled>
              식이 정보 수정 (준비 중)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>계정 정보</CardTitle>
          <CardDescription>로그인 방식 및 가입일</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">로그인 방식</span>
              <span className="font-medium capitalize">{user.provider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">가입일</span>
              <span className="font-medium">
                {new Date(user.created_at).toLocaleDateString('ko-KR')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
