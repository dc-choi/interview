---
tags: [cs, data-structure, hash, hash-table]
status: done
category: "CS - 자료구조"
aliases: ["Hash Table", "해시 테이블", "HashTable", "직접 주소 테이블", "Direct Address Table", "해시 함수", "적재율", "Load Factor"]
---

# Hash Table (해시 테이블)

dictionary 또는 map ADT는 key를 value에 대응시킨다. hash table은 이 ADT를 구현하는 한 방법으로, key의 hash를 bucket index로 압축하고 collision resolution 규칙에 따라 항목을 저장한다. Set도 value 없이 key만 저장하는 방식으로 구현할 수 있지만 모든 map과 set이 hash table인 것은 아니다.

## 직접 주소 테이블에서 출발하기

key universe가 작고 정수 index로 바로 쓸 수 있다면 `table[key]`에 값을 두는 direct-address table을 만들 수 있다. lookup, insert와 delete는 worst-case O(1)이지만 공간은 실제 항목 수가 아니라 universe 크기 Θ(|U|)만큼 필요하다. key 범위가 크거나 sparse하면 대부분의 칸이 비어 비효율적이다.

hash table은 더 작은 bucket array를 두고 hash function으로 넓은 key 공간을 bucket 범위에 대응시킨다. 공간을 줄인 대신 서로 다른 key가 같은 bucket으로 가는 collision을 처리해야 한다.

## Hash function의 계약

- 동등한 key는 같은 hash 결과를 내야 한다.
- 계산 비용이 작고 실제 key 분포를 bucket 전체에 고르게 분산해야 한다.
- hash code를 bucket 수로 압축할 때 음수, overflow와 table 크기를 올바르게 처리해야 한다.
- 일반 hash table에서 원상 복원이 어렵다는 암호학적 단방향성은 필수 조건이 아니다. 공격자가 key를 고를 수 있는 환경에서는 별도로 무작위 seed나 충돌 공격 방어가 필요할 수 있다.

좋은 분포와 collision resolution, 적절한 resize를 전제로 lookup, insert와 delete의 expected 또는 amortized 비용은 보통 Θ(1)이다. 한 bucket이나 probe cluster에 key가 몰리면 worst case는 Θ(n)이 될 수 있다. 평균 O(1)을 무조건 보장으로 표현하지 않는다.

## Collision resolution

### Separate chaining

각 bucket이 key-value 항목의 list나 다른 검색 구조를 가리킨다. 먼저 bucket을 계산하고 그 안에서 동등한 key를 찾는다. list의 head에 새 항목을 넣는 동작 자체는 O(1)이지만 기존 key 확인까지 포함한 `set` 비용은 chain 길이에 좌우된다.

### Open addressing

항목을 bucket array 안에 직접 두고 충돌하면 정해진 probe sequence에서 다음 후보를 찾는다. linear probing, quadratic probing과 double hashing이 대표적이다. 빈 slot이 필요하므로 load factor는 1보다 작아야 하고, 삭제는 probe chain을 끊지 않도록 tombstone 또는 재배치 규칙이 필요하다.

자세한 비교는 [[Hash-Collision|해시 충돌]]에서 다룬다.

## Load factor와 resize

`α = 저장된 항목 수 n / bucket 수 m`으로 둔다.

- separate chaining에서는 α가 bucket당 평균 항목 수이고 1을 넘을 수 있다.
- open addressing에서는 점유 비율이고 반드시 1보다 작다.

α가 커지면 chain이나 probe가 길어진다. 구현은 정책 임계치에서 더 큰 table을 만들고 항목을 새 bucket 수에 맞춰 재배치한다. 한 번의 resize는 Θ(n)이지만 충분히 큰 폭으로 확장하면 여러 insert에 나눈 amortized 비용을 작게 유지할 수 있다. 임계치와 성장 배수는 구현 정책이지 보편 상수가 아니다.

## Key와 구현 주의점

- 동등성 비교와 hash 계약을 함께 지킨다. Java에서는 `equals`가 true인 key가 같은 `hashCode`를 내야 한다.
- table에 들어간 동안 동등성이나 hash 결과에 관여하는 key 상태를 바꾸면 lookup이 실패할 수 있다.
- 같은 key를 다시 `set`할 때 새 항목을 중복 삽입할지 기존 value를 갱신할지 ADT 계약을 명확히 한다.
- iteration order, thread safety와 null key 허용 여부는 구현마다 다르다.

## C++ 코딩 테스트에서 쓰기

직접 구현할 일은 드물고 표준 컨테이너를 쓴다. 모두 평균 O(1)이지만 원소 순서가 크기 순도 삽입 순도 아니다.

