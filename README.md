# Meal Planning App

> AI 기반 가족 식사 계획 앱. 레시피 관리, 주간 식사 계획, 장보기 목록 자동 생성 기능을 제공합니다.

![Status](https://img.shields.io/badge/status-development-yellow) ![License](https://img.shields.io/badge/license-MIT-blue)

## 🎯 프로젝트 소개

**Meal Planning App**은 바쁜 가족들을 위해 설계된 AI 기반 식사 계획 솔루션입니다. 한국 공공 레시피 API와 글로벌 레시피 소스를 통해 다양한 요리를 제안하고, 자동으로 주간 식사 계획을 생성하며, 한 번의 클릭으로 장보기 목록을 만들어줍니다.

**핵심 가치:**
- 시간 절약: 한 주 식사 계획을 5분 안에 완료
- 영양 균형: 영양 정보 기반 스마트 추천
- 비용 절감: 효율적인 장보기 목록 관리
- 한국 중심: 한국 식재료와 요리법 우선

## ✨ 주요 기능

### 1. 레시피 관리
- **검색 및 필터링**: 재료, 카테고리, 조리시간, 영양정보로 검색
- **레시피 수동 생성**: 직접 레시피 입력 및 저장
- **URL 추출**: 웹사이트 링크에서 자동으로 레시피 추출 (GPT 기반)
- **개인화 저장**: 자주 사용하는 레시피 저장

### 2. 주간 식사 계획
- **자동 생성**: AI가 가족 선호도 기반 주간 계획 제안
- **드래그앤드롭**: 직관적 UI로 원하는 요리로 교체
- **인분 자동 조절**: 가족 인원에 맞춰 재료량 자동 계산
- **영양 대시보드**: 주간 영양 균형 한눈에 확인

### 3. 장보기 목록
- **자동 생성**: 주간 식사 계획에서 자동으로 쇼핑 리스트 생성
- **중복 제거**: 여러 요리에 필요한 재료 자동 통합
- **체크 시스템**: 장보면서 구매한 물품 체크
- **카테고리 분류**: 마트 섹션별로 자동 정렬

### 4. 다양한 레시피 소스
- **식품안전나라**: 한국 공공 API (칼로리, 영양정보 포함)
- **농림축산식품부**: 공식 한국 레시피 (23개 카테고리)
- **Spoonacular**: 영문 레시피 (선택사항)
- **TheMealDB**: 무료 글로벌 레시피 (자동 활성화)

## 🛠 기술 스택

### Frontend
```
Next.js 15 (App Router)    - 최신 React 풀스택 프레임워크
shadcn/ui                  - 고품질 UI 컴포넌트 라이브러리
TanStack Query v5          - 서버 상태 관리
Tailwind CSS               - 유틸리티 기반 스타일링
TypeScript                 - 타입 안정성
```

### Backend
```
Python FastAPI             - 고성능 비동기 API 프레임워크
SQLAlchemy                 - ORM (객체-관계 매핑)
Alembic                    - 데이터베이스 마이그레이션
Pydantic                   - 데이터 검증
JWT + OAuth 2.0            - 인증
```

### 데이터 저장소
```
PostgreSQL 16              - 주요 관계형 데이터베이스
Redis 7                    - 캐싱 및 세션 관리
```

### AI 및 외부 통합
```
OpenAI GPT-5 Mini          - URL 레시피 추출 (예정)
식품안전나라 API            - 한국 공공 레시피
농식품정보원 API            - 한국 농림 레시피
Spoonacular API            - 영문 레시피 (선택)
TheMealDB API              - 무료 글로벌 레시피
```

## 🚀 시작하기

### 사전 요구사항

다음 소프트웨어가 설치되어 있어야 합니다:

- **Node.js** 20.x 이상
- **Python** 3.11 이상
- **PostgreSQL** 16
- **Redis** 7
- **pnpm** 9.x 이상

#### macOS 설치 (Homebrew)
```bash
brew install node python postgresql redis
npm install -g pnpm
```

#### Ubuntu/Debian 설치
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql postgresql-contrib redis-server python3.11
npm install -g pnpm
```

### 설치 방법

1. **저장소 클론**
```bash
git clone <repository-url>
cd meal-planning-app
```

2. **의존성 설치**
```bash
pnpm install
```

3. **PostgreSQL 설정**
```bash
# PostgreSQL 시작 (macOS)
brew services start postgresql

# 또는 (Linux)
sudo systemctl start postgresql

# 데이터베이스 및 사용자 생성
createdb meal_planning_app
createuser meal_planning_user -P
```

4. **Redis 설정**
```bash
# Redis 시작 (macOS)
brew services start redis

# 또는 (Linux)
sudo systemctl start redis-server
```

5. **환경 변수 설정**
```bash
# .env.example 파일을 참고하여 .env 파일 생성
cp .env.example .env
```

`.env` 파일 구성:
```env
# Database
DATABASE_URL=postgresql://meal_planning_user:password@localhost:5432/meal_planning_app

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secret (openssl rand -hex 32 로 생성)
JWT_SECRET_KEY=your_secret_key_here

# External APIs
FOODSAFETYKOREA_API_KEY=your_api_key_here
MAFRA_API_KEY=your_api_key_here
SPOONACULAR_API_KEY=your_api_key_here  # 선택사항
OPENAI_API_KEY=your_api_key_here       # GPT URL 추출 (예정)

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=Meal Planning App
```

6. **데이터베이스 마이그레이션**
```bash
cd apps/api
alembic upgrade head
cd ../..
```

### 개발 서버 실행

#### 전체 앱 실행 (Frontend + Backend)
```bash
pnpm dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API 문서: http://localhost:8000/docs (Swagger UI)

#### 개별 서버 실행

**Frontend만 실행:**
```bash
pnpm --filter web dev
```

**Backend만 실행:**
```bash
pnpm --filter api dev
```

### 빌드 및 배포

```bash
# 전체 프로젝트 빌드
pnpm build

# Frontend 빌드
pnpm --filter web build

# Backend 빌드 (프로덕션 준비)
cd apps/api && uvicorn src.main:app --reload
```

자세한 배포 가이드는 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)를 참조하세요.

