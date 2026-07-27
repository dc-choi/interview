---
tags: [fit, interview, yunhoe]
status: done
category: "Interview - Fit"
company: "윤회주식회사 (CARE IDⓒ)"
aliases: ["Yunhoe 1st Tech 이력서 질문", "윤회 1차 이력서 기반 기술 질문 (Q1~Q4)"]
---

# 윤회 1차 기술 — 이력서 기반 기술 질문 (Q1~Q4)

## 1. 이력서 기반 기술 질문

### Q1. IoT 수천 대 동시 재고 데이터 → DB Lock 정합성

> 마스터: [[My-Tech-Cards|카드 1]], [[My-Tech-Cards-Extended|심화]] (보강 vault는 마스터 끝 카테고리 인덱스)

- 시나리오: 여러 IoT 장비가 같은 SKU, 창고에 거의 동시에 입출고 이벤트를 보낼 때 재고 카운트가 깨지는 문제
- 해결: **비관적 잠금(SELECT … FOR UPDATE)** + 트랜잭션 범위 최소화 + 인덱스 키로 락 범위 좁히기
- 왜 낙관적 잠금이 아니었나: 충돌이 일상적 → 낙관적 잠금이면 재시도 비용이 커지고, 사용자가 아닌 IoT 자동 트래픽이라 재시도 정책을 어디에 둘지 모호
- **DPP 매핑**: 같은 제품 ID에 대해 생산, 유통, 폐기 이벤트가 비동기로 들어올 때 동일한 정합성 문제. tenant_id × productId × eventType 단위 락이 출발점
- 꼬리:
  - "데드락은 어떻게?" → 락 획득 순서 고정(SKU id ASC), 트랜잭션 짧게, 데드락 발생 시 재시도(짧은 backoff)
  - "Read Replica 사용 시 정합성?" → 쓰기 직후 강한 일관성 필요한 조회는 Primary로 강제, 분석성 조회만 Replica
  - "락 대신 idempotency key는?" → 동일 이벤트 중복 수신엔 idempotency, 서로 다른 이벤트의 충돌엔 락 — 같이 씀

### Q2. EventBridge + SQS 이벤트 아키텍처 (수기 발주 자동화)

> 마스터: [[My-Tech-Cards|카드 2]], [[My-Tech-Cards-Extended|상태 머신 8단계, visibility timeout 6배 룰]], [[Event-Driven-Architecture|EDA 결정 프레임워크]]
> ⚠️ **윤회 톤 가드**: 윤회 스택 = **RabbitMQ + AWS-SNS/SQS** (Kafka, EventBridge 명시 없음). MSK 비교 사례 강조 X (이직 사유에 한 줄만), 본 미팅 톤은 **SNS/SQS, RabbitMQ 비교**로.

**★★★★ 오프닝 멘트 (윤회 핵심 카드 — 단순 EventBridge 자랑 X, EDA 프레임워크 사고)**:
> "이벤트 기반 아키텍처는 단일 패턴이 아니라 **신뢰성, 결합도, 일관성 3축 트레이드오프 + 8개 결정 층** 프레임워크로 봅니다. 본업으로는 **층 2~5 + 7 중간 지점** (Outbox로 발행 신뢰성, Idempotency Key, DLQ로 소비 신뢰성, 사실 기반 이벤트, MessageGroupId, Event Store + 상태 혼합)까지 다뤘습니다. 본격 Event Sourcing, 다중 서비스 Saga 운영은 없습니다."

→ 면접관 깜짝 효과. 본인 깊이 정확히 빠짐 (운영 경험 X 영역 정직). **DPP는 층 7까지 적합한 도메인**이라는 매핑 자연스럽게 박힘.

