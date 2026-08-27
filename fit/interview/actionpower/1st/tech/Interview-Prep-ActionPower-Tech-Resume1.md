---
tags: [fit, interview, actionpower]
status: done
category: "Interview - Fit"
aliases: ["ActionPower 이력서 기술 질문 1", "액션파워 DB, ORM, MQ 질문"]
---
# 액션파워 1차 — 이력서 기반 기술 질문 (1/2): DB, ORM, MQ, Docker

> 상위 TOC: [[Interview-Prep-ActionPower|액션파워 1차 면접 준비]]

---

## 3. 예상 질문 — 이력서 기반 기술 질문

### DB Lock으로 Race Condition 해결 — 어떤 Lock? 왜 그 방식? Optimistic vs Pessimistic?
> 관련: [[Transaction-Lock-Contention|트랜잭션, 락]], [[Transactions|트랜잭션]], [[Distributed-Lock|분산락]], [[Lock|DB Lock]]

**문제 상황**
- 850대 IoT 환경에서 여러 디바이스가 같은 품목 재고를 동시에 갱신 → Lost Update 발생
- 예: 재고 100개인 품목에 디바이스 A(-5), B(-3)가 동시 도착 → 둘 다 100을 읽고 각각 95, 97로 갱신 → 최종 97 (정상: 92)

**Pessimistic Lock 선택 이유**
- `SELECT FOR UPDATE NOWAIT`로 품목 단위 Exclusive Row Lock 획득
- 재고 읽기+갱신을 원자적 처리 (읽은 값 기반으로 갱신하므로 Lost Update 원천 차단)
- `NOWAIT` 옵션: lock 획득 실패 시 즉시 에러 반환 (대기하지 않음) → 100ms 간격 최대 3회 재시도 (최악 1초 이내 완료)

**Optimistic Lock을 선택하지 않은 이유**
- Optimistic Lock은 version 컬럼 기반으로 UPDATE 시점에 충돌 감지 (`WHERE version = N` → 0 rows affected면 재시도)
- 같은 품목 경합이 반복되는 구간에서는 Optimistic 재시도 비용이 커질 수 있어 비관적 잠금을 선택
- Pessimistic은 변경 전에 충돌을 조정해 NOWAIT 실패 시 잠금 획득 단계부터 제한 재시도 vs Optimistic은 충돌을 늦게 감지해 **전체 트랜잭션을 재실행할 수 있음**
- 재고 갱신은 짧은 트랜잭션(ms 단위)이므로 Pessimistic Lock의 대기 시간이 무시할 수준

| 기준 | Optimistic | Pessimistic |
|------|-----------|-------------|
| 충돌 빈도 | 낮을 때 유리 (읽기 많은 서비스) | 높을 때 유리 (쓰기 경합 많은 서비스) |
| 충돌 시 비용 | 전체 트랜잭션 재실행 | Lock 대기 (NOWAIT면 즉시 실패 후 재시도) |
| Lock 보유 시간 | 선점 없음. 조건부 UPDATE의 X Lock은 커밋까지 보유 | 트랜잭션 동안 보유 |
| 데드락 위험 | 낮음. 여러 행이나 자원 갱신이 얽히면 가능 | 있음. 순서 통일로 발생 가능성을 낮춤 |
| 구현 | version 컬럼 추가 | SELECT FOR UPDATE |

**트랜잭션 범위 최소화**
- 디바이스 정보 조회, 검증은 트랜잭션 **밖**에서 수행 (lock 보유 시간 줄이기)
- 트랜잭션 안: `SELECT FOR UPDATE`(재고 읽기) → 재고 갱신 → 데이터 입력만 배치
- Lock 순서 통일: 항상 **품목 ID 오름차순**으로 lock 획득 → 교차 대기(데드락) 가능성을 낮춤

