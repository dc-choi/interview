---
tags: [fit, interview, common, my-answers, tech]
status: done
category: "Interview - 내 답변 마스터"
aliases: ["내 기술 답변 심화", "My Tech Cards Extended"]
---

# 내 기술 답변 심화 — 비교 표, 꼬리 질문 풀, 아키텍처 디테일

> [[My-Tech-Cards|메인 카드 8개]]의 본문 답변 후 면접관이 더 깊게 들어올 때 참조. **본문 답변엔 핵심만**, 여기엔 **비교 표, 아키텍처, 정량 비교, 심화 꼬리**.

## 카드 1 DB Lock 심화

### Optimistic vs Pessimistic 비교 표

| 기준 | Optimistic | Pessimistic |
|---|---|---|
| 충돌 빈도 | 낮을 때 유리 (읽기 많은 서비스) | 높을 때 유리 (쓰기 경합 많은 서비스) |
| 충돌 시 비용 | 전체 트랜잭션 재실행 | Lock 대기 (NO WAIT면 즉시 실패 후 재시도) |
| Lock 보유 시간 | 없음 (커밋 시점에 검증) | 트랜잭션 동안 보유 |
| 데드락 위험 | 없음 | 있음 (순서 통일로 예방) |
| 구현 | version 컬럼 추가 | SELECT FOR UPDATE |

### InnoDB Lock 5종

| Lock 종류 | 설명 | 예시 |
|---|---|---|
| **Shared Lock (S)** | 읽기 잠금. 다른 S 허용, X 차단 | `SELECT ... FOR SHARE` |
| **Exclusive Lock (X)** | 쓰기 잠금. S/X 모두 차단 | `SELECT ... FOR UPDATE`, `UPDATE`, `DELETE` |
| **Record Lock** | 인덱스 레코드 하나에 거는 Lock | PK/유니크 인덱스로 정확히 1행 |
| **Gap Lock** | 인덱스 레코드 사이 간격 잠금 (삽입 방지) | RR에서 범위 조건 |
| **Next-Key Lock** | Record + Gap. InnoDB RR 기본 | Phantom Read 방지 |

### 심화 꼬리

- **"NO WAIT vs SKIP LOCKED?"** → SKIP LOCKED는 잠긴 행 건너뛰고 다음 행 읽음 (큐 패턴 적합). 재고처럼 특정 행 반드시 처리해야 하면 NO WAIT가 맞음
- **"FOR UPDATE vs FOR SHARE?"** → FOR UPDATE는 X Lock (배타적, 읽기/쓰기 차단). FOR SHARE는 S Lock (공유, 읽기 허용, 쓰기 차단). 읽은 후 바로 쓰면 X Lock 필요
- **"멀티 인스턴스에서도 DB Lock 충분?"** → 같은 DB 바라보는 한 충분. DB 분리(샤딩)되면 분산 락 필요
- **"Gap Lock 성능 영향?"** → 범위 잠금이라 INSERT 차단 가능. 동시성 필요하면 RC로 변경 (Gap Lock 비활성화, 단 Phantom Read 허용)
- **"테이블 락은 언제?"** → DDL(ALTER TABLE), LOCK TABLES 명시, 인덱스 없는 UPDATE/DELETE (풀스캔 → 사실상 테이블 락)
- **"데드락 감지 분석?"** → `SHOW ENGINE INNODB STATUS` → LATEST DETECTED DEADLOCK 섹션. Grafana `mysql_global_status_innodb_deadlocks` 메트릭 추적

## 카드 2 EventBridge+SQS 심화

### 멱등성 상태 머신 흐름 (워커 처리)

1. SQS 메시지 수신 (발주 ID 포함)
2. 발주 레코드 `SELECT FOR UPDATE`로 잠그고 status 확인
3. `COMPLETED` → 이미 처리, 메시지 삭제 후 skip
4. `PENDING`/`FAILED` → `PROCESSING`으로 + `processing_started_at` 현재 시각 → 로직 실행
5. `PROCESSING` 발견 시 → **`processing_started_at` 확인**: visibility timeout의 2배 초과면 이전 워커 crash로 판단 → `FAILED` 후 재처리. 미초과면 다른 워커 정상 처리 중이므로 skip
6. 성공 → `COMPLETED` + 메시지 삭제
7. 실패 → `FAILED` + 메시지 안 삭제 → visibility timeout 만료 후 SQS 재전달
8. SQS `maxReceiveCount`(예: 3회) 초과 → DLQ + 알림 + 수동 확인

