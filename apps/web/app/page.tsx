import Link from 'next/link'
import {
  ChefHat,
  Calendar,
  ShoppingBag,
  ArrowRight,
  CheckCircle,
  Heart,
  BookOpen,
  Link as LinkIcon,
  Globe,
  Star,
  Check,
} from 'lucide-react'
import { ScrollRevealInit } from '@/components/landing/scroll-reveal'

export default function Home() {
  return (
    <main className="min-h-[100dvh] bg-cream font-sans antialiased landing-noise" style={{ wordBreak: 'keep-all' }}>
      <ScrollRevealInit />

      {/* ========== NAVIGATION ========== */}
      <nav className="fixed top-0 left-0 right-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex items-center justify-between bg-white/70 backdrop-blur-xl border border-zinc-200/60 rounded-2xl px-5 py-3 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.06)]">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-[0_2px_8px_rgba(240,107,53,0.3)]">
                <ChefHat className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-zinc-900 text-lg tracking-tight">맛있는 계획</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-zinc-500 hover:text-zinc-900 spring">기능</a>
              <a href="#how" className="text-sm text-zinc-500 hover:text-zinc-900 spring">사용법</a>
              <a href="#reviews" className="text-sm text-zinc-500 hover:text-zinc-900 spring">후기</a>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden sm:block text-sm text-zinc-500 hover:text-zinc-900 spring">
                로그인
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 active:scale-[0.98] text-white text-sm font-medium rounded-full px-5 py-2.5 spring shadow-[0_2px_12px_rgba(240,107,53,0.25)]"
              >
                시작하기
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ========== HERO — Editorial Split ========== */}
      <section className="min-h-[100dvh] flex items-center pt-24 pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

            {/* Left: Text */}
            <div className="lg:col-span-6 xl:col-span-5">
              <div className="reveal">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] uppercase tracking-[0.15em] font-medium bg-primary/10 text-primary mb-6">
                  <Heart className="h-3 w-3" />
                  가족을 위한 식사 도우미
                </span>
              </div>

              <h1 className="reveal text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-snug text-zinc-900 mb-6">
                &ldquo;오늘 뭐 먹지?&rdquo;
                <br />
                <span className="text-primary">3초면</span> 해결됩니다
              </h1>

              <p className="reveal text-lg text-zinc-500 leading-relaxed max-w-[50ch] mb-8">
                레시피 저장부터 주간 식단, 장보기 목록까지.
                매일 반복되는 식사 고민을 하나로 정리해 드립니다.
              </p>

              {/* CTA */}
              <div className="reveal flex flex-col sm:flex-row gap-3 mb-10">
                <Link
                  href="/register"
                  className="group inline-flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 active:scale-[0.98] text-white font-medium rounded-full px-8 py-4 text-lg spring shadow-[0_4px_20px_rgba(240,107,53,0.3)] hover:shadow-[0_6px_30px_rgba(240,107,53,0.4)]"
                >
                  무료로 시작하기
                  <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 spring">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-zinc-50 active:scale-[0.98] text-zinc-700 font-medium rounded-full px-8 py-4 text-lg border border-zinc-200 spring"
                >
                  로그인
                </Link>
              </div>

              {/* Trust */}
              <div className="reveal flex items-center gap-4 text-sm text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-sage-500" />
                  무료, 카드 없이
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-sage-500" />
                  2,051개 레시피 제공
                </span>
              </div>
            </div>

            {/* Right: App Preview Cards */}
            <div className="lg:col-span-6 xl:col-span-7 reveal">
              <div className="relative max-w-lg lg:max-w-none ml-auto">

                {/* Main card: Weekly meal plan */}
                <div className="card-bezel">
                  <div className="card-bezel-inner !p-6 sm:!p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900 text-sm">이번 주 식단</p>
                          <p className="text-xs text-zinc-400">3월 3주차</p>
                        </div>
                      </div>
                      <span className="text-[11px] uppercase tracking-[0.1em] font-medium text-sage-500 bg-sage-50 px-3 py-1 rounded-full">
                        4/7 완료
                      </span>
                    </div>

                    <div className="space-y-2">
                      {[
                        { day: '월', menu: '된장찌개 · 계란말이 · 시금치나물', done: true },
                        { day: '화', menu: '김치볶음밥 · 미역국', done: true },
                        { day: '수', menu: '닭갈비 · 양배추 샐러드', done: true },
                        { day: '목', menu: '비빔밥 · 콩나물국', done: false },
                        { day: '금', menu: '제육볶음 · 된장국', done: false },
                      ].map((item) => (
                        <div
                          key={item.day}
                          className={`flex items-center gap-3 rounded-xl p-3 ring-1 ${
                            item.done
                              ? 'bg-white ring-zinc-100'
                              : 'bg-white/60 ring-zinc-100/60'
                          }`}
                        >
                          <span
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                              item.done
                                ? 'bg-primary/10 text-primary'
                                : 'bg-zinc-50 text-zinc-400'
                            }`}
                          >
                            {item.day}
                          </span>
                          <p className={`text-sm font-medium flex-1 min-w-0 truncate ${item.done ? 'text-zinc-800' : 'text-zinc-400'}`}>
                            {item.menu}
                          </p>
                          {item.done ? (
                            <CheckCircle className="h-[18px] w-[18px] text-sage-500 shrink-0" />
                          ) : (
                            <div className="w-[18px] h-[18px] rounded-full border-2 border-zinc-200 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Floating: Shopping list */}
                <div className="absolute -bottom-6 -left-4 sm:-left-8 bg-white rounded-2xl p-1 ring-1 ring-zinc-200/60 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.1)] rotate-[-2deg] animate-landing-float">
                  <div className="rounded-[calc(1rem-0.25rem)] px-5 py-4 w-48">
                    <div className="flex items-center gap-2 mb-3">
                      <ShoppingBag className="h-4 w-4 text-sage-500" />
                      <span className="text-xs font-bold text-zinc-800">장보기 목록</span>
                      <span className="ml-auto text-[10px] text-sage-500 font-medium bg-sage-50 px-2 py-0.5 rounded-full">8개</span>
                    </div>
                    <div className="space-y-2 text-[13px] text-zinc-600">
                      <p className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded border-2 border-sage-400 bg-sage-400 flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-white" />
                        </span>
                        <span className="line-through text-zinc-400">대파 2단</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded border-2 border-zinc-200" />
                        두부 1모
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded border-2 border-zinc-200" />
                        달걀 10구
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded border-2 border-zinc-200" />
                        양배추 반통
                      </p>
                    </div>
                  </div>
                </div>

                {/* Floating: Recipe count */}
                <div className="absolute -top-3 -right-2 sm:-right-4 bg-white rounded-xl px-4 py-2.5 ring-1 ring-zinc-200/60 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.08)] rotate-[3deg] animate-landing-float-delayed">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-[18px] w-[18px] text-primary" />
                    <div>
                      <p className="text-sm font-bold text-zinc-800">2,051</p>
                      <p className="text-[10px] text-zinc-400">레시피</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========== SOCIAL PROOF STRIP ========== */}
      <section className="py-6 border-y border-zinc-200/60 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 text-center">
            <div className="reveal">
              <p className="text-2xl sm:text-3xl font-bold text-zinc-800">2,051<span className="text-primary">+</span></p>
              <p className="text-xs text-zinc-400 mt-0.5">등록 레시피</p>
            </div>
            <div className="w-px bg-zinc-200 hidden sm:block" />
            <div className="reveal">
              <p className="text-2xl sm:text-3xl font-bold text-zinc-800">4.87<span className="text-primary">/5</span></p>
              <p className="text-xs text-zinc-400 mt-0.5">사용자 만족도</p>
            </div>
            <div className="w-px bg-zinc-200 hidden sm:block" />
            <div className="reveal">
              <p className="text-2xl sm:text-3xl font-bold text-zinc-800">3<span className="text-primary">초</span></p>
              <p className="text-xs text-zinc-400 mt-0.5">URL 레시피 추출</p>
            </div>
            <div className="w-px bg-zinc-200 hidden sm:block" />
            <div className="reveal">
              <p className="text-2xl sm:text-3xl font-bold text-zinc-800">100<span className="text-primary">%</span></p>
              <p className="text-xs text-zinc-400 mt-0.5">무료</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FEATURES — Bento Grid ========== */}
      <section id="features" className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-16 reveal">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] uppercase tracking-[0.15em] font-medium bg-primary/10 text-primary mb-5">
              주요 기능
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-snug text-zinc-900 mb-4">
              식사 준비의 처음부터
              <br />
              끝까지 하나로
            </h2>
            <p className="text-lg text-zinc-500 leading-relaxed">
              흩어져 있던 레시피, 식단, 장보기를 한 곳에서 관리하세요.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 stagger">
            {/* Card 1: Recipe — Large */}
            <div className="md:col-span-8 reveal">
              <div className="card-bezel h-full">
                <div className="card-bezel-inner h-full flex flex-col">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-2">레시피를 한 곳에 모으세요</h3>
                  <p className="text-zinc-500 leading-relaxed mb-6 max-w-[55ch]">
                    블로그 URL을 붙여넣으면 재료와 조리법이 자동으로 정리됩니다.
                    직접 입력도 가능하고, 2,000개 이상의 한국·해외 레시피를 바로 둘러볼 수 있어요.
                  </p>
                  <div className="mt-auto bg-white rounded-2xl p-5 ring-1 ring-zinc-100">
                    <p className="text-[11px] uppercase tracking-[0.1em] text-zinc-400 font-medium mb-3">URL 붙여넣기</p>
                    <div className="flex items-center gap-3 bg-cream rounded-xl border border-zinc-200/60 px-4 py-3 mb-3">
                      <LinkIcon className="h-4 w-4 text-zinc-400 shrink-0" />
                      <span className="text-sm text-zinc-400 truncate">https://blog.naver.com/recipe/kimchi-jjigae...</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <ArrowRight className="h-4 w-4 text-primary rotate-90 shrink-0" />
                      <span className="text-primary font-medium">재료 8개 · 조리법 5단계 추출 완료</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Meal Plan */}
            <div className="md:col-span-4 reveal">
              <div className="card-bezel h-full">
                <div className="card-bezel-inner h-full flex flex-col">
                  <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
                    <Calendar className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-2">주간 식단 캘린더</h3>
                  <p className="text-zinc-500 leading-relaxed">
                    아침·점심·저녁을 캘린더에 배치하고, 드래그로 옮기고, 인분 수도 바로 조절할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3: Shopping */}
            <div className="md:col-span-4 reveal">
              <div className="card-bezel h-full">
                <div className="card-bezel-inner h-full flex flex-col">
                  <div className="w-12 h-12 rounded-2xl bg-sage-100 flex items-center justify-center mb-6">
                    <ShoppingBag className="h-6 w-6 text-sage-500" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-2">장보기 목록 자동 생성</h3>
                  <p className="text-zinc-500 leading-relaxed">
                    식단을 세우면 필요한 재료가 자동으로 모입니다.
                    마트에서 하나씩 체크하세요.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 4: Korean recipes */}
            <div className="md:col-span-8 reveal">
              <div className="card-bezel h-full">
                <div className="card-bezel-inner h-full">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center shrink-0">
                      <Globe className="h-6 w-6 text-primary/70" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900 mb-2">한국·해외 레시피 2,051개</h3>
                      <p className="text-zinc-500 leading-relaxed max-w-[55ch]">
                        식품안전나라, Spoonacular, TheMealDB에서 매일 자동으로 업데이트되는 레시피를 한국어로 바로 확인하세요.
                        직접 레시피를 추가할 수도 있습니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section id="how" className="py-24 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-16 reveal">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] uppercase tracking-[0.15em] font-medium bg-sage-100 text-sage-500 mb-5">
              사용법
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-snug text-zinc-900">
              3단계면 충분합니다
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 stagger">
            {[
              {
                step: '1',
                title: '레시피 모으기',
                desc: '직접 입력하거나 URL을 붙여넣거나, 기본 제공되는 2,000개 이상의 레시피에서 골라 내 레시피함을 채우세요.',
              },
              {
                step: '2',
                title: '한 주 식단 짜기',
                desc: '캘린더에 레시피를 배치하면 한 주 식사가 한눈에 보입니다. 가족 수에 맞게 인분도 바로 조절할 수 있어요.',
              },
              {
                step: '3',
                title: '장보기',
                desc: '필요한 재료가 자동으로 목록이 됩니다. 마트에서 체크하며 장을 보면 끝. 빠뜨리는 재료 없이 깔끔하게.',
              },
            ].map((item) => (
              <div key={item.step} className="reveal">
                <span className="text-6xl font-bold text-primary/15 leading-none select-none block mb-5">
                  {item.step}
                </span>
                <h3 className="text-lg font-bold text-zinc-900 mb-2">{item.title}</h3>
                <p className="text-zinc-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== TESTIMONIALS ========== */}
      <section id="reviews" className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-16 reveal">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] uppercase tracking-[0.15em] font-medium bg-primary/10 text-primary mb-5">
              사용 후기
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-snug text-zinc-900">
              직접 써본 분들의 이야기
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 stagger">
            {/* Testimonial 1 — Tall */}
            <div className="md:col-span-5 reveal">
              <div className="card-bezel">
                <div className="rounded-[calc(2rem-0.375rem)] p-7">
                  <div className="flex mb-2 gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-zinc-700 leading-relaxed mb-6">
                    &ldquo;매주 일요일 저녁에 한 주 식단을 짜는 게 루틴이 됐어요.
                    장보기 목록이 자동으로 나오니까 마트에서 시간을 반으로 줄였습니다.
                    남편도 &lsquo;오늘 뭐 먹어?&rsquo; 대신 캘린더를 먼저 보더라고요.&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://i.pravatar.cc/150?u=hayunseo" alt="" className="w-10 h-10 rounded-full object-cover" loading="lazy" />
                    <div>
                      <p className="text-sm font-bold text-zinc-800">하윤서</p>
                      <p className="text-xs text-zinc-400">4인 가족 · 사용 3개월</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 + 3 stacked */}
            <div className="md:col-span-7 flex flex-col gap-4">
              <div className="reveal">
                <div className="card-bezel">
                  <div className="rounded-[calc(2rem-0.375rem)] p-7">
                    <div className="flex mb-2 gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-zinc-700 leading-relaxed mb-6">
                      &ldquo;자취하면서 매일 배달만 시키다가, 이걸 쓰고 나서 일주일에 4번은 직접 해 먹게 됐어요.
                      URL로 유튜브 레시피 저장하는 게 진짜 편합니다.&rdquo;
                    </p>
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="https://i.pravatar.cc/150?u=parkdohyun" alt="" className="w-10 h-10 rounded-full object-cover" loading="lazy" />
                      <div>
                        <p className="text-sm font-bold text-zinc-800">박도현</p>
                        <p className="text-xs text-zinc-400">1인 가구 · 사용 2개월</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="reveal">
                <div className="card-bezel">
                  <div className="rounded-[calc(2rem-0.375rem)] p-7">
                    <div className="flex mb-2 gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-zinc-700 leading-relaxed mb-6">
                      &ldquo;한국 레시피가 기본으로 많아서 좋아요. 아이 이유식 레시피도 URL로 바로 저장해서 쓰고 있습니다.&rdquo;
                    </p>
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="https://i.pravatar.cc/150?u=leesejin" alt="" className="w-10 h-10 rounded-full object-cover" loading="lazy" />
                      <div>
                        <p className="text-sm font-bold text-zinc-800">이서진</p>
                        <p className="text-xs text-zinc-400">3인 가족 · 사용 5개월</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CTA — Dark Section ========== */}
      <section className="py-24 md:py-32 bg-zinc-900 relative overflow-hidden">
        {/* Subtle gradient mesh */}
        <div className="absolute inset-0 opacity-30 pointer-events-none" aria-hidden="true">
          <div
            className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(240,107,53,0.3) 0%, transparent 70%)', filter: 'blur(80px)' }}
          />
          <div
            className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(224,90,40,0.2) 0%, transparent 70%)', filter: 'blur(80px)' }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-2xl reveal">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-snug text-white mb-6">
              오늘 저녁,
              <br />
              뭐 먹을지 정해볼까요?
            </h2>
            <p className="text-lg text-zinc-400 leading-relaxed mb-10 max-w-[50ch]">
              무료로 가입하고 첫 주간 식단을 만들어 보세요.
              카드 등록 없이 바로 시작할 수 있습니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-3 bg-primary hover:bg-primary/80 active:scale-[0.98] text-white font-medium rounded-full px-8 py-4 text-lg spring shadow-[0_0_30px_rgba(240,107,53,0.3)] hover:shadow-[0_0_40px_rgba(240,107,53,0.4)]"
              >
                무료로 시작하기
                <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 spring">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 active:scale-[0.98] text-white font-medium rounded-full px-8 py-4 text-lg border border-white/10 spring backdrop-blur-sm"
              >
                로그인
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="py-10 bg-cream border-t border-zinc-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <ChefHat className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-zinc-800">맛있는 계획</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-zinc-400">
              <span>&copy; 2024 맛있는 계획</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
