---
tags: [cs, data-structure, list, set, hash-set, adt]
status: done
verified_at: 2026-10-05
category: "CS - 자료구조"
aliases: ["List and Set", "List vs Set", "리스트와 셋", "리스트와 셋의 차이"]
---

# List와 Set

list와 set은 둘 다 같은 종류의 원소를 모으는 추상 자료형(ADT)이지만 순서, 중복과 존재 여부 확인 비용이 다르다. 이름이 아니라 순서가 의미 있는지, 같은 값이 반복될 수 있는지, 원소가 있는지를 얼마나 자주 묻는지로 고른다.

## 두 ADT의 계약

| 기준 | List | Set |
|---|---|---|
| 순서 | 원소마다 위치(index)가 있다 | ADT는 순서를 약속하지 않고, 구현이 삽입 순서나 정렬 순서를 줄 수 있다 |
| 중복 | 허용 | 불허. 이미 있는 원소를 add해도 바뀌지 않는다 |
| 대표 연산 | add, insert, get(i), remove, contains | add, remove, contains |
| 대표 구현 | array list, linked list | hash set, linked hash set, tree set |
| contains | 앞에서부터 비교해 O(n) | hash set은 기대 O(1), tree set은 O(log n) |
| 원소 외 memory | array list는 여유 capacity, linked list는 node마다 이웃 참조 | hash set은 빈 bucket과 항목별 hash(Java, CPython), tree set은 자식 참조 |

set에 순서가 없다는 말은 순서를 금지한다는 뜻이 아니라 ADT가 보장하지 않는다는 뜻이다. Java `HashSet`은 순서를 보장하지 않고 `LinkedHashSet`은 삽입 순서, `TreeSet`은 정렬 순서를 계약으로 준다. Python `set`은 순서 없는 고유 hashable 객체의 collection이다.

## Set을 고르는 경우

- **중복 제거**: 설문 응답 단어를 set에 모두 넣으면 고유한 단어만 남는다.
- **존재 여부 검사**: 지원자 n명 중 다른 사업 수혜자 m명에 포함된 사람을 거를 때 수혜자 목록이 list면 지원자마다 목록 전체를 훑어 O(n × m)이다. 수혜자 목록으로 hash set을 한 번 만들면 구성 O(m)에 조회 n번이 각각 기대 O(1)이라 전체 기대 O(n + m)이다.
- **집합 연산**: Python은 `a - b`, `a & b`, `a | b`, `a ^ b`로 차집합, 교집합, 합집합, 대칭차집합을 만든다. Java는 복사본에 `removeAll`, `retainAll`, `addAll`을 적용한다([[Java-Generics-and-Collections-Set|Java Set 구현 선택]]).

요구사항으로 판단하면 월드컵에서 한 골이라도 넣은 선수 명단은 고유하고 순서가 의미 없어 set, 연도별 시상식 대상 수상자는 순서가 있고 같은 사람이 여러 번 받을 수 있어 list다.

## List로 Set을 흉내 내면

중복 없이 저장하려면 add 전에 contains로 이미 있는지 확인해야 한다. list의 contains는 찾는 원소가 앞에 있으면 빨리 끝나지만 끝에 있거나 없으면 전체를 훑어 최악 O(n)이고, n개를 넣으면 O(n²)이다. 잘못 넣은 원소를 지울 때도 먼저 찾아야 해 O(n)이다. hash set은 같은 검사가 기대 O(1)이다.

