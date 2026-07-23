---
tags: [fit, interview, common, my-answers, tech]
status: index
category: "Interview - 내 답변 마스터"
aliases: ["내 기술 답변 마스터", "My Tech Cards"]
---

# 내 이력서 기반 기술 답변 카드 — TOC

> **8개 마스터 카드**. 회사 문서마다 다시 쓰지 말고 여기서 fork. 각 카드 끝에 **도메인 매핑 한 줄**만 회사 컨텍스트로 교체.
> **답변 룰**: 결론 1줄 → 트레이드오프(왜 그 선택) → 도메인 매핑 1줄 → 꼬리 대비. 30~45초.

## 카드 목차

### [[My-Tech-Cards-Data|데이터/메시징 — 카드 1, 2, 3, 4]]
- **카드 1**: IoT 수천 대 동시 정합성 — DB Lock 전략 (SELECT FOR UPDATE NOWAIT)
- **카드 2**: EventBridge + SQS 이벤트 아키텍처 (발주 자동화, MSK $574/월 vs SQS $0~18/월)
- **카드 3**: 슬로우 쿼리 99.3% 개선 (복합 인덱스 + 카디널리티 분석, 15.4ms → 0.1ms)
- **카드 4**: Prisma → MySQL SubQuery API 응답 90% 개선 (`relationLoadStrategy: 'join'`)

### [[My-Tech-Cards-Ops|관측, 인프라, 아키텍처 — 카드 5, 6, 7, 8]]
- **카드 5**: Grafana/Prometheus/Loki 관측 인프라 (GPL 자체 호스팅, SLO 기반 알림)
- **카드 6**: Docker 멀티스테이지 + ECS Fargate 전환 (909MB → 513MB, 3분 → 2분)
- **카드 7**: 클린 아키텍처 + NestJS 모듈 설계 (5계층 + Hexagonal)
- **카드 8**: 캐시 전략 — Cache-Aside + 스탬피드 방어 (3초 → 0.9초)

## 답변 룰 요약

1. **결론 먼저 한 줄** → 근거, 트레이드오프 → **도메인 매핑 한 줄** → 꼬리 대비
2. **모르면 "모릅니다 + 인접 지식 + 어떻게 알아낼지"** — 추측 금지
3. **"왜 그 선택?"이 항상 따라옴** — 대안과 트레이드오프 함께
4. **도메인으로 끌어오기** — 마지막에 "{회사}에서는 ~로 매핑됩니다" 한 줄로 닫으면 가산점

## vault 카테고리 인덱스 — 답변 보강 시 어디 보면 되는지

> 마스터 카드 본문이 얕게 느껴지면 아래 vault 파일을 직접 읽고 **마스터 본문에 콘텐츠 흡수** (위키링크가 아니라 수치, 비교, 꼬리 자체). 회사별 면접 문서에 반영할 때는 `interview-prep` 스킬의 답변 생성 절차를 따른다.

### 카드별 매핑

- **카드 1 DB Lock**: [[Lock]], [[Isolation-Level]], [[Isolation-Level-Beyond-ANSI]], [[Race-Condition-Patterns]], [[Transaction-Lock-Contention]], [[MySQL-Gap-Lock]], [[MySQL-InnoDB-Tuning]], [[Transactions]]
- **카드 2 EventBridge+SQS**: [[Event-Driven-Architecture]] (전체 그림 — 8개 결정 층), [[EventBridge]], [[SQS]], [[SNS]], [[브로커(Brokers)]], [[CDC&Outbox]], [[Transactional-Outbox]], [[Idempotency-Key]], [[Saga-Pattern]], [[Event-Sourcing]]
- **카드 3 슬로우 쿼리**: [[Index]], [[Covering-Index]], [[B-Tree-Index-Depth]], [[MySQL-Slow-Query-Diagnosis]], [[Execution-Plan]], [[SQL-Tuning-Terminology]], [[Pagination-Optimization]], [[MySQL-Partitioning]], [[OLTP-vs-OLAP]]
- **카드 4 Prisma/ORM**: [[ORM]], [[ORM-Impedance-Mismatch]], [[Domain-ORM-Mapper]], [[SQL-Joins]]
- **카드 5 관측 인프라**: [[관측가능성(Observability)]], [[Logs-vs-Metrics]], [[Application-Performance-Monitoring]], [[Container-Monitoring]], [[Correlation-ID]], [[CloudWatch]]
- **카드 6 Docker/ECS**: [[Docker]], [[Multi-Stage-Build]], [[Image-Size-Optimization]], [[Docker-Image-Pipeline]], [[ECS]], [[K8s-Resource-Right-Sizing]], [[Blue-Green]], [[Replication]], [[Read-Replica-Routing]]
- **카드 7 클린 아키텍처/NestJS**: [[DDD&Hexagonal]], [[DDD]], [[DDD-Hexagonal-In-Production]], [[Layered-Clean-Hexagonal]], [[Clean-Architecture-NestJS]], [[NestJS]], [[NestJS-Middleware]], [[NestJS-Guards]], [[NestJS-AOP-Interceptor]], [[Injection-Scopes]], [[NestJS-Circular-Dependency]], [[Saga-Pattern]], [[Event-Sourcing]]
- **카드 8 캐시**: [[Cache-Basics]], [[Cache-Strategies]], [[Cache-Invalidation]], [[Cache-Stampede]], [[Redis-Architecture]], [[NestJS-Caching-Integration]]

