# Acceptance Criteria - BDD (Given/When/Then)

> 버전: 1.1.0
> 최종 수정: 2026-01-28
> 형식: Gherkin BDD

---

## 개요

MVP 기능에 대한 수용 기준을 BDD(Behavior-Driven Development) 형식으로 정의합니다.
각 시나리오는 자동화 테스트로 변환 가능해야 합니다.

---

## FR-001: 레시피 수동 생성

### Feature: 레시피 수동 생성

```gherkin
Feature: 레시피 수동 생성
  사용자로서
  나는 레시피 정보를 직접 입력하여 저장하고 싶다
  나중에 식사 계획에 사용하기 위해

  Background:
    Given 인증된 사용자가 로그인되어 있다

  @happy-path
  Scenario: 필수 정보만으로 레시피 생성 성공
    Given 다음 레시피 정보를 준비한다:
      | field        | value                |
      | title        | 김치찌개             |
      | servings     | 2                    |
    And 재료 목록을 준비한다:
      | name     | amount | unit |
      | 김치     | 200    | g    |
      | 돼지고기 | 150    | g    |
    And 조리법을 준비한다:
      | step                           |
      | 김치를 먹기 좋은 크기로 자른다 |
      | 돼지고기를 볶는다              |
    When 레시피 생성 요청을 보낸다
    Then 응답 코드는 201이다
    And 응답에 recipe_id가 포함된다
    And 응답에 created_at이 포함된다

  @happy-path
  Scenario: 모든 정보를 포함한 레시피 생성 성공
    Given 다음 레시피 정보를 준비한다:
      | field             | value                              |
      | title             | 된장찌개                           |
      | servings          | 4                                  |
      | prep_time_minutes | 15                                 |
      | cook_time_minutes | 25                                 |
      | image_url         | https://example.com/doenjang.jpg   |
      | notes             | 두부는 나중에 넣는다               |
    And 재료 목록을 준비한다:
      | name   | amount | unit |
      | 된장   | 2      | tbsp |
      | 두부   | 1      | 모   |
    And 조리법을 준비한다:
      | step               |
      | 된장을 풀어준다    |
      | 야채를 넣고 끓인다 |
    When 레시피 생성 요청을 보낸다
    Then 응답 코드는 201이다
    And 레시피가 데이터베이스에 저장된다

  @edge-case
  Scenario: 필수 필드 누락 시 실패
    Given 다음 레시피 정보를 준비한다:
      | field    | value    |
      | title    | 김치찌개 |
    And 재료 목록이 비어 있다
    When 레시피 생성 요청을 보낸다
    Then 응답 코드는 400이다
    And 에러 코드는 "MISSING_REQUIRED_FIELD"이다
    And 에러 메시지에 "ingredients"가 포함된다

  @edge-case
  Scenario: 제목 길이 초과 시 실패
    Given 레시피 제목이 201자 이상이다
    When 레시피 생성 요청을 보낸다
    Then 응답 코드는 422이다
    And 에러 코드는 "VALIDATION_ERROR"이다

  @edge-case
  Scenario: 인증 없이 요청 시 실패
    Given 사용자가 로그인되어 있지 않다
    When 레시피 생성 요청을 보낸다
    Then 응답 코드는 401이다
    And 에러 코드는 "UNAUTHORIZED"이다
```

---

## FR-002: 레시피 URL 추출

### Feature: 레시피 URL 추출

