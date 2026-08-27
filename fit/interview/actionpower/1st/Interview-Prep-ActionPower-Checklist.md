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
| 읽기 복제본 (복제 지연, 장애 조치, 읽기와 쓰기 경로 분리) | [[Replication\|복제]] | [ ] |
| 캐시 전략 심화 (Cache-Aside, 무효화, 스탬피드, 실무: 메타데이터 캐시) | [[Cache-Strategies\|캐시전략]], [[Cache-Invalidation\|무효화]], [[Cache-Stampede\|스탬피드]] | [ ] |
| ORM 심화 (관계 로딩 전략, 생성 SQL, 인덱스 검증) | [[ORM\|ORM]] | [ ] |

**아키텍처 / 설계 패턴**

| 영역                                                                | 관련 문서                                                                                 | 복습 완료 |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----- |
| 클린 아키텍처 (Controller→UseCase→DomainService→Repository)             | (외부 자료)                                                                               | [ ]   |
| REST API 설계 (리소스 URI, 상태 코드, 버전 관리, 에러 포맷)                        | [[REST\|REST]], [[HTTP-Status-Code\|HTTP상태코드]]                                        | [ ]   |
| 비동기 처리 패턴 (큐+워커+알림, DLQ, 멱등성, Transactional Outbox)               | [[Messaging-Patterns\|메시징패턴]], [[Delivery-Semantics\|전달보장]], [[Idempotency-Key\|멱등성]], [[Transactional-Outbox\|아웃박스]] | [ ]   |
| 메시지 전달 모델 비교 (큐, 스트림, 팬아웃의 비용과 운영 트레이드오프)                  | [[MQ-Kafka\|Kafka]], [[SQS\|SQS]], [[EventBridge\|EventBridge]], [[Messaging-Patterns\|메시징패턴]]  | [ ]   |
| Circuit Breaker / 재시도 패턴 (exponential backoff, jitter, half-open) | (외부 자료)                                                                               | [ ]   |
| 멀티테넌시 설계 (논리적/스키마/물리적 격리, noisy neighbor)                         | (외부 자료)                                                                               | [ ]   |

**NestJS / Node.js**

| 영역 | 관련 문서 | 복습 완료 |
|------|---------|----------|
| NestJS 심화 (DI/IoC 컨테이너, 모듈, 라이프사이클, 순환 참조) | [[NestJS\|NestJS]], [[Request-Lifecycle\|요청라이프사이클]] | [ ] |
| Node.js 이벤트 루프/libuv | [[Event-Loop\|이벤트루프]], [[libuv\|libuv]], [[Thread-vs-Event-Loop\|스레드vs이벤트루프]] | [ ] |
| Node.js 비동기 프로그래밍 심화 | [[Async-Programming\|비동기프로그래밍]], [[Async-Internals\|비동기내부구조]] | [ ] |
| V8 엔진/콜스택/힙 메모리 | [[V8\|V8]], [[Call-Stack-Heap\|콜스택, 힙]] | [ ] |
| Node.js 스트림/백프레셔 | [[Stream\|스트림]], [[Backpressure\|백프레셔]] | [ ] |
| Node.js Worker Threads/클러스터링 | [[Worker-Threads\|워커스레드]], [[Concurrency-and-Process\|동시성, 프로세스]] | [ ] |
| Node.js 디버깅/프로파일링 | [[Debugging-Profiling\|디버깅, 프로파일링]] | [ ] |
| Graceful Shutdown (무중단 배포와 연관) | [[Graceful-Shutdown\|Graceful Shutdown]] | [ ] |

**인프라 / DevOps**

| 영역 | 관련 문서 | 복습 완료 |
|------|---------|----------|
| GCP ↔ AWS 서비스 매핑 (6개 핵심 서비스) | (외부 자료) | [ ] |
| Docker 멀티스테이지 빌드 / .dockerignore 최적화 | [[Multi-Stage-Build\|멀티스테이지빌드]] | [ ] |
| 관측성 (로그, 메트릭, 트레이스와 사용자 영향 SLI, 경보 피로와 SLO 개선안) | [[Incident-Detection-Logging\|장애탐지, 로깅]], [[Structured-Logging\|구조화로깅]], [[Log-Pipeline\|로그파이프라인]] | [ ] |
| 장애 대응 프로세스 (알림→파악→롤백/핫픽스→원인분석→재발방지, P1~P4 등급) | [[Incident-Recovery-Prevention\|장애복구, 예방]] | [ ] |

**테스트 / 품질**

| 영역 | 관련 문서 | 복습 완료 |
|------|---------|----------|
| 테스트 전략 (피라미드, 유닛→통합→E2E, SonarQube 커버리지 관리) | [[Service-Layer-Testing\|서비스레이어테스트]], [[Test-Fixture\|픽스처]], [[Test-Isolation\|격리]] | [ ] |

### 강하게 어필할 포인트
1. **NestJS + TypeScript + 관계형 데이터베이스** — 당시 공고에서 읽은 백엔드 역할과 연결
2. **동시 갱신 정합성** — `SELECT FOR UPDATE NOWAIT`와 재시도 로직으로 Lost Update를 막는 판단 기준을 사용자 상태 변경 문제에 연결
3. **이벤트 기반 자동화** — 전달 보장, 운영 부담과 복구 요구를 비교해 후속 처리를 분리하는 원칙을 "엔지니어 개입 최소화를 위한 자동화" JD 문구와 연결
4. **슬로우 쿼리와 API 응답 개선** — 카디널리티 분석 기반 복합 인덱스로 최신 상태 조회 범위를 좁히고, 데이터가 늘면 실행계획, 캐시와 I/O를 다시 측정
5. **관측성 설계** — 사용자 영향 SLI와 상관관계 ID를 이용한 로그 추적, 정적 경보와 SLO 개선안을 구분
6. **확장 가능한 배포 경로** — 요청 경계를 분리하고, 컨테이너 오토스케일링과 읽기 확장을 검토하는 판단 기준
7. **복잡한 요구 검증 경험** — 모듈 경계와 API 계약으로 요구사항 변화에 대응
8. **커뮤니티 기여** — ORM 조회 성능의 검증 방법을 기술 발표로 공유하고, 백엔드 멘토링으로 설명력을 점검

### 주의사항
> [[FIT-Framework#면접 현장 주의사항|면접 현장 주의사항]] 참고

- **"성급함" 단점 → 기술적 실행 판단 예시로 한정** (이전 이직 기간과 연결하지 않기)
- **CTO 목표 → "권한"이 아니라 "영향력"과 "기여의 크기"로 표현**
- **GCP 경험 없음을 방어적으로 말하지 않기** → 컨테이너, 관리형 데이터와 메시징의 개념은 전이되고, 서비스별 제약은 공식 문서와 작은 검증으로 확인한다고 답한다.
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
