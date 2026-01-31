# Deployment Guide - Free Tier

이 가이드는 무료 티어를 활용하여 Meal Planning App을 배포하는 단계별 설명서입니다.

## 배포 스택 개요

| 서비스 | 플랫폼 | 플랜 | 리전 | 용도 |
|--------|--------|------|------|------|
| Frontend | Vercel | Hobby (Free) | Seoul (icn1) | Next.js 15 앱 |
| Backend | Render | Free | Oregon | FastAPI 서버 |
| Database | Supabase | Free | Seoul | PostgreSQL 16 |
| Cache | Upstash | Free | Global | Redis 7 |

## 사전 준비

필요한 계정:
- [x] GitHub 계정
- [ ] Vercel 계정 (GitHub 연동)
- [ ] Render 계정 (GitHub 연동)
- [ ] Supabase 계정
- [ ] Upstash 계정

## 1단계: Supabase PostgreSQL 설정

### 1.1 프로젝트 생성

1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인
2. "New Project" 클릭
3. 프로젝트 설정:
   - **Organization**: 기존 조직 선택 또는 새로 생성
   - **Name**: `meal-planning-db`
   - **Database Password**: 강력한 비밀번호 생성 (저장 필수!)
   - **Region**: `Northeast Asia (Seoul)` 선택
   - **Pricing Plan**: Free

4. 프로젝트 생성 완료 대기 (1-2분 소요)

### 1.2 데이터베이스 연결 정보 확인

1. 좌측 메뉴에서 `Settings` > `Database` 선택
2. **Connection string** 섹션에서 `URI` 복사:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
3. `[YOUR-PASSWORD]`를 실제 비밀번호로 교체
4. 이 정보를 안전하게 저장

### 1.3 데이터베이스 마이그레이션 실행

로컬 환경에서:

```bash
# 환경 변수 설정
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# 마이그레이션 실행
cd apps/api
alembic upgrade head
```

## 2단계: Upstash Redis 설정

### 2.1 데이터베이스 생성

