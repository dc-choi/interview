---
tags: [spring-batch, batch, itemreader, itemwriter, chunk, tasklet, performance]
status: done
category: "OS & Runtime"
aliases: ["Spring Batch", "Spring Batch Essentials", "배치 성능 최적화", "JdbcBatchItemWriter"]
---

# Spring Batch — 구조·처리 모델·성능 최적화

Spring Batch는 **대용량 데이터 일괄 처리**를 위한 프레임워크. 정산·리포트·ETL·데이터 마이그레이션 같은 배치 잡을 공통 템플릿(Job·Step·Chunk)과 **재시작·스킵·트랜잭션 경계** 기능으로 표준화한다.

## 왜 Spring Batch가 필요한가

- **메타데이터 관리**: 실행 이력·상태·파라미터를 DB에 저장 → 장애 후 **중단 지점부터 재시작** 가능
- **트랜잭션 경계**: 청크 단위 원자성
- **재시도·스킵·예외 처리**의 선언적 관리
- **읽기/처리/쓰기 템플릿** — 반복 코드 제거
- **모니터링**: Step별 Read·Write·Skip·Commit 수 자동 집계

단순 스케줄링만 필요하면 [[#Spring Scheduler vs Quartz|Scheduler/Quartz]]로 충분. Spring Batch는 **청크 트랜잭션과 재시작이 필요할 때** 가치가 커진다.

## 계층 구조

```
Job            (최상위 배치 작업)
 └── Step      (단계. 보통 여러 개)
      ├── Tasklet     (단순 1회 작업)
      └── Chunk       (Read → Process → Write 반복)
```

- **Job**: 여러 Step의 집합. 실행 파라미터에 따라 **JobInstance** 생성
- **JobInstance**: `job_name + JobParameters` 조합으로 유니크
- **JobExecution**: JobInstance의 실제 실행 시도 (재시도 시 같은 Instance에 새 Execution)
- **Step**: 실제 로직. Tasklet 또는 Chunk 모델 선택
- **StepExecution**: Step 실행마다 생성, Read·Write·Skip 카운터 포함

## Tasklet vs Chunk

| 축 | Tasklet | Chunk |
|---|---|---|
| 용도 | 단순 단일 작업 (파일 이동·테이블 truncate·플래그 갱신) | 대용량 데이터 Read→Process→Write 반복 |
| 트랜잭션 | Step 전체가 하나 | **Chunk 단위**로 커밋 |
| 종료 | `RepeatStatus.FINISHED` 반환 | Reader가 null 반환할 때까지 반복 |
| 재시작 | Step 단위 | **Chunk 단위** (중단 지점부터) |

**Chunk 모델이 배치의 정석.** Tasklet은 보조 Step(전처리·정리)에 쓴다.

## 메타데이터 테이블 6종

Spring Batch가 자동 생성하는 배치 실행 이력 저장소.

| 테이블 | 역할 |
|---|---|
| `BATCH_JOB_INSTANCE` | JobInstance (같은 파라미터의 논리적 동일성) |
| `BATCH_JOB_EXECUTION` | 실제 실행 시도 (상태·시작/종료 시각) |
| `BATCH_JOB_EXECUTION_PARAMS` | 실행 파라미터 (`@JobScope`) |
| `BATCH_JOB_EXECUTION_CONTEXT` | Job 레벨 컨텍스트 (Step 간 공유) |
| `BATCH_STEP_EXECUTION` | Step별 실행 상태·Read/Write/Skip 카운터 |
| `BATCH_STEP_EXECUTION_CONTEXT` | Step 레벨 컨텍스트 (재시작 시 이어서) |

이 테이블 덕에 **같은 파라미터로 완료된 Job은 재실행 거부**되고, 실패 시에는 **마지막 청크부터 재시작** 가능.

## Chunk 모델 상세

```
ItemReader  →  ItemProcessor  →  ItemWriter
   (1건)         (1건 가공)        (chunk 단위 쓰기)
```

- **ItemReader**: 소스에서 1건씩 읽음 (DB·파일·큐)
- **ItemProcessor**: 1건을 변환·필터링. `null` 반환 시 해당 아이템 skip
- **ItemWriter**: chunk 크기만큼 모인 아이템을 **일괄 쓰기**

Chunk 크기가 곧 **트랜잭션 경계**이자 commit 간격. 10,000건이면 chunk 10,000 → commit 1회.

### 주요 Reader

| Reader | 용도 | 주의 |
|---|---|---|
| `FlatFileItemReader` | CSV·고정 폭 파일 | 대용량에도 메모리 안전 |
| `JdbcCursorItemReader` | DB Cursor 기반 | 장시간 커넥션 점유·Replica 권장 |
| `JdbcPagingItemReader` | OFFSET/LIMIT 페이징 | **대용량에서 OFFSET 비용** 문제 |
| `JpaPagingItemReader` | JPA 기반 페이징 | JPA 영속성 컨텍스트 오버헤드 |
| `JpaCursorItemReader` | JPA Cursor (Hibernate 의존) | 구현체 의존성·제한적 |
| `Custom ZeroOffset Reader` | PK 기반 커서 페이징 | **대용량의 정석** (아래 성능 섹션) |

### 주요 Writer

- **`JdbcBatchItemWriter`**: JDBC `addBatch`·`executeBatch`로 일괄 쓰기. 가장 빠름
- **`JpaItemWriter`**: `persist/merge` 반복. JPA 장점은 살지만 느림
- **`CompositeItemWriter`**: 여러 Writer 동시 실행 (멀티 타깃)
- **Custom Writer**: 외부 API 호출·Kafka 발행 등

## 성능 최적화

배치 성능의 **80% 이상이 Reader에서 결정**된다. Writer는 JDBC 배치로 해결 가능.

### Reader 함정 — OFFSET/LIMIT

`JpaPagingItemReader`·`JdbcPagingItemReader`는 내부에서 `LIMIT ? OFFSET ?`을 사용. OFFSET이 커질수록 **읽고 버리는 row가 선형 증가** → 뒷 페이지가 기하급수로 느려짐. 1억 행 기준 뒷 페이지는 수십 초까지 걸리는 경우도.

### 해법 — ZeroOffset·Cursor

- **ZeroOffsetItemReader** (커스텀): OFFSET 대신 **마지막 PK 이후** (`WHERE id > :lastId`)로 조회. 페이지 깊이 무관한 상수 시간
- **JdbcCursorItemReader / HibernateCursorItemReader**: DB cursor로 한 번 쿼리 후 스트리밍. 커넥션을 오래 점유하는 단점은 있지만 OFFSET 문제 없음
- **Exposed Cursor** (Kotlin) · **QuerydslPagingItemReader**: 타입 안전 + ZeroOffset 조합

원리는 [[Pagination-Optimization|페이징 최적화]]와 동일 — **OFFSET 대신 커서로**.

### Writer 최적화 — JDBC Execute Batch

JPA `Dirty Checking`은 항목마다 개별 UPDATE → 10,000건이면 10,000 UPDATE. JDBC 배치로 묶으면 **수십~수백 배 빨라진다**.

```java
jdbcTemplate.batchUpdate(sql, items, BATCH_SIZE,
    (ps, item) -> { ps.setXxx(...); });
```

MySQL에서는 **`rewriteBatchedStatements=true`** 옵션이 필수. 없으면 여러 INSERT가 실제로 하나의 `VALUES (…), (…), (…)` 로 합쳐지지 않는다.

보고 수치 예: 1,666건 처리에서 SQL 쿼리 수 **27,714 → 12,666 (54% 감소)**, 나머지 지연은 스크래핑이라 시간 단축은 제한적. **I/O 중심 워크로드**에서는 시간까지 큰 개선.

### Chunk Size 튜닝

- 너무 작음: 트랜잭션·커밋 오버헤드가 전체 비중의 대부분
- 너무 큼: 메모리 사용·롤백 비용 증가·Lock 유지 시간 길어짐
- **PageSize = ChunkSize** 권장 — 페이지 경계와 커밋 경계가 일치해 쿼리 횟수 최소화
- 경험치: 1,000~10,000 구간에서 시작 후 측정

### 네트워크 I/O 병목 — 병렬 처리

외부 API를 **1건씩 동기 호출**하면 응답 150ms × 1,000건 = 150초 대기. 해결:

- Processor를 제거하고 Writer에서 **RxJava·Coroutine·`CompletableFuture`로 병렬 호출**
- 10 thread 병렬이면 대략 10배 단축 사례
- 외부 API rate limit 주의

### 상태 그룹화 업데이트

개별 아이템별 UPDATE 대신 **상태별로 묶어 `IN` 절**로 한 번에:

```sql
UPDATE orders SET status = 'PAID' WHERE id IN (?, ?, ?, ...);
```

1,000건 UPDATE가 3~5개 그룹으로 줄어듦. QueryDSL·Exposed로 안전하게 구현.

## Partitioning·Multi-Thread Step

단일 Step을 **여러 스레드/프로세스로 분할 실행**하는 방법.

- **Multi-threaded Step**: 한 Step 내부에서 Reader/Processor/Writer를 여러 스레드로. Reader가 thread-safe해야 (JpaPagingItemReader는 X)
- **Partitioning**: Master Step이 범위를 분할해 Worker Step들에 위임. 각 Worker가 독립된 Reader/Writer
- **Remote Partitioning**: Worker를 별도 JVM·인스턴스로 분산

대용량에서는 **Partitioning이 확장성 우위**. 단일 프로세스 내 멀티스레딩보다 DB·파일 I/O 분산 효과.

## 증분 배치 전략

전체 데이터 재처리 대신 **변경분만** 처리.

- `last_modified` 컬럼 활용 → `WHERE updated_at > :lastRun`
- **체크포인트**를 `BATCH_JOB_EXECUTION_CONTEXT` 또는 별도 테이블에 저장
- CDC와 결합하면 실시간에 가까운 증분 처리 가능 ([[CDC-Debezium]])
- 초기화 배치는 `ZeroOffset`, 일상 증분은 `last_modified` 인덱스로 단순 쿼리

## 흔한 실수

- **`JpaPagingItemReader`로 1억 행 처리** — OFFSET 병목으로 뒷 페이지 수십 초
- **Writer에 Dirty Checking 의존** — 개별 UPDATE 폭증, JDBC 배치로 이관 필요
- **`rewriteBatchedStatements=true` 누락** — JDBC 배치 효과 없음
- **Chunk Size를 1로** — 트랜잭션 오버헤드가 전부
- **같은 JobParameters로 재실행 시도** — `JobInstanceAlreadyCompleteException`. 파라미터에 `run.id=UUID` 추가하거나 `--incremental`
- **메타 테이블 없이 운영** — Spring Batch 기동 실패. 자동 생성 또는 `schema-*.sql` 적용

## 면접 체크포인트

- **Job·Step·Chunk·ItemReader/Processor/Writer** 구조와 역할
- **Tasklet vs Chunk** 선택 기준
- 메타데이터 테이블이 주는 **재시작·중복 실행 방지** 효과
- 대용량에서 `JpaPagingItemReader`가 느려지는 **OFFSET 원인**과 대안
- `JdbcBatchItemWriter` + **`rewriteBatchedStatements`** 조합의 중요성
- **Chunk Size = Page Size** 권장 이유
- Partitioning과 Multi-threaded Step의 차이
- 증분 배치가 전체 재처리보다 나은 상황

## Spring Scheduler vs Quartz

Spring Batch와 함께 자주 언급되는 **스케줄링** 문제. 배치 "언제 돌릴지"를 결정.

| 축 | Spring `@Scheduled` | Quartz |
|---|---|---|
| 의존성 | Spring Boot 기본 내장 | `spring-boot-starter-quartz` 추가 |
| 구성 | `@EnableScheduling` + `@Scheduled` | JobDetail + Trigger + Scheduler |
| 저장소 | 메모리 (인스턴스별 독립) | **DB 저장** (공유 JobStore) |
| 클러스터 | 미지원 (각 인스턴스가 중복 실행) | **지원** (DB 락으로 한 인스턴스만 실행) |
| Misfire 대응 | 없음 | **Misfire Instruction** 옵션 |
| 동적 스케줄링 | 제한적 | 런타임 변경 가능 |
| 트리거 종류 | Cron·fixedDelay·fixedRate | SimpleTrigger·CronTrigger·기타 |

### 선택 기준

- **단일 서버·단순 주기 작업** → `@Scheduled`
- **Multi-instance 환경 (K8s 레플리카)** → **Quartz 필수** (안 그러면 모든 레플리카가 중복 실행)
- **런타임 스케줄 변경·Admin UI 필요** → Quartz
- **ShedLock**: `@Scheduled`에 DB 락을 씌워 간단히 분산 제어하는 경량 대안

## 출처
- [dkswnkk — Spring Batch란?](https://dkswnkk.tistory.com/707)
- [sabarada — Spring Scheduler와 Spring Quartz](https://sabarada.tistory.com/113)
- [clearing01 — Spring Scheduler와 Quartz 비교](https://clearing01.tistory.com/122)
- [Kakao Pay — Spring Batch Read 성능 최적화](https://tech.kakaopay.com/post/ifkakao2022-batch-performance-read/)
- [Kakao Pay — Spring Batch 증분 성능 개선](https://tech.kakaopay.com/post/spring-batch-performance)
- [yoonseon — JdbcTemplate batchUpdate로 벌크 insert](https://yoonseon.tistory.com/146)
- [SK DEVOCEAN — Spring Batch 시리즈](https://devocean.sk.com/blog/techBoardDetail.do?ID=166164)

## 관련 문서
- [[Pagination-Optimization|페이징 성능 최적화 (OFFSET 문제)]]
- [[CDC-Debezium|CDC · Debezium (증분 실시간화)]]
- [[Connection-Pool|Connection Pool]]
- [[JPA-Persistence-Context|JPA 영속성 컨텍스트]]
- [[Index|DB Index]]
