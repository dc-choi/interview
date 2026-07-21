---
tags: [spring-batch, batch, itemreader, itemwriter, chunk, tasklet, performance]
status: done
category: "OS & Runtime"
aliases: ["Spring Batch 구조", "Tasklet vs Chunk"]
verified_at: 2026-07-21
---

# Spring Batch 구조와 처리 모델

## 배치 애플리케이션은 웹과 목적이 다르다

배치 = **정해진 데이터를 사용자와 상호작용 없이 끝까지 처리**하는 애플리케이션.

| 축 | 웹 애플리케이션 | 배치 애플리케이션 |
|---|---|---|
| 상호작용 | 요청 → 응답 반복 | 실행 후 상호작용 없음 |
| 핵심 지표 | **응답 속도** | **완료 가능성, 정확성, 대량 처리 성능** |
| 예시 | 주문 상세 조회 API | 한 달치 정산 집계 |

시간이 좀 걸려도 정확히 끝나는 것이 배치의 가치. 이 목적 차이가 청크 트랜잭션, 재시작, [[Spring-Batch-Essentials-JobParameter|멱등성]] 같은 설계 우선순위를 만든다.

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
- **JobInstance**: `job_name + identifying JobParameters` 조합으로 논리적 실행을 식별
- **JobExecution**: JobInstance의 실제 실행 시도 (재시도 시 같은 Instance에 새 Execution)
- **Step**: 실제 로직. Tasklet 또는 Chunk 모델 선택
- **StepExecution**: Step 실행마다 생성, Read, Write, Skip 카운터 포함

## Tasklet vs Chunk

| 축 | Tasklet | Chunk |
|---|---|---|
| 용도 | 단순 단일 작업 (파일 이동, 테이블 truncate, 플래그 갱신) | 대용량 데이터 Read→Process→Write 반복 |
| 트랜잭션 | 기본적으로 `Tasklet.execute` 호출마다 트랜잭션. 한 번에 `FINISHED`를 반환하는 Tasklet만 결과적으로 Step 전체가 한 호출 | **Chunk 단위**로 커밋 |
| 종료 | `RepeatStatus.FINISHED` 반환 | Reader가 null 반환할 때까지 반복 |
| 재시작 | Step 단위 | **Chunk 단위** (중단 지점부터) |

**Chunk 모델이 배치의 정석.** Tasklet은 보조 Step(전처리, 정리)에 쓴다.

두 방식은 대립 개념이 아니다 — **Chunk 기반 Step도 내부적으로는 `ChunkOrientedTasklet`이라는 Tasklet 구현체로 동작**한다. Reader/Processor/Writer는 반복 처리를 표준화한 Tasklet의 특수화 형태.

## 메타데이터 테이블 6종

Spring Batch가 사용하는 배치 실행 이력 저장소다. 개발 환경에서는 설정에 따라 초기화할 수 있지만, 운영에서는 버전별 공식 DDL을 마이그레이션 도구로 명시 적용하는 경우가 많다.

| 테이블 | 역할 |
|---|---|
| `BATCH_JOB_INSTANCE` | JobInstance (같은 파라미터의 논리적 동일성) |
| `BATCH_JOB_EXECUTION` | 실제 실행 시도 (상태, 시작/종료 시각) |
| `BATCH_JOB_EXECUTION_PARAMS` | 실행 파라미터 (`@JobScope`) |
| `BATCH_JOB_EXECUTION_CONTEXT` | Job 레벨 컨텍스트 (Step 간 공유) |
| `BATCH_STEP_EXECUTION` | Step별 실행 상태, Read/Write/Skip 카운터 |
| `BATCH_STEP_EXECUTION_CONTEXT` | Step 레벨 컨텍스트 (재시작 시 이어서) |

기본 동작에서는 같은 identifying 파라미터로 이미 완료된 JobInstance를 다시 실행할 수 없다. 실패 후 재시작은 Reader, Writer의 `saveState`, 트랜잭션 자원과 `ExecutionContext`가 올바르게 구성됐을 때 마지막으로 커밋된 체크포인트 이후부터 진행하며, 커밋되지 않은 항목은 재처리될 수 있다.

## Chunk 모델 상세

```
ItemReader  →  ItemProcessor  →  ItemWriter
   (1건)         (1건 가공)        (chunk 단위 쓰기)
```

- **ItemReader**: 소스에서 1건씩 읽음 (DB, 파일, 큐)
- **ItemProcessor**: 1건을 변환하거나 필터링. `null` 반환은 해당 항목을 **filter**하며 `filterCount`에 반영된다. 예외 기반 fault tolerance의 skip과는 다른 개념이다.
- **ItemWriter**: chunk 크기만큼 모인 아이템을 **일괄 쓰기**

Chunk 크기가 곧 **트랜잭션 경계**이자 commit 간격. 10,000건이면 chunk 10,000 → commit 1회.

### 주요 Reader

| Reader | 용도 | 주의 |
|---|---|---|
| `FlatFileItemReader` | CSV, 고정 폭 파일 | 대용량에도 메모리 안전 |
| `JdbcCursorItemReader` | DB Cursor 기반 | 장시간 커넥션 점유, Replica 권장 |
| `JdbcPagingItemReader` | DB별 `PagingQueryProvider` 기반 페이지 조회 | 고유한 sort key와 생성 SQL, 실행 계획 검증 |
| `JpaPagingItemReader` | JPA 기반 페이징 | 페이지마다 persistence context를 clear해 엔티티가 detach됨 |
| `JpaCursorItemReader` | JPA query stream 기반 cursor | JPA provider와 JDBC driver의 streaming 동작 검증 |
| Custom Keyset Reader | 고유 정렬 키 이후를 조회 | 깊은 OFFSET 회피 가능, 인덱스와 변경 중 일관성 설계 필요 ([[Spring-Batch-Essentials-Performance\|성능 최적화]] 참조) |

### 주요 Writer

- **`JdbcBatchItemWriter`**: JDBC batch API로 일괄 쓰기. 드라이버와 SQL에 따라 왕복을 줄일 수 있음
- **`JpaItemWriter`**: 설정에 따라 `merge` 또는 `persist`를 사용. 엔티티 수명주기와 batch 설정을 함께 검증
- **`CompositeItemWriter`**: 등록 순서대로 여러 delegate Writer에 같은 chunk를 전달
- **Custom Writer**: 외부 API 호출, 메시지 발행 등. DB 트랜잭션과 원자적이지 않을 수 있어 멱등성, outbox와 재시도를 설계

## 출처
- [Spring Batch TaskletStep](https://docs.spring.io/spring-batch/reference/step/tasklet.html)
- [Spring Batch record filtering](https://docs.spring.io/spring-batch/reference/processor.html#filtering-records)
- [Spring Batch database readers and writers](https://docs.spring.io/spring-batch/reference/readers-and-writers/database.html)
- [dkswnkk — Spring Batch란?](https://dkswnkk.tistory.com/707)
- [SK DEVOCEAN — Spring Batch 시리즈](https://devocean.sk.com/blog/techBoardDetail.do?ID=166164)
- [Spring Batch 운영과 설계 — YouTube 강의](https://www.youtube.com/watch?v=_nkJkWVH-mo&list=PLgXGHBqgT2TtGi82mCZWuhMu-nQy301ew&index=41)