## 📁 프로젝트 구조

```
meal-planning-app/
├── apps/
│   ├── web/                        # Next.js 15 Frontend
│   │   ├── app/
│   │   │   ├── (auth)/             # 로그인/회원가입 페이지
│   │   │   ├── (dashboard)/        # 보호된 페이지
│   │   │   │   ├── recipes/        # 레시피 관리
│   │   │   │   ├── meal-plans/     # 주간 식사 계획
│   │   │   │   └── shopping/       # 장보기 목록
│   │   │   └── layout.tsx          # 루트 레이아웃
│   │   ├── components/             # 재사용 가능 UI 컴포넌트
│   │   │   ├── recipe/             # 레시피 관련 컴포넌트
│   │   │   ├── meal-plan/          # 식사 계획 컴포넌트
│   │   │   └── shared/             # 공유 컴포넌트
│   │   ├── hooks/                  # 커스텀 React 훅
│   │   ├── lib/
│   │   │   ├── api.ts              # API 클라이언트
│   │   │   ├── auth.ts             # 인증 로직
│   │   │   └── utils.ts            # 유틸 함수
│   │   └── styles/                 # 글로벌 스타일
│   │
│   └── api/                        # FastAPI Backend
│       ├── src/
│       │   ├── main.py             # 애플리케이션 진입점
│       │   ├── api/v1/             # API 라우트
│       │   │   ├── recipes.py      # 레시피 엔드포인트
│       │   │   ├── meal_plans.py   # 식사 계획 엔드포인트
│       │   │   ├── shopping.py     # 장보기 엔드포인트
│       │   │   └── auth.py         # 인증 엔드포인트
│       │   ├── services/           # 비즈니스 로직
│       │   │   ├── recipe_service.py
│       │   │   ├── meal_plan_service.py
│       │   │   └── shopping_service.py
│       │   ├── repositories/       # 데이터 접근 계층
│       │   ├── models/             # SQLAlchemy 모델
│       │   ├── schemas/            # Pydantic 스키마
│       │   ├── core/
│       │   │   ├── config.py       # 환경 설정
│       │   │   ├── security.py     # 보안 로직
│       │   │   └── database.py     # DB 연결
│       │   └── integrations/       # 외부 API 통합
│       │       ├── foodsafetykorea.py
│       │       ├── spoonacular.py
│       │       └── themealdb.py
│       ├── alembic/                # DB 마이그레이션
│       ├── tests/                  # 테스트
│       └── requirements.txt        # Python 의존성
│
├── packages/
│   ├── shared-types/               # 공유 TypeScript 타입
│   │   └── index.ts
│   └── constants/                  # 공유 상수
│       └── index.ts
│
├── docs/
│   ├── spec/                       # 스펙 문서
│   │   ├── SPEC_OVERVIEW.md        # 스펙 개요
│   │   ├── FUNCTIONAL_REQUIREMENTS.md
│   │   ├── NON_FUNCTIONAL_REQUIREMENTS.md
│   │   ├── API_CONTRACT.md         # REST API 계약
│   │   ├── ACCEPTANCE_CRITERIA.md
│   │   └── EXPERT_REVIEW.md
│   ├── DEPLOYMENT.md               # 배포 가이드
│   ├── ARCHITECTURE.md             # 아키텍처 문서
│   └── research_*.md               # 리서치 자료
│
├── .env.example                    # 환경 변수 템플릿
├── CLAUDE.md                       # Claude Code 프로젝트 가이드
├── turbo.json                      # Turborepo 설정
├── pnpm-workspace.yaml             # pnpm 워크스페이스
└── README.md                       # 이 파일
```

