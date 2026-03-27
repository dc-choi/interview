---
tags: [cicd, docker]
status: done
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Docker Image Pipeline", "Docker 이미지 파이프라인"]
---

# Docker Image Build Pipeline

소스 코드 변경부터 Docker 이미지 빌드, 레지스트리 push, 서버 배포까지의 자동화된 파이프라인이다.

## 파이프라인 흐름

1. **코드 변경 감지** — paths-filter로 API 관련 파일 변경 확인
2. **이미지 빌드** — Multi-stage Dockerfile로 최적화된 이미지 생성
3. **레지스트리 Push** — Docker Hub에 latest + SHA 태그로 push
4. **서버 배포** — SSH 접속 후 docker compose로 컨테이너 교체

## 태그 전략

| 태그 | 용도 | 예시 |
|---|---|---|
| `latest` | 항상 최신 버전 | `school-api:latest` |
| `${{ github.sha }}` | 특정 커밋 추적 | `school-api:a1b2c3d` |

SHA 태그를 함께 push하면 문제 발생 시 특정 버전으로 즉시 롤백할 수 있다.

## Docker Hub 인증

GitHub Actions에서 Docker Hub에 push하려면 `docker/login-action`으로 인증한다. 자격 증명은 GitHub Secrets에 저장한다.

## 배포 방식: SSH + Docker Compose

GitHub Actions에서 SSH로 운영 서버에 접속하여 배포를 실행한다.

배포 명령:
- `docker compose pull` — 레지스트리에서 최신 이미지 pull
- `docker compose up -d` — 백그라운드에서 컨테이너 재시작
- `docker image prune -f` — 사용하지 않는 이미지 정리

이 방식은 단순하고 소규모 서비스에 적합하다. 대규모에서는 K8s + ArgoCD 같은 GitOps 방식을 고려한다.

## 면접 포인트

Q. Docker 이미지 배포 파이프라인은 어떻게 구성했는가?
- GitHub Actions에서 Multi-stage 빌드 → Docker Hub push (latest + SHA 태그) → SSH 배포
- 변경 감지로 불필요한 빌드 방지, SHA 태그로 롤백 가능

## 관련 문서
- [[GitHub-Actions]]
- [[Multi-Stage-Build|Multi-stage build]]
- [[Docker-Compose|Docker Compose]]
