---
tags: [fit, interview, questions, tech, scalability]
status: done
category: "Interview - Fit"
aliases: ["Common Interview Questions Tech Scale", "기술 질문 확장성"]
---

# 자주하는 면접 질문 — 1차 기술 질문 (확장성, 아키텍처)

트래픽 폭증, 동시성, 대용량 조회, 도메인 결합, 분산 검색 등 **확장성과 아키텍처 설계를 묻는 1차 기술 질문** 5개 + 공통 답변 원칙.

---

## Q5. 초기 DAU 1만, 모바일 출시로 사용자 폭증

> 초기 DAU 만명 단위의 서비스가 모바일 앱을 출시하면서 사용자가 폭발적으로 늘어나고 있는 상황입니다. 서버 측면에서 예상되는 현상과 조치 방법에 대해서 설명해주세요.

**답변 골격: 예상 현상**
- **응답 지연 → Timeout** → 연쇄 장애
- **DB Connection Pool 고갈** → 쿼리 대기 폭증
- **CPU/메모리 포화** → GC pause 증가
- **스레드 풀/이벤트 루프 블로킹** (Node.js의 경우)
- **캐시 미스율 증가** (신규 유저 많음 → 워밍업 안 됨)
- **외부 API Rate Limit 초과**

**조치 방법 (단기 → 장기)**
1. **즉시**: 병목을 측정한 뒤 WAS를 스케일 아웃하고 CDN 캐시 TTL을 조정. DB가 읽기 병목이며 stale read를 허용할 때만 리드 레플리카를 추가하고, read-after-write는 primary로 고정
2. **단기**: 측정된 핫 읽기 경로 중 stale read를 허용하는 곳에만 Cache Aside 적용, 캐시 무효화 설계, N+1 쿼리 제거, Connection Pool 튜닝
3. **중기**: 비동기 처리 전환 (Kafka/SQS로 오프로딩), 핫 경로 프로파일링
4. **장기**: 읽기/쓰기 분리, 샤딩, 도메인 분리(MSA), 오토스케일링 규칙 정교화

**운영 관점**
- 오토스케일링 임계값 하향
- Rate Limiting / Circuit Breaker 도입
- 장애 리허설 (Chaos Engineering)
- 모니터링 경보 임계값 재조정

**판단 기준**: 실제 RPS, p95/p99, 오류율, DB 대기와 외부 API quota를 먼저 측정해 병목을 특정하고, 데이터 신선도와 read-after-write 요구를 확인한 뒤 캐시나 리드 레플리카를 선택한다.

**대안과 트레이드오프**: 캐시와 리드 레플리카는 읽기 부하를 낮추지만 stale read를 허용하는 경로에만 쓴다.

**꼬리질문**: 스케일 아웃 전에 어떤 지표가 병목의 위치를 보여주는가?

---

## Q6. 기프티콘 한정 이벤트 아키텍처 (동시성 + 재고 소진)

> 특정 상품의 구매 이력이 있는 회원에게 설문을 요청하고 제출 시 스타벅스 기프티콘을 자동 지급합니다. 하루 동안 진행되고 오전 9시 정시에 오픈, 기프티콘 소진 시 종료되는 이벤트의 아키텍처를 어떻게 설계할까요?

**답변 골격: 핵심 요구사항 분해**
- **폭발적 동시 접근** (오픈 시각 직후 쏠림) — 초당 수만 TPS는 요구사항과 과거 지표를 확인하기 전의 가정
- **한정 수량** (재고 정확도 필요 — 초과 지급 불가)
- **중복 지급 방지** (한 회원 1회)
- **외부 API 의존** (기프티콘 발송 서비스)
- **감사(Audit) 로그 필수** (판매사 계약)

**아키텍처 구성 요소**

