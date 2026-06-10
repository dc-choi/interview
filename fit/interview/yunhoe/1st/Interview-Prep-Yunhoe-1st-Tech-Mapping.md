---
tags: [fit, interview, yunhoe]
status: done
category: "Interview - Fit"
company: "윤회주식회사 (CARE IDⓒ)"
aliases: ["Yunhoe 1st Tech 매핑", "윤회 1차 주요 업무 매핑과 프론트 협업"]
---

# 윤회 1차 기술 — 채용공고 매핑과 프론트엔드 협업

## 0. 채용공고 "주요 업무" 정밀 매핑 (5/19 갱신)

본 미팅에서 받을 기술 질문은 아래 주요 업무 키워드 기반:

### DPP Core 시스템
- **UID 발행, 관리** → 카드 1 DB Lock + 분산 ID(UUIDv7, ULID, 서명) — Q6 답변
- **제품 데이터 스키마 (EU ESPR 호환)** → MongoDB+PostgreSQL 혼용 + 스키마 진화 — Q4, C2 역질문
- **QR 코드 API** → 발급/검증 stateless 설계 (서명, 키 회전, 캐싱) — Q6, Q10

### 제품 순환 추적
- **상태 전이 설계** → 카드 2 EventBridge+SQS + Q8 생애주기 상태머신 (이벤트 소싱, SCD Type 2)
- **역할 기반 접근제어(RBAC)** → 카드 7 클린 아키텍처 + 멀티테넌트 권한 가드 — Q5
- **감사 추적** → 이벤트 스토어 + Snapshot 패턴 (불변 이력) — Q8
- **EPR 지표 집계** → 카드 3 슬로우 쿼리 + 시계열 인덱스 + OLAP(ClickHouse, 집계 read model) 검토

### 인프라, 운영
- **멀티테넌트 SaaS** → Q5
- **API 게이트웨이** → ALB + 인증, rate limit, CORS — 카드 6
- **모니터링** → 카드 5 Grafana/Prometheus/Loki + Sentry

## 0-1. ★ 프론트엔드 협업 — schema-first 패턴 (Yeliin LinkedIn 기반, 5/19 갱신)

프론트엔드 개발자 (프론트엔드 개발자, 단독 F/E)이 이미 정착시킨 패턴 — 본인 합류 시 백엔드 API 설계가 이걸 받쳐야 함. **본 미팅에서 자연스럽게 언급하면 강력 시그널** (협업 인지 + 실용성).

### Yeliin의 프론트엔드 패턴
- **RHF + Zod + SSOT field registry** (schema-driven 폼) — 백엔드 스키마와 1:1 매칭
- **SDUI (Server-Driven UI) 엔진** — 백엔드가 UI 메타데이터 함께 반환 → 재배포 없이 UI 변경
- **TanStack Query queryOptions 패턴 (70+ usages)** — 백엔드 API 명세가 type-safe해야
- **i18n 2,700+ keys, 4 languages** — 백엔드 에러 메시지, enum도 i18n 키 기반
- **schema-first 백엔드 병렬 개발 → 개발 사이클 50% 단축**

### 백엔드 측에서 받쳐야 할 설계
- **Zod 스키마 ↔ Prisma/TypeORM 스키마 ↔ OpenAPI 스펙 단일 출처** — `zod-to-openapi`, `prisma-zod-generator` 등으로 SSOT 자동 생성
- **SDUI 메타데이터 응답 패턴** — `{ data, ui: { fields, layout, validation } }` 구조
- **type-safe API** — tRPC 또는 `ts-rest`, OpenAPI codegen
- **i18n 호환 에러 응답** — `{ code: 'VALIDATION_ERROR', i18nKey: 'errors.required', field: 'name' }`

### 본 미팅 활용 멘트 (Lead 5-2 역질문에 연결)
> "현재 백엔드 API가 Yeliin님 schema-first 패턴(RHF+Zod, SDUI, TanStack Query)을 어떻게 받쳐주고 있는지 궁금합니다. 합류하면 그 흐름을 더 단단하게 만드는 게 첫 6개월 과제 중 하나가 될 것 같아서요." → **협업 인지 + 6개월 로드맵 자연스럽게**