```gherkin
Feature: 레시피 URL 추출
  사용자로서
  나는 웹 URL에서 레시피를 자동으로 추출하고 싶다
  수동 입력 없이 빠르게 저장하기 위해

  Background:
    Given 인증된 사용자가 로그인되어 있다

  @happy-path
  Scenario: 지원되는 사이트에서 레시피 추출 성공
    Given URL "https://www.10000recipe.com/recipe/12345"를 준비한다
    When 레시피 추출 요청을 보낸다
    Then 응답 코드는 200이다
    And 응답에 extracted_recipe가 포함된다
    And extracted_recipe.title이 비어 있지 않다
    And extracted_recipe.ingredients가 1개 이상이다
    And confidence_score가 0 이상 1 이하이다

  @happy-path
  Scenario: 높은 신뢰도일 때 검토 불필요
    Given URL에서 레시피가 성공적으로 추출된다
    And 신뢰도 점수가 0.7 이상이다
    When 레시피 추출 요청을 보낸다
    Then requires_review는 false이다

  @happy-path
  Scenario: 낮은 신뢰도일 때 검토 필요
    Given URL에서 레시피가 부분적으로 추출된다
    And 신뢰도 점수가 0.7 미만이다
    When 레시피 추출 요청을 보낸다
    Then requires_review는 true이다

  @happy-path
  Scenario: 즉시 저장 옵션으로 추출 및 저장
    Given URL "https://www.10000recipe.com/recipe/12345"를 준비한다
    And save_immediately를 true로 설정한다
    When 레시피 추출 요청을 보낸다
    Then 응답 코드는 200이다
    And 응답에 recipe_id가 포함된다
    And 레시피가 데이터베이스에 저장된다

  @edge-case
  Scenario: 잘못된 URL 형식
    Given URL "not-a-valid-url"을 준비한다
    When 레시피 추출 요청을 보낸다
    Then 응답 코드는 400이다
    And 에러 코드는 "INVALID_URL"이다

  @edge-case
  Scenario: 접근 불가능한 URL
    Given URL "https://nonexistent-domain-12345.com/recipe"를 준비한다
    When 레시피 추출 요청을 보낸다
    Then 응답 코드는 422이다
    And 에러 코드는 "URL_UNREACHABLE"이다

  @edge-case
  Scenario: 레시피 정보가 없는 페이지
    Given URL "https://www.google.com"을 준비한다
    When 레시피 추출 요청을 보낸다
    Then 응답 코드는 422이다
    And 에러 코드는 "EXTRACTION_FAILED"이다

  @edge-case
  Scenario: 타임아웃 발생
    Given URL 응답이 10초 이상 걸린다
    When 레시피 추출 요청을 보낸다
    Then 응답 코드는 422이다
    And 에러 메시지에 "timeout"이 포함된다
```

---

## FR-003: 레시피 검색

### Feature: 레시피 검색

```gherkin
Feature: 레시피 검색
  사용자로서
  나는 저장된 레시피를 키워드와 필터로 검색하고 싶다
  원하는 레시피를 빠르게 찾기 위해

  Background:
    Given 인증된 사용자가 로그인되어 있다
    And 사용자가 다음 레시피들을 저장했다:
      | title    | categories           | tags         | prep_time |
      | 김치찌개 | korean, main_course  | 매운, 국물   | 10        |
      | 된장찌개 | korean, main_course  | 국물         | 15        |
      | 파스타   | italian, main_course | 빠른요리     | 20        |

  @happy-path
  Scenario: 키워드로 검색 성공
    Given 검색어 "찌개"를 준비한다
    When 레시피 검색 요청을 보낸다
    Then 응답 코드는 200이다
    And 검색 결과에 2개의 레시피가 포함된다
    And 결과에 "김치찌개"가 포함된다
    And 결과에 "된장찌개"가 포함된다

  @happy-path
  Scenario: 카테고리 필터로 검색
    Given 카테고리 필터 "italian"을 준비한다
    When 레시피 검색 요청을 보낸다
    Then 응답 코드는 200이다
    And 검색 결과에 1개의 레시피가 포함된다
    And 결과에 "파스타"가 포함된다

  @happy-path
  Scenario: 복합 필터로 검색
    Given 검색어 "찌개"를 준비한다
    And 태그 필터 "매운"을 준비한다
    When 레시피 검색 요청을 보낸다
    Then 응답 코드는 200이다
    And 검색 결과에 1개의 레시피가 포함된다
    And 결과에 "김치찌개"가 포함된다

  @happy-path
  Scenario: 준비 시간 필터로 검색
    Given max_prep_time을 15로 설정한다
    When 레시피 검색 요청을 보낸다
    Then 응답 코드는 200이다
    And 모든 결과의 prep_time_minutes가 15 이하이다

  @happy-path
  Scenario: 페이지네이션
    Given page를 1로 설정한다
    And limit을 2로 설정한다
    When 레시피 검색 요청을 보낸다
    Then 응답 코드는 200이다
    And 검색 결과에 최대 2개의 레시피가 포함된다
    And meta.has_next가 true이다

  @happy-path
  Scenario: 정렬 적용
    Given sort_by를 "title"로 설정한다
    And sort_order를 "asc"로 설정한다
    When 레시피 검색 요청을 보낸다
    Then 응답 코드는 200이다
    And 결과가 제목 오름차순으로 정렬된다

  @edge-case
  Scenario: 검색 결과 없음
    Given 검색어 "존재하지않는레시피"를 준비한다
    When 레시피 검색 요청을 보낸다
    Then 응답 코드는 200이다
    And 검색 결과 목록이 비어 있다
    And meta.total이 0이다

  @edge-case
  Scenario: 필터 없이 전체 조회
    When 필터 없이 레시피 검색 요청을 보낸다
    Then 응답 코드는 200이다
    And 검색 결과에 3개의 레시피가 포함된다
```

