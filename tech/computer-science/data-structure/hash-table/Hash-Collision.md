---
tags: [cs, data-structure, hash, hash-table]
status: done
verified_at: 2026-10-05
category: "CS - 자료구조"
aliases: ["Hash Collision", "해시 충돌"]
---

# Hash Collision (해시 충돌)

서로 동등하지 않은 key가 같은 bucket index로 대응되면 collision이 발생한다. 가능한 key 수가 bucket 수보다 많으면 비둘기집 원리상 모든 key에 collision 없는 mapping을 보장할 수 없다. 고정되어 미리 알려진 key 집합에는 perfect hashing을 설계할 수 있지만 일반적인 동적 입력의 collision 처리 필요성이 사라지는 것은 아니다.

hash table에서는 두 단계의 collision을 같은 이름으로 부르므로 어느 쪽인지 구분한다.

- **hash 단계**: 서로 다른 key의 hash 값 자체가 같다. 임의 길이 문자열처럼 사실상 무한한 입력을 32bit 정수 같은 고정 범위로 줄이므로 피할 수 없다. 서로 다른 key를 항상 다른 정수로 보내는 perfect hash function은 보통 key 집합을 미리 알 때만 만든다.
- **index 단계**: hash 값은 다르지만 capacity로 나눈 나머지가 같다. table은 key 공간이 아니라 저장할 항목 수에 맞춰 작게 잡으므로 key마다 다른 hash 값을 내는 함수라도 capacity로 줄이는 이 단계에서 다시 겹칠 수 있다. 미리 아는 key 집합에 맞춰 table index를 바로 내도록 설계한 perfect hashing만 두 단계를 함께 없앤다.

좋은 hash function은 출력을 고르게 퍼뜨려 두 단계의 빈도를 낮출 뿐 collision을 없애지 못한다. 그래서 key 집합이 바뀌는 일반 hash table에는 collision resolution이 필수다.

## Separate chaining

각 bucket이 같은 index로 온 항목들의 list나 다른 검색 구조를 가진다.

```text
bucket 3: [key1, value1] -> [key2, value2] -> [key3, value3]
```

