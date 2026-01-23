# 면접 준비 내용
면접 준비 내용을 정리합니다.

## 정리 해야하는 내역

### 1. Web & Network
#### 1.1 HTTP & API
- [ ] HTTP 1.1 / HTTP 2 / HTTP 3
- [ ] HTTPS / TLS Handshake
- [ ] REST / GraphQL / gRPC
- [ ] Status Code / Header / Cookie
- [ ] Content Negotiation
- [ ] Idempotent / Safe Method
- [ ] API Versioning
- [ ] Pagination / Filtering / Sorting
- [ ] Rate Limit 정책 설계

### 2. OS & Runtime
#### 2.1 Linux
- [ ] Process lifecycle
- [ ] Context switching
- [ ] Virtual memory
- [ ] Page cache
- [ ] File descriptor limit
- [ ] epoll / kqueue

#### 2.2 Runtime
- [ ] Thread vs Event Loop
- [ ] Node.js event loop phases
- [ ] Async I/O
- [ ] Promise / Callback / Stream
- [ ] Backpressure
- [ ] GC 알고리즘
- [ ] Heap snapshot
- [ ] Flamegraph
- [ ] Memory leak 패턴

### 3. Data & Storage (Core)
#### 3.1 RDB (OLTP)
- [ ] Schema design
- [ ] Normalization / Denormalization
- [ ] Index design (B-Tree, covering index)
- [ ] ACID
- [ ] Isolation Level
- [ ] Lock (row / gap / next-key)
- [ ] Deadlock handling
- [ ] Execution plan 분석
- [ ] Partitioning
- [ ] Sharding
- [ ] Replication (sync / async)
- [ ] Read replica lag 대응
- [ ] Zero-downtime migration

#### 3.2 Cache & KV Store
- [ ] Redis 자료구조
- [ ] TTL 전략
- [ ] Cache Aside / Write Through / Write Behind
- [ ] Cache invalidation
- [ ] Hot key 대응
- [ ] Session store
- [ ] Distributed lock (Redlock, fencing token)
- [ ] Cache stampede 방지

#### 3.3 Data Modeling
- [ ] ERD
- [ ] Domain model
- [ ] Aggregate boundary
- [ ] Data consistency rule
- [ ] Schema versioning
- [ ] Backward compatibility

### 4. Messaging & Data Pipeline
- [ ] Event-driven architecture
- [ ] Message Queue: SQS
- [ ] Message Queue: Kafka
- [ ] Message Queue: RabbitMQ
- [ ] Message Queue: BullMQ
- [ ] Delivery semantics
- [ ] At-least-once
- [ ] At-most-once
- [ ] Exactly-once (실무 한계)
- [ ] Idempotency key
- [ ] Deduplication 전략
- [ ] Ordering guarantee
- [ ] Consumer group
- [ ] DLQ
- [ ] Retry / Backoff
- [ ] Replay / Backfill
- [ ] CDC (Debezium 등)
- [ ] Outbox Pattern
- [ ] Saga Pattern (Choreography / Orchestration)
- [ ] Backpressure 제어
- [ ] Shadow traffic

### 5. Performance & Scalability
- [ ] Query optimization
- [ ] Index tuning
- [ ] Connection pool sizing
- [ ] Thread pool sizing
- [ ] Cache strategy
- [ ] Lock contention 분석
- [ ] CPU / Memory profiling
- [ ] Bottleneck tracing
- [ ] Load test (k6)
- [ ] Autoscaling
- [ ] Horizontal vs Vertical scaling
- [ ] Capacity planning
- [ ] Queue depth 기반 scaling
- [ ] Hot partition 대응

### 6. Observability
#### 6.1 Logging
- [ ] Structured logging
- [ ] Correlation ID / Trace ID
- [ ] Log pipeline (Promtail -> Loki -> S3)
- [ ] Log sampling
- [ ] PII masking

#### 6.2 Metrics
- [ ] RED / USE method
- [ ] Prometheus
- [ ] Cardinality 관리
- [ ] Thanos
- [ ] Long-term retention

#### 6.3 Tracing
- [ ] OpenTelemetry
- [ ] Trace context propagation

