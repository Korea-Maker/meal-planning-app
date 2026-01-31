# Meal Planning App - Specification Overview

> 작성일: 2026-01-28
> 버전: 1.1.0
> 상태: Draft

---

## 1. 문서 목적

이 스펙 문서는 **AI 기반 가족 식사 계획 앱**의 기능 및 비기능 요구사항을 정의합니다.

### 1.1 범위

| 구분 | 포함 | 제외 |
|------|------|------|
| MVP (Phase 1) | 상세 요구사항, BDD 수용 기준 | - |
| Growth (Phase 2) | 기능 개요만 | 상세 요구사항 |
| Premium (Phase 3) | 기능 개요만 | 상세 요구사항 |

### 1.2 문서 원칙

- **What only**: 구현 방법(How)은 명시하지 않음
- **Testable**: 모든 요구사항은 테스트 가능해야 함
- **Measurable**: 정량적 기준 포함

---

## 2. 제품 개요

### 2.1 핵심 가치 제안

```
"가족 모두의 입맛과 건강을 고려한
 AI 식사 계획으로 매주 3시간을 절약하세요"
```

### 2.2 타겟 사용자

| 세그먼트 | 특성 | 핵심 니즈 |
|----------|------|----------|
| 바쁜 직장인 | 30-45세, 시간 부족 | 빠른 레시피, 자동 장보기 |
| 가족 (자녀 있음) | 맞벌이 부부, 자녀 1-2명 | 가족 공유, 알러지 관리 |
| 건강 관리자 | 건강 의식 높음 | 영양 추적, 칼로리 계산 |

### 2.3 Primary Actor 역할 정의

> Growth Phase의 가족 공유 기능을 위한 액터 역할 사전 정의

| 액터 | 역할 | 권한 | MVP 적용 |
|------|------|------|----------|
| Owner | 계정 소유자 / 가족 그룹 생성자 | 모든 CRUD, 멤버 관리, 결제 | ✅ (단일 사용자) |
| Member | 가족 구성원 (초대 받은 사용자) | 읽기, 본인 프로필 수정, 레시피/계획 생성 | 🔜 (Phase 2) |
| Child | 미성년 자녀 (보호자 관리) | 읽기 전용, 제한된 기능 | 🔜 (Phase 2) |
| Guest | 공유 링크 접근자 | 읽기 전용 (특정 레시피/계획만) | 🔜 (Phase 3) |

**MVP (Phase 1) 적용:**
- 단일 Owner 모델로 시작
- 모든 리소스는 Owner에게 귀속
- 인증/인가는 본인 리소스만 접근 가능

**Growth Phase 확장 시:**
- 가족 그룹 개념 도입
- 역할 기반 접근 제어 (RBAC)
- 동시 편집 충돌 해결 전략 필요

### 2.4 차별화 포인트

1. **가족 구성원별 프로필** - 알러지, 선호도 자동 필터링
2. **소셜 미디어 레시피 추출** - TikTok/Instagram 원클릭 저장
3. **배달 서비스 연동** - 쿠팡/마켓컬리 원클릭 주문 (한국)

---

## 3. 기능 로드맵

### Phase 1: MVP (8-12주)

| ID | 기능 | 우선순위 |
|----|------|----------|
| FR-001 | 레시피 수동 생성 | P0 |
| FR-002 | 레시피 URL 추출 | P0 |
| FR-003 | 레시피 검색 | P0 |
| FR-004 | 레시피 카테고리 분류 | P1 |
| FR-005 | 주간 식사 계획 생성 | P0 |
| FR-006 | 식사 계획 수정 | P0 |
| FR-007 | 장보기 목록 자동 생성 | P0 |
| FR-008 | 장보기 항목 체크 | P1 |
| FR-009 | 사용자 프로필 설정 | P1 |
| FR-010 | 인분 수 조절 | P1 |

### Phase 2: Growth (12-16주) - 개요

- AI 레시피 추천 (냉장고 재료 기반)
- 소셜 미디어 레시피 추출 (TikTok, Instagram, YouTube)
- 가족 공유 (멀티 프로필)
- 영양 분석 (칼로리, 매크로)

### Phase 3: Premium (16-24주) - 개요

- 식료품 배달 연동 (쿠팡, 마켓컬리, Instacart)
- Pantry 관리 (재고 추적, 유통기한 알림)
- 고급 AI 기능 (무제한 레시피 생성, 개인 영양사 챗봇)
- 오프라인 모드

---

## 4. 문서 구조

| 문서 | 내용 |
|------|------|
| [FUNCTIONAL_REQUIREMENTS.md](./FUNCTIONAL_REQUIREMENTS.md) | MVP 기능 요구사항 상세 |
| [NON_FUNCTIONAL_REQUIREMENTS.md](./NON_FUNCTIONAL_REQUIREMENTS.md) | 성능, 보안, 확장성 요구사항 |
| [API_CONTRACT.md](./API_CONTRACT.md) | REST API 계약 초안 |
| [ACCEPTANCE_CRITERIA.md](./ACCEPTANCE_CRITERIA.md) | BDD 수용 기준 (Given/When/Then) |
| [EXPERT_REVIEW.md](./EXPERT_REVIEW.md) | 전문가 패널 리뷰 체크리스트 |

---

## 5. 용어 정의

| 용어 | 정의 |
|------|------|
| Recipe | 요리 재료, 조리법, 인분 수를 포함한 레시피 데이터 |
| Meal Plan | 특정 기간(주간)의 식사 배치 계획 |
| Shopping List | Meal Plan에서 자동 생성된 장보기 목록 |
| Servings | 레시피 인분 수 |
| Timeframe | 식사 시간대 (breakfast, lunch, dinner, snack) |
| Profile | 사용자 알러지, 선호도, 기본 설정 |

---

## 6. 참조 문서

- [리서치 보고서](../research_meal_planning_app_deep_dive_20260128.md)
- [시장 분석 데이터](../research_meal_planning_app_deep_dive_20260128.md#part-1-시장-분석)
- [경쟁사 분석](../research_meal_planning_app_deep_dive_20260128.md#part-2-경쟁사-분석)

---

## 7. 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0.0 | 2026-01-28 | - | 초기 문서 작성 |
| 1.1.0 | 2026-01-28 | - | Primary Actor 역할 정의 추가 |
