---
tags: [cs, data-structure, heap, tree, priority-queue]
status: done
category: "CS - 자료구조"
aliases: ["Heap", "힙", "Max Heap", "Min Heap", "완전 이진 트리", "Complete Binary Tree", "Bubble Up", "Trickle Down", "Priority Queue"]
---

# Heap (힙)

완전 이진 트리를 기반으로, 부모와 자식 노드 사이에 대소관계가 성립하도록 유지하는 자료구조다. 그 덕에 루트에는 항상 전체에서 가장 큰 값(Max Heap) 또는 가장 작은 값(Min Heap)이 놓여, 최댓값/최솟값을 비교 없이 O(1)로 조회할 수 있다. 우선순위 큐(Priority Queue)의 표준 구현이다.

## Priority Queue는 ADT, Heap은 자료구조

priority queue는 원소를 우선순위와 함께 넣는 insert, 우선순위가 가장 높은 원소를 꺼내는 delete, 꺼내지 않고 보는 peek만 정한 추상 자료형이다. heap은 이를 구현하는 자료구조의 하나다. 정렬하지 않은 배열은 insert O(1)과 delete O(n), 정렬된 배열은 insert O(n)과 delete O(1), 균형 탐색 트리는 둘 다 O(log n)이다. heap은 두 연산이 모두 O(log n)이면서 배열 하나로 구현돼 가장 흔히 쓰이다 보니 둘을 같은 것으로 부르기 쉽지만 층위가 다르다.

- 이름에 queue가 있어도 FIFO가 아니다. 우선순위 scheduling을 쓰는 OS가 ready queue에서 우선순위가 가장 높은 process를 다음에 실행하는 것이 대표 사례다([[Context-Switching|문맥 전환과 scheduling]]).
- 메모리의 heap 영역(동적 할당 영역)과는 이름만 같다. 그 영역이 이 자료구조로 관리된다는 뜻이 아니다([[Stack-vs-Heap|Stack과 Heap]]).

## 왜 힙인가 — 정렬된 배열 대비

최댓값/최솟값에 O(1)로 접근하는 것만 원하면 정렬된 배열이나 연결 리스트로도 된다(헤드만 보면 됨). 차이는 **삽입**에서 난다. 선형 자료구조는 새 값을 넣을 때마다 전체를 다시 보고 재정렬해 O(n)이 들지만, 힙은 새 노드를 조상 경로의 부모들과만 비교하면 정렬 상태가 유지돼 O(log n)이다. 데이터가 많고 삽입이 잦을수록 힙이 유리하다.

## 완전 이진 트리 (Complete Binary Tree)

- **이진 트리**: 한 노드가 자식을 최대 2개까지 가지는 트리. 레벨별 최대 노드 수가 정해져 노드에 고유 인덱스를 부여할 수 있다.
- **완전 이진 트리**: 노드를 왼쪽부터 차곡차곡 채우고, 한 레벨이 꽉 차기 전에는 다음 레벨로 넘어가지 않는 트리. 마지막 레벨을 뺀 모든 레벨이 꽉 차 있다. root를 level 1로 세는 높이 h에서 최대 노드 수는 2^h − 1이다. edge 수로 높이를 세면 2^(h+1) − 1이다.

### 배열로 구현하는 이유

일반 트리는 보통 연결 리스트로 구현하지만(배열은 고정 할당이라 불편), 완전 이진 트리는 그 불편함이 사라져 배열의 장점만 취한다.

1. **O(1) 인덱스 접근**: 레벨별 최대 노드 수가 고정이라 수식으로 부모/자식 위치를 바로 계산한다. 루트를 0번으로 두면 인덱스 i 노드의 부모는 (i−1)/2, 왼쪽 자식은 2i+1, 오른쪽 자식은 2i+2. (특정 레벨까지 누적 노드 수 2^level − 1을 쓰면 n레벨 m번째 노드의 인덱스도 바로 구할 수 있다.) 연결 리스트는 순회해야만 접근 가능하다.
2. **원소를 뒤로 밀 일이 없다**: 최대 노드 수가 2^h − 1로 고정이고 삽입은 항상 끝(배열 push)에서만 일어나 중간 삽입에 따른 shift가 없다.
3. **트리가 기울지 않는다**: 왼쪽부터 채우는 제약 덕에 편향 트리가 생기지 않아 배열 중간에 빈 인덱스(메모리 낭비)가 없다. 편향 트리를 배열로 담으면 건너뛴 인덱스만큼 빈 공간이 낭비된다.

