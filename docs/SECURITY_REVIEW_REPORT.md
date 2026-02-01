# Meal Planning App 보안 리뷰 보고서

**검토일:** 2026-02-01
**검토자:** Security Reviewer Agent + Manual Review
**프로젝트:** meal-planning-app

---

## 요약 (Executive Summary)

| 심각도 | 발견 수 |
|--------|---------|
| **CRITICAL** | 3 |
| **HIGH** | 4 |
| **MEDIUM** | 5 |
| **LOW** | 3 |

**전체 위험 수준:** **CRITICAL** - 즉각적인 조치가 필요합니다.

---

## CRITICAL 이슈 (즉시 수정 필요)

### 1. 실제 API 키가 .env 파일에 하드코딩됨

**심각도:** CRITICAL
**카테고리:** Secrets Exposure (OWASP A02:2021)
**위치:** `apps/api/.env`

**문제:** OpenAI API 키와 Spoonacular API 키가 로컬 `.env` 파일에 노출되어 있습니다.

**즉각적인 조치:**
1. **OpenAI API 키 즉시 회전(rotate)** - OpenAI 대시보드에서 해당 키 폐기 후 새 키 발급
2. **Spoonacular API 키 회전**
3. `.env` 파일이 git에 커밋되지 않았는지 확인 (현재 안전함)

---

### 2. 약한 JWT Secret Key

**심각도:** CRITICAL (프로덕션 배포 시)
**카테고리:** Broken Authentication (OWASP A07:2021)
**위치:** `apps/api/.env`

**문제:** 개발용 JWT 시크릿 키가 예측 가능합니다.

**권장사항:**
```bash
# 안전한 시크릿 키 생성
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

---

### 3. Vercel OIDC 토큰 노출

**심각도:** CRITICAL
**카테고리:** Secrets Exposure
**위치:** `apps/web/.env.local`

**조치:** Vercel 대시보드에서 토큰 무효화

---

## HIGH 이슈

### 4. Debug 모드 기본값이 True

**위치:** `apps/api/src/core/config.py:19`

```python
debug: bool = True  # 기본값을 False로 변경 필요
```

### 5. Refresh Token 무효화 메커니즘 부재

**위치:** `apps/api/src/services/auth.py`

- 로그아웃 시 refresh token 무효화 없음
- Token rotation 미구현

### 6. 로그인 Rate Limiting 미구현

**위치:** `apps/api/src/api/v1/endpoints/auth.py`

설정값은 존재하나 실제 구현되지 않음.

### 7. CORS 와일드카드 메서드/헤더

**위치:** `apps/api/src/main.py:31-37`

```python
allow_methods=["*"],  # 제한 필요
allow_headers=["*"],  # 제한 필요
```

---

## MEDIUM 이슈

### 8. 비밀번호 복잡성 검증 부재
- **위치:** `apps/api/src/schemas/auth.py`
- 길이만 검증, 복잡성 미검증

### 9. Frontend localStorage 토큰 저장
- **위치:** `apps/web/lib/auth-context.tsx`
- XSS 공격에 취약

### 10. Dockerfile 비-root 사용자 미사용
- **위치:** `apps/api/Dockerfile`
- 컨테이너가 root로 실행됨

### 11. SSRF DNS Rebinding 가능성
- **위치:** `apps/api/src/services/url_extractor.py`

### 12. 민감한 사용자 정보 노출 가능성
- API 응답에서 UserResponse 스키마 검증 필요

---

## LOW 이슈

### 13. Security Headers 미설정
### 14. OpenAPI 문서 프로덕션 노출
### 15. 계정 삭제 시 확인 절차 부재

---

## 긍정적인 보안 사항

1. **bcrypt 비밀번호 해싱** (cost=12)
2. **SQLAlchemy ORM** - SQL Injection 방지
3. **Pydantic 입력 검증**
4. **SSRF 기본 보호** - 내부 IP 차단
5. **JWT 토큰 타입 검증** (access/refresh 구분)
6. **.gitignore** - `.env` 파일 제외됨
7. **위험한 코드 패턴 없음** - eval(), exec(), dangerouslySetInnerHTML 미사용

---

## 권장 조치 우선순위

| 우선순위 | 이슈 | 상태 |
|----------|------|------|
| 1 | API 키 회전 | ⚠️ 수동 조치 필요 |
| 2 | JWT Secret Key 강화 | ⚠️ 수동 조치 필요 |
| 3 | 로그인 Rate Limiting | ⏳ 추후 구현 |
| 4 | Refresh Token 블랙리스트 | ⏳ 추후 구현 |
| 5 | Debug 기본값 False | ✅ 수정 완료 |
| 6 | CORS 제한 | ✅ 수정 완료 |
| 7 | Dockerfile 비-root 사용자 | ✅ 수정 완료 |
| 8 | Security Headers | ✅ 수정 완료 |
| 9 | 비밀번호 복잡성 검증 | ✅ 수정 완료 |
| 10 | OpenAPI 프로덕션 비활성화 | ✅ 수정 완료 |

### 수정 완료 항목 (2026-02-01)

1. **config.py**: `debug` 기본값을 `False`로 변경
2. **main.py**:
   - CORS 메서드/헤더 제한 (`["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"]`)
   - Security Headers 미들웨어 추가 (X-Content-Type-Options, X-Frame-Options, HSTS 등)
   - OpenAPI 문서 프로덕션 비활성화
3. **Dockerfile**: 비-root 사용자(`appuser`) 추가
4. **auth.py**: 비밀번호 복잡성 검증 추가 (대문자, 소문자, 숫자 필수)

---

## CI/CD 보안 파이프라인 (구축 완료)

본 리뷰와 함께 다음 보안 CI/CD 파이프라인이 구축되었습니다:

| 워크플로우 | 목적 |
|-----------|------|
| `security.yml` | SAST (Bandit, Semgrep), Secret scan (Gitleaks), SCA (Trivy) |
| `ci.yml` | 린트, 테스트, 빌드 |
| `container-security.yml` | Hadolint, Grype 컨테이너 스캔 |
| `codeql.yml` | CodeQL 심층 분석 |
| `release.yml` | 보안 게이트 포함 릴리즈 |

---

**보고서 종료**
