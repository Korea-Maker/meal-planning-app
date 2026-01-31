import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-green-50 to-white">
      <div className="max-w-4xl w-full text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-4">
          Meal Planning App
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          AI 기반 가족 식사 계획 앱으로 더 쉽고 건강한 식사를 계획하세요
        </p>

        <div className="flex justify-center gap-4 mb-12">
          <Link href="/login">
            <Button size="lg">로그인</Button>
          </Link>
          <Link href="/register">
            <Button size="lg" variant="outline">
              회원가입
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>레시피 관리</CardTitle>
              <CardDescription>레시피를 저장하고 정리하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                직접 레시피를 추가하거나 URL에서 자동으로 추출하세요. 카테고리와 태그로 쉽게 검색할
                수 있습니다.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>주간 식사 계획</CardTitle>
              <CardDescription>일주일 식사를 미리 계획하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                캘린더 형식으로 주간 식사를 계획하고, 가족 구성원 수에 맞게 인분을 조절하세요.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>장보기 목록</CardTitle>
              <CardDescription>자동으로 생성되는 쇼핑 리스트</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                식사 계획에서 필요한 재료를 자동으로 모아 장보기 목록을 만들어 드립니다.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
