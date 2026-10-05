---
tags: [java, collections, set, hashset, linkedhashset, treeset]
status: done
verified_at: 2026-10-05
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Set Implementations", "Java Set 구현 선택"]
---

# Java Set 구현 선택

김영한 강사의 Set 단원은 중복을 제거한다는 공통 계약 위에서 `HashSet`, `LinkedHashSet`, `TreeSet`의 순서와 성능 차이를 비교한다. `Set` 전체를 순서가 없는 자료구조라고 말하기보다 구현별 encounter order와 정렬 계약을 확인해야 정확하다.

## 공통 계약

- `Set`은 같은 원소를 둘 이상 포함하지 않는다. 중복 판정은 `Objects.equals` 관점의 동등성을 따른다.
- mutable 원소의 비교 상태가 저장 중 바뀌면 집합 계약과 검색이 깨질 수 있다.
- `Set` 인터페이스 자체는 하나의 전역 순회 순서를 약속하지 않는다. 구체 구현은 순서가 없거나, 삽입 순서를 유지하거나, 정렬 순서를 제공할 수 있다.
- `Set.equals`는 구현체나 순회 순서가 달라도 같은 원소를 포함하면 참이다.

## 구현 선택표

| 구현 | 순서 계약 | 주요 연산 | 적합한 요구 |
|---|---|---|---|
| `HashSet` | 순회 순서 보장 없음 | 좋은 분산에서 기대 상수 시간 | 순서 없는 빠른 membership |
| `LinkedHashSet` | encounter order 유지 | hash 기반, 연결 정보 비용 추가 | 중복 제거와 재현 가능한 순회 |
| `TreeSet` | 자연 순서 또는 `Comparator` 순서 | 기본 연산 로그 시간 | 범위 조회, 최소와 최대, 정렬된 집합 |

`TreeSet`은 `NavigableSet` 구현이라 `lower`, `floor`, `ceiling`, `higher`, 범위 뷰 같은 탐색 API를 제공한다. 정렬만 필요하고 membership이나 범위 연산이 필요 없다면 리스트를 한 번 정렬하는 편이 나을 수도 있다.

Java 21부터 `LinkedHashSet`은 `SequencedSet`이라 `getFirst`, `getLast`, `reversed`와 encounter order를 바꾸는 `addFirst`, `addLast`를 제공한다. `TreeSet` 같은 `SortedSet`은 비교 결과가 위치를 정하므로 `addFirst`, `addLast`가 항상 `UnsupportedOperationException`이다.

순회 비용도 구현마다 다르다. `HashSet` 순회는 원소 수와 배경 `HashMap`의 bucket 수(capacity)의 합에 비례해 빈 bucket까지 훑으므로, 순회가 중요하면 초기 capacity를 과하게 잡지 않는다. `LinkedHashSet`은 entry를 doubly linked list로 이어 capacity와 무관하게 원소 수에 비례해 순회하는 대신, 그 연결을 유지하느라 다른 연산은 `HashSet`보다 약간 느릴 수 있다. 중복 검사도 순서도 필요 없이 순회만 한다면 `ArrayList`가 memory와 순회 모두 가볍다([[Linear-Data-Structures-List-and-Set|List와 Set]]).

## TreeSet이 로그 시간인 이유

`TreeSet`은 `TreeMap` 기반이고 `TreeMap`은 red-black tree 기반이다. API 문서는 `add`, `remove`, `contains`에 log(n) 시간을 보장한다.

- 이진 탐색 트리는 왼쪽 자손에 더 작은 값, 오른쪽 자손에 더 큰 값을 두도록 입력 시점에 위치를 정한다. 검색은 root부터 비교해 작으면 왼쪽, 크면 오른쪽으로 내려가며 한 번 비교할 때마다 남은 후보의 약 절반을 버린다. 1024개면 약 10번(log2 1024 = 10) 비교한다. 리스트의 순차 검색 O(n)보다 빠르고 해시의 기대 O(1)보다는 느리다.
- 균형을 신경 쓰지 않는 이진 탐색 트리에 정렬된 순서로 값을 넣으면 한쪽으로 치우쳐 연결 리스트처럼 O(n)이 된다. red-black tree는 삽입과 삭제마다 균형을 회복해 이런 입력에서도 높이를 O(log n)으로 유지한다. 회전과 불변식은 [[Trees-and-Balanced-Search-Trees|트리와 균형 탐색 트리]]에 있다.
- 중위 순회(왼쪽 subtree, 현재 node, 오른쪽 subtree)는 값 순서대로 방문하므로 `TreeSet`의 순회는 정렬 순서다.

