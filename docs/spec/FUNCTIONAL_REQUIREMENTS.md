# Functional Requirements - MVP (Phase 1)

> 버전: 1.1.0
> 최종 수정: 2026-01-28

---

## 개요

MVP 단계의 10개 핵심 기능에 대한 상세 요구사항입니다.

---

## 요구사항 의존성 매트릭스

### 의존성 다이어그램

```
FR-001 (레시피 수동 생성)
    ↓
    ├── FR-003 (레시피 검색) ← 레시피가 있어야 검색 가능
    │
    ├── FR-004 (카테고리 분류) ← 레시피가 있어야 분류 가능
    │
    └── FR-010 (인분 수 조절) ← 레시피가 있어야 조절 가능
         ↓
FR-005 (식사 계획 생성) ← 레시피가 있어야 식사 배치 가능
    ↓
    ├── FR-006 (식사 계획 수정) ← 계획이 있어야 수정 가능
    │
    └── FR-007 (장보기 목록 생성) ← 계획이 있어야 목록 생성 가능
         ↓
         FR-008 (장보기 항목 체크) ← 목록이 있어야 체크 가능

FR-002 (URL 추출) ── 독립 (단, 저장 시 FR-001과 동일한 레시피 생성)

FR-009 (프로필 설정) ── 독립 (다른 기능에 영향을 주나 의존하지 않음)
```

### 의존성 매트릭스 표

| 기능 ID | 기능명 | 선행 의존성 | 후행 영향 |
|---------|--------|------------|----------|
| FR-001 | 레시피 수동 생성 | 없음 | FR-003, FR-004, FR-005, FR-010 |
| FR-002 | 레시피 URL 추출 | 없음 | FR-003, FR-004, FR-005, FR-010 (저장 시) |
| FR-003 | 레시피 검색 | FR-001 또는 FR-002 | 없음 |
| FR-004 | 레시피 카테고리 분류 | FR-001 또는 FR-002 | FR-003 (검색 필터) |
| FR-005 | 주간 식사 계획 생성 | FR-001 또는 FR-002 | FR-006, FR-007 |
| FR-006 | 식사 계획 수정 | FR-005 | FR-007 (재생성 시) |
| FR-007 | 장보기 목록 자동 생성 | FR-005 | FR-008 |
| FR-008 | 장보기 항목 체크 | FR-007 | 없음 |
| FR-009 | 사용자 프로필 설정 | 없음 | 모든 기능 (필터링 영향) |
| FR-010 | 인분 수 조절 | FR-001 또는 FR-002 | FR-005, FR-007 (인분 반영) |

### 구현 순서 권고

의존성 기반 구현 순서:

```
Phase 1-A (병렬 가능):
├── FR-001 레시피 수동 생성
├── FR-002 레시피 URL 추출
└── FR-009 사용자 프로필 설정

Phase 1-B (FR-001/FR-002 완료 후):
├── FR-003 레시피 검색
├── FR-004 레시피 카테고리 분류
└── FR-010 인분 수 조절

Phase 1-C (Phase 1-B 완료 후):
└── FR-005 주간 식사 계획 생성

Phase 1-D (FR-005 완료 후):
├── FR-006 식사 계획 수정
└── FR-007 장보기 목록 자동 생성

Phase 1-E (FR-007 완료 후):
└── FR-008 장보기 항목 체크
```

---

## FR-001: 레시피 수동 생성

### 설명

사용자가 레시피 정보를 직접 입력하여 새 레시피를 생성한다.

### 입력 (Input)

| 필드 | 타입 | 필수 | 제약조건 |
|------|------|------|----------|
| title | string | O | 1-200자 |
| ingredients | array[Ingredient] | O | 최소 1개 |
| instructions | array[string] | O | 최소 1단계 |
| servings | integer | O | 1-99 |
| prep_time_minutes | integer | X | 0-1440 |
| cook_time_minutes | integer | X | 0-1440 |
| image_url | string | X | 유효한 URL 형식 |
| source_url | string | X | 유효한 URL 형식 |
| notes | string | X | 최대 2000자 |

**Ingredient 타입:**

