---
tags: [spring-batch, batch, itemreader, itemwriter, chunk, tasklet, performance]
status: done
category: "OS & Runtime"
aliases: ["Spring Batch 성능 최적화", "ZeroOffsetItemReader"]
verified_at: 2026-07-21
---

# Spring Batch 성능 최적화

배치 성능은 읽기 쿼리, 변환, 외부 I/O, 쓰기, 트랜잭션 경계 가운데 실제 병목이 결정한다. Reader와 Writer를 따로 계측하고 데이터베이스 실행 계획, 네트워크 왕복, 잠금 시간을 함께 확인한다.

## Reader 함정 — OFFSET/LIMIT

`JpaPagingItemReader`의 실제 페이징 SQL은 JPA 구현체와 데이터베이스에 따라 달라지고, 깊은 OFFSET을 쓰는 계획이라면 뒤 페이지 비용이 커질 수 있다. `JdbcPagingItemReader`는 데이터베이스별 `PagingQueryProvider`와 고유한 `sortKey`로 페이지 쿼리를 구성하므로 생성 SQL과 실행 계획을 직접 확인해야 한다. 두 구현을 모두 단순 OFFSET 방식으로 보면 안 된다.

## 해법 — ZeroOffset, Cursor

- **Keyset Reader** (커스텀): OFFSET 대신 **마지막 정렬 키 이후** (`WHERE id > :lastId`)를 조회한다. 적절한 인덱스와 단조롭고 고유한 정렬 키가 있으면 깊은 OFFSET 비용을 피할 수 있지만 쿼리가 항상 상수 시간인 것은 아니다.
- **JdbcCursorItemReader / HibernateCursorItemReader**: DB cursor로 한 번 쿼리 후 스트리밍. 커넥션을 오래 점유하는 단점은 있지만 OFFSET 문제 없음
- **Exposed Cursor** (Kotlin), **QuerydslPagingItemReader**: 타입 안전 + ZeroOffset 조합

원리는 [[Pagination-Optimization|페이징 최적화]]와 동일 — **OFFSET 대신 커서로**.

## Writer 최적화 — JDBC Execute Batch

JPA 변경 감지는 변경된 엔티티마다 SQL을 만들 수 있다. Hibernate와 JDBC 드라이버의 배치 설정 또는 `JdbcBatchItemWriter` 같은 일괄 쓰기를 사용하면 왕복 횟수를 줄일 수 있지만 개선 폭은 SQL 형태, 드라이버, 키 생성 방식, 잠금과 데이터베이스에서 측정한다.

```java
jdbcTemplate.batchUpdate(sql, items, BATCH_SIZE,
    (ps, item) -> { ps.setXxx(...); });
```

MySQL Connector/J의 `rewriteBatchedStatements=true`는 호환되는 배치 INSERT/UPDATE를 재작성해 성능을 높일 수 있다. 모든 문장을 재작성하는 것은 아니며 생성 키, 패킷 크기, 드라이버 버전별 동작을 확인해야 한다. 이 옵션이 없다고 JDBC `executeBatch` 자체가 동작하지 않는 것은 아니다.

보고 수치 예: 1,666건 처리에서 SQL 쿼리 수 **27,714 → 12,666 (54% 감소)**, 나머지 지연은 스크래핑이라 시간 단축은 제한적. **I/O 중심 워크로드**에서는 시간까지 큰 개선.

## JpaItemWriter — merge vs persist

`JpaItemWriter`는 기본적으로 **`merge`를 사용**한다.

- `merge`: 신규/기존 엔티티를 모두 처리할 수 있지만 엔티티 상태와 식별자 전략에 따라 추가 조회나 복사가 발생할 수 있음
- `persist`: 신규 데이터 대량 INSERT 전용이면 더 효율적 (`usePersist` 옵션)
- 선택 기준: 저장 대상이 **전부 신규면 persist**, 신규/기존이 섞여 있으면 merge가 안전

## JPA 배치의 N+1과 default_batch_fetch_size

