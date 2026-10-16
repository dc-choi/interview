---
tags: [cs, data-structure, hash-table, linked-list, lru, cache]
status: done
verified_at: 2026-10-12
category: "CS - 자료구조"
aliases: ["Hash Table LRU Cache", "LRU Cache", "LRU 캐시", "LinkedHashMap LRU"]
---

# LRU Cache (hash map과 doubly linked list)

hash table의 기본 구조, 충돌 처리와 resize는 [[Hash-Table|해시 테이블]]에 있고, 이 문서는 항목 순서를 함께 유지하는 hash table과 그 대표 응용인 LRU cache를 다룬다.

## 순서를 함께 유지하는 hash table과 LRU cache

hash table은 key로 항목을 찾지만 항목 사이의 순서는 모른다. 모든 항목을 doubly linked list로도 이으면 key 조회를 유지하면서 삽입 순서나 최근 접근 순서를 기억한다. Java `LinkedHashMap`이 이 구조라 순회가 capacity가 아니라 항목 수에 비례하고, API 문서는 접근 순서 모드가 LRU cache에 맞는다고 밝힌다.

LRU cache는 용량이 차면 가장 오래 쓰지 않은 항목을 버린다. hash map만으로는 가장 오래된 항목을 찾는 데, linked list만으로는 key로 node를 찾는 데 O(n)이 들어 둘을 합친다.

- map의 value가 list node를 가리키고 list는 최근 사용 순으로 둔다. `get`은 map으로 찾은 node를 맨 앞으로 옮기고, `put`은 맨 앞에 넣은 뒤 용량을 넘으면 맨 뒤 node를 떼어 그 key를 map에서도 지운다.
- 중간 node를 O(1)에 떼려면 이전 node를 알아야 해 doubly linked list를 쓴다. 맨 뒤 node로 map 항목을 지우려면 node에 key도 있어야 한다. 양 끝에 dummy node를 두면 빈 list와 끝 node의 예외 처리가 사라진다.
- `get`과 `put`의 O(1)은 hash map의 기대 비용이라 충돌이 몰리면 함께 느려진다.
- 항목마다 map entry와 별도로 key, value, 앞뒤 참조를 담은 node가 생겨 memory를 더 쓴다. 조회도 순서를 바꾸는 쓰기라 여러 thread가 읽기만 해도 동기화가 필요하다. `LinkedHashMap`도 접근 순서 모드에서는 `get`이 구조 변경이라고 명시한다.

표준 library로 만드는 방법은 다음과 같다.

- **Java**: `new LinkedHashMap<>(16, 0.75f, true)`로 접근 순서 map을 만들고, `put` 뒤에 호출되는 `removeEldestEntry`가 `size() > MAX_ENTRIES`일 때 `true`를 돌려주게 override한다.
- **Python**: 함수 결과는 `functools.lru_cache(maxsize=N)`로 cache한다. 순수 Python 구현은 dict와 원형 doubly linked list로 되어 있다. thread safe하지만 첫 결과가 저장되기 전에 다른 thread가 같은 호출을 하면 함수가 한 번 더 실행될 수 있다. 일반 key-value cache는 `OrderedDict`에서 조회 때 `move_to_end(key)`, 용량 초과 때 `popitem(last=False)`로 가장 오래된 항목을 버린다.
- **JavaScript**: `Map`은 삽입 순서로 순회하고 기존 key에 `set`해도 위치가 바뀌지 않는다. 조회 때 `delete` 뒤 다시 `set`하면 맨 뒤로 가므로 `map.keys().next().value`가 가장 오래된 key다. 명세가 요구하는 접근 비용은 평균 sublinear다([[JavaScript-Keyed-Collections-and-Weak-References#Map과 Object|Map과 Object]]).

규모가 큰 시스템은 접근마다 순서를 갱신하는 정확한 LRU 대신 근사를 쓰기도 한다. 운영체제 page 교체는 접근 bit로 근사하고, Redis는 key마다 마지막 접근 시각만 두고 무작위 표본과 후보 pool에서 오래된 key를 고른다([[Virtual-Memory-Page-Replacement|페이지 교체]], [[Redis-Memory-Eviction|Redis eviction]]). 일회성 대량 접근이 hot key를 밀어내는 LRU의 약점은 [[Cache-Locality|캐시 지역성]]에서 다룬다.

## 출처

- [Java SE 26 API, LinkedHashMap](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/LinkedHashMap.html)
- [Python 3.15 Library, collections.OrderedDict](https://docs.python.org/3.15/library/collections.html#collections.OrderedDict)
- [Python 3.15 Library, functools.lru_cache](https://docs.python.org/3.15/library/functools.html#functools.lru_cache)
- [functools.py — CPython v3.14.0](https://github.com/python/cpython/blob/v3.14.0/Lib/functools.py)
- [ECMAScript Language Specification, Map Objects](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-map-objects)
- [YouTube, Codist, Every Data Structure Simply Explained in 25 Minutes!](https://www.youtube.com/watch?v=vVL6NFzr0Rg)

## 관련 문서

- [[Hash-Table|해시 테이블]]
- [[Linear-Data-Structures-Linked-List|연결 리스트 (doubly linked list)]]
- [[JavaScript-Keyed-Collections-and-Weak-References|JavaScript keyed collection (Map의 순회 순서)]]
- [[Virtual-Memory-Page-Replacement|페이지 교체 (LRU 근사)]]
- [[Redis-Memory-Eviction|Redis eviction (근사 LRU)]]
- [[Cache-Locality|캐시 지역성 (LRU의 cache pollution)]]
- [[Algorithm-Practice#백엔드에서의 연결|백엔드에서의 연결 (LRU cache의 eviction 동시성과 memory overhead)]]
- [[자료구조(DataStructure)|자료구조 인덱스]]
