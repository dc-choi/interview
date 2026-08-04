---
tags: [java, stream, collector, grouping, reduction]
status: done
verified_at: 2026-08-04
category: "CS - 함수형 프로그래밍"
aliases: ["Java Stream Collectors", "Java 스트림 컬렉터"]
---

# Java Stream Collector와 다단계 집계

Collector는 stream element를 mutable result container에 축적하고 필요하면 최종 result로 변환하는 reduction contract다. `Collectors`는 list, set, map, grouping, partition과 통계용 구현을 제공한다.

## Collector의 다섯 함수

| 구성 요소 | 역할 |
|---|---|
| Supplier | 새 accumulation container 생성 |
| Accumulator | element 하나를 container에 반영 |
| Combiner | 분할된 두 container 결합 |
| Finisher | 중간 container를 최종 result로 변환 |
| Characteristics | identity finish, unordered, concurrent 같은 최적화 정보 |

Parallel reduction에서 accumulator와 combiner는 같은 결과를 만들도록 호환되어야 하며 결합은 associative해야 한다. Collector가 `CONCURRENT`라고 해서 결과 container의 모든 후속 사용까지 thread-safe하다는 뜻은 아니다.

## 기본 수집

```java
Map<Long, Order> byId = orders.stream().collect(Collectors.toMap(
    Order::id,
    Function.identity(),
    (left, right) -> right
));
```

- `Stream.toList()`는 unmodifiable list를 반환한다.
- `Collectors.toList()`가 반환하는 list의 concrete type, mutability, serializability와 thread safety는 보장되지 않는다.
- 특정 collection이 필요하면 `toCollection(ArrayList::new)`처럼 factory를 명시한다.
- `toMap`에 중복 key가 가능하면 merge function을 제공한다. 어떤 값을 남길지 domain policy로 정한다.
- Map 구현과 key order가 중요하면 map supplier overload를 사용한다.

## Grouping과 partition

`groupingBy(classifier)`는 같은 key의 element를 list로 묶는다. `partitioningBy(predicate)`는 `true`, `false` 두 key를 모두 가지는 map을 만든다. Grouping key가 null일 수 있는 model은 먼저 명시적으로 정규화한다.

```java
Map<Grade, Double> averageByGrade = students.stream().collect(
    Collectors.groupingBy(
        Student::grade,
        Collectors.averagingInt(Student::score)
    )
);
```

두 번째 인자인 downstream collector는 각 group 내부 element를 다시 reduce한다. `mapping`, `filtering`, `flatMapping`, `counting`, `summingInt`, `maxBy`, `collectingAndThen`을 조합할 수 있다.

## Optional result와 후처리

빈 group일 수 있는 `maxBy`와 `minBy`는 `Optional`을 결과로 만든다. 실제로 group이 존재하면 비어 있을 수 없다는 invariant가 있더라도 unsafe `get`을 흩뿌리지 않는다. `collectingAndThen(maxBy(...), optional -> optional.orElseThrow(...))`처럼 invariant 확인 지점을 한곳에 둔다.

## 설계 기준

- SQL로 더 적은 row를 읽고 집계할 수 있으면 무조건 Java memory로 가져오지 않는다.
- Collector chain이 business rule을 감추면 이름 있는 aggregation method나 별도 read model로 추출한다.
- Mutable shared collection에 `forEach`로 누적하는 방식보다 collector를 사용한다.
- 큰 grouping은 모든 결과를 memory에 보관한다. Cardinality와 heap 사용량을 측정한다.
- 병렬화 전 source splitting 비용, combiner 비용과 encounter order 요구를 확인한다.

## 출처

- [Java SE 26, Collector](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/stream/Collector.html)
- [Java SE 26, Collectors](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/stream/Collectors.html)
- [Java SE 26, Stream `toList`](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/stream/Stream.html#toList())
- 김영한 강사, [컬렉터1](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275386), [컬렉터2](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275387), [다운 스트림 컬렉터1](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275388), [다운 스트림 컬렉터2](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275389), [정리](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275390)

## 관련 문서

- [[Java-Stream-Pipelines-and-Operations|Stream pipeline]]
- [[Java-Optional|Optional]]
- [[Java-Parallel-Streams-and-ForkJoin|병렬 reduction]]
