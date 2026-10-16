---
tags: [architecture, microservices, data-ownership, database-per-service, api-composition, cqrs]
status: done
verified_at: 2026-10-14
category: "Architecture - 진화"
aliases: ["Microservice Data Ownership", "Database per Service", "Cross Service Query", "CQRS Read Path Split"]
---

# 마이크로서비스 데이터 소유권과 교차 서비스 조회

서비스가 독립적으로 배포되려면 자기 상태의 쓰기 규칙도 소유해야 한다. Database per Service는 서버를 서비스 수만큼 사는 것이 아니라 **다른 서비스가 소유 데이터를 직접 읽고 쓰지 못하게 계약으로 캡슐화하는 것**에 초점을 둔다.

## 논리 소유권과 물리 배치

| 배치 | 격리 방법 | 장점 | 한계 |
|---|---|---|---|
| shared server, private tables | 서비스별 계정과 table grant | 운영 부담이 가장 낮음 | schema 경계가 약하면 우회하기 쉬움 |
| schema per service | schema와 계정 분리 | 소유권이 선명하고 shared server 효율 유지 | server 장애와 자원 경쟁 공유 |
| database/server per service | 인스턴스와 자원까지 분리 | 강한 장애, 성능과 보안 격리 | 비용, 백업과 운영 복잡도 증가 |

어느 배치를 쓰든 다른 서비스는 API나 event로 접근한다. 읽기 편의를 위한 direct join을 허용하면 schema 변경, 배포와 장애가 다시 결합된다.

## 공유 테이블의 소유자를 세우는 위임

여러 기능이 같은 테이블을 함께 수정했다면 먼저 한 서비스가 쓰기 규칙을 소유하도록 정하고, 다른 서비스의 수정 요청은 그 소유자의 API나 command로 위임할 수 있다. 항공편 검색, 예약과 추적이 공유하던 데이터에서 하나의 소유자를 지정하는 방식이다. 물리 DB를 어디에 두는가와 소유자를 누구로 정하는가는 별개 결정이다.

직접 테이블 의존은 줄지만 동기 위임에는 원격 호출 지연과 가용성 결합이, 비동기 위임에는 처리 지연과 중복 대응이 생긴다. 소유 API의 하위 호환과 허용할 호출 수를 정하고, 소유자가 중앙 만능 서비스가 되면 테이블 분할이나 서비스 재결합도 검토한다. 위임만으로 독립 배포가 자동 보장되지는 않는다.

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

## CQRS의 분리 범위를 선택한다

| 분리 범위 | 얻는 것 | 비용과 조건 |
|---|---|---|
| command/query 처리 경로만 구분, 같은 모델과 DB | 책임 구분부터 시작 | 클래스 이름만 나누면 모델 분리나 성능 개선은 얻지 못함 |
| 읽기와 쓰기 모델을 나누고 같은 DB 사용 | 조회에 맞춘 DTO, 쿼리와 index | 같은 DB 자원 경쟁, 별도 projection이면 갱신 방식 결정 |
| 읽기와 쓰기 저장소까지 분리 | 부하에 맞춘 독립 확장과 저장소 선택 | 동기화, 재구축과 stale read 처리 |

이는 도입 범위 비교이며 반드시 순서대로 올라가야 하는 성숙도 단계가 아니다. 같은 DB에서도 projection을 비동기로 갱신하면 지연이 생기므로 저장소 개수만으로 강한 일관성을 판정하지 않는다. 읽기 부하가 크면 읽기 쪽 복제 수를 더 늘릴 수 있고, 양쪽 저장소가 RDBMS인지 NoSQL인지는 요구사항으로 정한다.

동기화는 같은 transaction의 갱신, event/outbox, CDC, scheduler 기반 batch나 대사로 구성할 수 있다. DB trigger는 숨은 결합과 운영 비용을, 수동 갱신은 누락 위험과 감사 요구를 만든다. 이벤트 재생으로 상태를 만드는 [[Event-Sourcing]]은 별도 선택이며 조회마다 전체 이력을 재생한다면 snapshot과 projection 비용도 검토한다.

## 선택 표

| 질문 | API Composition | Materialized View | 분석용 복제 |
|---|---|---|---|
| 최신성 | 원본 호출 시점 | 지연 허용 | 더 긴 지연 허용 |
| 데이터 크기 | 작음 | 읽기 모델 크기 | 대규모 |
| query 반복 | 낮음/중간 | 높음 | 탐색적/집계 |
| 쓰기 경로 영향 | 없음 | event 발행 필요 | CDC/batch 필요 |
| 장애 시 | dependency 부분 실패 | stale view 가능 | 운영 요청과 분리 |

같은 시스템에서도 화면별로 다른 방식을 쓸 수 있다.

## 탐색 화면과 거래 단계의 읽기 경로를 나눈다

같은 상품 데이터라도 화면의 일관성 요구에 따라 읽는 곳을 다르게 둔다. 조회가 쓰기보다 훨씬 많고 약간의 지연을 허용하는 탐색 화면은 projection으로 보내고, 최신 값이 결과를 바꾸는 거래 단계는 소유 서비스의 원본을 읽는다.

| 경로 | 예 | 읽는 곳 | 이유 |
|---|---|---|---|
| 탐색 | 상품 목록, 상세, 검색 결과 | 변경 이벤트로 갱신한 projection, 캐시와 검색 색인 | 반복 조회를 원본 DB와 소유 서비스 API에서 떼어 내 따로 확장한다 |
| 거래 | 장바구니, 주문서, 결제 | 소유 서비스 API와 원본 DB | stale read가 가격, 재고와 할인 적용 오류로 이어진다 |

