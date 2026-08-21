---
tags: [rxjs, observable, reactive, async, nestjs]
status: done
verified_at: 2026-08-21
category: "OS & Runtime - NestJS"
aliases: ["RxJS Essentials", "RxJS 기본기"]
---

# RxJS 기본기

RxJS는 Observable을 중심으로 비동기 이벤트 흐름을 다루는 라이브러리다. NestJS 백엔드에서는 Interceptor 반환 타입과 `HttpService` 반환 타입이 Observable이라 프런트엔드 경험이 없어도 최소한의 RxJS를 쓰게 된다. 여기서는 Promise와의 차이, 구독 모델, 평탄화 연산자, 에러와 시간 제어, 누수 방지까지 백엔드에서 실제로 쓰이는 범위를 정리한다.

## Observable과 Promise

RxJS의 공식 정의는 Observable을 lazy push collection of multiple values, 즉 여러 값을 밀어 보내는 지연 컬렉션으로 잡는다. Promise와 비교하면 네 가지가 다르다.

| 축 | Promise | Observable |
| --- | --- | --- |
| 실행 시점 | 생성 시 즉시 실행 (eager) | `subscribe()` 할 때 실행 (lazy) |
| 값 개수 | 최대 1개 | 0개에서 무한개 |
| 실행 공유 | 한 번 실행하고 결과를 공유 | 구독마다 독립 실행 (unicast) |
| 취소 | 표준 취소 경로 없음 | `subscription.unsubscribe()` |

lazy가 핵심이다. `new Observable(subscribe => ...)` 안의 코드는 구독자가 생기기 전에는 실행되지 않고, 두 번 구독하면 부수 효과도 두 번 일어난다. 구독 자체가 함수 호출에 대응한다고 보면 된다.

흔한 오해 하나. Observable이 곧 비동기는 아니다. Observable은 값을 동기로도 비동기로도 전달할 수 있다. `of(1, 2, 3)`은 구독 시점에 동기로 세 값을 밀어 넣고 끝난다.

## Observable 계약과 구독

Observer는 `next`, `error`, `complete` 세 채널을 받고, 알림 순서는 `next*(error|complete)?` 문법을 따른다. 즉 `error`나 `complete`가 한 번 나가면 그 뒤로 `next`는 오지 않는다. 이 계약 덕분에 종료 시점 정리 로직을 한 곳에 둘 수 있다.

`subscribe()`는 Subscription을 돌려주고, `unsubscribe()`로 진행 중인 실행을 끊는다. Observable 생성 시 teardown 함수를 반환해 두면 그 안에서 타이머 해제나 소켓 종료 같은 자원 정리를 한다. HTTP 요청 중 클라이언트가 연결을 끊었을 때 하위 작업까지 중단할 수 있는 근거가 여기 있다.

## unicast와 multicast, Subject

일반 Observable은 unicast다. 구독자마다 별개의 실행이 생긴다. 흔히 cold라고 부르는 성질이 이것이다. 반대로 하나의 실행을 여러 관찰자가 공유하게 만들려면 Subject가 필요하다. 어떤 Observable 실행이든 여러 Observer가 나눠 보게 만드는 수단이 Subject라는 것이 공식 설명이다.

- `Subject`: Observable이면서 동시에 Observer다. `next(v)`, `error(e)`, `complete()`를 직접 호출해 값을 밀어 넣고, 등록된 구독자 전체에 multicast한다. 구독 이전에 흘러간 값은 받지 못한다.
- `BehaviorSubject`: 현재 값 개념을 갖는다. 초기값을 요구하고, 마지막으로 흘려보낸 값을 보관했다가 새 구독자가 붙는 즉시 그 값을 전달한다. 설정 값이나 연결 상태처럼 시점과 무관하게 지금 상태가 필요한 대상에 맞는다.
- `ReplaySubject`: 최근 N개를 기록했다가 새 구독자에게 재생한다. 보관 개수와 시간 창을 지정한다.
- `AsyncSubject`: 완료 시점의 마지막 값 하나만 전달한다.

백엔드에서 Subject를 쓰는 자리는 애플리케이션 내부 이벤트 버스, SSE 브로드캐스트, 상태 플래그 정도다. 요청 스코프 데이터를 전역 Subject에 담으면 요청 간 오염이 생기므로 주의한다.

## 평탄화 연산자 네 가지

`map`은 값을 값으로 바꾸지만, 값을 다시 Observable로 바꾸는 함수를 쓰면 Observable의 Observable이 된다. 이걸 하나의 스트림으로 펴는 것이 평탄화 연산자이고, 차이는 전부 동시성 정책에 있다.

