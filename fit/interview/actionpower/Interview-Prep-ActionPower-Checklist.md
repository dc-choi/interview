---
tags: [fit, interview, actionpower]
status: done
category: "Interview - Fit"
aliases: ["ActionPower 1차 면접 체크리스트", "액션파워 1차 체크리스트"]
---
# 액션파워 1차 — 면접 준비 체크리스트

> 상위 TOC: [[Interview-Prep-ActionPower|액션파워 1차 면접 준비]]

---

## 5. 면접 준비 체크리스트

### 보강이 필요한 기술 영역

**DB / 성능 최적화**

| 영역 | 관련 문서 | 복습 완료 |
|------|---------|----------|
| DB Lock 심화 (S/X Lock, Record/Gap/Next-Key Lock, Optimistic vs Pessimistic, 데드락 탐지) | [[Lock\|DB Lock]], [[Transaction-Lock-Contention\|트랜잭션경합]] | [ ] |
| 트랜잭션/격리수준 (RR vs RC, MVCC, gap lock, Phantom Read, Current Read vs Consistent Read) | [[Transactions\|트랜잭션]], [[Isolation-Level\|격리수준]] | [ ] |
| 인덱스/실행계획 (카디널리티, 선택도, 커버링, 복합 인덱스) | [[Index\|인덱스]], [[Execution-Plan\|실행계획]] | [ ] |
| Read Replica (Replication Lag, failover, Prisma 연결 설정) | [[Replication\|복제]] | [ ] |
| 캐시 전략 심화 (Cache-Aside, 무효화, 스탬피드, 실무: 메타데이터 캐시) | [[Cache-Strategies\|캐시전략]], [[Cache-Invalidation\|무효화]], [[Cache-Stampede\|스탬피드]] | [ ] |
| Prisma ORM 심화 (app-level join, relationLoadStrategy, @@index) | [[ORM\|ORM]] | [ ] |

**아키텍처 / 설계 패턴**

| 영역                                                                | 관련 문서                                                                                 | 복습 완료 |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----- |
| 클린 아키텍처 (Controller→UseCase→DomainService→Repository)             | (외부 자료)                                                                               | [ ]   |
| REST API 설계 (리소스 URI, 상태 코드, 버전 관리, 에러 포맷)                        | [[REST\|REST]], [[HTTP-Status-Code\|HTTP상태코드]]                                        | [ ]   |
| 비동기 처리 패턴 (큐+워커+알림, DLQ, 멱등성, Transactional Outbox)               | [[Messaging-Patterns\|메시징패턴]], [[Delivery-Semantics\|전달보장]], [[Idempotency-Key\|멱등성]], [[Transactional-Outbox\|아웃박스]] | [ ]   |
| 메시지 큐 비교 (Kafka vs SQS vs Pub/Sub, 비용/운영 트레이드오프)                  | [[MQ-Kafka\|Kafka]], [[SQS\|SQS]], [[EventBridge\|EventBridge]], [[Messaging-Patterns\|메시징패턴]]  | [ ]   |
| Circuit Breaker / 재시도 패턴 (exponential backoff, jitter, half-open) | (외부 자료)                                                                               | [ ]   |
| 멀티테넌시 설계 (논리적/스키마/물리적 격리, noisy neighbor)                         | (외부 자료)                                                                               | [ ]   |

**NestJS / Node.js**

| 영역 | 관련 문서 | 복습 완료 |
|------|---------|----------|
| NestJS 심화 (DI/IoC 컨테이너, 모듈, 라이프사이클, 순환 참조) | [[NestJS\|NestJS]], [[Request-Lifecycle\|요청라이프사이클]] | [ ] |
| Node.js 이벤트 루프/libuv | [[Event-Loop\|이벤트루프]], [[libuv\|libuv]], [[Thread-vs-Event-Loop\|스레드vs이벤트루프]] | [ ] |
| Node.js 비동기 프로그래밍 심화 | [[Async-Programming\|비동기프로그래밍]], [[Async-Internals\|비동기내부구조]] | [ ] |
| V8 엔진/콜스택/힙 메모리 | [[V8\|V8]], [[Call-Stack-Heap\|콜스택·힙]] | [ ] |
| Node.js 스트림/백프레셔 | [[Stream\|스트림]], [[Backpressure\|백프레셔]] | [ ] |
| Node.js Worker Threads/클러스터링 | [[Worker-Threads\|워커스레드]], [[Concurrency-and-Process\|동시성·프로세스]] | [ ] |
| Node.js 디버깅/프로파일링 | [[Debugging-Profiling\|디버깅·프로파일링]] | [ ] |
| Graceful Shutdown (무중단 배포와 연관) | [[Graceful-Shutdown\|Graceful Shutdown]] | [ ] |

