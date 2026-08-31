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
| 충돌 시 비용 | 전체 트랜잭션 재실행 | Lock 대기 (NOWAIT면 즉시 실패 후 재시도) |
| Lock 보유 시간 | 선점 없음 (쓰기 시점 검증, 조건부 UPDATE의 X Lock은 커밋까지) | 트랜잭션 동안 보유 |
| 데드락 위험 | 낮음 (여러 행, 여러 자원 갱신이 얽히면 가능) | 있음 (순서 통일로 완화) |
| 구현 | version 컬럼 추가 | SELECT FOR UPDATE |

### InnoDB Lock 5종

| Lock 종류 | 설명 | 예시 |
|---|---|---|
| **Shared Lock (S)** | 같은 레코드의 다른 S Lock과 호환되고 X Lock과 충돌 | `SELECT ... FOR SHARE` |
| **Exclusive Lock (X)** | 같은 레코드의 다른 S/X Lock과 충돌. 일반 consistent read는 MVCC 버전을 읽을 수 있음 | `SELECT ... FOR UPDATE`, `UPDATE`, `DELETE` |
| **Record Lock** | 인덱스 레코드 하나에 거는 Lock | PK/유니크 인덱스로 정확히 1행 |
| **Gap Lock** | 인덱스 레코드 사이 간격 잠금 (삽입 방지) | RR에서 범위 조건 |
| **Next-Key Lock** | Record + Gap. InnoDB RR 기본 | Phantom Read 방지 |

### 심화 꼬리

- **"NOWAIT vs SKIP LOCKED?"** → SKIP LOCKED는 잠긴 행 건너뛰고 다음 행 읽음 (큐 패턴 적합). 재고처럼 특정 행 반드시 처리해야 하면 NOWAIT가 맞음. 둘 다 row lock 대기에만 적용(MDL 등은 남음)이고 statement 기반 replication엔 안전하지 않음
- **"FOR UPDATE vs FOR SHARE?"** → FOR UPDATE의 X Lock은 같은 레코드의 다른 locking read와 쓰기와 충돌한다. FOR SHARE의 S Lock은 다른 S Lock과 호환되지만 X Lock과 충돌한다. 일반 consistent read는 MVCC 버전을 읽을 수 있고, 읽은 뒤 바로 쓰는 경로에는 X Lock이 필요하다.
- **"멀티 인스턴스에서도 DB Lock 충분?"** → 같은 DB를 바라보는 한 충분. 샤딩됐다는 이유만으로 분산 락이 필요한 것은 아니고, 보호할 자원이 여러 DB, shard나 외부 시스템 경계를 실제로 넘어 단일 트랜잭션으로 묶이지 않을 때 검토
- **"Gap Lock 성능 영향?"** → 범위 잠금이라 INSERT 차단 가능. 동시성 필요하면 RC 검토 — 단 RC는 gap lock 제거 스위치가 아니라 격리 계약이 바뀌는 선택. 일반 잠금 읽기의 Gap Lock은 대부분 사라지지만 FK와 중복 키 검사에는 남고, Non-Repeatable Read와 Phantom Read를 허용하게 됨
- **"테이블 락은 언제?"** → 명시적 `LOCK TABLES`와 일부 DDL에서 발생. 인덱스 없는 UPDATE/DELETE는 명시적 테이블 락이 아니라 스캔한 인덱스 레코드 다수를 잠가 테이블 전체가 막힌 것처럼 보이는 경우이며, 객체 정의를 보호하는 MDL은 별도
- **"데드락 감지 분석?"** → `SHOW ENGINE INNODB STATUS` → LATEST DETECTED DEADLOCK 섹션으로 원인 분석. 누계 추세는 `information_schema.INNODB_METRICS`의 `lock_deadlocks` 카운터 (vanilla MySQL엔 `Innodb_deadlocks` status 변수가 없음. MariaDB 확장). mysqld_exporter는 `--collect.info_schema.innodb_metrics`로 켜고 Grafana에서 `mysql_info_schema_innodb_metrics_lock_lock_deadlocks_total` 증가율을 봄
- **"같은 행인데도 데드락?"** → S→X 승격 패턴. `INSERT IGNORE` 중복 확인이나 FK 검증이 잡은 S Lock을 두 TX가 나눠 쥔 채 같은 행의 X로 승격하려 할 때. 중복 확인 경로는 no-op ODKU(`ON DUPLICATE KEY UPDATE col = col`)로 중복 시점에 S 대신 X를 잡아 순환 대기를 직렬 대기로 바꾸고(중복 PK면 레코드 락, UNIQUE 키면 앞 갭까지 묶는 next-key 락), FK 경로는 부모 UPDATE를 앞으로 옮겨 X를 선점하거나 실익 낮은 FK 제거. 더 나아가 그 행을 갱신하게 만든 카운터를 조회 계산으로 바꾸면(행 수가 적어 계산이 쌀 때) X 락과 `FOR UPDATE`의 이유가 사라짐 — 중복 확인 자체의 락(`INSERT IGNORE`면 S, no-op ODKU면 X)은 남으므로 경합이 없어지는 게 아니라 짧아지는 것