- 구조: 도메인 이벤트(재고 임계치 도달) → EventBridge 규칙 → 채널별 SQS(카톡/이메일/내부 알림) → 워커(ECS Fargate) → 외부 API
- 채널별 DLQ + 재시도 정책 차등: 카톡(잘못된 번호는 점진 재시도 후 포기), 이메일(무조건 재시도), 최종 실패 → 긴급 알림 + 수동 처리 큐
- MSK(Kafka) 대비 선택 근거: 운영 인력 부족 + 트래픽 규모에서 EventBridge+SQS의 관리 부담, 비용이 압도적으로 유리
- **DPP 매핑**: 제품 상태 변화(생산, 검수, 출고, 폐기, 재활용 입고, SRF 처리)가 곧 도메인 이벤트. 브랜드사, 재활용업체, 소비자 알림으로 fan-out 그대로 매핑
- 꼬리:
  - "RabbitMQ vs SNS/SQS 어떻게 분리?" → **RabbitMQ**는 in-cluster 내부 워크로드 (라우팅, exchange 다양, 낮은 지연), **SNS/SQS**는 AWS 매니지드 fan-out, DLQ, 자동 스케일. 윤회 스택은 둘 다 보유 — 도메인 이벤트는 SNS, 내부 작업 큐는 RabbitMQ 추정 (역질문 후보)
  - "EventBridge 대신 SNS만 쓸 수도?" → 단순 fan-out이면 SNS, 규칙 기반 라우팅, 스키마 레지스트리, 외부 SaaS 통합엔 EventBridge. **윤회는 EventBridge 미명시 → 라우팅 규칙은 어떻게?** (역질문 후보)
  - "메시지 순서 보장은?" → SQS FIFO + MessageGroupId(예: tenantId/productId 단위)로 순서 보장. RabbitMQ면 single consumer per queue
  - "exactly-once?" → 사실상 at-least-once. 소비자에서 idempotency key로 중복 제거
  - "Kafka가 더 맞는 순간은?" → 이벤트 보존, 재처리 윈도우가 길고, 다소비자 스트림 처리가 핵심일 때. 윤회 현 단계엔 과투자

### Q3. 슬로우 쿼리 99.3% 개선 (복합 인덱스 + 쿼리 재작성)

> 마스터: [[My-Tech-Cards|카드 3]], [[My-Tech-Cards-Extended|EXPLAIN 컬럼, PG BRIN/GIN]]

- 발견: APM, DB slow log로 P99 응답이 튀는 엔드포인트 식별 → EXPLAIN으로 풀스캔/필터 단계 비효율 확인
- 조치: 카디널리티 높은 컬럼 앞쪽으로 둔 복합 인덱스, 커버링 인덱스로 PK 룩업 제거, 일부 쿼리는 분리 + 애플리케이션 조립
- 검증: Before/After P99, QPS 비교, 인덱스로 인한 쓰기 비용 모니터링
- **DPP 매핑**: 제품 ID 단위 시계열 이벤트 조회가 핵심 쿼리 — (tenant_id, product_id, event_time DESC) 같은 복합 인덱스가 1순위 후보
- 꼬리:
  - "인덱스 추가의 쓰기 페널티?" → 인덱스 수, 페이지 분할 빈도 모니터링, 쓰기 핫스팟이면 파티셔닝 검토
  - "EXPLAIN ANALYZE를 어떻게 읽나?" → rows 추정 vs 실제, filtered %, type(ref/range/all), Extra(Using filesort/temporary) 위주
  - "PostgreSQL이라면?" → EXPLAIN (ANALYZE, BUFFERS), pg_stat_statements, BRIN/GIN 등 PG 고유 인덱스 활용 가능

### Q4. MongoDB → MySQL 마이그레이션

> ⚠️ **윤회 보강**: 윤회 스택 = **PostgreSQL + MongoDB 혼용** (채용공고). 본인은 MongoDB→MySQL 마이그레이션 경험 — **MongoDB 운영 경험은 있음** + **PG vs MySQL 차이 숙지**. 윤회는 MongoDB 도입 이유, 역할 모름 → 역질문 후보.

- 배경: 스키마 진화에 따른 문서 모델의 일관성, 조인 비용이 커짐 → 관계형으로 정규화
- 전략: 듀얼 라이트 단계 → 백필 → 읽기 점진 전환 → 쓰기 전환 → 구 시스템 제거. 각 단계 검증 쿼리, 차이 리포트로 사이드이펙트 잡음
- **DPP 매핑**: 표준이 변하면(EU CEN/CENELEC) 데이터 모델이 흔들릴 수 있음 → 마이그레이션 인프라(듀얼 라이트, 백필, 검증)는 핵심 자산
- **윤회 MongoDB 매핑 추정**: 제품 상세, DPP 메타데이터(소재 구성, 공급망 단계, 증빙 사진/문서)가 **스키마 진화 빈번** + **계층 구조 깊음** → MongoDB가 자연스러움. PostgreSQL은 트랜잭션, 관계형 핵심 도메인(테넌트, 계약, 결제, 이벤트 스토어). **역질문**: "MongoDB는 DPP 메타데이터, 외부 표준 데이터 흡수에 쓰이는지, 핵심 도메인엔 PG인지?"
- 꼬리:
  - "다운타임 없이 어떻게?" → 듀얼 라이트 + 읽기 라우팅 비율 조절. 트랜잭션 경계 다르면 보상 트랜잭션(Saga)으로 정합성 회복
  - "스키마가 바뀔 때 다운스트림 영향은?" → 이벤트 스키마 레지스트리 + 버전 관리. 소비자가 N-1 버전을 한동안 같이 지원