**visibility timeout 설정**: 처리 평균 시간의 **6배**. 짧으면 정상 처리 중 중복, 길면 실패 후 재처리 대기 길어짐.

**알림 채널 중복 방지**: 알림 로그 테이블에 `(발주_id, channel)` UNIQUE 제약 → 카톡/이메일/발주서 이중 발송 원천 차단.

### Outbox 패턴 디테일

```sql
outbox: (id, aggregate_type, aggregate_id, event_type, payload JSONB, created_at, processed_at)
-- processed_at NULL이면 미발행
```

- INSERT + outbox INSERT를 **같은 DB 트랜잭션**으로 묶음 → 원자적 보장
- Relay 프로세스가 outbox 폴링하여 발행 후 `processed_at` 마킹
- Relay crash 시 outbox 레코드 잔존 → 재시작 후 재발행 → at-least-once 발행 보장

### CDC vs Outbox 비교

| 축 | Outbox (폴링) | CDC (Debezium) |
|---|---|---|
| 인프라 | 단순 (앱+DB) | Debezium+Kafka Connect 등 별도 |
| 지연 | 폴링 간격 (5초) | 거의 실시간 |
| 적합 규모 | 월 수십만~수백만 이벤트 | 초당 수천 건+ 대규모 |
| 운영 부담 | 낮음 | 높음 |

### Lambda vs ECS 워커 결정 4축

| 축 | ECS 워커 유리 | Lambda 유리 |
|---|---|---|
| 도메인 로직 재사용 | NestJS 모델, 로직 그대로 | 별도 패키지로 분리 |
| DB 커넥션 풀 | 안정적 유지 | cold start로 어려움 (RDS Proxy 필요) |
| 인프라 | 이미 ECS 있으면 추가 비용 0 | 별도 파이프라인 필요 |
| 스케일 패턴 | 상시 + 점진적 스케일 | 불규칙, 유휴 시간 긴 워크로드 |

### 심화 꼬리

- **"SQS FIFO?"** → MessageGroupId 기반 순서 보장, 초당 300 TPS 제한
- **"Pub/Sub vs SQS?"** → Pub/Sub은 topic 기반 팬아웃(1:N), SQS는 큐 기반 point-to-point(1:1)
- **"이벤트 유실 — 생산자 측?"** → Dual Write 문제. Outbox 패턴으로 해결 (위)
- **"이벤트 유실 — 소비자 측?"** → SQS at-least-once + 멱등성 키 + DLQ로 최종 실패 보관

## 카드 3 슬로우 쿼리 심화

### EXPLAIN 읽는 법 (MySQL)

| 컬럼 | 의미 |
|---|---|
| **type** | ALL(풀스캔, 나쁨), range, ref, eq_ref, const, system(좋음) |
| **rows** | 추정 검사 행 수. 실제와 큰 차이면 통계 갱신 |
| **filtered** | 조건으로 걸러질 비율 (낮으면 인덱스 효율↓) |
| **Extra** | Using filesort(정렬 비용), Using temporary(임시 테이블), Using index(커버링) |

### PostgreSQL 차이

- `EXPLAIN (ANALYZE, BUFFERS)` — 실제 실행 + 디스크/캐시 hit 비율
- `pg_stat_statements` — 슬로우 쿼리 누적 통계
- 인덱스 종류: B-Tree(기본), Hash(정확 매칭만), **BRIN(시계열, 범위 데이터 압축 인덱스)**, **GIN(JSONB, 배열, 풀텍스트)**, GiST(공간)
- MVCC 구현 차이: PG는 dead tuple + VACUUM, MySQL은 undo log
- JSONB는 PG가 강함, CTE/Window 함수도 PG 우위

### 심화 꼬리

- **"인덱스 추가 후 쓰기 페널티 정량?"** → 인덱스 수, 페이지 분할 빈도 모니터링. 핫스팟이면 파티셔닝(시간, 해시, 리스트) 검토
- **"파티셔닝 vs 샤딩?"** → 파티셔닝은 한 DB 내 테이블 분할 (운영 단순), 샤딩은 DB 인스턴스 분리 (라우팅 복잡)
- **"NoSQL 검토 시점?"** → 위 모든 방법 (인덱스, 캐싱, CQRS, 파티셔닝, 샤딩)으로 안 될 때 마지막 카드

## 카드 5 관측성 심화

### CloudWatch vs ELK vs Datadog vs GPL 가중치 비교

