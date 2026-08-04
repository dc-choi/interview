---
tags: [java, collections, map, stack, queue, deque]
status: done
verified_at: 2026-08-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Map Stack Queue", "Java Map Stack Queue Deque"]
---

# Java Map, Stack, Queue와 Deque

김영한 강사의 Map, Stack, Queue 단원은 키와 값의 연결, LIFO와 FIFO 처리 순서, 양끝 큐를 하나의 흐름으로 다룬다. Java API에서는 `Map`이 `Collection`의 하위 타입이 아니라는 점과 `Queue`의 모든 구현이 FIFO인 것은 아니라는 점까지 구분해야 한다.

## Map의 계약과 구현

- `Map<K,V>`는 키 하나를 최대 한 값에 연결한다. 키는 중복될 수 없지만 값은 중복될 수 있다.
- `Map`은 컬렉션 프레임워크에 속하지만 `Collection`을 상속하지 않고 그 자체로 `Iterable`도 아니다.
- 순회는 `keySet()`, `values()`, `entrySet()` 뷰를 통해 한다. 키와 값이 함께 필요하면 `entrySet()`이 중복 조회를 피한다.

| 구현 | 순서 계약 | 선택 기준 |
|---|---|---|
| `HashMap` | 순회 순서 보장 없음 | 좋은 분산에서 빠른 일반 키 조회 |
| `LinkedHashMap` | encounter order 유지, 설정에 따라 access order | 재현 가능한 순회, 간단한 접근 순서 정책 |
| `TreeMap` | 자연 순서 또는 comparator로 키 정렬 | 범위 조회, 정렬된 키 |

## 삽입과 누적 API

```java
Map<String, Integer> counts = new HashMap<>();
for (String word : words) {
    counts.merge(word, 1, Integer::sum);
}

Map<String, List<String>> groups = new HashMap<>();
groups.computeIfAbsent("backend", key -> new ArrayList<>()).add("java");
```

- `put`은 이전 값을 반환한다. 기존 매핑을 덮어썼는지 알아야 하면 반환값과 `containsKey`를 함께 고려한다.
- `putIfAbsent`는 매핑이 없거나 `null`에 연결된 경우 값을 넣는다.
- `computeIfAbsent`의 mapping function은 호출되지 않을 수도 있고 `null`을 반환하면 매핑을 만들지 않는다. 함수 안에서 같은 map을 구조 변경하는 코드는 피한다.
- `merge`는 빈도 집계처럼 기존 값과 새 값을 합치는 데 적합하다.
- `get`이 `null`을 반환하면 키가 없거나 값이 `null`일 수 있다. 둘을 구분하려면 `containsKey`가 필요하다.
- `Map.of`와 `Map.copyOf`는 수정할 수 없고 `null` 키와 값을 허용하지 않는다.

해시 map의 키도 저장 뒤 동등성 관련 상태가 바뀌면 검색이 실패할 수 있다. `TreeMap` 키는 comparator 결과가 0일 때 같은 키로 취급하므로 comparator와 `equals`의 일관성도 확인한다.

## Queue의 두 API 계열

| 동작 | 실패 시 예외 | 특별값 반환 |
|---|---|---|
| 삽입 | `add(e)` | `offer(e)` |
| 제거 | `remove()` | `poll()` |
| 조회 | `element()` | `peek()` |

용량 제한 큐에서는 `offer`가 삽입 실패를 반환값으로 표현하므로 일반적으로 적합하다. 빈 큐에서 `poll`과 `peek`는 `null`을 반환하지만 `null` 원소를 허용하는 구현에서는 의미가 모호해질 수 있다.

`Queue`는 처리 전에 보관하는 컬렉션의 공통 계약이다. `ArrayDeque` 같은 구현은 FIFO로 쓸 수 있지만 `PriorityQueue`는 우선순위에 따라 head를 선택하므로 모든 큐가 FIFO라고 일반화하면 안 된다.

## Stack보다 Deque

```java
Deque<Integer> stack = new ArrayDeque<>();
stack.push(1);
stack.push(2);
int last = stack.pop(); // 2

Deque<Integer> queue = new ArrayDeque<>();
queue.offerLast(1);
queue.offerLast(2);
int first = queue.pollFirst(); // 1
```

- `Deque`는 양끝 삽입과 제거를 지원한다. API 문서도 LIFO stack 용도에서는 legacy `Stack`보다 `Deque` 구현을 선호한다고 안내한다.
- `Deque` 자체가 양끝 연산을 노출하므로 엄격한 LIFO 타입이라고 말할 수는 없다. 팀 규약이나 작은 wrapper로 사용할 끝을 제한한다.
- `ArrayDeque`는 `null`을 허용하지 않고 thread-safe하지 않다. 외부 동기화나 concurrent collection이 필요한지는 공유 방식에 따라 결정한다.
- 대부분의 `Deque` 구현은 원소 기반 `equals`와 `hashCode` 대신 `Object`의 identity 기반 동작을 상속할 수 있다. 리스트처럼 값 동등성을 기대하지 않는다.

## 면접 체크포인트

- `Map`이 `Collection`이나 `Iterable`이 아닌 이유와 순회 방법
- `HashMap`, `LinkedHashMap`, `TreeMap`의 순서 계약
- `Queue`의 예외형 메서드와 특별값형 메서드 차이
- `Queue`가 항상 FIFO는 아닌 이유
- `Stack` 대신 `Deque`를 권장하면서도 `Deque`가 엄격한 LIFO 타입은 아닌 이유

## 김영한 강사 강의 단원

- [컬렉션 프레임워크 - Map 소개1](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216008)
- [컬렉션 프레임워크 - Map 소개2](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216009)
- [컬렉션 프레임워크 - Map 구현체](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216010)
- [스택 자료 구조](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216011)
- [큐 자료 구조](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216012)
- [Deque 자료 구조](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216013)
- [Deque와 Stack, Queue](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216014)
- [문제와 풀이1 - Map1](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216015)
- [문제와 풀이2 - Map2](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216016)
- [문제와 풀이3 - Stack](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216017)
- [문제와 풀이4 - Queue](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216018)
- [정리](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216019)

## Java SE 26 근거

- [Map](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Map.html)
- [HashMap](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/HashMap.html)
- [LinkedHashMap](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/LinkedHashMap.html)
- [TreeMap](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/TreeMap.html)
- [Queue](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Queue.html)
- [Deque](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Deque.html)
- [ArrayDeque](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/ArrayDeque.html)
- [Stack](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Stack.html)

## 관련 문서

- [[Java-Generics-and-Collections-Hashing|해시와 HashSet 원리]]
- [[Java-Exception-Record-Collection-Stack-ArrayDeque|Stack과 ArrayDeque]]
- [[Linear-Data-Structures|선형 자료구조]]
