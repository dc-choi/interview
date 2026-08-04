---
tags: [cs, data-structure, hash, hash-table]
status: done
category: "CS - 자료구조"
aliases: ["Hash Collision", "해시 충돌"]
---

# Hash Collision (해시 충돌)

서로 동등하지 않은 key가 같은 bucket index로 대응되면 collision이 발생한다. 가능한 key 수가 bucket 수보다 많으면 비둘기집 원리상 모든 key에 collision 없는 mapping을 보장할 수 없다. 고정되어 미리 알려진 key 집합에는 perfect hashing을 설계할 수 있지만 일반적인 동적 입력의 collision 처리 필요성이 사라지는 것은 아니다.

## Separate chaining

각 bucket이 같은 index로 온 항목들의 list나 다른 검색 구조를 가진다.

```text
bucket 3: [key1, value1] -> [key2, value2] -> [key3, value3]
```

- insert 전에 같은 key를 찾는 비용과 lookup/delete 비용은 chain 길이에 좌우된다.
- head에 새 node를 연결하는 동작만 보면 O(1)이다.
- load factor α가 1보다 커도 저장할 수 있지만 평균 chain 길이가 함께 증가한다.
- node/reference overhead와 pointer chasing 때문에 open addressing보다 cache locality가 불리할 수 있다.

균일 hashing 가정에서 bucket당 평균 항목 수는 `α = n/m`이고 search 비용은 이에 비례한다. 실제 성능은 hash 품질과 key 분포에 달려 있다.

## Open addressing

모든 항목을 하나의 bucket array에 저장한다. home bucket이 차 있으면 probe sequence를 따라 빈 slot이나 같은 key를 찾는다.

### Linear probing

`h(key), h(key)+1, h(key)+2, ...` 순서로 확인한다. 연속 memory 접근은 cache에 유리하지만 점유 구간이 더 큰 점유 구간을 끌어들이는 primary clustering이 생길 수 있다.

### Quadratic probing

제곱 간격 같은 비선형 offset을 사용해 primary clustering을 줄인다. 같은 home bucket을 가진 key가 같은 probe sequence를 공유하면 secondary clustering은 남을 수 있다. table 크기와 계수 선택에 따라 모든 slot을 방문하지 못할 수 있으므로 구현 조건을 함께 설계한다.

### Double hashing

두 번째 hash로 step을 정해 `h1(key) + i * h2(key)`를 탐사한다. step과 table 크기가 서로소가 되도록 해야 전체 table을 순회할 수 있다. clustering을 줄이는 대신 hash 계산이 추가된다.

## 삭제와 tombstone

open addressing에서 삭제 slot을 처음부터 비어 있던 slot처럼 표시하면 그 뒤에 이어진 probe chain의 key를 찾지 못할 수 있다. tombstone을 두거나 후속 항목을 재배치해 search 경로를 보존한다. tombstone이 쌓이면 probe가 길어져 정리나 rehash가 필요하다.

## Load factor와 resize

| 방식 | α의 의미 | 제약 |
|---|---|---|
| separate chaining | bucket당 평균 항목 수 | 1을 넘을 수 있음 |
| open addressing | 점유된 slot 비율 | 빈 slot이 필요하므로 1 미만 |

open addressing의 probe 비용은 α가 1에 가까워질수록 빠르게 증가한다. 특정 임계치가 모든 구현에 공통인 것은 아니다. 구현은 목표 지연, memory 비용과 collision scheme에 맞춰 resize 시점을 고른다.

resize는 더 큰 table을 만들고 새 bucket 수에 맞춰 항목을 다시 배치하므로 한 번에 Θ(n)이 든다. 성장 폭을 충분히 크게 잡으면 여러 insert에 걸친 amortized 비용은 작게 유지할 수 있다. latency가 중요한 구현은 migration을 여러 operation에 나눌 수 있다.

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

## 출처

- 인프런, 감자 강사, [해시테이블 개념](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115974), [해시테이블 구현](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115975)
- [NIST DADS, hash table](https://xlinux.nist.gov/dads/HTML/hashtab.html)
- [Princeton Algorithms, Hash Tables](https://algs4.cs.princeton.edu/34hash/)
- [Oracle Java HashMap API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/HashMap.html)
