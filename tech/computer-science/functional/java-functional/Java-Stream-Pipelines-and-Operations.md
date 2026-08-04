---
tags: [java, stream, lazy-evaluation, pipeline, flatmap]
status: done
verified_at: 2026-08-04
category: "CS - 함수형 프로그래밍"
aliases: ["Java Stream Pipeline", "Java 스트림 파이프라인"]
---

# Java Stream pipeline과 연산

Stream은 collection 자체가 아니라 source의 element를 선언형 pipeline으로 처리하는 일회성 traversal abstraction이다. Source, zero개 이상의 intermediate operation과 terminal operation으로 구성한다.

```text
source -> filter -> map -> limit -> terminal operation
```

## Collection과 Stream

Collection은 element를 보관하고 여러 번 탐색할 수 있다. Stream은 element를 저장하지 않고 source에서 값을 끌어와 pipeline을 한 번 평가한다. Intermediate 또는 terminal operation을 적용한 stream을 다시 사용하면 `IllegalStateException`이 발생할 수 있다.

Stream operation은 원본 collection을 자동으로 immutable하게 만들지 않는다. 일반적인 transformation은 source를 직접 바꾸지 않지만 callback이 source나 공유 상태를 변경하면 interference와 race가 생긴다.

## 내부 반복과 pipeline

직접 `for` loop로 traversal을 통제하는 외부 반복과 달리 Stream library가 traversal을 통제한다. 이 경계 덕분에 library가 lazy evaluation, short-circuit와 parallel execution 전략을 선택할 수 있다.

Pipeline이 항상 element 하나를 모든 stage에 차례로 통과시키는 특정 loop로 구현된다고 가정하지 않는다. 명세가 지키는 것은 operation 결과와 encounter order 계약이며, 구현은 결과에 영향이 없는 stage나 callback 실행을 생략할 수 있다.

## Intermediate와 terminal operation

| 종류 | 예 | 성질 |
|---|---|---|
| Stateless intermediate | `filter`, `map`, `flatMap`, `peek` | 다른 element의 상태 없이 변환 |
| Stateful intermediate | `distinct`, `sorted`, 일부 `limit` | 앞선 element나 전체 상태가 필요할 수 있음 |
| Short-circuit intermediate | `limit`, `takeWhile` | 유한 결과를 일찍 만들 수 있음 |
| Terminal | `toList`, `collect`, `reduce`, `count`, `forEach` | Pipeline을 소비해 결과나 side effect 생성 |
| Short-circuit terminal | `findFirst`, `anyMatch`, `allMatch` | 결과가 정해지면 탐색을 끝낼 수 있음 |

Intermediate operation은 terminal operation이 시작될 때까지 일반적으로 실행되지 않는다. Lazy evaluation은 불필요한 element 계산을 피할 기회를 주지만 항상 더 빠르다는 보장은 아니다.

## 주요 변환

```java
List<String> names = students.stream()
    .filter(Student::active)
    .map(Student::name)
    .distinct()
    .sorted()
    .toList();
```

- `filter`는 element를 유지할지 결정한다.
- `map`은 element 하나를 결과 하나로 변환한다.
- `flatMap`은 element 하나를 stream으로 바꾼 뒤 내부 element를 한 stream으로 평탄화한다.
- `peek`는 debugging처럼 제한된 관찰에 적합하며 business side effect에 의존하지 않는다.
- `skip`, `limit`, `takeWhile`, `dropWhile`는 encounter order와 parallel 비용을 함께 확인한다.

## 생성과 resource 수명

Collection의 `stream()`, `Arrays.stream`, `Stream.of`, builder와 generator로 stream을 만들 수 있다. `iterate`와 `generate`는 무한 stream이 될 수 있으므로 short-circuit operation이나 명시적 bound가 필요하다.

대부분의 in-memory stream은 close가 필요 없지만 `Files.lines`처럼 IO channel을 source로 쓰는 stream은 try-with-resources로 닫는다.

```java
try (Stream<String> lines = Files.lines(path)) {
    long errors = lines.filter(line -> line.contains("ERROR")).count();
}
```

## Reduction과 primitive stream

`reduce`는 identity와 associative accumulator로 element를 하나의 결과로 접는다. Parallel execution까지 고려하면 identity, accumulator와 combiner의 법칙이 맞아야 한다. Mutable container에는 `collect`가 더 자연스럽다.

`IntStream`, `LongStream`, `DoubleStream`은 boxing을 줄이고 `sum`, `average`, `summaryStatistics`, `range`를 제공한다. `mapToInt`와 `boxed`로 object stream과 오갈 수 있지만 가독성과 실제 allocation 측정을 함께 본다.

## Behavioral parameter 규칙

`filter`, `map` 등에 전달하는 function은 non-interfering하고 대체로 stateless해야 한다. 외부 list에 `forEach`로 누적하기보다 `toList`나 collector를 사용한다. 특히 parallel pipeline에서 mutable accumulator는 data race 또는 synchronization 병목을 만든다.

Encounter order가 있어도 callback이 어느 thread에서 어떤 순서로 호출되는지는 별도 문제다. 결과 order가 필요하면 operation 계약을 확인하고 side effect 순서에 의존하지 않는다.

## 선택 기준

- 복잡한 loop-carried state, 조기 탈출과 exception 흐름이 핵심이면 명시적 loop가 더 읽기 쉽다.
- Pipeline이 길어지면 domain 이름을 가진 method로 stage를 나눈다.
- Stream이 loop보다 빠르거나 느리다고 단정하지 않고 JMH와 production profile로 검증한다.
- Query API, database stream과 Java Stream을 혼동하지 않는다. Java Stream filter는 이미 메모리로 읽은 data에 실행될 수 있다.

## 출처

- [Java SE 26, Stream](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/stream/Stream.html)
- [Java SE 26, `java.util.stream` package](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/stream/package-summary.html)
- [Java SE 26, BaseStream](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/stream/BaseStream.html)
- 김영한 강사, [필터 만들기1](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275349), [필터 만들기2](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275352), [맵 만들기1](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275353), [맵 만들기2](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275354), [필터와 맵 활용1](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275355), [필터와 맵 활용2](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275356), [스트림 만들기1](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275357), [스트림 만들기2](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275358), [스트림 만들기3](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275359), [스트림 만들기4](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275360), [정리](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275361)
- 김영한 강사, [스트림 API 시작](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275373), [스트림 API란?](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275374), [파이프라인 구성](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275375), [지연 연산](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275376), [지연 연산과 최적화](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275377), [스트림 생성](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275379), [중간 연산](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275380), [FlatMap](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275381), [Optional 간단 설명](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275382), [최종 연산](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275383), [기본형 특화 스트림](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275384)

## 관련 문서

- [[Java-Stream-Collectors|Collector]]
- [[Java-Optional|Optional]]
- [[Java-Parallel-Streams-and-ForkJoin|병렬 Stream]]
