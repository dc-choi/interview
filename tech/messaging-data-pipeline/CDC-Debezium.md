---
tags: [cdc, debezium, kafka, mysql, data-pipeline, change-data-capture, binlog]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["CDC", "Change Data Capture", "Debezium", "MySQL CDC", "Aurora CDC"]
---

# CDC · Debezium

CDC(Change Data Capture)는 **데이터베이스의 변경(INSERT/UPDATE/DELETE)을 실시간 스트림으로 뽑아내는 기법**. 애플리케이션 코드를 건드리지 않고 DB 자체의 로그(MySQL binlog, PostgreSQL WAL)를 파싱해 이벤트로 만든다. 서비스 간 데이터 동기화·이벤트 드리븐 아키텍처·ETL·검색 인덱스 갱신·캐시 무효화의 공통 기반 기술.

## 왜 CDC인가

- **이벤트 발행과 DB 저장의 이중 쓰기(dual write) 문제**를 해결 — 앱이 명시적으로 이벤트를 발행하면 DB 커밋 실패와 이벤트 발행 실패가 어긋날 수 있음. CDC는 **DB 커밋된 사실을 근거로** 이벤트를 만든다
- **레거시·외부 시스템도 대상** — 앱 변경 없이 스트림 확보
- **스트리밍 파이프라인의 원천** — Kafka로 흘려보내 여러 consumer(검색·데이터 레이크·캐시·알림)가 소비
- **이관 도구** — 서비스 마이그레이션 중 듀얼 라이트 없이 무중단 전환

## 구현 방식 3가지

| 방식 | 설명 | 특징 |
|---|---|---|
| **쿼리 기반 Polling** | `updated_at > last_ts`로 주기 조회 | 단순하지만 **DELETE 못 잡음**, 부하·지연 트레이드오프 |
| **Trigger 기반** | 테이블에 트리거로 변경 로그 기록 | DB 부하 증가, 스키마 오염 |
| **Log 기반(Debezium 등)** | 복제 로그(binlog/WAL)를 읽어 이벤트 생성 | **무침습·저지연**, 표준 선택 |

현대 CDC는 거의 모두 **로그 기반**. Debezium·Maxwell·Canal·AWS DMS가 이 카테고리.

## Debezium 아키텍처

```
[MySQL] --binlog--> [Debezium Connector] --> [Kafka Connect] --> [Kafka Topic] --> [Consumers]
                              ↑
                    [Schema History Topic]
```

- **Kafka Connect 플랫폼** 위에서 Source Connector로 동작
- 대상 DB 테이블별로 **토픽**이 생성(보통 `{serverName}.{db}.{table}`)
- **스키마 변경 이력**을 별도 내부 토픽에 보관해 과거 이벤트도 올바른 스키마로 해석
- 이벤트 포맷: before · after · source(binlog 위치·시각) 메타데이터 포함

## MySQL CDC의 전제

MySQL(또는 Aurora MySQL)에서 Debezium이 동작하려면 서버 설정이 필요.

- `binlog_format = ROW` — STATEMENT/MIXED은 행 단위 변경 정보를 잃어 CDC 불가
- `binlog_row_image = FULL` — UPDATE 시 변경 전후 전체 행 정보
- `server_id`, `log_bin`, `expire_logs_days` 설정
- Debezium 전용 계정 + `REPLICATION SLAVE`·`REPLICATION CLIENT`·`SELECT`·`RELOAD` 권한

### Aurora MySQL 특수사항

- binlog 기본 OFF — 공유 스토리지 아키텍처상 더티 페이지 개념이 다름
- 활성화 절차: 파라미터 그룹에서 `binlog_format = ROW` → **리더 인스턴스 추가·재구동** → failover로 승격
- Aurora 2.11.2 이상 권장 (특정 버전에 CPU 급증 이슈)
- 버전 **2.10.x 이상의 "binlog I/O 캐시"** 덕에 과거 대비 성능 페널티가 크게 줄었음

