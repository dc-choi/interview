---
tags: [java, collections, hash, hashcode, equals, hashset]
status: done
verified_at: 2026-08-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Hashing", "Java 해시와 HashSet"]
---

# Java 해시와 HashSet 원리

김영한 강사의 해시 단원은 직접 주소 방식의 빠른 조회에서 시작해 메모리 낭비, 나머지 연산, 충돌, 버킷 체이닝을 차례로 도입한다. 핵심은 객체를 정수 해시로 바꿨다고 충돌이 사라지는 것이 아니라, 충돌을 다루면서도 평균적인 버킷 탐색을 짧게 유지하는 데 있다.

## 직접 주소에서 해시 테이블까지

1. 값을 배열 인덱스로 바로 쓰면 조회는 빠르지만 값의 범위만큼 공간이 필요하다.
2. `index = hash % capacity`처럼 제한된 버킷으로 압축하면 공간을 줄일 수 있다.
3. 서로 다른 키가 같은 버킷에 배치되는 해시 충돌은 필연적이다.
4. 버킷마다 후보를 저장하고 `equals`로 실제 키를 찾는 separate chaining 같은 전략이 필요하다.
5. 원소 수가 버킷 수에 비해 너무 커지지 않도록 capacity와 load factor를 관리한다.

음수 해시를 버킷으로 바꿀 때 `Math.abs(hash) % capacity`는 안전하지 않다. `Math.abs(Integer.MIN_VALUE)`는 여전히 음수이므로 다음처럼 처리할 수 있다.

```java
int index = Math.floorMod(hash, capacity);
```

## `hashCode`와 `equals`의 계약

- `equals`로 같은 두 객체는 같은 `hashCode`를 반환해야 한다.
- 같은 해시 코드라고 두 객체가 같은 것은 아니다. 서로 다른 객체의 충돌은 허용된다.
- 한 실행 중 비교에 쓰는 상태가 바뀌지 않았다면 같은 객체의 해시 결과는 일관되어야 한다.
- `hashCode`는 주소도, 전역 고유 식별자도, 상수 시간 계산의 보장도 아니다.

```java
record Member(long id, String name) {}

Set<Member> members = new HashSet<>();
members.add(new Member(1L, "kim"));
boolean found = members.contains(new Member(1L, "kim")); // true
```

record는 구성 요소를 바탕으로 `equals`와 `hashCode`를 제공하므로 이 예에서는 값 기반 조회가 된다. 일반 클래스라면 두 메서드를 같은 비교 상태로 구현해야 한다.

## 가변 키가 위험한 이유

키를 넣은 뒤 `equals`나 `hashCode`에 참여하는 값을 바꾸면 새 해시가 다른 버킷을 가리킬 수 있다. 객체는 테이블 안에 남아 있어도 `contains`나 `get`이 찾지 못하는 상태가 된다.

```java
final class Key {
    private int id;
    // id 기반 equals와 hashCode
}
```

이런 타입을 키로 쓴다면 삽입 이후 `id`가 바뀌지 않도록 불변 객체로 설계하는 편이 안전하다.

## 성능을 정확하게 말하기

- 해시 테이블 연산은 해시가 잘 분산되고 load factor가 관리된다는 전제 아래 기대 상수 시간으로 설명한다.
- 모든 키가 같은 버킷으로 몰리면 후보 비교가 늘어난다. 최악 시간은 구현과 충돌 처리 전략에 따라 선형에 가까워질 수 있다.
- 키의 `hashCode` 계산 자체가 길이에 비례할 수 있다. 예를 들어 문자열의 첫 해시 계산 비용까지 무조건 상수라고 단정하면 안 된다.
- resize가 발생하는 한 번의 삽입은 비쌀 수 있다. 여러 삽입에 비용을 나누는 상각 분석과 단일 연산 지연 시간을 구분한다.
- Java API가 보장하지 않는 정확한 배열 증가 배수, 버킷 변환 임계치 같은 내부 정책을 일반 계약처럼 사용하지 않는다.

## `HashSet`을 볼 때의 관점

Java SE 26 API는 `HashSet`이 `HashMap`을 배경으로 사용하고, 해시 함수가 원소를 버킷에 잘 분산한다는 전제에서 `add`, `remove`, `contains`, `size`에 상수 시간 성능을 제공한다고 설명한다. 순회 비용은 원소 수뿐 아니라 배경 `HashMap`의 capacity에도 비례할 수 있다.

- 중복 판정은 객체 식별자가 아니라 `equals` 계약을 따른다.
- 순회 순서는 보장되지 않는다. 순서가 필요하면 `LinkedHashSet`이나 `TreeSet`의 별도 계약을 선택한다.
- 초기 capacity를 지나치게 크게 잡으면 순회와 메모리 비용이 커질 수 있다.
- 사용자 입력이 키가 되는 공개 서비스에서는 충돌 편향, 메모리 한도, 입력 크기도 보안과 성능 문제로 본다.

## 면접 체크포인트

- 서로 다른 해시 코드가 같은 버킷에 갈 수 있고, 같은 해시 코드는 반드시 같은 버킷에 간다는 구분
- `equals`가 같으면 `hashCode`가 같아야 하지만 그 역은 성립하지 않는 이유
- 기대 상수 시간, 상각 상수 시간, 최악 시간을 구분하는 방법
- 가변 객체를 `HashSet` 원소나 `HashMap` 키로 넣었을 때 생기는 실패

## 김영한 강사 강의 단원

- [리스트(List) vs 세트(Set)](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215982)
- [직접 구현하는 Set0 - 시작](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215983)
- [해시 알고리즘1 - 시작](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215984)
- [해시 알고리즘2 - index 사용](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215985)
- [해시 알고리즘3 - 메모리 낭비](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215986)
- [해시 알고리즘4 - 나머지 연산](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215987)
- [해시 알고리즘5 - 해시 충돌 설명](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215988)
- [해시 알고리즘6 - 해시 충돌 구현](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215989)
- [직접 구현하는 Set1 - MyHashSetV1](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215991)
- [문자열 해시 코드](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215992)
- [자바의 hashCode()](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215993)
- [직접 구현하는 Set2 - MyHashSetV2](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215994)
- [직접 구현하는 Set3 - 직접 만든 객체 보관](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215995)
- [equals, hashCode의 중요성1](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215996)
- [equals, hashCode의 중요성2](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215997)
- [직접 구현하는 Set4 - 제네릭과 인터페이스 도입](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215998)

## Java SE 26 근거

- [Object.equals와 hashCode](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Object.html)
- [String.hashCode](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/String.html#hashCode())
- [HashSet](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/HashSet.html)
- [HashMap](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/HashMap.html)

## 관련 문서

- [[Hash-Table|해시 테이블]]
- [[Hash-Collision|해시 충돌]]
- [[Java-Standard-Library-Object-and-Equality|Object와 동등성]]
- [[Java-Generics-and-Collections-Set|Set 구현 선택]]
