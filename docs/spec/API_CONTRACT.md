# API Contract - REST API 계약

> 버전: 1.1.0
> 최종 수정: 2026-01-28

---

## 1. 개요

### 1.1 Base URL

```
Production: https://api.mealplanner.app/api/v1
Staging:    https://staging-api.mealplanner.app/api/v1
Development: http://localhost:8000/api/v1
```

### 1.2 API 버전 관리

| 버전 | 상태 | 지원 종료 |
|------|------|----------|
| v1 | Current | - |

버전은 URL Path에 포함 (예: `/api/v1/recipes`)

---

## 2. 공통 규약

### 2.1 요청 헤더

| 헤더 | 필수 | 설명 |
|------|------|------|
| Authorization | O* | Bearer {access_token} |
| Content-Type | O | application/json |
| Accept-Language | X | ko, en (기본: ko) |
| X-Request-ID | X | 요청 추적 ID (UUID) |

*인증 필요 엔드포인트에 한함

### 2.2 응답 형식

**성공 응답:**

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-01-28T10:30:00Z"
  }
}
```

**페이지네이션 응답:**

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "has_next": true,
    "has_prev": false
  }
}
```

**에러 응답:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "title",
        "message": "Title is required"
      }
    ]
  },
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-01-28T10:30:00Z"
  }
}
```

### 2.3 에러 코드

| 코드 | HTTP | 설명 |
|------|------|------|
| INVALID_REQUEST | 400 | 잘못된 요청 형식 |
| MISSING_REQUIRED_FIELD | 400 | 필수 필드 누락 |
| UNAUTHORIZED | 401 | 인증 필요 또는 토큰 만료 |
| FORBIDDEN | 403 | 권한 없음 |
| NOT_FOUND | 404 | 리소스 없음 |
| CONFLICT | 409 | 리소스 충돌 |
| VALIDATION_ERROR | 422 | 유효성 검증 실패 |
| RATE_LIMIT_EXCEEDED | 429 | 요청 한도 초과 |
| INTERNAL_ERROR | 500 | 서버 내부 오류 |
| SERVICE_UNAVAILABLE | 503 | 서비스 일시 불가 |

### 2.4 Rate Limiting

| 티어 | 분당 요청 | 일간 요청 |
|------|----------|----------|
| Free | 60 | 1,000 |
| Premium | 300 | 10,000 |

**Rate Limit 헤더:**

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1706437800
```

---

## 3. 엔드포인트

### 3.1 Recipes

#### POST /recipes

레시피를 생성한다.

**Request:**

```json
{
  "title": "김치찌개",
  "ingredients": [
    {
      "name": "김치",
      "amount": 200,
      "unit": "g"
    },
    {
      "name": "돼지고기",
      "amount": 150,
      "unit": "g"
    }
  ],
  "instructions": [
    "김치를 먹기 좋은 크기로 자른다",
    "돼지고기를 볶는다",
    "물을 넣고 끓인다"
  ],
  "servings": 2,
  "prep_time_minutes": 10,
  "cook_time_minutes": 20,
  "image_url": "https://example.com/image.jpg",
  "notes": "매운 맛 조절은 고춧가루로"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "recipe_id": "rec_abc123",
    "created_at": "2026-01-28T10:30:00Z"
  }
}
```

**Errors:** 400, 401, 422

---

#### GET /recipes

