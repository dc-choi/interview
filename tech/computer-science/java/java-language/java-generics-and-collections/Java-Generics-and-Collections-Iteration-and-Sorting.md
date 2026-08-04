---
tags: [java, collections, iterable, iterator, comparable, comparator, sorting]
status: done
verified_at: 2026-08-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Iteration and Sorting", "Java 순회와 정렬"]
---

# Java 순회, 정렬과 컬렉션 유틸리티

김영한 강사의 순회와 정렬 단원은 자료구조별 탐색 방식을 `Iterable`과 `Iterator`로 통일하고, 자연 순서와 외부 정렬 전략을 분리한다. 편리한 문법 뒤의 계약을 알면 향상된 for문, 정렬 집합, 이진 탐색을 같은 원리로 설명할 수 있다.

## Iterable과 Iterator

```java
Iterator<String> iterator = names.iterator();
while (iterator.hasNext()) {
    String name = iterator.next();
}
```

- `Iterable<T>`는 `iterator()`로 새 순회자를 제공하는 대상의 계약이다.
- `Iterator<T>`는 현재 순회 상태를 가지며 `hasNext()`와 `next()`로 원소를 소비한다.
- 남은 원소가 없는데 `next()`를 호출하면 `NoSuchElementException`이 발생한다.
- `remove()`는 선택적 연산이다. 지원하더라도 `next()` 전이나 한 번의 `next()` 뒤 두 번 호출하면 `IllegalStateException`이 발생할 수 있다.
- 여러 번 순회해야 하면 같은 iterator를 되감는다고 가정하지 말고 `iterator()`를 다시 호출한다.

향상된 for문은 배열이나 `Iterable` 식에 적용된다. `Map`은 `Iterable`이 아니므로 `entrySet()`, `keySet()`, `values()` 중 필요한 뷰를 순회한다.

```java
for (Map.Entry<String, Integer> entry : counts.entrySet()) {
    System.out.println(entry.getKey() + "=" + entry.getValue());
}
```

일반 컬렉션의 fail-fast iterator는 동시 수정을 발견하면 `ConcurrentModificationException`을 던질 수 있지만 최선 노력 진단일 뿐이다. 예외 발생에 의존해 동시성 안전성을 확보하면 안 된다.

## Comparable과 Comparator

| 계약 | 정의 위치 | 의미 |
|---|---|---|
| `Comparable<T>` | 정렬되는 타입 내부 | 대표 natural ordering |
| `Comparator<T>` | 타입 외부의 전략 객체 | 상황별 대체 ordering |

```java
record Member(String name, int score) {}

Comparator<Member> ranking = Comparator
        .comparingInt(Member::score)
        .reversed()
        .thenComparing(Member::name);

members.sort(ranking);
```

- 비교 결과는 음수, 0, 양수라는 부호만 의미한다. 정확히 `-1`, `0`, `1`을 반환해야 하는 것은 아니다.
- `a - b`로 정수 비교를 구현하면 overflow로 순서가 뒤집힐 수 있다. `Integer.compare`나 `comparingInt`를 사용한다.
- 비교는 반대칭성, 추이성, 동치류 일관성을 지켜야 정렬 알고리즘과 정렬 컬렉션이 안정적으로 동작한다.
- natural ordering이나 comparator가 `equals`와 일관되지 않을 수는 있지만, `TreeSet`과 `TreeMap`에서는 비교 결과 0이 원소나 키의 동일성을 정하므로 특별히 주의한다.
- 여러 기준은 `thenComparing`으로 명시해 동점 처리와 결과 재현성을 보장한다.

## 정렬과 탐색

- `List.sort(comparator)`는 리스트를 제자리에서 정렬하고 stable sort를 요구한다. 같은 비교 순서인 원소의 기존 상대 순서가 유지된다.
- `Collections.sort(list)`는 natural ordering으로 리스트를 정렬하며 현재 API에서는 `list.sort(null)`로 위임한다.
- `Collections.binarySearch`는 같은 ordering으로 미리 정렬된 리스트에 사용해야 한다. 전제가 깨지면 결과는 정의되지 않는다.
- 연결 리스트처럼 random access가 느린 구조에서는 같은 API라도 내부 비용과 실제 성능이 달라진다.
- `min`, `max`, `reverse`, `shuffle`은 원본 변경 여부와 randomness 요구 수준을 확인한 뒤 사용한다. 일반 `shuffle`은 보안용 난수 계약이 아니다.

## wrapper, view, copy 구분

- `Collections.unmodifiableList(source)`는 수정 연산을 막는 읽기 전용 view다. 원본 변경은 view에 보일 수 있고 원소 객체까지 불변으로 만들지 않는다.
- `List.copyOf(source)`는 현재 원소를 담은 수정 불가 리스트다. 이후 원본의 구조 변경은 결과에 반영되지 않는다.
- `Collections.synchronizedList(source)` 같은 wrapper는 개별 연산을 동기화하지만, 순회할 때는 문서가 요구하는 외부 동기화가 필요하다.
- concurrent collection은 snapshot, weak consistency 등 별도 순회 계약을 가질 수 있으므로 일반 fail-fast iterator와 같다고 가정하지 않는다.

## 면접 체크포인트

- `Iterable`과 상태를 가진 `Iterator`의 역할 차이
- 향상된 for문이 가능한 대상과 `Map` 순회 방법
- 자연 순서와 외부 comparator를 나누는 이유
- 비교 함수에서 뺄셈을 피해야 하는 이유
- binary search의 정렬 전제와 comparator 일치 조건
- unmodifiable view와 immutable copy의 차이

## 김영한 강사 강의 단원

- [순회1 - 직접 구현하는 Iterable, Iterator](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216021)
- [순회2 - 향상된 for문](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216022)
- [순회3 - 자바가 제공하는 Iterable, Iterator](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216023)
- [정렬1 - Comparable, Comparator](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216024)
- [정렬2 - Comparable, Comparator](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216025)
- [정렬3 - Comparable, Comparator](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216026)
- [컬렉션 유틸](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216027)
- [컬렉션 프레임워크 전체 정리](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216028)
- [문제와 풀이](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216029)
- [정리](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216030)

## Java SE 26 근거

- [Iterable](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Iterable.html)
- [Iterator](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Iterator.html)
- [JLS 14.14.2, 향상된 for문](https://docs.oracle.com/javase/specs/jls/se26/html/jls-14.html#jls-14.14.2)
- [Comparable](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Comparable.html)
- [Comparator](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Comparator.html)
- [Collections](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Collections.html)
- [List.sort](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/List.html#sort(java.util.Comparator))

## 관련 문서

- [[Java-Generics-and-Collections-List-Abstraction|List 추상화와 성능]]
- [[Java-Generics-and-Collections-Set|Set 구현 선택]]
- [[Java-Generics-and-Collections-Map-Stack-Queue|Map, Stack, Queue와 Deque]]
