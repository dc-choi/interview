---
tags: [java, arraylist, linkedlist, dynamic-array, linked-list, complexity]
status: done
verified_at: 2026-08-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Array and Linked List", "Java 배열 리스트와 연결 리스트"]
---

# Java 배열 리스트와 연결 리스트

배열 리스트는 index 접근과 연속적인 원소 처리에 강하고, 연결 리스트는 알고 있는 node 주변을 연결하고 끊는 연산에 강하다. 자료구조 선택은 이름이 아니라 전체 작업에서 탐색, 삽입, 삭제와 순회가 차지하는 비율로 결정한다.

## array의 언어 계약

Java array는 생성 시 길이가 정해지는 object다. `length`는 바뀌지 않고 유효한 index 밖에 접근하면 `ArrayIndexOutOfBoundsException`이 발생한다.

```java
String[] values = new String[4];
values[0] = "A";
```

index 접근은 일반적으로 상수 시간 모델로 분석할 수 있지만 JLS가 물리 메모리의 연속 배치나 실제 주소 계산 공식을 공개 계약으로 보장하는 것은 아니다. JVM 구현 세부사항을 언어 규칙으로 단정하지 않는다.

검색은 저장 방식과 조건에 달려 있다. 정렬되지 않은 array를 값으로 선형 검색하면 O(n), 정렬 상태와 comparator가 유지되면 binary search로 O(log n) 검색이 가능하지만 삽입 비용과 정렬 유지 비용을 함께 계산해야 한다.

## Big O를 읽는 법

Big O는 입력 크기가 커질 때 증가율의 asymptotic upper bound를 표현한다. 관례상 worst-case 분석에 자주 쓰이지만 Big O 자체가 곧 worst case라는 뜻은 아니다. best, average, expected, amortized와 worst case 중 무엇을 분석했는지 함께 적는다.

- O(1)은 입력 크기에 비례해 증가하지 않는다는 뜻이지 실제 시간이 1회 연산이라는 뜻이 아니다.
- O(n/2), O(2n)은 상수 계수를 제거하면 O(n)이다.
- 작은 입력에서는 allocation, cache locality, branch와 library 최적화 같은 상수 비용이 결과를 바꿀 수 있다.
- 한 번의 느린 resize를 여러 append에 나눠 계산하는 것은 amortized analysis다.

## dynamic array의 size와 capacity

dynamic array는 실제 원소 수인 size와 내부 저장 공간인 capacity를 분리한다. capacity가 부족하면 더 큰 array를 만들고 원소를 복사한다.

```java
final class SimpleList<E> {
    private Object[] elements = new Object[8];
    private int size;

    void add(E value) {
        ensureCapacity(size + 1);
        elements[size++] = value;
    }
}
```

끝 append 한 번은 resize 때문에 O(n)일 수 있지만 기하급수적으로 capacity를 키우면 일련의 append는 amortized O(1)로 설계할 수 있다. Java SE `ArrayList` API는 exact growth factor와 기본 내부 capacity를 공개 계약으로 보장하지 않는다. 특정 JDK 구현의 1.5배 확장을 모든 Java 버전의 규칙으로 외우지 않는다.

## 삽입과 삭제

array 중간에 삽입하려면 뒤 원소를 한 칸씩 옮기고, 삭제하면 빈자리를 메워야 한다. 이동 원소 수에 비례하므로 O(n)이다. 끝에서의 추가와 제거는 capacity 확장이나 reference 정리를 제외하면 빠르다.

- index를 먼저 검증하고 size와 capacity를 구분한다.
- 제거한 위치 이후의 사용하지 않는 reference를 null로 지워 객체가 불필요하게 reachable 상태로 남지 않게 한다.
- `System.arraycopy`나 `Arrays.copyOf`는 구현을 단순화할 수 있지만 복사량에 따른 비용은 남는다.
- 예상 원소 수를 안다면 `ArrayList(initialCapacity)`나 `ensureCapacity`로 resize 횟수를 줄일 수 있다. 과도한 선할당은 메모리 낭비다.

## generic array의 제약

`new E[]`는 허용되지 않으므로 학습용 generic dynamic array는 보통 private `Object[]`를 사용하고 꺼내는 경계에서 cast한다. unchecked cast를 배열 전체에 노출하지 않고 클래스 내부에 가둬 불변식을 지킨다. public API는 `E` 단위로 제공한다.

## linked list의 node 연결

singly linked node는 item과 next reference를 가진다. doubly linked node는 previous도 가져 양방향 이동과 이미 찾은 node의 제거를 단순화한다.

