---
tags: [cs, data-structure, bloom-filter, probabilistic, hash, membership]
status: done
verified_at: 2026-10-12
category: "CS - 자료구조"
aliases: ["Bloom Filter", "블룸 필터", "Counting Bloom Filter", "카운팅 블룸 필터"]
---

# Bloom Filter (블룸 필터)

Bloom filter는 원소가 집합에 있는지를 근사로 답하는 확률적 자료구조다. 원소를 저장하지 않고 bit 배열에 hash 위치만 표시해, 원소 크기와 무관하게 원소당 몇 bit로 집합을 표현한다. 음성 응답(없음)은 확정이고 양성 응답(있을 수 있음)은 일정 확률로 틀린다. 거짓 양성(false positive)을 감당할 수 있는 곳에서 정확한 집합보다 공간을 크게 줄이는 구조다.

## 동작 원리

- m bit 배열을 0으로 시작하고, 원소를 0부터 m − 1 사이 위치로 보내는 hash function k개를 정한다.
- **추가**: 원소의 hash 위치 k곳을 1로 켠다. 이미 1인 곳은 그대로 둔다.
- **조회**: k곳이 모두 1이면 있을 수 있음, 하나라도 0이면 확실히 없음이다. 없는 원소는 처음 만난 0에서 멈출 수 있다.
- 넣은 원소가 켠 bit는 다시 0이 되지 않으므로, 넣은 원소를 없다고 답하는 거짓 음성은 없다. 다른 원소들이 켠 bit가 우연히 조회 위치를 모두 덮으면 넣지 않은 원소도 있을 수 있다고 답한다.

m = 10, k = 2에서 `cat`이 3번과 7번, `dog`가 1번과 3번 bit를 켰다고 하자. 넣은 적 없는 `cow`의 hash 위치가 1번과 7번이면 둘 다 켜져 있어 있을 수 있다는 답이 나온다. 위치 하나라도 0이었다면 바로 없다는 답으로 끝난다.

## 거짓 양성 확률과 크기 정하기

원소 n개를 넣은 뒤의 거짓 양성 확률은 hash가 이상적으로 무작위라는 가정에서 p ≈ (1 − e^(−kn/m))^k다.

- k에는 최적값이 있다. k를 늘리면 조회 때 0을 만날 기회가 늘지만 원소마다 켜는 bit도 늘어 배열이 빨리 찬다. p를 최소로 만드는 k는 (m/n) ln 2이고, 이때 bit의 절반이 1이며 p ≈ 0.6185^(m/n)이다. hash 계산을 줄이려고 최적보다 조금 작은 k를 쓰기도 한다.
- 목표 거짓 양성률 p를 정하면 원소당 bit 수는 m/n = −ln p / (ln 2)² ≈ 1.44 log₂(1/p)이고 최적 k는 log₂(1/p)를 올림한 값이다.

| 거짓 양성률 | 원소당 bit | hash 수 k |
|---|---|---|
| 1% | 9.585 | 7 |
| 0.1% | 14.378 | 10 |
| 0.01% | 19.170 | 14 |

- 거짓 양성률을 10분의 1로 낮출 때마다 원소당 약 4.8 bit가 더 든다.
- 공간은 원소 수에 비례한다. 1%에서 100만 개는 약 958만 bit(약 1.2MB), 10억 개는 약 1.2GB다. 원소 크기와는 무관해 URL처럼 긴 key일수록 정확한 집합 대비 절약 폭이 크다.
- 거짓 음성 없이 거짓 양성률 ε를 허용하는 어떤 표현도 원소당 log₂(1/ε) bit 이상이 필요하고, Bloom filter는 그 하한의 약 1.44배(log₂ e)를 쓴다. 같은 거짓 양성률에서 더 작은 구조도 있다. RocksDB의 Ribbon filter(6.15.0부터)는 Bloom filter 공간의 약 30%를 줄이는 대신 filter 처리에 CPU를 3~4배 쓴다.

## 설계 용량을 넘기면

Bloom filter는 가득 차서 삽입이 실패하는 일이 없다. 대신 켜진 bit 비율이 올라가 거짓 양성률이 설계값을 넘어선다. 용량은 예상 원소 수로 처음에 정하고, 원소 수를 알 수 없으면 확장형을 쓴다. Redis Bloom filter는 용량이 차면 직전 sub-filter의 `EXPANSION`배(기본 2) 크기인 sub-filter를 위에 쌓고 hash function을 늘려 오류율을 유지한다. 추가 지연은 그대로지만 조회는 최신 sub-filter부터 차례로 확인해 sub-filter 수만큼 느려진다. 확장하지 않을 것이 확실하면 `NONSCALING`으로 hash function을 하나 덜 쓴다.

