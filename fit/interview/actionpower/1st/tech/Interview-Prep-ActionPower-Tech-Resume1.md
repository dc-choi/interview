---
tags: [fit, interview, actionpower]
status: done
category: "Interview - Fit"
aliases: ["ActionPower 이력서 기술 질문 1", "액션파워 DB, ORM, MQ 질문"]
---
# 액션파워 1차 — 이력서 기반 기술 질문 (1/4): DB, ORM, MQ, Docker

> 상위 TOC: [[Interview-Prep-ActionPower|액션파워 1차 면접 준비]]

---

## 3. 예상 질문 — 이력서 기반 기술 질문

### 동시 갱신 정합성에서 DB Lock 선택 — Optimistic vs Pessimistic?
> 관련: [[Transaction-Lock-Contention|트랜잭션, 락]], [[Transactions|트랜잭션]], [[Distributed-Lock|분산락]], [[Lock|DB Lock]]

**문제 상황**
- 여러 요청이 같은 상태를 동시에 갱신하면 Lost Update가 생길 수 있다.
- 같은 값을 읽고 갱신하는 흐름은 잠금이나 조건부 갱신으로 읽기와 쓰기의 정합성을 보호한다.

**Pessimistic Lock 선택 이유**
- `SELECT FOR UPDATE NOWAIT`로 대상 행의 Exclusive Row Lock을 획득할 수 있다.
- 읽기와 갱신을 하나의 트랜잭션으로 처리해 읽은 값 기반 갱신의 Lost Update를 막는다.
- 실제 경험에서는 `NOWAIT` 실패를 짧은 고정 간격의 제한된 재시도로 처리했다. 현재 답변에서는 동시 재시도 집중을 줄이기 위한 지수 백오프와 지터를 개선안으로 구분하고, 간격과 횟수는 실제 충돌률과 허용 지연을 기준으로 정한다.

**Optimistic Lock을 선택하지 않은 이유**
- Optimistic Lock은 version 컬럼 기반으로 UPDATE 시점에 충돌 감지 (`WHERE version = N` → 0 rows affected면 재시도)
- 같은 대상의 경합이 반복되는 구간에서는 Optimistic 재시도 비용이 커질 수 있어 비관적 잠금을 선택한다.
- Pessimistic은 변경 전에 충돌을 조정해 NOWAIT 실패 시 잠금 획득 단계부터 제한 재시도 vs Optimistic은 충돌을 늦게 감지해 **전체 트랜잭션을 재실행할 수 있음**
- 짧은 트랜잭션이라면 Pessimistic Lock의 대기 비용도 함께 측정해 판단한다.

| 기준 | Optimistic | Pessimistic |
|------|-----------|-------------|
| 충돌 빈도 | 낮을 때 유리 (읽기 많은 서비스) | 높을 때 유리 (쓰기 경합 많은 서비스) |
| 충돌 시 비용 | 전체 트랜잭션 재실행 | Lock 대기 (NOWAIT면 즉시 실패 후 재시도) |
| Lock 보유 시간 | 선점 없음. 조건부 UPDATE의 X Lock은 커밋까지 보유 | 트랜잭션 동안 보유 |
| 데드락 위험 | 낮음. 여러 행이나 자원 갱신이 얽히면 가능 | 있음. 순서 통일로 발생 가능성을 낮춤 |
| 구현 | version 컬럼 추가 | SELECT FOR UPDATE |

**트랜잭션 범위 최소화**
- 잠금 대상과 독립적인 형식, 인증 검증과 외부 호출만 트랜잭션 **밖**에서 수행해 lock 보유 시간을 줄인다.
- 재고, 소유권과 상태 전이처럼 변경 가능한 상태의 불변식은 `SELECT FOR UPDATE`로 잠금을 얻은 뒤 다시 검증하고, 트랜잭션 안에는 이 검증, 상태 갱신과 필요한 기록만 둔다.
- 여러 행을 잠글 때는 정렬된 순서로 획득해 교차 대기 가능성을 낮춘다.

**Redis 분산락을 선택하지 않은 이유**
- 초기에 Redlock 검토 → 별도 인프라 의존성 + 네트워크 레이턴시 + 클럭 동기화 문제
- 보호할 재고가 같은 DB 트랜잭션 안에 있으면 DB row lock이면 충분하며, 앱 인스턴스 수는 이 판단을 바꾸지 않음
- 여러 독립 DB, shard 또는 외부 시스템 경계를 하나의 트랜잭션으로 묶을 수 없을 때에만 분산 조정을 검토. Redis 락은 단순히 멀티 인스턴스라는 이유로 추가하지 않으며 TTL, fencing과 복구 설계가 함께 필요

**InnoDB Lock 종류**