1. [Upstash Console](https://console.upstash.com/redis)에 로그인
2. "Create Database" 클릭
3. 데이터베이스 설정:
   - **Name**: `meal-planning-cache`
   - **Type**: Regional
   - **Region**: `ap-northeast-2` (Seoul) 또는 가장 가까운 리전
   - **TLS**: Enabled

4. "Create" 클릭

### 2.2 연결 정보 확인

1. 생성된 데이터베이스 클릭
2. **REST API** 탭에서 연결 정보 확인:
   ```
   REDIS_URL: rediss://default:[PASSWORD]@[ENDPOINT].upstash.io:6379
   ```
3. 이 정보를 안전하게 저장

## 3단계: Render Backend 배포

### 3.1 GitHub 저장소 준비

1. 코드를 GitHub에 푸시:
   ```bash
   git add .
   git commit -m "Add deployment configuration"
   git push origin main
   ```

### 3.2 Render 서비스 생성

1. [Render Dashboard](https://dashboard.render.com/)에 로그인
2. "New +" > "Web Service" 클릭
3. GitHub 저장소 연결:
   - "Connect a repository" 선택
   - `meal-planning-app` 저장소 선택
   - "Connect" 클릭

4. 서비스 설정:
   - **Name**: `meal-planning-api`
   - **Region**: `Oregon (US West)`
   - **Branch**: `main`
   - **Root Directory**: `apps/api`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn src.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free`

### 3.3 환경 변수 설정

"Environment" 섹션에서 다음 환경 변수 추가:

| Key | Value | 설명 |
|-----|-------|------|
| `DATABASE_URL` | `postgresql://postgres:...` | Supabase 연결 문자열 |
| `REDIS_URL` | `rediss://default:...` | Upstash Redis URL |
| `JWT_SECRET_KEY` | (자동 생성) | Auto-generate 클릭 |
| `APP_ENV` | `production` | 환경 설정 |
| `DEBUG` | `false` | 디버그 모드 비활성화 |
| `CORS_ORIGINS` | `https://your-app.vercel.app` | 나중에 업데이트 |

선택 사항 (API 키 보유 시):
- `OPENAI_API_KEY`
- `FOODSAFETYKOREA_API_KEY`
- `MAFRA_API_KEY`

### 3.4 배포 시작

1. "Create Web Service" 클릭
2. 배포 로그 확인 (5-10분 소요)
3. 배포 완료 후 URL 확인: `https://meal-planning-api.onrender.com`

### 3.5 Health Check 확인

브라우저 또는 curl로 확인:

```bash
curl https://meal-planning-api.onrender.com/health
# 응답: {"status":"healthy"}
```

## 4단계: Vercel Frontend 배포

### 4.1 Vercel 프로젝트 생성

1. [Vercel Dashboard](https://vercel.com/dashboard)에 로그인
2. "Add New..." > "Project" 클릭
3. GitHub 저장소 연결:
   - `meal-planning-app` 저장소 선택
   - "Import" 클릭

### 4.2 프로젝트 설정

1. 빌드 설정:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `apps/web`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `.next` (자동 감지)
   - **Install Command**: `pnpm install`

2. 환경 변수 설정:
   - `NEXT_PUBLIC_API_URL`: `https://meal-planning-api.onrender.com`

### 4.3 배포 시작

1. "Deploy" 클릭
2. 배포 완료 대기 (3-5분 소요)
3. 배포된 URL 확인: `https://meal-planning-app-xxx.vercel.app`

### 4.4 리전 설정 (옵션)

서울 리전으로 최적화하려면:

1. 프로젝트 Settings > Functions 이동
2. **Function Region**: `Seoul (icn1)` 선택
3. 재배포

## 5단계: CORS 설정 업데이트

### 5.1 Render 환경 변수 업데이트

1. Render Dashboard > `meal-planning-api` > Environment
2. `CORS_ORIGINS` 값을 Vercel URL로 업데이트:
   ```
   https://meal-planning-app-xxx.vercel.app
   ```
3. "Save Changes" 클릭
4. 서비스 자동 재배포 대기

## 6단계: 도메인 설정 (옵션)

### 6.1 Vercel 커스텀 도메인

1. Vercel 프로젝트 Settings > Domains
2. 도메인 추가 (예: `meal-planning.yourdomain.com`)
3. DNS 레코드 설정:
   ```
   Type: CNAME
   Name: meal-planning
   Value: cname.vercel-dns.com
   ```

### 6.2 Render 커스텀 도메인

1. Render 서비스 Settings > Custom Domains
2. 도메인 추가 (예: `api.yourdomain.com`)
3. DNS 레코드 설정:
   ```
   Type: CNAME
   Name: api
   Value: meal-planning-api.onrender.com
   ```

### 6.3 CORS 재설정

커스텀 도메인 사용 시 Render 환경 변수 업데이트:
```
CORS_ORIGINS=https://meal-planning.yourdomain.com
```

## 7단계: 배포 검증

### 7.1 Backend API 테스트

```bash
# Health check
curl https://meal-planning-api.onrender.com/health

# API 문서 확인
open https://meal-planning-api.onrender.com/api/v1/docs

# 회원가입 테스트
curl -X POST https://meal-planning-api.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!",
    "full_name": "Test User"
  }'
```

### 7.2 Frontend 테스트

1. Vercel URL 접속
2. 회원가입 테스트
3. 로그인 테스트
4. 레시피 조회/생성 테스트

## 무료 티어 제한 사항

### Vercel Hobby

- **빌드 시간**: 100시간/월
- **대역폭**: 100GB/월
- **함수 실행 시간**: 10초 (Edge: 30초)
- **환경 변수**: 무제한
- **도메인**: 무제한

### Render Free

- **빌드 시간**: 500분/월
- **메모리**: 512MB
- **CPU**: 0.1 CPU
- **대역폭**: 100GB/월
- **유휴 시 자동 정지**: 15분 비활성 후 슬립 (첫 요청 시 재시작 30초 소요)

### Supabase Free

- **데이터베이스 크기**: 500MB
- **대역폭**: 5GB/월
- **API 요청**: 50,000회/월
- **동시 연결**: 500개
- **일주일 비활성 시 일시 중지**

### Upstash Redis Free

- **최대 명령어**: 10,000회/일
- **최대 크기**: 256MB
- **최대 데이터 크기**: 1MB/항목
- **동시 연결**: 1,000개

## 모니터링

### Render 로그 확인

```bash
# Render Dashboard에서 "Logs" 탭 확인
# 또는 CLI 사용:
render logs meal-planning-api -f
```

### Vercel 로그 확인

```bash
# Vercel CLI 설치
npm i -g vercel

# 로그 확인
vercel logs
```

### Supabase 로그 확인

1. Supabase Dashboard > Logs
2. Postgres Logs, API Logs 확인

## 트러블슈팅

### Render 서비스가 슬립 모드에서 깨어나지 않음

**증상**: 첫 요청 시 504 Gateway Timeout

**해결책**:
1. Health check 엔드포인트 활성화 확인
2. 외부 cron job 서비스로 5분마다 핑 (UptimeRobot 무료)

### CORS 에러

**증상**: `Access-Control-Allow-Origin` 에러

**해결책**:
1. Render 환경 변수 `CORS_ORIGINS` 확인
2. Vercel URL과 정확히 일치하는지 확인 (후행 슬래시 제외)
3. 서비스 재배포

### 데이터베이스 연결 실패

**증상**: `connection to server ... failed`

**해결책**:
1. DATABASE_URL 형식 확인
2. Supabase 프로젝트가 활성 상태인지 확인
3. Render의 IP가 Supabase에서 허용되는지 확인 (기본적으로 허용됨)

### Vercel 빌드 실패

**증상**: `Build exceeded maximum duration`

**해결책**:
1. 불필요한 devDependencies 제거
2. `.vercelignore` 파일로 불필요한 파일 제외:
   ```
   .git
   node_modules
   .next
   .env*
   ```

## 업그레이드 경로

무료 티어에서 유료 티어로 전환 시 고려 사항:

### Vercel Pro ($20/월)

- 빌드 시간 6,000시간/월
- 대역폭 1TB/월
- 함수 실행 시간 300초
- 팀 협업 기능

### Render Starter ($7/월)

- 24/7 가동 (슬립 모드 없음)
- 512MB 메모리 유지
- 더 빠른 빌드

### Supabase Pro ($25/월)

- 8GB 데이터베이스
- 50GB 대역폭
- 일일 백업
- 7일 로그 보존

### Upstash Pay-as-you-go

- $0.2/100K 명령어
- 무제한 크기

## 다음 단계

- [ ] CI/CD 파이프라인 설정 (GitHub Actions)
- [ ] 모니터링 설정 (Sentry, LogRocket)
- [ ] 성능 모니터링 (Vercel Analytics)
- [ ] 백업 전략 수립
- [ ] 로드 테스트 실시