---

## FR-004: 레시피 카테고리 분류

### Feature: 레시피 카테고리 분류

```gherkin
Feature: 레시피 카테고리 분류
  사용자로서
  나는 레시피에 카테고리와 태그를 할당하고 싶다
  체계적인 레시피 관리와 검색을 위해

  Background:
    Given 인증된 사용자가 로그인되어 있다
    And 레시피 "rec_abc123"이 존재한다

  @happy-path
  Scenario: 사전 정의 카테고리 할당 성공
    Given 다음 카테고리를 준비한다:
      | category     |
      | korean       |
      | main_course  |
    When 카테고리 업데이트 요청을 보낸다
    Then 응답 코드는 200이다
    And 응답의 categories에 "korean"과 "main_course"가 포함된다
    And 응답에 updated_at이 포함된다

  @happy-path
  Scenario: 커스텀 태그 할당 성공
    Given 다음 태그를 준비한다:
      | tag      |
      | 매운     |
      | 국물요리 |
      | 겨울음식 |
    When 카테고리 업데이트 요청을 보낸다
    Then 응답 코드는 200이다
    And 응답의 tags에 3개의 태그가 포함된다

  @happy-path
  Scenario: 카테고리와 태그 동시 할당
    Given 다음 카테고리를 준비한다:
      | category |
      | dinner   |
    And 다음 태그를 준비한다:
      | tag        |
      | 간단요리   |
    When 카테고리 업데이트 요청을 보낸다
    Then 응답 코드는 200이다
    And 응답의 categories에 "dinner"가 포함된다
    And 응답의 tags에 "간단요리"가 포함된다

  @happy-path
  Scenario: 기존 카테고리 교체
    Given 레시피에 기존 카테고리 ["korean", "lunch"]가 있다
    And 새 카테고리 ["japanese", "dinner"]를 준비한다
    When 카테고리 업데이트 요청을 보낸다
    Then 응답 코드는 200이다
    And 응답의 categories에 "japanese"와 "dinner"만 포함된다
    And 응답의 categories에 "korean"이 포함되지 않는다

  @edge-case
  Scenario: 잘못된 카테고리 거부
    Given 다음 카테고리를 준비한다:
      | category         |
      | invalid_category |
    When 카테고리 업데이트 요청을 보낸다
    Then 응답 코드는 400이다
    And 에러 코드는 "INVALID_CATEGORY"이다
    And 에러 메시지에 "invalid_category"가 포함된다

  @edge-case
  Scenario: 태그 20개 초과 시 실패
    Given 21개의 태그를 준비한다
    When 카테고리 업데이트 요청을 보낸다
    Then 응답 코드는 422이다
    And 에러 코드는 "TOO_MANY_TAGS"이다

  @edge-case
  Scenario: 태그 길이 초과 시 실패
    Given 51자 이상의 태그를 준비한다
    When 카테고리 업데이트 요청을 보낸다
    Then 응답 코드는 422이다
    And 에러 코드는 "VALIDATION_ERROR"이다

  @edge-case
  Scenario: 존재하지 않는 레시피
    Given 존재하지 않는 레시피 ID "rec_nonexistent"를 사용한다
    When 카테고리 업데이트 요청을 보낸다
    Then 응답 코드는 404이다
    And 에러 코드는 "RECIPE_NOT_FOUND"이다

  @edge-case
  Scenario: 다른 사용자의 레시피
    Given 다른 사용자의 레시피 ID를 사용한다
    When 카테고리 업데이트 요청을 보낸다
    Then 응답 코드는 403이다
    And 에러 코드는 "FORBIDDEN"이다
```

