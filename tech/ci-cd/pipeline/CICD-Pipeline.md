---
tags: [cicd, github-actions, monorepo, docker, dependency-management]
status: index
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["CICD Pipeline", "CI 파이프라인 구현"]
---

# CI 파이프라인 구현

코드가 커밋에서 배포 가능한 아티팩트가 되기까지의 파이프라인 구현과 그 입력이 되는 의존성 관리를 모은다.

- [[GitHub-Actions|GitHub Actions]]: 워크플로 구조, 속도 최적화, 캐시
- [[Toolchain-Upgrade-CI-Build-Time|툴체인 업그레이드 뒤 CI 빌드 시간 비교]]: 같은 소스, 작업, 캐시 복원 조건의 전후 비교, Rust 1.99 Cargo의 CI 증분 컴파일 기본값과 우선순위, debug profile, workspace default-features, 진단 변경
- [[GitHub-Agentic-Workflows|GitHub Agentic Workflows (gh-aw)]]: Markdown 지시를 Actions workflow로 컴파일, 읽기 전용 에이전트와 safe outputs의 쓰기 분리, threat detection, 이그레스 허용 목록과 비용 상한
- [[GitLab-Duo-Agent-Platform|GitLab Duo Agent Platform]]: 에이전트와 플로우, 기본 플로우(리뷰, 파이프라인 수정, SAST 오탐), 트리거와 composite identity, Orbit 컨텍스트 그래프, 도구 통제와 감사, self-hosted 모델
- [[CI-Agent-Instruction-Files|CI에서 에이전트 지침 파일 다루기]]: CLAUDE.md와 AGENTS.md가 운영자 지시로 로드되는 위험, 도구 제한의 한계, 에이전트별 탐색 규칙, GitLab CODEOWNERS와 보호 브랜치 승인, 변경 감지 job, 보호된 변수, 병합 전 MR 실행 구간
- [[GitLab-Secrets-Manager|GitLab Secrets Manager]]: job 단위 시크릿 요청, 환경, 브랜치와 보호 브랜치 범위, 다른 그룹 fork의 job 실패, 권한과 조회 감사의 저장 조건, 이전 시 삭제
- [[Monorepo-CICD|모노레포 CI/CD]]: 아티팩트 기준 3파이프라인 독립, pnpm workspace, Turborepo 캐시 무효화 전파, fan-in/out, 순환 의존 Tarjan SCC와 플랫폼 건강 지표
- [[Docker-Image-Pipeline|Docker image build pipeline]]: 이미지 빌드, 태깅, 레지스트리
- [[Dependency-Management|의존성 관리]]: Lock 파일, Poetry, pnpm, Gradle, Semver, 취약점 스캔
- [[Pnpm-Install-Cache-Boundaries|pnpm 설치 캐시의 재사용 경계]]: 빌드 결과 캐시 제외, 설치 단계별 시간과 스토어 업로드 구분
- [[Dependency-Catalogs|의존성 카탈로그]]: 선언 버전 통합, pnpm/Yarn 지원 범위, 카탈로그 발행과 서비스 전환 정책
- [[Mise-Project-Toolchain|mise 프로젝트 도구 관리]]: 버전 요청과 lock, 셸과 자식 프로세스, 설정 우선순위, 신뢰와 bootstrap 재실행

## 함께 볼 문서

- [[CICD&배포(CICD&Delivery)|CI/CD&배포]]
