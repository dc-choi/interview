---
tags: [cs, data-structure]
status: index
category: "CS - 자료구조"
aliases: ["Data Structure"]
---

# Data Structure

자료구조는 데이터를 저장하는 표현과 그 위에서 허용하는 연산을 함께 정의한다. 이름만 외우지 않고 workload에서 자주 쓰는 lookup, insert, delete, ordering, range query와 memory 비용을 기준으로 선택한다.

## 선형 구조

- [x] [[Linear-Data-Structures|Array, Linked List, Stack, Queue, Deque, Set]]
- [x] [[Linear-Data-Structures-List-and-Set|List와 Set, 순서, 중복과 membership 비용]]
- [x] [[Stack-Pairing-and-Monotonic-Patterns|Stack 짝짓기, 최장 괄호와 단조 stack]]
- [x] [[Hash-Table|Hash Table, 직접 주소화, 적재율과 resize]]
- [x] [[Hash-Collision|Hash collision, chaining과 open addressing]]

구현 예제:

- `linked-list/`: singly/doubly linked list
- `stack/`, `queue/`, `deque/`: 순서 기반 ADT
- `set/`: uniqueness collection
- `hash-table/`: hash table과 tests

## Tree와 우선순위 구조

- [x] [[Trees-and-Balanced-Search-Trees|트리 용어, Binary Tree 종류, BST, 균형 BST 개요와 C++ set]]
- [x] [[Trees-and-Balanced-Search-Trees-Rebalancing|AVL과 Red-Black 균형 복구 (회전, 삽입과 삭제 case, 높이와 회전 수 비교)]]
- [x] [[B-Tree|B-Tree (차수와 불변식, 분할과 병합, 높이별 수용량, 저장소 인덱스)]]
- [x] [[Trie-and-Autocomplete|Trie, prefix search와 자동완성]]
- [x] [[Heap|Heap, Priority Queue와 heap sort]]

## 검색 자료구조와 모델

- [x] [[Inverted-Index-and-TF-IDF|역색인, TF-IDF와 Redis 집합 연산]]
- [x] [[Vector-Space-Model-and-Cosine-Similarity|벡터 공간 모델, Bag of Words와 코사인 유사도]]

## 선택 기준

| 요구 | 대표 구조 | 핵심 비용 |
|---|---|---|
| index 접근 | dynamic array | access O(1), 중간 insert/delete O(n) |
| node 주변 편집 | linked list | 위치 탐색 O(n), 알려진 node 편집 O(1) |
| exact key lookup | hash table | 평균 O(1), collision과 resize 관리 |
| key 순서와 range | balanced search tree | O(log n), 정렬 순회 |
| disk/page 단위 key 순서와 range | B-tree 계열 | 높이 O(log_m n), 읽는 block 수 |
| prefix 검색 | trie | key 길이 O(L), node memory 비용 |
| 최댓값/최솟값 반복 추출 | heap | peek O(1), insert/extract O(log n) |

평균 복잡도만으로 결정하지 않는다. 입력 분포, worst-case 요구, cache locality, object overhead, concurrency, persistence와 표준 library 지원까지 함께 본다.

## 관련 문서

- [[알고리즘(Algorithm)|알고리즘 인덱스]]
- [[Algorithm-Complexity|시간복잡도와 P-NP]]
- [[Graph-Traversal-and-Shortest-Path|Graph 탐색과 최단 경로]]