| 필드 | 타입 | 필수 | 제약조건 |
|------|------|------|----------|
| name | string | O | 1-100자 |
| amount | number | X | 0보다 큼 |
| unit | string | X | 허용된 단위 목록 내 |
| notes | string | X | 최대 200자 |

### 출력 (Output)

| 필드 | 타입 | 설명 |
|------|------|------|
| recipe_id | string | 생성된 레시피 고유 ID |
| created_at | datetime | 생성 시간 (ISO 8601) |

### 성공 조건

- 모든 필수 필드가 제공됨
- 모든 필드가 제약조건을 충족함
- 레시피가 데이터 저장소에 저장됨
- recipe_id가 반환됨

### 실패 시 동작

| 실패 조건 | 응답 코드 | 에러 코드 | 메시지 |
|----------|----------|----------|--------|
| 필수 필드 누락 | 400 | MISSING_REQUIRED_FIELD | "{field_name} is required" |
| 제약조건 불충족 | 422 | VALIDATION_ERROR | 상세 유효성 오류 |
| 인증 실패 | 401 | UNAUTHORIZED | "Authentication required" |

---

## FR-002: 레시피 URL 추출

### 설명

웹 URL에서 레시피 정보를 자동으로 추출하여 저장한다.

### 입력 (Input)

| 필드 | 타입 | 필수 | 제약조건 |
|------|------|------|----------|
| url | string | O | 유효한 HTTP/HTTPS URL |
| save_immediately | boolean | X | 기본값: false |

### 출력 (Output)

| 필드 | 타입 | 설명 |
|------|------|------|
| extracted_recipe | Recipe | 추출된 레시피 데이터 |
| confidence_score | number | 추출 신뢰도 (0-1) |
| requires_review | boolean | 수동 검토 필요 여부 |
| recipe_id | string | save_immediately=true일 때만 |

### 성공 조건

- URL이 접근 가능함
- 레시피 정보 추출 성공 (최소 title, ingredients)
- confidence_score >= 0.7이면 requires_review=false

### 실패 시 동작

| 실패 조건 | 응답 코드 | 에러 코드 | 메시지 |
|----------|----------|----------|--------|
| 잘못된 URL 형식 | 400 | INVALID_URL | "Invalid URL format" |
| URL 접근 불가 | 422 | URL_UNREACHABLE | "Cannot access the URL" |
| 레시피 추출 실패 | 422 | EXTRACTION_FAILED | "Could not extract recipe from URL" |
| 지원하지 않는 사이트 | 422 | UNSUPPORTED_SITE | "This website is not supported" |

---

## FR-003: 레시피 검색

### 설명

저장된 레시피를 키워드 및 필터로 검색한다.

### 입력 (Input)

| 필드 | 타입 | 필수 | 제약조건 |
|------|------|------|----------|
| query | string | X | 최대 200자 |
| categories | array[string] | X | - |
| tags | array[string] | X | - |
| max_prep_time | integer | X | 분 단위, 1-1440 |
| max_cook_time | integer | X | 분 단위, 1-1440 |
| servings_min | integer | X | 1-99 |
| servings_max | integer | X | 1-99 |
| sort_by | string | X | "created_at", "title", "prep_time" |
| sort_order | string | X | "asc", "desc" |
| page | integer | X | 1 이상, 기본값: 1 |
| limit | integer | X | 1-100, 기본값: 20 |

### 출력 (Output)

| 필드 | 타입 | 설명 |
|------|------|------|
| recipes | array[RecipeSummary] | 검색 결과 목록 |
| total | integer | 전체 결과 수 |
| page | integer | 현재 페이지 |
| limit | integer | 페이지 크기 |
| has_next | boolean | 다음 페이지 존재 여부 |

### 성공 조건

- 검색 실행 완료
- 결과가 정렬 기준에 따라 정렬됨
- 페이지네이션 정보가 정확함

### 실패 시 동작

| 실패 조건 | 응답 코드 | 에러 코드 | 메시지 |
|----------|----------|----------|--------|
| 잘못된 정렬 필드 | 400 | INVALID_SORT_FIELD | "Invalid sort field" |
| 페이지 범위 초과 | 400 | INVALID_PAGE | "Page out of range" |

