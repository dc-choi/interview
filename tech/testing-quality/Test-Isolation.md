---
tags: [testing, isolation]
status: done
verified_at: 2026-10-13
category: "테스트&품질(Testing&Quality)"
aliases: ["Test Isolation", "테스트 격리"]
---

# Test Isolation

각 테스트가 다른 테스트의 상태에 영향을 주거나 받지 않도록 격리하는 원칙이다. 테스트 실행 순서에 상관없이 항상 같은 결과가 나와야 한다.

## 왜 필요한가

격리되지 않은 테스트의 문제:
- 테스트 A가 DB에 데이터를 남기면 테스트 B가 예상치 못한 데이터와 만남
- 병렬 실행 시 공유 상태(DB, 파일)에서 경합 발생
- 실행 순서에 따라 결과가 달라지는 flaky test

## 격리 전략

### 1. 테스트별 상태 초기화

각 테스트 전후에 상태를 초기화한다.

- `beforeEach` — mock 초기화, ID 카운터 리셋
- `afterEach` — 생성된 데이터 정리
- `vi.clearAllMocks()` — 모든 mock의 호출 기록 초기화

Vitest 5.0(2026-09-03 릴리스, Vite 6.4.0 이상과 Node.js 22.12.0 이상 필요)부터 `clearMocks` 기본값이 `true`로 바뀌어 매 테스트 전에 `vi.clearAllMocks()`가 자동으로 호출된다. Vitest 4 기본 설정에서 다음 테스트로 이어지던 호출 기록이 이제 테스트마다 지워지고, mock 구현은 그대로 남는다. setup 파일, 모듈 최상위, `beforeAll`에서 기록한 호출은 그 호출을 단언하는 테스트가 실행되기 전에 지워지므로 이런 테스트가 가장 큰 영향을 받는다. 이전 동작이 필요하면 `clearMocks: false`로 되돌린다. `test.concurrent` 같은 동시 실행 테스트에서는 `clearMocks`가 진행 중인 다른 테스트의 mock 기록까지 지울 수 있다.

같은 5.0부터 `resolves`, `rejects`, `toMatchFileSnapshot` 같은 비동기 단언을 `await`하지 않으면 테스트가 실패한다. Vitest 4는 테스트 끝에서 자동으로 기다리고 경고만 출력했다. `expect.poll`도 콜백이나 polling 중인 단언이 `timeout` 안에 끝나지 않으면 reject하고, 콜백이 받는 `AbortSignal`이 timeout에 abort된다. 이 신호로 timeout 뒤에도 남는 작업을 취소하면 다음 테스트로 상태가 새는 일을 줄일 수 있다.

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

worker별 namespace 이름에는 `maxWorkers` 이하로 제한되는 `VITEST_POOL_ID`를 활용할 수 있다. `VITEST_WORKER_ID`는 워커가 새로 만들어질 때마다 늘어나고 `maxWorkers`에 묶이지 않으므로 고정된 슬롯 수를 전제한 이름에 맞지 않는다(2026-10-13 Vitest의 Jest 마이그레이션 문서 기준). 별도 테스트 실행도 같은 DB를 쓰면 실행별 접두사를 더해 충돌을 피한다.

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
- 프로젝트 분리: Vitest 5.0부터 Vite 설정을 바꾸지 않는 인라인 프로젝트는 선언한 config의 Vite 서버를 공유한다(`sharedViteServer`, 기본값 `true`). 그 config 파일은 프로젝트마다가 아니라 한 번만 실행되고 플러그인도 한 번만 생성되어, 플러그인의 `config` 훅이 프로젝트별 test 옵션을 보지 못한다. 프로젝트마다 다르게 동작해야 하는 플러그인이 있으면 `sharedViteServer: false`로 끄거나 그 프로젝트를 별도 config 파일로 분리한다. config 파일이나 디렉터리로 참조한 프로젝트는 자기 Vite 설정과 서버를 따로 만든다

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
- [[Deterministic-Test|Deterministic test]]

## 출처

- [Vitest 공식 문서, pool](https://vitest.dev/config/pool)
- [Vitest 공식 문서, isolate](https://vitest.dev/config/isolate)
- [Vitest 공식 문서, fileParallelism](https://vitest.dev/config/fileparallelism)
- [Vitest 공식 문서, sequence.concurrent](https://vitest.dev/config/sequence)
- [Vitest 공식 문서, Migration Guide](https://vitest.dev/guide/migration.html)
- [Vitest 공식 문서, Migrating to Vitest 4.0](https://v4.vitest.dev/guide/migration)
- [Vitest 공식 문서, Migrating from Jest](https://vitest.dev/guide/migration/jest)
- [Vitest 공식 문서, clearMocks](https://vitest.dev/config/clearmocks)
- [Vitest 공식 문서, sharedViteServer](https://vitest.dev/config/sharedviteserver)
- [Vitest 5.0 is out! — Vitest Blog](https://vitest.dev/blog/vitest-5)