## 📚 API 문서

### Authentication

```bash
# 회원가입
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password",
  "name": "John Doe"
}

# 로그인
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}

# 응답
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}

# 토큰 갱신
POST /api/v1/auth/refresh
Authorization: Bearer {refresh_token}
```

### Recipes (레시피)

```bash
# 레시피 목록 조회
GET /api/v1/recipes?skip=0&limit=20&category=한식

# 레시피 검색
GET /api/v1/recipes/search?q=김밥&sort=popularity

# 레시피 상세 조회
GET /api/v1/recipes/{recipe_id}

# 레시피 생성
POST /api/v1/recipes
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "쉬운 계란말이",
  "description": "아이들도 좋아하는 계란말이",
  "category": "반찬",
  "prep_time": 5,
  "cook_time": 10,
  "servings": 2,
  "ingredients": [
    {"name": "계란", "amount": 3, "unit": "개"}
  ],
  "instructions": [
    "계란을 잘 풀어준다",
    "팬에 기름을 두르고 계란을 붓는다"
  ]
}

# 레시피 수정
PATCH /api/v1/recipes/{recipe_id}
Authorization: Bearer {token}

# 레시피 삭제
DELETE /api/v1/recipes/{recipe_id}
Authorization: Bearer {token}

# 인분 조절 (재료량 자동 계산)
POST /api/v1/recipes/{recipe_id}/adjust-servings
Content-Type: application/json

{
  "servings": 4
}
```

### Meal Plans (주간 식사 계획)

