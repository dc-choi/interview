---
tags: [fit, interview, yunhoe]
status: done
category: "Interview - Fit"
company: "윤회주식회사 (CARE IDⓒ)"
aliases: ["Yunhoe 1st Tech JD 질문", "윤회 1차 JD 기반, 서비스 맥락 질문 (Q5~Q10)"]
verified_at: 2026-08-26
---

# 윤회 1차 기술 — JD 기반과 서비스 맥락 질문 (Q5~Q10)

## 2. JD 기반 기술 질문

### Q5. 멀티테넌트 SaaS 데이터 격리 — 어느 단계까지?

> ⚠️ **5/15 톤 일관성 가드**: 본인이 5/15에 사이드(출석부) 한 마디도 안 꺼냄. 본 미팅에서 사이드 멀티테넌트 사례 본인이 먼저 꺼내면 "왜 그때 안 말했나?" 의심. **본업 트라이포드 PoC 멀티테넌트 경험 + 일반 이론**만으로 답변. 면접관이 "사이드 있나?" 직접 물어야만 답변 (그 경우엔 마스터 #15 톤).

- **단계**: 논리적(tenant_id 컬럼) → 스키마 분리 → 물리적 분리. 현 단계(소수 대형 고객 진입)는 **논리적 격리 + 앱 경계 + DB 강제**가 합리
- 강제 가드:
  - **Prisma v7 앱 경계** — `$use` middleware는 제거됐다. repository API가 `tenantId`를 명시적으로 받고, 필요한 공통 경로는 `$extends` query extension으로 보조한다. 이는 런타임 가드일 뿐 컴파일 시점 보장이나 보안 경계가 아니다. 범용 client와 raw query는 repository 밖으로 노출하지 않는다.
  - **PostgreSQL RLS** — 앱 role은 table owner도 `BYPASSRLS` role도 아니어야 하며, tenant context는 커넥션 풀에 남지 않게 트랜잭션 안에서만 설정한다.
    ```sql
    ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

    CREATE POLICY tenant_isolation ON orders
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

    BEGIN;
    SELECT set_config('app.tenant_id', $1, true); -- driver parameter binding, transaction local
    -- tenant-bound queries
    COMMIT;
    ```
    RLS는 non-owner 앱 role의 최종 경계다. tenant 미설정, 다른 tenant의 SELECT, INSERT, UPDATE, DELETE와 owner/BYPASSRLS 연결을 실제 PostgreSQL 통합 테스트로 확인한다.
  - 테넌트 범위 조회에는 `(tenant_id, created_at DESC)` 같은 인덱스를 먼저 검토하고, 전체 테넌트 관리 쿼리는 별도 인덱스와 실행계획으로 판단한다.
- 스키마나 물리 분리는 계약상 격리 요구, 측정된 noisy neighbor와 SLO 위반, 백업, 복구 단위와 비용을 기준으로 검토한다. 단일 테넌트 비중 같은 수치는 서비스별 경보 기준일 뿐 보편 임계값이 아니다.
- 꼬리:
  - "noisy neighbor 대응?" → 테넌트별 rate limit (Redis token bucket) + 커넥션 풀 분리 + 임계 초과 알림
  - "공유 인프라 비용 배분?" → 테넌트별 사용량 메트릭(요청 수, DB 시간, 스토리지) 집계 → 빌링/내부 단가
  - "BMS/암호화 키 분리?" → 테넌트별 KMS 키 + envelope encryption. PII는 컬럼 레벨 암호화
  - "Prisma extension vs 명시 repository?" → 명시 repository가 tenant 조건을 드러내고 테스트하기 쉽다. extension은 반복 경로의 실수를 줄이는 보조 수단이며, raw query까지 강제하지 못하므로 RLS와 통합 테스트를 함께 둔다

### Q6. DPP 제품 ID — 발급, 식별, QR 매핑

- 요구: 전역 유일, 짧고 URL 안전, 위변조 어려움, 발급 속도 빠름, 정렬 가능하면 더 좋음
- 후보 비교:
  - **UUIDv7**: 48비트 Unix epoch millisecond timestamp, version 4비트, `rand_a` 12비트, variant 2비트, `rand_b` 62비트로 구성된 128비트 UUID. 시간 순서 성질은 UUIDv4보다 삽입 locality에 유리할 수 있으나 generator와 workload를 측정해야 한다. canonical UUID 문자열은 36자이고, 128비트를 Base32로 표현하면 26자이며 인코딩 방식은 구현에서 정한다
  - **ULID**: 48비트 millisecond timestamp와 80비트 randomness를 26자 Base32로 표현한다. 같은 millisecond 안의 정렬은 monotonic generator 정책에 달리고 UUID 표준은 아니므로 라이브러리와 상호운용 요구를 따로 본다.
  - 처리량과 충돌 확률은 generator, entropy와 clock 처리에 달려 있다. DB `UNIQUE`와 충돌 재시도를 두고, timestamp가 드러나는 식별자를 인증 비밀로 쓰지 않는다.
- 위변조 방지: **Ed25519 서명**은 public key 32바이트, signature 64바이트이며 약 128비트 보안 수준을 목표로 한다. version, issuer와 product ID의 canonical payload를 서명하고 QR에는 `kid`와 signature를 싣는다. private key는 해당 알고리즘을 지원하는 KMS나 HSM에 보관하고 공개키로 검증한다. 지연 시간 목표는 실제 payload와 런타임으로 측정한다.
- 꼬리:
  - "왜 자동 증가 ID가 아닌가?" → 중앙 sequence 없이 여러 발급자가 생성할 수 있고 B-Tree locality도 얻을 수 있다. 다만 UUIDv7의 timestamp는 보이므로 권한 검사는 별도다.
  - "오프라인 발급?" → UUIDv7이나 ULID를 로컬에서 생성하되 secure entropy, clock rollback과 같은 millisecond 내 생성 정책을 정하고 중앙 저장 시 `UNIQUE`로 최종 확인한다.
  - "키 유출 시?" → 새 signing key로 전환하고 `kid`별 공개키와 유효 기간을 게시한다. 유출 키를 폐기할 때 기존 발급물의 처리 정책도 함께 정한다.

### Q7. 외부 표준, 파트너 API 연동의 안정성

- connect/read timeout을 분리하고, 재시도는 멱등한 요청과 명시적으로 재시도 가능한 응답에만 `Retry-After`와 jitter를 반영해 제한한다. Circuit breaker는 인스턴스별로 두며, 비동기 작업의 최종 실패는 DLQ와 수동 복구 경로로 격리한다.
- 표준 데이터 모델은 자주 변하므로 어댑터 레이어로 격리: 도메인 모델 ↔ 외부 모델 매핑 한 곳에서만
- 꼬리:
  - "Circuit Breaker 상태 공유는?" → 기본은 인스턴스별 상태로 장애 상관관계를 줄인다. upstream 전체 예산을 보호해야 하면 중앙 rate limit이나 동시성 제한을 별도로 설계하며, 멀티 인스턴스라는 이유만으로 breaker 상태를 Redis에 공유하지 않는다.
  - "외부 API 비용 폭주 방어?" → 사용자/테넌트별 토큰 쿼터, 월간 예산 알림, 캐시 적극 활용

## 3. 서비스 맥락 질문 (CARE ID 특이)

### Q8. 생애주기 상태 머신 설계

> ⚠️ **답변 톤 가드**: 본격 Event Sourcing 운영 경험은 없음. 감사 이력은 필요하지만 곧바로 Event Sourcing을 뜻하지 않는다. 먼저 append-only 전이 로그와 현재 상태 테이블을 같은 트랜잭션으로 관리하고, replay와 여러 projection의 가치가 운영 복잡성을 웃돌 때만 Event Sourcing을 검토한다.

**핵심 답변**:
> "제품 생애주기와 감사 추적에는 append-only 전이 로그가 필요합니다. 저는 현재 상태 테이블과 전이 로그를 같은 트랜잭션으로 갱신하는 단순한 구조부터 시작하겠습니다. 이벤트 replay로 여러 projection을 재구축해야 하는 요구가 실제로 생기면 그때 Event Sourcing을 검토하겠습니다. 본격 Event Sourcing 운영 경험은 없습니다."

- 생산 → 검수 → 출고 → 유통 → 사용 → 폐기 → 재활용 → SRF. 각 전이는 권한, 증빙(사진/문서/외부 시스템), 역할이 다름
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
    evidence_url TEXT,   -- 증빙 (S3, 외부 시스템)
    payload JSONB,
    occurred_at TIMESTAMPTZ
  )
  UNIQUE(aggregate_id, sequence)
  ```
- **현재 상태**: `product_state(product_id, current_state, version, updated_at)` — 전이 로그 INSERT와 같은 트랜잭션에서 `expected_version` 조건으로 갱신한다. 검색, 통계처럼 파생된 read model만 비동기로 만든다.
- **전이 검증**: 애플리케이션 상태 머신을 정본으로 두고 `UNIQUE(aggregate_id, sequence)`와 조건부 상태 UPDATE로 동시 충돌을 막는다. 규제상 DB 강제가 필요할 때만 stored procedure나 constraint로 한 경계에 모은다.
- **보상 워크플로 (Saga)**: 잘못된 전이 발견 시 보상 이벤트 발행 — 예: 미완성 폐기 → `CANCELLED_DISPOSAL` 이벤트 → 재공정 큐로
- **파생 read model 복구**: 전이 로그가 완전하면 checkpoint 뒤부터 replay하거나 전체 rebuild한다. 현재 상태와 로그를 같은 트랜잭션으로 쓴다는 전제가 먼저다.

**꼬리** (깊게 들어왔을 때):
- "왜 events와 현재 상태를 둘 다 두나?" → events는 감사 이력, 현재 상태는 일반 조회와 전이 검증용이다. replay 비용이 실제 문제가 되기 전에는 별도 snapshot을 만들지 않는다.
- **"Event Sourcing이랑 뭐가 달라요?"** → "본격 Event Sourcing은 상태를 이벤트 스트림에서 재구성합니다. 여기서는 현재 상태도 같은 트랜잭션으로 저장하므로 감사 로그 패턴입니다. 필요한 요구가 확인되기 전에는 CQRS나 snapshot을 추가하지 않습니다."
- **"이벤트 스키마 진화는?"** → Upcaster 패턴 — 저장된 이벤트는 절대 수정 X, 읽을 때 v1→v2 변환 레이어 통과. snapshot에 최신 형태로 저장하는 게 보완
- **"동시 쓰기 충돌은?"** → optimistic concurrency — `expected_version` 기반. UNIQUE(aggregate_id, sequence) 제약으로 충돌 시 INSERT 실패 → 재시도
- **"GDPR 삭제 요청 시?"** → 이벤트에는 PII 대신 별도 subject reference를 저장하고 보존, 삭제 정책을 분리한다. crypto-shredding만으로 모든 법적 삭제 의무를 충족한다고 단정하지 않고 법무, 개인정보 담당자와 적용 범위를 확인한다.
- **"본격 Event Sourcing 운영해본 적?"** → "직접 운영 경험은 없습니다. 우선 감사 로그와 현재 상태를 일관되게 저장하고, replay와 projection 요구가 확인되면 도입 비용과 함께 검토하겠습니다."

### Q9. 멀티테넌트 + 글로벌(EU, 중국) 운영

- 데이터 residency는 국가명만으로 정하지 않고 적용 법률, 계약, 데이터 종류와 처리 주체를 확인한다. GDPR은 EEA 밖 이전 자체를 금지하지 않으며 적정성 결정, SCC 같은 이전 근거와 보호조치를 요구할 수 있다. 중국은 별도 현지 법률 검토가 필요하다.
- 시각/언어/통화, 소재 코드 표준 분기. i18n은 결국 도메인 모델 안에서 결정해야 함
- 꼬리:
  - "데이터 이관 시 GDPR 이슈?" → 처리 근거, 최소화, 적정성 결정이나 SCC 같은 이전 수단, 필요 시 DPIA를 확인한다. residency는 법무 검토와 고객 계약에 맞춘다.

### Q9b. 디버깅, 문제 해결 프로세스 ([[My-FIT-Answers#14. 디버깅, 문제 해결 (6단계)|마스터 14번]])

> 단골 질문. 영웅담 X, **6단계 프로세스로 답변**.

**다듬은 본문**:
> **재현 → 원인 가설 → 분리, 검증 → 해결 → 영향 범위 점검 → 회고**. 트라이포드랩 Prisma API가 갑자기 1000ms로 튄 사례 — APM 로그로 재현 조건(특정 endpoint) 식별 → 당시 `relationJoins`가 비활성인 구성에서 **N개 쿼리 발행 가설 검증** → `relationJoins` 활성화와 **`relationLoadStrategy: 'join'` 적용 → MySQL 단일 correlated subquery로 해결 (90% 개선)** → Grafana로 다른 endpoint 영향 점검 → 회고 기록.

**도구 세트**: APM, DB slow log, EXPLAIN, `git bisect`, Chrome DevTools, 로컬 프로파일러

**CARE ID 매핑**: 표준 변경, 테넌트별 데이터 차이로 도메인 특이 버그 가능성 → Subagent 자동화로 영향 범위 점검 자동화 가능

**꼬리**:
- **"바로 안 풀리는 문제는?"** → 가설 글로 적고 24h 두고 다시 봄. 새벽 결정, 해결 시도 X
- **"외부 의존성 장애는?"** → 우리 측 격리(타임아웃, 재시도, Circuit Breaker)부터. 외부 책임 영역은 가설로만

### Q10. 보안 — 위변조, 진위 검증

- 발급 서명(키 회전 가능한 비대칭 키), 검증 엔드포인트는 캐싱, rate limit, 키 유출 시 즉시 회전 + 검증 키 게시
- 공급망: 단계별 actor 인증(브랜드/공장/재활용업체) + 감사 로그
- FIDO/패스키 경험 연결: B2B 어드민 콘솔의 phishing-resistant 로그인으로 패스키 적용 가능

## 출처

- [PostgreSQL, Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [PostgreSQL, SET](https://www.postgresql.org/docs/current/sql-set.html)
- [Prisma, Upgrade to Prisma ORM 7](https://docs.prisma.io/docs/guides/upgrade-prisma-orm/v7)
- [Prisma, Client extensions: query component](https://docs.prisma.io/docs/orm/prisma-client/client-extensions/query)
- [RFC 9562, UUID Version 7](https://www.rfc-editor.org/rfc/rfc9562.html#section-5.7)
- [ULID canonical specification](https://github.com/ulid/spec)
- [RFC 8032, EdDSA: Ed25519 and Ed448](https://www.rfc-editor.org/rfc/rfc8032.html)
- [European Commission, Rules on international data transfers](https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/rules-international-data-transfers_en)
