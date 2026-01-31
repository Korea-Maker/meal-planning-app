# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**Meal Planning App** - AI 기반 가족 식사 계획 앱. 레시피 관리, 주간 식사 계획, 장보기 목록 자동 생성 기능을 제공합니다.

## Project Status

**현재 단계:** 개발 환경 구축 완료 (Phase 1-A)

## Tech Stack (확정)

| 계층 | 기술 |
|------|------|
| Frontend | Next.js 15 (App Router), shadcn/ui, TanStack Query v5, Tailwind CSS |
| Backend | Python FastAPI |
| Database | PostgreSQL 16 (Alembic 마이그레이션) |
| Cache | Redis 7 |
| Auth | JWT + OAuth 2.0 (Google, Apple 예정) |
| AI | OpenAI GPT-5 Mini (URL 추출 예정) |
| 외부 레시피 | 식품안전나라 (한국), Spoonacular, TheMealDB |

## Project Structure (Monorepo)

```
meal-planning-app/
├── apps/
│   ├── web/                    # Next.js 15 Frontend
│   │   ├── app/                # App Router 페이지
│   │   │   ├── (auth)/         # 로그인/회원가입
│   │   │   └── (dashboard)/    # 보호된 라우트
│   │   ├── components/         # UI 컴포넌트
│   │   ├── hooks/              # 커스텀 훅
│   │   └── lib/                # API, Auth 컨텍스트
│   │
│   └── api/                    # FastAPI Backend
│       ├── src/
│       │   ├── api/v1/         # API 엔드포인트
│       │   ├── core/           # 설정, 보안, DB
│       │   ├── services/       # 비즈니스 로직
│       │   ├── repositories/   # 데이터 접근
│       │   ├── models/         # SQLAlchemy 모델
│       │   └── schemas/        # Pydantic 스키마
│       └── alembic/            # DB 마이그레이션
│
├── packages/
│   ├── shared-types/           # 공유 TypeScript 타입
│   └── constants/              # 공유 상수
│
├── docs/spec/                  # 스펙 문서
├── turbo.json                  # Turborepo 설정
└── pnpm-workspace.yaml
```

## Development Commands

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행 (전체)
pnpm dev

# 개발 서버 실행 (개별)
pnpm --filter web dev        # Frontend
pnpm --filter api dev        # Backend (uvicorn 필요)

# 빌드
pnpm build

# 린트
pnpm lint

