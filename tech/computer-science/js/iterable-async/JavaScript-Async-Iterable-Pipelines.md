---
tags: [cs, javascript, async, promise, iterable, concurrency]
status: done
verified_at: 2026-08-04
category: "CS - JavaScript"
aliases: ["JavaScript Async Iterable Pipelines", "JavaScript 동시성 파이프라인"]
---

# JavaScript 비동기 이터러블 파이프라인

비동기 작업을 iterable로 표현하면 작업 후보 생성, 시작, 완료 수집을 분리할 수 있다. 다만 `Promise`와 lazy iterable을 함께 쓴다고 자동으로 부하가 제한되거나 작업이 취소되는 것은 아니다. 실행 시점과 동시성 정책을 코드로 명시해야 한다.

## 시간과 작업을 sequence로 본다

`range`는 숫자 배열뿐 아니라 최대 시도 횟수나 page 후보를 만드는 실행 계획으로 볼 수 있다. `takeWhile`은 predicate가 참인 동안, `takeUntil`은 종료 조건을 처음 만난 값까지 소비한다. 이름이 비슷해도 경계값 포함 여부는 라이브러리마다 확인해야 한다.

```ts
async function repeatUntilStopped(
  run: () => Promise<void>,
  signal: AbortSignal,
): Promise<void> {
  while (!signal.aborted) {
    await run();
    await delay(5_000, signal);
  }
}
```

async callback을 `setInterval`에 넘기면 이전 Promise가 끝나기 전에 다음 callback이 새 작업을 시작할 수 있다. 완료 후 다음 실행을 예약하는 loop는 overlap을 피하기 쉽지만, process restart와 다중 instance 중복 실행은 막지 못한다. 중요한 job은 durable scheduler, lease/lock과 실행 이력을 함께 사용한다.

## Promise 생성과 작업 시작을 분리한다

```ts
const jobs = urls.map((url) => () => fetch(url));
```

위 배열은 아직 요청을 시작하지 않은 thunk 목록이다. 반대로 `urls.map(fetch)`는 `Promise.all`을 호출하기 전에 요청이 시작될 수 있다. lazy container가 이미 시작된 Promise를 감싸면 시작 시점은 되돌릴 수 없다.

`Promise.all(iterable)`은 입력 순서로 결과를 모으고 첫 rejection으로 반환 Promise를 reject한다. 이미 시작된 나머지 작업을 취소하지는 않는다. 실패 뒤에도 외부 effect가 계속될 수 있으므로 `AbortSignal`, 개별 결과 수집과 보상 정책을 별도로 둔다.

## 동시성 제한은 scheduler의 책임이다

입력 전체를 `Promise.all`에 넣는 방식은 작은 고정 집합에는 단순하지만, 이미지, API와 DB 작업이 많으면 socket, memory, provider quota를 고갈시킬 수 있다.

```ts
async function mapConcurrent<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await task(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
```

- `limit`은 CPU 수가 아니라 downstream capacity와 latency를 기준으로 조정한다.
- 입력 순서 보존과 완료 순서 streaming은 다른 API 계약이다.
- 하나가 실패하면 즉시 중단할지, 나머지를 마친 뒤 오류 목록을 반환할지 정한다.
- timeout, retry와 cancellation이 같은 작업을 중복 실행하지 않게 idempotency를 검토한다.
- 무한 또는 큰 원천은 결과 전체를 배열에 모으지 말고 async iterable/stream과 backpressure를 쓴다.

JavaScript에서 I/O 요청을 동시에 진행하는 것은 concurrency다. worker thread나 별도 process가 없다면 JavaScript callback 자체가 여러 CPU core에서 병렬 실행된다는 뜻은 아니다.

## async iterable과 for await

async iterable은 `[Symbol.asyncIterator]()`가 async iterator를 반환하고, 그 iterator의 `next()`가 iterator result로 resolve되는 Promise를 반환하는 protocol이다. `for await...of`는 async iterable을 순차 소비하며 sync iterable도 fallback으로 받을 수 있고 각 값이 Promise라면 await한다.

```ts
for await (const chunk of stream) {
  await persist(chunk);
}
```

loop body가 매번 await되므로 위 코드는 기본적으로 한 항목씩 처리한다. 독립 작업의 bounded concurrency가 필요하면 별도 scheduler를 둔다. `break`, `throw`와 조기 종료 시 iterator의 `return()`이 호출될 수 있으므로 generator의 `finally`, stream cancellation과 resource cleanup을 구현한다.

## skip과 error channel을 섞지 않는다

일부 library는 lazy filter가 제외한 값을 특별한 rejected Promise로 표시하고 내부 `catch`에서 삼킨다. 이는 library 내부 protocol일 수 있지만 domain error와 같은 rejection channel을 공유하면 다음 문제가 생긴다.

- 누락된 catch가 unhandled rejection을 만든다.
- 실제 장애를 skip으로 오인해 조용히 버릴 수 있다.
- library 밖으로 sentinel이 새면 caller가 의미를 알 수 없다.

public API에서는 tagged result, Option 또는 library가 완전히 캡슐화한 sentinel로 skip을 표현한다. `catch(() => undefined)`로 모든 rejection을 잠재우지 말고 예상한 sentinel만 구분하며 나머지는 다시 throw한다.