| Lock 종류 | 설명 | 예시 |
|-----------|------|------|
| **Shared Lock (S)** | 같은 레코드의 다른 S Lock과 호환되고 X Lock과 충돌 | `SELECT ... FOR SHARE` |
| **Exclusive Lock (X)** | 같은 레코드의 다른 S/X Lock과 충돌. 일반 consistent read는 MVCC 버전을 읽을 수 있음 | `SELECT ... FOR UPDATE`, `UPDATE`, `DELETE` |
| **Record Lock** | 인덱스 레코드 하나에 거는 Lock | PK/유니크 인덱스로 정확히 1행 조회 시 |
| **Gap Lock** | 인덱스 레코드 사이의 간격을 잠금 (삽입 방지) | RR에서 범위 조건 `WHERE id BETWEEN 10 AND 20` |
| **Next-Key Lock** | Record Lock + Gap Lock 결합 | InnoDB RR 기본 동작. Phantom Read 방지 |

**데드락 — 완전한 예방은 불가능, 감지+복구가 핵심**
- 데드락의 전형적 원인: TX1이 A→B 순서, TX2가 B→A 순서로 lock 획득 → 상호 대기
- **왜 완전한 예방이 불가능한가**: Gap Lock, Next-Key Lock이 개발자가 의도하지 않은 순서로 암묵적으로 잡힘. 쿼리 실행 계획에 따라 lock 범위가 달라져 완벽한 순서 통일은 현실적으로 불가능
- **감지+복구**: InnoDB **Wait-for Graph**로 자동 탐지 → 비용 적은 트랜잭션을 자동 rollback → 앱에서 `ER_LOCK_DEADLOCK` catch 후 재시도가 정석
- **확률 완화**: Lock 순서 통일 + 트랜잭션 범위 최소화 + NOWAIT로 대기 회피 + 트랜잭션 안 외부 API 호출 금지
- 분석: `SHOW ENGINE INNODB STATUS` → LATEST DETECTED DEADLOCK 섹션 확인
- 모니터링: 순정 MySQL 8.0/8.4에서는 `information_schema.INNODB_METRICS`의 `lock_deadlocks` 누계를 수집해 증가율을 추적한다. `Innodb_deadlocks` global status 변수는 없으므로 이 값을 쓰는 배포판은 별도로 확인한다.

**꼬리 질문 대비**
- "NOWAIT 대신 SKIP LOCKED는?" → SKIP LOCKED는 잠긴 행을 건너뛰고 다음 행을 읽음. 큐 패턴(작업 분배)에 적합하지만, 재고 갱신처럼 **특정 행을 반드시 처리해야 하는** 경우에는 NOWAIT가 맞음
- "FOR UPDATE와 FOR SHARE 차이?" → FOR UPDATE의 X Lock은 같은 레코드에 대한 다른 locking read와 쓰기와 충돌하고, FOR SHARE의 S Lock은 다른 S Lock과 호환되지만 X Lock과 충돌한다. 일반 consistent read는 MVCC 버전을 읽을 수 있다. 재고 갱신은 읽은 뒤 바로 쓰므로 X Lock이 필요하다.
- "여러 애플리케이션 인스턴스에서도 DB Lock으로 충분한가?" → 보호할 상태가 같은 DB에 있으면 충분하다. 여러 DB, shard나 외부 자원을 하나의 트랜잭션으로 묶을 수 없을 때 분산 조정을 검토하며, 인스턴스 수만으로 Redis 락을 자동 선택하지 않는다.
- "Optimistic Lock이 나은 상황은?" → 읽기 중심 서비스, 충돌 빈도 낮은 경우 (예: 게시글 수정, 설정 변경). Lock 보유 없이 동시성 극대화
- "Gap Lock이 성능에 미치는 영향?" → 범위 잠금이므로 INSERT를 차단할 수 있다. RC에서는 일반 검색과 인덱스 스캔의 Gap Lock이 줄지만 외래 키와 중복 키 검사에는 남는다. 동시성과 범위 재조회 일관성 요구를 함께 비교한다.
- "데드락 발생 시 애플리케이션 처리?" → InnoDB가 한쪽을 자동 rollback하므로 `ER_LOCK_DEADLOCK`을 구분해 재시도한다. NOWAIT를 쓰면 상호 대기 대신 실패 경로를 명시적으로 처리할 수 있다.
- "테이블 수준 대기는 언제 커지나?" → `LOCK TABLES`의 명시적 잠금이나 DDL의 메타데이터 잠금 경로를 구분한다. 적절한 인덱스가 없는 UPDATE/DELETE는 넓은 범위의 행과 인덱스 레코드를 잠가 동시성을 크게 제한하지만 테이블 락으로 바뀌는 것은 아니다.

### 단일 쿼리 개선 — 측정 기준과 EXPLAIN 분석 방법
> 관련: [[Index|인덱스]], [[Execution-Plan|실행계획]]

