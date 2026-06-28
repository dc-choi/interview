---
tags: [ci-cd, monorepo, build-cache, dependency, observability]
status: done
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Monorepo CI/CD", "모노레포 CICD", "모노레포 캐시", "Turborepo", "Fan-in Fan-out", "Cache Invalidation Cascade", "순환 의존 감지"]
---

# 모노레포 CI/CD와 플랫폼 건강 관리

모노레포가 수십에서 수백 개 패키지로 커지면 빌드, 검증 비용과 변경 전파를 사람이 추적할 수 없다. CI 파이프라인을 아티팩트 기준으로 독립 병렬화하고, 캐시 키를 정밀하게 다루며, 의존성 건강 지표를 도구로 측정해야 모노레포가 모놀리스로 퇴화하지 않는다. 패키지 독립성의 개념은 [[Monorepo-Architecture|모노레포 아키텍처]]를 전제로 한다.

## CI — 아티팩트 기준 독립 병렬 파이프라인

lint, type-check, test 세 검증을 서로 독립적으로 병렬 실행한다. lint가 실패해도 type-check, test는 계속 돌아가고, 개발자는 PR 하나로 세 결과를 동시에 받는다. 독립이 가능한 근거는 **각 도구가 소비하는 아티팩트가 다르다**는 데 있다.

- **lint (biome, eslint)** — 소스 파일의 AST만 파싱한다. 코드를 실행하거나 컴파일하지 않으므로 하위 패키지의 빌드 결과도, 타입 선언도 필요 없다(의존성 0). 주의: `@typescript-eslint`의 타입 인지 룰(예: no-unsafe-assignment)을 켜면 lint가 tsc 결과에 의존하게 되므로, 타입 검사는 type-check 파이프라인에 맡기고 linter에서는 분리하는 편이 독립성을 지킨다.
- **type-check (tsc)** — 하위 의존성의 타입 정보가 필요하지만 `.d.ts` 선언 파일만 있으면 되고 실행 가능한 `.js` 번들은 필요 없다. 타입 체크는 코드 실행이 아니라 타입 구조 분석이기 때문이다. `emitDeclarationOnly: true`로 `.js` 없이 `.d.ts`만 출력하면 type-check가 번들러 파이프라인과 완전히 분리된다. `composite: true`와 `incremental: true`를 함께 쓰면 `.tsbuildinfo`에 이전 결과가 캐시돼 변경된 파일만 재분석한다(패키지가 늘어도 점진적으로 빨라짐).
- **test (vitest, RTL)** — 코드를 실제 실행하므로 하위 패키지의 `.js` 번들이 필요하다(번들러 선행). 반대로 `.d.ts`는 런타임에 존재하지 않으므로 불필요하다.

요지는 타입 선언(`.d.ts`)과 실행 번들(`.js`)을 별도 아티팩트로 분리 산출하면 type-check와 test가 서로의 결과를 기다리지 않는다는 것이다. 세 파이프라인은 서로의 원인도 결과도 아니어서 피드백 루프가 최소화된다.

## pnpm workspace 빌드 메커니즘

Build-time 통합은 pnpm workspace의 `workspace:*` 참조로 성립한다. pnpm은 모듈 해석 과정에서 파일을 content-addressable store에 저장하고, 프로젝트의 `node_modules/.pnpm` virtual store에는 이를 hardlink로 배치하며, 실제 의존성 그래프는 symlink로 구성한다(디스크 절약 + 엄격한 의존성 격리). `workspace:*` 프로토콜은 개발 중에는 workspace 패키지를 반드시 symlink로 참조하고, npm registry에 publish, pack 할 때는 실제 버전 번호로 자동 변환한다.

## 캐시 — 가장 조용한 성능 킬러

거대한 모노레포의 CI는 방치하면 한 번에 터지지 않고 서서히 누적되며 느려져 병목 지점을 찾기 어렵다. Turborepo의 캐시 키는 `turbo.json`의 `inputs`에 지정된 파일들의 해시 합산이라, inputs를 느슨하게 잡으면 불필요한 무효화가 일어난다.