레시피 목록을 조회한다.

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| query | string | 검색어 |
| categories | string | 카테고리 (콤마 구분) |
| tags | string | 태그 (콤마 구분) |
| max_prep_time | integer | 최대 준비 시간 (분) |
| max_cook_time | integer | 최대 조리 시간 (분) |
| sort_by | string | 정렬 기준 |
| sort_order | string | asc, desc |
| page | integer | 페이지 번호 |
| limit | integer | 페이지 크기 |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "recipe_id": "rec_abc123",
      "title": "김치찌개",
      "servings": 2,
      "prep_time_minutes": 10,
      "cook_time_minutes": 20,
      "categories": ["korean", "main_course"],
      "tags": ["매운", "국물요리"],
      "image_url": "https://example.com/image.jpg",
      "created_at": "2026-01-28T10:30:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "has_next": true
  }
}
```

---

#### GET /recipes/{recipe_id}

레시피 상세를 조회한다.

**Path Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| recipe_id | string | 레시피 ID |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "recipe_id": "rec_abc123",
    "title": "김치찌개",
    "ingredients": [
      {
        "name": "김치",
        "amount": 200,
        "unit": "g",
        "notes": null
      }
    ],
    "instructions": [
      "김치를 먹기 좋은 크기로 자른다",
      "돼지고기를 볶는다"
    ],
    "servings": 2,
    "prep_time_minutes": 10,
    "cook_time_minutes": 20,
    "categories": ["korean", "main_course"],
    "tags": ["매운", "국물요리"],
    "image_url": "https://example.com/image.jpg",
    "source_url": null,
    "notes": "매운 맛 조절은 고춧가루로",
    "created_at": "2026-01-28T10:30:00Z",
    "updated_at": "2026-01-28T10:30:00Z"
  }
}
```

**Errors:** 404

---

#### PATCH /recipes/{recipe_id}

레시피를 부분 수정한다.

> **참고:** 부분 업데이트에 PATCH 사용 (RFC 5789). PUT은 전체 리소스 교체 의미이므로 사용하지 않음.

**Request:**

```json
{
  "title": "김치찌개 (업데이트)",
  "servings": 4
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "recipe_id": "rec_abc123",
    "updated_at": "2026-01-28T11:00:00Z"
  }
}
```

**Errors:** 400, 401, 403, 404, 422

---

#### DELETE /recipes/{recipe_id}

레시피를 삭제한다.

**Response (204 No Content):**

(빈 응답)

**Errors:** 401, 403, 404

---

#### POST /recipes/import-url

URL에서 레시피를 추출한다.

**Request:**

```json
{
  "url": "https://www.10000recipe.com/recipe/12345",
  "save_immediately": false
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "extracted_recipe": {
      "title": "된장찌개",
      "ingredients": [...],
      "instructions": [...],
      "servings": 2,
      "image_url": "..."
    },
    "confidence_score": 0.85,
    "requires_review": false,
    "recipe_id": null
  }
}
```

**Response (200 OK, save_immediately=true):**

```json
{
  "success": true,
  "data": {
    "extracted_recipe": {...},
    "confidence_score": 0.85,
    "requires_review": false,
    "recipe_id": "rec_xyz789"
  }
}
```

**Errors:** 400, 401, 422

---

#### PATCH /recipes/{recipe_id}/categories

레시피 카테고리/태그를 부분 수정한다.

**Request:**

```json
{
  "categories": ["korean", "main_course"],
  "tags": ["매운", "국물요리", "겨울"]
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "recipe_id": "rec_abc123",
    "categories": ["korean", "main_course"],
    "tags": ["매운", "국물요리", "겨울"],
    "updated_at": "2026-01-28T11:00:00Z"
  }
}
```

**Errors:** 400, 401, 403, 404, 422

---

#### GET /recipes/{recipe_id}/scale

인분 수를 조절한 재료 목록을 조회한다.

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| servings | integer | O | 새 인분 수 |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "recipe_id": "rec_abc123",
    "original_servings": 2,
    "new_servings": 4,
    "scaled_ingredients": [
      {
        "name": "김치",
        "amount": 400,
        "unit": "g"
      },
      {
        "name": "돼지고기",
        "amount": 300,
        "unit": "g"
      }
    ]
  }
}
```

**Errors:** 404, 422

---

### 3.2 Meal Plans

#### POST /meal-plans

주간 식사 계획을 생성한다.

**Request:**

```json
{
  "week_start_date": "2026-01-27",
  "meals": [
    {
      "date": "2026-01-27",
      "timeframe": "dinner",
      "recipe_id": "rec_abc123",
      "servings": 4,
      "notes": "가족 저녁"
    },
    {
      "date": "2026-01-28",
      "timeframe": "lunch",
      "recipe_id": "rec_xyz789"
    }
  ]
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "meal_plan_id": "mp_abc123",
    "week_start_date": "2026-01-27",
    "meals": [...],
    "created_at": "2026-01-28T10:30:00Z"
  }
}
```

**Errors:** 400, 401, 404, 409, 422

---

#### GET /meal-plans/week/{date}

특정 주의 식사 계획을 조회한다.

**Path Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| date | date | 주 내 아무 날짜 (ISO 8601) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "meal_plan_id": "mp_abc123",
    "week_start_date": "2026-01-27",
    "week_end_date": "2026-02-02",
    "meals": [
      {
        "date": "2026-01-27",
        "timeframe": "dinner",
        "recipe": {
          "recipe_id": "rec_abc123",
          "title": "김치찌개",
          "image_url": "..."
        },
        "servings": 4,
        "notes": "가족 저녁"
      }
    ],
    "created_at": "2026-01-28T10:30:00Z",
    "updated_at": "2026-01-28T10:30:00Z"
  }
}
```

