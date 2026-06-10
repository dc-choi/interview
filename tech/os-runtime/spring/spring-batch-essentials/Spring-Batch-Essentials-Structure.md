---
tags: [spring-batch, batch, itemreader, itemwriter, chunk, tasklet, performance]
status: done
category: "OS & Runtime"
aliases: ["Spring Batch 구조", "Tasklet vs Chunk"]
---

# Spring Batch 구조와 처리 모델

## 왜 Spring Batch가 필요한가

- **메타데이터 관리**: 실행 이력, 상태, 파라미터를 DB에 저장 → 장애 후 **중단 지점부터 재시작** 가능
- **트랜잭션 경계**: 청크 단위 원자성
- **재시도, 스킵, 예외 처리**의 선언적 관리
- **읽기/처리/쓰기 템플릿** — 반복 코드 제거
- **모니터링**: Step별 Read, Write, Skip, Commit 수 자동 집계

단순 스케줄링만 필요하면 [[Spring-Batch-Essentials-Scheduler#Spring Scheduler vs Quartz|Scheduler/Quartz]]로 충분. Spring Batch는 **청크 트랜잭션과 재시작이 필요할 때** 가치가 커진다.

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
- **StepExecution**: Step 실행마다 생성, Read, Write, Skip 카운터 포함

## Tasklet vs Chunk

| 축 | Tasklet | Chunk |
|---|---|---|
| 용도 | 단순 단일 작업 (파일 이동, 테이블 truncate, 플래그 갱신) | 대용량 데이터 Read→Process→Write 반복 |
| 트랜잭션 | Step 전체가 하나 | **Chunk 단위**로 커밋 |
| 종료 | `RepeatStatus.FINISHED` 반환 | Reader가 null 반환할 때까지 반복 |
| 재시작 | Step 단위 | **Chunk 단위** (중단 지점부터) |

**Chunk 모델이 배치의 정석.** Tasklet은 보조 Step(전처리, 정리)에 쓴다.

## 메타데이터 테이블 6종

Spring Batch가 자동 생성하는 배치 실행 이력 저장소.

| 테이블 | 역할 |
|---|---|
| `BATCH_JOB_INSTANCE` | JobInstance (같은 파라미터의 논리적 동일성) |
| `BATCH_JOB_EXECUTION` | 실제 실행 시도 (상태, 시작/종료 시각) |
| `BATCH_JOB_EXECUTION_PARAMS` | 실행 파라미터 (`@JobScope`) |
| `BATCH_JOB_EXECUTION_CONTEXT` | Job 레벨 컨텍스트 (Step 간 공유) |
| `BATCH_STEP_EXECUTION` | Step별 실행 상태, Read/Write/Skip 카운터 |
| `BATCH_STEP_EXECUTION_CONTEXT` | Step 레벨 컨텍스트 (재시작 시 이어서) |

이 테이블 덕에 **같은 파라미터로 완료된 Job은 재실행 거부**되고, 실패 시에는 **마지막 청크부터 재시작** 가능.

## Chunk 모델 상세

```
ItemReader  →  ItemProcessor  →  ItemWriter
   (1건)         (1건 가공)        (chunk 단위 쓰기)
```

- **ItemReader**: 소스에서 1건씩 읽음 (DB, 파일, 큐)
- **ItemProcessor**: 1건을 변환, 필터링. `null` 반환 시 해당 아이템 skip
- **ItemWriter**: chunk 크기만큼 모인 아이템을 **일괄 쓰기**

Chunk 크기가 곧 **트랜잭션 경계**이자 commit 간격. 10,000건이면 chunk 10,000 → commit 1회.

### 주요 Reader

| Reader | 용도 | 주의 |
|---|---|---|
| `FlatFileItemReader` | CSV, 고정 폭 파일 | 대용량에도 메모리 안전 |
| `JdbcCursorItemReader` | DB Cursor 기반 | 장시간 커넥션 점유, Replica 권장 |
| `JdbcPagingItemReader` | OFFSET/LIMIT 페이징 | **대용량에서 OFFSET 비용** 문제 |
| `JpaPagingItemReader` | JPA 기반 페이징 | JPA 영속성 컨텍스트 오버헤드 |
| `JpaCursorItemReader` | JPA Cursor (Hibernate 의존) | 구현체 의존성, 제한적 |
| `Custom ZeroOffset Reader` | PK 기반 커서 페이징 | **대용량의 정석** ([[Spring-Batch-Essentials-Performance|성능 최적화]] 참조) |

### 주요 Writer

- **`JdbcBatchItemWriter`**: JDBC `addBatch`, `executeBatch`로 일괄 쓰기. 가장 빠름
- **`JpaItemWriter`**: `persist/merge` 반복. JPA 장점은 살지만 느림
- **`CompositeItemWriter`**: 여러 Writer 동시 실행 (멀티 타깃)
- **Custom Writer**: 외부 API 호출, Kafka 발행 등

## 출처
- [dkswnkk — Spring Batch란?](https://dkswnkk.tistory.com/707)
- [SK DEVOCEAN — Spring Batch 시리즈](https://devocean.sk.com/blog/techBoardDetail.do?ID=166164)
