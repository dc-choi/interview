---
tags: [typescript, effect, error-handling, concurrency]
status: done
verified_at: 2026-10-06
category: "CS - TypeScript"
aliases: ["Effect Typed Errors", "Effect 오류 채널"]
---

# Effect의 오류 타입과 실행 경계

Effect는 성공 값, 예상한 실패, 필요한 서비스를 하나의 타입으로 표현하고 실행을 조합하는 TypeScript 라이브러리다. 아래 API 설명은 Effect 4 공식 문서 기준이다.

## 성공, 실패와 요구사항

`Effect<A, E, R>`에서 `A`는 성공 값, `E`는 예상한 오류, `R`은 실행에 필요한 서비스다. Effect 값을 만들 때 작업을 바로 실행하지 않고, 실행할 계산을 구성한다. 실제 작업은 런타임 실행 단계에서 시작한다.

예를 들어 `Effect<User, NotFound | HttpError, UserRepository>`는 사용자 조회의 성공 값, 복구 가능한 실패 두 종류와 저장소 의존성을 표현한다. `Promise<User>`의 타입 매개변수에는 이런 오류와 의존성 계약이 담기지 않는다.

## 오류 채널이 모든 실패를 뜻하지는 않는다

| 구분 | 의미 | 처리 경계 |
|---|---|---|
| 예상 오류(failure) | 입력 거부, 대상 없음처럼 모델링한 실패 | `E`에 표현하고 `Effect.catch`나 `Effect.catchTag`로 복구 |
| 결함(defect) | 예상 오류로 모델링하지 않은 예외나 버그 | 예상 오류 처리와 구분해 원인을 관측 |
| 중단(interruption) | 실행 취소 | 업무 오류로 삼아 재시도하지 않고 취소 흐름을 고려 |

`Effect.catch`는 예상 오류를 처리하며 결함과 중단을 함께 잡는 연산이 아니다. 전체 실패 원인이 필요하면 `Effect.catchCause`를 검토한다. 따라서 `E`가 `never`라는 사실을 실행 중 문제가 발생할 수 없다는 보장으로 해석하지 않는다.

## 조합하면서 바뀌는 계약

- `_tag`로 구분한 `NotFound`를 `Effect.catchTag`에서 성공 값으로 복구하면 그 오류는 처리 이후의 예상 오류 채널에서 제거된다. 복구 코드가 새로 실패할 수 있으면 새 오류가 남는다.
- `Effect.timeout`은 제한 시간에 도달했을 때 원래 실행을 중단하고 예상 오류인 `TimeoutError`로 실패할 수 있다.
- `Schedule.recurs(2)`를 재시도 스케줄로 사용하면 최초 실행 뒤 최대 두 번 더 시도하므로 전체 시도는 최대 세 번이다.

조회 실패를 기본값으로 바꾸는 것과 결제 실패를 다시 실행하는 것은 다른 정책이다. 라이브러리가 오류를 표현해도 어떤 실패를 재시도할지, 총 대기 시간을 얼마로 둘지, 외부 부수효과를 어떻게 중복 방지할지는 업무 계약으로 정해야 한다. [[Retry-Backoff-Jitter|재시도 예산]]과 [[Idempotency-Key|멱등 키]]를 함께 확인한다.

## 버전과 도입 판단

Effect 4는 여러 기존 패키지를 핵심 패키지로 통합했지만 모든 모듈이 안정화됐다는 뜻은 아니다. 공식 릴리스 안내의 `@stability unstable` 또는 `@stability experimental` 표시는 minor나 patch 릴리스에서도 변경될 수 있는 범위를 뜻한다. 사용하는 모듈의 안정성 표기를 따로 확인한다.

다음은 도입 검토 기준이다. 제품 자체의 성능 보장이나 일괄 전환 권고가 아니다.

- 오류 종류와 재시도, 취소, 의존성 처리가 여러 함수에 흩어져 있다면 대표 흐름 하나에서 계약이 더 명확해지는지 확인한다.
- 단순한 비동기 호출 몇 개라면 기존 Promise와 명시적인 오류 처리로 충분한지 먼저 판단한다.
- 도입 범위의 입출력 경계를 정하고 기존 Promise 기반 코드와 연결할 때 잃는 오류 정보를 확인한다.
- 자체 벤치마크의 배율을 서비스 응답 시간 개선으로 옮기지 않는다. 실제 의존성과 실패 경로를 포함해 측정한다.

## 출처

- [Effect Documentation, Effect API](https://effect.website/docs/v4/api/effect/Effect)
- [Effect Documentation, Two Types of Errors](https://effect.website/docs/v4/error-management/two-error-types)
- [Effect Documentation, Expected Errors](https://effect.website/docs/v4/error-management/expected-errors)
- [Effect Documentation, Timing Out](https://effect.website/docs/v4/error-management/timing-out)
- [Effect Documentation, Using Schedules](https://effect.website/docs/v4/scheduling/using-schedules)
- [Effect 4.0 — Effect Blog](https://effect.website/blog/releases/effect/40)

## 관련 문서

- [[Type-Driven-Development|타입 주도 개발]]
- [[Runtime-Validation-Libraries|런타임 입력 검증]]
- [[Retry-Backoff-Jitter|재시도, 지수 백오프와 지터]]
- [[Idempotency-Key|멱등성 키]]
