---
tags: [fit, interview, yunhoe]
status: done
category: "Interview - Fit"
company: "윤회주식회사 (CARE IDⓒ)"
aliases: ["Yunhoe 1st Tech", "윤회 1차 기술 질문"]
---

# 윤회 1차 본 미팅 — 예상 기술 질문

> 상위 TOC: [[Interview-Prep-Yunhoe-1st|윤회 1차 본 미팅 준비]]

대표 직접 면접이라 코드 디테일보다 **운영·아키텍처·도메인 적용**의 깊이로 들어올 가능성이 큼. 단, **백엔드 동료님 또는 CTO CTO (AI/ML, ESG 스타트업 CTO 5년)**가 옵저버로 들어올 수 있으니 코드 레벨 꼬리 질문 대비 필수.

## 0. 채용공고 "주요 업무" 정밀 매핑 (5/19 갱신)

본 미팅에서 받을 기술 질문은 아래 주요 업무 키워드 기반:

### DPP Core 시스템
- **UID 발행·관리** → 카드 1 DB Lock + 분산 ID(UUIDv7·ULID·서명) — Q6 답변
- **제품 데이터 스키마 (EU ESPR 호환)** → MongoDB+PostgreSQL 혼용 + 스키마 진화 — Q4·C2 역질문
- **QR 코드 API** → 발급/검증 stateless 설계 (서명·키 회전·캐싱) — Q6·Q10

### 제품 순환 추적
- **상태 전이 설계** → 카드 2 EventBridge+SQS + Q8 생애주기 상태머신 (이벤트 소싱·SCD Type 2)
- **역할 기반 접근제어(RBAC)** → 카드 7 클린 아키텍처 + 멀티테넌트 권한 가드 — Q5
- **감사 추적** → 이벤트 스토어 + Snapshot 패턴 (불변 이력) — Q8
- **EPR 지표 집계** → 카드 3 슬로우 쿼리 + 시계열 인덱스 + OLAP(ClickHouse·집계 read model) 검토

### 인프라·운영
- **멀티테넌트 SaaS** → Q5
- **API 게이트웨이** → ALB + 인증·rate limit·CORS — 카드 6
- **모니터링** → 카드 5 Grafana/Prometheus/Loki + Sentry

## 0-1. ★ 프론트엔드 협업 — schema-first 패턴 (Yeliin LinkedIn 기반, 5/19 갱신)

프론트엔드 개발자 (프론트엔드 개발자, 단독 F/E)이 이미 정착시킨 패턴 — 본인 합류 시 백엔드 API 설계가 이걸 받쳐야 함. **본 미팅에서 자연스럽게 언급하면 강력 시그널** (협업 인지 + 실용성).

### Yeliin의 프론트엔드 패턴
- **RHF + Zod + SSOT field registry** (schema-driven 폼) — 백엔드 스키마와 1:1 매칭
- **SDUI (Server-Driven UI) 엔진** — 백엔드가 UI 메타데이터 함께 반환 → 재배포 없이 UI 변경
- **TanStack Query queryOptions 패턴 (70+ usages)** — 백엔드 API 명세가 type-safe해야
- **i18n 2,700+ keys, 4 languages** — 백엔드 에러 메시지·enum도 i18n 키 기반
- **schema-first 백엔드 병렬 개발 → 개발 사이클 50% 단축**

### 백엔드 측에서 받쳐야 할 설계
- **Zod 스키마 ↔ Prisma/TypeORM 스키마 ↔ OpenAPI 스펙 단일 출처** — `zod-to-openapi`·`prisma-zod-generator` 등으로 SSOT 자동 생성
- **SDUI 메타데이터 응답 패턴** — `{ data, ui: { fields, layout, validation } }` 구조
- **type-safe API** — tRPC 또는 `ts-rest`·OpenAPI codegen
- **i18n 호환 에러 응답** — `{ code: 'VALIDATION_ERROR', i18nKey: 'errors.required', field: 'name' }`

### 본 미팅 활용 멘트 (Lead 5-2 역질문에 연결)
> "현재 백엔드 API가 Yeliin님 schema-first 패턴(RHF+Zod·SDUI·TanStack Query)을 어떻게 받쳐주고 있는지 궁금합니다. 합류하면 그 흐름을 더 단단하게 만드는 게 첫 6개월 과제 중 하나가 될 것 같아서요." → **협업 인지 + 6개월 로드맵 자연스럽게**