## 연산과 비용

| 연산 | 비용 | 조건 |
|---|---|---|
| 추가 | O(k) | 저장된 원소 수 n과 무관하다. hash 계산은 key 전체를 읽으므로 key 길이에도 비례한다 |
| 조회 | O(k) | 없는 원소는 첫 0 bit에서 끝날 수 있다. 확장형은 sub-filter 수를 곱한다 |
| 삭제 | 표준 구조는 불가 | counting Bloom filter나 cuckoo filter를 쓴다 |
| 합집합 | O(m) | 크기와 hash function이 같은 두 filter의 bit OR |
| 공간 | m bit | 원소당 약 1.44 log₂(1/p) bit |

hash table은 충돌이 한 bucket에 몰리면 조회가 느려지지만 Bloom filter의 비용은 k번의 hash와 bit 확인으로 고정된다. 충돌의 영향이 시간 대신 정확도로 나타나는 셈이다.

## 메모리 배치

- 원소를 저장하지 않으므로 원소를 열거하거나 원래 값을 꺼낼 수 없다. 순서나 연관 value가 필요하면 다른 구조를 함께 둔다.
- 조회 한 번의 k곳이 bit 배열 전체에 흩어지면 filter가 CPU cache보다 클 때 probe마다 cache miss가 날 수 있다. RocksDB의 full filter는 한 key의 probe를 같은 cache line 안에 모아 cache miss를 key와 filter당 한 번으로 줄인다. m/n = 10, k = 6에서 거짓 양성률이 0.84%에서 평균 0.95%로 약 1.13배 오르는 비용을 받아들인 선택이다.
- Redis 문서 기준으로 Redis set은 membership에 원소당 약 192bit와 값 크기를 써서 IP 주소면 약 320bit인데, Bloom filter는 0.01%에서도 19.17bit다.
- key가 작은 범위의 조밀한 정수면 universe 크기만큼의 bitmap이 정확하고 크기도 비슷하거나 더 작을 수 있다. 0부터 1000만 미만 ID 중 100만 개라면 bitmap은 1000만 bit(약 1.25MB)로 오류가 없고, 1% Bloom filter는 약 1.2MB다([[Hash-Table#직접 주소 테이블에서 출발하기|직접 주소 테이블]]).

## 삭제와 변형

- **표준 filter는 삭제할 수 없다**: 지울 원소의 bit를 0으로 되돌리면 같은 bit를 쓰던 다른 원소까지 없다고 답하는 거짓 음성이 생긴다.
- **Counting Bloom filter**: bit 대신 작은 counter를 두고 추가 때 늘리고 삭제 때 줄인다. counter는 4bit면 대부분의 응용에 충분하지만 bit 하나를 4bit로 바꾸므로 공간이 4배다. counter가 넘치면 최댓값에 고정하는데, 그 뒤 삭제가 이어져 0이 되면 거짓 음성이 생길 수 있다.
- **Cuckoo filter**: 삭제를 지원하고 조회가 빠르다. 삽입이 잦으면 Bloom filter가 삽입 성능과 확장성에서 낫다.
- **합집합**: 크기와 hash function이 같은 두 filter를 bit OR하면 두 집합의 합집합을 나타내는 filter가 된다.
- 원소 개수 추정은 다른 문제다. Bloom filter는 원소가 있는지를, HyperLogLog는 서로 다른 원소가 몇 개인지를 근사한다([[Redis-Data-Structures|Redis 자료구조의 확률형 타입]]).

## 거짓 양성의 비용은 집합의 의미가 정한다

양성 응답이 틀렸을 때 생기는 일은 filter에 담은 집합이 무엇을 뜻하는지에 달렸다.

| 담은 집합 | 거짓 양성의 결과 | 예 |
|---|---|---|
| 느린 저장소에 실제로 있는 key | 헛된 조회 한 번. 최종 결과는 원본이 정해 정확성은 유지된다 | 저장소의 파일별 filter, DB에 없는 key의 반복 조회 차단(cache penetration), 분산 join에서 목록 대신 filter 전송, 규칙으로 처리 못 하는 단어(약 10%)만 사전을 찾는 하이픈 처리 |
| 막아야 할 대상(차단 목록) | 멀쩡한 대상을 막는다. 안전 쪽 오류지만 사용자 비용이 든다 | 쓰면 안 되는 password 사전 |
| 맞는 대상(허용 목록, 정답 사전) | 틀린 대상을 통과시킨다 | 초기 UNIX 철자 검사기에서 오타가 통과 |

- 양성 응답만으로 권한을 주거나 데이터를 확정하지 않는다. 결과가 중요하면 양성일 때 원본을 다시 조회하고, 그 재조회 비용에 거짓 양성률을 곱한 값이 filter를 둔 대가다.
- 음성을 믿으려면 원본에 추가된 원소가 filter에도 모두 반영돼야 한다. 쓰기 경로에서 filter 갱신을 빠뜨리거나 filter를 다시 만드는 사이에 추가된 원소는 없다고 나온다([[NextJS-Redirect-Strategy|redirect map과 filter의 갱신 시점]]).

## 사례

- **RocksDB**: memtable이 차면 LSM tree의 파일로 내려 쓰고, 새로 만드는 SST 파일마다 Bloom filter를 넣는다. probe 하나라도 0이면 그 파일에는 key가 없으므로 읽지 않고 건너뛰어 `Get`의 I/O, CPU와 block cache 교체를 줄인다. 전체 key로 만든 filter는 point lookup에만 쓰여 range scan을 줄여 주지 않는다. filter는 대부분 memory에도 올라가므로 key당 bit 수가 곧 memory 비용이고, 문서는 key당 9.9bit(1%)가 100bit의 99% 효과를 낸다고 설명해 그 이상은 이득이 작다.
- **Redis**: `BF.RESERVE key error_rate capacity`로 목표 오류율과 용량을 정한다. 사용자명 중복 확인에서 음성이면 바로 생성하고 양성이면 DB를 조회하거나 거절한다. 음성이어도 같은 이름의 동시 가입은 막지 못하므로 최종 중복 판정은 DB unique 제약이 맡는다.
- **Cache penetration**: 존재하지 않는 key가 반복 조회돼 DB까지 내려가는 경우 앞단에서 거른다([[Cache-Decision|Cache 결정]]).

## 면접 체크포인트

- 거짓 음성은 없고 거짓 양성만 있는 이유
- m, n, k와 거짓 양성률의 관계, 최적 k와 원소당 bit 계산(1%에 약 9.6bit, k = 7)
- hash function 수를 늘리면 오히려 나빠지는 지점이 있는 이유
- 표준 filter에서 삭제가 안 되는 이유와 counting Bloom filter, cuckoo filter
- 거짓 양성의 비용이 집합의 의미에 따라 다른 이유와 양성 응답을 원본으로 확인해야 하는 경우
- 설계 용량을 넘긴 filter에서 생기는 일과 확장형의 조회 비용

## 출처

- [Network Applications of Bloom Filters: A Survey — Internet Mathematics, Andrei Broder와 Michael Mitzenmacher](https://www.eecs.harvard.edu/~michaelm/postscripts/im2005b.pdf)
- [Redis Docs, Bloom filter](https://redis.io/docs/latest/develop/data-types/probabilistic/bloom-filter/)
- [RocksDB Wiki, RocksDB Bloom Filter](https://github.com/facebook/rocksdb/wiki/RocksDB-Bloom-Filter)
- [RocksDB Wiki, RocksDB Overview](https://github.com/facebook/rocksdb/wiki/RocksDB-Overview)
- [YouTube, Codist, Every Data Structure Simply Explained in 25 Minutes!](https://www.youtube.com/watch?v=vVL6NFzr0Rg)

## 관련 문서

- [[자료구조(DataStructure)|자료구조 인덱스]]
- [[Hash-Table|Hash Table]]
- [[Hash-Collision|해시 충돌]]
- [[Linear-Data-Structures-List-and-Set|List와 Set (정확한 membership 비용)]]
- [[Redis-Data-Structures|Redis 자료구조 (확률형 타입)]]
- [[Cache-Decision|Cache 결정 (Cache Penetration)]]
- [[NextJS-Redirect-Strategy|Next.js redirect 전략 (filter 앞단 조회)]]
