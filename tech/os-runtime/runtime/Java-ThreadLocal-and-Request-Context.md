---
tags: [java, threadlocal, scoped-value, request-context, concurrency]
status: done
verified_at: 2026-10-14
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

binding은 `run` 또는 `call`의 동적 실행 범위가 끝나면 해제되거나 이전 binding으로 돌아간다. 같은 key를 중첩 범위에서 다시 binding할 수 있으며, 참조하는 객체 자체가 불변이 되는 것은 아니다. 그러나 legacy framework integration이나 값의 mutation이 필요하면 ThreadLocal이 여전히 쓰인다.

### 구조적 동시성을 도입할 때의 전파 경계

Java SE 26 기준 `StructuredTaskScope`는 preview API다. scope를 열 때의 `ScopedValue` binding을 포착하고, `fork`로 시작한 자식 thread가 이를 상속한다. 기존 framework가 읽는 일반 `ThreadLocal`이 이 과정에서 `ScopedValue`로 변환되거나 자동 복사되지는 않는다. 인증과 tracing을 ThreadLocal에 둔 서비스라면 병렬 호출이 성공하는지만 보지 말고 자식 작업이 같은 요청 context를 읽는지도 확인한다.

Micrometer Context Propagation 1.2.1에서는 `ContextRegistry`에 필요한 `ThreadLocalAccessor`를 등록하고 `ContextSnapshot`으로 값을 포착한다. 자식 작업에서 `snapshot.setThreadLocals()`가 반환한 scope를 try-with-resources로 닫으면 작업 전의 thread-local 값으로 복원한다. snapshot 이후 원래 thread에서 바꾼 값은 그 snapshot에 반영되지 않으므로, 포착 시점과 적용 범위를 요청 경계에 맞춘다. 라이브러리가 모든 인증 context를 자동 등록한다고 가정하지 않는다.

회귀 검증에서는 서로 다른 요청의 인증값과 trace ID, 예외 종료 후 기존 값 복원, context가 없는 다음 작업으로의 값 누출을 함께 확인한다. `ScopedValue`로 공유한 객체를 여러 자식이 수정한다면 불변 객체로 바꾸거나 접근을 동기화해야 한다. 작업 수명과 취소 정책은 [[Java-Structured-Concurrency|구조적 동시성]]에서 별도로 다룬다.

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

### 단일 요청 테스트가 놓치는 경쟁

공유 field에 값을 쓴 뒤 처리하고 다시 읽는 사이에 다른 요청이 덮어쓰면 첫 요청도 두 번째 요청의 값을 읽는다. 요청이 겹치지 않는 테스트에서는 드러나지 않는다. 재현 시 대상 구간이 겹치도록 동시 요청을 보내고 요청 ID, thread 이름과 반환값을 함께 확인한다. 지역 변수의 참조가 공유 객체를 가리킬 수 있다는 점도 별도로 추적한다.

## 출처

2026-10-14에는 Java SE 26의 ThreadLocal, Thread, ScopedValue와 StructuredTaskScope 문서, Micrometer Context Propagation 1.2.1 예제를 대조했다. 실제 서비스의 인증과 tracing 연동을 실행 검증한 기록은 아니다.

- [Java SE 26, StructuredTaskScope](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/StructuredTaskScope.html)
- [Micrometer Context Propagation, Examples](https://docs.micrometer.io/context-propagation/reference/usage.html)
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
