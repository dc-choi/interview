---
tags: [java, threadlocal, scoped-value, request-context, concurrency]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Java ThreadLocal", "ThreadLocal Request Context", "쓰레드 로컬"]
---

# Java ThreadLocal과 request context

`ThreadLocal<T>`은 같은 variable key에 대해 thread마다 독립된 값을 제공한다. 공유 singleton field의 race를 없애는 만능 동시성 도구가 아니라, **현재 thread의 실행 context에 값을 연결하는 제한된 저장소**다.

## 공유 field 문제와 차이

```text
singleton.currentTrace
  thread A write -> thread B overwrite -> A가 B의 값을 읽음

ThreadLocal<Trace>
  thread A -> Trace A
  thread B -> Trace B
```

일반 field에 request state를 두면 여러 request thread가 같은 object를 공유한다. lock을 걸어도 request 전체를 직렬화할 뿐 context 모델이 좋아지지 않는다. ThreadLocal은 각 thread의 copy를 분리한다.

## lifecycle이 핵심이다

```java
private static final ThreadLocal<RequestContext> CONTEXT = new ThreadLocal<>();

try {
    CONTEXT.set(context);
    chain.doFilter(request, response);
} finally {
    CONTEXT.remove();
}
```

- `set`: 현재 thread에 값을 binding한다.
- `get`: 현재 thread의 값을 읽는다.
- `remove`: 현재 thread의 entry를 제거한다.

Servlet container의 pool thread는 request가 끝나도 살아서 다음 사용자 요청에 재사용된다. `remove()`를 빠뜨리면 이전 사용자 context가 다음 요청에 노출될 수 있고 value/reference가 오래 유지된다. cleanup은 정상/예외/cancellation 모두 실행되는 `finally` 또는 framework lifecycle에 둔다.

## 전파되지 않는 경계

ThreadLocal은 thread에 묶이므로 다음 경계를 자동으로 안전하게 넘지 않는다.

- executor에 제출한 task
- `CompletableFuture`/parallel stream
- reactive pipeline의 thread switch
- message queue나 다른 process

`InheritableThreadLocal`도 pool에서 task별 context 전파를 해결하지 않는다. thread 생성 시점의 복사와 task 실행 시점은 다르기 때문이다. framework가 제공하는 context propagation 또는 task decorator를 사용하고 capture/restore/cleanup을 함께 test한다.

## virtual thread와 ScopedValue

Java 26 virtual thread도 각자 ThreadLocal을 지원한다. carrier thread가 바뀌어도 `Thread.currentThread()`는 virtual thread를 반환하므로 값이 carrier에 붙는 것은 아니다. 다만 대량 virtual thread에 mutable ThreadLocal state를 무제한 두면 memory와 reasoning 비용이 커진다.

Java 25부터 final API인 `ScopedValue`는 한 방향의 implicit context 전달에 더 안전한 선택이다.

```java
static final ScopedValue<RequestContext> REQUEST = ScopedValue.newInstance();

ScopedValue.where(REQUEST, context).run(() -> handle());
```

binding이 lexical scope 종료와 함께 자동 해제되고 callee가 임의로 값을 바꾸기 어렵다. 그러나 legacy framework integration이나 값의 mutation이 필요하면 ThreadLocal이 여전히 쓰인다.

## 실행 모델별 선택

| 실행 모델 | context 도구 |
|---|---|
| imperative servlet | filter/interceptor + ThreadLocal cleanup |
| Java structured concurrency | `ScopedValue` 검토 |
| Reactor | Reactor Context |
| Node.js/NestJS | `AsyncLocalStorage` |
| process/queue 경계 | trace/message header의 명시적 propagation |

## 점검 질문

- 이 값은 정말 thread context인가, 명시적 parameter가 더 나은가?
- pool에서 모든 종료 경로가 `remove()`를 호출하는가?
- async task에 어떤 값이 capture되고 언제 restore/clear되는가?
- thread-local context를 업무 source of truth로 오해하지 않았는가?
- user/auth context가 다른 request로 새지 않는 통합 test가 있는가?

## 출처

- [Java SE 26, ThreadLocal](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/ThreadLocal.html)
- [Java SE 26, ScopedValue](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/ScopedValue.html)
- [Java SE 26, Thread](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Thread.html)
- field context: [개발](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94416), [적용](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94417), [동시성 문제](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94418), [예제](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94419)
- ThreadLocal: [소개](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94420), [API 예제](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94421), [동기화 개발](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94422), [적용](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94423), [주의사항](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94424), [정리](https://www.inflearn.com/courses/lecture?courseId=327901&unitId=94425)

## 관련 문서

- [[Java-Concurrency-Primitives|Java 동시성 primitive]]
- [[Thread-vs-Event-Loop|Thread와 event loop]]
- [[Application-Method-Trace-Design|애플리케이션 method trace]]
- [[Spring-Transactional|Spring transaction context]]