```bash
# 주간 식사 계획 조회
GET /api/v1/meal-plans/week/2025-02-03

# 식사 계획 생성
POST /api/v1/meal-plans
Authorization: Bearer {token}
Content-Type: application/json

{
  "start_date": "2025-02-03",
  "family_size": 4,
  "preferences": ["한식", "저염식"]
}

# 응답: AI가 생성한 주간 계획
{
  "id": "uuid",
  "start_date": "2025-02-03",
  "slots": [
    {
      "date": "2025-02-03",
      "meal_type": "breakfast",
      "recipe_id": "uuid"
    }
  ]
}

# 식사 슬롯 수정 (특정 날짜의 음식 변경)
PATCH /api/v1/meal-plans/{plan_id}/slots/{slot_id}
Authorization: Bearer {token}

{
  "recipe_id": "new_recipe_id"
}
```

### Shopping Lists (장보기 목록)

```bash
# 주간 식사 계획에서 자동 생성
POST /api/v1/shopping-lists/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "meal_plan_id": "uuid"
}

# 응답: 자동으로 통합된 쇼핑 리스트
{
  "id": "uuid",
  "items": [
    {
      "id": "item_id",
      "name": "계란",
      "quantity": 12,
      "unit": "개",
      "category": "계란/유제품",
      "checked": false
    }
  ]
}

# 쇼핑 아이템 체크
POST /api/v1/shopping-lists/{list_id}/items/{item_id}/check
Authorization: Bearer {token}
```

### 상세 API 문서

개발 서버 실행 후 다음에서 대화형 API 문서를 확인하세요:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔐 환경 변수 설정 가이드

### 필수 변수

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | `postgresql://user:password@localhost:5432/db` |
| `REDIS_URL` | Redis 연결 문자열 | `redis://localhost:6379` |
| `JWT_SECRET_KEY` | JWT 서명 비밀키 | `openssl rand -hex 32` |

### 한국 공공 API

#### 식품안전나라 (권장)
```bash
# 1. https://www.foodsafetykorea.go.kr 접속
# 2. 회원가입
# 3. 데이터활용서비스 > 인증키 신청
# 4. .env에 추가

FOODSAFETYKOREA_API_KEY=your_api_key
```

#### 농식품정보원
```bash
# 1. https://data.mafra.go.kr 접속
# 2. 회원가입 (자동으로 API 키 발급됨)
# 3. .env에 추가

MAFRA_API_KEY=your_api_key
```

### 선택 사항

```bash
# Spoonacular (영문 레시피, 유료)
SPOONACULAR_API_KEY=your_api_key

# OpenAI (URL 레시피 추출, 예정)
OPENAI_API_KEY=sk-...

# OAuth (Google, Apple 로그인)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
APPLE_CLIENT_ID=your_apple_id
APPLE_CLIENT_SECRET=your_apple_secret
```

## 📊 데이터베이스 스키마

### 테이블 구조

```sql
-- 사용자
users:
  - id (UUID)
  - email (유니크)
  - password_hash
  - name
  - created_at
  - updated_at

-- 레시피
recipes:
  - id (UUID)
  - user_id (FK)
  - title
  - description
  - category
  - prep_time (분)
  - cook_time (분)
  - servings
  - source (manual, foodsafetykorea, spoonacular, themealdb)
  - source_id
  - created_at
  - updated_at

-- 재료
ingredients:
  - id (UUID)
  - recipe_id (FK)
  - name
  - amount
  - unit (g, ml, 개, 스푼 등)

-- 조리 단계
instructions:
  - id (UUID)
  - recipe_id (FK)
  - step_number
  - description

-- 주간 식사 계획
meal_plans:
  - id (UUID)
  - user_id (FK)
  - start_date
  - end_date
  - created_at

-- 식사 슬롯 (각 날짜의 아침/점심/저녁)
meal_slots:
  - id (UUID)
  - meal_plan_id (FK)
  - recipe_id (FK)
  - date
  - meal_type (breakfast, lunch, dinner, snack)

-- 장보기 목록
shopping_lists:
  - id (UUID)
  - user_id (FK)
  - meal_plan_id (FK, nullable)
  - created_at

-- 장보기 항목
shopping_items:
  - id (UUID)
  - shopping_list_id (FK)
  - name
  - quantity
  - unit
  - category
  - checked (boolean)
```