**참고:** 검색 결과가 없는 경우는 에러가 아니며, 빈 배열을 반환한다.

---

## FR-004: 레시피 카테고리 분류

### 설명

레시피에 카테고리와 태그를 할당한다.

### 입력 (Input)

| 필드 | 타입 | 필수 | 제약조건 |
|------|------|------|----------|
| recipe_id | string | O | 존재하는 레시피 ID |
| categories | array[string] | X | 사전 정의된 카테고리 |
| tags | array[string] | X | 최대 20개, 각 50자 이하 |

**사전 정의된 카테고리:**
- breakfast, lunch, dinner, snack
- appetizer, main_course, side_dish, dessert, beverage
- korean, japanese, chinese, western, fusion

### 출력 (Output)

| 필드 | 타입 | 설명 |
|------|------|------|
| recipe_id | string | 레시피 ID |
| categories | array[string] | 업데이트된 카테고리 |
| tags | array[string] | 업데이트된 태그 |
| updated_at | datetime | 수정 시간 |

### 성공 조건

- 레시피가 존재함
- 카테고리가 사전 정의 목록 내에 있음
- 태그 제약조건 충족

### 실패 시 동작

| 실패 조건 | 응답 코드 | 에러 코드 | 메시지 |
|----------|----------|----------|--------|
| 레시피 없음 | 404 | RECIPE_NOT_FOUND | "Recipe not found" |
| 잘못된 카테고리 | 400 | INVALID_CATEGORY | "Invalid category: {name}" |
| 태그 개수 초과 | 422 | TOO_MANY_TAGS | "Maximum 20 tags allowed" |

---

## FR-005: 주간 식사 계획 생성

### 설명

특정 주에 대한 식사 계획을 생성한다.

### 입력 (Input)

| 필드 | 타입 | 필수 | 제약조건 |
|------|------|------|----------|
| week_start_date | date | O | ISO 8601 날짜 (월요일) |
| meals | array[MealSlot] | O | 최소 1개 |

**MealSlot 타입:**

| 필드 | 타입 | 필수 | 제약조건 |
|------|------|------|----------|
| date | date | O | week_start_date ~ +6일 범위 |
| timeframe | string | O | breakfast, lunch, dinner, snack |
| recipe_id | string | O | 존재하는 레시피 ID |
| servings | integer | X | 1-99, 기본값: 레시피 기본 인분 |
| notes | string | X | 최대 500자 |

### 출력 (Output)

| 필드 | 타입 | 설명 |
|------|------|------|
| meal_plan_id | string | 생성된 식사 계획 ID |
| week_start_date | date | 주 시작일 |
| meals | array[MealSlot] | 배치된 식사 목록 |
| created_at | datetime | 생성 시간 |

### 성공 조건

- week_start_date가 월요일임
- 모든 recipe_id가 존재함
- 해당 주에 대한 기존 계획이 없음

### 실패 시 동작

| 실패 조건 | 응답 코드 | 에러 코드 | 메시지 |
|----------|----------|----------|--------|
| 월요일 아님 | 400 | INVALID_WEEK_START | "week_start_date must be Monday" |
| 레시피 없음 | 404 | RECIPE_NOT_FOUND | "Recipe {id} not found" |
| 중복 계획 | 409 | DUPLICATE_PLAN | "Meal plan already exists for this week" |
| 날짜 범위 벗어남 | 400 | DATE_OUT_OF_RANGE | "Date must be within the specified week" |

---

## FR-006: 식사 계획 수정

### 설명

기존 식사 계획의 내용을 수정한다.

### 입력 (Input)

| 필드 | 타입 | 필수 | 제약조건 |
|------|------|------|----------|
| meal_plan_id | string | O | 존재하는 식사 계획 ID |
| add_meals | array[MealSlot] | X | 추가할 식사 |
| remove_meals | array[MealSlotRef] | X | 제거할 식사 참조 |
| update_meals | array[MealSlotUpdate] | X | 수정할 식사 |

**MealSlotRef 타입:**

| 필드 | 타입 | 필수 |
|------|------|------|
| date | date | O |
| timeframe | string | O |

**MealSlotUpdate 타입:**