| 연산자 | 새 값이 들어왔을 때 | 동시 실행 |
| --- | --- | --- |
| `mergeMap` | 이전 것을 두고 바로 구독 | 기본 무제한 (`concurrent` 인자로 상한 지정) |
| `switchMap` | 이전 inner 구독을 끊고 새로 구독 | 최대 1개, 최신 것만 |
| `concatMap` | 이전 inner가 complete할 때까지 대기 후 구독 | 1개, 순서 보장 |
| `exhaustMap` | 진행 중인 inner가 있으면 새 값을 버림 | 1개, 선점 우선 |

용도 매핑이 면접에서 그대로 질문으로 나온다.

- 자동완성 검색: `switchMap`. 새 키 입력이 들어오면 직전 요청 결과는 쓸모가 없으므로 구독을 끊는다. 늦게 도착한 응답이 최신 응답을 덮어쓰는 경쟁 상태를 구조로 막는다.
- 순서가 중요한 쓰기 작업: `concatMap`. 같은 자원에 대한 업데이트를 도착 순서대로 직렬화한다. 다만 소스가 inner의 완료보다 빠르게 계속 들어오면 대기 버퍼가 무한히 쌓일 수 있다고 공식 문서가 경고한다.
- 중복 제출 방지: `exhaustMap`. 저장 버튼 연타나 로그인 재요청처럼 처리 중일 때 들어온 요청을 무시하는 편이 맞는 경우다.
- 순서 무관 병렬 처리: `mergeMap`. 처리량이 목적일 때 쓰되, 외부 API를 호출한다면 `concurrent` 상한을 지정해 동시 호출 수를 제한한다.

`concatMap`은 `mergeMap`의 동시성을 1로 둔 것과 같다고 공식 문서가 밝히고 있어, 네 연산자를 동시성 정책의 변주로 묶어 설명하면 답변이 깔끔해진다.

## 에러와 시간 제어

- `catchError(selector)`: 에러 채널만 가로챈다. selector가 반환한 Observable로 스트림을 이어가거나, 다시 throw해 상위로 넘긴다. 도메인 예외를 HTTP 예외로 바꾸는 자리로 쓴다.
- `retry(count | config)`: 소스가 error를 내면 재구독한다. `count`를 생략하면 무한 재시도이고, `delay`로 재시도 간격이나 notifier 팩토리를 준다. `resetOnSuccess`는 성공 후 카운터를 초기화할지 정한다. 재시도는 재구독이므로 소스가 부수 효과를 가진 쓰기 작업이면 멱등성을 먼저 확인한다.
- `timeout({ first, each, with })`: `each`는 값 사이의 제한이며, `first`를 주지 않으면 구독 시점부터 카운트하므로 첫 값에도 적용된다. `first`는 첫 값에만 별도 상한을 두고 싶을 때 쓴다. `with`를 주지 않으면 `TimeoutError`를 낸다. 숫자 하나만 넘기면 `each`로 동작한다.

세 연산자를 조합할 때는 순서가 의미를 바꾼다. `retry` 앞에 `timeout`을 두면 시도마다 제한이 걸리고, 뒤에 두면 전체 재시도 예산에 제한이 걸린다.

## 구독 생명주기와 누수 방지

구독을 만들고 끊지 않으면 소스가 살아 있는 한 콜백과 클로저가 유지된다. 백엔드에서는 서버 수명 내내 도는 `interval`, Subject 구독, WebSocket 스트림이 위험 지점이다.

- `takeUntil(notifier)`: notifier가 값을 하나 내면 소스 미러링을 멈추고 complete한다. 종료 신호용 Subject를 하나 두고 `onModuleDestroy`에서 `next()`와 `complete()`를 호출하는 패턴이 무난하다.
- `take(n)`, `first()`: 필요한 개수만 받고 자동 종료한다.
- `firstValueFrom(source$)`: 첫 값이 오는 즉시 resolve하고 구독을 닫는다. 값 없이 complete하면 `EmptyError`로 reject하거나 지정한 기본값으로 resolve한다. 공식 문서는 값을 내거나 complete한다고 확신할 수 있는 소스에만 쓰라고 경고한다. 그렇지 않으면 promise가 영영 안 끝나고 async 함수 스택이 메모리에 남는다. 확신이 없으면 `timeout`이나 `take`를 앞에 붙인다.
- `lastValueFrom(source$)`: 마지막 값으로 resolve한다. 완료하지 않는 소스에는 쓰지 않는다.

RxJS 7에서 `toPromise()`는 deprecated로 표시됐고 이 둘이 대체한다. 이유는 두 가지로, 값 없이 complete하면 `undefined`로 resolve해 반환 타입이 `Promise<T | undefined>`가 된 점과, 이름만으로 첫 값과 마지막 값 중 무엇을 주는지 알 수 없던 점이다. 빈 스트림을 에러 대신 기본값으로 받고 싶으면 `{ defaultValue }` 옵션을 넘긴다.

## NestJS Interceptor가 RxJS를 쓰는 이유

