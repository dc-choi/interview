---
tags: [cs, data-structure, hash, hash-table]
status: done
category: "CS - 자료구조"
aliases: ["Hash Collision", "해시 충돌"]
---

# Hash Collision (해시 충돌)

해시 테이블의 **공간은 유한하고 입력은 무한**하기 때문에 다른 키가 같은 해시 값을 만드는 건 피할 수 없다. 충돌을 **얼마나 잘 처리하냐**가 해시 테이블 성능을 가른다. 평균 O(1), 최악 O(n)의 간극이 여기서 나옴.

## 왜 충돌은 피할 수 없나

- 해시 함수는 임의 크기 입력 → **고정 크기 정수** 매핑
- 입력 경우의 수 ≫ 출력 경우의 수 → **비둘기집 원리**상 충돌 불가피
- 완벽한 해시 함수(Perfect Hash)는 입력 집합이 **사전에 고정**돼 있을 때만 가능

따라서 해시 테이블 설계는 **"충돌이 난다는 전제"**에서 출발.

## 해결 방법 ① — Separate Chaining (분리 연결법)

같은 버킷에 **연결 리스트(또는 트리)**로 여러 값 저장.

```
Bucket 3: [Key1, Value1] → [Key2, Value2] → [Key3, Value3]
```

### 장점
- 구현 단순
- 부하율(load factor)이 1 초과해도 동작
- 삭제가 쉬움

### 단점
- **포인터 오버헤드** (각 노드에 next 포인터)
- 캐시 친화성 낮음 (메모리 점프)
- 충돌 많으면 체인이 길어져 O(n)

### 최적화
- Java 8+ `HashMap`: 체인이 **8개 넘으면 Red-Black Tree로 전환** → 최악 O(log n)
- 해시 품질이 나빠 한 버킷에 집중돼도 허용 가능한 성능

## 해결 방법 ② — Open Addressing (개방 주소법)

충돌 시 **다른 빈 버킷**을 찾아 저장. 테이블 자체가 값을 담음.

### 탐사(Probing) 3종

**1. Linear Probing (선형 탐사)**
```
hash(key) + 1, +2, +3, ... 순차 탐색
```
- 단순, 캐시 친화
- **Primary Clustering**: 충돌 난 자리 근처가 계속 밀집 → 성능 저하

**2. Quadratic Probing (이차 탐사)**
```
hash(key) + 1², + 2², + 3², ... 간격이 점점 벌어짐
```
- 클러스터링 완화
- **Secondary Clustering**: 같은 해시를 가진 키들은 같은 탐사 순서 → 여전히 밀집 가능

**3. Double Hashing (이중 해싱)**
```
hash1(key) + i × hash2(key)
```
- 두 번째 해시 함수로 탐사 간격 결정
- 클러스터링 가장 적음
- 계산 비용 가장 큼

### 장점 (공통)
- 포인터 없음 → 메모리 지역성 우수
- 캐시 성능 좋음

### 단점 (공통)
- 부하율 ~ 70% 넘으면 급격히 느려짐 → **리사이즈 필요**
- **Tombstone**: 삭제한 자리를 "비었음"으로 못 표시 (탐사 체인 끊김) → 특수 마커 유지
- 부하율 관리가 까다로움

## Separate Chaining vs Open Addressing

| 축 | Separate Chaining | Open Addressing |
|---|---|---|
| 부하율 허용 | 1.0 초과 가능 | ~0.7 한계 |
| 메모리 | 노드 포인터 비용 | 테이블만 |
| 캐시 친화 | 낮음 | 높음 |
| 삭제 | 간단 | Tombstone 관리 |
| 충돌 집중 시 | O(n) 또는 O(log n)(tree화) | O(n) |
| 구현 복잡도 | 낮음 | 중간 |

**Java HashMap**: Separate Chaining + tree화
**Python dict**: Open Addressing (Compact Dict)
**Go map**: Open Addressing (bucket 기반)

각 언어 설계 철학이 다름. 범용 라이브러리는 Chaining이 안전, 고성능 인메모리는 Open Addressing 택하는 경향.

## Load Factor와 리사이즈

```
Load Factor = 저장된 항목 수 / 버킷 수
```

임계 초과 시 **버킷 수를 2배 (보통)** 로 늘려 재해싱(rehash).

- **Separate Chaining**: 0.75 기본 (Java HashMap)
- **Open Addressing**: 0.5~0.7

리사이즈 비용:
- 모든 항목을 재해싱 → O(n) 블로킹
- Redis·일부 DB는 **점진적 리사이즈**로 블로킹 회피

## 해시 함수의 품질

충돌은 불가피하지만 **균등 분포**해야 성능 유지.

좋은 해시 함수 조건:
- **결정성**: 같은 입력 → 같은 출력
- **균등성**: 출력이 공간 전체에 고르게 분포
- **빠른 계산**: O(입력 크기)
- **스노우 플레이크 효과**: 입력 한 비트만 바뀌어도 출력 절반이 바뀜

대표 알고리즘:
- **MurmurHash**, **xxHash**: 해시 테이블 전용, 빠름
- **SHA-256·MD5**: 암호학적, 느리지만 충돌 어려움
- **Java `String.hashCode()`**: 31의 승수 방식, 단순하지만 공격 가능

## 해시 충돌 공격 (HashDoS)

악의적 입력이 **모든 키를 같은 버킷**에 몰리게 만들면 → O(n) 저하 → 서비스 거부.

2011년 Java·Python·Ruby 모두 영향받음. 방어:
- **Randomized Hashing**: 프로세스마다 다른 시드
- **Per-table Salt**
- Java: 위협 감지 시 tree화 강제

Python 3.4+는 기본 활성화. Java 8+는 tree화로 최악 O(log n) 보장.

## 실무 힌트

- `HashMap` 초기 용량을 **예상 크기의 1.3~1.5배**로 설정 → 리사이즈 회피
- 키로 **Mutable 객체 사용 금지** (equals·hashCode 바뀌면 찾을 수 없음)
- `equals`와 `hashCode`는 **함께 오버라이드** (계약)
- JS `Map`은 내부 해시 테이블, 키로 **객체 참조** 가능 (오브젝트 ID 기반)

## 면접 체크포인트

- 해시 충돌이 **불가피한** 이유 (비둘기집 원리)
- Separate Chaining과 Open Addressing의 구조 차이
- Linear·Quadratic·Double Hashing의 클러스터링 차이
- Java 8 HashMap의 tree화 기준 (8개 초과)
- Load Factor와 리사이즈의 관계
- HashDoS 공격과 방어 (Randomized Hashing)
- Java의 `equals` / `hashCode` 계약

## 출처
- [매일메일 — 해시 충돌](https://www.maeil-mail.kr/question/147)

## 관련 문서
- [[자료구조(DataStructure)|자료구조 개요]]
- [[Redis-Data-Structures|Redis 자료구조]]
- [[Java-Backend-Fundamentals|Java 백엔드 기초 (equals·hashCode)]]