| 필드 | 타입 | 필수 |
|------|------|------|
| date | date | O |
| timeframe | string | O |
| recipe_id | string | X |
| servings | integer | X |
| notes | string | X |

### 출력 (Output)

| 필드 | 타입 | 설명 |
|------|------|------|
| meal_plan_id | string | 식사 계획 ID |
| meals | array[MealSlot] | 업데이트된 식사 목록 |
| updated_at | datetime | 수정 시간 |

### 성공 조건

- 식사 계획이 존재함
- 수정 대상 식사가 계획 내에 존재함
- 새로운 recipe_id가 존재함

### 실패 시 동작

| 실패 조건 | 응답 코드 | 에러 코드 | 메시지 |
|----------|----------|----------|--------|
| 계획 없음 | 404 | MEAL_PLAN_NOT_FOUND | "Meal plan not found" |
| 식사 슬롯 없음 | 404 | MEAL_SLOT_NOT_FOUND | "Meal slot not found for {date}/{timeframe}" |
| 레시피 없음 | 404 | RECIPE_NOT_FOUND | "Recipe {id} not found" |

---

## FR-007: 장보기 목록 자동 생성

### 설명

식사 계획의 모든 레시피 재료를 합산하여 장보기 목록을 생성한다.

### 입력 (Input)

| 필드 | 타입 | 필수 | 제약조건 |
|------|------|------|----------|
| meal_plan_id | string | O | 존재하는 식사 계획 ID |
| group_by | string | X | "category", "store_section", "none" |
| exclude_pantry | boolean | X | 기본값: false |

### 출력 (Output)

| 필드 | 타입 | 설명 |
|------|------|------|
| shopping_list_id | string | 생성된 장보기 목록 ID |
| meal_plan_id | string | 원본 식사 계획 ID |
| items | array[ShoppingItem] | 장보기 항목 목록 |
| total_items | integer | 총 항목 수 |
| created_at | datetime | 생성 시간 |

**ShoppingItem 타입:**

| 필드 | 타입 | 설명 |
|------|------|------|
| item_id | string | 항목 고유 ID |
| ingredient_name | string | 재료명 |
| total_amount | number | 합산된 수량 |
| unit | string | 단위 |
| category | string | 재료 카테고리 |
| checked | boolean | 체크 여부 (기본: false) |
| source_recipes | array[string] | 원본 레시피 ID 목록 |

### 성공 조건

- 식사 계획이 존재함
- 모든 레시피의 재료가 파싱됨
- 동일 재료가 올바르게 합산됨 (단위 변환 포함)

### 실패 시 동작

| 실패 조건 | 응답 코드 | 에러 코드 | 메시지 |
|----------|----------|----------|--------|
| 계획 없음 | 404 | MEAL_PLAN_NOT_FOUND | "Meal plan not found" |
| 재료 파싱 실패 | 422 | INGREDIENT_PARSE_ERROR | "Failed to parse ingredients for recipe {id}" |
| 빈 계획 | 422 | EMPTY_MEAL_PLAN | "Meal plan has no meals" |

---

## FR-008: 장보기 항목 체크

### 설명

장보기 목록의 개별 항목을 체크하거나 체크 해제한다.

### 입력 (Input)

| 필드 | 타입 | 필수 | 제약조건 |
|------|------|------|----------|
| shopping_list_id | string | O | 존재하는 장보기 목록 ID |
| item_id | string | O | 존재하는 항목 ID |
| checked | boolean | O | - |

### 출력 (Output)

| 필드 | 타입 | 설명 |
|------|------|------|
| item_id | string | 항목 ID |
| checked | boolean | 업데이트된 체크 상태 |
| updated_at | datetime | 수정 시간 |

### 성공 조건

- 장보기 목록이 존재함
- 항목이 목록 내에 존재함
- 체크 상태가 업데이트됨

### 실패 시 동작

| 실패 조건 | 응답 코드 | 에러 코드 | 메시지 |
|----------|----------|----------|--------|
| 목록 없음 | 404 | SHOPPING_LIST_NOT_FOUND | "Shopping list not found" |
| 항목 없음 | 404 | ITEM_NOT_FOUND | "Item not found" |

---

## FR-009: 사용자 프로필 설정