```java
final class Node<E> {
    E item;
    Node<E> next;

    Node(E item, Node<E> next) {
        this.item = item;
        this.next = next;
    }
}
```

head나 이미 알고 있는 node 다음에 연결하는 작업은 O(1)이다. index 위치를 먼저 찾아야 하는 `add(index, value)`는 탐색이 O(n)이므로 전체도 O(n)이다. 연결 리스트 삽입과 삭제가 언제나 O(1)이라는 설명에는 target node를 이미 안다는 전제가 빠져 있다.

## memory와 locality

연결 리스트는 미사용 capacity를 두지 않지만 node마다 reference와 object header가 필요하고 allocation 수가 늘어난다. pointer chasing은 cache locality에도 불리할 수 있다. 따라서 연결 리스트가 array list의 메모리 낭비를 일반적으로 해결한다고 단정할 수 없다.

반대로 큰 원소를 가진 자료구조에서 안정적인 node reference가 필요하거나 iterator가 찾은 위치에서 반복적으로 연결을 바꾸는 workload에는 linked representation이 의미가 있다. 실제 Java application에서는 `ArrayList`가 기본 후보가 되는 경우가 많지만 profile과 연산 패턴으로 결정한다.

## Java LinkedList의 범위

`java.util.LinkedList`는 doubly-linked `List`이면서 `Deque`다. index operation은 시작이나 끝 중 가까운 쪽에서 순회하지만 여전히 O(n)이다. 양 끝 queue와 deque 연산이 목적이면 index API가 없는 `Deque` 타입으로 의도를 드러낸다. stack이나 queue에는 `ArrayDeque`도 함께 비교한다.

## 복잡도 비교

| 연산 | dynamic array | linked list |
|---|---|---|
| index 조회 | O(1) | O(n) |
| 값 선형 검색 | O(n) | O(n) |
| 끝 append | amortized O(1) | tail이 있으면 O(1) |
| 앞 삽입 | O(n) shift | head를 알면 O(1) |
| index 중간 삽입 | O(n) | 탐색 포함 O(n) |
| 찾은 node 제거 | index에 따라 shift | O(1) 연결 변경 |

복잡도 표는 일반적인 구현 모델이다. thread safety, iterator 계약, memory 비용과 실제 구현 API도 함께 확인한다.

## 면접 체크포인트

- array의 고정 length와 dynamic array의 capacity 차이
- append가 amortized O(1)인 이유
- Big O와 worst-case를 동일시하면 안 되는 이유
- 연결 리스트 삽입이 O(1)이 되기 위한 전제
- 연결 리스트가 항상 memory 효율적이지 않은 이유
- generic dynamic array가 `Object[]`를 내부 저장소로 쓰는 이유

## 출처

- [JLS 10, Arrays](https://docs.oracle.com/javase/specs/jls/se26/html/jls-10.html)
- [ArrayList, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/ArrayList.html)
- [LinkedList, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/LinkedList.html)
- 김영한 강사, [배열의 특징1 - 배열과 인덱스](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215953)
- 김영한 강사, [빅오(O) 표기법](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215954)
- 김영한 강사, [배열의 특징2 - 데이터 추가](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215955)
- 김영한 강사, [직접 구현하는 배열 리스트1 - 시작](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215956)
- 김영한 강사, [직접 구현하는 배열 리스트2 - 동적 배열](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215957)
- 김영한 강사, [직접 구현하는 배열 리스트3 - 기능 추가](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215958)
- 김영한 강사, [직접 구현하는 배열 리스트4 - 제네릭1](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215959)
- 김영한 강사, [직접 구현하는 배열 리스트5 - 제네릭2](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215960)
- 김영한 강사, [배열 리스트 정리](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215961)
- 김영한 강사, [노드와 연결1](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215963)
- 김영한 강사, [노드와 연결2](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215964)
- 김영한 강사, [노드와 연결3](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215965)
- 김영한 강사, [직접 구현하는 연결 리스트1 - 시작](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215966)
- 김영한 강사, [직접 구현하는 연결 리스트2 - 추가와 삭제1](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215967)
- 김영한 강사, [직접 구현하는 연결 리스트3 - 추가와 삭제2](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215968)
- 김영한 강사, [직접 구현하는 연결 리스트4 - 제네릭 도입](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215969)
- 김영한 강사, [연결 리스트 정리](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215970)

## 관련 문서

- [[Linear-Data-Structures|선형 자료구조]]
- [[Algorithm-Complexity|시간복잡도와 Big O]]
- [[Java-Generics-and-Collections-List-Abstraction|Java List 추상화와 성능]]
- [[Java-Generics-and-Collections-Map-Stack-Queue|Java Map, Stack, Queue와 Deque]]