## 1. 이력서 기반 기술 질문

### Q1. IoT 수천 대 동시 재고 데이터 → DB Lock 정합성

> 마스터: [[My-Tech-Cards|카드 1]] · [[My-Tech-Cards-Extended|심화]] (보강 vault는 마스터 끝 카테고리 인덱스)

- 시나리오: 여러 IoT 장비가 같은 SKU·창고에 거의 동시에 입출고 이벤트를 보낼 때 재고 카운트가 깨지는 문제
- 해결: **비관적 잠금(SELECT … FOR UPDATE)** + 트랜잭션 범위 최소화 + 인덱스 키로 락 범위 좁히기
- 왜 낙관적 잠금이 아니었나: 충돌이 일상적 → 낙관적 잠금이면 재시도 비용이 커지고, 사용자가 아닌 IoT 자동 트래픽이라 재시도 정책을 어디에 둘지 모호
- **DPP 매핑**: 같은 제품 ID에 대해 생산·유통·폐기 이벤트가 비동기로 들어올 때 동일한 정합성 문제. tenant_id × productId × eventType 단위 락이 출발점
- 꼬리:
  - "데드락은 어떻게?" → 락 획득 순서 고정(SKU id ASC), 트랜잭션 짧게, 데드락 발생 시 재시도(짧은 backoff)
  - "Read Replica 사용 시 정합성?" → 쓰기 직후 강한 일관성 필요한 조회는 Primary로 강제, 분석성 조회만 Replica
  - "락 대신 idempotency key는?" → 동일 이벤트 중복 수신엔 idempotency, 서로 다른 이벤트의 충돌엔 락 — 같이 씀

### Q2. EventBridge + SQS 이벤트 아키텍처 (수기 발주 자동화)

> 마스터: [[My-Tech-Cards|카드 2]] · [[My-Tech-Cards-Extended|상태 머신 8단계·visibility timeout 6배 룰]] · [[Event-Driven-Architecture|EDA 결정 프레임워크]]
> ⚠️ **윤회 톤 가드**: 윤회 스택 = **RabbitMQ + AWS-SNS/SQS** (Kafka·EventBridge 명시 없음). MSK 비교 사례 강조 X (이직 사유에 한 줄만), 본 미팅 톤은 **SNS/SQS·RabbitMQ 비교**로.

**★★★★ 오프닝 멘트 (윤회 핵심 카드 — 단순 EventBridge 자랑 X, EDA 프레임워크 사고)**:
> "이벤트 기반 아키텍처는 단일 패턴이 아니라 **신뢰성·결합도·일관성 3축 트레이드오프 + 8개 결정 층** 프레임워크로 봅니다. 본업으로는 **층 2~5 + 7 중간 지점** (Outbox로 발행 신뢰성·Idempotency Key·DLQ로 소비 신뢰성·사실 기반 이벤트·MessageGroupId·Event Store + 상태 혼합)까지 다뤘습니다. 본격 Event Sourcing·다중 서비스 Saga 운영은 없습니다."

→ 면접관 깜짝 효과. 본인 깊이 정확히 빠짐 (운영 경험 X 영역 정직). **DPP는 층 7까지 적합한 도메인**이라는 매핑 자연스럽게 박힘.

