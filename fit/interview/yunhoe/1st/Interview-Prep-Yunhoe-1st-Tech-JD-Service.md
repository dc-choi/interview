---
tags: [fit, interview, yunhoe]
status: done
category: "Interview - Fit"
company: "윤회주식회사 (CARE IDⓒ)"
aliases: ["Yunhoe 1st Tech JD 질문", "윤회 1차 JD 기반, 서비스 맥락 질문 (Q5~Q10)"]
---

# 윤회 1차 기술 — JD 기반과 서비스 맥락 질문 (Q5~Q10)

## 2. JD 기반 기술 질문

### Q5. 멀티테넌트 SaaS 데이터 격리 — 어느 단계까지?

> ⚠️ **5/15 톤 일관성 가드**: 본인이 5/15에 사이드(출석부) 한 마디도 안 꺼냄. 본 미팅에서 사이드 멀티테넌트 사례 본인이 먼저 꺼내면 "왜 그때 안 말했나?" 의심. **본업 트라이포드 PoC 멀티테넌트 경험 + 일반 이론**만으로 답변. 면접관이 "사이드 있나?" 직접 물어야만 답변 (그 경우엔 마스터 #15 톤).

- **단계**: 논리적(tenant_id 컬럼) → 스키마 분리 → 물리적 분리. 현 단계(소수 대형 고객 진입)는 **논리적 격리 + 강제 가드**가 합리
- 강제 가드 (정량):
  - **Prisma middleware** — `prisma.$use(async (params, next) => { if (!ctx.tenantId) throw new Error(); params.args.where = { ...params.args.where, tenantId: ctx.tenantId }; return next(params); })` — 모든 쿼리에 자동 주입, 누락 시 컴파일 단에서 막힘
  - **PostgreSQL RLS** — `CREATE POLICY tenant_isolation ON orders FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid)` + 세션 시작 시 `SET app.tenant_id = '{ctx.tenantId}'`. DB 레벨 강제 → app 버그도 막음
  - 인덱스 컬럼 첫 번째에 tenant_id 필수 (`(tenant_id, created_at DESC)` 등)
- 전환 임계: 단일 테넌트 비중 30%+ / 컴플라이언스 요구(GDPR, SOC2) / noisy neighbor 사고 1건 = 스키마 분리 검토
- 꼬리:
  - "noisy neighbor 대응?" → 테넌트별 rate limit (Redis token bucket) + 커넥션 풀 분리 + 임계 초과 알림
  - "공유 인프라 비용 배분?" → 테넌트별 사용량 메트릭(요청 수, DB 시간, 스토리지) 집계 → 빌링/내부 단가
  - "BMS/암호화 키 분리?" → 테넌트별 KMS 키 + envelope encryption. PII는 컬럼 레벨 암호화
  - "Prisma middleware vs 명시 가드?" → 명시적 가드가 클린 아키텍처 원칙(domain 안에 비즈니스 규칙) + 테스트 용이성. middleware는 누락 시 silently 통과 위험

### Q6. DPP 제품 ID — 발급, 식별, QR 매핑

- 요구: 전역 유일, 짧고 URL 안전, 위변조 어려움, 발급 속도 빠름, 정렬 가능하면 더 좋음
- 후보 비교:
  - **UUIDv7**: 8바이트 timestamp(ms) + 8바이트 random → 시간 정렬 가능. B+Tree 인덱스 친화 (UUIDv4의 page split 문제 회피). 36자 또는 base32 22자
  - **ULID**: 26자 base32 + lexicographic 정렬. UUIDv7과 거의 동등, 사람 친화적
  - 둘 다 1초당 수천~수만 건 발급 가능, 분산 환경에서 충돌 사실상 0
- 위변조 방지: **ed25519 서명** (256-bit, 64바이트). 키는 KMS, 분기 회전. QR 페이로드 예: `https://care.id/v/{ULID}?sig={base64url_ed25519}`. 검증은 stateless라 **P99 50ms** 가능
- 꼬리:
  - "왜 자동 증가 ID가 아닌가?" → 발급 분포, 예측 가능성, 테넌트 간 충돌, 노출 위험. UUIDv7은 시간 정렬은 유지하면서 예측 불가
  - "오프라인 발급?" → 시드 ID 블록 사전 할당(예: 디바이스별 10만 개) → 디바이스 로컬 발급 후 동기화
  - "키 유출 시?" → KMS 즉시 회전 + 검증 키 게시판(JWKS endpoint)으로 구 키 무효화 알림

### Q7. 외부 표준, 파트너 API 연동의 안정성

- 타임아웃(짧은 connect + 합리적 read), 재시도 + jitter, Circuit Breaker(opossum), DLQ로 실패 격리
- 표준 데이터 모델은 자주 변하므로 어댑터 레이어로 격리: 도메인 모델 ↔ 외부 모델 매핑 한 곳에서만
- 꼬리:
  - "Circuit Breaker 상태 공유는?" → 멀티 인스턴스면 Redis. 단일이면 in-memory
  - "외부 API 비용 폭주 방어?" → 사용자/테넌트별 토큰 쿼터, 월간 예산 알림, 캐시 적극 활용

## 3. 서비스 맥락 질문 (CARE ID 특이)

### Q8. 생애주기 상태 머신 설계

> ⚠️ **답변 톤 가드**: 본격 Event Sourcing 운영 경험은 없음. **Event Store + 상태 테이블 혼합 (Event Sourcing의 중간 지점)**까지가 정리, 이해한 영역. 직접 운영은 사이드 Snapshot 패턴 (SCD Type 2), 트라이포드 이벤트 스토어 인접 경험. 면접관이 깊게 파면 "본격 ES 운영 경험은 없습니다 + 정리한 영역은 ~" 톤으로 빠짐.

**핵심 답변**:
> "이건 정확히 **Event Sourcing이 적합한 도메인**입니다 — 제품 생애주기, 감사 추적, EU 규제(ESPR, EPR) 대응이 본질이라. 단 **본격 ES 운영 경험은 없고**, 본인이 다뤄본 영역은 **Event Store + 상태 테이블 혼합 (중간 지점)** 까지입니다. 상태도 유지하면서 감사, 복구, 새 read model 구성 능력은 얻는 패턴."

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
- **read model**: `product_state(product_id, current_state, last_event_id, updated_at)` — 비동기 프로젝션 (event INSERT → consumer가 read model 갱신). 조회는 read model만.
- **전이 검증**: 코드 레벨 enum + DB 트리거 (이중) — `from_state='PRODUCED' AND to_state IN ('INSPECTED','RECYCLED')` 등. 위반 시 트랜잭션 rollback
- **보상 워크플로 (Saga)**: 잘못된 전이 발견 시 보상 이벤트 발행 — 예: 미완성 폐기 → `CANCELLED_DISPOSAL` 이벤트 → 재공정 큐로
- **read model 깨졌을 때 복구**: 이벤트 스토어가 source of truth → read model 통째로 rebuild (replay)

**꼬리** (깊게 들어왔을 때):
- "왜 events 테이블에 이미 actor 있는데 따로 snapshot?" → events는 *변화* 기록, snapshot(SCD Type 2)은 *시점 상태*. 조회 패턴이 다름. 빠른 시점 조회엔 snapshot이 효율적
- "snapshot 적재 시점?" → 도메인 이벤트마다 (이벤트 핸들러 비동기 적재) 또는 주기적
- **"Event Sourcing이랑 뭐가 달라요?"** → "본격 ES는 **상태 자체를 이벤트 스트림으로만 관리**합니다. 본인이 다뤄본 건 **Event Store + 별도 상태 테이블 혼합 (중간 지점)** — 상태도 유지하면서 감사, 복구는 얻는. 본격 ES는 도메인 모델, CQRS, 인프라까지 동시 결정이라 별도 도입 결정 필요"
- **"이벤트 스키마 진화는?"** → Upcaster 패턴 — 저장된 이벤트는 절대 수정 X, 읽을 때 v1→v2 변환 레이어 통과. snapshot에 최신 형태로 저장하는 게 보완
- **"동시 쓰기 충돌은?"** → optimistic concurrency — `expected_version` 기반. UNIQUE(aggregate_id, sequence) 제약으로 충돌 시 INSERT 실패 → 재시도
- **"GDPR 삭제 요청 시?"** → 이벤트가 영구라 직접 삭제는 못 함. **crypto-shredding** (개인정보 암호화해서 저장 + 키 폐기로 사실상 복호화 불가)
- **"본격 Event Sourcing 운영해본 적?"** → "직접 운영 경험은 없습니다. **DPP 같은 도메인엔 적합한 패턴**이라 판단하고, 합류 후 단계적 도입 (Event Store + 상태 혼합 → 본격 ES) 검토할 자리로 봤습니다"

### Q9. 멀티테넌트 + 글로벌(EU, 중국) 운영

- 데이터 주권: EU 사용자는 EU 리전, 중국은 중국 리전. 메타데이터, 정책만 글로벌 동기화
- 시각/언어/통화, 소재 코드 표준 분기. i18n은 결국 도메인 모델 안에서 결정해야 함
- 꼬리:
  - "데이터 이관 시 GDPR 이슈?" → 처리 근거, SCC, DPIA. 가능한 한 원장 데이터는 리전 안에 유지

### Q9b. 디버깅, 문제 해결 프로세스 ([[My-FIT-Answers#14. 디버깅, 문제 해결 (6단계)|마스터 14번]])

> 단골 질문. 영웅담 X, **6단계 프로세스로 답변**.

**다듬은 본문**:
> **재현 → 원인 가설 → 분리, 검증 → 해결 → 영향 범위 점검 → 회고**. 트라이포드랩 Prisma API가 갑자기 1000ms로 튄 사례 — APM 로그로 재현 조건(특정 endpoint) 식별 → EXPLAIN으로 **N개 쿼리 발행 가설 검증** → 공식 문서에서 **`relationLoadStrategy: 'join'` 발견 → DB-level JOIN으로 해결 (90% 개선)** → Grafana로 다른 endpoint 영향 점검 → 회고 기록.

**도구 세트**: APM, DB slow log, EXPLAIN, `git bisect`, Chrome DevTools, 로컬 프로파일러

**CARE ID 매핑**: 표준 변경, 테넌트별 데이터 차이로 도메인 특이 버그 가능성 → Subagent 자동화로 영향 범위 점검 자동화 가능

**꼬리**:
- **"바로 안 풀리는 문제는?"** → 가설 글로 적고 24h 두고 다시 봄. 새벽 결정, 해결 시도 X
- **"외부 의존성 장애는?"** → 우리 측 격리(타임아웃, 재시도, Circuit Breaker)부터. 외부 책임 영역은 가설로만

### Q10. 보안 — 위변조, 진위 검증

- 발급 서명(키 회전 가능한 비대칭 키), 검증 엔드포인트는 캐싱, rate limit, 키 유출 시 즉시 회전 + 검증 키 게시
- 공급망: 단계별 actor 인증(브랜드/공장/재활용업체) + 감사 로그
- FIDO/패스키 경험 연결: B2B 어드민 콘솔의 phishing-resistant 로그인으로 패스키 적용 가능
