---
tags: [cs, data-structure]
status: index
category: "CS - 자료구조"
aliases: ["Data Structure"]
---

# Data Structure

자료구조는 데이터를 저장하는 표현과 그 위에서 허용하는 연산을 함께 정의한다. 이름만 외우지 않고 workload에서 자주 쓰는 lookup, insert, delete, ordering, range query와 memory 비용을 기준으로 선택한다.

## 선형 구조

- [x] [[Linear-Data-Structures|선형 자료구조 목차 (Array, Linked List, Stack, Queue, Deque, Set)]]
- [x] [[Linear-Data-Structures-ADT-and-Selection|ADT와 구현의 구분, Set ADT와 요구별 우선 후보]]
- [x] [[Linear-Data-Structures-Array|배열과 동적 배열 (주소 계산, 값을 index로 쓰는 배열, 확장 배수와 amortized 비용)]]
- [x] [[Linear-Data-Structures-Linked-List|연결 리스트 (종류, cursor 편집, 배열로 흉내 내는 linked list, 자주 묻는 문제)]]
- [x] [[Linear-Data-Structures-Stack-Queue-Deque|Stack, Queue와 Deque (괄호 검증, 배열 구현, circular queue, 표준 library, 경계 불변식)]]
- [x] [[Linear-Data-Structures-List-and-Set|List와 Set, 순서, 중복과 membership 비용]]
- [x] [[Data-Structures-in-C|C로 구현하는 자료구조 (pointer 규칙, realloc 확장, 자기 참조 구조체, 연결 리스트와 BST, hash chain, trie node)]]
- [x] [[Stack-Pairing-and-Monotonic-Patterns|Stack 짝짓기, 최장 괄호와 단조 stack]]
- [x] [[Hash-Table|Hash Table, 직접 주소화, 적재율과 resize]]
- [x] [[Hash-Collision|Hash collision, chaining과 open addressing]]
- [x] [[Hash-Table-LRU-Cache|LRU cache (hash map과 doubly linked list 조합, 표준 library 구현)]]

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
- [x] [[Graph-Optimization-Algorithms#Kruskal과 Union-Find|Union-Find (disjoint set, 경로 압축과 union by rank)]]

## 확률적 구조

- [x] [[Bloom-Filter|Bloom filter (거짓 양성 확률과 크기 계산, 삭제 불가와 변형, 거짓 양성의 비용)]]

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
| 관계와 연결 탐색 | graph (adjacency list, matrix) | list는 공간 O(V+E)와 이웃 순회 O(degree), matrix는 공간 O(V²)와 연결 확인 O(1) |
| 합치기만 하는 집합의 소속 판정 | Union-Find | 경로 압축과 union by rank를 함께 쓰면 amortized O(α(n)), 분리와 경로 질의 불가 |
| 최근 사용 순으로 버리는 고정 크기 cache | hash map + doubly linked list | get, put 기대 O(1), 항목마다 node와 앞뒤 참조 |
| 메모리가 빠듯한 membership 사전 확인 | Bloom filter | 추가와 조회 O(k), 1%에 원소당 약 9.6bit, 거짓 양성 허용과 삭제 불가 |

평균 복잡도만으로 결정하지 않는다. 입력 분포, worst-case 요구, cache locality, object overhead, concurrency, persistence와 표준 library 지원까지 함께 본다.

## 관련 문서

- [[알고리즘(Algorithm)|알고리즘 인덱스]]
- [[Algorithm-Complexity|시간복잡도와 P-NP]]
- [[Graph-Traversal-and-Shortest-Path|Graph 탐색과 최단 경로]]
