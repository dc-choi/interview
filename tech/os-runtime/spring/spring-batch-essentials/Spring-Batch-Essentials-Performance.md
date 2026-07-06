---
tags: [spring-batch, batch, itemreader, itemwriter, chunk, tasklet, performance]
status: done
category: "OS & Runtime"
aliases: ["Spring Batch 성능 최적화", "ZeroOffsetItemReader"]
---

# Spring Batch 성능 최적화

배치 성능의 **80% 이상이 Reader에서 결정**된다. Writer는 JDBC 배치로 해결 가능.

## Reader 함정 — OFFSET/LIMIT

`JpaPagingItemReader`, `JdbcPagingItemReader`는 내부에서 `LIMIT ? OFFSET ?`을 사용. OFFSET이 커질수록 **읽고 버리는 row가 선형 증가** → 뒷 페이지가 기하급수로 느려짐. 1억 행 기준 뒷 페이지는 수십 초까지 걸리는 경우도.

## 해법 — ZeroOffset, Cursor

- **ZeroOffsetItemReader** (커스텀): OFFSET 대신 **마지막 PK 이후** (`WHERE id > :lastId`)로 조회. 페이지 깊이 무관한 상수 시간
- **JdbcCursorItemReader / HibernateCursorItemReader**: DB cursor로 한 번 쿼리 후 스트리밍. 커넥션을 오래 점유하는 단점은 있지만 OFFSET 문제 없음
- **Exposed Cursor** (Kotlin), **QuerydslPagingItemReader**: 타입 안전 + ZeroOffset 조합

원리는 [[Pagination-Optimization|페이징 최적화]]와 동일 — **OFFSET 대신 커서로**.

## Writer 최적화 — JDBC Execute Batch

JPA `Dirty Checking`은 항목마다 개별 UPDATE → 10,000건이면 10,000 UPDATE. JDBC 배치로 묶으면 **수십~수백 배 빨라진다**.

```java
jdbcTemplate.batchUpdate(sql, items, BATCH_SIZE,
    (ps, item) -> { ps.setXxx(...); });
```

MySQL에서는 **`rewriteBatchedStatements=true`** 옵션이 필수. 없으면 여러 INSERT가 실제로 하나의 `VALUES (…), (…), (…)` 로 합쳐지지 않는다.

보고 수치 예: 1,666건 처리에서 SQL 쿼리 수 **27,714 → 12,666 (54% 감소)**, 나머지 지연은 스크래핑이라 시간 단축은 제한적. **I/O 중심 워크로드**에서는 시간까지 큰 개선.

## JpaItemWriter — merge vs persist

`JpaItemWriter`는 기본적으로 **`merge`를 사용**한다.

- `merge`: 신규/기존 데이터 모두 처리 가능하지만, **신규 저장만 하는 상황에서도 불필요한 SELECT나 UPDATE**가 발생할 수 있음
- `persist`: 신규 데이터 대량 INSERT 전용이면 더 효율적 (`usePersist` 옵션)
- 선택 기준: 저장 대상이 **전부 신규면 persist**, 신규/기존이 섞여 있으면 merge가 안전

## JPA 배치의 N+1과 default_batch_fetch_size

배치는 대량 조회가 많아 N+1의 피해가 웹보다 크다. 컬렉션이 여러 개면 Fetch Join에 제약이 생기므로, Hibernate **`default_batch_fetch_size`** 로 자식 조회를 부모 ID `IN` 절로 묶는 것이 광범위한 안전망이 된다. 발생 원리와 해결 4종(Fetch Join, `@EntityGraph`, Batch Size, Projection DTO)은 [[JPA-Persistence-Context|영속성 컨텍스트, N+1]] 참조.

## Chunk Size 튜닝

- 너무 작음: 트랜잭션, 커밋 오버헤드가 전체 비중의 대부분
- 너무 큼: 메모리 사용, 롤백 비용 증가, Lock 유지 시간 길어짐
- **PageSize = ChunkSize** 권장 — 페이지 경계와 커밋 경계가 일치해 쿼리 횟수 최소화
- 경험치: 1,000~10,000 구간에서 시작 후 측정

## 네트워크 I/O 병목 — 병렬 처리

외부 API를 **1건씩 동기 호출**하면 응답 150ms × 1,000건 = 150초 대기. 해결:

- Processor를 제거하고 Writer에서 **RxJava, Coroutine, `CompletableFuture`로 병렬 호출**
- 10 thread 병렬이면 대략 10배 단축 사례
- 외부 API rate limit 주의

## 상태 그룹화 업데이트

개별 아이템별 UPDATE 대신 **상태별로 묶어 `IN` 절**로 한 번에:

```sql
UPDATE orders SET status = 'PAID' WHERE id IN (?, ?, ?, ...);
```

1,000건 UPDATE가 3~5개 그룹으로 줄어듦. QueryDSL, Exposed로 안전하게 구현.

## Partitioning, Multi-Thread Step

단일 Step을 **여러 스레드/프로세스로 분할 실행**하는 방법.

- **Multi-threaded Step**: 한 Step 내부에서 Reader/Processor/Writer를 여러 스레드로. Reader가 thread-safe해야 (JpaPagingItemReader는 X)
- **Partitioning**: Master Step이 범위를 분할해 Worker Step들에 위임. 각 Worker가 독립된 Reader/Writer
- **Remote Partitioning**: Worker를 별도 JVM, 인스턴스로 분산

대용량에서는 **Partitioning이 확장성 우위**. 단일 프로세스 내 멀티스레딩보다 DB, 파일 I/O 분산 효과.

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

- **Job, Step, Chunk, ItemReader/Processor/Writer** 구조와 역할
- **Tasklet vs Chunk** 선택 기준
- 메타데이터 테이블이 주는 **재시작, 중복 실행 방지** 효과
- 대용량에서 `JpaPagingItemReader`가 느려지는 **OFFSET 원인**과 대안
- `JdbcBatchItemWriter` + **`rewriteBatchedStatements`** 조합의 중요성
- `JpaItemWriter` 기본 **merge의 비용**과 persist 선택 기준
- **Chunk Size = Page Size** 권장 이유
- Partitioning과 Multi-threaded Step의 차이
- 증분 배치가 전체 재처리보다 나은 상황

## 출처
- [Kakao Pay — Spring Batch Read 성능 최적화](https://tech.kakaopay.com/post/ifkakao2022-batch-performance-read/)
- [Kakao Pay — Spring Batch 증분 성능 개선](https://tech.kakaopay.com/post/spring-batch-performance)
- [yoonseon — JdbcTemplate batchUpdate로 벌크 insert](https://yoonseon.tistory.com/146)
- [Spring Batch 운영과 설계 — YouTube 강의](https://www.youtube.com/watch?v=_nkJkWVH-mo&list=PLgXGHBqgT2TtGi82mCZWuhMu-nQy301ew&index=41)
