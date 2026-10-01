---
tags: [java, collections, hash, hashcode, equals, hashset]
status: done
verified_at: 2026-09-30
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Hashing", "Java 해시와 HashSet"]
---

# Java 해시와 HashSet 원리

김영한 강사의 해시 단원은 직접 주소 방식의 빠른 조회에서 시작해 메모리 낭비, 나머지 연산, 충돌, 버킷 체이닝을 차례로 도입한다. 객체를 정수 해시로 바꿔도 충돌은 사라지지 않는다. 충돌을 다루면서도 평균적인 버킷 탐색을 짧게 유지하는 게 중요하다.

## 직접 주소에서 해시 테이블까지

1. 배열로 만든 Set은 중복을 막으려고 `add`마다 전체를 비교하는 `contains`를 먼저 호출한다. 검색이 O(n)이라 add도 O(n)이고 n개를 넣으면 O(n²)이다. 끝에 붙이기만 하는 리스트와 달리 Set은 유일성 검사가 입력 성능을 정하므로, 해시의 목표는 이 membership 검사를 평균 O(1)로 만드는 것이다.
2. 값을 배열 인덱스로 바로 쓰면 저장과 조회가 O(1)이지만 값의 범위만큼 공간이 필요하다. 0에서 99 사이 값 6개를 위해 100칸을 만들면 94칸이 빈다. int 전체 범위(2^32개 값)를 4바이트 칸으로 덮으려면 2^32 x 4 = 17,179,869,184바이트(16GiB)가 필요하다.
3. `index = hash % capacity`처럼 제한된 버킷으로 압축하면 공간이 capacity로 고정되고 index 계산도 O(1)이다. capacity 10이면 14는 4번, 99는 9번 버킷이다.
4. 서로 다른 키가 같은 버킷에 배치되는 해시 충돌은 필연적이다. 칸마다 값 하나만 두면 99 다음에 넣은 9가 같은 9번 칸을 덮어써 99가 예외 없이 사라진다. 그래서 버킷마다 후보를 저장하고 `equals`로 실제 키를 찾는 separate chaining 같은 전략이 필요하다.
5. capacity 10에서 9, 19, 29, 99는 모두 9번 버킷에 모여 99를 찾는 데 4번 비교한다. 모든 값이 한 버킷에 몰리면 O(n)이지만 고르게 퍼지면 버킷마다 몇 개만 비교하므로 평균 O(1)이다.
6. 원소 수가 버킷 수에 비해 너무 커지지 않도록 capacity와 load factor(원소 수 / capacity)를 관리한다. capacity를 줄이면 충돌이 잦아지고 늘리면 메모리가 낭비된다. 원소 수가 capacity의 약 75%를 넘으면 충돌이 잦아진다는 경험칙이 있고, Java `HashSet`, `HashMap` 기본 생성자의 load factor도 0.75다(아래 확장 절).

음수 해시를 버킷으로 바꿀 때 `Math.abs(hash) % capacity`는 안전하지 않다. `Math.abs(Integer.MIN_VALUE)`는 여전히 음수이므로 다음처럼 처리할 수 있다.

```java
int index = Math.floorMod(hash, capacity);
```

## 문자열과 객체의 버킷 계산

- 문자는 코드표의 숫자(A는 65, B는 66)이므로 문자 코드를 더해 해시를 만들 수 있지만, 합은 순서를 무시해 AB와 BA가 모두 131로 충돌한다. `String.hashCode()`는 `s[0]*31^(n-1) + s[1]*31^(n-2) + ... + s[n-1]`을 int 산술로 계산해 순서를 반영한다(AB는 2081, BA는 2111). overflow로 음수도 나온다. `"spring".hashCode()`는 -895679987이다.
- `Integer.hashCode()`는 값 자체라 정수 Set에서는 `hashCode() % capacity`가 `value % capacity`와 같다.
- 필드 하나로 `Objects.hash(id)`를 쓰면 결과는 `31 + id.hashCode()`다. Javadoc도 인자 하나의 결과가 그 객체의 hashCode와 같지 않다고 경고하며, 필드 하나면 `Objects.hashCode(id)`로 충분하다.

JDK 21.0.3에서 `Objects.hash(id)`를 capacity 10 버킷에 배치한 결과다.

