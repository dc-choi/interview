---
tags: [database, nosql, mongodb, schema-design, document-database]
status: done
category: "데이터&저장소(Data&Storage)"
aliases: ["MongoDB Schema Design", "MongoDB 스키마 설계", "Embed vs Reference"]
---

# MongoDB 스키마 설계

MongoDB는 **도큐먼트 지향 DB** — 정규화된 테이블·조인이 아니라 **애플리케이션이 실제로 데이터를 사용하는 모양대로** 문서를 저장한다. RDBMS의 "테이블/행/열" 사고를 그대로 옮기면 오히려 성능이 나빠지기 쉽다. 핵심 질문은 "**Embed(내장)할까, Reference(참조)할까**"다.

## 핵심 명제

- **정규화가 아닌 접근 패턴이 스키마를 결정한다** — 쿼리가 함께 읽는 것은 함께 저장
- **JOIN을 피하는 대신 중복을 감수**한다 — 공간보다 읽기 횟수·지연이 중요
- **16MB 문서 크기 한도**와 **무제한 배열 금지** — 경계 없는 배열은 시한폭탄
- **스키마가 없는 게 아니라 "앱이 책임지는" 것** — 스키마 검증은 앱 계층이나 MongoDB Schema Validation으로

## 설계 3대 축

### 1. Access Pattern (접근 패턴)

가장 우선 고려 사항. "어떤 화면·API가 이 데이터를 읽는가"를 먼저 파악.

- **같이 조회되는 데이터는 같은 문서로** — 한 번의 `findOne()`으로 필요한 정보가 나오도록
- **읽기/쓰기 비율** — 읽기 많음 → embed, 쓰기 많음 → reference
- **빈도와 지연 요구** — 밀리초 내 응답이 필요한 경로와 백오피스 리포트 경로를 구분

### 2. Relation (관계)

RDB는 FK 조인이 기본, MongoDB는 선택지가 둘.

- **Embed(내장)** — 관련 데이터를 상위 문서에 **서브 도큐먼트나 배열로 포함**
- **Reference(참조)** — `ObjectId`나 다른 키를 저장하고 `$lookup` 또는 앱에서 여러 번 조회

### 3. Cardinality (관계의 크기)

- **One-to-One** — 거의 항상 embed (예: user ↔ profile)
- **One-to-Few** (수십 이하, 크기 안정) — embed 유리 (예: user ↔ addresses)
- **One-to-Many** (수백~수천) — 경우 따라. 배열이 무한 성장하면 reference
- **One-to-Squillions** (수만~수백만) — 반드시 reference. 자식 쪽에 부모 ID를 저장(`comments.postId`)
- **Many-to-Many** — 한쪽에 ID 배열 두기, 양쪽 참조, 중간 컬렉션 중 선택

## Embed vs Reference 비교

| 축 | Embed | Reference |
|---|---|---|
| 읽기 성능 | 빠름 — 한 번의 I/O로 완결 | 느림 — 추가 조회/`$lookup` 필요 |
| 쓰기 비용 | 큰 문서 전체 재작성 경향 | 작은 문서 개별 업데이트 |
| 일관성 | 원자성 보장(문서 단위 트랜잭션) | 여러 문서 갱신 시 멀티 문서 트랜잭션 필요 |
| 크기 한도 | 16MB 문서·무한 배열 위험 | 자유롭게 성장 |
| 데이터 중복 | 있을 수 있음(수정 시 여러 곳 갱신 필요) | 없음 |
| 진화 | 필드 추가 쉬움 | 조인 스키마 변경 시 여러 컬렉션 동기 |

## 패턴 모음

### Extended Reference (하이브리드)

참조하면서도 **자주 같이 쓰는 필드만 중복 저장**. 예: 주문 문서에 `customer._id` 뿐 아니라 `customer.name`, `customer.email`도 함께.
- 읽기에서 조인 없이 표시
- 원본 변경 시 하류 문서까지 업데이트해야 하지만, **변경 빈도가 낮다면** 이득이 큼

### Computed Pattern

집계·평균 같은 미리 계산된 필드를 문서에 저장. 읽기 시 계산 비용 제거.
- 주문 건수·평균 평점 등
- 쓰기 시 갱신 or 주기 배치로 맞춤

### Bucket Pattern