1. **기본 접수 경로**: 구매 이력을 확인한 뒤 하나의 DB transaction에서 조건부 재고 차감, 참여 행, outbox 행을 함께 확정
   - `UNIQUE(event_id, user_id)`와 안정적인 Idempotency Key(`event_id:user_id`)로 먼저 참여 행 insert를 시도. 중복이면 rollback하고 기존 결과를 반환
   - 신규 참여에만 `UPDATE event_inventory ... SET remaining = remaining - 1 WHERE event_id = ? AND remaining > 0`을 실행하고, 한 행을 갱신한 경우에만 진행
   - 참여 상태를 `accepted`로 저장하고 같은 transaction에 지급 요청 outbox 행을 insert. 재고 부족이면 transaction 전체를 rollback
2. **실제 지급 (비동기)**: Outbox publisher가 Kafka/SQS에 적어도 한 번 전달하고, provider가 지원하면 consumer는 같은 Idempotency Key로 외부 기프티콘 API를 호출. 지원하지 않으면 지급 상태 조회와 대사 절차로 중복과 불명확한 결과를 닫음
   - 성공하면 `issued`, 재시도 중이면 `retrying`, 최종 실패면 `failed` 상태를 남김
   - 재시도 횟수 제한과 DLQ를 두고, `accepted`인데 `issued`가 아닌 건을 주기적으로 대사해 재발행 또는 운영자 처리
3. **진입 제어는 선택 사항**: peak RPS, DB lock wait, connection pool, 외부 API quota를 측정해 DB 접수 경로가 버티지 못할 때만 Redis 기반 대기열 또는 admission control을 추가. Redis는 도착을 평탄화할 뿐 DB 재고와 원자적으로 묶지 않으며, 최종 재고 정본은 DB transaction
4. **모니터링**: 남은 재고, transaction 충돌, outbox lag, `accepted/issued/failed` 수, DLQ와 대사 지연을 대시보드와 경보로 관리

**대안과 트레이드오프**
- 기본 DB transaction은 재고와 중복 접수의 정합성이 명확하지만 같은 재고 행의 경합이 처리량을 제한할 수 있음
- 측정된 병목이 있을 때만 대기열이나 admission control로 접수량을 조절. 이것은 정합성 수단이 아니라 부하 완화 수단
- 메시지와 외부 지급은 적어도 한 번 처리될 수 있으므로 Idempotency Key, 상태, 재시도와 대사가 필요

**판단 기준**: 재고 정합성, 중복 지급 방지와 외부 지급 지연을 분리해 각 경로의 실패 처리를 설계한다.

**꼬리질문**: 외부 지급 서비스가 Idempotency Key를 지원하지 않으면 어떤 대사 절차가 필요한가?

> 참고: [[Delivery-Semantics|Delivery Semantics]], [[Idempotency-Key|Idempotency Key]], [[At-Least-Once|At-Least-Once]], [[Virtual-Waiting-Room-Architecture|가상 대기열 아키텍처]]

---

## Q7. 억 단위 데이터 조회 성능 개선

> 이커머스에서 나의 구매 목록을 조회하는 기능이 있다고 할 때, 초반에는 데이터가 적어 페이지 로딩이 빠르지만 시간이 지나 억 단위 데이터가 생성되면 조회할 때마다 느려집니다. 어떻게 개선할 수 있을까요?

**답변 골격: 개선 단계 (저비용 → 고비용)**

1. **SQL 최적화**: 실행 계획 분석 (EXPLAIN ANALYZE), N+1 제거, 불필요한 JOIN 제거, 필요한 컬럼만 SELECT
2. **인덱스 최적화**: 복합 인덱스 (회원ID + 주문일시 DESC), Covering Index, 인덱스 선택도/카디널리티 점검
3. **페이지네이션 전략 변경**: OFFSET 대신 **Cursor 기반** (`OFFSET 100000`은 앞 10만 건을 전부 읽는다 → 느림)
4. **캐싱**: Redis에 최근 구매 목록 캐싱 (TTL + Cache Aside)
5. **읽기 Replication**: 읽기 전용 복제본으로 부하 분산
6. **스케일 업**: DB 스펙 업그레이드 (CPU, RAM, IOPS)
7. **구조 개선**: 조회용 테이블 비정규화 (CQRS), Materialized View / Summary Table
8. **파티셔닝**: 회원 단위 / 날짜 단위 파티션 (최근 데이터만 뜨거움)
9. **샤딩**: 회원 단위 수평 분할 (라우팅 복잡도 증가)