| id | `Objects.hash(id)` | `Math.abs(h) % 10` | `Math.floorMod(h, 10)` |
|---|---|---|---|
| hi | 3360 | 0 | 0 |
| JPA | 73690 | 0 | 0 |
| java | 3254849 | 9 | 9 |
| spring | -895679956 | 6 | 4 |

- hi와 JPA는 0번 버킷에서 충돌한다. `contains`는 hashCode로 0번 버킷을 찾은 뒤 버킷 안에서 `equals`로 실제 원소를 확인한다. hashCode는 위치를 찾고 equals는 그 위치에서 최종 일치를 판정한다. 대소문자가 다르면 해시도 달라 소문자 jpa는 105466, 6번 버킷이다.
- 음수 처리 방식에 따라 spring은 6번이나 4번 버킷이 된다. 저장과 조회가 같은 계산을 쓰면 둘 다 동작하지만 `Math.abs`는 위의 `Integer.MIN_VALUE`에서 음수 index를 만든다.
- Java `HashMap`은 나머지 연산 대신 capacity를 2의 거듭제곱으로 유지하고 `hash = h ^ (h >>> 16)`으로 상위 bit를 섞은 뒤 `(capacity - 1) & hash`로 index를 구한다(OpenJDK 21 구현 세부). bit mask라 음수 index가 생기지 않는다.

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

### 한쪽만 구현했을 때의 실패

해시 자료구조는 hashCode로 버킷을 찾고 버킷 안의 후보를 equals로 최종 확인한다. 버킷에 원소가 하나뿐이어도 equals는 생략할 수 없다. hi만 저장된 상태에서 같은 0번 버킷으로 떨어지는 JPA로 검색하면 equals 없이는 hi를 찾았다고 오판한다.

JDK 21.0.3 `HashSet`에 id가 같은 두 instance를 넣고 같은 id의 새 instance로 검색한 결과다.

| 구현 | 저장 | 검색 |
|---|---|---|
| 둘 다 미구현 | instance마다 기본 hashCode가 달라 대개 다른 버킷에 중복 저장(size 2) | 실패 |
| hashCode만 구현 | 같은 버킷에 가지만 기본 equals가 참조 비교라 중복 저장(size 2) | 버킷은 찾지만 equals가 false라 실패 |
| equals만 구현 | 버킷이 대개 달라 equals로 비교할 기회도 없이 중복 저장(size 2) | 우연히 같은 버킷이 아니면 실패 |
| 둘 다 구현 | 같은 버킷에서 equals가 true라 중복 거부(size 1) | 성공 |