---

## FR-005: 주간 식사 계획 생성

### Feature: 주간 식사 계획 생성

```gherkin
Feature: 주간 식사 계획 생성
  사용자로서
  나는 특정 주에 대한 식사 계획을 생성하고 싶다
  체계적인 식사 관리를 위해

  Background:
    Given 인증된 사용자가 로그인되어 있다
    And 사용자가 저장한 레시피들이 있다

  @happy-path
  Scenario: 주간 식사 계획 생성 성공
    Given 주 시작일을 "2026-01-27" (월요일)로 설정한다
    And 다음 식사를 배치한다:
      | date       | timeframe | recipe_id   | servings |
      | 2026-01-27 | dinner    | rec_abc123  | 4        |
      | 2026-01-28 | lunch     | rec_xyz789  | 2        |
    When 식사 계획 생성 요청을 보낸다
    Then 응답 코드는 201이다
    And 응답에 meal_plan_id가 포함된다
    And 식사 계획이 데이터베이스에 저장된다

  @happy-path
  Scenario: 모든 식사 시간대에 배치
    Given 주 시작일을 "2026-01-27" (월요일)로 설정한다
    And 다음 식사를 배치한다:
      | date       | timeframe | recipe_id   |
      | 2026-01-27 | breakfast | rec_001     |
      | 2026-01-27 | lunch     | rec_002     |
      | 2026-01-27 | dinner    | rec_003     |
      | 2026-01-27 | snack     | rec_004     |
    When 식사 계획 생성 요청을 보낸다
    Then 응답 코드는 201이다
    And 응답의 meals에 4개의 항목이 포함된다

  @edge-case
  Scenario: 월요일이 아닌 날짜로 시작
    Given 주 시작일을 "2026-01-28" (화요일)로 설정한다
    When 식사 계획 생성 요청을 보낸다
    Then 응답 코드는 400이다
    And 에러 코드는 "INVALID_WEEK_START"이다

  @edge-case
  Scenario: 존재하지 않는 레시피 참조
    Given 주 시작일을 "2026-01-27" (월요일)로 설정한다
    And 존재하지 않는 레시피 ID "rec_nonexistent"를 배치한다
    When 식사 계획 생성 요청을 보낸다
    Then 응답 코드는 404이다
    And 에러 코드는 "RECIPE_NOT_FOUND"이다

  @edge-case
  Scenario: 같은 주에 중복 계획 생성 시도
    Given 주 시작일 "2026-01-27"에 대한 식사 계획이 이미 존재한다
    And 같은 주 시작일로 새 계획을 생성하려 한다
    When 식사 계획 생성 요청을 보낸다
    Then 응답 코드는 409이다
    And 에러 코드는 "DUPLICATE_PLAN"이다

  @edge-case
  Scenario: 주 범위를 벗어난 날짜
    Given 주 시작일을 "2026-01-27" (월요일)로 설정한다
    And 다음 식사를 배치한다:
      | date       | timeframe | recipe_id   |
      | 2026-02-03 | dinner    | rec_abc123  |
    When 식사 계획 생성 요청을 보낸다
    Then 응답 코드는 400이다
    And 에러 코드는 "DATE_OUT_OF_RANGE"이다
```

---

## FR-006: 식사 계획 수정

### Feature: 식사 계획 수정