**별도 데이터 모델 분기**: NoSQL은 위 단계를 모두 소진한 뒤의 10단계가 아니다. 데이터 모델과 접근 패턴, 일관성 및 확장 요구가 DynamoDB/Cassandra 같은 모델에 더 맞는지 초기에 별도로 비교한다.

**답변 요령**: RDBMS 경로에서는 측정 결과에 따라 저비용 옵션부터 검토하고 각 트레이드오프를 설명한다. 근거 없이 "샤딩부터 하자"는 답변은 감점.

**판단 기준**: 실제 쿼리의 실행 계획, 반환 행 수와 접근 패턴을 보고 인덱스와 페이지네이션부터 판단한다.

**대안과 트레이드오프**: Cursor는 깊은 페이지의 성능과 일관성에 유리하지만 임의 페이지 이동과 정렬 조건에 제약이 있다.

**꼬리질문**: 복합 인덱스의 컬럼 순서는 어떤 조건과 정렬을 기준으로 정하는가?

> 참고: [[데이터&저장소(Data&Storage)|데이터&저장소]], [[성능&확장성(Performance&Scalability)|성능&확장성]]

---

## Q8. 강결합 구조에서 트래픽 몰림 문제와 개선

> 이커머스에서 상품을 결제할 때, 주문과 결합된 여러 도메인이 있습니다. 주문 데이터 저장 이후 결제, 재고 업데이트, 배송 준비, 구매 완료 메일 발송 등의 작업이 모두 강결합일 경우, 트래픽이 몰리면 예상되는 문제점과 해결 방법은?

**답변 골격: 예상 문제점**
- **응답 지연** — 결제 후 메일 발송까지 모두 동기 대기 → 사용자 체감 지연
- **연쇄 장애** — 메일 서버 장애 시 주문 자체가 실패
- **분산 트랜잭션 복잡도** — 여러 도메인의 롤백 처리 어려움
- **확장성 한계** — 모든 도메인이 같은 인스턴스에서 실행 → 독립 스케일 불가
- **DB 락 경합** — 재고 업데이트 + 주문 저장이 한 트랜잭션 안에 있으면 락 지속 시간 증가

**해결 방법**
1. **이벤트 기반 아키텍처로 전환**: 요청 경로에서는 주문을 `PENDING`으로 저장하고, 결제와 재고를 비동기 처리해 둘 다 성공하면 `CONFIRMED`, 실패하면 `CANCELED`와 보상 처리. 배송과 메일은 확정 후 실행
2. **메시지 브로커 도입** (Kafka / RabbitMQ / SQS): 도메인 간 느슨한 결합 (Event-Driven)
3. **Transactional Outbox 패턴**: 주문과 outbox 행을 한 DB 트랜잭션으로 저장. 별도 publisher는 재시도로 적어도 한 번 전달하며 중복 발행될 수 있으므로 consumer를 멱등하게 처리
4. **SAGA 패턴**: 분산 트랜잭션 대신 보상 트랜잭션으로 일관성 확보
5. **Dead Letter Queue (DLQ)**: 실패한 이벤트를 격리하여 재처리
6. **멱등성 보장**: At-Least-Once 전달 시 중복 처리 방지 (Idempotency Key)

**아키텍처 예시**
```
[Order API] → [DB: Order PENDING + Outbox] → [Publisher] → [Payment / Inventory]
  → [Saga: CONFIRMED 또는 CANCELED] → [Shipping / Notification]
```

