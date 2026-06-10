---
tags: [cdc, debezium, kafka, data-pipeline, monitoring]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["CDC 운영", "Debezium 대규모 운영과 장애 대응"]
---

# CDC, Debezium — 운영과 장애 대응

## 운영 체크리스트

- **가용성**: Kafka 브로커, Zookeeper(또는 KRaft) 최소 3노드, Kafka Connect도 다중 워커
- **binlog 보관 기간** — 커넥터가 잠시 멈춰도 따라잡을 만큼 충분히
- **스키마 변경 대응** — ALTER TABLE은 DB 변경 후 **Debezium이 binlog를 읽으며 스키마 히스토리 업데이트**. 단 MySQL 5.5 DDL은 파서 제한 — 5.7+ 권장
- **하이트래픽 테이블 분리** — 단일 커넥터가 여러 테이블을 묶으면 hot table이 다른 테이블을 지연시킴. `table.include.list`로 분리
- **Kafka Connect 리소스**: JVM 힙, 네트워크 I/O, Converter(Avro/JSON) CPU 모니터링
- **모니터링**: JMX, Kafka Connect REST API로 `source-record-active-count`, `poll-total-time-ms` 등

## 대규모 운영 — 4가지 핵심 지표

대규모 조직에서 CDC는 "돌아간다"로 끝나지 않고 **정량 지표로 관리**해야 한다. Debezium이 기본 제공하는 JMX 지표만으로는 "비즈니스 관점의 실시간성"을 말하기 어려워 커스텀 지표를 붙이는 것이 일반적.

### 1. Source-to-Target Latency

DB 커밋부터 Consumer 처리까지의 **end-to-end 지연**. Debezium 이벤트에 포함된 `source.ts_ms`를 소비 시점과 비교해 계산.

- **측정 구간**: DB commit → binlog → Debezium → Kafka → Consumer 처리
- **서비스 유형별 SLA**: 실시간 UI(~300ms), 일반 동기화(1~5초), 분석(최대 1시간)
- SLA 티어를 정의하면 알람, 오토스케일, 우선순위 분리가 가능

### 2. Events Per Second (EPS, per table)

Debezium 기본 지표(`source-record-active-count`)는 **원본 binlog 이벤트 수**만 제공. 실제 비즈니스 관점의 **테이블, 오퍼레이션(CREATE/UPDATE/DELETE)별 EPS**는 별도 계측 필요.

- 테이블별 트래픽 파악으로 hot table 식별 → 커넥터 분리 판단 근거
- 급격한 증감은 업스트림 서비스의 비정상 상태 신호

### 3. Pipeline Scalability (신규 파이프라인 투입 속도)

Initial Snapshot이 수억 건 테이블에서 **수 시간~10시간+** 소요되면 신규 소비 팀이 생길 때마다 병목. 대처 패턴:

- **Apache Sqoop + Debezium `no_data` 스냅샷 모드**: 과거 데이터는 배치(ETL)로 적재, Debezium은 스키마, binlog 위치만 기록하고 스트리밍 시작 → 신규 파이프라인 투입을 수 분 단위로 단축
- **Incremental Snapshot** (Debezium 1.6+): 스냅샷을 여러 청크로 나눠 스트리밍과 병행. 중단, 재개, 테이블 추가가 자유로움
- **커스텀 Snapshotter (`AddTableSchemaSnapshotter` 스타일)**: 기존 커넥터는 유지하고 **신규 테이블만** 스키마 스냅샷 추가 → 전체 커넥터 재기동 없이 테이블 확장

### 4. Data Consistency (무손실, 무중복 검증)

- Source와 Kafka 토픽의 **레코드 수 비교**(기간별)
- LSN/binlog position의 **중복, 누락 탐지**
- Consumer 쪽 idempotency 키로 End-to-End 검증

## 커스텀 SMT, Converter

Debezium SMT(Single Message Transform)를 활용해 파이프라인 레벨에서 데이터를 가공.

- **PII 마스킹**: 특정 컬럼을 소비자로 내보내기 전에 해시, 마스킹
- **포맷 변환**: `source.ts_ms`를 ISO 8601로, Java enum을 문자열로
- **필터링**: 특정 조건의 이벤트만 통과 (`Filter` SMT)
- **Outbox 라우팅**: `EventRouter` SMT로 Outbox 테이블의 한 컬럼을 토픽 키, 헤더로 매핑

## 장애, 이슈 대응

- **커넥터가 binlog 위치를 잃음** — 보관 기간 경과 / 저장된 offset 손상 → **새 커넥터로 스냅샷 + 중복 필터링**
- **`NOT_ENOUGH_REPLICAS`** — 토픽 RF < `min.insync.replicas`. RF 또는 설정 조정
- **Plugin 경로 오류** — `plugin.path`는 **상위 디렉토리**를 가리켜야 로드됨
- **스키마 드리프트** — 소스 DB의 비호환 변경(컬럼 타입 변경) → Expand-Contract 원칙으로 스키마 마이그레이션
- **DB 인스턴스 변경(Aurora failover 등)** — binlog position이 재조정되어야 할 수 있음. `database.hostname`을 Writer Endpoint로

## Exactly-Once?

- Debezium → Kafka 구간은 **At-Least-Once가 기본** — 재시작 시 일부 이벤트 재전송 가능
- **Consumer는 멱등성**을 확보해야 함(이벤트의 source LSN/binlog 위치로 중복 감지)
- Kafka 0.11+ Transactional Producer + Idempotent Producer로 중복을 많이 줄일 수 있으나 **end-to-end exactly-once는 consumer 설계 포함 문제**

## 흔한 실수

- **`binlog_format` 확인 없이 도입** → STATEMENT 기반이라 CDC가 안 되는 채 디버깅 시간 낭비
- **스냅샷 중 락 걱정 없이 프로덕션 실행** → 일부 버전, 설정에서 롱락으로 장애. staging 검증 필수
- **binlog 보관 기간이 짧음** → 커넥터가 잠시만 멈춰도 따라잡지 못함
- **Exactly-once 기대** → Consumer에서 반드시 멱등 처리
- **스키마 변경을 임의 순서로** → Expand-Contract로 점진 변경

## 면접 체크포인트

- CDC가 해결하는 **dual write 문제**와 이벤트 드리븐에서의 역할
- 로그 기반 CDC가 Polling, Trigger 대비 나은 이유
- Debezium의 스냅샷 → 스트리밍 전환 구조
- MySQL에서 CDC 활성화에 필요한 binlog 설정 3가지
- Aurora MySQL의 CDC 활성화가 전통 MySQL과 다른 지점
- CDC + Transactional Outbox 조합의 의미
- End-to-end exactly-once가 어려운 이유

## 출처
- [m0rph2us — MySQL CDC with Debezium #2](https://m0rph2us.github.io/mysql/cdc/debezium/2020/06/01/mysql-cdc-with-debezium-2.html)
- [m0rph2us — MySQL CDC with Debezium #3](https://m0rph2us.github.io/mysql/cdc/debezium/2020/10/07/mysql-cdc-with-debezium-3.html)
- [Toss — 대규모 CDC Pipeline 운영을 위한 Debezium 개선 여정](https://toss.tech/article/cdc_pipeline)

## 관련 문서
- [[CDC-Debezium|CDC, Debezium (목차)]]
- [[CDC-Debezium-Concept|개념과 아키텍처]]
- [[CDC-Debezium-Setup|DB별 전제와 동작 모드]]
- [[Delivery-Semantics|Delivery Semantics]]
- [[At-Least-Once|At-Least-Once]]
- [[Idempotency-Key|Idempotency Key]]