- 구조: 도메인 이벤트(재고 임계치 도달) → EventBridge 규칙 → 채널별 SQS(카톡/이메일/내부 알림) → 워커(ECS Fargate) → 외부 API
- 채널별 DLQ + 재시도 정책 차등: 카톡(잘못된 번호는 점진 재시도 후 포기), 이메일(무조건 재시도), 최종 실패 → 긴급 알림 + 수동 처리 큐
- MSK(Kafka) 대비 선택 근거: 운영 인력 부족 + 트래픽 규모에서 EventBridge+SQS의 관리 부담·비용이 압도적으로 유리
- **DPP 매핑**: 제품 상태 변화(생산·검수·출고·폐기·재활용 입고·SRF 처리)가 곧 도메인 이벤트. 브랜드사·재활용업체·소비자 알림으로 fan-out 그대로 매핑
- 꼬리:
  - "RabbitMQ vs SNS/SQS 어떻게 분리?" → **RabbitMQ**는 in-cluster 내부 워크로드 (라우팅·exchange 다양·낮은 지연), **SNS/SQS**는 AWS 매니지드 fan-out·DLQ·자동 스케일. 윤회 스택은 둘 다 보유 — 도메인 이벤트는 SNS, 내부 작업 큐는 RabbitMQ 추정 (역질문 후보)
  - "EventBridge 대신 SNS만 쓸 수도?" → 단순 fan-out이면 SNS, 규칙 기반 라우팅·스키마 레지스트리·외부 SaaS 통합엔 EventBridge. **윤회는 EventBridge 미명시 → 라우팅 규칙은 어떻게?** (역질문 후보)
  - "메시지 순서 보장은?" → SQS FIFO + MessageGroupId(예: tenantId/productId 단위)로 순서 보장. RabbitMQ면 single consumer per queue
  - "exactly-once?" → 사실상 at-least-once. 소비자에서 idempotency key로 중복 제거
  - "Kafka가 더 맞는 순간은?" → 이벤트 보존·재처리 윈도우가 길고, 다소비자 스트림 처리가 핵심일 때. 윤회 현 단계엔 과투자

### Q3. 슬로우 쿼리 99.3% 개선 (복합 인덱스 + 쿼리 재작성)

> 마스터: [[My-Tech-Cards|카드 3]] · [[My-Tech-Cards-Extended|EXPLAIN 컬럼·PG BRIN/GIN]]

- 발견: APM·DB slow log로 P99 응답이 튀는 엔드포인트 식별 → EXPLAIN으로 풀스캔/필터 단계 비효율 확인
- 조치: 카디널리티 높은 컬럼 앞쪽으로 둔 복합 인덱스, 커버링 인덱스로 PK 룩업 제거, 일부 쿼리는 분리 + 애플리케이션 조립
- 검증: Before/After P99·QPS 비교, 인덱스로 인한 쓰기 비용 모니터링
- **DPP 매핑**: 제품 ID 단위 시계열 이벤트 조회가 핵심 쿼리 — (tenant_id, product_id, event_time DESC) 같은 복합 인덱스가 1순위 후보
- 꼬리:
  - "인덱스 추가의 쓰기 페널티?" → 인덱스 수·페이지 분할 빈도 모니터링, 쓰기 핫스팟이면 파티셔닝 검토
  - "EXPLAIN ANALYZE를 어떻게 읽나?" → rows 추정 vs 실제, filtered %, type(ref/range/all), Extra(Using filesort/temporary) 위주
  - "PostgreSQL이라면?" → EXPLAIN (ANALYZE, BUFFERS), pg_stat_statements, BRIN/GIN 등 PG 고유 인덱스 활용 가능

### Q4. MongoDB → MySQL 마이그레이션

> ⚠️ **윤회 보강**: 윤회 스택 = **PostgreSQL + MongoDB 혼용** (채용공고). 본인은 MongoDB→MySQL 마이그레이션 경험 — **MongoDB 운영 경험은 있음** + **PG vs MySQL 차이 숙지**. 윤회는 MongoDB 도입 이유·역할 모름 → 역질문 후보.

- 배경: 스키마 진화에 따른 문서 모델의 일관성·조인 비용이 커짐 → 관계형으로 정규화
- 전략: 듀얼 라이트 단계 → 백필 → 읽기 점진 전환 → 쓰기 전환 → 구 시스템 제거. 각 단계 검증 쿼리·차이 리포트로 사이드이펙트 잡음
- **DPP 매핑**: 표준이 변하면(EU CEN/CENELEC) 데이터 모델이 흔들릴 수 있음 → 마이그레이션 인프라(듀얼 라이트·백필·검증)는 핵심 자산
- **윤회 MongoDB 매핑 추정**: 제품 상세·DPP 메타데이터(소재 구성·공급망 단계·증빙 사진/문서)가 **스키마 진화 빈번** + **계층 구조 깊음** → MongoDB가 자연스러움. PostgreSQL은 트랜잭션·관계형 핵심 도메인(테넌트·계약·결제·이벤트 스토어). **역질문**: "MongoDB는 DPP 메타데이터·외부 표준 데이터 흡수에 쓰이는지, 핵심 도메인엔 PG인지?"
- 꼬리:
  - "다운타임 없이 어떻게?" → 듀얼 라이트 + 읽기 라우팅 비율 조절. 트랜잭션 경계 다르면 보상 트랜잭션(Saga)으로 정합성 회복
  - "스키마가 바뀔 때 다운스트림 영향은?" → 이벤트 스키마 레지스트리 + 버전 관리. 소비자가 N-1 버전을 한동안 같이 지원

