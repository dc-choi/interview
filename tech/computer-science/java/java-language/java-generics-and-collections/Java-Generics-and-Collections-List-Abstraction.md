---
tags: [java, collections, list, arraylist, linkedlist, abstraction]
status: done
verified_at: 2026-08-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java List Abstraction", "Java List 추상화"]
---

# Java List 추상화와 성능

김영한 강사의 리스트 추상화 단원은 직접 만든 배열 리스트와 연결 리스트를 하나의 인터페이스로 묶고, 호출 코드와 구현 선택을 분리하는 과정을 보여준다. Java 표준 `List<E>`도 같은 경계에서 순서가 있는 원소, 인덱스 접근, 중복을 표현한다.

## 구현이 아니라 계약에 의존하기

```java
List<String> names = new ArrayList<>();
names.add("kim");
names.add("lee");
```

- 변수, 매개변수, 반환 타입을 `List<E>`로 두면 호출 코드는 구현체의 저장 방식에 덜 의존한다.
- `new ArrayList<>()`처럼 객체를 만드는 지점은 구현을 선택하는 조립 지점이다. 생성자나 팩터리에서 구현을 주입하면 정책 교체가 쉬워진다.
- 컴파일 타임 의존성은 소스가 참조하는 타입이고, 런타임 의존성은 실제 주입된 객체다. 인터페이스 도입만으로 구현 선택 책임까지 자동 분리되는 것은 아니다.
- 구현을 바꿔도 관찰 가능한 동작과 필요한 성능 계약이 유지되는지 테스트해야 한다.

## List의 계약

- `List`는 순서가 있는 컬렉션이며 원소마다 정수 인덱스가 있다. 일반적으로 중복 원소를 허용한다.
- 모든 구현이 모든 선택적 연산을 지원하지는 않는다. 수정할 수 없는 리스트에 `add`, `set`, `remove`를 호출하면 `UnsupportedOperationException`이 발생할 수 있다.
- 일부 구현은 `null`을 허용하지만 `List.of`와 `List.copyOf`로 만든 리스트는 `null`을 허용하지 않는다.
- 리스트의 `equals`는 같은 순서로 같은 원소가 있는지를 비교한다. 같은 원소라도 순서가 다르면 같지 않다.

## ArrayList와 LinkedList

| 작업 | `ArrayList` | `LinkedList` | 선택 시 확인할 점 |
|---|---|---|---|
| 인덱스 조회 | 상수 시간 | 가까운 끝부터 순회 | 조회 빈도 |
| 끝에 추가 | 상각 상수 시간 | 상수 시간 | 배열 확장 순간의 비용 |
| 중간 추가와 삭제 | 뒤 원소 이동 | 위치 탐색 뒤 연결 변경 | 탐색 비용이 사라지지 않음 |
| 메모리와 locality | 밀집 저장에 유리 | 노드와 참조 오버헤드 | 실제 JVM과 workload로 측정 |

연결 리스트가 중간 삽입 자체는 빠르더라도 위치를 찾는 데 선형 시간이 들 수 있다. 반대로 배열 리스트는 원소를 이동하지만 cache locality가 좋아 실제로 더 빠른 경우가 많다. Big O는 입력 크기에 따른 성장률을 설명할 뿐이고, 최악, 평균, 기대, 상각 중 어떤 기준인지 함께 밝혀야 한다.

## 자주 헷갈리는 팩터리와 뷰

```java
List<String> fixed = Arrays.asList("a", "b");
fixed.set(0, "A");       // 가능
// fixed.add("c");       // 크기 변경은 불가

List<String> immutable = List.of("a", "b");
// immutable.set(0, "A"); // 수정 불가
```

- `Arrays.asList`는 배열을 배경 저장소로 쓰는 고정 크기 리스트다. 배열과 리스트의 원소 변경이 서로 보일 수 있으며 불변 리스트가 아니다.
- `List.of`는 수정할 수 없고 `null`을 허용하지 않는다. 원소 객체 자체가 가변이면 그 내부 상태까지 불변이 되는 것은 아니다.
- `List.copyOf`는 입력의 현재 원소를 가진 수정 불가 리스트를 만든다. 입력 컬렉션에 이후 구조 변경이 생겨도 따라가지 않는다.
- `subList`는 원본의 범위를 보는 뷰다. 뷰 밖에서 원본을 구조 변경하면 이후 동작의 의미가 정의되지 않을 수 있다.

## API 함정과 선택 기준

- `List<Integer>`에서 `remove(1)`은 인덱스 1을 지운다. 값 `1`을 지우려면 `remove(Integer.valueOf(1))`처럼 의도를 분명히 한다.
- 앞뒤 양끝 연산이 핵심이면 `LinkedList`만 보기보다 `Deque` 구현을 먼저 검토한다.
- 읽기 위주, 인덱스 접근, 순차 순회가 일반적인 기본값이면 `ArrayList`가 적합한 경우가 많다.
- 중간 변경이 많다는 이유만으로 `LinkedList`를 고르지 않는다. 위치 탐색 방식, iterator 보유 여부, 메모리와 실제 지연 시간을 함께 측정한다.

## 면접 체크포인트

- 인터페이스 타입으로 선언하는 것과 실제 구현을 주입하는 것의 차이
- `ArrayList` 확장 비용을 상각 시간으로 설명하는 방법
- `LinkedList`의 연결 변경이 상수 시간이어도 전체 삽입이 선형일 수 있는 이유
- `Arrays.asList`, `List.of`, `List.copyOf`, `subList`의 소유권 차이

## 김영한 강사 강의 단원

- [리스트 추상화1 - 인터페이스 도입](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215972)
- [리스트 추상화2 - 의존관계 주입](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215973)
- [리스트 추상화3 - 컴파일 타임, 런타임 의존관계](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215974)
- [직접 구현한 리스트의 성능 비교](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215975)
- [자바 리스트](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215976)
- [자바 리스트의 성능 비교](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215977)
- [문제와 풀이1](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215978)
- [문제와 풀이2](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215979)
- [정리](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215980)

## Java SE 26 근거

- [List](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/List.html)
- [ArrayList](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/ArrayList.html)
- [LinkedList](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/LinkedList.html)
- [Arrays.asList](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Arrays.html#asList(T...))

## 관련 문서

- [[Java-Generics-and-Collections-Array-and-Linked-List|배열 리스트와 연결 리스트]]
- [[Java-Generics-and-Collections-Map-Stack-Queue|Map, Stack, Queue와 Deque]]
- [[Linear-Data-Structures|선형 자료구조]]
