---
tags: [testing, isolation]
status: done
verified_at: 2026-08-05
category: "테스트&품질(Testing&Quality)"
aliases: ["Test Isolation", "테스트 격리"]
---

# Test Isolation

각 테스트가 다른 테스트의 상태에 영향을 주거나 받지 않도록 격리하는 원칙이다. 테스트 실행 순서에 상관없이 항상 같은 결과가 나와야 한다.

## 왜 필요한가

격리되지 않은 테스트의 문제:
- 테스트 A가 DB에 데이터를 남기면 테스트 B가 예상치 못한 데이터와 만남
- 병렬 실행 시 공유 상태(DB, 파일)에서 경합 발생
- 실행 순서에 따라 결과가 달라지는 "flaky test"

## 격리 전략

### 1. 테스트별 상태 초기화

각 테스트 전후에 상태를 초기화한다.

- `beforeEach` — mock 초기화, ID 카운터 리셋
- `afterEach` — 생성된 데이터 정리
- `vi.clearAllMocks()` — 모든 mock의 호출 기록 초기화

### 2. Mock 기반 격리

실제 외부 시스템 대신 mock을 사용하면 자연스럽게 격리된다.

- DB mock: 실제 DB에 데이터가 남지 않음
- 네트워크 mock: 외부 API 호출 없음
- 시간 mock: `vi.useFakeTimers()`로 시간 의존 테스트 격리

### 3. 컨텍스트 분리

tRPC caller factory 패턴으로 각 테스트마다 독립적인 사용자 컨텍스트를 생성한다.

- 테스트 A는 `accountId: 1`로, 테스트 B는 `accountId: 2`로 실행
- 조직(organization) 스코프도 테스트별로 다르게 설정
- 권한(ADMIN/TEACHER) 분리 테스트도 가능

### 4. 순차 실행 (Sequential) — 완화책

순차 실행은 격리 설계의 대체물이 아니라 경합이 드러날 확률을 낮추는 완화책이다. 공유 자원을 그대로 두면 순서 의존과 잔여 데이터 문제는 남는다. 병렬로 돌려야 한다면 worker별 database, schema 또는 container로 namespace를 나누는 것이 정공법이다 ([[HTTP-API-Integration-Testing|HTTP API 통합 테스트]]).

Vitest 3까지는 `pool: 'forks'`와 `poolOptions.forks.singleFork: true`로 단일 child process 실행을 강제했다. Vitest 4는 `poolOptions`를 제거하면서 이 설정을 `maxWorkers: 1`과 `isolate: false` 조합으로 대체했다. 즉 순차 실행을 끝까지 밀면 파일 단위 격리(`isolate`, 기본값 `true`)를 오히려 끄게 된다. 워커 수만 줄이려면 `fileParallelism: false` 또는 `maxWorkers: 1`을 쓰고 `isolate`는 유지한다.

## 단위 테스트 vs 통합 테스트 격리

| 구분 | 단위 테스트 | 통합 테스트 |
|---|---|---|
| 격리 대상 | 외부 의존성 (DB, API) | 테스트 간 공유 상태 |
| 방법 | Mock/Stub | 트랜잭션 롤백, DB 초기화 |
| 실행 | mock 격리 위에서 병렬 가능 | worker별 namespace 분리, 없으면 순차로 완화 |
| 타임아웃 | 짧게 (10초) | 길게 (30초) |

## Vitest 설정 예시

- 단위 테스트: `include: ['test/*.test.ts']`, `testTimeout: 10000`
- 통합 테스트: `include: ['test/integration/**/*.test.ts']`, `testTimeout: 30000`
- 공통: `sequence: { concurrent: false }` — 한 파일 안의 테스트를 순차로 실행하는 Vitest 기본값

## 면접 포인트

Q. 테스트 격리를 어떻게 보장하는가?
- beforeEach에서 mock/상태 초기화
- 테스트별 독립 컨텍스트(사용자, 조직) 생성
- 병렬 실행 시 worker별 database, schema로 namespace 분리, 순차 실행은 그것이 없을 때의 완화책

Q. Flaky test는 어떻게 해결하는가?
- 공유 상태 제거 (mock 기반 격리)
- 시간 의존 테스트는 fake timer 사용
- ID 카운터 리셋으로 테스트 간 데이터 충돌 방지

## 관련 문서
- [[Test-Fixture|Test fixture 전략]]
- [[HTTP-API-Integration-Testing|HTTP API 통합 테스트]]
- Deterministic test (작성 예정: `Deterministic-Test`)

## 출처

- [Vitest 공식 문서, pool](https://vitest.dev/config/pool)
- [Vitest 공식 문서, isolate](https://vitest.dev/config/isolate)
- [Vitest 공식 문서, fileParallelism](https://vitest.dev/config/fileparallelism)
- [Vitest 공식 문서, sequence.concurrent](https://vitest.dev/config/sequence)
- [Vitest 공식 문서, Migration Guide](https://vitest.dev/guide/migration.html)