- 특정 대상의 최신 상태 조회에 포함된 서브쿼리 지연과 쿼리 1건 지연은 같은 지표가 아니므로 직접 비교하지 않는다.
- 최신 상태 조회는 실행계획에서 병목을 확인하고 equality 조건과 정렬 순서를 맞춘 복합 인덱스로 후보 범위를 줄인다.
- 상태 이력 테이블에서는 최신 상태 조회의 후보 범위를 작게 유지하도록 인덱스와 쿼리 순서를 함께 설계한다.
- EXPLAIN ANALYZE로 정렬과 후보 행 스캔을 확인해 병목 위치를 검증한다.
- 식별자의 선택도와 정렬 조건을 확인해 복합 인덱스 순서를 설계한다.
- 인덱스 스캔만으로 최상단 레코드 즉시 접근. Prisma `@@index`로 선언
- 전후 실행계획과 지연을 비교해 쿼리 전략을 조정했고, 쿼리 1건 지연과 여러 대상을 순회한 배치 end-to-end 시간은 애플리케이션 처리와 네트워크 왕복 범위가 다르므로 분리한다. 내부 전후 수치는 공개하지 않는다.
- 실행 환경, cache 상태, 표본 수와 percentile이 기록되지 않아 성과의 재현성에 한계가 있다. 데이터가 늘면 같은 조건에서 B-Tree 깊이, cache, I/O와 데이터 분포를 포함해 다시 측정한다.
- 꼬리:
  - "복합 인덱스 컬럼 순서 기준?" → 동등 조건(=) 컬럼을 앞에, 범위 조건(>, BETWEEN) 컬럼은 뒤에. 카디널리티가 높은 컬럼이 앞에 올수록 스캔 범위가 빨리 좁혀짐
  - "인덱스를 많이 만들면?" → SELECT는 빨라지지만 INSERT/UPDATE/DELETE 시 인덱스도 갱신해야 하므로 쓰기 성능 저하. 실제로 필요한 쿼리 패턴 기반으로 설계
  - "커버링 인덱스란?" → 쿼리에 필요한 모든 컬럼이 인덱스에 포함되어 테이블 접근(랜덤 I/O) 없이 인덱스만으로 결과 반환

### ORM 관계 조회의 쿼리 수 증가 — Prisma와 Raw Query 전환 기준
> 관련: [[Execution-Plan|실행계획]], [[SQL|SQL]]

- Prisma의 관계 로딩 형태는 버전, 설정과 쿼리 모양에 따라 달라지므로 생성 SQL과 공식 문서로 먼저 확인한다.
- 당시 Prisma 버전과 설정에서는 `relationJoins` Preview 기능이 활성화되지 않아 include 관계를 여러 쿼리로 읽고 애플리케이션에서 결합했다. 관계가 늘수록 호출 수와 왕복 비용이 커지는 경로를 로그로 확인했다.
- 공식 문서와 대조해 `relationJoins`를 활성화하고 `relationLoadStrategy: 'join'`을 적용했다. 당시 MySQL에서는 correlated subquery와 JSON aggregation 형태의 단일 쿼리가 생성됐으며, SQL `JOIN` 키워드 사용 여부는 생성 SQL과 실행계획으로 확인한다. ([Prisma 관계 조회 공식 문서](https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries))
- 응답 지연, SQL 로그와 실행계획을 같은 조건에서 비교한 뒤 관계 로딩 설정이나 쿼리 구조를 선택한다.
- 성능 경로에서 ORM 생성 쿼리가 요구를 충족하지 않을 때만 명시적 SQL을 검토한다.
- 꼬리:
  - "ORM을 왜 쓰나? Raw Query가 항상 빠르지 않나?" → 타입 안전성, 마이그레이션 관리, 생산성. 성능 크리티컬한 부분만 Raw Query로 전환. 대부분의 CRUD는 ORM이 충분
  - "Raw Query 전환 기준은?" → EXPLAIN으로 실행 계획 확인 후 ORM 생성 쿼리가 비효율적일 때. 복잡한 서브쿼리, 윈도우 함수, 벌크 연산 등
  - "Prisma 말고 TypeORM, Drizzle 등과 비교하면?" → TypeORM은 Active Record+Data Mapper 둘 다 지원하지만 복잡한 쿼리에서 불안정, Drizzle은 SQL에 가까운 타입 세이프 쿼리 빌더. Prisma는 스키마 중심 설계+마이그레이션이 강점이지만 복잡한 쿼리에서 한계

---

## 관련 문서
- [[Interview-Prep-ActionPower|1차 면접 TOC]]
- [[Interview-Prep-ActionPower-JD|JD 분석 & FIT 답변]]
- [[Interview-Prep-ActionPower-Tech-Resume2|이력서 기술 질문 2 (MQ, Docker)]]
- [[Interview-Prep-ActionPower-Tech-Resume3|이력서 기술 질문 3 (아키텍처 전환)]]
- [[Interview-Prep-ActionPower-Tech-Resume4|이력서 기술 질문 4 (GPL 모니터링)]]
- [[Interview-Prep-ActionPower-Tech-JD|JD 기반 기술 질문]]
- [[Interview-Prep-ActionPower-Service|서비스 맥락 + 컬처핏 + 역질문]]
- [[Interview-Prep-ActionPower-Checklist|면접 준비 체크리스트]]
