---
tags: [database, rdbms, primary-key, design]
status: done
category: "Data & Storage - RDB"
aliases: ["PK Strategy", "Primary Key Strategy", "PK 생성 전략"]
---

# Primary Key 생성 전략

테이블의 PK를 어떻게 만드느냐는 **클러스터링 인덱스 효율 · 보안 · 분산 환경 호환성**을 모두 좌우한다. AUTO_INCREMENT가 항상 정답이 아니며, 분산·외부 노출 시 다른 전략이 필요하다.

## 후보 전략 4가지

| 전략 | 형태 | 보안 | 저장 크기 | 정렬성 | 분산 생성 |
|---|---|---|---|---|---|
| **AUTO_INCREMENT** | `BIGINT` 1, 2, 3... | ✗ (순차 유추) | 8B | ✓ | ✗ (DB 의존) |
| **UUID v4** | 32자 hex | ✓ | 16B (BINARY) / 36B (CHAR) | ✗ (랜덤) | ✓ |
| **UUID v7 / ULID** | 시간 + 랜덤 | ✓ | 16B / 26B | ✓ (시간 정렬) | ✓ |
| **Snowflake** | 64bit 정수 (시간 + 노드 + 시퀀스) | ✓ | 8B | ✓ | ✓ (노드 ID 필요) |

## AUTO_INCREMENT

**장점**
- 클러스터링 인덱스(InnoDB)에서 가장 효율적 — PK가 정렬된 순서로 INSERT되어 페이지 분할 거의 없음
- 저장 크기 작음 (BIGINT 8B)
- 단순·디버깅 쉬움

**단점**
- **순차 유추 가능** — `/orders/1234` 보고 `/orders/1235` 추측 → 정보 노출, IDOR 취약
- **분산 환경 어려움** — 여러 DB·샤드에서 충돌 위험. 별도 시퀀스 서비스 필요
- **이관·합병 시 충돌** — DB를 합치면 PK 충돌

**적합**: 내부 시스템, 단일 DB, 외부에 ID 노출 안 함

## UUID v4 (랜덤)

**장점**
- 충돌 확률 사실상 0 (122-bit 랜덤)
- 어디서든 즉시 생성 가능 (DB·앱·클라이언트 무관)
- 보안: 추측 불가

**단점**
- **랜덤이라 클러스터링 인덱스에 치명적** — INSERT마다 임의 위치에 끼어들어 **페이지 분할·캐시 오염**. 큰 테이블에서 INSERT 성능 급락
- 저장 크기: BINARY(16) 16B, CHAR(36) 36B → AUTO_INCREMENT 대비 2~4배
- 사람이 읽기 어려움 (디버깅·로그)

**적합**: PK가 외부에 노출되지만 트래픽이 작거나, 클러스터링 인덱스에 신경 쓸 필요가 적은 NoSQL 환경

## UUID v7 / ULID (시간 + 랜덤)

UUID v4의 보안성을 유지하면서 **앞부분에 타임스탬프**를 두어 정렬성을 회복한 형태.

- **UUID v7** (RFC 9562, 2024) — 60bit 타임스탬프 + 62bit 랜덤. 표준화됨
- **ULID** — 48bit 타임스탬프 + 80bit 랜덤. Crockford Base32 인코딩으로 26자

**장점**
- 시간순 정렬 → InnoDB 클러스터링 인덱스 친화적
- 보안: 외부에서 다음 ID 추측 어려움
- 분산 생성 가능

**단점**
- 시간이 노출됨 — 생성 시각을 숨겨야 하는 도메인엔 부적합
- 여전히 16~26B로 AUTO_INCREMENT보다 크다
- 라이브러리·DB 지원이 상대적으로 새로움 (MySQL 8.0+에서 BINARY로 저장 권장)

**적합**: PK가 외부에 노출되며, 분산·이관·합병 가능성이 있고, 시계열 정렬이 자연스러운 도메인

## Snowflake (트위터 방식)

64-bit 정수를 시간(41bit) + 데이터센터(5bit) + 머신(5bit) + 시퀀스(12bit)로 구성.

**장점**
- 정렬성 + 분산 생성 + 작은 크기 (8B)
- 카프카·Kafka·Discord·Twitter가 채택

**단점**
- 노드 ID 할당·시계 동기화 인프라 필요 (NTP, ZooKeeper 등)
- 41bit 시간 한계 (2080년대까지) → 새 변형(Sonyflake 등) 등장
- 시간이 노출됨

**적합**: 대규모 분산 시스템에서 InnoDB 친화적이면서 정수 PK가 필요한 경우

## 선택 가이드

| 상황 | 권장 |
|---|---|
| 내부 시스템, 단일 DB, ID 비공개 | **AUTO_INCREMENT** |
| ID가 URL·API에 노출, 단일 DB | **UUID v7 / ULID** |
| 분산 DB / 여러 샤드 / MSA | **UUID v7 / ULID** 또는 **Snowflake** |
| 절대적 보안 (시간 노출도 금지) | **UUID v4** + 별도 정렬 컬럼 (`created_at`) |
| 외부 노출용은 별도 컬럼으로 | AUTO_INCREMENT (PK) + UUID (외부 키) **이중 ID** 패턴 |

**이중 ID 패턴**: 내부 PK는 AUTO_INCREMENT(클러스터링 인덱스 효율), 외부 노출용 ID는 UUID 컬럼(보안). 단점은 컬럼 2개·인덱스 2개 비용.

## InnoDB 클러스터링 인덱스 관점

PK가 **삽입 순서대로 정렬되지 않으면** B+Tree 페이지 중간에 INSERT가 끼어들어:
1. 페이지가 가득 차면 **분할(split)** 발생 → I/O 증가
2. 새로 만들어진 페이지가 캐시에 없으면 디스크 읽기 → 추가 비용
3. 인덱스 단편화 → 시간이 지날수록 성능 저하

UUID v4가 INSERT 1만 건 기준 AUTO_INCREMENT 대비 **수 배 느린** 벤치마크가 흔하다. UUID v7·ULID·Snowflake는 시간 정렬 덕에 이 비용을 거의 회피.

## 흔한 실수

- VARCHAR(36)으로 UUID 저장 → 인덱스·조인이 모두 느려짐. **BINARY(16)** 사용
- 분산 환경에서 AUTO_INCREMENT 두 DB가 같은 ID 만들어내고 머지 시점에 충돌
- ULID/UUID v7을 PK로 쓰면서 별도로 `created_at` 인덱스를 또 만듦 (이미 PK가 시간 정렬)
- 비즈니스 키(이메일·주민번호)를 PK로 — 변경 가능성·보안 이슈

## 면접 체크포인트

- AUTO_INCREMENT vs UUID v4의 INSERT 성능 차이가 발생하는 이유 (클러스터링 인덱스)
- UUID v7·ULID가 v4의 어떤 단점을 해결하는가
- 분산 환경에서 PK 생성을 어떻게 할 것인가
- 외부 API에 PK를 그대로 노출하면 안 되는 이유
- BINARY(16) vs CHAR(36)으로 UUID를 저장할 때의 차이

## 출처
- [SK DEVOCEAN — PK 생성 전략](https://devocean.sk.com/blog/techBoardDetail.do?ID=165948&boardType=techBlog)

## 관련 문서
- [[Index|Index — 클러스터링 인덱스]]
- [[B-Tree-Index-Depth|B-Tree 인덱스 깊이]]
- [[Schema-Design|Schema design]]