시계열·로그처럼 **작은 단위 문서가 많이 생기는** 경우, 1시간·1일 단위로 묶어 하나의 문서에 배열로 저장.
- 예: 센서 값 1분마다 기록 → 하루치를 한 문서 `{date, values: [..]}`로
- 문서 수 감소 → 인덱스 크기 축소, 조회 효율

### Subset Pattern

전체 데이터 중 **자주 쓰는 일부만** 문서에 두고, 나머지는 별도 컬렉션. 16MB 한도를 피하면서 핫 패스 성능 유지.

### Outlier Pattern

대부분은 작지만 일부만 거대한 경우, 거대한 쪽을 별도 컬렉션으로 분리해 나머지의 쿼리 성능을 지킨다.

## 인덱스 설계 포인트

- **접근 패턴에 맞춰** 인덱스 생성. 과한 인덱스는 쓰기·RAM 비용
- **ESR 규칙** (Equality → Sort → Range): 복합 인덱스 컬럼 순서
- **Covered Query** — 인덱스 안에 필요한 필드가 모두 있어 문서 페치 없이 결과 반환
- **TTL 인덱스** — `expireAfterSeconds`로 만료 데이터 자동 삭제(세션·임시 데이터)
- **Wildcard Index** — 구조가 가변적인 문서에서 임의 필드에 인덱스

## 16MB · 배열 성장 경고

MongoDB 문서는 최대 **16MB**. 한계에 가까워지는 상황:
- 댓글·이벤트 로그를 한 문서 배열에 누적
- 사용자별 활동 피드
- 센서 측정값 배열

대응:
- 일정 크기/개수로 **버킷팅**
- **Reference로 전환**
- **GridFS**로 대용량 파일 분할 저장

## Schema Validation(느슨한 스키마의 타협)

앱 계층 검증만으로는 데이터 이상이 DB에 스며든다. 해결:
- `$jsonSchema` 기반 **Schema Validation** 활성화 → 필수 필드·타입·범위 강제
- 검증 수준: `strict`(거부) vs `moderate`(기존 문서는 면제)
- 마이그레이션 시 **점진적 스키마 진화** 가능

## 트랜잭션 여부

- 단일 문서 쓰기는 **원자적** — 대부분의 시나리오는 문서 설계로 해결
- **멀티 문서 트랜잭션**은 4.0+ 지원하지만 **비용과 레이턴시**가 커 남발 금지
- 서로 다른 컬렉션의 관련 데이터를 embed로 묶을 수 있다면 그게 더 안전

## RDB 출신 개발자의 흔한 실수

- **정규화 3NF 그대로 이식** → 매 쿼리마다 `$lookup` → 성능 붕괴
- **무한히 자라는 배열** → 문서가 16MB에 근접하며 장애
- **ObjectId를 앱 외부에 노출** → 생성 시각 유추 가능, 보안·URL 미감
- **인덱스 없이 `find` 남발** → collection scan
- **모든 관계를 `$lookup`으로** — `$lookup`은 RDB의 인덱스 조인만큼 빠르지 않다. 같이 쓰면 embed, 분리되면 2-step read가 더 나을 때도

## 선택 트리(간단판)

1. **같이 읽히는가?** → embed
2. **배열이 무한 성장?** → reference
3. **원자 갱신이 필요?** → embed(단일 문서)
4. **여러 부모와 공유?** → reference + (Extended Reference로 읽기 최적화)
5. **16MB 근접 위험?** → bucketing 또는 subset

## 면접 체크포인트

- Embed vs Reference 선택의 3축(Access Pattern · Relation · Cardinality)
- One-to-Squillions에서 embed가 안 되는 이유
- Extended Reference·Bucket·Computed 패턴의 사용 시점
- 16MB 한도와 배열 성장 경고 사례
- Schema Validation이 "스키마 없음"이 아닌 이유
- RDB 정규화 사고를 그대로 옮기면 생기는 문제

## 출처
- [G마켓 기술블로그 — MongoDB 스키마 설계 가이드](https://dev.gmarket.com/32)

## 관련 문서
- [[Schema-Design|Schema design]]
- [[Aggregate-Boundary|Aggregate 경계와 데이터 접근]]
- [[ORM-Impedance-Mismatch|ORM과 임피던스 불일치]]
- [[JSON-vs-Text-Column|JSON vs TEXT 컬럼]]
- [[Sharding|Sharding]]