```gherkin
Feature: 식사 계획 수정
  사용자로서
  나는 기존 식사 계획을 수정하고 싶다
  변경된 일정이나 선호도를 반영하기 위해

  Background:
    Given 인증된 사용자가 로그인되어 있다
    And 다음 식사 계획이 존재한다:
      | meal_plan_id | week_start_date |
      | mp_abc123    | 2026-01-27      |
    And 식사 계획에 다음 식사가 배치되어 있다:
      | date       | timeframe | recipe_id  | servings |
      | 2026-01-27 | dinner    | rec_001    | 4        |
      | 2026-01-28 | lunch     | rec_002    | 2        |

  @happy-path
  Scenario: 새 식사 추가
    Given 다음 식사를 추가한다:
      | date       | timeframe | recipe_id  | servings |
      | 2026-01-29 | breakfast | rec_003    | 2        |
    When 식사 계획 수정 요청을 보낸다
    Then 응답 코드는 200이다
    And 응답의 meals에 3개의 항목이 포함된다
    And "2026-01-29" breakfast에 "rec_003"이 배치된다

  @happy-path
  Scenario: 기존 식사 교체
    Given 다음 식사를 수정한다:
      | date       | timeframe | recipe_id  |
      | 2026-01-27 | dinner    | rec_new001 |
    When 식사 계획 수정 요청을 보낸다
    Then 응답 코드는 200이다
    And "2026-01-27" dinner의 recipe_id가 "rec_new001"이다

  @happy-path
  Scenario: 식사 인분 수 변경
    Given 다음 식사를 수정한다:
      | date       | timeframe | servings |
      | 2026-01-27 | dinner    | 6        |
    When 식사 계획 수정 요청을 보낸다
    Then 응답 코드는 200이다
    And "2026-01-27" dinner의 servings가 6이다

  @happy-path
  Scenario: 식사 삭제
    Given 다음 식사를 제거한다:
      | date       | timeframe |
      | 2026-01-27 | dinner    |
    When 식사 계획 수정 요청을 보낸다
    Then 응답 코드는 200이다
    And 응답의 meals에 1개의 항목만 포함된다
    And "2026-01-27" dinner가 존재하지 않는다

  @happy-path
  Scenario: 복합 수정 (추가 + 삭제 + 수정)
    Given 다음 식사를 추가한다:
      | date       | timeframe | recipe_id |
      | 2026-01-30 | dinner    | rec_004   |
    And 다음 식사를 제거한다:
      | date       | timeframe |
      | 2026-01-27 | dinner    |
    And 다음 식사를 수정한다:
      | date       | timeframe | servings |
      | 2026-01-28 | lunch     | 4        |
    When 식사 계획 수정 요청을 보낸다
    Then 응답 코드는 200이다
    And 응답의 meals에 2개의 항목이 포함된다

  @edge-case
  Scenario: 존재하지 않는 식사 계획
    Given 존재하지 않는 식사 계획 ID "mp_nonexistent"를 사용한다
    When 식사 계획 수정 요청을 보낸다
    Then 응답 코드는 404이다
    And 에러 코드는 "MEAL_PLAN_NOT_FOUND"이다

  @edge-case
  Scenario: 존재하지 않는 식사 슬롯 수정
    Given 다음 식사를 수정한다:
      | date       | timeframe | recipe_id |
      | 2026-01-31 | breakfast | rec_001   |
    When 식사 계획 수정 요청을 보낸다
    Then 응답 코드는 404이다
    And 에러 코드는 "MEAL_SLOT_NOT_FOUND"이다

  @edge-case
  Scenario: 존재하지 않는 레시피로 교체
    Given 다음 식사를 수정한다:
      | date       | timeframe | recipe_id      |
      | 2026-01-27 | dinner    | rec_nonexistent |
    When 식사 계획 수정 요청을 보낸다
    Then 응답 코드는 404이다
    And 에러 코드는 "RECIPE_NOT_FOUND"이다

  @edge-case
  Scenario: 주 범위를 벗어난 날짜에 추가
    Given 다음 식사를 추가한다:
      | date       | timeframe | recipe_id |
      | 2026-02-05 | dinner    | rec_001   |
    When 식사 계획 수정 요청을 보낸다
    Then 응답 코드는 400이다
    And 에러 코드는 "DATE_OUT_OF_RANGE"이다

  @edge-case
  Scenario: 다른 사용자의 식사 계획 수정
    Given 다른 사용자의 식사 계획 ID를 사용한다
    When 식사 계획 수정 요청을 보낸다
    Then 응답 코드는 403이다
    And 에러 코드는 "FORBIDDEN"이다

  @edge-case
  Scenario: 빈 수정 요청
    Given 추가, 삭제, 수정 목록이 모두 비어 있다
    When 식사 계획 수정 요청을 보낸다
    Then 응답 코드는 400이다
    And 에러 코드는 "EMPTY_UPDATE"이다
```