- **캐시 무효화 전파(Cache Invalidation Cascade)** — 하위 계층(entity) 패키지 하나가 바뀌면 이를 직접, 간접으로 의존하는 feature, service, fragment 계층 전체의 캐시가 무효화된다. 가장 조용하고 위험한 성능 저하 원인이다.
- **inputs 정밀화** — `package.json` 전체를 inputs에 넣으면 description 필드 변경만으로도 캐시가 깨진다. 빌드 결과에 실제 영향을 주는 항목(dependencies, 소스, 설정)만 캐시 키에 반영하고, lint, typecheck, test, build마다 inputs, outputs, dependsOn을 분리해야 한다.
- **pnpm-lock.yaml 변경** — 외부 패키지 버전 업그레이드를 의미하므로 대부분의 도구가 전체 캐시를 무효화한다. 외부 패키지 업그레이드는 CI 부하가 크므로, 매번 조금씩보다 주기적으로 일괄 업그레이드하는 편이 CI 비용 면에서 효율적일 수 있다.

## 플랫폼 건강 지표 (의존성 관측)

사람이 못 보는 전파를 도구로 가시화한다. 핵심 두 지표는 fan-in과 fan-out이다.

- **Fan-in(진입 차수)** — 그 패키지를 참조하는 패키지 수. 높을수록 변경의 전파 범위가 넓다(shared-utils의 fan-in이 50이면 변경 시 최대 50개 재빌드). Turborepo, Nx의 affected가 자동 계산하지만, 지표 자체를 추적하면 변경 시 특히 조심해야 할 패키지를 팀이 인식한다. CI에서 임계값 초과 시 PR에 자동 경고를 남길 수 있다.
- **Fan-out(진출 차수)** — 그 패키지가 참조하는 패키지 수. 비정상적으로 높으면 한 패키지가 지나치게 많은 역할을 한다는 신호로, 분할이 필요할 수 있다.
- **런타임 의존성** — manifest 기반으로 런타임에 통합되는 fragment는 Host가 직접 참조하지 않아 정적 의존성 그래프에 안 잡힌다. manifest 파일의 변경 이력을 따로 추적하고 E2E 테스트의 번들 로딩 추적으로 보완한다.
- **순환 의존(Circular Dependency)** — 계층 경계가 무너지기 시작할 때 가장 먼저 나타나는 신호. Tarjan의 강결합요소(SCC) 알고리즘이 O(V+E) 단일 DFS 순회로 모든 순환을 찾는다. 순환이 생기면 affected 분석의 정확도가 떨어지고, 그래프가 DAG가 아니게 돼 위상 정렬로 빌드 순서를 정할 수 없다. `madge --circular`를 pre-commit hook에 걸어 로컬에서 즉시 감지한다.
- **레이어 규칙 위반** — `@nx/enforce-module-boundaries`나 dependency-cruiser로 CI에서 차단한다. 순환 의존과 레이어 위반은 한 건도 허용하지 않고 경고가 아니라 에러로 처리해 PR 머지를 막아야 한다.

## 면접 체크포인트

- CI 3파이프라인 독립의 근거 = 소비 아티팩트 차이(AST / `.d.ts` / `.js`). `emitDeclarationOnly`로 type-check와 test를 분리
- `composite`/`incremental`/`.tsbuildinfo`로 타입 체크 점진 가속
- pnpm의 content-addressable store + hardlink/symlink, `workspace:*` 프로토콜
- 캐시 무효화 전파와 turbo `inputs` 정밀화, pnpm-lock 변경의 전체 무효화
- fan-in/fan-out으로 전파 범위와 책임 과다를 진단, 순환 의존을 Tarjan SCC로 검출하고 error로 차단

## 출처

- 모노레포가 모놀리스가 되지 않으려면 (2편) — 미리캔버스 프론트엔드 팀(종현 김), Medium

## 관련 문서

- [[Monorepo-Architecture|모노레포 아키텍처 (계층, 변화율, 공통 패키지 함정)]]
- [[Module-Federation|Module Federation (런타임 통합, 독립 배포)]]
- [[Dependency-Management|의존성 관리 (lock 파일, pnpm, Semver)]]
- [[CICD-Basics|CI/CD 기초 (파이프라인 단계, 트리거)]]
- [[RED-USE-Method|RED/USE 지표 (관측 지표 설계)]]