### 범용 백엔드 안전망 (마스터 카드 밖 질문 대비)

- **Node.js/V8/이벤트 루프**: [[Event-Loop]], [[Event-Loop-Phases]], [[Event-Loop-Microtask]], [[Single-vs-Multi-Thread]], [[Worker-Threads]], [[Nodejs-Clustering]], [[V8]], [[V8-Ignition-TurboFan]], [[OOM-Troubleshooting]], [[Debugging-Profiling-Memory]]
- **NestJS 심화**: [[NestJS-Lifecycle]], [[Request-Lifecycle]], [[Custom-Provider]], [[NestJS-Pipes]], [[NestJS-Exception-Filter]], [[NestJS-Custom-Decorator]], [[NestJS-Microservices]], [[NestJS-vs-Spring]]
- **TypeScript**: [[타입스크립트(TS)]], [[TS-Type-Narrowing]], [[TS-Type-vs-Interface]], [[TS-Pattern-Matching]], [[Runtime-Validation-Libraries]], [[TypeScript-Type-Level-Programming]]
- **HTTP/REST/네트워크**: [[HTTP]], [[REST]], [[HTTP-Status-Code]], [[Idempotency]], [[Rate-Limiting]], [[API-Comparison]], [[GraphQL]], [[gRPC]], [[HTTPS-TLS]], [[TCP-Handshake]], [[OSI-7-Layer]], [[Cookie]]
- **인증/보안**: [[인증(Auth)]], [[Auth-Method-Selection]], [[JWT]], [[Session]], [[OAuth2]], [[Refresh-Token-Rotation]], [[FIDO-Seminar]], [[CSRF]], [[CORS]], [[XSS]]
- **RDBMS 심화**: [[RDBMS]], [[Normalization]], [[Sharding]], [[MySQL-vs-PostgreSQL]], [[MySQL-Architecture]], [[Schema-Migration-Large-Table]]
- **테스트/CI/CD**: [[Test-Pyramid]], [[TestContainers-Integration]], [[NestJS-Testing]], [[TDD-BDD]], [[CICD-Basics]], [[GitHub-Actions]]
- **외부 API/시스템 디자인**: [[External-API-Integration-Patterns]], [[External-Service-Resilience]], [[System-Design-Practice-Topics]], [[OLTP-vs-OLAP]], [[SCD-Type2]]
- **실시간 통신**: [[실시간(Realtime)]], [[Realtime-Communication-Comparison]], [[WebSocket]], [[STOMP-Protocol]], [[NestJS-WebSocket-Gateway]]
- **AWS**: [[ECS]], [[EventBridge]], [[SQS]], [[SNS]], [[VPC]], [[IAM]], [[CloudWatch]]

## 관련 문서

- [[My-Self-Intro|내 자기소개 마스터]]
- [[My-Motivation-Reasons|내 이직 사유 마스터]]
- [[My-FIT-Answers|내 FIT 답변 마스터]]
- [[My-Tech-Cards-Extended|기술 답변 심화 — 비교 표, 꼬리 풀, 아키텍처 디테일]]
- [[Interview-Prep-Yunhoe-1st-Tech-Extra|범용 백엔드 안전망 질문]]