---

## FR-007: 장보기 목록 자동 생성

### Feature: 장보기 목록 자동 생성

```gherkin
Feature: 장보기 목록 자동 생성
  사용자로서
  나는 식사 계획에서 장보기 목록을 자동으로 생성하고 싶다
  효율적인 장보기를 위해

  Background:
    Given 인증된 사용자가 로그인되어 있다
    And 다음 레시피들이 식사 계획에 포함되어 있다:
      | recipe_id  | title    | servings_in_plan |
      | rec_001    | 김치찌개 | 4                |
      | rec_002    | 된장찌개 | 2                |
    And 김치찌개 레시피의 재료:
      | name     | amount | unit |
      | 김치     | 200    | g    |
      | 돼지고기 | 150    | g    |
      | 두부     | 1      | 모   |
    And 된장찌개 레시피의 재료:
      | name   | amount | unit |
      | 된장   | 2      | tbsp |
      | 두부   | 0.5    | 모   |

  @happy-path
  Scenario: 장보기 목록 생성 성공
    Given 식사 계획 ID "mp_abc123"를 준비한다
    When 장보기 목록 생성 요청을 보낸다
    Then 응답 코드는 201이다
    And 응답에 shopping_list_id가 포함된다
    And 응답에 items 배열이 포함된다
    And 모든 항목의 checked가 false이다

  @happy-path
  Scenario: 동일 재료 합산
    Given 식사 계획 ID "mp_abc123"를 준비한다
    When 장보기 목록 생성 요청을 보낸다
    Then 응답 코드는 201이다
    And "두부" 항목의 total_amount가 1.5이다
    And "두부" 항목의 source_recipes에 2개의 레시피가 포함된다

  @happy-path
  Scenario: 인분 수 반영
    Given 김치찌개가 4인분으로 배치되어 있다
    And 김치찌개의 기본 인분은 2인분이다
    When 장보기 목록 생성 요청을 보낸다
    Then 응답 코드는 201이다
    And "김치" 항목의 total_amount가 400이다

  @happy-path
  Scenario: 카테고리별 그룹화
    Given group_by를 "category"로 설정한다
    When 장보기 목록 생성 요청을 보낸다
    Then 응답 코드는 201이다
    And 항목들이 카테고리별로 그룹화된다

  @edge-case
  Scenario: 존재하지 않는 식사 계획
    Given 존재하지 않는 식사 계획 ID "mp_nonexistent"를 준비한다
    When 장보기 목록 생성 요청을 보낸다
    Then 응답 코드는 404이다
    And 에러 코드는 "MEAL_PLAN_NOT_FOUND"이다

  @edge-case
  Scenario: 빈 식사 계획
    Given 식사가 없는 식사 계획 ID를 준비한다
    When 장보기 목록 생성 요청을 보낸다
    Then 응답 코드는 422이다
    And 에러 코드는 "EMPTY_MEAL_PLAN"이다
```

---

## FR-008: 장보기 항목 체크

### Feature: 장보기 항목 체크

```gherkin
Feature: 장보기 항목 체크
  사용자로서
  나는 장보기 목록의 항목을 체크하고 싶다
  구매 진행 상황을 추적하기 위해

  Background:
    Given 인증된 사용자가 로그인되어 있다
    And 장보기 목록 "sl_abc123"이 존재한다
    And 항목 "item_001"이 목록에 있다

  @happy-path
  Scenario: 항목 체크
    Given item_id "item_001"의 checked가 false이다
    When checked를 true로 변경 요청을 보낸다
    Then 응답 코드는 200이다
    And 응답의 checked가 true이다
    And 데이터베이스에서 항목이 체크됨으로 표시된다

  @happy-path
  Scenario: 항목 체크 해제
    Given item_id "item_001"의 checked가 true이다
    When checked를 false로 변경 요청을 보낸다
    Then 응답 코드는 200이다
    And 응답의 checked가 false이다

  @edge-case
  Scenario: 존재하지 않는 목록
    Given 존재하지 않는 장보기 목록 ID를 사용한다
    When 항목 체크 요청을 보낸다
    Then 응답 코드는 404이다
    And 에러 코드는 "SHOPPING_LIST_NOT_FOUND"이다

  @edge-case
  Scenario: 존재하지 않는 항목
    Given 존재하지 않는 항목 ID를 사용한다
    When 항목 체크 요청을 보낸다
    Then 응답 코드는 404이다
    And 에러 코드는 "ITEM_NOT_FOUND"이다

  @edge-case
  Scenario: 다른 사용자의 목록 접근
    Given 다른 사용자의 장보기 목록 ID를 사용한다
    When 항목 체크 요청을 보낸다
    Then 응답 코드는 403이다
    And 에러 코드는 "FORBIDDEN"이다
```