#### 6.4 Reliability
- [ ] SLI / SLO / Error budget
- [ ] Alert fatigue 방지
- [ ] Incident runbook

### 7. Infrastructure & Cloud
#### 7.1 네트워크 인프라
- [ ] Reverse Proxy (Nginx, Envoy)
- [ ] Load Balancer (L4/L7)
- [ ] CDN (Cache Key, TTL, Invalidation)
- [ ] DNS 구조 & TTL
- [ ] NAT / Public vs Private subnet

#### 7.2 AWS
- [ ] EC2 / ASG / ALB
- [ ] VPC / Subnet / NAT / SG
- [ ] RDS / Aurora
- [ ] ElastiCache
- [ ] S3
- [ ] IAM
- [ ] SQS / SNS / EventBridge
- [ ] CloudWatch
- [ ] EBS vs Instance store

#### 7.3 Container
- [ ] Docker
- [ ] Docker Compose
- [ ] Multi-stage build
- [ ] Image size optimization

#### 7.4 Kubernetes
- [ ] Pod / Deployment / Service / Ingress
- [ ] HPA / VPA
- [ ] ConfigMap / Secret
- [ ] Resource request / limit
- [ ] Liveness / Readiness probe
- [ ] PodDisruptionBudget
- [ ] Node autoscaling

### 8. CI/CD & Delivery
- [ ] Git Flow / Trunk based
- [ ] GitHub Actions
- [ ] Build cache
- [ ] Docker image build pipeline
- [ ] Helm
- [ ] ArgoCD (GitOps)
- [ ] Blue/Green
- [ ] Canary
- [ ] Feature flag 시스템
- [ ] Rollback 전략
- [ ] Zero-downtime deployment
- [ ] DB migration 전략

### 9. Testing & Quality
- [ ] Unit test
- [ ] Integration test
- [ ] E2E test (supertest)
- [ ] Contract test
- [ ] Test fixture 전략
- [ ] Test isolation
- [ ] Deterministic test
- [ ] Load test automation
- [ ] Chaos testing (optional)

### 10. Security
#### 10.1 인증 & 보안
- [ ] Session / JWT
- [ ] OAuth2 / OIDC
- [ ] Refresh Token Rotation
- [ ] Token Revocation
- [ ] CSRF Protection
- [ ] CORS / CSP

#### 10.2 웹/앱 보안
- [ ] SQL Injection
- [ ] XSS / CSRF
- [ ] SSRF
- [ ] JWT security
- [ ] Secret management (KMS / Vault)
- [ ] TLS config
- [ ] Rate limit
- [ ] WAF
- [ ] Audit log
- [ ] Least privilege IAM
- [ ] Dependency vulnerability scanning

### 11. Reliability Engineering
- [ ] Timeout
- [ ] Retry / Backoff
- [ ] Circuit breaker
- [ ] Bulkhead
- [ ] Graceful shutdown
- [ ] Idempotent consumer
- [ ] Data recovery
- [ ] Backup / Restore
- [ ] DR strategy (multi-region)
- [ ] RCA / Postmortem 문화

### 12. Architecture & Design
- [ ] Layered / Clean / Hexagonal
- [ ] DDD
- [ ] Monolith vs Microservice
- [ ] Event-driven
- [ ] API versioning
- [ ] Backward compatibility
- [ ] Schema evolution
- [ ] Tech debt management
- [ ] ADR (Architecture Decision Record)

### 13. Cost & Operations (FinOps)
- [ ] AWS pricing 구조
- [ ] Reserved Instance / Savings Plan
- [ ] Storage tiering
- [ ] Egress cost 관리
- [ ] Autoscaling 비용 최적화
- [ ] Cost anomaly detection
- [ ] Budget alert
- [ ] Resource right-sizing

### 14. Senior Engineer Capabilities
- [ ] 기술 의사결정
- [ ] 트레이드오프 설명
- [ ] 시스템 설계 인터뷰 대응
- [ ] 장애 대응 리딩 (Incident Commander)
- [ ] 데이터 기반 의사결정
- [ ] 멘토링
- [ ] 기술 로드맵 수립
- [ ] RFC 작성
- [ ] Cross-team communication
- [ ] 채용 인터뷰