## 카드 2 EventBridge+SQS 심화

### 멱등성 상태 머신 흐름 (안전한 개선 기준)

1. SQS 메시지 수신 (발주 ID 포함)
2. 발주 레코드를 잠그고 status, `owner_token`, `heartbeat_at` 확인
3. `COMPLETED` → 이미 처리됐으므로 메시지 삭제
4. `PENDING`/`FAILED` 또는 heartbeat가 만료된 `PROCESSING` → 조건부 UPDATE로 새 owner가 lease를 획득한 경우에만 실행
5. heartbeat가 신선한 `PROCESSING` → 다른 워커가 처리 중이므로 **현재 수신자는 실행하지 않고 메시지도 삭제하지 않음**. 남은 lease 또는 회수 시점에 jitter를 더한 만큼 visibility를 미뤄 불필요한 재수신을 줄임
6. 처리 중 heartbeat와 visibility를 연장하고, 성공 시 `owner_token`이 같은 행만 `COMPLETED`로 바꾼 뒤 메시지 삭제
7. 실패 시 메시지를 삭제하지 않아 visibility 만료 후 재전달
8. SQS `maxReceiveCount`는 실제 실패뿐 아니라 `BUSY` 재수신도 세므로 처리시간과 lease를 반영해 정하고, DLQ 유입 원인을 구분해 알림과 수동 확인

> **구현 경계**: 단순 시작 시각만으로는 느린 워커와 죽은 워커를 구별할 수 없다. lease, heartbeat, owner token을 함께 사용하고, 실제 적용 전에는 장애와 재시작 시나리오로 검증한다.

**visibility timeout 설정**: 일반 ECS 소비자는 관측한 최대 또는 p99 처리시간에 여유를 두고, 길어질 수 있는 작업은 heartbeat로 연장한다. 함수 timeout의 6배 권고는 SQS의 Lambda 이벤트 소스 매핑에만 적용한다.

**알림 채널 로컬 중복 방지**: 알림 사건의 안정적인 `event_id`와 대상 채널을 함께 유일하게 만들면 로컬 중복 처리를 막을 수 있다. 다만 외부 provider가 수락한 뒤 응답 전에 relay가 중단되는 중복까지는 막지 못하므로, provider가 지원하면 같은 idempotency key를 전달하고 수락 여부가 불명확한 건은 상태 조회나 수동 대사로 닫는다.

### Outbox 패턴 디테일

> 실제 경력 사례에는 적용하지 못한 개선 패턴이다. 아래는 DB 커밋과 이벤트 발행 사이의 유실 가능성을 보완할 때 설명할 설계 원리다.

```sql
outbox: (id, aggregate_type, aggregate_id, event_type, payload JSON, created_at, processed_at)
-- processed_at NULL이면 미발행
```

- INSERT + outbox INSERT를 **같은 DB 트랜잭션**으로 묶음 → 원자적 보장
- Relay 프로세스가 outbox 폴링하여 발행 후 `processed_at` 마킹
- Relay crash 시 outbox 레코드 잔존 → 재시작 후 재발행 → at-least-once 발행 보장

### CDC vs Outbox 비교

| 축 | Outbox (폴링) | CDC (Debezium) |
|---|---|---|
| 인프라 | 단순 (앱+DB) | Debezium+Kafka Connect 등 별도 |
| 지연 | 폴링 주기에 좌우됨 | 변경 스트림 수준의 낮은 지연 |
| 적합 규모 | 운영 단순성이 우선인 흐름 | 높은 처리량 또는 낮은 지연이 핵심인 흐름 |
| 운영 부담 | 낮음 | 높음 |

### Lambda vs ECS 워커 결정 4축

| 축 | ECS 워커 유리 | Lambda 유리 |
|---|---|---|
| 도메인 로직 재사용 | NestJS 모델, 로직 그대로 | 별도 패키지로 분리 |
| DB 연결과 동시성 | 상시 풀과 워커 수를 직접 제한 | 이벤트 소스 매핑 동시성과 DB 연결 예산 제한, 필요 시 RDS Proxy 검토 |
| 인프라 | 기존 코드와 배포 경로 재사용, task 실행 비용 발생 | 사용량 과금, 함수 배포와 운영 경계 필요 |
| 스케일 패턴 | 상시 + 점진적 스케일 | 불규칙, 유휴 시간 긴 워크로드 |