# DB 마이그레이션
cd apps/api && alembic upgrade head
```

## Database Schema (6 Tables)

- **users** - 사용자 정보, OAuth, 프로필
- **recipes** - 레시피 기본 정보 (GIN 인덱스, Full-text 검색)
- **ingredients** - 레시피 재료
- **instructions** - 조리 단계
- **meal_plans** - 주간 식사 계획
- **meal_slots** - 개별 식사 배치
- **shopping_lists** - 장보기 목록
- **shopping_items** - 장보기 항목

## API Endpoints

### Auth
- `POST /api/v1/auth/register` - 회원가입
- `POST /api/v1/auth/login` - 로그인
- `POST /api/v1/auth/refresh` - 토큰 갱신

### Users
- `GET /api/v1/users/me` - 현재 사용자 정보
- `PATCH /api/v1/users/me` - 프로필 수정

### Recipes
- `GET /api/v1/recipes` - 레시피 목록
- `POST /api/v1/recipes` - 레시피 생성
- `GET /api/v1/recipes/search` - 레시피 검색
- `GET /api/v1/recipes/{id}` - 레시피 상세
- `PATCH /api/v1/recipes/{id}` - 레시피 수정
- `DELETE /api/v1/recipes/{id}` - 레시피 삭제
- `POST /api/v1/recipes/{id}/adjust-servings` - 인분 조절

### Meal Plans
- `GET /api/v1/meal-plans` - 식사 계획 목록
- `POST /api/v1/meal-plans` - 식사 계획 생성
- `GET /api/v1/meal-plans/week/{date}` - 주간 식사 계획
- `GET /api/v1/meal-plans/{id}` - 식사 계획 상세
- `POST /api/v1/meal-plans/{id}/slots` - 식사 슬롯 추가
- `PATCH /api/v1/meal-plans/{id}/slots/{slot_id}` - 슬롯 수정
- `DELETE /api/v1/meal-plans/{id}/slots/{slot_id}` - 슬롯 삭제

### Shopping Lists
- `GET /api/v1/shopping-lists` - 장보기 목록
- `POST /api/v1/shopping-lists` - 목록 생성
- `POST /api/v1/shopping-lists/generate` - 식사 계획에서 자동 생성
- `GET /api/v1/shopping-lists/{id}` - 목록 상세
- `POST /api/v1/shopping-lists/{id}/items` - 항목 추가
- `PATCH /api/v1/shopping-lists/{id}/items/{item_id}` - 항목 수정
- `POST /api/v1/shopping-lists/{id}/items/{item_id}/check` - 체크 토글

## MVP Features (Phase 1)

1. [x] 프로젝트 scaffolding
2. [x] 데이터베이스 스키마 설계
3. [ ] 레시피 수동 생성 (UI 완성 필요)
4. [ ] 레시피 URL 추출 (GPT 연동 필요)
5. [x] 레시피 검색 (API 완료)
6. [x] 레시피 카테고리 분류 (API 완료)
7. [ ] 주간 식사 계획 생성 (UI 완성 필요)
8. [ ] 식사 계획 수정 (UI 완성 필요)
9. [x] 장보기 목록 자동 생성 (API 완료)
10. [ ] 장보기 항목 체크 (UI 완성 필요)
11. [x] 사용자 프로필 설정 (완료)
12. [x] 인분 수 조절 (API 완료)

## External Recipe Sources

### 식품안전나라 (한국 공공 API) - 권장
- **제공**: 식품의약품안전처 COOKRCP01 API
- **데이터**: 한국 레시피, 영양 정보 (칼로리, 단백질, 탄수화물, 지방, 나트륨)
- **API 키 발급**: https://www.foodsafetykorea.go.kr/apiMain.do
  1. 식품안전나라 회원가입
  2. 데이터활용서비스 > 인증키 신청
  3. `.env`에 `FOODSAFETYKOREA_API_KEY` 설정

### Spoonacular (영문)
- **데이터**: 종합 레시피, 영양 정보
- **API 키 발급**: https://spoonacular.com/food-api
- `.env`에 `SPOONACULAR_API_KEY` 설정

### TheMealDB (영문, 무료)
- **데이터**: 기본 레시피, API 키 불필요
- 자동 활성화됨

### 농림수산식품교육문화정보원 (한국 공공 API)
- **제공**: 농식품정보원 레시피 API (3종 조합)
- **데이터**: 구조화된 재료/조리과정, 23개 카테고리
- **API 키 발급**: https://data.mafra.go.kr (회원가입 시 자동 발급)
- `.env`에 `MAFRA_API_KEY` 설정

## Next Steps

1. [ ] PostgreSQL, Redis 설치 및 환경 변수 설정
2. [ ] Alembic 마이그레이션 실행
3. [ ] 레시피 생성/수정 폼 UI 구현
4. [ ] 식사 계획 드래그앤드롭 UI 구현
5. [ ] 장보기 목록 체크 UI 구현
6. [ ] URL 레시피 추출 (OpenAI 연동)
7. [ ] OAuth 로그인 (Google, Apple)

## Documentation

```
docs/
├── spec/                                    # 스펙 문서
│   ├── SPEC_OVERVIEW.md                     # 스펙 개요 및 목차
│   ├── FUNCTIONAL_REQUIREMENTS.md           # 기능 요구사항 (MVP)
│   ├── NON_FUNCTIONAL_REQUIREMENTS.md       # 비기능 요구사항
│   ├── API_CONTRACT.md                      # REST API 계약
│   ├── ACCEPTANCE_CRITERIA.md               # BDD 수용 기준
│   └── EXPERT_REVIEW.md                     # 전문가 패널 리뷰
└── research_meal_planning_app_deep_dive_20260128.md  # 시장 리서치
```
