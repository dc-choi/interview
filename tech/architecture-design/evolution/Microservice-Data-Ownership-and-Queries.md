---
tags: [architecture, microservices, data-ownership, database-per-service, api-composition, cqrs]
status: done
verified_at: 2026-08-04
category: "Architecture - 진화"
aliases: ["Microservice Data Ownership", "Database per Service", "Cross Service Query"]
---

# 마이크로서비스 데이터 소유권과 교차 서비스 조회

서비스가 독립적으로 배포되려면 자기 상태의 쓰기 규칙도 소유해야 한다. Database per Service의 핵심은 서버를 서비스 수만큼 사는 것이 아니라 **다른 서비스가 소유 데이터를 직접 읽고 쓰지 못하게 계약으로 캡슐화하는 것**이다.

## 논리 소유권과 물리 배치

| 배치 | 격리 방법 | 장점 | 한계 |
|---|---|---|---|
| shared server, private tables | 서비스별 계정과 table grant | 운영 부담이 가장 낮음 | schema 경계가 약하면 우회하기 쉬움 |
| schema per service | schema와 계정 분리 | 소유권이 선명하고 shared server 효율 유지 | server 장애와 자원 경쟁 공유 |
| database/server per service | 인스턴스와 자원까지 분리 | 강한 장애, 성능과 보안 격리 | 비용, 백업과 운영 복잡도 증가 |

어느 배치를 쓰든 다른 서비스는 API나 event로 접근한다. 읽기 편의를 위한 direct join을 허용하면 schema 변경, 배포와 장애가 다시 결합된다.

## Polyglot persistence는 결과다

서비스별로 데이터 특성이 정말 다를 때 적합한 저장소를 고를 수 있다는 것이 장점이다. 모든 서비스가 서로 다른 DB를 써야 한다는 뜻은 아니다.

새 저장소를 추가하기 전에 다음 비용을 포함한다.

- backup, restore, migration과 disaster recovery 경험
- driver, connection pool, 보안 patch와 관측
- local 개발과 test 환경
- on-call이 장애를 진단할 수 있는가
- 데이터 이동, 삭제와 감사 요구

기본 paved road로 대부분을 처리하고, 이점이 운영 비용을 넘는 경우만 예외를 둔다.

## 교차 서비스 조회 3가지

### 1. API Composition

composer가 각 소유 서비스의 API를 호출하고 결과를 memory에서 조합한다.

- **적합**: 결과가 작고 fan-out이 제한적이며 최신 원본이 중요할 때
- **장점**: 별도 projection 없이 단순하게 시작
- **비용**: tail latency, 부분 실패, 큰 join과 pagination의 어려움

composer는 gateway, BFF나 별도 query service일 수 있다. 호출 deadline, 제한된 병렬성, partial response와 trace를 계약에 포함한다.

### 2. CQRS Materialized View

각 서비스의 event를 구독해 조회 목적의 projection을 미리 만든다. 화면이나 검색에 맞는 denormalized model을 한 번에 읽는다.

- **적합**: 같은 교차 서비스 조회가 많고 낮은 읽기 지연이 중요할 때
- **장점**: runtime fan-out 제거, query별 index와 독립 확장
- **비용**: consistency window, 중복/순서 처리, rebuild와 schema evolution

projection은 원본이 아니며 직접 수정하지 않는다. event history나 source API에서 다시 만들 수 있어야 하고 lag와 마지막 갱신 시점을 관측한다.

### 3. 분석용 복제

운영 요청이 아닌 대규모 분석과 reporting은 CDC나 batch로 warehouse/lake에 복제한다. 사용자 요청마다 운영 서비스 API를 순회하는 대신 분석용 모델에서 join한다.

- 개인정보와 삭제 전파
- source별 watermark와 freshness
- schema change와 backfill
- 운영 DB에 주는 추출 부하

를 별도 데이터 계약으로 관리한다.

## 선택 표

| 질문 | API Composition | Materialized View | 분석용 복제 |
|---|---|---|---|
| 최신성 | 원본 호출 시점 | 지연 허용 | 더 긴 지연 허용 |
| 데이터 크기 | 작음 | 읽기 모델 크기 | 대규모 |
| query 반복 | 낮음/중간 | 높음 | 탐색적/집계 |
| 쓰기 경로 영향 | 없음 | event 발행 필요 | CDC/batch 필요 |
| 장애 시 | dependency 부분 실패 | stale view 가능 | 운영 요청과 분리 |

같은 시스템에서도 화면별로 다른 방식을 쓸 수 있다.

## 트랜잭션과 조회를 분리해서 생각하기

여러 서비스를 조회할 수 있다는 것과 여러 서비스의 불변식을 원자적으로 지키는 것은 다른 문제다.

- 한 aggregate의 강한 불변식은 가능하면 한 서비스와 로컬 ACID transaction 안에 둔다.
- 여러 소유자의 상태 변경은 [[Saga-Pattern|Saga]]의 단계, 보상과 terminal state로 모델링한다.
- DB 변경과 event 발행의 dual write는 [[Transactional-Outbox|Transactional Outbox]]로 연결한다.
- 소비자는 중복과 순서 역전에 안전해야 한다.

C QRS는 읽기와 쓰기 모델을 분리하는 선택이며 Event Sourcing이나 별도 DB가 필수는 아니다. Event Sourcing도 조회 성능을 자동으로 높이지 않으며 projection 운영 비용이 추가된다.

## 복구 계약

- projection의 source와 deterministic rebuild 절차
- replay 중 live event와의 경계
- poison event 격리와 수동 보정 감사 기록
- consumer lag, oldest event age와 reconciliation 지표
- schema version과 upcaster/compatibility 정책
- 원본과 projection 차이를 탐지하는 정기 대사

최종 일관성은 언젠가 알아서 맞는다는 가정이 아니라, **수렴 메커니즘과 지연 상한을 운영하는 계약**이다.

## 출처

- [Chris Richardson, Database per service](https://microservices.io/patterns/data/database-per-service.html)
- [Chris Richardson, API Composition](https://microservices.io/patterns/data/api-composition.html)
- [Microsoft, Materialized View pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/materialized-view)
- [Dowon Lee 강사, Polyglot Persistence](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=290716)
- [Dowon Lee 강사, Database per Service](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=290719)
- [Dowon Lee 강사, Cross Service Queries](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=290724)
- [Dowon Lee 강사, CQRS 패턴](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=290725)

## 관련 문서

- [[Microservice-Service-Decomposition|마이크로서비스 서비스 분해]]
- [[Event-Driven-Architecture|Event-Driven Architecture]]
- [[Event-Sourcing|Event Sourcing]]
- [[CAP-Theorem|CAP 정리]]
- [[Sharding|샤딩]]