**인프라 / DevOps**

| 영역 | 관련 문서 | 복습 완료 |
|------|---------|----------|
| GCP ↔ AWS 서비스 매핑 (6개 핵심 서비스) | (외부 자료) | [ ] |
| Docker 멀티스테이지 빌드 / .dockerignore 최적화 | [[Multi-Stage-Build\|멀티스테이지빌드]] | [ ] |
| 모니터링 (Prometheus+Thanos, Loki, Grafana Alerting, SLO 기반 경보) | [[Incident-Detection-Logging\|장애탐지·로깅]], [[Structured-Logging\|구조화로깅]], [[Log-Pipeline\|로그파이프라인]] | [ ] |
| 장애 대응 프로세스 (알림→파악→롤백/핫픽스→원인분석→재발방지, P1~P4 등급) | [[Incident-Recovery-Prevention\|장애복구·예방]] | [ ] |

**테스트 / 품질**

| 영역 | 관련 문서 | 복습 완료 |
|------|---------|----------|
| 테스트 전략 (피라미드, 유닛→통합→E2E, SonarQube 커버리지 관리) | [[Service-Layer-Testing\|서비스레이어테스트]], [[Test-Fixture\|픽스처]], [[Test-Isolation\|격리]] | [ ] |

### 강하게 어필할 포인트
1. **NestJS + TypeScript + MySQL** — JD 자격요건과 정확히 일치
2. **수천 대 IoT 동시 요청 처리** — SELECT FOR UPDATE NO WAIT + 재시도 로직으로 동시 5대 경합에서도 Lost Update 방지 (다글로 180만 사용자와 연결)
3. **이벤트 기반 발주 자동화** — MSK 대비 99.99% 비용 절감, 수기 재고관리 4시간→10분(95.8%), 수기 발주 1시간→완전 자동화. "엔지니어 개입 최소화를 위한 자동화" JD 문구와 직접 연결
4. **슬로우 쿼리 99.3% 개선(15.4ms→0.1ms) + API 90% 향상** — 카디널리티 분석 기반 복합 인덱스 설계, 3,000대 확장에도 성능 무관한 구조
5. **GPL 스택 모니터링 인프라 직접 구축** — SLO 기반 경보 정책, 요청 단위 추적(TraceId), 비정상 상태 감지 후 5분 내 대응률 향상
6. **단일 서버 → 스케일링 아키텍처 전환** — ALB+NLB 이중 구성(웹/IoT 분리), ECS Fargate 오토스케일링, Read Replica로 조회 40% 향상+DB CPU 30% 감소
7. **대형 고객사 PoC 성공** — 연매출 280억 제약바이오사, 2000억 F&B 기내식 기업. 클린 아키텍처 기반 모듈 설계로 고객사별 요구사항 유연 대응
8. **커뮤니티 기여** — 하코 3000명 규모 커뮤니티에서 Prisma 성능 90% 개선 주제 발표, 카카오테크 캠퍼스 백엔드 멘토

### 주의사항
> [[FIT#면접 현장 주의사항|면접 현장 주의사항]] 참고

- **"성급함" 단점 → 기술적 실행 판단 예시로 한정** (이썸테크 6개월 퇴사와 연결하지 않기)
- **CTO 목표 → "권한"이 아니라 "영향력"과 "기여의 크기"로 표현**
- **GCP 경험 없음을 방어적으로 말하지 않기** → "AWS에서 동일한 패턴을 경험했고, 클라우드 개념은 이전 가능하다"로 자신감 있게
- **AI 경험 없음을 약점으로 인정하되** → "AI 모델 자체가 아니라 AI를 안정적으로 서빙하는 백엔드 인프라가 내 역할"로 포지셔닝
- **1차는 직무 면접** — 기술 답변에 집중. 컬처핏은 2차에서 더 깊게 나올 것

---

## 관련 문서
- [[Interview-Prep-ActionPower|1차 면접 TOC]]
- [[Interview-Prep-ActionPower-JD|JD 분석 & FIT 답변]]
- [[Interview-Prep-ActionPower-Tech-Resume1|이력서 기술 질문 1]]
- [[Interview-Prep-ActionPower-Tech-Resume2|이력서 기술 질문 2]]
- [[Interview-Prep-ActionPower-Tech-Resume3|이력서 기술 질문 3]]
- [[Interview-Prep-ActionPower-Tech-Resume4|이력서 기술 질문 4]]
- [[Interview-Prep-ActionPower-Tech-JD|JD 기반 기술 질문]]
- [[Interview-Prep-ActionPower-Service|서비스 맥락 + 컬처핏 + 역질문]]