## 동작 모드: Snapshot → Streaming

Debezium 커넥터는 두 단계로 진행.

### 1. Initial Snapshot

- 전역 읽기 잠금 확보 → 트랜잭션 시작 → **binlog 현재 위치·스키마 기록** → 모든 행을 `CREATE` 이벤트로 발행
- 스냅샷 중에도 락이 짧게 끝나도록 설계되어 있지만 대용량 테이블에서는 장시간 실행 가능
- 옵션: `snapshot.mode = initial`(기본), `when_needed`, `schema_only`, `never`

### 2. Streaming (Change Events)

- 스냅샷 이후 기록한 binlog 위치부터 **실시간 이벤트 캡처**
- 커넥터가 자신이 처리한 binlog offset을 Kafka 내부 토픽에 저장 → 재기동 시 이어서

### 초기 스냅샷이 부담되는 경우

- 수억 건 테이블은 3시간+ 걸림 → **ETL 배치로 초기 데이터 적재 + 커넥터는 `schema_only`로 스트리밍만** 하는 하이브리드가 효율적
- 스냅샷 도중 재시작은 처음부터 다시 → **체크포인팅이 제한적**이라는 점 인지

## 운영 체크리스트

- **가용성**: Kafka 브로커·Zookeeper(또는 KRaft) 최소 3노드, Kafka Connect도 다중 워커
- **binlog 보관 기간** — 커넥터가 잠시 멈춰도 따라잡을 만큼 충분히
- **스키마 변경 대응** — ALTER TABLE은 DB 변경 후 **Debezium이 binlog를 읽으며 스키마 히스토리 업데이트**. 단 MySQL 5.5 DDL은 파서 제한 — 5.7+ 권장
- **하이트래픽 테이블 분리** — 단일 커넥터가 여러 테이블을 묶으면 hot table이 다른 테이블을 지연시킴. `table.include.list`로 분리
- **Kafka Connect 리소스**: JVM 힙·네트워크 I/O·Converter(Avro/JSON) CPU 모니터링
- **모니터링**: JMX·Kafka Connect REST API로 `source-record-active-count`, `poll-total-time-ms` 등

## 장애·이슈 대응

- **커넥터가 binlog 위치를 잃음** — 보관 기간 경과 / 저장된 offset 손상 → **새 커넥터로 스냅샷 + 중복 필터링**
- **`NOT_ENOUGH_REPLICAS`** — 토픽 RF < `min.insync.replicas`. RF 또는 설정 조정
- **Plugin 경로 오류** — `plugin.path`는 **상위 디렉토리**를 가리켜야 로드됨
- **스키마 드리프트** — 소스 DB의 비호환 변경(컬럼 타입 변경) → Expand-Contract 원칙으로 스키마 마이그레이션
- **DB 인스턴스 변경(Aurora failover 등)** — binlog position이 재조정되어야 할 수 있음. `database.hostname`을 Writer Endpoint로

## Exactly-Once?

- Debezium → Kafka 구간은 **At-Least-Once가 기본** — 재시작 시 일부 이벤트 재전송 가능
- **Consumer는 멱등성**을 확보해야 함(이벤트의 source LSN/binlog 위치로 중복 감지)
- Kafka 0.11+ Transactional Producer + Idempotent Producer로 중복을 많이 줄일 수 있으나 **end-to-end exactly-once는 consumer 설계 포함 문제**

## 대안 도구

| 도구 | 특징 |
|---|---|
| **Debezium** | 오픈소스, 다중 DB(MySQL·PG·Mongo·Oracle), Kafka Connect 에코 |
| **Maxwell** | Java, MySQL 전용, JSON 출력, 단순 |
| **Canal** | Alibaba, MySQL 특화 |
| **AWS DMS** | 관리형, AWS 자원에 초점. 세팅 쉬움 |
| **Kafka Connect 자체 JDBC Source** | 쿼리 기반(Polling) — CDC라기보단 증분 로딩 |