- 논리적 동등 기준이 필요하면 두 메서드를 같은 필드로 함께 구현한다. 넓이와 높이가 같은 사각형처럼 값으로 같다고 볼 객체도 재정의 전에는 `HashSet`에 중복 저장된다. 해시 자료구조에 넣지 않는 타입이라면 둘 다 재정의하지 않아도 되지만, equals를 재정의했다면 Object 계약대로 hashCode도 함께 재정의한다([[Java-Backend-Fundamentals-Object-Concurrency#잘못 구현했을 때|Object 계약을 잘못 구현했을 때]]).
- 여러 필드는 `Objects.hash(a, b)`로 섞을 수 있다. 호출마다 varargs 배열과 primitive boxing이 생길 수 있으므로 hot path라면 `31 * h + field.hashCode()`를 직접 쓰는 선택도 있다.
- 표준 해시도 충돌한다. `"Aa".hashCode()`와 `"BB".hashCode()`는 모두 2112다(65 x 31 + 97 = 66 x 31 + 66). equals가 최종 판정하므로 정확성은 유지되고 비교 비용만 는다.
- `System.identityHashCode(obj)`는 재정의 여부와 관계없이 `Object`의 기본 hashCode 값을 돌려주므로 재정의 전후를 비교해 관찰할 때 쓴다. 이 값도 주소나 유일성을 보장하지 않는다.

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

## Java HashSet의 확장과 버킷 트리화

고정 크기 테이블은 원소가 늘면 충돌이 잦아지고, 원소가 계속 들어오므로 처음부터 적정 크기를 정하기도 어렵다. `HashSet`은 배경 `HashMap`이 이를 자동으로 처리한다.

- 문서화된 기본값: `HashSet()`과 `HashMap()`은 초기 capacity 16, load factor 0.75다. 항목 수가 load factor x 현재 capacity를 넘으면 내부 구조를 다시 만들어(rehash) 버킷 수를 대략 2배로 늘린다. API 문서는 0.75를 시간과 공간 비용의 절충으로 설명한다. 높이면 공간은 줄지만 조회 비용이 는다.
- rehash는 capacity가 바뀌므로 모든 원소의 버킷 index를 다시 계산해 옮기는 전체 재배치다. 한 번은 비싸지만 이후 충돌이 줄어 평균 성능이 회복된다. OpenJDK 21 `resize`는 `hashCode()`를 다시 부르지 않고 node에 저장한 hash로 새 index만 계산하며, 2배 확장이라 각 버킷의 원소는 원래 index j나 j + 이전 capacity로 나뉜다.
- 배수를 크게 잡을수록 전체 재배치 횟수가 준다. OpenJDK `HashMap`은 capacity를 2의 거듭제곱으로 유지하며 2배씩 늘리지만, API는 대략 2배라고만 적으므로 정확한 배수를 계약으로 쓰지 않는다.
- 예상 원소 수 n을 알면 Java 19부터 `HashSet.newHashSet(n)`, `HashMap.newHashMap(n)`이 기본 load factor를 반영해 resize 없이 담을 크기로 만든다. `new HashMap<>(n)`의 n은 담을 mapping 수가 아니라 initial capacity라서 n개를 넣는 도중 resize될 수 있다. API 문서 기준으로 rehash를 피하려면 initial capacity가 최대 항목 수 / load factor보다 커야 한다. 특별한 이유가 없으면 기본 생성자로 충분하다.
- 버킷 트리화는 OpenJDK 구현 세부다(Java 8, JEP 180). 한 버킷에 node가 몰리면 연결 리스트를 red-black tree로 바꿔 버킷 안 탐색을 O(n)에서 O(log n)으로 낮춘다. 8개가 몰린 버킷은 리스트로 최악 8번 비교하지만 트리는 약 3번, 32개면 약 5번이다. 임계치는 [[Java-Backend-Fundamentals-Object-Concurrency#HashMap|HashMap 내부 구현]]에 있다.
- 구현 주석은 트리 버킷의 최악 O(log n)을 키의 hash가 서로 다르거나 `Comparable`로 순서를 정할 수 있을 때로 한정한다. 같은 hash를 가진 비교 불가능한 키가 몰리면 이득이 제한된다. 무작위 hash와 load factor 0.75에서 버킷 길이가 8 이상일 확률은 1000만분의 1 미만이라 정상 분산에서는 트리 버킷이 드물다.

## 면접 체크포인트

- 서로 다른 해시 코드가 같은 버킷에 갈 수 있고, 같은 해시 코드는 반드시 같은 버킷에 간다는 구분
- `equals`가 같으면 `hashCode`가 같아야 하지만 그 역은 성립하지 않는 이유
- 기대 상수 시간, 상각 상수 시간, 최악 시간을 구분하는 방법
- 가변 객체를 `HashSet` 원소나 `HashMap` 키로 넣었을 때 생기는 실패
- hashCode만 재정의하면 `HashSet`에 중복이 생기는 이유
- rehash가 모든 원소를 다시 배치하는 이유와 `newHashMap`을 쓰는 경우

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
- [자바가 제공하는 Set4 - 최적화](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216003)
- [문제와 풀이2 (Set 섹션)](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216005)
- [정리 (Set 섹션)](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=216006)

## Java SE 26 근거

- [Object.equals와 hashCode](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Object.html)
- [String.hashCode](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/String.html#hashCode())
- [HashSet](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/HashSet.html)
- [HashMap](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/HashMap.html)
- [Objects.hash](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Objects.html#hash(java.lang.Object...))
- [System.identityHashCode](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/System.html#identityHashCode(java.lang.Object))
- [Integer.hashCode](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Integer.html#hashCode())
- [JEP 180: Handle Frequent HashMap Collisions with Balanced Trees](https://openjdk.org/jeps/180)
- [OpenJDK 21 HashMap source](https://github.com/openjdk/jdk/blob/jdk-21%2B35/src/java.base/share/classes/java/util/HashMap.java)

## 관련 문서

- [[Hash-Table|해시 테이블]]
- [[Hash-Collision|해시 충돌]]
- [[Java-Standard-Library-Object-and-Equality|Object와 동등성]]
- [[Java-Generics-and-Collections-Set|Set 구현 선택]]
- [[Java-Backend-Fundamentals-Object-Concurrency|객체 계약, 동시성과 컬렉션 내부]]