### 설명

사용자의 알러지, 선호도, 기본 설정을 관리한다.

### 입력 (Input)

| 필드 | 타입 | 필수 | 제약조건 |
|------|------|------|----------|
| allergies | array[string] | X | 사전 정의된 알러지 목록 |
| dietary_preferences | array[string] | X | 사전 정의된 식이 선호 목록 |
| disliked_ingredients | array[string] | X | 최대 50개, 각 100자 이하 |
| default_servings | integer | X | 1-20 |
| preferred_cuisine | array[string] | X | 사전 정의된 요리 종류 |

**사전 정의된 알러지:**
- gluten, dairy, eggs, nuts, peanuts, soy, shellfish, fish, sesame, wheat

**사전 정의된 식이 선호:**
- vegetarian, vegan, pescatarian, keto, paleo, low_carb, gluten_free, dairy_free

**사전 정의된 요리 종류:**
- korean, japanese, chinese, thai, vietnamese, indian, italian, french, mexican, american

### 출력 (Output)

| 필드 | 타입 | 설명 |
|------|------|------|
| user_id | string | 사용자 ID |
| allergies | array[string] | 설정된 알러지 |
| dietary_preferences | array[string] | 설정된 식이 선호 |
| disliked_ingredients | array[string] | 설정된 기피 재료 |
| default_servings | integer | 기본 인분 수 |
| preferred_cuisine | array[string] | 선호 요리 종류 |
| updated_at | datetime | 수정 시간 |

### 성공 조건

- 모든 필드가 제약조건을 충족함
- 프로필이 업데이트됨

### 실패 시 동작

| 실패 조건 | 응답 코드 | 에러 코드 | 메시지 |
|----------|----------|----------|--------|
| 잘못된 알러지 | 400 | INVALID_ALLERGY | "Invalid allergy: {name}" |
| 잘못된 식이 선호 | 400 | INVALID_DIETARY_PREFERENCE | "Invalid dietary preference: {name}" |
| 기피 재료 초과 | 422 | TOO_MANY_DISLIKED | "Maximum 50 disliked ingredients allowed" |
| 인분 범위 초과 | 422 | INVALID_SERVINGS | "Servings must be between 1 and 20" |

---

## FR-010: 인분 수 조절

### 설명

레시피의 재료 양을 새로운 인분 수에 맞게 조절한다.

### 입력 (Input)

| 필드 | 타입 | 필수 | 제약조건 |
|------|------|------|----------|
| recipe_id | string | O | 존재하는 레시피 ID |
| new_servings | integer | O | 1-99 |

### 출력 (Output)

| 필드 | 타입 | 설명 |
|------|------|------|
| recipe_id | string | 레시피 ID |
| original_servings | integer | 원본 인분 수 |
| new_servings | integer | 조절된 인분 수 |
| scaled_ingredients | array[Ingredient] | 조절된 재료 목록 |

### 성공 조건

- 레시피가 존재함
- 모든 재료의 수량이 비례 계산됨
- 소수점 이하는 적절히 반올림됨

### 실패 시 동작

| 실패 조건 | 응답 코드 | 에러 코드 | 메시지 |
|----------|----------|----------|--------|
| 레시피 없음 | 404 | RECIPE_NOT_FOUND | "Recipe not found" |
| 인분 범위 초과 | 422 | INVALID_SERVINGS | "Servings must be between 1 and 99" |

---

## 부록: 단위 변환 규칙

### 지원 단위

| 카테고리 | 단위 | 기준 단위 |
|----------|------|----------|
| 부피 | ml, l, tsp, tbsp, cup | ml |
| 무게 | g, kg, oz, lb | g |
| 개수 | 개, piece, ea | 개 |
| 기타 | pinch, dash, to_taste | (변환 안함) |

### 변환 상수

```
1 tsp = 5 ml
1 tbsp = 15 ml
1 cup = 240 ml
1 l = 1000 ml

1 oz = 28.35 g
1 lb = 453.6 g
1 kg = 1000 g
```

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0.0 | 2026-01-28 | 초기 문서 작성 |
| 1.1.0 | 2026-01-28 | 요구사항 의존성 매트릭스 추가 |