---

## FR-009: 사용자 프로필 설정

### Feature: 사용자 프로필 설정

```gherkin
Feature: 사용자 프로필 설정
  사용자로서
  나는 알러지와 선호도를 설정하고 싶다
  개인화된 레시피 추천을 받기 위해

  Background:
    Given 인증된 사용자가 로그인되어 있다

  @happy-path
  Scenario: 알러지 설정
    Given 알러지 목록 ["nuts", "shellfish"]를 준비한다
    When 프로필 업데이트 요청을 보낸다
    Then 응답 코드는 200이다
    And 응답의 allergies에 "nuts"와 "shellfish"가 포함된다

  @happy-path
  Scenario: 식이 선호 설정
    Given 식이 선호 목록 ["vegetarian", "gluten_free"]를 준비한다
    When 프로필 업데이트 요청을 보낸다
    Then 응답 코드는 200이다
    And 응답의 dietary_preferences에 2개 항목이 포함된다

  @happy-path
  Scenario: 기본 인분 수 설정
    Given default_servings를 4로 설정한다
    When 프로필 업데이트 요청을 보낸다
    Then 응답 코드는 200이다
    And 응답의 default_servings가 4이다

  @happy-path
  Scenario: 기피 재료 설정
    Given 기피 재료 목록 ["고수", "파"]를 준비한다
    When 프로필 업데이트 요청을 보낸다
    Then 응답 코드는 200이다
    And 응답의 disliked_ingredients에 2개 항목이 포함된다

  @edge-case
  Scenario: 잘못된 알러지 값
    Given 알러지 목록 ["invalid_allergy"]를 준비한다
    When 프로필 업데이트 요청을 보낸다
    Then 응답 코드는 400이다
    And 에러 코드는 "INVALID_ALLERGY"이다

  @edge-case
  Scenario: 기피 재료 50개 초과
    Given 기피 재료가 51개이다
    When 프로필 업데이트 요청을 보낸다
    Then 응답 코드는 422이다
    And 에러 코드는 "TOO_MANY_DISLIKED"이다

  @edge-case
  Scenario: 인분 수 범위 초과
    Given default_servings를 25로 설정한다
    When 프로필 업데이트 요청을 보낸다
    Then 응답 코드는 422이다
    And 에러 코드는 "INVALID_SERVINGS"이다
```

---

## FR-010: 인분 수 조절

### Feature: 인분 수 조절

