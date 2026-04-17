---
tags: [fit, interview, questions, tech, scalability]
status: done
category: "Interview - Fit"
aliases: ["Common Interview Questions Tech Scale", "기술 질문 확장성"]
---

# 자주하는 면접 질문 — 1차 기술 질문 (확장성·아키텍처)

트래픽 폭증·동시성·대용량 조회·도메인 결합 등 **확장성과 아키텍처 설계를 묻는 1차 기술 질문** 4개 + 공통 답변 원칙.

---

## Q5. 초기 DAU 1만, 모바일 출시로 사용자 폭증

> 초기 DAU 만명 단위의 서비스가 모바일 앱을 출시하면서 사용자가 폭발적으로 늘어나고 있는 상황입니다. 서버 측면에서 예상되는 현상과 조치 방법에 대해서 설명해주세요.

**예상 현상**
- **응답 지연 → Timeout** → 연쇄 장애
- **DB Connection Pool 고갈** → 쿼리 대기 폭증
- **CPU/메모리 포화** → GC pause 증가
- **스레드 풀/이벤트 루프 블로킹** (Node.js의 경우)
- **캐시 미스율 증가** (신규 유저 많음 → 워밍업 안 됨)
- **외부 API Rate Limit 초과**

**조치 방법 (단기 → 장기)**
1. **즉시**: 스케일 아웃 (WAS 인스턴스 증설), DB 리드 레플리카 추가, CDN 캐시 TTL 상향
2. **단기**: Redis 캐시 전면 도입, N+1 쿼리 제거, Connection Pool 튜닝
3. **중기**: 비동기 처리 전환 (Kafka/SQS로 오프로딩), 핫 경로 프로파일링
4. **장기**: 읽기/쓰기 분리, 샤딩, 도메인 분리(MSA), 오토스케일링 규칙 정교화

**운영 관점**
- 오토스케일링 임계값 하향
- Rate Limiting / Circuit Breaker 도입
- 장애 리허설 (Chaos Engineering)
- 모니터링 경보 임계값 재조정

---

## Q6. 기프티콘 한정 이벤트 아키텍처 (동시성 + 재고 소진)

> 특정 상품의 구매 이력이 있는 회원에게 설문을 요청하고 제출 시 스타벅스 기프티콘을 자동 지급합니다. 하루 동안 진행되고 오전 9시 정시에 오픈, 기프티콘 소진 시 종료되는 이벤트의 아키텍처를 어떻게 설계할까요?

**핵심 요구사항 분해**
- **폭발적 동시 접근** (오픈 시각 직후 쏠림) — 초당 수만 TPS
- **한정 수량** (재고 정확도 필요 — 초과 지급 불가)
- **중복 지급 방지** (한 회원 1회)
- **외부 API 의존** (기프티콘 발송 서비스)
- **감사(Audit) 로그 필수** (판매사 계약)

**아키텍처 구성 요소**

1. **진입 제어**: CDN + Rate Limiting (IP/UID 단위), 대기열 시스템 (Netflix Zuul 스타일, 또는 Redis Sorted Set 기반 큐)
2. **자격 검증** (구매 이력 + 1회 제한): Redis로 "이미 참여" 플래그 선행 체크 (DB 부하 감소)
3. **재고 차감**
   - **Redis `DECR` 기반 원자적 차감** (INCR/DECR은 싱글 스레드 보장 → 동시성 안전)
   - 음수 체크 후 실패 시 즉시 거절
   - Lua 스크립트로 "참여 여부 확인 + 재고 차감"을 원자적으로 묶음
4. **실제 지급 (비동기)**
   - 차감 성공 시 Kafka/SQS에 지급 요청 발행
   - Consumer가 외부 기프티콘 API 호출 → 실패 시 재시도 / DLQ
   - [[Transactional-Outbox|Transactional Outbox]] 패턴으로 DB 저장과 메시지 발행 원자성 확보
5. **멱등성**: Idempotency Key (회원ID + 이벤트ID) 로 중복 제출 차단
6. **모니터링**: 재고, 참여자, 실패율, 큐 적체 실시간 대시보드

**트레이드오프**
- DB 락 기반 차감은 정확하지만 TPS 한계 → Redis 원자 연산으로 선차감
- "선차감 후 실제 지급" 구조는 실패 시 보상 트랜잭션(재고 복구) 필요
- 강한 일관성 vs 가용성 → **재고만 강하게, 알림/지급은 eventually**

> 참고: [[Delivery-Semantics|Delivery Semantics]], [[Idempotency-Key|Idempotency Key]], [[At-Least-Once|At-Least-Once]]

---

## Q7. 억 단위 데이터 조회 성능 개선

> 이커머스에서 나의 구매 목록을 조회하는 기능이 있다고 할 때, 초반에는 데이터가 적어 페이지 로딩이 빠르지만 시간이 지나 억 단위 데이터가 생성되면 조회할 때마다 느려집니다. 어떻게 개선할 수 있을까요?