선택: 멀티 DB·오픈소스 에코시스템이 중요하면 Debezium. AWS 전용 파이프라인이면 DMS가 단순. MySQL만 쓰고 단순 스트림이면 Maxwell.

## 사용 시나리오

- **마이크로서비스 데이터 동기화** — 주문 서비스 DB 변경 → 검색 서비스 인덱스 갱신, 알림 서비스 발송
- **Event Sourcing 보조** — 레거시 DB로부터 도메인 이벤트 파생
- **CQRS Read Model 업데이트**
- **검색 인덱스·캐시 invalidation** — 변경 이벤트로 Redis·Elasticsearch 동기화
- **데이터 레이크 적재** — S3·Glue·Snowflake로 실시간 로드
- **서비스 마이그레이션** — 구 DB와 신 DB 사이 무중단 전환 과정의 동기화

## Transactional Outbox와의 관계

[[Transactional-Outbox|Transactional Outbox]] 패턴에서도 CDC가 핵심 요소. Outbox 테이블에 이벤트를 트랜잭션과 함께 기록하고, **Debezium이 Outbox 테이블의 변경을 감지해 Kafka로 발행**. DB 트랜잭션과 이벤트 발행의 원자성을 CDC로 보장.

## 흔한 실수

- **`binlog_format` 확인 없이 도입** → STATEMENT 기반이라 CDC가 안 되는 채 디버깅 시간 낭비
- **스냅샷 중 락 걱정 없이 프로덕션 실행** → 일부 버전·설정에서 롱락으로 장애. staging 검증 필수
- **binlog 보관 기간이 짧음** → 커넥터가 잠시만 멈춰도 따라잡지 못함
- **Exactly-once 기대** → Consumer에서 반드시 멱등 처리
- **스키마 변경을 임의 순서로** → Expand-Contract로 점진 변경

## 면접 체크포인트

- CDC가 해결하는 **dual write 문제**와 이벤트 드리븐에서의 역할
- 로그 기반 CDC가 Polling·Trigger 대비 나은 이유
- Debezium의 스냅샷 → 스트리밍 전환 구조
- MySQL에서 CDC 활성화에 필요한 binlog 설정 3가지
- Aurora MySQL의 CDC 활성화가 전통 MySQL과 다른 지점
- CDC + Transactional Outbox 조합의 의미
- End-to-end exactly-once가 어려운 이유

## 출처
- [wushujames — MySQL CDC Projects Wiki](https://github.com/wushujames/mysql-cdc-projects/wiki)
- [m0rph2us — MySQL CDC with Debezium #1](https://m0rph2us.github.io/mysql/cdc/debezium/2020/05/23/mysql-cdc-with-debezium-1.html)
- [m0rph2us — MySQL CDC with Debezium #2](https://m0rph2us.github.io/mysql/cdc/debezium/2020/06/01/mysql-cdc-with-debezium-2.html)
- [m0rph2us — MySQL CDC with Debezium #3](https://m0rph2us.github.io/mysql/cdc/debezium/2020/10/07/mysql-cdc-with-debezium-3.html)
- [rastalion.dev — Aurora for MySQL에서 CDC를 준비하는 과정](https://rastalion.dev/aurora-for-mysql%EC%97%90%EC%84%9C-cdc%EB%A5%BC-%EC%A4%80%EB%B9%84%ED%95%98%EB%8A%94-%EA%B3%BC%EC%A0%95/)
- [mongsil-jeong — Debezium MySQL CDC Kafka Connect](https://mongsil-jeong.tistory.com/38)

## 관련 문서
- [[Transactional-Outbox|Transactional Outbox 패턴]]
- [[MQ-Kafka|Kafka]]
- [[Delivery-Semantics|Delivery Semantics]]
- [[Event-Driven-Patterns|이벤트 드리븐 실전 패턴]]
- [[At-Least-Once|At-Least-Once]]
- [[Idempotency-Key|Idempotency Key]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]]
- [[MySQL-Backup|MySQL 백업·복원]]