**Response (404 Not Found):** 해당 주에 계획이 없는 경우

---

#### PATCH /meal-plans/{meal_plan_id}

식사 계획을 부분 수정한다.

**Request:**

```json
{
  "add_meals": [
    {
      "date": "2026-01-29",
      "timeframe": "breakfast",
      "recipe_id": "rec_new123"
    }
  ],
  "remove_meals": [
    {
      "date": "2026-01-27",
      "timeframe": "dinner"
    }
  ],
  "update_meals": [
    {
      "date": "2026-01-28",
      "timeframe": "lunch",
      "servings": 2
    }
  ]
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "meal_plan_id": "mp_abc123",
    "meals": [...],
    "updated_at": "2026-01-28T11:00:00Z"
  }
}
```

**Errors:** 400, 401, 403, 404, 422

---

#### DELETE /meal-plans/{meal_plan_id}

식사 계획을 삭제한다.

**Response (204 No Content):**

(빈 응답)

**Errors:** 401, 403, 404

---

### 3.3 Shopping Lists

#### POST /shopping-lists/generate

식사 계획에서 장보기 목록을 생성한다.

**Request:**

```json
{
  "meal_plan_id": "mp_abc123",
  "group_by": "category",
  "exclude_pantry": true
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "shopping_list_id": "sl_abc123",
    "meal_plan_id": "mp_abc123",
    "items": [
      {
        "item_id": "item_001",
        "ingredient_name": "김치",
        "total_amount": 400,
        "unit": "g",
        "category": "채소/김치",
        "checked": false,
        "source_recipes": ["rec_abc123", "rec_xyz789"]
      },
      {
        "item_id": "item_002",
        "ingredient_name": "돼지고기",
        "total_amount": 300,
        "unit": "g",
        "category": "육류",
        "checked": false,
        "source_recipes": ["rec_abc123"]
      }
    ],
    "total_items": 15,
    "created_at": "2026-01-28T10:30:00Z"
  }
}
```

**Errors:** 401, 404, 422

---

#### GET /shopping-lists/{shopping_list_id}

장보기 목록을 조회한다.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "shopping_list_id": "sl_abc123",
    "meal_plan_id": "mp_abc123",
    "items": [...],
    "total_items": 15,
    "checked_items": 3,
    "created_at": "2026-01-28T10:30:00Z",
    "updated_at": "2026-01-28T11:00:00Z"
  }
}
```

**Errors:** 401, 403, 404

---

#### PATCH /shopping-lists/{shopping_list_id}/items/{item_id}

장보기 항목을 부분 수정한다.

**Request:**

```json
{
  "checked": true
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "item_id": "item_001",
    "checked": true,
    "updated_at": "2026-01-28T11:00:00Z"
  }
}
```

**Errors:** 401, 403, 404

---

#### DELETE /shopping-lists/{shopping_list_id}

장보기 목록을 삭제한다.

**Path Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| shopping_list_id | string | 장보기 목록 ID |

**Response (204 No Content):**

(빈 응답)

**Errors:** 401, 403, 404

**보안 참고:**
- 인증된 사용자만 호출 가능
- 본인 소유 장보기 목록만 삭제 가능 (403 FORBIDDEN)
- 삭제 시 감사 로그에 기록됨

---

### 3.4 User Profile

#### GET /users/me/profile

내 프로필을 조회한다.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user_id": "usr_abc123",
    "email": "user@example.com",
    "name": "홍길동",
    "allergies": ["nuts", "shellfish"],
    "dietary_preferences": ["low_carb"],
    "disliked_ingredients": ["고수", "파"],
    "default_servings": 4,
    "preferred_cuisine": ["korean", "japanese"],
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-28T10:00:00Z"
  }
}
```