## DB 호출은 connection budget을 지킨다

독립 query를 동시에 시작하면 wall-clock latency가 줄 수 있지만 무제한 동시 실행은 pool 대기와 DB 부하를 늘린다.

- transaction의 작업은 같은 connection/transaction manager를 사용하고 의존 순서를 보존한다.
- 독립 조회만 pool 크기보다 작은 bounded concurrency로 실행한다.
- 결과 전체를 메모리에 모을지 cursor/stream으로 소비할지 정한다.
- query cancellation, statement timeout과 request abort를 연결한다.
- 순차/동시 실행 차이는 실제 query plan, pool wait와 DB CPU/I/O로 측정한다.

## UI에서는 lifecycle과 보안을 같이 다룬다

템플릿 literal은 HTML을 escape하지 않는다. 외부 문자열을 `innerHTML`로 합치면 XSS가 될 수 있으므로 `textContent`, DOM node 생성 또는 검증된 sanitizer를 사용한다.

이벤트와 비동기 UI helper는 재사용성만큼 정리 시점이 중요하다.

```ts
const controller = new AbortController();
button.addEventListener("click", onClick, { signal: controller.signal });

// component 해제 시 listener도 제거
controller.abort();
```

- custom confirm Promise는 resolve/reject가 한 번만 일어나고 DOM/listener가 항상 정리되어야 한다.
- 이미지 preload는 loading, success, error, abort를 모두 terminal state로 취급한다.
- 화면 표시 순서를 보존할지 먼저 완료된 이미지를 먼저 보일지 UX 계약으로 정한다.
- 상위 scope를 읽는 함수와 입력만 받는 함수를 분리하면 test와 reuse가 쉬워진다.
- before/after callback을 무제한으로 늘리기보다 수명주기와 실패 전파 규칙을 가진 작은 interface를 만든다.

## 고차 함수의 좋은 경계

고차 함수는 특정 data shape와 DOM selector를 분리하는 데 유용하다. 그러나 함수 수를 늘리는 것 자체가 abstraction은 아니다.

- domain-independent scheduling과 domain policy를 분리한다.
- closure가 참조하는 mutable state를 최소화한다.
- 이름에 실행 시점, effect와 결과 순서를 드러낸다.
- 범용 helper는 boundary case를 property/table test로 검증한다.
- 한 번만 쓰이는 얇은 wrapper가 control flow를 숨기면 inline이 더 낫다.

## 백엔드 적용

NestJS에서는 controller가 받은 요청을 바로 거대한 `Promise.all`로 펼치기보다 application service가 작업 plan을 만들고 adapter가 제한된 concurrency로 외부 API를 호출하게 나눌 수 있다. worker는 다음 항목을 함께 가져야 한다.

- provider별 timeout과 concurrency budget
- `AbortSignal` 또는 SDK가 제공하는 cancellation 전달
- idempotency key와 retry/backoff policy
- queue depth, in-flight 수, latency와 error metric
- shutdown 때 신규 작업 중단과 in-flight drain

금전 대사는 일반 동시성 helper만으로 안전해지지 않는다. 별도 불변식은 [[Payment-Reconciliation-Worker|결제 대사 worker]]에서 다룬다.

## 출처

- [ECMAScript Language Specification, Promise.all](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.all)
- [DOM Standard, aborting ongoing activities](https://dom.spec.whatwg.org/#aborting-ongoing-activities)
- [Node.js, Timers Promises API](https://nodejs.org/api/timers.html#timers-promises-api)
- [TypeORM, transactions](https://typeorm.io/docs/advanced-topics/transactions/)
- async iteration: [async/await](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=49884), [async iterator](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=49911), [for await](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=49932)
- 작업 sequence: [range/take](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19715), [takeWhile/takeUntil](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19716), [작업을 iterable로 보기](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=19717)
- frontend 구성: [template literal](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=20518), [이미지 목록](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=20519), [item 삭제](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=20521), [custom confirm](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=20522), [함수 abstraction](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=20523), [이미지 concurrency](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=20582), [부하 제한](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=20583), [고차 함수 분리](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=20584), [scope 의존 분리](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=20585), [DOM 고차 함수](https://www.inflearn.com/courses/lecture?courseId=324019&unitId=20586)
- lazy Promise pipeline: [lazy map/take](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16625), [async filter](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16626), [reduce sentinel](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16627), [lazy 효율](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16628), [concurrent reduce 1](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16629), [concurrent reduce 2](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16630), [concurrent map/filter](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16631), [평가 전략 조합](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16632), [정리](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16633), [Node.js SQL](https://www.inflearn.com/courses/lecture?courseId=247815&unitId=16634)

## 관련 문서

- [[JavaScript-Iterable-Functional-Pipelines|JavaScript 이터러블 함수형 파이프라인]]
- [[Promise-Async|Promise와 async]]
- [[Async-Programming-Patterns|비동기 프로그래밍 패턴]]
- [[External-Service-Resilience|외부 서비스 장애 대응]]
- [[Graceful-Shutdown|Graceful Shutdown]]