## 두 종류

- **Max Heap**: 부모 ≥ 자식 → 루트가 최댓값
- **Min Heap**: 부모 ≤ 자식 → 루트가 최솟값

힙은 부모-자식 관계만 보장하는 **느슨한 정렬**이다. 형제 간이나 전체가 정렬돼 있지는 않다. 두 종류의 구현 차이는 비교 방향(부등호)뿐이다.

## 삽입 — 버블 업 (Bubble Up, sift-up)

1. 완전 이진 트리 규칙대로 배열 끝에 push한다(왼쪽부터 채움).
2. 방금 넣은 노드를 부모와 비교해, 힙 조건을 어기면(Max Heap이면 부모보다 크면) 둘을 swap하며 위로 올린다.
3. 루트에 닿거나 부모가 조건을 만족할 때까지 반복한다.

새 노드가 조상 경로를 따라 거품처럼 위로 올라가는 모양이라 버블 업이다. 이동 거리가 트리 높이라 O(log n).

## 추출 — 트릭클 다운 (Trickle Down, sift-down)

루트를 꺼내면(extract) 빈 루트를 다시 채워야 한다.

1. 자식을 끌어올리지 않고 **배열 마지막 노드를 루트로** 옮긴다. 자식을 올리면 그 자리가 비어 또 채워야 하고 트리가 기울 수 있어, 마지막 노드를 쓰면 빈칸과 불균형을 한 번에 피해 연산이 준다.
2. 새 루트를 두 자식 중 조건에 맞는 쪽(Max Heap이면 더 큰 자식)과 비교해 어기면 swap하며 아래로 내린다.
3. 자식이 없거나(인덱스가 배열 범위 밖) 조건을 만족할 때까지 반복한다.

루트가 아래로 떨어지는 모양이라 트릭클 다운이다. 마찬가지로 O(log n). 버블 업과 트릭클 다운 모두 한 갈래 경로만 따라가므로 재귀로 깔끔하게 구현된다.

### 1-indexed 배열

루트를 1번에 두면 부모는 `i / 2`, 자식은 `2i`, `2i + 1`로 식이 더 단순하다. 삽입은 맨 끝(`++sz`)에 두고 부모보다 우선순위가 높으면 교환하며 올라가고, 삭제는 루트를 마지막 원소로 덮은 뒤 두 자식 중 우선순위가 높은 쪽과 비교하며 내려간다. 자식이 하나만 있는 경우(`2i + 1 > sz`)의 처리를 빠뜨리기 쉽다.

## 복잡도

| 연산 | 복잡도 |
|---|---|
| 최대/최소 접근 (peek) | O(1) |
| 삽입 (bubble up) | O(log n) |
| 추출 (trickle down) | O(log n) |
| 임의 값 탐색 | O(n) |

루트 외 임의 값 탐색은 O(n)이다. 힙은 그 용도의 자료구조가 아니다 — 정렬된 순서나 임의 키 조회가 필요하면 [[Hash-Table|해시 테이블]]이나 균형 탐색 트리를 쓴다.

## 활용