배치는 대량 조회가 많아 N+1의 피해가 웹보다 크다. 컬렉션이 여러 개면 Fetch Join에 제약이 생기므로, Hibernate **`default_batch_fetch_size`** 로 자식 조회를 부모 ID `IN` 절로 묶는 것이 광범위한 안전망이 된다. 발생 원리와 해결 4종(Fetch Join, `@EntityGraph`, Batch Size, Projection DTO)은 [[JPA-Persistence-Context|영속성 컨텍스트, N+1]] 참조.

## Chunk Size 튜닝

- 너무 작음: 트랜잭션, 커밋 오버헤드가 전체 비중의 대부분
- 너무 큼: 메모리 사용, 롤백 비용 증가, Lock 유지 시간 길어짐
- `JpaPagingItemReader` 공식 API는 비교적 큰 page size와 같은 크기의 commit interval이 성능에 도움이 될 수 있다고 설명한다. 메모리, 재시작 비용, DB 제한에 따라 두 값을 독립적으로 측정한다.

## 네트워크 I/O 병목 — 병렬 처리

외부 API를 **1건씩 동기 호출**하면 응답 150ms × 1,000건 = 150초 대기. 해결:

- 비동기 Processor/Writer, 파티셔닝 등 Spring Batch가 제공하는 확장 방식을 검토한다. 임의로 Writer 안에서 future를 시작하면 chunk 트랜잭션 완료 전에 작업이 끝나지 않거나 예외가 유실될 수 있다.
- 최대 동시성은 외부 API 할당량, 지연 분포, 커넥션 풀과 재시도 폭증을 고려해 부하 테스트로 정한다.

## 상태 그룹화 업데이트

개별 아이템별 UPDATE 대신 **상태별로 묶어 `IN` 절**로 한 번에:

```sql
UPDATE orders SET status = 'PAID' WHERE id IN (?, ?, ?, ...);
```

1,000건 UPDATE가 3~5개 그룹으로 줄어듦. QueryDSL, Exposed로 안전하게 구현.

## Partitioning, Multi-Thread Step

단일 Step을 **여러 스레드/프로세스로 분할 실행**하는 방법.

- **Multi-threaded Step**: 한 Step의 chunk를 여러 스레드에서 처리한다. 모든 구성 요소의 thread safety를 확인해야 한다. 현재 `JpaPagingItemReader`는 `open` 호출 사이에서 thread-safe로 문서화돼 있지만 다중 스레드 client에서는 `saveState=false`가 필요해 재시작 기능을 잃는다.
- **Partitioning**: Master Step이 범위를 분할해 Worker Step들에 위임. 각 Worker가 독립된 Reader/Writer
- **Remote Partitioning**: Worker를 별도 JVM, 인스턴스로 분산

Partitioning은 범위를 독립적으로 나눌 수 있을 때 프로세스와 인스턴스 단위 확장에 유리하다. 단일 데이터베이스나 파일이 병목이면 worker 수만 늘려도 처리량이 늘지 않으므로 파티션 키, 재시작, 중복 처리와 하위 시스템 용량을 함께 설계한다.

## 증분 배치 전략

전체 데이터 재처리 대신 **변경분만** 처리.

- `last_modified` 컬럼 활용 → `WHERE updated_at > :lastRun`
- **체크포인트**를 `BATCH_JOB_EXECUTION_CONTEXT` 또는 별도 테이블에 저장
- CDC와 결합하면 실시간에 가까운 증분 처리 가능 ([[CDC-Debezium]])
- 초기화 배치는 `ZeroOffset`, 일상 증분은 `last_modified` 인덱스로 단순 쿼리

## 흔한 실수

- **생성 SQL을 보지 않고 대규모 paging 적용** — JPA 구현체와 DB의 OFFSET 계획, 정렬 키 인덱스를 실행 계획으로 확인
- **Writer에 Dirty Checking 의존** — 개별 UPDATE 폭증, JDBC 배치로 이관 필요
- **드라이버별 배치 옵션 미검증** — 재작성 가능 SQL, 생성 키, 패킷 크기와 실제 왕복 횟수 측정
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