- 원본의 변경 이벤트 하나를 key-value projection과 검색 색인 같은 여러 읽기 모델이 각자 구독할 수 있다. 소비자마다 지연과 실패가 따로 생기므로 lag와 마지막 반영 시점을 읽기 모델별로 관측한다.
- 탐색 화면에서 본 가격과 재고를 거래 단계의 확정값으로 쓰지 않는다. 주문서와 결제 단계에서 원본으로 다시 확인하고, 사용자가 stale 값을 보고 행동했을 때의 안내를 정한다.
- 메시지 브로커와 DB를 하나의 분산 트랜잭션으로 묶기 어려우므로 상태 변경과 이벤트는 [[Transactional-Outbox|outbox]]로 함께 저장하고 projection 소비자는 중복 전달에 안전하게 만든다.
- 탐색 트래픽이 몰려도 원본 DB 자원은 거래 경로에 남는다. CQRS가 막는 것은 원본 DB로 향하는 읽기 부하이며, projection 저장소와 캐시의 용량 계획은 따로 필요하다.

### 사례: 신선식품 커머스의 전시 조회 분리 (발표 기준, 2021)

컬리는 IDC에서 AWS로 리프트 앤 시프트한 모놀리식 커머스를 오토 스케일링, 읽기 복제본 증설과 슬로 쿼리 튜닝으로 버텼다. 마케팅의 쿠폰 대량 발행과 푸시, 휴면 회원 조회 이벤트처럼 백오피스 작업이 만든 DB 부하가 전체 장애로 번지자 도메인 분리와 CQRS로 전환했다.

- 읽고 쓰는 데이터를 기준으로 도메인을 나누고 도메인마다 저장소를 골랐다. Aurora MySQL만 쓰던 구조에서 쿠폰 같은 마케팅 도메인은 Amazon DocumentDB, 상품 전시는 Amazon DynamoDB로 옮기고, 새 서비스는 연동 계층을 두고 레거시와 통합했다. 분리 뒤 쿠폰 장애는 쿠폰 기능 안에 머물렀다.
- 백오피스에서 바꾼 상품 정보는 즉시 관리형 Kafka 이벤트로 발행되고, 소비자가 이를 가공해 DynamoDB 전시 테이블에 적재한다. 사용자 요청은 ElastiCache 캐시나 DynamoDB에서 처리하고, 장바구니와 주문서처럼 높은 일관성이 필요한 경로만 API로 원본 DB를 조회한다.
- 전체 트래픽의 40% 이상을 차지한 검색 경유 상품 접근도 검색 엔진이 같은 상품 변경 이벤트를 받아 반영하게 해, 검색 결과 조회 때 원본 DB를 거치지 않게 했다.
- 전환 뒤 상품 정보 API 지연이 100~800ms 사이에서 흔들리던 상태에서 100ms 이하로 내려갔다고 발표했다.
- 구조 전환 전에는 주문 마감 시각에 부하가 큰 API만 ALB에서 미리 만든 경량 API(일부 개인화와 무거운 쿼리 기반 전시를 뺀 버전)로 다시 연결해, 전체 부하를 낮춘 상태로 최소한의 결제와 복구를 진행하는 [[External-Service-Resilience#Graceful Degradation|기능 저하]]를 운영했다.

## 트랜잭션과 조회를 분리해서 생각하기

여러 서비스를 조회할 수 있다는 것과 여러 서비스의 불변식을 원자적으로 지키는 것은 다른 문제다.

- 한 aggregate의 강한 불변식은 가능하면 한 서비스와 로컬 ACID transaction 안에 둔다.
- 여러 소유자의 상태 변경은 [[Saga-Pattern|Saga]]의 단계, 보상과 terminal state로 모델링한다.
- DB 변경과 event 발행의 dual write는 [[Transactional-Outbox|Transactional Outbox]]로 연결한다.
- 소비자는 중복과 순서 역전에 안전해야 한다.

CQRS는 읽기와 쓰기 모델을 분리하는 선택이며 Event Sourcing이나 별도 DB가 필수는 아니다. Event Sourcing도 조회 성능을 자동으로 높이지 않으며 projection 운영 비용이 추가된다.

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
- [Microsoft, CQRS pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- [AWS Prescriptive Guidance, CQRS pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-data-persistence/cqrs-pattern.html)
- [Kurly는 AWS를 어떻게 사용하고 있을까? 성공적 리테일 디지털 트랜스포메이션 사례 — Amazon Web Services Korea](https://www.youtube.com/watch?v=SRmJEZfCHE8)
- [han jeong heon 강사, 저장소 분리, 저장소 공유,위임(API조합)](https://www.inflearn.com/courses/lecture?courseId=328412&unitId=104433)
- [han jeong heon 강사, 분산 트랜잭션 처리(SAGA),CQRS,이벤트 소싱](https://www.inflearn.com/courses/lecture?courseId=328412&unitId=104434)
- [Dowon Lee 강사, [실습 13] CQRS + Event Sourcing 처리 ①](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=290748)
- [Dowon Lee 강사, [실습 14] CQRS + Event Sourcing 처리 ②](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=306269)

## 관련 문서

- [[Microservice-Service-Decomposition|마이크로서비스 서비스 분해]]
- [[Microservice-Database-Decomposition|모놀리식 DB를 서비스별 DB로 나누는 이관]]
- [[Event-Driven-Architecture|Event-Driven Architecture]]
- [[Event-Sourcing|Event Sourcing]]
- [[CAP-Theorem|CAP 정리]]
- [[Sharding|샤딩]]
