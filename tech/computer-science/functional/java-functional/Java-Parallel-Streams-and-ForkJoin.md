---
tags: [java, parallel-stream, forkjoinpool, work-stealing, concurrency]
status: done
verified_at: 2026-08-04
category: "CS - 함수형 프로그래밍"
aliases: ["Java Parallel Streams", "Java 병렬 스트림과 ForkJoin"]
---

# Java 병렬 Stream과 Fork/Join

Parallel stream은 source를 분할하고 부분 결과를 결합할 수 있는 pipeline을 병렬 mode로 평가한다. `parallel()` 한 번으로 semantic safety나 성능 향상이 생기지는 않는다. 연산 법칙, source 분할성, 작업 크기와 shared resource를 먼저 본다.

## Fork/Join mental model

Fork/Join은 큰 작업을 작은 task로 재귀적으로 나누고 결과를 결합하는 divide-and-conquer model이다. `ForkJoinPool`의 worker는 자신의 deque에서 task를 처리하고 일이 없으면 다른 worker의 task를 훔쳐 load를 분산한다.

```text
task -> fork(left, right) -> compute leaves -> join(partial results)
```

Threshold가 작을수록 task가 많아져 load balance 기회가 늘지만 scheduling과 join overhead도 증가한다. CPU core 수의 고정 배수 같은 하나의 공식으로 정하지 않고 input size, operation cost와 hardware에서 benchmark한다.

## Parallel reduction 조건

Parallel pipeline의 callback은 non-interfering하고 stateless해야 한다. Reduction은 identity와 associativity를 지켜야 분할 순서가 바뀌어도 결과가 유지된다.

```java
long total = values.parallelStream()
    .mapToLong(Value::amount)
    .sum();
```

Floating-point addition처럼 수학적으로 associative해 보여도 유한 정밀도에서는 grouping 순서에 따라 마지막 bit가 달라질 수 있다. Exact reproducibility가 필요하면 순차 평가, fixed reduction order나 적절한 numeric type을 선택한다.

## 잘 맞는 작업

- 충분히 큰 in-memory data와 CPU-bound, 독립적인 element 연산
- Array, range처럼 균등하게 분할하기 쉬운 source
- Stateful intermediate operation과 encounter order 제약이 적은 pipeline
- Combiner 비용이 작고 결과를 associative하게 합칠 수 있는 reduction

작은 collection, linked structure, 비싼 synchronization, ordered `limit`와 `findFirst`, 편향된 작업 크기는 이득을 줄일 수 있다.

## Common pool과 blocking

JDK의 일반적인 parallel stream 실행은 shared `ForkJoinPool.commonPool()`과 연결된다. Shared pool에는 application의 다른 parallel stream이나 default asynchronous task도 경쟁할 수 있다. 한 pipeline의 blocking IO가 worker를 오래 점유하면 관련 없는 요청의 tail latency까지 높일 수 있다.

Stream API의 portable contract는 parallel mode와 결과 semantics이며 원하는 `Executor`를 pipeline마다 지정하는 API는 제공하지 않는다. 전용 pool, cancellation, timeout과 backpressure가 중요한 workflow는 `ExecutorService`, `CompletableFuture` 또는 목적에 맞는 concurrency API로 task ownership을 명시한다. Custom ForkJoinPool 안에서 parallel stream을 호출해 특정 pool 사용을 기대하는 방식은 구현과 version 의존성을 검증해야 한다.

## Side effect와 order

`forEach`는 encounter order를 보장하지 않는다. `forEachOrdered`는 order를 보존하지만 병렬 이득을 제한할 수 있고 callback이 같은 thread에서 실행된다는 뜻은 아니다. Shared mutable list에 add하는 대신 collector나 immutable partial result를 사용한다.

Thread-safe collection을 쓴다고 algorithm이 확장 가능한 것은 아니다. Lock contention, false sharing, memory bandwidth와 GC도 병목이 된다.

## 운영 체크리스트

1. Sequential baseline과 같은 결과를 property test로 확인한다.
2. Production과 비슷한 core 수, data 크기와 동시 요청에서 benchmark한다.
3. Common pool parallelism, queued task, CPU 사용과 latency를 관찰한다.
4. Blocking call, synchronized section과 shared cache 접근을 찾는다.
5. Failure, interruption와 cancellation이 어느 task까지 전파되는지 확인한다.
6. 작은 입력에서는 sequential로 전환할 threshold가 필요한지 측정한다.

## 출처

- [Java SE 26, ForkJoinPool](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/ForkJoinPool.html)
- [Java SE 26, ForkJoinTask](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/ForkJoinTask.html)
- [Java SE 26, Stream parallel execution](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/stream/package-summary.html#Parallelism)
- 김영한 강사, [단일 스트림](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275409), [스레드 직접 사용](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275410), [스레드 풀 사용](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275411), [Fork/Join 패턴](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275412), [Fork/Join 프레임워크1 - 소개](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275413), [Fork/Join 프레임워크2 - 작업 훔치기](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275414), [작업 훔치기 알고리즘](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275415), [Fork/Join 프레임워크3 - 공용 풀](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275416), [자바 병렬 스트림](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275417), [병렬 스트림 사용시 주의점1](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275418), [병렬 스트림 사용시 주의점2](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275419), [정리](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275420)

## 관련 문서

- [[Java-Stream-Pipelines-and-Operations|Stream pipeline]]
- [[Concurrency-vs-Parallelism|Concurrency와 parallelism]]
- [[Java-Concurrency-Primitives|Java concurrency primitive]]
