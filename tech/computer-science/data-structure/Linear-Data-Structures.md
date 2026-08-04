---
tags: [cs, data-structure, array, linked-list, stack, queue, deque, set]
status: done
category: "CS - 자료구조"
aliases: ["Linear Data Structures", "선형 자료구조", "Array LinkedList Stack Queue"]
---

# 배열, 연결 리스트, Stack, Queue와 Deque

자료구조 선택은 이름보다 어떤 연산이 자주 필요한지로 결정한다. 같은 추상 자료형도 array, linked list, ring buffer처럼 여러 표현으로 구현할 수 있다.

## ADT와 구현을 분리해서 보기

추상 자료형(ADT)은 값과 허용 연산의 의미를 구체 구현과 독립적으로 명세한다. stack, queue, deque와 set은 ADT이고 array나 linked list는 이를 구현하는 후보가 될 수 있다. 따라서 queue에 이중 연결 리스트가 반드시 필요한 것은 아니다. `head`와 `tail`을 유지하는 단방향 연결 리스트도 tail enqueue와 head dequeue를 각각 O(1)에 구현할 수 있다.

## Array와 dynamic array

array는 index로 원소 위치를 계산해 random access가 O(1)이다. contiguous representation은 cache locality가 좋지만 중간 삽입/삭제는 뒤 원소를 shift해 O(n)이다.

고정 array는 크기를 미리 정하고, ArrayList나 vector 같은 dynamic array는 capacity가 부족할 때 더 큰 storage를 할당해 복사한다. append 한 번은 resize 때문에 O(n)일 수 있지만 여러 append에 나누어 계산한 amortized cost는 O(1)이다.

JavaScript `Array`는 언어 수준의 dynamic collection이고 engine이 elements kind와 sparsity에 따라 표현을 바꿀 수 있다. 일반 array가 항상 한 형태의 contiguous memory라는 전제로 성능을 단정하지 않는다. [[V8-Array-Internals]]

## Linked list

node가 value와 다음 node reference를 가진다. doubly linked list는 previous reference도 저장한다.

- 알고 있는 node 다음/앞 삽입과 삭제: O(1)
- index나 value를 찾아가는 과정: O(n)
- random access: O(n)
- node별 allocation과 pointer 때문에 memory overhead와 cache locality가 불리할 수 있음

연결 리스트의 삽입이 항상 O(1)이라는 설명은 target node를 이미 알고 있다는 전제가 빠진 것이다. 위치를 먼저 찾아야 하면 전체 연산은 O(n)이다.

구현: [LinkedList.mjs](linked-list/LinkedList.mjs), [DoublyLinkedList.mjs](linked-list/DoublyLinkedList.mjs)

## Stack

LIFO 추상 자료형으로 한쪽 끝에서 push/pop한다. call stack, parser, DFS, undo와 괄호 검증에 사용한다.

dynamic array의 끝을 top으로 쓰면 push/pop은 amortized O(1)이고, linked list의 head를 top으로 써도 O(1)이다. linked list의 tail을 매번 순회하는 구현은 stack 장점을 잃는다.

괄호 검증은 여는 괄호를 push하고 닫는 괄호가 나오면 top과 짝이 맞는지 확인한다. `top()` 전에 비어 있는지 검사하고 입력이 끝났을 때 stack도 비어 있어야 한다. 다음 큰 원소처럼 아직 답이 정해지지 않은 index를 단조 stack에 보관하면 각 원소가 한 번 push/pop되어 O(n)에 처리할 수 있다.

구현: [Stack.mjs](stack/Stack.mjs)

## Queue

FIFO 추상 자료형으로 rear에 enqueue하고 front에서 dequeue한다. scheduler, buffer, BFS와 producer-consumer 경계에 사용한다.

JavaScript array에서 `shift()`를 반복하면 원소 이동 비용이 들 수 있다. head index를 별도로 두는 array queue, circular buffer 또는 linked list의 head/tail pointer를 사용하면 enqueue/dequeue를 O(1)에 유지할 수 있다.

구현: [Queue.mjs](queue/Queue.mjs)

## Deque

양 끝에서 삽입과 삭제를 지원한다. sliding window, monotonic queue, work stealing과 0-1 BFS에 쓰인다. circular buffer는 contiguous storage를 유지하면서 front/rear index를 wrap-around한다.

구현: [Deque.mjs](deque/Deque.mjs)

## Set

중복 없는 원소 collection이라는 추상 자료형이다. hash set이면 평균 membership/insert/delete가 O(1), ordered tree set이면 O(log n)과 정렬 순회를 제공한다. set이 반드시 hash table로만 구현된다고 단정하지 않는다.

구현: [Set.mjs](set/Set.mjs), hash 기반 원리는 [[Hash-Table]].

## 비교

| 요구 | 우선 후보 |
|---|---|
| index random access | dynamic array |
| 알고 있는 node 주변 삽입/삭제 | linked list |
| 최근 항목부터 처리 | stack |
| 들어온 순서대로 처리 | queue |
| 양 끝 조작 | deque |
| uniqueness와 membership | set |

## 관련 문서

- [[자료구조(DataStructure)|자료구조 인덱스]]
- [[Trees-and-Balanced-Search-Trees|Tree와 균형 BST]]
- [[Heap|Heap과 Priority Queue]]
- [[Hash-Table|Hash Table]]
- [[Algorithm-Complexity|시간복잡도와 amortized 분석]]

## 출처

- 인프런, 큰돌 강사, [1-M](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100305), [2-N](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100338), [2-O](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100339), [2-T](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100344), [4-L](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100391)
- 인프런, 큰돌 강사, [4-O](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100394), [4-P](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100395), [5-B : stack을 이용한 풀이](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=152254), [5-N](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100409)

- 인프런, 널널한 개발자 강사, [자료를 정리하는 이유](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128268), [선형 자료구조 Stack과 Queue](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128269)
- 인프런, 감자 강사, [배열](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115670), [연결리스트 개념](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115717), [연결리스트 구현](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115735)
- 인프런, 감자 강사, [스택 개념](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115749), [스택 구현](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115755), [큐 개념](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115794), [큐 구현](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115819)
- 인프런, 감자 강사, [덱 개념과 구현](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115834), [Set 개념과 구현](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=116156)
- [NIST DADS, abstract data type](https://xlinux.nist.gov/dads/HTML/abstractDataType.html)
- [Princeton Algorithms, Bags, Queues, and Stacks](https://algs4.cs.princeton.edu/13stacks/)
- [ECMAScript Language Specification, Array Exotic Objects](https://tc39.es/ecma262/#sec-array-exotic-objects)