## 🧪 테스트

```bash
# Backend 테스트 (pytest)
cd apps/api
pytest tests/

# Frontend 테스트 (Vitest)
cd apps/web
pnpm test

# E2E 테스트 (Playwright)
pnpm test:e2e
```

## 📝 개발 가이드

### 코드 스타일

이 프로젝트는 다음 도구를 사용합니다:

- **ESLint**: JavaScript/TypeScript 린팅
- **Prettier**: 코드 포매팅
- **Black**: Python 코드 포매팅

```bash
# 전체 프로젝트 린트
pnpm lint

# 자동 포매팅
pnpm format
```

### 커밋 컨벤션

```bash
feat: 새로운 기능
fix: 버그 수정
docs: 문서 수정
style: 코드 스타일 변경 (포매팅, 변수명 등)
refactor: 코드 리팩토링
test: 테스트 추가 또는 수정
chore: 빌드, 의존성 등 관리
```

예시:
```bash
git commit -m "feat: 레시피 검색 필터 추가"
git commit -m "fix: 주간 계획 렌더링 버그 수정"
```

## 🚨 트러블슈팅

### PostgreSQL 연결 오류
```bash
# PostgreSQL 실행 확인
psql -l

# 데이터베이스 생성
createdb meal_planning_app

# 포트 확인 (기본: 5432)
lsof -i :5432
```

### Redis 연결 오류
```bash
# Redis 실행 확인
redis-cli ping
# 응답: PONG

# 포트 확인 (기본: 6379)
lsof -i :6379
```

### pnpm 의존성 문제
```bash
# 캐시 초기화
pnpm store prune

# 재설치
rm pnpm-lock.yaml
pnpm install
```

### API 키 오류
```
401 Unauthorized: 외부 API 키 확인
403 Forbidden: API 권한 확인
429 Too Many Requests: API 호출 제한 초과 (대기)
```

자세한 이슈 해결은 [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)를 참고하세요.

## 📖 추가 문서

| 문서 | 설명 |
|------|------|
| [CLAUDE.md](CLAUDE.md) | Claude Code 프로젝트 가이드 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 아키텍처 설계 (준비 중) |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | 배포 가이드 (준비 중) |
| [docs/spec/API_CONTRACT.md](docs/spec/API_CONTRACT.md) | REST API 명세 |
| [docs/spec/FUNCTIONAL_REQUIREMENTS.md](docs/spec/FUNCTIONAL_REQUIREMENTS.md) | 기능 요구사항 |

## 🤝 기여하기

이 프로젝트에 기여하고 싶으신가요?

1. Fork the repository
2. Feature branch 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'feat: Add amazing feature'`)
4. Branch에 Push (`git push origin feature/amazing-feature`)
5. Pull Request 오픈

## 📋 프로젝트 상태

### Phase 1-A (진행 중)
- [x] 프로젝트 scaffolding
- [x] 데이터베이스 스키마 설계
- [x] 기본 API 엔드포인트 구현
- [x] 사용자 인증 (JWT)
- [x] 레시피 CRUD 및 검색
- [x] 주간 식사 계획 생성 (API)
- [x] 장보기 목록 자동 생성 (API)
- [ ] Frontend UI 완성
- [ ] URL 레시피 추출 (GPT)
- [ ] OAuth 로그인

### Phase 2 (예정)
- AI 기반 영양 분석
- 모바일 앱 (React Native)
- 다국어 지원
- 커뮤니티 레시피 공유

## 📞 지원

문제가 발생하거나 질문이 있으신가요?

- **GitHub Issues**: [Issue 보고하기](https://github.com/your-repo/issues)
- **이메일**: support@mealplanningapp.com
- **문서**: 이 README와 `/docs` 디렉토리의 문서들

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

**마지막 업데이트**: 2025년 1월 31일
**프로젝트 상태**: 개발 중 (Phase 1-A)
**메인테이너**: [Your Name]