hash set의 O(1)은 기대 비용이지 최악 보장이 아니다. 충돌이 한 bucket에 몰리면 비교가 늘어 최악 O(n)이 될 수 있고, 몰린 bucket을 tree로 바꾸는 구현은 key 조건에 따라 이를 O(log n)으로 줄인다([[Hash-Collision|해시 충돌]], [[Java-Generics-and-Collections-Hashing#Java HashSet의 확장과 버킷 트리화|버킷 트리화의 조건]]).

## 둘 다 가능하면 List가 기본

이미 중복이 없고 순서도 상관없이 한 번씩 순회만 할 데이터라면 set의 장점이 쓰이지 않는다. 이때는 list, 특히 array list가 낫다.

- **memory**: array list는 원소 참조를 연속으로 두고 여유 capacity만 더 잡는다. Java `HashSet`과 CPython `set`은 항목마다 hash 값을 두고 빈 bucket도 함께 잡으며, tree set은 자식 참조를 추가로 저장한다.
- **순회**: array list는 연속 배열을 차례로 읽는다. hash 기반 set은 빈 bucket까지 훑어 원소 수보다 table 크기에 끌려갈 수 있다. Java에서 이를 줄인 `LinkedHashSet`은 entry 연결을 유지하는 비용을 낸다([[Java-Generics-and-Collections-Set|Java Set 구현 선택]]).
- **정렬 set**: tree set은 정렬 순서를 주는 대신 조회가 hash set보다 느리다.

정리하면 중복 제거, 잦은 존재 여부 검사, 집합 연산처럼 set이 더 맞는 상황이 아니면 list를 기본으로 쓴다. list 안에서 array list와 linked list를 고르는 기준은 [[Linear-Data-Structures|선형 자료구조]]와 [[Java-Generics-and-Collections-List-Abstraction|Java List 추상화와 성능]]에 있다.

## Hash set은 hash table의 key만 쓴다

원소가 유일하고 순서를 따지지 않는 set의 계약은 hash table key의 성질과 같다. 그래서 hash set은 원소를 hash table의 key 자리에 저장하고 contains를 key 존재 확인으로 처리한다. OpenJDK `HashSet`은 내부 `HashMap`의 value 자리에 공유 dummy 객체 `PRESENT`를 넣고 `add`, `contains`, `remove`를 map 연산에 위임한다. CPython `set`은 dict를 재사용하지 않고 key와 cached hash만 담는 entry로 된 별도 hash table을 쓴다.

| 항목 | CPython 3.14 `set` | Java `HashSet` (Java SE 26 API, OpenJDK 21) |
|---|---|---|
| 충돌 처리 | open addressing. 인접 칸 몇 개(기본 9)를 linear probing으로 본 뒤 hash 상위 bit를 섞은 위치로 건너뛴다 | 배경 `HashMap`의 separate chaining. 몰린 bucket은 red-black tree로 바꾼다 |
| 최소 또는 기본 크기 | 8칸 | capacity 16 |
| 확장 시점 | 삭제 표시를 포함한 사용 칸이 table의 약 3/5에 이르면 | 원소 수가 capacity × 0.75를 넘으면 |
| 새 크기 | 유효 원소 수 × 4(5만 초과면 × 2)보다 큰 가장 작은 2의 거듭제곱 | capacity의 2배 |
| 축소 | 새 크기를 유효 원소 수로 정해 삭제가 많았으면 작아질 수 있다 | 줄지 않는다 |
| 크기 단위 | 2의 거듭제곱 | 2의 거듭제곱 |

표의 수치는 구현 세부라 버전마다 바뀔 수 있다. Java API가 보장하는 것은 기본 capacity 16, load factor 0.75, 대략 2배 rehash까지이고 bucket 구조와 줄지 않는 동작은 OpenJDK 소스 기준이다. dict와의 비교는 [[Hash-Table#CPython dict와 Java HashMap 구현 비교|해시 테이블의 구현 비교]]에 있다.

## 면접 체크포인트

- list와 set의 차이를 순서, 중복과 contains 비용으로 설명한다.
- 이어지는 질문은 set의 구현이다. hash table의 key에 원소를 저장하고 Java `HashSet`이 `HashMap`을 쓴다는 데까지 답한다.
- 언제 set을 쓰는지와 그 이유는 hash table의 기대 O(1) 조회를 묻는 질문이며 충돌, load factor와 resize로 이어진다([[Hash-Table|해시 테이블]]).
- list로 중복을 막으면 n개 삽입이 O(n²)가 되는 이유
- 둘 다 가능할 때 list를 고르는 근거(memory와 순회)
- hash set의 O(1)이 최악 보장이 아닌 이유

## 출처

- [YouTube, 쉬운코드, BJ.24 셋(set)과 해시 셋(hash set)](https://www.youtube.com/watch?v=IkImFugfFQk)
- [YouTube, 쉬운코드, Set, HashSet 설명](https://www.youtube.com/watch?v=1Hxm6f33VbY)
- [YouTube, 쉬운코드, list set 차이](https://www.youtube.com/watch?v=WeUwyK6_dW0)
- [YouTube, 쉬운코드, set 대신 list를 쓰면?](https://www.youtube.com/watch?v=PA8IMMOIo4o)
- [YouTube, 쉬운코드, 기술 면접에서 list와 set의 차이를 물어보는 이유](https://www.youtube.com/watch?v=CMgpTGs_N_w)
- [YouTube, 쉬운코드, BJ.22 리스트(list), array list와 linked list](https://www.youtube.com/watch?v=xvi-n11kym0)
- [Python 3.14 Library, Set Types](https://docs.python.org/3.14/library/stdtypes.html#set-types-set-frozenset)
- [Java SE 26 API, HashSet](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/HashSet.html)
- [Java SE 26 API, LinkedHashSet](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/LinkedHashSet.html)
- [setobject.c — CPython v3.14.0](https://github.com/python/cpython/blob/v3.14.0/Objects/setobject.c)
- [HashSet.java — OpenJDK jdk-21+35](https://github.com/openjdk/jdk/blob/jdk-21%2B35/src/java.base/share/classes/java/util/HashSet.java)
- [HashMap.java — OpenJDK jdk-21+35](https://github.com/openjdk/jdk/blob/jdk-21%2B35/src/java.base/share/classes/java/util/HashMap.java)

## 관련 문서

- [[Linear-Data-Structures|선형 자료구조]]
- [[Hash-Table|해시 테이블]]
- [[Hash-Collision|해시 충돌]]
- [[Java-Generics-and-Collections-Set|Java Set 구현 선택]]
- [[Java-Generics-and-Collections-Hashing|Java 해시와 HashSet 원리]]
- [[Trees-and-Balanced-Search-Trees|트리와 균형 탐색 트리]]
