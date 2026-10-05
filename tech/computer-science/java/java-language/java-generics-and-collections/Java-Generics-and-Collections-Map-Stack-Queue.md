---
tags: [java, collections, map, stack, queue, deque]
status: done
verified_at: 2026-10-05
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Map Stack Queue", "Java Map Stack Queue Deque"]
---

# Java Map, Stack, Queue와 Deque

김영한 강사의 Map, Stack, Queue 단원은 키와 값의 연결, LIFO와 FIFO 처리 순서, 양끝 큐를 하나의 흐름으로 다룬다. Java API에서는 `Map`이 `Collection`의 하위 타입이 아니라는 점과 `Queue`의 모든 구현이 FIFO인 것은 아니라는 점까지 구분해야 한다.

## Map의 계약과 구현

- `Map<K,V>`는 키 하나를 최대 한 값에 연결한다. 키는 중복될 수 없지만 값은 중복될 수 있다.
- `Map`은 컬렉션 프레임워크에 속하지만 `Collection`을 상속하지 않고 그 자체로 `Iterable`도 아니다.
- 순회는 `keySet()`, `values()`, `entrySet()` 뷰를 통해 한다. 키와 값이 함께 필요하면 `entrySet()`이 중복 조회를 피한다.
- 세 뷰의 반환 타입에는 이유가 있다. 키는 중복될 수 없어 `keySet()`은 `Set`, 값은 중복될 수 있고 순서나 index도 없어 `values()`는 `Collection`, 키와 값을 묶은 단위인 `Map.Entry`는 키로 유일하므로 `entrySet()`은 `Set<Map.Entry<K,V>>`다.
- Map의 키만 보면 Set과 같은 구조라 구현도 대응한다. API 문서 기준으로 `HashSet`은 `HashMap`을 배경으로 쓰고(OpenJDK는 값 자리에 공유 더미 객체를 둔다) `TreeSet`은 `TreeMap` 기반이다. `LinkedHashSet`이 `LinkedHashMap`으로 동작하는 것은 OpenJDK 구현 세부다.
- 해시 index와 중복 판정에는 키만 쓰이므로 키 타입은 `hashCode`와 `equals`를 같은 기준으로 구현해야 한다. 값 타입은 저장과 키 조회만 하면 필요 없지만 `containsValue`나 map끼리의 `equals`처럼 값을 비교하면 `equals`가 필요하다.
- `containsKey`는 해시로 찾아 기대 상수 시간이지만 `containsValue`는 대부분의 구현에서 map 크기에 선형이다(API 문서). 값으로 키를 찾으려면 `entrySet()`을 순회하며 값이 일치하는 entry의 키를 모아야 한다. 이런 조회가 잦으면 반대 방향 map을 함께 유지하는 방안을 검토한다.

| 구현 | 순서 계약 | 선택 기준 |
|---|---|---|
| `HashMap` | 순회 순서 보장 없음 | 좋은 분산에서 빠른 일반 키 조회 |
| `LinkedHashMap` | encounter order 유지, 설정에 따라 access order | 재현 가능한 순회, 간단한 접근 순서 정책 |
| `TreeMap` | 자연 순서 또는 comparator로 키 정렬 | 범위 조회, 정렬된 키 |

Java 21부터 `LinkedHashMap`과 `SortedMap` 구현은 `SequencedMap`이라 `firstEntry`, `lastEntry`, `pollFirstEntry`, `reversed` 같은 순서 연산을 공통 이름으로 제공한다(JEP 431).

### SortedMap과 NavigableMap

- `SortedMap`은 key의 natural ordering이나 생성 시 받은 `Comparator`로 전체 순서를 두는 `Map`이고, `entrySet`, `keySet`, `values` 순회에 그 순서가 반영된다. `NavigableMap`이 `lowerKey`, `floorKey`, `ceilingKey`, `higherKey` 같은 근접 탐색을 더하며, Java SE 26의 구현은 `TreeMap`과 `ConcurrentSkipListMap`이다. `HashMap`은 `SortedMap`도 `SequencedMap`도 구현하지 않으므로 순서 성질이 없다.
- `TreeMap`은 red-black tree로 `containsKey`, `get`, `put`, `remove`에 log(n)을 보장한다. `ConcurrentSkipListMap`은 skip list로 같은 연산에 기대 평균 log(n)을 주고 여러 thread의 동시 삽입, 삭제와 조회가 안전하며 null key와 value를 허용하지 않는다.
- 정렬은 시간을 내고 얻는다. 선수별 득점 수만 집계하면 `HashMap`, 이름순으로 저장하고 꺼내야 하면 `TreeMap`을 쓴다. 끝에서 한 번만 정렬해 출력하면 `HashMap`에 모은 뒤 key를 정렬하는 방법도 있다.

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
- `merge`는 빈도 집계처럼 기존 값과 새 값을 합치는 데 적합하다. `map.put(word, map.getOrDefault(word, 0) + 1)`도 결과는 같지만 조회와 저장을 따로 호출한다.
- 장바구니처럼 이름과 가격이 같은 상품을 한 키로 보고 수량만 늘리려면 상품 키에 `equals`와 `hashCode`가 필요하다. 없으면 같은 상품이 서로 다른 키로 두 번 들어가고 이후 제거와 수량 변경도 빗나간다.
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

