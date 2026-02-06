import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChefHat, Calendar, ShoppingCart, Sparkles, Heart, Users } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-background" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <div className="text-center">
            {/* Logo */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-accent shadow-xl shadow-primary/25 mb-8">
              <ChefHat className="h-10 w-10 text-white" />
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                맛있는 계획
              </span>
              <br />
              <span className="text-foreground/80">으로 시작하는 건강한 식탁</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              AI 기반 식사 계획으로 바쁜 일상 속에서도
              <br className="hidden sm:block" />
              가족을 위한 따뜻한 식사를 준비하세요
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
              <Link href="/register">
                <Button size="lg" variant="gradient" className="w-full sm:w-auto text-base px-8">
                  <Sparkles className="h-5 w-5 mr-2" />
                  무료로 시작하기
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8">
                  로그인
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 sm:gap-16">
              <div className="text-center">
                <p className="text-3xl sm:text-4xl font-bold text-primary">500+</p>
                <p className="text-sm text-muted-foreground">한국 레시피</p>
              </div>
              <div className="text-center">
                <p className="text-3xl sm:text-4xl font-bold text-primary">AI</p>
                <p className="text-sm text-muted-foreground">스마트 추출</p>
              </div>
              <div className="text-center">
                <p className="text-3xl sm:text-4xl font-bold text-primary">자동</p>
                <p className="text-sm text-muted-foreground">장보기 목록</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 sm:py-28 bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              식사 계획이 이렇게 쉬웠나요?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              복잡한 식사 계획을 간단하게 만들어주는 스마트 기능들
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <Card className="group hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <ChefHat className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-xl">레시피 관리</CardTitle>
                <CardDescription>500개 이상의 한국 레시피</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  직접 레시피를 추가하거나 URL에서 AI가 자동으로 추출해요.
                  한국 공공 데이터 레시피도 바로 사용할 수 있어요.
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="h-7 w-7 text-accent" />
                </div>
                <CardTitle className="text-xl">주간 식사 계획</CardTitle>
                <CardDescription>드래그앤드롭으로 간편하게</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  캘린더에서 원하는 레시피를 배치하고 가족 수에 맞게
                  인분을 조절하세요. 모바일에서도 편리하게!
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-500/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <ShoppingCart className="h-7 w-7 text-green-600" />
                </div>
                <CardTitle className="text-xl">장보기 목록</CardTitle>
                <CardDescription>자동 생성 & 체크리스트</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  식사 계획에서 필요한 재료를 자동으로 모아
                  장보기 목록을 만들어 드려요. 마트에서 체크만 하세요!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
            <Heart className="h-4 w-4" />
            가족을 위한 따뜻한 식탁
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
            오늘부터 시작해보세요
          </h2>

          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            무료로 가입하고 첫 주간 식사 계획을 세워보세요.
            당신의 식탁이 더 풍요로워질 거예요.
          </p>

          <Link href="/register">
            <Button size="lg" variant="gradient" className="text-base px-10">
              <Users className="h-5 w-5 mr-2" />
              무료 가입하기
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <ChefHat className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-foreground">맛있는 계획</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 맛있는 계획. 모든 권리 보유.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