**판단 기준**: 요청에서 확정 결과를 줄지 접수 상태를 줄지, 결제와 재고의 허용 지연 및 보상 경계를 먼저 정한다.

**대안과 트레이드오프**: 동기 호출은 즉시 결과를 주지만 장애 전파와 결합이 커지고, 비동기 처리는 복원력 대신 상태 추적과 보상 처리가 필요하다.

**꼬리질문**: 결제는 성공했지만 재고 이벤트가 실패한 경우 어떤 상태와 보상 흐름을 설계하는가?

> 참고: [[Transactional-Outbox|Transactional Outbox]], [[Messaging-Patterns|Messaging Patterns]], [[Monolith-vs-Microservice|Monolith vs Microservice]]

---

## Q9. OpenSearch replica와 검색 fan-out

> Primary shard가 3개이고 각 shard마다 replica가 1개씩 있습니다. 전체 shard copy는 6개입니다. 일반적인 검색 요청 한 번은 3개와 6개 중 몇 개의 shard copy를 검색할까요? Replica가 검색 트래픽을 분산한다는 의미와 함께 설명해주세요.

**질문 의도**
- Logical shard와 shard copy를 구분하는가
- Replica의 읽기 확장이 요청 하나의 중복 검색이 아니라 동시 요청의 분산이라는 점을 이해하는가
- Shard별 지역 순위와 coordinator의 전역 병합을 연결할 수 있는가

**핵심 답변**

> 일반적인 검색 요청은 3개의 shard copy를 검색합니다. Primary shard 3개가 서로 다른 데이터 파티션이고, 각 replica는 해당 primary와 같은 logical shard의 복사본이기 때문입니다. Coordinator는 logical shard마다 primary 또는 replica 중 한 copy를 선택합니다. Replica는 요청 하나의 검색 대상을 6개로 늘리는 것이 아니라, 여러 검색 요청을 서로 다른 copy에 분산해 전체 검색 처리량과 가용성을 높입니다. 각 copy가 반환한 지역 top K는 coordinator가 전역 top K로 병합합니다.

**핵심 근거**

- Primary와 replica는 같은 logical shard의 복사본이므로 둘 다 검색하면 동일한 데이터에 중복 작업을 하게 된다.
- Replica는 서로 다른 검색 요청을 여러 shard copy에 분산하고, 장애 시 가용한 copy로 요청을 보낼 수 있게 한다.
- 각 shard copy가 지역 top K를 반환하면 coordinator가 이를 전역 top K로 병합한다.

**흔한 오답**

- `6개를 모두 검색한다`: Replica가 검색 트래픽을 분산한다는 말을 요청 하나가 모든 copy를 검색한다는 뜻으로 오해한 답이다. Replica는 같은 logical shard의 중복 데이터이며, 일반적인 검색은 그중 한 copy만 선택한다.

**꼬리질문**
- Replica 수를 늘리면 검색 처리량과 색인 비용은 어떻게 달라지는가?
- Primary 장애 시 replica에는 어떤 변화가 생기는가?
- Replica가 snapshot을 대신할 수 없는 이유는 무엇인가?
- Custom routing을 사용하면 검색 대상 logical shard 수는 어떻게 달라지는가?

> 학습 정본: [[OpenSearch-Architecture#GET과 Search의 읽기 경로|OpenSearch GET과 Search의 읽기 경로]]

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
- [AWS Prescriptive Guidance, Transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- [OpenSearch Documentation, Search shard routing](https://docs.opensearch.org/latest/search-plugins/searching-data/search-shard-routing/)

## 관련 문서
- [[Common-Interview-Questions|자주하는 면접 질문 (인덱스)]]
- [[Common-Interview-Questions-Tech-Basics|기술 질문 — 기본]]
- [[Common-Interview-Questions-Behavioral|Behavioral 질문]]
- [[Common-Interview-Questions|Interview Fit]]