- `unordered_set`: `insert`, `erase(value)`(지운 개수 반환), `find`(없으면 `end()`), `count`, `size`. 중복을 넣어도 무시된다.
- `unordered_multiset`: 중복을 허용한다. `erase(value)`는 그 값을 모두 지우므로 하나만 지우려면 `ms.erase(ms.find(x))`처럼 iterator를 넘긴다(없는 값이면 `find`가 `end()`라 먼저 확인).
- `unordered_map`: key로 value를 찾는다. `m[key]`는 key가 없으면 기본값 항목을 새로 만든다. 존재 여부만 볼 때는 `find`나 `count`를 쓴다. 같은 key에 대입하면 덮어쓴다.
- key가 0부터 수백만 이하의 정수처럼 작은 범위면 hash보다 배열 index가 빠르고 단순하다. 문자열을 번호로 바꾸는 쪽만 `unordered_map`을 쓰고, 번호에서 문자열로 가는 쪽은 배열로 두는 식으로 섞는다.
- 표준 hash는 입력을 알고 만든 저격 데이터에서 한 bucket에 몰려 최악 O(n)이 될 수 있다([[Password-Hashing#해시 DoS|해시 DoS]]). 이런 위험이 있으면 정렬 기반 `set`, `map`(O(log n) 보장)을 쓰거나 hash 함수에 무작위 요소를 섞는다.

### 직접 구현할 때의 선택

- **table 크기**: chaining은 최대 삽입 수 정도, open addressing은 load factor가 너무 커지지 않도록 최대 삽입 수보다 넉넉하게(보통 load factor 0.75 이하가 되게) 잡는다. 나머지로 index를 정하는 hash라면 크기를 소수로 두면 key 분포의 규칙성이 덜 겹친다(예: 1000003은 소수다). 필수는 아니다.
- **문자열 hash**: 다항식 rolling hash로 `h = (h * a + c) mod m`을 문자마다 반복한다(a는 작은 상수, m은 table 크기). 앞 글자만 쓰거나 글자 합만 쓰면 충돌이 몰린다.
- **chaining을 배열로**: bucket마다 연결 리스트를 따로 두지 않고, 전체 삽입 수 크기의 `pre`, `nxt`, key, value 배열과 bucket별 `head` 배열 하나로 여러 리스트를 공유한다([[Linear-Data-Structures#배열로 흉내 내는 linked list|배열로 흉내 내는 linked list]]). 새 항목은 `head[h]` 앞에 끼우고, 지우는 항목이 head면 `head[h]`를 다음 항목으로 옮긴다.
- **open addressing 삭제**: 지운 칸을 빈칸으로 되돌리면 뒤 probe chain을 못 찾으므로 삭제 표시(tombstone)를 둔다. 탐색은 삭제 표시를 건너뛰고 계속, 삽입은 삭제 표시 칸에 재사용할 수 있다.

## 저장소 예제의 범위

`HashTable.mjs`는 정수 key를 10개 bucket에 나머지 연산으로 배치하고 doubly linked list로 chaining한다. collision, 기존 key 갱신과 음수 key 정규화를 관찰하기 위한 학습 구현이며 resize, 일반 key hashing, iteration과 concurrency는 제공하지 않는다.

예제 코드: `HashTable.mjs`, `HashTable.test.mjs`

## 관련 문서

- [[Hash-Collision|해시 충돌 (체이닝, 개방 주소법, 클러스터링, Load Factor, HashDoS)]]
- [[Checksum-and-Hash|체크섬과 해시 (일반 해시와 암호학적 해시의 목적 차이)]]
- [[자료구조(DataStructure)|자료구조 인덱스]]
- [[Algorithm-Complexity|시간복잡도와 Big O]]
- [[Linear-Data-Structures|선형 자료구조 (배열 기반 linked list)]]

## 시간, 공간과 조회 방향

적재율을 낮추면 chain과 probe는 짧아지지만 빈 bucket이 늘어난다. Chaining의 공간은 bucket m개와 항목 n개를 합친 Θ(m+n)이며 node, key와 pointer 비용도 든다. 좋은 hash 분포와 resize는 빠른 조회를 위해 공간을 쓰는 선택이다.

이름에서 번호, 번호에서 이름을 모두 자주 찾으면 조회 방향마다 index를 둔다. 번호가 조밀하면 역방향은 배열, 이름은 hash map으로 구현할 수 있다. 한 map의 value를 매번 순회하면 역방향 질의당 O(n)이다. 두 index는 memory를 추가로 쓰고 변경 시 함께 갱신해야 한다.

## 출처

- 인프런 보충 강의: [1-I](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100301)

- 인프런, 감자 강사, [해시테이블 개념](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115974), [해시테이블 구현](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115975)
- [바킹독의 실전 알고리즘 0x15강, 해시 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=1-k-D2AYY0I)
- [cppreference, std::unordered_multiset::erase](https://en.cppreference.com/w/cpp/container/unordered_multiset/erase)
- [NIST DADS, hash table](https://xlinux.nist.gov/dads/HTML/hashtab.html)
- [Princeton Algorithms, Hash Tables](https://algs4.cs.princeton.edu/34hash/)