### 기본 구현으로 ArrayDeque를 고르는 근거

- 양끝 삽입과 삭제는 `LinkedList`도 O(1)이지만, API 문서는 `ArrayDeque`가 stack으로 쓸 때 `Stack`보다, queue로 쓸 때 `LinkedList`보다 빠를 가능성이 높다(likely)고 적는다. 보장이 아니라 경향이다. 배열 기반이라 원소마다 node를 할당하지 않고 cache 지역성이 좋다. 원형 배열 배치는 원리 설명으로만 쓰고 API 계약으로 가정하지 않는다([[Linear-Data-Structures|선형 자료구조]]의 circular buffer).
- FIFO만 필요하면 `Queue<Integer> queue = new ArrayDeque<>()`처럼 `Queue` 타입으로 선언해 양끝 API를 쓰지 못하게 한다. `Deque`는 `Queue`를 상속하므로 양끝 기능까지 필요할 때 `Deque`로 선언한다. stack 전용 interface는 없어 `Deque`의 `push`, `pop`, `peek`을 쓰며, 이들은 각각 `addFirst`, `removeFirst`, `peekFirst`와 같다.
- stack은 가장 나중에 넣은 것이 먼저 나오므로 브라우저 뒤로 가기(이동 전 현재 페이지를 push, 뒤로 가기에서 pop)와 undo 같은 이력에 맞다. queue는 프린터 대기열처럼 도착 순서대로 처리하거나, 사용자가 많은 시간에는 작업을 `offer`만 해 두고 한가한 시간에 `poll`해 실행하는 작업 예약에 쓴다. 작업을 공통 interface로 두면 압축, 백업, 정리 같은 서로 다른 작업을 같은 scheduler가 다룬다.

## 면접 체크포인트

- `Map`이 `Collection`이나 `Iterable`이 아닌 이유와 순회 방법
- `HashMap`, `LinkedHashMap`, `TreeMap`의 순서 계약
- `HashMap`과 `SortedMap` 구현의 비용 차이, `TreeMap`과 `ConcurrentSkipListMap`의 선택 기준
- `Queue`의 예외형 메서드와 특별값형 메서드 차이
- `Queue`가 항상 FIFO는 아닌 이유
- `Stack` 대신 `Deque`를 권장하면서도 `Deque`가 엄격한 LIFO 타입은 아닌 이유
- `values()`가 `Set`이 아니라 `Collection`인 이유와 `containsValue`의 비용
- queue와 stack의 기본 구현으로 `ArrayDeque`를 고르는 근거와 그 근거의 한계

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

## 쉬운코드 YouTube 강의

- [Java에서 SortedMap 정의와 특징, HashMap과의 차이, 구현체들](https://www.youtube.com/watch?v=ubtfdesmYdw)

## Java SE 26 근거

- [Map](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Map.html)
- [HashMap](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/HashMap.html)
- [LinkedHashMap](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/LinkedHashMap.html)
- [TreeMap](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/TreeMap.html)
- [SortedMap](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/SortedMap.html)
- [NavigableMap](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/NavigableMap.html)
- [ConcurrentSkipListMap](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/concurrent/ConcurrentSkipListMap.html)
- [Queue](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Queue.html)
- [Deque](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Deque.html)
- [ArrayDeque](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/ArrayDeque.html)
- [Stack](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Stack.html)
- [HashSet](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/HashSet.html)
- [TreeSet](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/TreeSet.html)
- [JEP 431: Sequenced Collections](https://openjdk.org/jeps/431)

## 관련 문서

- [[Java-Generics-and-Collections-Hashing|해시와 HashSet 원리]]
- [[Java-Exception-Record-Collection-Stack-ArrayDeque|Stack과 ArrayDeque]]
- [[Linear-Data-Structures|선형 자료구조]]
