---
tags: [cs, data-structure, linked-list]
status: done
category: "CS - 자료구조"
aliases: ["Linear Data Structures Linked List", "Linked List", "Doubly Linked List", "연결 리스트", "이중 연결 리스트"]
---

# 연결 리스트

연결 리스트의 연산 비용과 종류, cursor 편집, 배열로 흉내 내는 구현과 자주 묻는 문제를 다룬다. 이중 연결 리스트로 만든 deque의 경계 불변식은 [[Linear-Data-Structures-Stack-Queue-Deque#경계 불변식과 지연된 뒤집기|Stack, Queue와 Deque]]에 있다.

## Linked list

node가 value와 다음 node reference를 가진다. doubly linked list는 previous reference도 저장한다.

- 알고 있는 node 다음/앞 삽입과 삭제: O(1)
- index나 value를 찾아가는 과정: O(n)
- random access: O(n)
- node별 allocation과 pointer 때문에 memory overhead와 cache locality가 불리할 수 있음

연결 리스트의 삽입이 항상 O(1)이라는 설명은 target node를 이미 알고 있다는 전제가 빠진 것이다. 위치를 먼저 찾아야 하면 전체 연산은 O(n)이다. 검색도 같은 이유로 느리다. 정렬된 배열은 가운데 원소로 O(1)에 가서 이진 검색이 O(log n)이지만, 연결 리스트는 정렬돼 있어도 가운데 node까지 걸어가야 해 이진 검색을 흉내 내도 이동이 n/2 + n/4 + ... 로 n에 가까워 O(n)이다. 정렬되지 않은 배열의 검색도 O(n)이므로 배열이 검색의 점근 비용에서 앞서는 것은 정렬을 유지할 때다([[Binary-Search-and-LIS|이분탐색]]).

구현: [LinkedList.mjs](../linked-list/LinkedList.mjs), [DoublyLinkedList.mjs](../linked-list/DoublyLinkedList.mjs). C에서 node를 정의하고 할당, 연결, 해제하는 방법은 [[Data-Structures-in-C|C로 구현하는 자료구조]]에 있다.

종류는 다음 node만 아는 singly, 이전 node도 아는 doubly, 끝이 처음과 이어진 circular와 둘을 합친 circular doubly가 있다. head만 두면 끝 추가가 매번 끝까지 걷는 O(n)이라 tail 참조를 함께 둔다. circular singly list는 `tail.next`가 head라 tail 하나만 유지해도 양 끝에 O(1)로 닿는다. doubly는 이전 node를 O(1)에 알지만 node마다 pointer를 하나 더 쓴다. C++ `std::list`는 doubly linked list라 양 끝 삽입과 삭제가 O(1)이고, iterator가 node 주소 역할을 한다. `erase`는 지운 다음 원소의 iterator를 반환한다.

대표 쓰임은 cursor가 가리키는 위치에서 삽입과 삭제가 반복되는 문제다. 텍스트 편집기 명령(왼쪽, 오른쪽 이동, 삽입, 삭제)을 수십만 번 적용하면 배열은 매번 O(n) shift가 들지만 linked list는 cursor 이동과 삽입, 삭제가 모두 O(1)이다. 입력이 수천 이하라면 O(n²)도 통과하므로 익숙한 배열이 낫다. cursor가 `begin()`에서 왼쪽, `end()`에서 오른쪽으로 가는 경계와 지운 위치의 iterator를 다시 쓰는 실수가 흔한 runtime error 원인이다.

### 배열로 흉내 내는 linked list

코딩 테스트에서는 node를 동적 할당하지 않고 배열 세 개로 구현하기도 한다. `dat[i]`는 값, `pre[i]`와 `nxt[i]`는 이전과 다음 원소의 배열 index(없으면 -1)이고, `unused`는 다음에 쓸 빈 index다. 0번은 값이 없는 dummy head로 고정하면 빈 리스트와 맨 앞 삭제의 예외 처리가 사라진다.

- **삽입(addr 뒤에 x)**: `dat[unused] = x`, `pre[unused] = addr`, `nxt[unused] = nxt[addr]`로 새 원소를 채우고, `nxt[addr]`와 (다음 원소가 있으면) 그 원소의 `pre`를 `unused`로 바꾼 뒤 `unused++`.
- **삭제(addr)**: `nxt[pre[addr]] = nxt[addr]`, 다음 원소가 있으면 `pre[nxt[addr]] = pre[addr]`. dummy head 덕분에 `pre[addr]`는 항상 존재하고, 마지막 원소일 수 있는 `nxt[addr]`만 -1 검사가 필요하다.

지운 칸은 재사용하지 않아 프로그램이 끝날 때까지 메모리를 차지한다. 삽입 횟수 상한만큼 배열을 넉넉히 잡을 수 있는 문제 풀이용이며 제품 코드에는 쓰지 않는다.

### 자주 묻는 문제

- **원형 리스트의 길이**: 시작 node를 기억해 두고 다시 만날 때까지 이동한다. 시간 O(n), 공간 O(1).
- **두 리스트가 합쳐지는 지점**: 각 길이를 구해 긴 쪽을 차이만큼 먼저 이동한 뒤 둘을 한 칸씩 함께 옮기면 처음 만나는 node가 교차점이다. 방문 node를 저장하지 않아 공간 O(1).
- **cycle 존재 여부**: 한 칸씩 가는 pointer와 두 칸씩 가는 pointer를 같은 곳에서 출발시키면 cycle이 있을 때 반드시 만나고, 없으면 빠른 쪽이 끝에 닿는다(Floyd의 cycle 탐지). 공간 O(1).

## 출처

- 인프런, 감자 강사, [연결리스트 개념](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115717), [연결리스트 구현](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115735)
- [바킹독의 실전 알고리즘 0x04강, 연결 리스트 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=C6MX5u7r72E)
- [Princeton Algorithms, Bags, Queues, and Stacks](https://algs4.cs.princeton.edu/13stacks/)
- [BJ.22 리스트, array list와 linked list — YouTube, 쉬운코드](https://www.youtube.com/watch?v=xvi-n11kym0)
- [연결 리스트: 시연 — 부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019)](https://www.boostcourse.org/cs112/lecture/119040)

## 관련 문서

- [[Linear-Data-Structures|선형 자료구조 목차]]
- [[Linear-Data-Structures-Array|배열과 동적 배열]]
- [[Linear-Data-Structures-Stack-Queue-Deque|Stack, Queue와 Deque]]
- [[Data-Structures-in-C|C로 구현하는 자료구조]]
- [[Functional-Data-Structures|함수형 자료구조 (불변 연결 리스트와 구조 공유)]]
- [[Binary-Search-and-LIS|이분탐색]]
- [[Hash-Table-LRU-Cache|LRU Cache (hash map과 doubly linked list)]]
