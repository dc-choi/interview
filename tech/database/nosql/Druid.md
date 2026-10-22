---
tags: [database, druid, olap, streaming, rollup]
status: done
verified_at: 2026-10-23
category: "데이터&저장소(Data&Storage)"
aliases: ["Apache Druid", "드루이드 실시간 분석"]
---

# Druid의 이벤트 분석과 집계 경계

Apache Druid는 스트리밍과 배치 데이터를 적재해 분석하는 분산 저장소다. 클릭, 노출과 로그를 시간 및 여러 차원으로 집계하는 용도로 검토한다. 아래 동작은 2026-10-23 Apache Druid 공식 문서 대조 기준이다.

## 적재와 조회의 역할

| 구성 요소 | 역할 |
|---|---|
| Overlord | 데이터 적재 작업 배정 |
| Middle Manager와 Peon, 또는 Indexer | 적재 작업 실행 |
| Historical | 조회할 세그먼트 제공 |
| Broker | 외부 클라이언트의 조회 처리 |
| Coordinator | 클러스터의 데이터 가용성 관리 |

적재 결과는 세그먼트로 만들어 deep storage에 저장한다. 스트리밍 적재 프로세스는 들어오는 데이터를 조회에 제공하고, Historical은 적재된 세그먼트를 제공한다. 최신 데이터의 적재 지연과 쿼리 응답 시간은 별도로 측정한다(운영 제안).

Kafka와 Kinesis indexing service는 각각의 스트림 처리에 exactly-once 보장을 제공한다. Supervisor가 적재 작업의 상태, handoff와 실패를 관리한다. 이 보장을 원천 애플리케이션이 같은 업무 이벤트를 두 번 발행해도 제거된다는 뜻으로 확대하지 않는다. Druid datasource에는 primary key나 unique key가 없으므로, 업무 ID 기준 중복 제거가 필요하면 별도 처리와 재처리 검증을 설계한다.

## Rollup은 원본과 교환하는 저장 효율이다

Rollup은 적재할 때 같은 차원 값과 `queryGranularity`로 절삭한 같은 시각을 가진 행을 합친다. 저장량을 줄일 수 있지만 합쳐진 개별 이벤트를 그대로 조회할 수는 없다. 원본 행을 유지해야 하면 `rollup: false`를 검토한다.

예를 들어 분 단위 시간, 캠페인과 지역을 남기고 클릭 수를 합쳤다면, 그 집계만으로 초 단위 발생 순서나 버린 차원을 복원할 수 없다. 이 예시는 rollup의 손실을 설명하기 위한 것이다. 집계 datasource와 원본 보관을 별도 목적으로 설계할 수 있다.

스트리밍 적재는 best-effort rollup이므로 같은 시간과 차원의 행이 여러 세그먼트에 남을 수 있다. 조회에서도 합계를 집계한다. 적재 때 만든 count metric이 `event_count`라면 `SUM(event_count)`로 이벤트 수를 구하고, 저장된 행 수인 `COUNT(*)`와 구분한다.

## 사전 집계 조합이 많아질 때

광고의 지역, 연령, 기기와 기간을 사용자가 바꾸며 조회하면, 모든 조합을 미리 계산하는 방식의 관리 부담이 커질 수 있다. 다음은 설계 판단 기준이다.

- 실제 필터와 그룹화에 필요한 차원을 먼저 정한다. 차원을 추가하면 탐색 범위가 늘지만 rollup 효율은 낮아질 수 있다.
- 고정 보고서는 기존 배치 집계를 유지할 수 있다. 임의 조합 조회가 필요하다는 이유만으로 모든 분석을 옮기지 않는다.
- 지연 도착, 중복 발행과 과거 구간 재적재를 따로 시험하고 집계 결과를 원본과 대조한다.
- 쓰기 처리량, 적재 지연, 동시 조회의 p95와 비용을 함께 측정한다. 다른 조직의 성능 수치를 자기 서비스의 보장값으로 사용하지 않는다.

2024년 공개된 당근 광고 플랫폼 발표는 타기팅 차원이 늘면서 사전 집계만으로 성과 조회를 제공하기 어려워진 사례를 다룬다. 당시 도입 이유를 설명하는 사례이며 현재 구성이나 성능을 확인한 기록은 아니다.

## 출처

- [Apache Druid, Architecture](https://druid.apache.org/docs/latest/design/architecture/)
- [Apache Druid, Ingestion overview](https://druid.apache.org/docs/latest/ingestion/)
- [Apache Druid, Streaming ingestion](https://druid.apache.org/docs/latest/ingestion/streaming/)
- [Apache Druid, Data rollup](https://druid.apache.org/docs/latest/ingestion/rollup/)
- [Apache Druid, Schema design tips](https://druid.apache.org/docs/latest/ingestion/schema-design/)
- [Imply Druid를 활용한 실시간 데이터 분석과 당근마켓 사례 — Amazon Web Services Korea](https://www.youtube.com/watch?v=RE7G_mnFOVE) — 2024-09-23 공개, 도입 배경만 반영

## 관련 문서

- [[OLTP-vs-OLAP|트랜잭션 처리와 분석 처리]]
- [[ClickHouse|컬럼 지향 분석 저장소]]
- [[Polyglot-Persistence|저장소별 정본과 재구축]]