### 심화 꼬리

- **"SQS FIFO?"** → MessageGroupId 기반으로 그룹 안의 순서를 보장한다. 실제 처리량은 리전별 서비스 할당량, 배치와 그룹 분산에 따라 달라지므로 적용 시 공식 문서를 확인한다
- **"Pub/Sub vs SQS?"** → Pub/Sub은 topic 기반 팬아웃(1:N), SQS는 큐 기반 point-to-point(1:1)
- **"이벤트 유실 — 생산자 측?"** → Dual Write 문제. Outbox 패턴으로 해결 (위)
- **"이벤트 유실 — 소비자 측?"** → SQS at-least-once + 멱등성 키 + DLQ로 최종 실패 보관

## 카드 3 슬로우 쿼리 심화

### EXPLAIN 읽는 법 (MySQL)

| 컬럼 | 의미 |
|---|---|
| **type** | ALL(풀스캔, 나쁨), range, ref, eq_ref, const, system(좋음) |
| **rows** | 추정 검사 행 수. 실제와 큰 차이면 통계 갱신 |
| **filtered** | 테이블 조건을 통과해 남을 것으로 추정한 비율. `rows × filtered / 100`이 다음 테이블과 조인될 행 수(100이면 필터링 없음, 낮을수록 더 많이 제거됨) |
| **Extra** | Using filesort(정렬 비용), Using temporary(임시 테이블), Using index(커버링) |

### PostgreSQL 차이

- `EXPLAIN (ANALYZE, BUFFERS)` — 실제 실행 + 디스크/캐시 hit 비율
- `pg_stat_statements` — 슬로우 쿼리 누적 통계
- 인덱스 종류: B-Tree(기본), Hash(정확 매칭만), **BRIN(시계열, 범위 데이터 압축 인덱스)**, **GIN(JSONB, 배열, 풀텍스트)**, GiST(공간)
- MVCC 구현 차이: PG는 dead tuple + VACUUM, MySQL은 undo log
- PostgreSQL은 JSONB 연산자와 인덱스, BRIN, GIN, GiST 및 확장 기능 선택지가 풍부하다. CTE와 Window 함수는 MySQL 8도 지원하므로 필요한 기능, 버전과 실제 쿼리 계획으로 비교한다.

### 심화 꼬리

- **"인덱스 추가 후 쓰기 페널티 정량?"** → 인덱스 수, 페이지 분할 빈도 모니터링. 핫스팟이면 파티셔닝(시간, 해시, 리스트) 검토
- **"파티셔닝 vs 샤딩?"** → 파티셔닝은 한 DB 내 테이블 분할 (운영 단순), 샤딩은 DB 인스턴스 분리 (라우팅 복잡)
- **"NoSQL 검토 시점?"** → SQL 최적화 순서를 모두 소진한 뒤가 아니라, 요구하는 데이터 모델과 접근 패턴, 일관성 및 확장 조건이 RDBMS보다 NoSQL에 더 맞는지 비교해 결정

## 카드 5 관측성 심화

### CloudWatch vs ELK vs Datadog vs GPL 핵심 축 비교

| 축 | 평가 기준 |
|---|---|
| 총소유비용 | 예상 사용량과 운영 인력을 포함해 비교 |
| 메트릭 생태계 | 쿼리, 경보, 생태계 성숙도를 비교 |
| 벤더 종속 | 이식성과 운영 도구 의존도를 비교 |

> 도구 선택은 운영 인력, 예상 사용량, 쿼리와 경보 요구, 벤더 종속을 함께 비교한다. 재현할 수 없는 내부 가중치와 총점은 사용하지 않는다.

### 관측 구성의 책임 분리

> 다음은 특정 운영 환경을 재현한 구성이 아니라, 관측 체계를 설계할 때 책임을 나누는 일반 예시다.

- 애플리케이션은 요청 상관관계 ID, 구조화 로그와 사용자 영향에 연결되는 메트릭을 남긴다.
- 수집 계층은 출력 형식을 정규화하고, 전송 실패가 애플리케이션 처리에 영향을 주지 않게 격리한다.
- 로그와 메트릭 저장소는 탐색, 집계, 보존과 복원 요구를 충족하도록 선택한다.
- 조회와 경보 계층은 현재 상태와 장기 추세를 함께 보며, 사용자 영향 SLI를 기준으로 알림을 만든다.

> 도구 선택, 배치 형태, 보존 기간과 저장 경계는 처리량, 보안과 복구 요구를 확인한 뒤 별도로 결정한다.

### 경보 설계 원칙

- 에러율과 지연은 사용자 영향 SLI와 목표 기간에서 역산한다.
- 데이터베이스와 런타임 포화 신호는 정상 구간과 사용자 영향이 나타나는 경계를 관측해 경보를 정한다.
- 내부 임계값과 지속 시간은 공개하지 않는다.

