FROM python:3.11-slim

# 보안: 비-root 사용자 생성
RUN groupadd -r appgroup && useradd -r -g appgroup -d /app -s /sbin/nologin appuser

WORKDIR /app

# Argos 모델 저장 디렉토리 설정
ENV XDG_DATA_HOME=/app/.local/share

# 의존성 설치 (root로 실행)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Argos Translate 영어-한국어 모델 다운로드 (빌드 시 미리 설치)
RUN mkdir -p /app/.local/share && \
    python -c "import argostranslate.package; \
    argostranslate.package.update_package_index(); \
    pkgs = [p for p in argostranslate.package.get_available_packages() if p.from_code == 'en' and p.to_code == 'ko']; \
    pkgs and argostranslate.package.install_from_path(pkgs[0].download())" && \
    chown -R appuser:appgroup /app/.local

# 애플리케이션 복사 (소유권 변경)
COPY --chown=appuser:appgroup . .

# 시작 스크립트 실행 권한 부여
RUN chmod +x start.sh

# 보안: 비-root 사용자로 전환
USER appuser

# 기본 포트 노출 (Railway는 PORT 환경변수로 오버라이드)
EXPOSE 8000

# 애플리케이션 실행
ENTRYPOINT ["./start.sh"]
