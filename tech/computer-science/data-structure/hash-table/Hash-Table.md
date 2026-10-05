---
tags: [cs, data-structure, hash, hash-table]
status: done
verified_at: 2026-10-05
category: "CS - 자료구조"
aliases: ["Hash Table", "해시 테이블", "HashTable", "Hash Map", "해시 맵", "직접 주소 테이블", "Direct Address Table", "해시 함수", "적재율", "Load Factor"]
---

# Hash Table (해시 테이블)

map ADT(associative array, dictionary라고도 한다)는 key를 value에 대응시킨다. key는 유일하고 value는 중복될 수 있다. hash table은 이 ADT를 배열과 hash function으로 구현한 자료구조로, key의 hash를 bucket index로 압축하고 collision resolution 규칙에 따라 항목을 저장한다. key 순서가 필요하면 균형 탐색 트리로 구현한 map을 쓴다([[Java-Generics-and-Collections-Map-Stack-Queue#SortedMap과 NavigableMap|Java SortedMap]]). Set도 value 없이 key만 저장하는 방식으로 구현할 수 있지만 모든 map과 set이 hash table인 것은 아니다([[Linear-Data-Structures-List-and-Set|List와 Set]]).

## 직접 주소 테이블에서 출발하기

key universe가 작고 정수 index로 바로 쓸 수 있다면 `table[key]`에 값을 두는 direct-address table을 만들 수 있다. lookup, insert와 delete는 worst-case O(1)이지만 공간은 실제 항목 수가 아니라 universe 크기 Θ(|U|)만큼 필요하다. key 범위가 크거나 sparse하면 대부분의 칸이 비어 비효율적이다.

hash table은 더 작은 bucket array를 두고 hash function으로 넓은 key 공간을 bucket 범위에 대응시킨다. 공간을 줄인 대신 서로 다른 key가 같은 bucket으로 가는 collision을 처리해야 한다.

## 저장과 조회의 흐름

- 배열 크기를 capacity, 각 칸을 bucket 또는 slot이라 부른다. 저장할 칸은 `index = hash(key) mod capacity`로 정한다.
- hash function은 일반적으로 임의 크기 입력을 고정 크기 값으로 바꾸는 함수다. hash table에서는 key를 index 계산에 쓸 정수로 바꾸고, 그 출력을 hash(hash code)라 한다.
- 칸에는 value만이 아니라 key도 함께 저장한다. 다른 key가 같은 칸으로 올 수 있으므로 조회는 같은 index로 가서 저장된 key와 찾는 key가 같을 때만 value를 돌려준다. value만 두면 같은 칸으로 온 다른 key의 조회에 엉뚱한 value를 돌려준다.
- 이미 있는 key를 다시 넣으면 항목을 새로 만들지 않고 value를 바꾼다.
- `containsKey`는 hash로 찾아갈 위치를 계산하지만 `containsValue`는 value로 위치를 계산할 수 없어 모든 항목을 훑는 O(n)이다.

## 크기는 key 공간이 아니라 저장할 항목 수에 맞춘다

휴대전화 번호처럼 가능한 key가 수천만 개를 넘어도 실제 저장할 항목이 천 개 안팎이면 table은 예상 항목 수에 여유를 둔 크기로 시작하고 차면 늘린다. key 공간만큼 잡는 직접 주소 방식은 대부분의 칸이 비고, 임의 길이 문자열처럼 key 공간이 사실상 무한하면 잡을 수도 없다. 그 대가로 넓은 key 공간을 작은 table에 압축하므로 collision은 피할 수 없다([[Hash-Collision|해시 충돌]]).

인기 투표 집계처럼 어떤 key가 나올지 미리 모르고 후보 중 일부만 등장하면 hash map은 처음 나온 key를 넣고 이미 있는 key는 값을 1 올린다. 모든 후보를 미리 올려 두는 방식과 달리 memory가 실제로 등장한 key 수에 비례한다.

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

항목마다 hash를 함께 저장하는 구현은 resize 때 hash function을 다시 부르지 않고 저장된 hash로 새 index만 계산한다(OpenJDK `HashMap`의 `Node.hash`, CPython dict 일반 entry의 `me_hash`, 문자열 key만 담은 dict는 문자열 객체에 cache된 hash). 같은 값은 조회에서 후보를 거르는 데도 쓰인다(아래 Key 절).

## Key와 구현 주의점

- 동등성 비교와 hash 계약을 함께 지킨다. Java에서는 `equals`가 true인 key가 같은 `hashCode`를 내야 한다.
- table에 들어간 동안 동등성이나 hash 결과에 관여하는 key 상태를 바꾸면 lookup이 실패할 수 있다.
- 같은 key를 다시 `set`할 때 새 항목을 중복 삽입할지 기존 value를 갱신할지 ADT 계약을 명확히 한다.
- iteration order, thread safety와 null key 허용 여부는 구현마다 다르다.
- 조회는 저장된 hash를 먼저 비교해 대부분의 후보를 거른다. OpenJDK 21 `HashMap`은 node의 hash가 같을 때만 참조 비교(`==`)와 `equals`를 부르고, CPython 3.14 dict는 같은 객체면 바로 일치로 보고 아니면 hash가 같을 때만 `__eq__`를 부른다.
- Python 사용자 정의 class는 기본으로 자기 자신과만 같고 hash가 `id()`에서 나온다. 그래서 좌표가 같은 두 `Location` 객체도 set에 둘 다 들어간다. 값으로 같게 보려면 비교에 쓰는 필드로 `__eq__`를 정의하고 `__hash__`는 그 필드를 묶은 tuple의 hash(`hash((self.x, self.y))`)로 둔다. `__eq__`만 정의하면 `__hash__`가 `None`이 되어 set 원소나 dict key로 쓸 때 `TypeError`가 난다. 같은 실수를 한 Java 객체는 조용히 중복 저장되므로 실패 방식이 다르다([[Java-Generics-and-Collections-Hashing|Java 해시와 HashSet 원리]]).
- 가변 key는 변경 자체를 막는다. Java는 동등성 필드를 `final`로 두고, Python은 `@dataclass(frozen=True)`가 필드 대입을 예외로 막고, 기본값인 `eq=True`와 함께 `__hash__`도 만든다.
- 동등성 필드를 바꿀 때는 양쪽을 함께 본다. 필드를 추가하고 `__eq__`와 `__hash__`(Java는 `equals`와 `hashCode`)를 갱신하지 않으면 그 필드만 다른 객체가 같다고 판정된다. 갱신하면 기존 필드 조합으로 중복을 거르던 set과 map의 의미가 바뀐다. 기존 사용처를 확인하고 의미가 다르면 3차원 좌표 class처럼 별도 타입으로 분리한다.

## CPython dict와 Java HashMap 구현 비교

| 항목 | CPython 3.14 `dict` | Java `HashMap` (Java SE 26 API, OpenJDK 21) |
|---|---|---|
| 충돌 처리 | open addressing. `j = 5 * j + 1 + perturb` 점화식으로 hash 상위 bit까지 probe 순서에 섞는다 | separate chaining. 한 bucket이 길어지면 red-black tree로 바꾼다 |
| 최소 또는 기본 크기 | 8칸 | capacity 16 |
| 확장 시점 | 항목 배열(table 크기의 2/3)이 차면. 삭제로 빈 항목 칸은 다시 쓰지 않는다 | 항목 수가 capacity × 0.75를 넘으면 |
| 새 크기 | 유효 항목 수 × 3 이상인 가장 작은 2의 거듭제곱 | 2배 |
| 삭제 | 삭제 표시(dummy)만 남기고 resize하지 않는다 | node를 떼어 낸다 |
| 축소 | 삽입이 일으킨 resize가 유효 항목 수 기준이라 삭제가 많았으면 작아질 수 있다 | 줄지 않는다 |
| 순회 순서 | 삽입 순서(Python 3.7부터 언어 보장) | 보장하지 않는다 |

- Java API가 보장하는 것은 기본 capacity 16, load factor 0.75, 대략 2배 rehash와 순서 비보장이다. bucket 구조와 줄지 않는 동작은 OpenJDK 구현이다.
- CPython dict의 성장률은 버전마다 바뀌었다. 3.2까지 유효 항목 × 4, 3.3.0은 × 2, 3.4.0부터 3.6.0까지 × 2 + 크기의 절반, 이후 × 3이다. 특정 배수보다 유효 항목 수로 다음 크기를 정해 삭제가 많았던 table은 덜 키우거나 줄인다는 원리를 기억한다.
- CPython `set`은 dict와 다른 별도 hash table을 쓴다([[Linear-Data-Structures-List-and-Set#Hash set은 hash table의 key만 쓴다|hash set 구현 비교]]).

## 크기를 2의 거듭제곱으로 두는 이유

CPython dict와 set, OpenJDK `HashMap`은 모두 table 크기를 2의 거듭제곱으로 유지한다.

- 크기가 2^k이면 `hash mod 크기`를 `hash & (크기 - 1)`로 계산해 나눗셈을 피하고, 음수 hash도 0 이상의 index가 된다.
- 2배로 늘리면 항목의 새 index가 기존 index j나 j + 이전 크기 둘 중 하나라서 재배치가 단순하다(OpenJDK `resize`).
- 대가로 hash의 하위 k bit만 index를 정한다. 하위 bit가 고르지 않으면 충돌이 몰리므로 OpenJDK `HashMap`은 `h ^ (h >>> 16)`으로 상위 bit를 섞고, CPython은 probe 순서에 `perturb`로 상위 bit를 끌어들인다. 나머지 연산을 쓰는 직접 구현이 table 크기를 소수로 두는 것은 같은 문제에 대한 다른 선택이다.

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
- **open addressing 삭제**: 지운 칸을 빈칸으로 되돌리면 뒤 probe chain을 못 찾으므로 삭제 표시(tombstone)를 둔다. 탐색은 삭제 표시를 건너뛰고 계속, 삽입은 빈칸까지 같은 key가 없음을 확인한 뒤 처음 만난 삭제 표시 칸을 재사용할 수 있다([[Hash-Collision#삭제와 tombstone|중복 삽입 함정]]).

## 저장소 예제의 범위

`HashTable.mjs`는 정수 key를 10개 bucket에 나머지 연산으로 배치하고 doubly linked list로 chaining한다. collision, 기존 key 갱신과 음수 key 정규화를 관찰하기 위한 학습 구현이며 resize, 일반 key hashing, iteration과 concurrency는 제공하지 않는다.

예제 코드: `HashTable.mjs`, `HashTable.test.mjs`

## 관련 문서

- [[Hash-Collision|해시 충돌 (체이닝, 개방 주소법, 클러스터링, Load Factor, HashDoS)]]
- [[Checksum-and-Hash|체크섬과 해시 (일반 해시와 암호학적 해시의 목적 차이)]]
- [[자료구조(DataStructure)|자료구조 인덱스]]
- [[Algorithm-Complexity|시간복잡도와 Big O]]
- [[Linear-Data-Structures|선형 자료구조 (배열 기반 linked list)]]
- [[Linear-Data-Structures-List-and-Set|List와 Set (hash set 구현 비교)]]
- [[Java-Generics-and-Collections-Hashing|Java 해시와 HashSet 원리]]

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
- [YouTube, 쉬운코드, BJ.23 맵(map)과 해시 테이블(hash table)](https://www.youtube.com/watch?v=ZBu_slSH5Sk)
- [YouTube, 쉬운코드, hash map 설명](https://www.youtube.com/watch?v=k-oPKkxDy38)
- [YouTube, 쉬운코드, 해시맵과 해시 충돌 발생 이유](https://www.youtube.com/watch?v=tEOkPaZXGOk)
- [YouTube, 쉬운코드, BJ.25 객체를 해시셋에 넣거나 해시맵의 key로 쓰면](https://www.youtube.com/watch?v=Dmo3sG-ZFTw)
- [Python 3.14 Language Reference, `object.__hash__`](https://docs.python.org/3.14/reference/datamodel.html#object.__hash__)
- [Python 3.14 Glossary, hashable](https://docs.python.org/3.14/glossary.html#term-hashable)
- [Python 3.14 Library, dataclasses](https://docs.python.org/3.14/library/dataclasses.html)
- [Python 3.14 Library, Mapping Types dict](https://docs.python.org/3.14/library/stdtypes.html#mapping-types-dict)
- [Java SE 26 API, HashMap](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/HashMap.html)
- [dictobject.c — CPython v3.14.0](https://github.com/python/cpython/blob/v3.14.0/Objects/dictobject.c)
- [HashMap.java — OpenJDK jdk-21+35](https://github.com/openjdk/jdk/blob/jdk-21%2B35/src/java.base/share/classes/java/util/HashMap.java)