Interceptor의 `intercept(context, next)`에서 `next.handle()`은 Observable을 반환한다. NestJS 공식 문서는 이 호출을 AOP 용어의 Pointcut으로 설명한다. `handle()`을 부르지 않으면 라우트 핸들러 자체가 실행되지 않고, 부른 뒤 돌아온 Observable에 연산자를 붙이면 핸들러 실행 이후 구간에 개입할 수 있다. 즉 Interceptor 하나가 핸들러 전후를 모두 감싼다.

Promise가 아니라 Observable인 이유는 개입 지점의 수다. Promise는 완료 시점 하나만 잡히지만 Observable은 시작, 값마다, 에러, 완료, 취소가 모두 지점으로 열린다. 응답이 여러 값인 SSE와 WebSocket, 그리고 요청 취소를 같은 인터페이스로 다룰 수 있는 것도 이 때문이다.

```ts
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(5000),
      catchError((err) =>
        throwError(() =>
          err instanceof TimeoutError ? new RequestTimeoutException() : err,
        ),
      ),
    );
  }
}
```

자주 쓰는 연산자는 넷으로 좁혀진다. `map`은 응답 본문을 공통 envelope로 감싸고, `tap`은 응답 흐름을 건드리지 않고 로깅이나 메트릭만 남기며, `timeout`과 `catchError`는 위 예시처럼 응답 지연과 예외 변환을 처리한다. `finalize`는 성공, 실패, 취소를 가리지 않고 마지막에 실행돼 자원 정리에 맞는다.

`handle()`을 호출하지 않고 `of(cachedValue)` 같은 새 스트림을 반환하면 핸들러를 건너뛰고 값을 즉시 응답한다. 공식 문서의 캐시 Interceptor 예시가 이 구조다.

Interceptor 밖에서 RxJS를 만나는 또 하나의 자리는 `HttpService`다. 모든 메서드가 `AxiosResponse`를 Observable로 감싸 반환하므로, async/await 코드에서는 `firstValueFrom`으로 변환해서 쓴다.

## 면접 체크포인트

- Observable과 Promise의 차이를 lazy, 다중 값, 구독별 독립 실행, 취소 네 축으로 답한다. 비동기 여부는 차이가 아니라는 점까지 덧붙이면 깊이가 드러난다.
- cold와 hot을 물으면 unicast와 multicast로 환원해 설명하고, 전환 수단이 Subject라고 이어 붙인다.
- `Subject`와 `BehaviorSubject`의 차이는 초기값과 현재 값 보관 여부다. 구독 시점 이전 값의 수신 여부로 답하면 정확하다.
- 평탄화 연산자 네 개는 동시성 정책 하나로 묶어 설명하고, 자동완성은 `switchMap`, 순차 쓰기는 `concatMap`, 중복 제출 방지는 `exhaustMap`, 순서 무관 병렬은 `mergeMap`으로 사례를 붙인다.
- `concatMap`의 무제한 버퍼 위험과 `mergeMap`의 동시성 상한을 언급하면 운영 감각으로 읽힌다.
- Interceptor가 Observable을 요구하는 이유를 개입 지점의 수로 설명하고, `next.handle()`이 Pointcut이라는 표현을 쓴다.
- 누수 질문에는 `takeUntil` 종료 Subject 패턴과 `firstValueFrom`의 미완료 소스 위험을 함께 답한다.
- RxJS가 부담스러운 팀에서는 `firstValueFrom`으로 Promise 경계를 만들 수 있지만, 재시도, 스트리밍, 취소, `finalize`는 Observable을 유지하는 편이 낫다는 트레이드오프를 제시한다.

## 출처

- [RxJS — Observable](https://rxjs.dev/guide/observable)
- [RxJS — Subject](https://rxjs.dev/guide/subject)
- [RxJS — switchMap](https://rxjs.dev/api/operators/switchMap)
- [RxJS — concatMap](https://rxjs.dev/api/operators/concatMap)
- [RxJS — exhaustMap](https://rxjs.dev/api/operators/exhaustMap)
- [RxJS — mergeMap](https://rxjs.dev/api/operators/mergeMap)
- [RxJS — retry](https://rxjs.dev/api/operators/retry)
- [RxJS — timeout](https://rxjs.dev/api/operators/timeout)
- [RxJS — firstValueFrom](https://rxjs.dev/api/index/function/firstValueFrom)
- [RxJS — toPromise deprecation](https://rxjs.dev/deprecations/to-promise)
- [NestJS — Interceptors](https://docs.nestjs.com/interceptors)

## 관련 문서

- [[NestJS-AOP-Interceptor|NestJS Interceptor — Observable 기반 AOP 설계]]
- [[NestJS-AOP-Interceptor-Observable-Design|Promise vs Observable, AOP Join Point]]
- [[NestJS-HTTP-Module|HttpService — Observable 반환과 firstValueFrom 변환]]
- [[Promise-Async|Promise와 async/await]]
- [[Backpressure|Backpressure — 생산과 소비 속도 불균형]]
