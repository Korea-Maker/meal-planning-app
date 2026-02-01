# 보안 정책 (Security Policy)

## 지원 버전 (Supported Versions)

| 버전 | 지원 상태 |
| --- | --- |
| 1.x.x | :white_check_mark: 지원 중 |
| < 1.0 | :x: 지원 종료 |

## 취약점 신고 (Reporting a Vulnerability)

보안 취약점을 발견하셨다면, **공개 이슈로 등록하지 마시고** 아래 방법으로 비공개 신고해 주세요.

### 신고 방법

1. **GitHub Security Advisories** (권장)
   - [Security Advisories](../../security/advisories/new)에서 새 보안 권고 작성

2. **이메일**
   - 보안팀 이메일로 직접 연락 (프로젝트 설정 필요)

### 신고 내용

- 취약점 유형 및 설명
- 재현 단계
- 영향 범위
- 가능하다면 수정 제안

### 대응 절차

1. **확인** - 신고 접수 후 48시간 내 확인 연락
2. **분석** - 취약점 심각도 평가 (CVSS 기준)
3. **수정** - 패치 개발 및 테스트
4. **공개** - 수정 완료 후 보안 권고 공개
5. **감사** - 신고자 크레딧 (원하시는 경우)

### 예상 대응 시간

| 심각도 | 대응 시간 |
| --- | --- |
| Critical (9.0-10.0) | 24시간 내 |
| High (7.0-8.9) | 7일 내 |
| Medium (4.0-6.9) | 30일 내 |
| Low (0.1-3.9) | 90일 내 |

## 보안 업데이트

- Dependabot이 의존성 취약점을 자동으로 감지하고 PR을 생성합니다
- 주요 보안 업데이트는 Release Notes에 명시됩니다

## 보안 모범 사례

이 프로젝트는 다음 보안 도구들을 CI/CD에 통합하여 사용합니다:

- **SAST**: Semgrep, Bandit, CodeQL
- **SCA**: Trivy, Dependabot
- **Secret Detection**: Gitleaks
- **Container Security**: Hadolint, Grype

## 면책 조항

이 프로젝트는 "있는 그대로" 제공됩니다. 보안 취약점이 없음을 보장하지 않으며,
사용으로 인한 손해에 대해 책임지지 않습니다.