```gherkin
Feature: 인분 수 조절
  사용자로서
  나는 레시피의 인분 수를 조절하고 싶다
  필요한 양만큼만 조리하기 위해

  Background:
    Given 인증된 사용자가 로그인되어 있다
    And 다음 레시피가 존재한다:
      | recipe_id  | title    | servings |
      | rec_abc123 | 김치찌개 | 2        |
    And 레시피의 재료:
      | name     | amount | unit |
      | 김치     | 200    | g    |
      | 돼지고기 | 150    | g    |
      | 물       | 500    | ml   |

  @happy-path
  Scenario: 인분 수 2배로 조절
    Given recipe_id "rec_abc123"를 준비한다
    And new_servings를 4로 설정한다
    When 인분 수 조절 요청을 보낸다
    Then 응답 코드는 200이다
    And 응답의 original_servings가 2이다
    And 응답의 new_servings가 4이다
    And "김치" 재료의 amount가 400이다
    And "돼지고기" 재료의 amount가 300이다
    And "물" 재료의 amount가 1000이다

  @happy-path
  Scenario: 인분 수 반으로 조절
    Given recipe_id "rec_abc123"를 준비한다
    And new_servings를 1로 설정한다
    When 인분 수 조절 요청을 보낸다
    Then 응답 코드는 200이다
    And "김치" 재료의 amount가 100이다
    And "돼지고기" 재료의 amount가 75이다

  @happy-path
  Scenario: 동일 인분 수로 조절
    Given recipe_id "rec_abc123"를 준비한다
    And new_servings를 2로 설정한다
    When 인분 수 조절 요청을 보낸다
    Then 응답 코드는 200이다
    And 재료 양이 원본과 동일하다

  @edge-case
  Scenario: 존재하지 않는 레시피
    Given 존재하지 않는 recipe_id를 준비한다
    When 인분 수 조절 요청을 보낸다
    Then 응답 코드는 404이다
    And 에러 코드는 "RECIPE_NOT_FOUND"이다

  @edge-case
  Scenario: 인분 수 범위 초과
    Given recipe_id "rec_abc123"를 준비한다
    And new_servings를 100으로 설정한다
    When 인분 수 조절 요청을 보낸다
    Then 응답 코드는 422이다
    And 에러 코드는 "INVALID_SERVINGS"이다

  @edge-case
  Scenario: 인분 수 0 또는 음수
    Given recipe_id "rec_abc123"를 준비한다
    And new_servings를 0으로 설정한다
    When 인분 수 조절 요청을 보낸다
    Then 응답 코드는 422이다
    And 에러 코드는 "INVALID_SERVINGS"이다
```

---

## 부록 A: 테스트 우선순위 및 리스크 매핑

### 리스크 기반 테스트 우선순위

| 기능 | 비즈니스 리스크 | 기술 리스크 | 테스트 우선순위 | 자동화 우선순위 |
|------|----------------|------------|----------------|----------------|
| FR-001 레시피 수동 생성 | High | Low | P0 | 1순위 |
| FR-002 레시피 URL 추출 | High | High | P0 | 1순위 |
| FR-003 레시피 검색 | Medium | Medium | P1 | 2순위 |
| FR-004 레시피 카테고리 분류 | Low | Low | P2 | 3순위 |
| FR-005 주간 식사 계획 생성 | High | Medium | P0 | 1순위 |
| FR-006 식사 계획 수정 | Medium | Medium | P1 | 2순위 |
| FR-007 장보기 목록 자동 생성 | High | Medium | P0 | 1순위 |
| FR-008 장보기 항목 체크 | Low | Low | P2 | 3순위 |
| FR-009 사용자 프로필 설정 | Medium | Low | P1 | 2순위 |
| FR-010 인분 수 조절 | Medium | Low | P1 | 2순위 |

### 리스크 정의

**비즈니스 리스크:**
- **High**: 핵심 가치 제안에 직접 영향, 실패 시 사용자 이탈
- **Medium**: 사용자 경험에 영향, 우회 방법 존재
- **Low**: 편의 기능, 실패해도 핵심 사용에 영향 없음

**기술 리스크:**
- **High**: 외부 의존성 높음, 복잡한 파싱/변환, 예측 불가능한 입력
- **Medium**: 다중 엔티티 연산, 데이터 정합성 필요
- **Low**: 단순 CRUD, 잘 정의된 입출력

### 테스트 커버리지 목표

| 우선순위 | 목표 커버리지 | MVP 전 필수 |
|----------|-------------|-------------|
| P0 | 90%+ | 필수 |
| P1 | 80%+ | 필수 |
| P2 | 70%+ | 권장 |

---

## 부록 B: 시나리오 태그 설명

| 태그 | 설명 |
|------|------|
| @happy-path | 정상 동작 시나리오 |
| @edge-case | 예외 및 경계 케이스 |
| @security | 보안 관련 시나리오 |
| @performance | 성능 관련 시나리오 |

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0.0 | 2026-01-28 | 초기 BDD 수용 기준 작성 |
| 1.1.0 | 2026-01-28 | FR-004, FR-006 BDD 시나리오 추가, 테스트 우선순위 매핑 추가 |