---

#### PATCH /users/me/profile

내 프로필을 부분 수정한다.

**Request:**

```json
{
  "allergies": ["nuts"],
  "dietary_preferences": ["low_carb", "gluten_free"],
  "disliked_ingredients": ["고수"],
  "default_servings": 2,
  "preferred_cuisine": ["korean"]
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user_id": "usr_abc123",
    "allergies": ["nuts"],
    "dietary_preferences": ["low_carb", "gluten_free"],
    "disliked_ingredients": ["고수"],
    "default_servings": 2,
    "preferred_cuisine": ["korean"],
    "updated_at": "2026-01-28T11:00:00Z"
  }
}
```

**Errors:** 400, 401, 422

---

## 4. 데이터 타입 정의

### 4.1 Recipe

```typescript
interface Recipe {
  recipe_id: string;
  title: string;
  ingredients: Ingredient[];
  instructions: string[];
  servings: number;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  categories: string[];
  tags: string[];
  image_url?: string;
  source_url?: string;
  notes?: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}
```

### 4.2 Ingredient

```typescript
interface Ingredient {
  name: string;
  amount?: number;
  unit?: string;
  notes?: string;
}
```

### 4.3 MealPlan

```typescript
interface MealPlan {
  meal_plan_id: string;
  week_start_date: string; // ISO 8601 date
  week_end_date: string;
  meals: MealSlot[];
  created_at: string;
  updated_at: string;
}
```

### 4.4 MealSlot

```typescript
interface MealSlot {
  date: string; // ISO 8601 date
  timeframe: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipe: RecipeSummary;
  servings: number;
  notes?: string;
}
```

### 4.5 ShoppingList

```typescript
interface ShoppingList {
  shopping_list_id: string;
  meal_plan_id: string;
  items: ShoppingItem[];
  total_items: number;
  checked_items: number;
  created_at: string;
  updated_at: string;
}
```

### 4.6 ShoppingItem

```typescript
interface ShoppingItem {
  item_id: string;
  ingredient_name: string;
  total_amount: number;
  unit: string;
  category: string;
  checked: boolean;
  source_recipes: string[];
}
```

---

## 5. 사전 정의 값

### 5.1 Categories

```typescript
type Category =
  // 식사 시간
  | 'breakfast' | 'lunch' | 'dinner' | 'snack'
  // 요리 종류
  | 'appetizer' | 'main_course' | 'side_dish' | 'dessert' | 'beverage'
  // 요리 국가
  | 'korean' | 'japanese' | 'chinese' | 'thai' | 'vietnamese'
  | 'indian' | 'italian' | 'french' | 'mexican' | 'american' | 'fusion';
```

### 5.2 Allergies

```typescript
type Allergy =
  | 'gluten' | 'dairy' | 'eggs' | 'nuts' | 'peanuts'
  | 'soy' | 'shellfish' | 'fish' | 'sesame' | 'wheat';
```

### 5.3 Dietary Preferences

```typescript
type DietaryPreference =
  | 'vegetarian' | 'vegan' | 'pescatarian'
  | 'keto' | 'paleo' | 'low_carb'
  | 'gluten_free' | 'dairy_free';
```

### 5.4 Units

```typescript
type Unit =
  // 부피
  | 'ml' | 'l' | 'tsp' | 'tbsp' | 'cup'
  // 무게
  | 'g' | 'kg' | 'oz' | 'lb'
  // 개수
  | 'piece' | 'ea'
  // 기타
  | 'pinch' | 'dash' | 'to_taste';
```

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0.0 | 2026-01-28 | 초기 API 계약 작성 |
| 1.1.0 | 2026-01-28 | PUT → PATCH 변경, DELETE /shopping-lists/{id} 추가 |