**Redis 분산락을 선택하지 않은 이유**
- 초기에 Redlock 검토 → 별도 인프라 의존성 + 네트워크 레이턴시 + 클럭 동기화 문제
- 보호할 재고가 같은 DB 트랜잭션 안에 있으면 DB row lock이면 충분하며, 앱 인스턴스 수는 이 판단을 바꾸지 않음
- 여러 독립 DB, shard 또는 외부 시스템 경계를 하나의 트랜잭션으로 묶을 수 없을 때에만 분산 조정을 검토. Redis 락은 단순히 멀티 인스턴스라는 이유로 추가하지 않으며 TTL, fencing과 복구 설계가 함께 필요

**InnoDB Lock 종류**

| Lock 종류 | 설명 | 예시 |
|-----------|------|------|
| **Shared Lock (S)** | 읽기 잠금. 다른 S Lock 허용, X Lock 차단 | `SELECT ... FOR SHARE` |
| **Exclusive Lock (X)** | 쓰기 잠금. S/X 모두 차단 | `SELECT ... FOR UPDATE`, `UPDATE`, `DELETE` |
| **Record Lock** | 인덱스 레코드 하나에 거는 Lock | PK/유니크 인덱스로 정확히 1행 조회 시 |
| **Gap Lock** | 인덱스 레코드 사이의 간격을 잠금 (삽입 방지) | RR에서 범위 조건 `WHERE id BETWEEN 10 AND 20` |
| **Next-Key Lock** | Record Lock + Gap Lock 결합 | InnoDB RR 기본 동작. Phantom Read 방지 |

**데드락 — 완전한 예방은 불가능, 감지+복구가 핵심**
- 데드락의 전형적 원인: TX1이 A→B 순서, TX2가 B→A 순서로 lock 획득 → 상호 대기
- **왜 완전한 예방이 불가능한가**: Gap Lock, Next-Key Lock이 개발자가 의도하지 않은 순서로 암묵적으로 잡힘. 쿼리 실행 계획에 따라 lock 범위가 달라져 완벽한 순서 통일은 현실적으로 불가능
- **감지+복구**: InnoDB **Wait-for Graph**로 자동 탐지 → 비용 적은 트랜잭션을 자동 rollback → 앱에서 `ER_LOCK_DEADLOCK` catch 후 재시도가 정석
- **확률 완화**: Lock 순서 통일 + 트랜잭션 범위 최소화 + NOWAIT로 대기 회피 + 트랜잭션 안 외부 API 호출 금지
- 분석: `SHOW ENGINE INNODB STATUS` → LATEST DETECTED DEADLOCK 섹션 확인
- 모니터링: Grafana에서 `mysql_global_status_innodb_deadlocks` 메트릭 추적

**꼬리 질문 대비**
- "NOWAIT 대신 SKIP LOCKED는?" → SKIP LOCKED는 잠긴 행을 건너뛰고 다음 행을 읽음. 큐 패턴(작업 분배)에 적합하지만, 재고 갱신처럼 **특정 행을 반드시 처리해야 하는** 경우에는 NOWAIT가 맞음
- "FOR UPDATE와 FOR SHARE 차이?" → FOR UPDATE는 X Lock(배타적, 읽기/쓰기 모두 차단), FOR SHARE는 S Lock(공유, 읽기 허용, 쓰기 차단). 재고 갱신은 읽은 후 바로 쓰므로 X Lock 필요
- "ECS 멀티 인스턴스에서도 DB Lock으로 충분한가?" → 보호할 재고가 같은 DB에 있으면 충분. 여러 DB, shard나 외부 자원을 하나의 트랜잭션으로 묶을 수 없을 때 분산 조정을 검토하며, 샤딩이나 인스턴스 수만으로 Redis 락을 자동 선택하지 않음
- "Optimistic Lock이 나은 상황은?" → 읽기 중심 서비스, 충돌 빈도 낮은 경우 (예: 게시글 수정, 설정 변경). Lock 보유 없이 동시성 극대화
- "Gap Lock이 성능에 미치는 영향?" → 범위 잠금이므로 INSERT를 차단할 수 있음. 높은 동시성이 필요하면 RC로 변경하여 Gap Lock 비활성화 고려 (단, Phantom Read 허용 필요)
- "데드락 발생 시 애플리케이션 처리?" → InnoDB가 한쪽을 자동 rollback → `ER_LOCK_DEADLOCK` 에러 catch 후 재시도. 우리 시스템은 NOWAIT로 상호 대기 자체를 회피하여 발생 확률을 크게 낮춤
- "테이블 락은 언제 발생?" → DDL(ALTER TABLE), LOCK TABLES 명시 사용, 인덱스 없는 UPDATE/DELETE(풀스캔 시 모든 행에 lock → 사실상 테이블 락)