## 정렬과 동등성

```java
Comparator<String> byLengthThenText = Comparator
        .comparingInt(String::length)
        .thenComparing(Comparator.naturalOrder());

Set<String> words = new TreeSet<>(byLengthThenText);
```

`TreeSet`은 비교 결과가 0이면 같은 집합 원소로 취급한다. comparator가 `equals`와 일관되지 않으면 일반 `Set` 계약과 어긋나는 동작이 나타날 수 있다. 길이만 비교하면 같은 길이의 서로 다른 문자열 하나가 빠질 수 있으므로 추가 비교 기준을 둔다.

## 팩터리와 집합 연산

- `Set.of`와 `Set.copyOf`는 수정할 수 없고 `null`을 허용하지 않는다.
- `Set.of`에 중복 인수를 주면 `IllegalArgumentException`이 발생한다.
- 수정 불가 집합 팩터리의 순회 순서에 의존하지 않는다.
- 배열이나 리스트를 반복하며 `add`하기보다 `Collection`을 받는 생성자를 쓴다. `new LinkedHashSet<>(List.of(3, 1, 3, 2))`는 중복을 지우고 입력 순서 `[3, 1, 2]`를 유지하고, `new TreeSet<>(List.of(3, 1, 3, 2))`는 `[1, 2, 3]`으로 정렬한다.
- 합집합, 교집합, 차집합은 보통 복사본을 만든 뒤 `addAll`, `retainAll`, `removeAll`을 적용해 원본 소유권을 보존한다.

```java
Set<String> union = new HashSet<>(left);
union.addAll(right);

Set<String> intersection = new HashSet<>(left);
intersection.retainAll(right);
```

## 면접 체크포인트

- `Set`의 중복 기준과 `hashCode`, `equals`의 관계
- `HashSet`, `LinkedHashSet`, `TreeSet`의 순서와 비용 차이
- `HashSet`과 `LinkedHashSet`의 순회 비용이 capacity에 따라 달라지는 이유
- `TreeSet` comparator가 `equals`와 일관되어야 하는 이유
- 중복 제거 뒤 입력 순서를 유지해야 할 때의 구현 선택
- `TreeSet`이 정렬된 입력에도 로그 시간을 유지하는 이유와 순회가 정렬 순서인 이유

## 김영한 강사 강의 단원

- [자바가 제공하는 Set1 - HashSet, LinkedHashSet](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216000)
- [자바가 제공하는 Set2 - TreeSet](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216001)
- [자바가 제공하는 Set3 - 예제](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216002)
- [자바가 제공하는 Set4 - 최적화](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216003)
- [문제와 풀이1](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216004)
- [문제와 풀이2](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216005)
- [정리](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216006)

## 쉬운코드 YouTube 강의

- [BJ.24 셋(set)과 해시 셋(hash set)](https://www.youtube.com/watch?v=IkImFugfFQk)

## Java SE 26 근거

- [Set](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Set.html)
- [HashSet](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/HashSet.html)
- [LinkedHashSet](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/LinkedHashSet.html)
- [TreeSet](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/TreeSet.html)
- [TreeMap](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/TreeMap.html)
- [SortedSet](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/SortedSet.html)

## 관련 문서

- [[Java-Generics-and-Collections-Hashing|해시와 HashSet 원리]]
- [[Java-Generics-and-Collections-Iteration-and-Sorting|순회와 정렬]]
- [[Trees-and-Balanced-Search-Trees|트리와 균형 탐색 트리]]
- [[Linear-Data-Structures-List-and-Set|List와 Set]]
