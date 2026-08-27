---
tags: [fit, interview, common, my-answers, tech]
status: index
category: "Interview - 내 답변 마스터"
aliases: ["내 기술 답변 마스터", "My Tech Cards"]
---

# 내 이력서 기반 기술 답변 카드

> 회사별 문서는 이 카드에서 fork하고, 회사 컨텍스트는 공개 채용 정보만으로 한 줄 매핑한다. 내부 수치와 운영 임계값은 넣지 않는다. 특정 면접의 문답과 전형 기록은 회고에 보존하고, 이 카드에는 재사용 가능한 본인 설명만 둔다.

## 답변 구조

결론을 먼저 말하고, 선택 이유와 트레이드오프를 설명한 뒤, 검증 방법과 지원 회사의 공개된 문제를 연결한다. 기억이 불확실한 수치는 말하지 않고 재현 가능한 검증으로 바꾼다.

### [[My-Tech-Cards-Data|데이터와 메시징]]

- **카드 1**: IoT 입력 동시 갱신, `NOWAIT` DB Lock과 제한 재시도
- **카드 2**: EventBridge, SQS와 DLQ를 이용한 비동기 처리, 미적용 Outbox 개선안
- **카드 3**: 최신 상태 조회의 실행 계획, 복합 인덱스, 쿼리 재검증
- **카드 4**: Prisma 관계 로딩 전략, 생성 SQL, API 지연 분석

### [[My-Tech-Cards-Ops|관측, 인프라, 아키텍처]]

- **카드 5**: 구조화 로그, Prometheus 메트릭, Grafana와 Loki 관측 설계
- **카드 6**: Docker 멀티스테이지와 관리형 컨테이너 배포 경로
- **카드 7**: Clean Architecture 스타일, UseCase와 NestJS 모듈 경계
- **카드 8**: Cache Warming, Cache-Aside, 스탬피드 방어

### [[My-Tech-Cards-Extended|심화 비교와 꼬리 질문]]

- 잠금, 전달 보장, 쿼리 계획, 관측성, 인프라 전환의 대안과 조건
- 공식 문서에서 확인 가능한 서비스 한도와 버전 차이

## 말하기 원칙

- 내부 성과는 문제, 선택, 검증, 사용자 영향 순서로 설명한다.
- 실제 운영 수치, 고객 정보, 배포 일정, 경보 기준은 공개하지 않는다.
- 기술 선택은 제품 규모를 추측해 단정하지 않고, 데이터 특성, 실패 비용, 운영 능력을 기준으로 비교한다.
- 모르는 범위는 아는 척하지 않고, 인접한 경험과 확인할 방법을 구분해 답한다.

## vault 심화

- **카드 1**: [[Lock]], [[Lock-Deadlock]], [[Transactions]], [[Isolation-Level]], [[Race-Condition-Patterns]], [[Retry-Backoff-Jitter]], [[Lock-Wait-Convoy]], [[Transaction-Lock-Contention]], [[MySQL-Gap-Lock]]
- **카드 2**: [[Event-Driven-Architecture]], [[EventBridge]], [[EventBridge-SQS-Target]], [[SQS]], [[Messaging-Broker-Comparison]], [[Delivery-Semantics]], [[Idempotency-Key]], [[Idempotent-Consumer]], [[SQS-Worker-Reliability]], 미적용 개선안 [[Transactional-Outbox]]과 [[CDC&Outbox]]
- **카드 3**: [[Index]], [[Execution-Plan]], [[Covering-Index]], [[B-Tree-Index-Depth]], [[MySQL-Slow-Query-Diagnosis]], [[MySQL-Query-Pipeline-and-Sorting]], [[Pagination-Optimization]]
- **카드 4**: [[Prisma-Query-Performance]], [[TypeORM-QueryBuilder]], [[TypeORM-Transactions-and-Replication]], [[ORM]], [[ORM-Impedance-Mismatch]], [[SQL-Joins]]
- **카드 5**: [[관측가능성(Observability)]], [[Logs-vs-Metrics]], [[Prometheus]], [[RED-USE-Method]], [[SLI-SLO]], [[Cardinality]], [[Correlation-ID]], [[OpenTelemetry]], [[Exemplars]], [[Loki]], [[Alert-Fatigue]]
- **카드 6**: [[Docker]], [[Multi-Stage-Build]], [[ECS]], [[ELB]], [[ECS-Service-AutoScaling]], [[ECS-Rolling-Deployment]], [[ECS-Secrets-Injection]], [[Container-Entrypoint-Signals]], [[Blue-Green]], [[Replication]], [[Read-Replica-Routing]]
- **카드 7**: [[DDD&Hexagonal]], [[Clean-Architecture-NestJS]], [[NestJS]], [[Request-Lifecycle]], [[NestJS-Middleware]], [[NestJS-Guards]], [[NestJS-AOP-Interceptor]], [[Injection-Scopes]], [[NestJS-Circular-Dependency]]
- **카드 8**: [[Cache-Basics]], [[Cache-Decision]], [[Cache-Strategies]], [[Cache-Invalidation]], [[Cache-Stampede]], [[Redis-Architecture]], [[Redis-Data-Structures]], [[Redis-Streams-PubSub]], [[Redis-Cluster-Sharding]], [[External-Collection-Pipeline-Reliability]]

## 범용 기술 안전망

- **Node.js와 런타임**: [[Event-Loop]], [[Event-Loop-Phases]], [[Single-vs-Multi-Thread]], [[Worker-Threads]], [[V8]], [[OOM-Troubleshooting]]
- **TypeScript와 NestJS**: [[타입스크립트(TS)]], [[TS-Type-Narrowing]], [[Runtime-Validation-Libraries]], [[NestJS-Lifecycle]], [[Custom-Provider]], [[NestJS-Pipes]], [[NestJS-Exception-Filter]]
- **HTTP와 API**: [[HTTP]], [[REST]], [[HTTP-Status-Code]], [[Idempotency]], [[Rate-Limiting]], [[GraphQL]], [[gRPC]], [[HTTPS-TLS]]
- **인증과 보안**: [[인증(Auth)]], [[Auth-Method-Selection]], [[JWT]], [[Session]], [[OAuth2]], [[Refresh-Token-Rotation]], [[FIDO-WebAuthn]], [[CSRF]], [[CORS]], [[XSS]]
- **데이터베이스**: [[RDBMS]], [[Normalization]], [[Sharding]], [[MySQL-vs-PostgreSQL]], [[Schema-Migration-Large-Table]]
- **테스트와 전달**: [[Test-Pyramid]], [[TestContainers-Integration]], [[NestJS-Testing]], [[TDD-BDD]], [[CICD-Basics]], [[GitHub-Actions]]
- **시스템 설계**: [[External-API-Integration-Patterns]], [[External-Service-Resilience]], [[System-Design-Practice-Topics]], [[OLTP-vs-OLAP]], [[SCD-Type2]]