> Error rate와 latency는 SLI 후보지만, 위 `for` 기반 임계 경보 전체가 SLO burn-rate 경보는 아니다. SLO로 개선한다면 사용자 영향 SLI와 목표 기간을 정하고 multi-window, multi-burn-rate 조건을 별도로 둔다.

### 카디널리티 관리 룰

- **userId/requestId/traceId 라벨 절대 금지** — 라벨 조합 폭증 → Prometheus OOM
- route/path 라벨 정규화 (`/users/:id` → `/users/{id}`)
- `requestId`는 **로그 본문(flat JSON)에 기록**하고 LogQL로 검색. 분산 추적을 추가하면 별도의 `traceId`를 로그에 싣고 메트릭은 고카디널리티 라벨 대신 exemplar로 연결

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
- 위가 아니면 관리형 태스크 환경이 운영 부담을 낮출 수 있다. 실제 비용과 관리 난이도는 팀의 워크로드와 운영 역량을 비교해 결정한다

## 관련 문서

- [[My-Tech-Cards|기술 카드 마스터 8개 (메인) — vault 카테고리 인덱스도 여기]]
- [[Common-Interview-Questions-Tech-Basics|범용 백엔드 기술 질문]]
- [[Common-Interview-Questions-Tech-Scale|시스템 디자인 4개 (DAU 폭증, 기프티콘, 억 단위, 강결합)]]

### vault 심화 — 카드별 추가 자료 (본 Extended에서 더 깊게 보강 시)

- **카드 1 DB Lock 심화**: [[Lock]], [[Lock-Deadlock]], [[MySQL-InnoDB-Locking-and-Deadlocks]], [[DML-Conflict-and-Batch-Patterns]], [[Retry-Backoff-Jitter]], [[Lock-Wait-Convoy]], [[Race-Condition-Patterns]], [[Transaction-Lock-Contention]], [[MySQL-Gap-Lock]], [[MySQL-InnoDB-Tuning]]
- **카드 2 EventBridge+SQS 심화**: [[EventBridge-SQS-Target]], [[SQS-Consumer-Lambda-vs-ECS]], [[Delivery-Semantics]], [[Transactional-Outbox]], [[CDC&Outbox]], [[Idempotency-Key]], [[Idempotent-Consumer]], [[SQS-Worker-Reliability]]
- **카드 3 슬로우 쿼리 심화**: [[MySQL-Query-Pipeline-and-Sorting]], [[Execution-Plan]], [[Covering-Index]], [[B-Tree-Index-Depth]], [[SQL-Tuning-Terminology]], [[Pagination-Optimization]], [[MySQL-Partitioning]], [[OLTP-vs-OLAP]], [[SCD-Type2]]
- **카드 4 Prisma/ORM 심화**: [[Prisma-Query-Performance]], [[TypeORM-QueryBuilder]], [[TypeORM-Transactions-and-Replication]], [[ORM]], [[ORM-Impedance-Mismatch]], [[Domain-ORM-Mapper]], [[SQL-Joins]]
- **카드 5 관측성 심화**: [[관측가능성(Observability)]], [[Prometheus]], [[RED-USE-Method]], [[SLI-SLO]], [[Cardinality]], [[Container-Monitoring]], [[Correlation-ID]], [[OpenTelemetry]], [[Exemplars]], [[Loki]], [[Thanos]], [[Grafana-Alerting]], [[Alert-Fatigue]], [[Incident-Detection-Logging]], [[CloudWatch]]
- **카드 6 아키텍처 심화**: [[Multi-Stage-Build]], [[Image-Size-Optimization]], [[Docker-Image-Pipeline]], [[ELB]], [[ECS-Service-AutoScaling]], [[ECS-Rolling-Deployment]], [[ECS-Secrets-Injection]], [[Container-Entrypoint-Signals]], [[K8s-Resource-Right-Sizing]], [[Blue-Green]], [[Replication]], [[Read-Replica-Routing]]
- **카드 7 Clean Architecture/NestJS 심화**: [[Clean-Architecture-NestJS]], [[RxJS-Essentials]], [[NestJS]], [[Custom-Provider]], [[Request-Lifecycle]], [[NestJS-Circular-Dependency]], [[Injection-Scopes]]
- **카드 8 캐시/Redis 심화**: [[Cache-Decision]], [[Cache-Strategies]], [[Cache-Invalidation]], [[Cache-Stampede]], [[Redis-Data-Structures]], [[Redis-Streams-PubSub]], [[Redis-Cluster-Sharding]], [[Rate-Limiting]], [[External-Collection-Pipeline-Reliability]]