**개선 단계 (저비용 → 고비용)**

1. **SQL 최적화**: 실행 계획 분석 (EXPLAIN ANALYZE), N+1 제거, 불필요한 JOIN 제거, 필요한 컬럼만 SELECT
2. **인덱스 최적화**: 복합 인덱스 (회원ID + 주문일시 DESC), Covering Index, 인덱스 선택도/카디널리티 점검
3. **페이지네이션 전략 변경**: OFFSET 대신 **Cursor 기반** (`OFFSET 100000`은 앞 10만 건을 전부 읽는다 → 느림)
4. **캐싱**: Redis에 최근 구매 목록 캐싱 (TTL + Cache Aside)
5. **읽기 Replication**: 읽기 전용 복제본으로 부하 분산
6. **스케일 업**: DB 스펙 업그레이드 (CPU, RAM, IOPS)
7. **구조 개선**: 조회용 테이블 비정규화 (CQRS), Materialized View / Summary Table
8. **파티셔닝**: 회원 단위 / 날짜 단위 파티션 (최근 데이터만 뜨거움)
9. **샤딩**: 회원 단위 수평 분할 (라우팅 복잡도 증가)
10. **NoSQL 검토**: 위 모든 방법으로도 안 되면 → DynamoDB/Cassandra. **마지막 카드**

**답변 요령**: 면접관은 순서 있게 옵션을 나열하고 트레이드오프를 이해하는지 본다. "샤딩부터 하자"는 답변은 감점.

> 참고: [[데이터&저장소(Data&Storage)|데이터&저장소]], [[성능&확장성(Performance&Scalability)|성능&확장성]]

---

## Q8. 강결합 구조에서 트래픽 몰림 문제와 개선

> 이커머스에서 상품을 결제할 때, 주문과 결합된 여러 도메인이 있습니다. 주문 데이터 저장 이후 결제, 재고 업데이트, 배송 준비, 구매 완료 메일 발송 등의 작업이 모두 강결합일 경우, 트래픽이 몰리면 예상되는 문제점과 해결 방법은?

**예상 문제점**
- **응답 지연** — 결제 후 메일 발송까지 모두 동기 대기 → 사용자 체감 지연
- **연쇄 장애** — 메일 서버 장애 시 주문 자체가 실패
- **분산 트랜잭션 복잡도** — 여러 도메인의 롤백 처리 어려움
- **확장성 한계** — 모든 도메인이 같은 인스턴스에서 실행 → 독립 스케일 불가
- **DB 락 경합** — 재고 업데이트 + 주문 저장이 한 트랜잭션 안에 있으면 락 지속 시간 증가

**해결 방법**
1. **이벤트 기반 아키텍처로 전환**: 핵심 트랜잭션(주문 저장 + 결제)만 동기 처리, 재고/배송/메일은 이벤트 발행 후 비동기 처리
2. **메시지 브로커 도입** (Kafka / RabbitMQ / SQS): 도메인 간 느슨한 결합 (Event-Driven)
3. **Transactional Outbox 패턴**: DB 저장과 메시지 발행의 원자성 보장
4. **SAGA 패턴**: 분산 트랜잭션 대신 보상 트랜잭션으로 일관성 확보
5. **Dead Letter Queue (DLQ)**: 실패한 이벤트를 격리하여 재처리
6. **멱등성 보장**: At-Least-Once 전달 시 중복 처리 방지 (Idempotency Key)

**아키텍처 예시**
```
[Order API] → [DB (Order + Outbox)] → [Outbox Publisher] → [Kafka: order.created]
  → [Payment / Inventory / Shipping / Notification Consumer]
```

> 참고: [[Transactional-Outbox|Transactional Outbox]], [[Messaging-Patterns|Messaging Patterns]], [[Monolith-vs-Microservice|Monolith vs Microservice]]

---

## 1차 기술 질문 공통 답변 원칙

1. **꼬꼬무를 유도**하라 — 답변 안에 다음 질문이 나올 키워드를 심어둘 것
2. **대안 검토를 언급**하라 — "A를 선택했지만 B도 고려했다. B는 이런 이유로 탈락"
3. **트레이드오프를 명시**하라 — "이 방법은 X가 장점이지만 Y는 포기한다"
4. **내 경험으로 연결**하라 — 이론만 말하지 말고 실제로 해본 사례 인용
5. **단계적으로 답하라** — 가장 저렴한 방법 → 가장 비싼 방법 순서

---

## 출처
- 개발자 취업과 이직 한방에 해결하기

## 관련 문서
- [[Common-Interview-Questions|자주하는 면접 질문 (인덱스)]]
- [[Common-Interview-Questions-Tech-Basics|기술 질문 — 기본]]
- [[Common-Interview-Questions-Behavioral|Behavioral 질문]]
- [[FIT|Interview Fit]]