| 축 | GPL | ELK | Datadog | CloudWatch |
|---|---|---|---|---|
| TCO (0.25) | 5 | 3 | 2 | 4 |
| 메트릭 생태계 (0.15) | 5 | 3 | 5 | 3 |
| 벤더 종속 회피 (0.10) | 5 | 5 | 1 | 1 |
| **총점** | **4.65** | 3.85 | 3.35 | 3.10 |

### 아키텍처 5층

| 계층 | 구성 | 역할 |
|---|---|---|
| FE | Sentry SDK → Sentry 서버 | JS 에러, 퍼포먼스, 세션 리플레이 |
| BE App | TraceIdMiddleware, HttpLoggingInterceptor, Winston JSON, MetricsInterceptor + prom-client, `/metrics` 엔드포인트 | 요청 단위 추적, 구조화 로깅, 메트릭 노출 |
| Log Routing | FireLens(FluentBit) → Loki | ECS stdout → 중앙집중 로깅 |
| Logs Plane | Promtail → Loki → S3 | JSON 파싱, 라벨링, Chunk 저장, Compactor S3 압축 |
| Metrics Plane | Prometheus → Thanos Sidecar → S3 | 단기 15일 + 장기 S3 (멀티 인스턴스/리전 통합 조회) |

### SLO 알림 5개 (`for: 5m` 지속 조건)

- Error rate **1%** for 5m
- Slow SQL **500ms+** 3회 지속
- Event Loop Lag **100ms** 3분
- RDS CPU **75%** 5분
- Replica Lag **5초** 3분

### 카디널리티 관리 룰

- **userId/traceId 라벨 절대 금지** — 라벨 조합 폭증 → Prometheus OOM
- route/path 라벨 정규화 (`/users/:id` → `/users/{id}`)
- traceId는 **로그 본문(flat JSON)에 기록** + LogQL로 검색

## 카드 6 아키텍처 전환 심화

### 이미지 경량화 옵션

| 방법 | 효과 | 트레이드오프 |
|---|---|---|
| 멀티스테이지 빌드 | 빌드 산출물만 복사 | 가장 안전, 기본 적용 |
| alpine 베이스 | 가장 작음 | musl libc vs glibc — native 모듈(bcrypt, sharp) 호환성 |
| distroless | 셸 없음 → 보안 강화 | 디버깅 어려움. 프로덕션 적합 |
| esbuild 번들 | node_modules 제거 | TS 빌드 파이프라인 수정 필요 |

### K8s 전환 검토 시점

- 멀티 클러스터 운영
- 복잡한 트래픽 라우팅 (Istio 등)
- 다중 워크로드 동시 운영 (배치 + API + ML 등)
- 위가 아니면 **ECS Fargate가 운영 비용, 관리 부담 모두 낮음**

## 관련 문서

- [[My-Tech-Cards|기술 카드 마스터 8개 (메인) — vault 카테고리 인덱스도 여기]]
- [[Interview-Prep-Yunhoe-1st-Tech-Extra|범용 백엔드 안전망 (CS 기초, NestJS 심화, HTTP, 인증, 시스템 디자인)]]
- [[Common-Interview-Questions-Tech-Scale|시스템 디자인 4개 (DAU 폭증, 기프티콘, 억 단위, 강결합)]]

### vault 심화 — 카드별 추가 자료 (본 Extended에서 더 깊게 보강 시)

- **카드 1 DB Lock 심화**: [[Lock]], [[Race-Condition-Patterns]], [[Transaction-Lock-Contention]], [[MySQL-Gap-Lock]], [[MySQL-InnoDB-Tuning]]
- **카드 2 EventBridge+SQS 심화**: [[Transactional-Outbox]], [[CDC&Outbox]], [[Idempotency-Key]], [[Saga-Pattern]]
- **카드 3 슬로우 쿼리 심화**: [[Execution-Plan]], [[Covering-Index]], [[B-Tree-Index-Depth]], [[SQL-Tuning-Terminology]], [[Pagination-Optimization]], [[MySQL-Partitioning]], [[OLTP-vs-OLAP]], [[SCD-Type2]]
- **카드 5 관측성 심화**: [[관측가능성(Observability)]], [[Container-Monitoring]], [[Correlation-ID]], [[CloudWatch]]
- **카드 6 아키텍처 심화**: [[Multi-Stage-Build]], [[Image-Size-Optimization]], [[Docker-Image-Pipeline]], [[K8s-Resource-Right-Sizing]], [[Blue-Green]], [[Replication]], [[Read-Replica-Routing]]
