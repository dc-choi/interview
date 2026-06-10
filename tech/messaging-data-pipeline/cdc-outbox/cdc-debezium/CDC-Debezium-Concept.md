---
tags: [cdc, debezium, kafka, mysql, data-pipeline, change-data-capture, binlog]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["CDC 개념과 아키텍처", "CDC 구현 방식과 대안 도구"]
---

# CDC, Debezium — 개념과 아키텍처

## 왜 CDC인가

- **이벤트 발행과 DB 저장의 이중 쓰기(dual write) 문제**를 해결 — 앱이 명시적으로 이벤트를 발행하면 DB 커밋 실패와 이벤트 발행 실패가 어긋날 수 있음. CDC는 **DB 커밋된 사실을 근거로** 이벤트를 만든다
- **레거시, 외부 시스템도 대상** — 앱 변경 없이 스트림 확보
- **스트리밍 파이프라인의 원천** — Kafka로 흘려보내 여러 consumer(검색, 데이터 레이크, 캐시, 알림)가 소비
- **이관 도구** — 서비스 마이그레이션 중 듀얼 라이트 없이 무중단 전환

## 구현 방식 3가지

| 방식 | 설명 | 특징 |
|---|---|---|
| **쿼리 기반 Polling** | `updated_at > last_ts`로 주기 조회 | 단순하지만 **DELETE 못 잡음**, 부하, 지연 트레이드오프 |
| **Trigger 기반** | 테이블에 트리거로 변경 로그 기록 | DB 부하 증가, 스키마 오염 |
| **Log 기반(Debezium 등)** | 복제 로그(binlog/WAL)를 읽어 이벤트 생성 | **무침습, 저지연**, 표준 선택 |

현대 CDC는 거의 모두 **로그 기반**. Debezium, Maxwell, Canal, AWS DMS가 이 카테고리.

## Debezium 아키텍처

```
[MySQL] --binlog--> [Debezium Connector] --> [Kafka Connect] --> [Kafka Topic] --> [Consumers]
                              ↑
                    [Schema History Topic]
```

- **Kafka Connect 플랫폼** 위에서 Source Connector로 동작
- 대상 DB 테이블별로 **토픽**이 생성(보통 `{serverName}.{db}.{table}`)
- **스키마 변경 이력**을 별도 내부 토픽에 보관해 과거 이벤트도 올바른 스키마로 해석
- 이벤트 포맷: before, after, source(binlog 위치, 시각) 메타데이터 포함

## 대안 도구

| 도구 | 특징 |
|---|---|
| **Debezium** | 오픈소스, 다중 DB(MySQL, PG, Mongo, Oracle), Kafka Connect 에코 |
| **Maxwell** | Java, MySQL 전용, JSON 출력, 단순 |
| **Canal** | Alibaba, MySQL 특화 |
| **AWS DMS** | 관리형, AWS 자원에 초점. 세팅 쉬움 |
| **Kafka Connect 자체 JDBC Source** | 쿼리 기반(Polling) — CDC라기보단 증분 로딩 |

선택: 멀티 DB, 오픈소스 에코시스템이 중요하면 Debezium. AWS 전용 파이프라인이면 DMS가 단순. MySQL만 쓰고 단순 스트림이면 Maxwell.

## 사용 시나리오

- **마이크로서비스 데이터 동기화** — 주문 서비스 DB 변경 → 검색 서비스 인덱스 갱신, 알림 서비스 발송
- **Event Sourcing 보조** — 레거시 DB로부터 도메인 이벤트 파생
- **CQRS Read Model 업데이트**
- **검색 인덱스, 캐시 invalidation** — 변경 이벤트로 Redis, Elasticsearch 동기화
- **데이터 레이크 적재** — S3, Glue, Snowflake로 실시간 로드
- **서비스 마이그레이션** — 구 DB와 신 DB 사이 무중단 전환 과정의 동기화

## Transactional Outbox와의 관계

[[Transactional-Outbox|Transactional Outbox]] 패턴에서도 CDC가 핵심 요소. Outbox 테이블에 이벤트를 트랜잭션과 함께 기록하고, **Debezium이 Outbox 테이블의 변경을 감지해 Kafka로 발행**. DB 트랜잭션과 이벤트 발행의 원자성을 CDC로 보장.

## 출처
- [wushujames — MySQL CDC Projects Wiki](https://github.com/wushujames/mysql-cdc-projects/wiki)

## 관련 문서
- [[CDC-Debezium|CDC, Debezium (목차)]]
- [[CDC-Debezium-Setup|DB별 전제와 동작 모드]]
- [[CDC-Debezium-Operations|운영과 장애 대응]]
- [[Transactional-Outbox|Transactional Outbox 패턴]]