- **우선순위 큐**의 표준 구현 (작업 스케줄러, 다익스트라 최단 경로, 누적 완료 시각을 key로 여러 창구에 배정하는 [[Greedy-Sweep-and-Two-Pointers#정렬과 Priority Queue|event 단위 시뮬레이션]])
- **힙 정렬(Heap Sort)**: 전체를 힙에 넣고 루트를 하나씩 추출하면 정렬된다. O(n log n). 배열 안에서 heap을 만드는 in-place 구현, 최악 보장과 불안정성은 [[Algorithm-Sorting|정렬]]에서 다룬다.
- **Top-K**, 스트림에서 중앙값 유지(최대 힙 + 최소 힙) 등

## C++ priority_queue

- `std::priority_queue<int>`는 기본이 최대 힙이다. 최소 힙은 `priority_queue<int, vector<int>, greater<int>>`로 선언한다. `push`, `pop`, `top`, `empty`, `size`를 쓰고, 빈 큐에서 `top`이나 `pop`을 부르면 안 된다.
- 비교자 `comp(a, b)`가 true면 a가 b보다 우선순위가 낮다는 뜻이라 top에서 멀어진다. 정렬 비교 함수와 방향이 반대로 느껴지므로 기본이 최대 힙(`less`)이라는 점에서 출발해 생각한다. 사용자 비교자는 `operator()`를 가진 구조체로 넘기며, 같은 값에는 false를 반환해야 한다(strict weak ordering).
- 최댓값이나 최솟값 삽입과 추출만 필요하면 `set`/`multiset`보다 `priority_queue`가 낫다. 둘 다 O(log n)이지만 힙은 연속 배열에서 교환만 하므로 노드 할당과 균형 유지를 하는 트리보다 상수가 작고 메모리도 적다. 임의 원소 삭제나 양쪽 끝 접근이 필요할 때만 `multiset`을 쓴다([[Trees-and-Balanced-Search-Trees#C++ set, multiset, map|C++ set, multiset, map]]).
- 대표 예: 크기 a, b인 두 묶음을 합치는 비용이 a + b일 때 전체를 하나로 합치는 최소 비용은 매번 가장 작은 두 묶음을 합치는 greedy다. 최소 힙에서 두 개를 꺼내 합을 비용에 더하고 합을 다시 넣는다(Huffman 부호와 같은 구조).

## 면접 체크포인트

- 힙 = 완전 이진 트리 + 부모-자식 대소관계, 루트가 최대/최소
- priority queue(ADT)와 heap(자료구조)의 차이와 다른 구현(정렬 안 된 배열, 정렬된 배열, 균형 탐색 트리)의 연산 비용
- 정렬된 배열 대비 삽입이 O(log n) vs O(n)이라 잦은 삽입에 유리
- 완전 이진 트리를 배열로 구현하는 세 이유(인덱스 수식, 끝에만 삽입, 안 기움)
- 부모/자식 인덱스 수식((i−1)/2, 2i+1, 2i+2)
- 버블 업(삽입)과 트릭클 다운(추출), 추출 시 마지막 노드를 루트로 올리는 이유
- peek는 O(1)이지만 임의 탐색은 O(n) — 용도 구분
- 힙 정렬 O(n log n)과 우선순위 큐 구현

## 관련 문서
- [[자료구조(DataStructure)|자료구조 인덱스]]
- [[Algorithm-Sorting|정렬 (힙 정렬, 분할 정복)]]
- [[Algorithm-Complexity|시간복잡도와 Big O]]
- [[Algorithm-Recursion|재귀 (버블 업/트릭클 다운 구현)]]
- [[Trees-and-Balanced-Search-Trees|균형 탐색 트리와 C++ set]]

## 배열과 연결 node, 제한된 Top-K

연결 node로도 완전 이진 트리를 구현할 수 있지만 parent와 마지막 node를 관리해야 한다. 다음 삽입 부모와 삭제 뒤 마지막 node를 찾으려면 조상으로 올라갔다가 반대 subtree 끝으로 내려가 O(log n)이 든다. 배열에서는 다음 자리가 index n, 마지막 자리가 n-1이라 O(1)이다. sift-up/down에서는 node 연결 대신 값만 교환할 수 있고, 자식이 하나일 때도 우선순위 비교를 처리한다.

N개 입력 중 가장 작은 K개만 보관하려면 크기를 K로 제한한 max heap을 쓴다. 새 값을 넣고 크기가 K를 넘으면 최댓값을 버린다. 결과를 꺼내면 큰 값부터 나오므로 오름차순 출력은 뒤집는다. 가장 큰 K개는 min heap으로 대칭이다. 비용은 O(N log K), 추가 공간 O(K)다(K가 1이면 상수 처리). 전체 정렬의 O(N log N), O(N) 저장과 비교해 K가 작거나 입력을 한 번만 읽을 때 적합하다.

## 출처

- 인프런 보충 강의: [우선순위 큐와 힙 - 구현1(힙 삽입)](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135762), [우선순위 큐와 힙 - 구현2(힙 제거)](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135763), [우선순위 큐와 힙 - 구현3(우선순위 큐)](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135764)
- 인프런 보충 강의: [5주차 개념 #5. 큰돌 교수님의 과제는 너무 어려워!!!](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=242051)

- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — 우선순위 큐와 힙, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135761)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — 힙 정렬, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135765)
- [바킹독의 실전 알고리즘 0x17강, 우선순위 큐 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=_9mbqoF9qzc)
- [cppreference, std::priority_queue](https://en.cppreference.com/w/cpp/container/priority_queue)
- [BJ.12 우선순위 큐와 힙의 개념과 차이 — YouTube, 쉬운코드](https://www.youtube.com/watch?v=P-FTb1faxlo)