- insert 전에 같은 key를 찾는 비용과 lookup/delete 비용은 chain 길이에 좌우된다.
- head에 새 node를 연결하는 동작만 보면 O(1)이다.
- 같은 key가 있는지 보려면 어차피 chain 끝까지 비교하므로 head와 tail 중 어디에 붙여도 삽입 비용은 chain 길이에 비례한다. OpenJDK 21 `HashMap`은 끝까지 확인한 뒤 tail에 붙이고, chain이 길어지면 tree bin으로 바꾼다([[Java-Generics-and-Collections-Hashing#Java HashSet의 확장과 버킷 트리화|버킷 트리화]]).
- load factor α가 1보다 커도 저장할 수 있지만 평균 chain 길이가 함께 증가한다.
- node/reference overhead와 pointer chasing 때문에 open addressing보다 cache locality가 불리할 수 있다.

균일 hashing 가정에서 bucket당 평균 항목 수는 `α = n/m`이고 search 비용은 이에 비례한다. 실제 성능은 hash 품질과 key 분포에 달려 있다.

## Open addressing

모든 항목을 하나의 bucket array에 저장한다. home bucket이 차 있으면 probe sequence를 따라 빈 slot이나 같은 key를 찾는다.

i번째 probe(i = 0, 1, 2, ...)의 위치를 h(k, i), table 크기를 m이라 하면 세 방식은 다음과 같다.

| 방식 | h(k, i) |
|---|---|
| linear probing | `(h(k) + i) mod m` |
| quadratic probing | `(h(k) + c1 * i + c2 * i^2) mod m` |
| double hashing | `(h1(k) + i * h2(k)) mod m` |

m = 10에서 home이 1, 2, 1, 2, 2인 key 다섯 개를 차례로 넣으면 차이가 보인다. linear probing은 1부터 5까지 이어진 구간을 만들고 뒤 세 key가 각각 2, 2, 3번 더 이동한다. `h(k) + i^2`인 quadratic probing은 같은 입력을 1, 2, 5, 3, 6에 두고 추가 이동은 2, 1, 2번이다. 제곱 간격은 이미 찬 구간에서 빨리 벗어나게 한다.

### Linear probing

`h(key), h(key)+1, h(key)+2, ...` 순서로 확인한다. 연속 memory 접근은 cache에 유리하지만 점유 구간이 더 큰 점유 구간을 끌어들이는 primary clustering이 생길 수 있다.

### Quadratic probing

제곱 간격 같은 비선형 offset을 사용해 primary clustering을 줄인다. 같은 home bucket을 가진 key가 같은 probe sequence를 공유하면 secondary clustering은 남을 수 있다. table 크기와 계수 선택에 따라 모든 slot을 방문하지 못할 수 있으므로 구현 조건을 함께 설계한다.

### Double hashing

두 번째 hash로 step을 정해 `h1(key) + i * h2(key)`를 탐사한다. step과 table 크기가 서로소가 되도록 해야 전체 table을 순회할 수 있다. clustering을 줄이는 대신 hash 계산이 추가된다.

서로소가 아니면 일부 칸만 돈다. m = 10, h1(k) = 0, h2(k) = 4면 0, 4, 8, 2, 6만 반복해 홀수 칸을 보지 않는다. m을 소수로 두고 h2를 1에서 m - 1 사이로 만들거나, m이 2의 거듭제곱이면 h2를 홀수로 만들어 서로소를 보장한다. home이 같은 key가 같은 probe 순서를 따르는 quadratic probing과 달리 key마다 step이 달라 secondary clustering도 줄어든다.

## 삭제와 tombstone

open addressing에서 삭제 slot을 처음부터 비어 있던 slot처럼 표시하면 그 뒤에 이어진 probe chain의 key를 찾지 못할 수 있다. tombstone을 두거나 후속 항목을 재배치해 search 경로를 보존한다. tombstone이 쌓이면 probe가 길어져 정리나 rehash가 필요하다.

빈칸으로 되돌린 slot은 조회 실패에서 끝나지 않고 중복 삽입도 만든다. linear probing에서 home이 같은 A, B, C가 1, 2, 3번 칸에 있을 때 B를 그냥 비우고 C를 다시 넣으면, 탐색이 2번 빈칸에서 없다고 판단해 C를 2번에 한 번 더 넣는다.

- **tombstone**: 삭제 칸에 표시를 남긴다. 탐색은 표시를 지나쳐 계속한다. 삽입은 처음 만난 표시 칸을 기억하되 진짜 빈칸까지 같은 key가 없음을 확인한 뒤 그 칸을 재사용한다. 표시가 쌓이면 빈칸까지 훑는 거리가 늘어, 대부분을 지운 table에서는 삽입 하나가 table 대부분을 훑는다. resize나 재구성이 유효 항목만 옮기며 표시를 치운다.
- **후속 항목 재배치**: 삭제 칸 뒤 같은 cluster의 항목을 옮겨 빈칸을 메운다. Princeton `LinearProbingHashST`는 빈칸이 나올 때까지 뒤 항목을 하나씩 빼서 다시 넣는다. 한 칸씩 당기는 방식은 당길 항목의 probe 경로가 빈칸을 지나는지(home이 빈칸 이전인지) 확인해야 해서 구현이 까다롭지만, 표시가 남지 않아 이후 탐색이 짧다.

## Load factor와 resize

| 방식 | α의 의미 | 제약 |
|---|---|---|
| separate chaining | bucket당 평균 항목 수 | 1을 넘을 수 있음 |
| open addressing | 점유된 slot 비율 | 빈 slot이 필요하므로 1 미만 |

open addressing의 probe 비용은 α가 1에 가까워질수록 빠르게 증가한다. 특정 임계치가 모든 구현에 공통인 것은 아니다. 구현은 목표 지연, memory 비용과 collision scheme에 맞춰 resize 시점을 고른다.

resize는 더 큰 table을 만들고 새 bucket 수에 맞춰 항목을 다시 배치하므로 한 번에 Θ(n)이 든다. 성장 폭을 충분히 크게 잡으면 여러 insert에 걸친 amortized 비용은 작게 유지할 수 있다. latency가 중요한 구현은 migration을 여러 operation에 나눌 수 있다. open addressing에서는 resize가 충돌로 밀려났던 항목을 새 크기의 home 위치로 되돌리기도 하고 tombstone도 함께 사라진다.

## Hash function 품질

- table의 동등성 계약상 같은 key는 같은 hash 결과를 내야 한다.
- 예상 key 분포를 bucket 전체에 고르게 퍼뜨려야 한다.
- key를 읽고 hash를 계산하는 비용을 포함해 충분히 빨라야 한다.
- table 크기로 압축한 뒤의 분포까지 확인해야 한다.

암호학적 preimage resistance는 일반 hash table의 필수 조건이 아니다. 반대로 외부 사용자가 key를 제어할 수 있으면 의도적인 collision으로 worst-case 경로를 유발할 수 있으므로 seeded hashing, 입력 제한, tree 기반 bucket 같은 방어를 구현 특성에 맞춰 고려한다.

## 구현을 해석할 때 확인할 것

- expected, amortized, worst-case 중 어떤 복잡도인지
- hash가 균일하다는 확률 가정이 있는지
- key equality와 hash 계약이 일치하는지
- resize가 stop-the-world인지 점진적인지
- iteration order와 concurrency를 보장하는지

초기 capacity는 고정 배수로 외우지 않는다. 예상 항목 수가 `n`이고 구현의 목표 load factor가 `α`라면 최소 bucket 수를 대략 `ceil(n/α)`로 계산하되, 실제 생성자가 power-of-two 정규화나 최대 크기 제한을 적용하는지 확인한다.

## 관련 문서

- [[Hash-Table|해시 테이블 (직접 주소 테이블, 해시 함수, 적재율, 리사이즈)]]
- [[자료구조(DataStructure)|자료구조 개요]]
- [[Redis-Data-Structures|Redis 자료구조]]
- [[Java-Backend-Fundamentals|Java 백엔드 기초 (equals, hashCode)]]
- [[Linear-Data-Structures-List-and-Set|List와 Set (hash set의 최악 비용)]]

## 출처

- 인프런, 감자 강사, [해시테이블 개념](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115974), [해시테이블 구현](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115975)
- [NIST DADS, hash table](https://xlinux.nist.gov/dads/HTML/hashtab.html)
- [Princeton Algorithms, Hash Tables](https://algs4.cs.princeton.edu/34hash/)
- [Oracle Java HashMap API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/HashMap.html)
- YouTube, 쉬운코드, [해시맵과 해시 충돌 발생 이유](https://www.youtube.com/watch?v=tEOkPaZXGOk), [해시맵의 해시 충돌 해결 방법](https://www.youtube.com/watch?v=dKqv1mQotNU), [BJ.23 맵(map)과 해시 테이블(hash table)](https://www.youtube.com/watch?v=ZBu_slSH5Sk)
- [NIST DADS, perfect hashing](https://xlinux.nist.gov/dads/HTML/perfecthash.html)
- [NIST DADS, linear probing](https://xlinux.nist.gov/dads/HTML/linearprobng.html)
- [NIST DADS, quadratic probing](https://xlinux.nist.gov/dads/HTML/quadraticprb.html)
- [NIST DADS, double hashing](https://xlinux.nist.gov/dads/HTML/doublehashng.html)
- [Princeton Algorithms, LinearProbingHashST.java](https://algs4.cs.princeton.edu/34hash/LinearProbingHashST.java.html)
- [HashMap.java — OpenJDK jdk-21+35](https://github.com/openjdk/jdk/blob/jdk-21%2B35/src/java.base/share/classes/java/util/HashMap.java)
