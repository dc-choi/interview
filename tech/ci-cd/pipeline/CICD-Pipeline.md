---
tags: [cicd, github-actions, monorepo, docker, dependency-management]
status: index
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["CICD Pipeline", "CI 파이프라인 구현"]
---

# CI 파이프라인 구현

코드가 커밋에서 배포 가능한 아티팩트가 되기까지의 파이프라인 구현과 그 입력이 되는 의존성 관리를 모은다.

- [[GitHub-Actions|GitHub Actions]]: 워크플로 구조, 속도 최적화, 캐시
- [[GitHub-Agentic-Workflows|GitHub Agentic Workflows (gh-aw)]]: Markdown 지시를 Actions workflow로 컴파일, 읽기 전용 에이전트와 safe outputs의 쓰기 분리, threat detection, 이그레스 허용 목록과 비용 상한
- [[Monorepo-CICD|모노레포 CI/CD]]: 아티팩트 기준 3파이프라인 독립, pnpm workspace, Turborepo 캐시 무효화 전파, fan-in/out, 순환 의존 Tarjan SCC와 플랫폼 건강 지표
- [[Docker-Image-Pipeline|Docker image build pipeline]]: 이미지 빌드, 태깅, 레지스트리
- [[Dependency-Management|의존성 관리]]: Lock 파일, Poetry, pnpm, Gradle, Semver, 취약점 스캔
- [[Dependency-Catalogs|의존성 카탈로그]]: 선언 버전 통합, pnpm/Yarn 지원 범위, 카탈로그 발행과 서비스 전환 정책

## 함께 볼 문서

- [[CICD&배포(CICD&Delivery)|CI/CD&배포]]
