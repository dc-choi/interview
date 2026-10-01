---
tags: [java, collections, iterable, iterator, comparable, comparator, sorting]
status: done
verified_at: 2026-09-30
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

### 향상된 for문은 iterator 루프로 번역된다

JLS 14.14.2에 따라 대상이 `Iterable`이면 향상된 for문은 아래 basic for문으로 번역되고, 배열이면 index 루프로 번역된다. 둘 다 아니면 컴파일 오류다. JDK 21 javac는 `for-each not applicable to expression type`(required: array or java.lang.Iterable)로 거부한다.

```java
for (Iterator<String> i = names.iterator(); i.hasNext(); ) {
    String name = i.next();
    // 본문
}
```

- 직접 만든 자료구조도 `Iterable<T>`를 구현하고, 순회 위치(예: `currentIndex`)를 가진 `Iterator<T>`를 `iterator()`에서 새로 만들어 돌려주면 for-each 대상이 된다. iterator는 대상 자료구조의 내부 배열이나 node를 참조하며 순회하므로 단독으로 쓰이지 않는다.
- `Collection`이 `Iterable`을 상속하므로 `List`, `Set`, `Queue`는 같은 방식으로 순회된다. 구현체는 자기 구조에 맞는 iterator를 돌려준다. OpenJDK에서 `ArrayList`는 내부 클래스 `Itr`, `HashSet`은 배경 `HashMap`의 key iterator를 쓰지만 사용하는 쪽은 `hasNext()`, `next()`만 알면 된다.
- 매개변수를 `Iterable<Integer>`나 `Iterator<Integer>`로 받으면 `ArrayList`, `HashSet`과 이후에 만들 자료구조를 같은 코드로 처리한다.
- 컬렉션의 내부 표현을 노출하지 않고 원소에 차례로 접근하게 하는 [[Iterator패턴이란|Iterator 패턴]]의 Java 대응이다. `Iterable.iterator()`가 Aggregate의 iterator 생성 연산이고, 각 구현체의 iterator가 ConcreteIterator다.

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

### 비교 기준을 찾는 순서와 실패

- 정렬 메서드나 정렬 컬렉션에 `Comparator`를 넘기면 원소가 `Comparable`을 구현했더라도 그 comparator가 순서를 정한다. `list.sort(null)`과 comparator 없이 만든 `TreeSet`, `TreeMap`은 natural ordering을 쓴다.
- 둘 다 없으면 `Comparable`로 cast하다 `ClassCastException`이 난다. JDK 21.0.3에서 `Arrays.sort(Object[])`, `list.sort(null)`, `TreeSet.add`, `TreeMap.put`이 모두 그랬다. `TreeSet`과 `TreeMap`은 저장 위치를 삽입 시점의 비교로 정하므로 첫 원소부터 실패한다(OpenJDK `TreeMap`은 빈 map에 넣을 때도 `compare(key, key)`로 타입을 검사한다). 반면 원소가 하나인 배열의 `Arrays.sort`는 비교가 없어 예외 없이 끝나므로 작은 test data로는 결함이 드러나지 않을 수 있다.
- 정렬은 순서를 유지하는 자료구조에서만 의미가 있어 `HashSet` 자체에는 정렬 API가 없다. 정렬된 결과가 필요하면 `TreeSet`이나 정렬한 `List`로 옮긴다.
- enum의 `compareTo`는 선언 순서 기준이고 `final`이라 재정의할 수 없다. 카드 문양처럼 다른 순서가 필요하면 선언 순서를 그 순서에 맞추거나 `Comparator`를 둔다. 숫자를 먼저, 같으면 문양을 비교하는 식의 여러 기준은 `thenComparing`으로 잇는다.

## 정렬과 탐색

- `List.sort(comparator)`는 리스트를 제자리에서 정렬하고 stable sort를 요구한다. 같은 비교 순서인 원소의 기존 상대 순서가 유지된다.
- `Collections.sort(list)`는 natural ordering으로 리스트를 정렬하며 현재 API에서는 `list.sort(null)`로 위임한다.
- 정렬 알고리즘은 데이터 크기가 아니라 원소 타입으로 갈린다(Arrays API 구현 노트). `sort(int[])` 같은 기본형 배열은 Dual-Pivot Quicksort이고 모든 입력에서 O(n log n) 성능을 낸다고 문서화돼 있다. `sort(Object[])`, `sort(T[], Comparator)`와 이를 쓰는 `List.sort`, `Collections.sort`는 TimSort를 바탕으로 한 stable, adaptive, iterative mergesort이며 부분 정렬된 입력에서는 n lg n보다 훨씬 적게 비교한다. 기본형은 같은 값을 구분할 수 없어 stable 여부가 관찰되지 않는다. 두 구현 모두 Java 7에서 도입됐고, 작은 구간을 삽입 정렬 계열로 처리하는 내부 임계값은 크기 기준처럼 보여도 구현 세부다.
- 비교 계약을 어기는 `compareTo`나 comparator는 Java 7 이후 `IllegalArgumentException: Comparison method violates its general contract!`로 드러날 수 있다. Javadoc은 이 예외를 선택 사항으로 명시하며, 이전 mergesort는 같은 상황을 조용히 넘겼다.
- 기본 `List.sort`는 원소를 배열로 복사해 정렬한 뒤 되돌려 쓴다. 연결 리스트를 제자리에서 정렬할 때의 n² log n 비용을 피하려는 명세다. 정렬 알고리즘 일반은 [[Algorithm-Sorting|정렬 알고리즘]]에 있다.
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
- 향상된 for문이 컴파일 뒤 어떤 루프가 되는지와 직접 만든 자료구조를 for-each 대상으로 만드는 방법
- 자연 순서와 외부 comparator를 나누는 이유
- comparator도 `Comparable`도 없을 때 `TreeSet`이 첫 삽입부터 실패하는 이유
- 기본형 배열과 객체 배열의 정렬 알고리즘이 다른 이유
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
- [Arrays](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Arrays.html)
- [TreeSet](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/TreeSet.html)
- [TreeMap](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/TreeMap.html)
- [Enum.compareTo](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Enum.html#compareTo(E))
- [Java SE 7 and JDK 7 Compatibility](https://www.oracle.com/java/technologies/compatibility.html)
- [JDK-6880672, dual-pivot quicksort 도입](https://bugs.openjdk.org/browse/JDK-6880672)
- [JDK-6804124, TimSort 도입](https://bugs.openjdk.org/browse/JDK-6804124)

## 관련 문서

- [[Java-Generics-and-Collections-List-Abstraction|List 추상화와 성능]]
- [[Java-Generics-and-Collections-Set|Set 구현 선택]]
- [[Java-Generics-and-Collections-Map-Stack-Queue|Map, Stack, Queue와 Deque]]
- [[Iterator패턴이란|Iterator 패턴]]
- [[Algorithm-Sorting|정렬 알고리즘]]
