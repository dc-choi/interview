---
tags: [cs, data-structure, adt, set]
status: done
category: "CS - 자료구조"
aliases: ["Linear Data Structures ADT and Selection", "Abstract Data Type", "추상 자료형", "선형 자료구조 선택 기준"]
---

# 추상 자료형과 선형 자료구조 선택

선형 자료구조 문서에 공통으로 쓰는 ADT와 구현의 구분, Set ADT와 요구별 우선 후보를 다룬다. 구조별 세부는 [[Linear-Data-Structures|선형 자료구조 목차]]에서 이어진다.

## ADT와 구현을 분리해서 보기

추상 자료형(ADT, Abstract Data Type)은 값과 허용 연산의 의미, 즉 무엇을 할 수 있는지를 구체 구현과 독립적으로 명세한다. 자료구조는 그 연산을 메모리 배치와 알고리즘으로 어떻게 수행할지까지 정한 구현이다. stack, queue, deque, list, map과 set은 ADT이고 array나 linked list는 이를 구현하는 후보가 될 수 있다. 따라서 queue에 이중 연결 리스트가 반드시 필요한 것은 아니다. `head`와 `tail`을 유지하는 단방향 연결 리스트도 tail enqueue와 head dequeue를 각각 O(1)에 구현할 수 있다.

- array와 list의 차이도 이 구분으로 답한다. array는 연속 배치와 index 계산까지 정해진 자료구조이고, list는 순서 있는 원소의 추가, 삭제, 조회만 정한 ADT라 array list나 linked list로 구현한다. Python `list`처럼 구체 타입 이름에 list를 쓰는 언어도 있어 문맥을 확인한다.
- Java에서는 `List`, `Set`, `Map` interface가 ADT, `ArrayList`, `HashSet` 같은 class가 자료구조에 대응한다. signature만으로는 순서, 중복, 비용 같은 의미를 다 표현하지 못하므로 Javadoc 계약과 테스트가 명세를 보완한다([[Java-Generics-and-Collections-List-Abstraction|List 추상화]]).
- 필요한 연산을 ADT로 먼저 합의하면 사용하는 쪽과 구현하는 쪽을 나눌 수 있다. 이름순으로 득점자 전체를 돌려주는 `add`, `remove`, `getAll`만 정해 두면 한쪽은 그 연산으로 화면을 만들고, 다른 쪽은 정렬된 list, set이나 탐색 트리 중 구현을 고르고 바꾼다.
- 함수형 문맥의 ADT(Algebraic Data Type)와 약어가 같다([[Algebraic-Data-Types|대수적 자료형]]).

## Set

중복 없는 원소 collection이라는 추상 자료형이다. hash set이면 평균 membership/insert/delete가 O(1), ordered tree set이면 O(log n)과 정렬 순회를 제공한다. set이 반드시 hash table로만 구현된다고 단정하지 않는다.

구현: [Set.mjs](../set/Set.mjs), hash 기반 원리는 [[Hash-Table]]. list와 set의 선택, list로 중복을 막을 때의 비용과 hash set 구현 비교는 [[Linear-Data-Structures-List-and-Set|List와 Set]]에서 다룬다.

## 비교

| 요구 | 우선 후보 |
|---|---|
| index random access | dynamic array |
| 알고 있는 node 주변 삽입/삭제 | linked list |
| 최근 항목부터 처리 | stack |
| 들어온 순서대로 처리 | queue |
| 양 끝 조작 | deque |
| uniqueness와 membership | set |

## 출처

- 인프런, 널널한 개발자 강사, [자료를 정리하는 이유](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128268)
- 인프런, 감자 강사, [Set 개념과 구현](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=116156)
- [NIST DADS, abstract data type](https://xlinux.nist.gov/dads/HTML/abstractDataType.html)
- [Princeton Algorithms, Bags, Queues, and Stacks](https://algs4.cs.princeton.edu/13stacks/)
- [ADT 뜻, 데이터구조와 차이 — YouTube, 쉬운코드](https://www.youtube.com/watch?v=QcsQKgXemtA)
- [array list 차이 — YouTube, 쉬운코드](https://www.youtube.com/watch?v=2zF7PpvDwFg)
- [BJ.22 리스트, array list와 linked list — YouTube, 쉬운코드](https://www.youtube.com/watch?v=xvi-n11kym0)

## 관련 문서

- [[Linear-Data-Structures|선형 자료구조 목차]]
- [[Linear-Data-Structures-List-and-Set|List와 Set]]
- [[Hash-Table|Hash Table]]
- [[Trees-and-Balanced-Search-Trees|Tree와 균형 BST]]
- [[Java-Generics-and-Collections-List-Abstraction|Java List 추상화]]
- [[Algebraic-Data-Types|대수적 자료형 (약어가 같은 다른 ADT)]]