### 단일 쿼리 99.3% 개선 — 측정 기준? EXPLAIN 분석 방법?
> 관련: [[Index|인덱스]], [[Execution-Plan|실행계획]]

- 테이블 100만 건, 850대 디바이스, 디바이스당 평균 1,240건
- `2000ms+`는 특정 디바이스 최신 상태 조회에 포함된 서브쿼리의 관측값이다. 쿼리 1건 시간과 같은 지표로 비교하지 않는다.
- EXPLAIN ANALYZE로 `ORDER BY created_at DESC, id DESC` 후 약 9,000행 filesort 확인
- 카디널리티 분석: 디바이스 번호 선택도 약 0.12% → 복합 인덱스 `(device_number, created_at DESC, id DESC)` 설계
- 인덱스 스캔만으로 최상단 레코드 즉시 접근. Prisma `@@index`로 선언
- 쿼리 1건 결과: 15.4ms → 0.1ms. 850대를 순회한 배치 총시간 5분 15초 → 약 2초는 애플리케이션 처리와 네트워크 왕복을 포함한 별도 end-to-end 지표다.
- 실행 환경, cache 상태, 표본 수와 percentile은 기록되지 않았다. 동등 조건 뒤 최신 1건을 읽어 스캔 범위를 좁혔지만, 데이터와 디바이스가 늘면 같은 조건에서 B-Tree 깊이, cache, I/O와 데이터 분포를 포함해 다시 측정한다.
- 꼬리:
  - "복합 인덱스 컬럼 순서 기준?" → 동등 조건(=) 컬럼을 앞에, 범위 조건(>, BETWEEN) 컬럼은 뒤에. 카디널리티가 높은 컬럼이 앞에 올수록 스캔 범위가 빨리 좁혀짐
  - "인덱스를 많이 만들면?" → SELECT는 빨라지지만 INSERT/UPDATE/DELETE 시 인덱스도 갱신해야 하므로 쓰기 성능 저하. 실제로 필요한 쿼리 패턴 기반으로 설계
  - "커버링 인덱스란?" → 쿼리에 필요한 모든 컬럼이 인덱스에 포함되어 테이블 접근(랜덤 I/O) 없이 인덱스만으로 결과 반환

### Prisma 쿼리 증가 문제 — 구체적으로? ORM vs Raw Query 전환 기준?
> 관련: [[Execution-Plan|실행계획]], [[SQL|SQL]]

- Prisma는 lazy loading이 없어 전통적 N+1은 아님
- 당시 Prisma 버전과 설정에서는 `relationJoins` Preview 기능이 활성화되지 않아 include 관계를 여러 쿼리로 읽고 애플리케이션에서 결합했다. 조인 엔티티가 늘수록 쿼리가 증가했다.
- 기존 평균 100ms → 1000ms까지 저하
- 로그 분석으로 4개 개별 쿼리 확인 → `relationJoins` 활성화 뒤 `relationLoadStrategy: 'join'` 적용
- MySQL에서는 correlated subquery와 JSON aggregation 형태의 단일 쿼리로 통합해 82~90% 성능 개선. SQL `JOIN` 키워드 사용 여부는 생성 SQL과 실행계획으로 확인. ([Prisma 관계 조회 공식 문서](https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries))
- 이후에도 문제가 생기면 실행 계획 확인 후 SQL 튜닝 단계로 넘어가야 함
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
