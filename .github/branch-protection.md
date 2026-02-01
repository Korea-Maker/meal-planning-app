# Branch Protection 설정 가이드

GitHub 저장소 설정에서 다음 Branch Protection 규칙을 적용하세요.

## main 브랜치 보호 규칙

### Settings → Branches → Add branch protection rule

**Branch name pattern:** `main`

### 필수 설정

- [x] **Require a pull request before merging**
  - [x] Require approvals: `1` (팀 규모에 따라 조정)
  - [x] Dismiss stale pull request approvals when new commits are pushed
  - [x] Require review from Code Owners

- [x] **Require status checks to pass before merging**
  - [x] Require branches to be up to date before merging
  - Required status checks:
    - `lint-and-type-check`
    - `test-web`
    - `test-api`
    - `build`
    - `secret-scan`
    - `sast-python`
    - `sast-javascript`
    - `dependency-scan`
    - `codeql / Analyze (javascript-typescript)`
    - `codeql / Analyze (python)`

- [x] **Require conversation resolution before merging**

- [x] **Require signed commits** (권장)

- [x] **Require linear history** (권장 - squash merge 사용 시)

- [x] **Do not allow bypassing the above settings**

### 선택적 설정

- [ ] **Restrict who can push to matching branches**
  - 특정 팀/사용자만 push 허용

- [ ] **Allow force pushes**
  - ❌ 비활성화 권장

- [ ] **Allow deletions**
  - ❌ 비활성화 권장

## 자동화 설정 (GitHub CLI)

```bash
# GitHub CLI로 branch protection 설정
gh api repos/{owner}/{repo}/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["lint-and-type-check","test-web","test-api","build","secret-scan"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  --field restrictions=null \
  --field required_linear_history=true \
  --field allow_force_pushes=false \
  --field allow_deletions=false
```

## Ruleset 설정 (권장 - GitHub Enterprise)

GitHub Enterprise에서는 Repository Rulesets 사용을 권장합니다.
Settings → Rules → Rulesets에서 더 세밀한 규칙을 설정할 수 있습니다.