## 2. JD 기반 기술 질문

### Q5. 멀티테넌트 SaaS 데이터 격리 — 어느 단계까지?

> ⚠️ **5/15 톤 일관성 가드**: 본인이 5/15에 사이드(출석부) 한 마디도 안 꺼냄. 본 미팅에서 사이드 멀티테넌트 사례 본인이 먼저 꺼내면 "왜 그때 안 말했나?" 의심. **본업 트라이포드 PoC 멀티테넌트 경험 + 일반 이론**만으로 답변. 면접관이 "사이드 있나?" 직접 물어야만 답변 (그 경우엔 마스터 #15 톤).

- **단계**: 논리적(tenant_id 컬럼) → 스키마 분리 → 물리적 분리. 현 단계(소수 대형 고객 진입)는 **논리적 격리 + 강제 가드**가 합리
- 강제 가드 (정량):
  - **Prisma middleware** — `prisma.$use(async (params, next) => { if (!ctx.tenantId) throw new Error(); params.args.where = { ...params.args.where, tenantId: ctx.tenantId }; return next(params); })` — 모든 쿼리에 자동 주입, 누락 시 컴파일 단에서 막힘
  - **PostgreSQL RLS** — `CREATE POLICY tenant_isolation ON orders FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid)` + 세션 시작 시 `SET app.tenant_id = '{ctx.tenantId}'`. DB 레벨 강제 → app 버그도 막음
  - 인덱스 컬럼 첫 번째에 tenant_id 필수 (`(tenant_id, created_at DESC)` 등)
- 전환 임계: 단일 테넌트 비중 30%+ / 컴플라이언스 요구(GDPR·SOC2) / noisy neighbor 사고 1건 = 스키마 분리 검토
- 꼬리:
  - "noisy neighbor 대응?" → 테넌트별 rate limit (Redis token bucket) + 커넥션 풀 분리 + 임계 초과 알림
  - "공유 인프라 비용 배분?" → 테넌트별 사용량 메트릭(요청 수·DB 시간·스토리지) 집계 → 빌링/내부 단가
  - "BMS/암호화 키 분리?" → 테넌트별 KMS 키 + envelope encryption. PII는 컬럼 레벨 암호화
  - "Prisma middleware vs 명시 가드?" → 명시적 가드가 클린 아키텍처 원칙(domain 안에 비즈니스 규칙) + 테스트 용이성. middleware는 누락 시 silently 통과 위험

### Q6. DPP 제품 ID — 발급·식별·QR 매핑

- 요구: 전역 유일, 짧고 URL 안전, 위변조 어려움, 발급 속도 빠름, 정렬 가능하면 더 좋음
- 후보 비교:
  - **UUIDv7**: 8바이트 timestamp(ms) + 8바이트 random → 시간 정렬 가능. B+Tree 인덱스 친화 (UUIDv4의 page split 문제 회피). 36자 또는 base32 22자
  - **ULID**: 26자 base32 + lexicographic 정렬. UUIDv7과 거의 동등, 사람 친화적
  - 둘 다 1초당 수천~수만 건 발급 가능, 분산 환경에서 충돌 사실상 0
- 위변조 방지: **ed25519 서명** (256-bit, 64바이트). 키는 KMS, 분기 회전. QR 페이로드 예: `https://care.id/v/{ULID}?sig={base64url_ed25519}`. 검증은 stateless라 **P99 50ms** 가능
- 꼬리:
  - "왜 자동 증가 ID가 아닌가?" → 발급 분포·예측 가능성·테넌트 간 충돌·노출 위험. UUIDv7은 시간 정렬은 유지하면서 예측 불가
  - "오프라인 발급?" → 시드 ID 블록 사전 할당(예: 디바이스별 10만 개) → 디바이스 로컬 발급 후 동기화
  - "키 유출 시?" → KMS 즉시 회전 + 검증 키 게시판(JWKS endpoint)으로 구 키 무효화 알림

### Q7. 외부 표준·파트너 API 연동의 안정성

- 타임아웃(짧은 connect + 합리적 read), 재시도 + jitter, Circuit Breaker(opossum), DLQ로 실패 격리
- 표준 데이터 모델은 자주 변하므로 어댑터 레이어로 격리: 도메인 모델 ↔ 외부 모델 매핑 한 곳에서만
- 꼬리:
  - "Circuit Breaker 상태 공유는?" → 멀티 인스턴스면 Redis. 단일이면 in-memory
  - "외부 API 비용 폭주 방어?" → 사용자/테넌트별 토큰 쿼터, 월간 예산 알림, 캐시 적극 활용

## 3. 서비스 맥락 질문 (CARE ID 특이)

### Q8. 생애주기 상태 머신 설계

> ⚠️ **답변 톤 가드**: 본격 Event Sourcing 운영 경험은 없음. **Event Store + 상태 테이블 혼합 (Event Sourcing의 중간 지점)**까지가 정리·이해한 영역. 직접 운영은 사이드 Snapshot 패턴 (SCD Type 2)·트라이포드 이벤트 스토어 인접 경험. 면접관이 깊게 파면 "본격 ES 운영 경험은 없습니다 + 정리한 영역은 ~" 톤으로 빠짐.

**핵심 답변**:
> "이건 정확히 **Event Sourcing이 적합한 도메인**입니다 — 제품 생애주기·감사 추적·EU 규제(ESPR·EPR) 대응이 본질이라. 단 **본격 ES 운영 경험은 없고**, 본인이 다뤄본 영역은 **Event Store + 상태 테이블 혼합 (중간 지점)** 까지입니다. 상태도 유지하면서 감사·복구·새 read model 구성 능력은 얻는 패턴."

- 생산 → 검수 → 출고 → 유통 → 사용 → 폐기 → 재활용 → SRF. 각 전이는 권한·증빙(사진/문서/외부 시스템)·역할이 다름
- **이벤트 스토어 스키마** (append-only):
  ```sql
  events (
    id BIGSERIAL PK,
    aggregate_id UUID,   -- product_id
    sequence INT,        -- aggregate 내 순번
    event_type VARCHAR,  -- 'PRODUCED','INSPECTED'...
    from_state VARCHAR,  -- 검증용
    to_state VARCHAR,
    actor_id UUID,       -- 누가
    evidence_url TEXT,   -- 증빙 (S3·외부 시스템)
    payload JSONB,
    occurred_at TIMESTAMPTZ
  )
  UNIQUE(aggregate_id, sequence)
  ```
- **read model**: `product_state(product_id, current_state, last_event_id, updated_at)` — 비동기 프로젝션 (event INSERT → consumer가 read model 갱신). 조회는 read model만.
- **전이 검증**: 코드 레벨 enum + DB 트리거 (이중) — `from_state='PRODUCED' AND to_state IN ('INSPECTED','RECYCLED')` 등. 위반 시 트랜잭션 rollback
- **보상 워크플로 (Saga)**: 잘못된 전이 발견 시 보상 이벤트 발행 — 예: 미완성 폐기 → `CANCELLED_DISPOSAL` 이벤트 → 재공정 큐로
- **read model 깨졌을 때 복구**: 이벤트 스토어가 source of truth → read model 통째로 rebuild (replay)

**꼬리** (깊게 들어왔을 때):
- "왜 events 테이블에 이미 actor 있는데 따로 snapshot?" → events는 *변화* 기록, snapshot(SCD Type 2)은 *시점 상태*. 조회 패턴이 다름. 빠른 시점 조회엔 snapshot이 효율적
- "snapshot 적재 시점?" → 도메인 이벤트마다 (이벤트 핸들러 비동기 적재) 또는 주기적
- **"Event Sourcing이랑 뭐가 달라요?"** → "본격 ES는 **상태 자체를 이벤트 스트림으로만 관리**합니다. 본인이 다뤄본 건 **Event Store + 별도 상태 테이블 혼합 (중간 지점)** — 상태도 유지하면서 감사·복구는 얻는. 본격 ES는 도메인 모델·CQRS·인프라까지 동시 결정이라 별도 도입 결정 필요"
- **"이벤트 스키마 진화는?"** → Upcaster 패턴 — 저장된 이벤트는 절대 수정 X, 읽을 때 v1→v2 변환 레이어 통과. snapshot에 최신 형태로 저장하는 게 보완
- **"동시 쓰기 충돌은?"** → optimistic concurrency — `expected_version` 기반. UNIQUE(aggregate_id, sequence) 제약으로 충돌 시 INSERT 실패 → 재시도
- **"GDPR 삭제 요청 시?"** → 이벤트가 영구라 직접 삭제는 못 함. **crypto-shredding** (개인정보 암호화해서 저장 + 키 폐기로 사실상 복호화 불가)
- **"본격 Event Sourcing 운영해본 적?"** → "직접 운영 경험은 없습니다. **DPP 같은 도메인엔 적합한 패턴**이라 판단하고, 합류 후 단계적 도입 (Event Store + 상태 혼합 → 본격 ES) 검토할 자리로 봤습니다"

### Q9. 멀티테넌트 + 글로벌(EU·중국) 운영

- 데이터 주권: EU 사용자는 EU 리전, 중국은 중국 리전. 메타데이터·정책만 글로벌 동기화
- 시각/언어/통화·소재 코드 표준 분기. i18n은 결국 도메인 모델 안에서 결정해야 함
- 꼬리:
  - "데이터 이관 시 GDPR 이슈?" → 처리 근거·SCC·DPIA. 가능한 한 원장 데이터는 리전 안에 유지

### Q9b. 디버깅·문제 해결 프로세스 ([[My-FIT-Answers#14. 문제 해결/디버깅 프로세스|마스터 14번]])

> 단골 질문. 영웅담 X, **6단계 프로세스로 답변**.

**다듬은 본문**:
> **재현 → 원인 가설 → 분리·검증 → 해결 → 영향 범위 점검 → 회고**. 트라이포드랩 Prisma API가 갑자기 1000ms로 튄 사례 — APM 로그로 재현 조건(특정 endpoint) 식별 → EXPLAIN으로 **N개 쿼리 발행 가설 검증** → 공식 문서에서 **`relationLoadStrategy: 'join'` 발견 → DB-level JOIN으로 해결 (90% 개선)** → Grafana로 다른 endpoint 영향 점검 → 회고 기록.

**도구 세트**: APM·DB slow log·EXPLAIN·`git bisect`·Chrome DevTools·로컬 프로파일러

**CARE ID 매핑**: 표준 변경·테넌트별 데이터 차이로 도메인 특이 버그 가능성 → Subagent 자동화로 영향 범위 점검 자동화 가능

**꼬리**:
- **"바로 안 풀리는 문제는?"** → 가설 글로 적고 24h 두고 다시 봄. 새벽 결정·해결 시도 X
- **"외부 의존성 장애는?"** → 우리 측 격리(타임아웃·재시도·Circuit Breaker)부터. 외부 책임 영역은 가설로만

### Q10. 보안 — 위변조·진위 검증

- 발급 서명(키 회전 가능한 비대칭 키), 검증 엔드포인트는 캐싱·rate limit, 키 유출 시 즉시 회전 + 검증 키 게시
- 공급망: 단계별 actor 인증(브랜드/공장/재활용업체) + 감사 로그
- FIDO/패스키 경험 연결: B2B 어드민 콘솔의 phishing-resistant 로그인으로 패스키 적용 가능

## 관련 문서

- [[Interview-Prep-Yunhoe-1st|1차 본 미팅 TOC]]
- [[Interview-Prep-Yunhoe-1st-FIT|JD 매칭 & FIT 답변]]
- [[Interview-Prep-Yunhoe-1st-Tech-Extra|범용 백엔드 안전망 (CS 기초·NestJS·HTTP·인증·시스템 디자인)]]
- [[Interview-Prep-Yunhoe-1st-Lead-Questions|백엔드 리드·컬처핏·역질문·체크리스트]]
- [[Interview-Prep-Yunhoe-Domain|도메인 브리프]]
- [[My-Tech-Cards|마스터 카드 8개 + vault 카테고리 인덱스]] — 본 문서 답변이 얕으면 마스터에서 보강
