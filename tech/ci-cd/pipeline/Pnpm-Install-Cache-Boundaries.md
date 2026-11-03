---
tags: [ci-cd, pnpm, dependency-management, cache]
status: done
verified_at: 2026-11-03
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["pnpm 설치 캐시의 재사용 경계", "pnpm Install Cache Boundaries"]
---

# pnpm 설치 캐시의 재사용 경계

캐시 적중과 빌드 결과의 재사용 가능성은 구분한다. 빌드가 참조하는 환경을 캐시 키가 표현하지 못하면, 저장된 결과가 있어도 다시 빌드해야 할 수 있다.

## 빌드 결과를 재사용하지 않을 패키지

pnpm 12.14.0은 `sideEffectsCache.exclude`를 추가했다. 시스템 라이브러리에 링크하는 네이티브 애드온처럼 캐시 키에 담기지 않는 조건에 빌드 결과가 의존할 때 쓰는 설정이다.

- 지정한 패키지는 프로젝트마다 빌드하며, 로컬과 `remoteCache` 서버의 side-effects cache에서 빌드 결과를 복원하거나 저장하지 않는다.
- global virtual store에서는 해당 패키지와 그 패키지에 의존하는 패키지가 프로젝트별 사본을 갖는다.
- 항목은 `name`, `@scope/*`, `name@version` 패턴을 지원한다.

이 설정은 해당 빌드 결과의 재사용을 제한한다. 모든 의존성 다운로드 캐시를 끈다는 뜻으로 확대하지 않는다.

## 설치 시간이 달라지는 다른 이유

같은 릴리스에는 캐시 적중률 외에도 설치 시간을 바꿀 수 있는 변경이 있다.

| 변경 | 적용 범위 |
|---|---|
| 일일 업데이트 확인을 기다리지 않음 | `install`, `add`. 명령이 먼저 끝나면 알림을 생략하고 다음번에 다시 확인 |
| 사용하지 않는 catalog 항목이 있어도 lockfile 재사용 | `install`, `add`, `update`. 불필요한 전체 의존성 재해석 방지 |
| git 의존성의 브랜치나 태그 조회 중복 제거 | `install` 실행당 한 번 조회. 기존 `linkWorkspacePackages` 환경의 프로젝트별 반복 조회 개선 |
| 스토어에 추가가 없으면 디렉터리 수정 시각 유지 | 수정 시각을 보는 CI 캐시의 불필요한 재업로드 방지 |

업데이트 알림이 없다고 확인 기능이 꺼진 것은 아니다. 캐시를 복원했다고 빌드까지 생략되는 것도 아니다.

## CI에서 확인할 것

다음은 릴리스 동작을 점검에 적용한 제안이다. 성능 측정 결과는 아니다.

1. 같은 소스, lockfile과 설치 범위에서 pnpm 버전만 바꿔 비교한다.
2. 제외 패키지의 빌드가 실제 실행됐는지 로그로 확인한다. 전체 캐시 적중률만으로 판정하지 않는다.
3. 다운로드, 의존성 해석, 빌드와 캐시 업로드 시간을 나눠 기록한다.
4. 제외 여부는 빌드 시간보다 환경 의존성과 재사용 안전성으로 판단한다.

2026-11-03에 12.14.0 공식 릴리스 노트의 해당 항목을 대조했다. 설치 재현, 내부 구현과 성능 효과는 검증하지 않았다.

## 출처

- [pnpm 12.14.0 릴리스 노트 — pnpm](https://github.com/pnpm/pnpm/releases/tag/v12.14.0) — `sideEffectsCache.exclude`와 Installing packages의 관련 변경 확인.

## 관련 문서

- [[Dependency-Management|의존성 관리]]
- [[GitHub-Actions|GitHub Actions 캐시]]
- [[Toolchain-Upgrade-CI-Build-Time|툴체인 업그레이드 뒤 CI 빌드 시간 비교]]
