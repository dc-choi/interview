---
tags: [fit, interview, actionpower]
status: active
category: "Interview - Fit"
aliases: ["ActionPower Interview Prep", "액션파워 면접 준비"]
---

# 액션파워 (다글로) 면접 준비

> 면접일: 2026.03.31 (1차 면접 - 직무 적합성)
> 채용 공고: https://actionpower.notion.site/Backend-302ca999eeb2805fba12de3df6c74396
> 템플릿: [[Interview-Prep-Template|면접 준비 템플릿]]

---

## 1. JD 분석

### 회사 개요

| 항목 | 내용 |
|------|------|
| 회사명 | 액션파워 (ActionPower) |
| 서비스 | 다글로 — AI 생산성 플랫폼 (STT, 문서 번역, 슬라이드 생성, 문제 생성, AI 대화) |
| 단계 | Series B (60억 원 투자 유치) |
| 규모 | 180만 가입자, 매년 3배 성장, 구글플레이 BEST 자기계발 앱 |
| 도메인 | AI SaaS (B2C + B2B 엔터프라이즈) |
| BM 추정 | B2C 프리미엄 구독 + B2B 엔터프라이즈 솔루션/API 판매 (삼성물산, 대구시청, DB생명 등) |

### 포지션 정보

| 항목 | 내용 |
|------|------|
| 포지션 | Backend 개발자 (주니어) |
| 연차 | 3년 이상 |
| 주요 업무 | AI 기능 백엔드 설계·개발·운영, 자동화 시스템 구축, 유관 부서 협업 |
| 채용 절차 | 서류 → **1차 면접(직무)** → 2차 면접(컬처핏) → 처우협의 → 최종합격 |
| 수습 | 3개월 |

### 핵심 키워드 (면접에서 반복 등장할 것)
- **대규모 트래픽**: 1,300만 시간 음성, 1조 토큰
- **AI 서빙**: STT, LLM API 호출, 비동기 처리
- **확장성**: 급격한 사용량 증가 대응
- **자동화**: 엔지니어 개입 최소화
- **속도**: 빠르게 발전하는 AI 기술 검증·통합

### 자격요건 vs 내 경험 매칭

| 자격요건                    | 매칭도   | 내 근거                                              |
| ----------------------- | ----- | ------------------------------------------------- |
| Node.js, TypeScript 3년+ | **강** | 4년차. 트라이포드랩(NestJS/TS), 시솔지주(Express/JS)          |
| NestJS API 개발 능숙        | **강** | 트라이포드랩 2년 2개월 NestJS 메인. 모듈 분리 설계, PoC 성공         |
| MySQL/PostgreSQL 서비스 운영 | **강** | MySQL 기반 슬로우쿼리 99.3% 개선, 복합 인덱스 최적화, Read Replica |
| RESTful API 설계          | **강** | API 설계·문서화, 프론트엔드 협업 경험                           |
| DB 모델링                  | **강** | MongoDB→MySQL 마이그레이션, 도메인별 모듈 분리 설계               |
| 캐시/트랜잭션 관리              | **강** | Redis 스킬 보유, DB Lock 기반 동시성 제어, 트랜잭션 정합성 확보       |

### 우대사항 vs 내 경험 매칭

| 우대사항 | 매칭도 | 내 근거 |
|---------|--------|--------|
| GCP 클라우드 경험 | **약** | AWS 경험 풍부 (ECS, RDS, CloudFront, EventBridge, SQS). GCP 직접 경험 없음 |
| 메시지 큐 (RabbitMQ, Kafka, Pub/Sub) | **중** | AWS EventBridge+SQS 기반 이벤트 아키텍처 설계·운영. Kafka/Pub/Sub 직접 경험은 없으나 개념 숙지 |
| 테스트 코드 작성 | **중** | 시솔지주: Mocha+Chai+SonarQube로 테스트 커버리지 0→70% 달성, PR 연동 60% 미달 시 머지 불가. 트라이포드랩: jest+supertest, 스케줄링/비즈니스 로직 분리 설계 |
| 장애 분석/대응 | **강** | Grafana/Prometheus/Loki 모니터링+알림 직접 구축, 병목 조기 탐지 |

### 기술 스택 비교

| JD 스택 (추정) | 내 경험 | 갭 분석 |
|---------------|--------|--------|
| Node.js / TypeScript | Node.js / TypeScript | 동일 |
| NestJS | NestJS | 동일 |
| MySQL or PostgreSQL | MySQL | 동일 (PostgreSQL 차이점 숙지 필요) |
| GCP (Cloud Run, Pub/Sub 등) | AWS (ECS, SQS, EventBridge 등) | 유사 — 개념 동일, 서비스명 매핑 필요 |
| 메시지 큐 (Pub/Sub/Kafka) | EventBridge + SQS | 유사 — 패턴 동일, 구체적 도구 차이 |
| Redis (캐시) | Redis | 동일 |

---

## 2. 회사 맞춤 FIT 답변

### 1분 자기소개
> 구조: 이름/역할 → 도메인 경험 → 핵심 성과 → 핵심 철학 → 왜 다글로 → 마무리

안녕하세요, 4년차 백엔드 개발자 최동철입니다.

트라이포드랩에서 NestJS 기반 VMI 서비스의 핵심 기능을 설계하고 운영해왔습니다. 수천 대 IoT 기기가 동시에 재고 데이터를 전송하는 환경에서 DB Lock으로 데이터 정합성을 확보하고, EventBridge와 SQS 기반 이벤트 아키텍처로 수기 발주 프로세스를 완전 자동화했습니다. 운영 중에는 복합 인덱스 최적화로 슬로우 쿼리를 99.3% 개선하고, Grafana 기반 모니터링 인프라를 구축해 장애 대응 체계를 마련했습니다.

저는 빠르게 만드는 것보다 **운영에서 깨지지 않는 구조**를 중시합니다. 다글로가 1,300만 시간의 음성 데이터를 처리하면서 급격히 성장하고 있다는 점에서, 제가 쌓아온 대규모 동시 요청 처리와 시스템 안정화 경험이 잘 맞을 것이라 생각해 지원했습니다.

### 지원 동기
> 구조: 회사의 미션 이해 → 내 관련 경험 → 연결점 → 기여하고 싶은 것

- **회사의 문제**: 다글로는 단순한 AI 앱이 아니라, 180만 사용자의 음성·문서·학습 데이터를 실시간으로 처리하는 대규모 AI 플랫폼. 급성장하면서 안정성과 확장성을 동시에 확보해야 하는 단계
- **내 연결점**: 트라이포드랩에서 정확히 같은 문제를 풀었음 — PMF 달성 후 대형 고객사 확장, 단일 서버에서 CloudFront+ECS 아키텍처로 전환, 이벤트 기반 자동화로 운영 부담 제거
- **기여하고 싶은 것**: B2B 엔터프라이즈 확장 단계에서 시스템이 깨지지 않도록 안정적인 백엔드 구조를 함께 만들어가고 싶음. 특히 "엔지니어 개입 최소화를 위한 자동화"라는 JD 문구에 공감 — 발주 자동화 경험이 직접 연결됨

### 이직 사유
> B2C+B2B 혼합 → B2B 관점 + B2C 성장 관점 동시 활용

- 트라이포드랩에서 VMI 서비스의 0→1 구축부터 대형 고객사 PoC까지 경험하며 충분히 성장
- 하지만 PoC 단계 반복이라 **실제 대규모 사용자가 매일 쓰는 서비스**를 운영하는 경험이 부족하다고 느낌
- 다글로는 180만 사용자가 실제로 사용하면서, 동시에 B2B 확장도 하고 있음 — B2C의 빠른 피드백 사이클과 B2B의 안정성 요구를 동시에 경험할 수 있는 환경
- 꼬리 대비: "PoC와 운영의 차이가 뭔가?" → PoC는 동작 증명, 운영은 장애·성능·비용·확장 모든 것을 고려. 이미 모니터링 구축, 인프라 전환 등 운영 경험도 있지만 더 큰 규모에서 검증하고 싶음

---

## 3. 예상 질문 (면접관 → 나)

### 이력서 기반 기술 질문

#### DB Lock으로 Race Condition 해결 — 어떤 Lock? 왜 그 방식? Optimistic vs Pessimistic?
> 관련: [[Transaction-Lock-Contention|트랜잭션·락]], [[Transactions|트랜잭션]], [[Distributed-Lock|분산락]]

- Pessimistic Lock (`SELECT FOR UPDATE NO WAIT`) 선택
- 품목 단위 row lock으로 재고 읽기+갱신을 원자적 처리
- NO WAIT로 lock 획득 실패 시 즉시 실패 → 100ms 간격 최대 3회 재시도(최악 1초 이내)
- 트랜잭션 범위 최소화: 디바이스 정보 조회·검증은 트랜잭션 밖, 재고 갱신+데이터 입력만 lock 구간
- 초기에 Redis 분산락 검토했으나 별도 인프라 의존성+네트워크 레이턴시 리스크로 DB 트랜잭션 레벨 제어로 전환

#### 슬로우 쿼리 99.3% 개선 — 측정 기준? EXPLAIN 분석 방법?
> 관련: [[Index|인덱스]], [[Execution-Plan|실행계획]]

- 디바이스 최신 상태 조회 서브쿼리 2000ms+ 소요
- 테이블 100만 건, 850대 디바이스, 디바이스당 평균 1,240건 균등 분포
- EXPLAIN ANALYZE로 `ORDER BY created_at DESC, id DESC` 후 전체 행 filesort 확인
- 카디널리티 분석: 디바이스 번호 선택도 0.08% → 복합 인덱스 `(device_number, created_at DESC, id DESC)` 설계
- 인덱스 스캔만으로 최상단 레코드 즉시 접근. Prisma `@@index`로 선언
- 결과: 쿼리당 15.4ms → 0.1ms. 3,000대 확장 시에도 인덱스 탐색 1건이라 데이터 양에 무관한 구조

#### Prisma 쿼리 증가 문제 — 구체적으로? ORM vs Raw Query 전환 기준?
> 관련: [[Execution-Plan|실행계획]], [[SQL|SQL]]

- Prisma는 lazy loading이 없어 전통적 N+1은 아님
- 문제는 app-level join 방식 — include 시 SQL JOIN이 아니라 관계마다 별도 쿼리를 발생시켜, 조인 엔티티가 늘어날수록 쿼리가 N개씩 증가
- 기존 평균 100ms → 1000ms까지 저하
- 로그 분석으로 4개 개별쿼리 확인 → 공식 문서 검토하여 relationLoadStrategy: 'join' 발견
- DB-level JOIN 전환만으로 82~90% 성능 개선
- 이후에도 문제가 생기면 실행 계획 확인 후 SQL 튜닝 단계로 넘어가야 함

#### EventBridge+SQS 선택 이유? Kafka와 차이?
> 관련: [[MQ-Kafka|MQ·Kafka]], [[Messaging-Patterns|메시징패턴]], [[Delivery-Semantics|전달보장]]

- 실제 비용 비교: MSK $574/월 vs EventBridge+SQS $0~18/월 (월 10만 발주 × 5액션 = 50만 SQS 메시지, Free Tier 범위)
- 발주라는 도메인 특성상 실시간 처리 불필요 + 최종 일관성이면 충분
- 이벤트 플로우: 발주 → SQS → 수주처리 → SQS → 카톡/이메일/발주서 각각 병렬 처리
- 채널별 DLQ 설정(카톡: 잘못된 번호 시 실패 처리, 이메일: 무조건 재시도)
- Kafka가 필요한 시점: 이벤트 리플레이, 순서 보장, 초당 수만건 이상

#### Docker 이미지 43% 경량화 — 어떻게?
> 관련: [[Multi-Stage-Build|멀티스테이지빌드]]

- NestJS 이미지가 909MB(Spring 수준)로 비정상
- .dockerignore로 불필요 파일 제외 + 멀티스테이지 빌드(build stage → production stage에 필요 파일만 복사)
- 결과: 909MB → 513MB(43.6%), 배포 시간 3분10초 → 2분20초(26.3% 단축)
- ECR 저장 비용도 절감

#### CloudFront+ECS 전환 — 왜? 어떤 문제가 있었나?
> 관련: [[Load-Balancer|로드밸런서]], [[Docker|Docker]]

- 단일 EC2에서 Nginx+App 동시 구동 → 트래픽 급증 시 CPU/메모리 집중+배포 시 서비스 중단 위험
- CloudFront(정적 리소스 캐싱) + ALB(웹 트래픽) + NLB(IoT 디바이스 고정 IP 통신) + ECS Fargate(오토스케일링) + Rolling Update 무중단 배포
- IoT 디바이스의 IP 기반 통신 요구사항 때문에 NLB를 별도 구성

#### Grafana/Prometheus/Loki — 무엇을 모니터링? 알림 기준?
> 관련: [[Incident-Detection-Logging|장애탐지·로깅]], [[Structured-Logging|구조화로깅]], [[Log-Pipeline|로그파이프라인]]

- GPL 스택 자체 호스팅
  - Prometheus+Thanos(메트릭, S3 장기 보관)
  - Loki(로그, Promtail+FireLens로 컨테이너 수집)
  - Grafana(통합 시각화)
- 알림 기준:
  - Error rate 1% `for:5m`
  - Slow SQL 500ms+ 3회 지속
  - Event Loop Lag 100ms 3분 지속
  - RDS CPU 75% 5분
  - Replica Lag 5초 3분
- TraceIdMiddleware+HttpLoggingInterceptor로 요청 단위 추적
- 메트릭 카디널리티 관리: route 정규화, 불필요 라벨 Drop stage 제거

### JD 기반 기술 질문

#### RESTful API 설계 원칙? 버전 관리, 에러 핸들링?
> 관련: [[REST|REST]], [[HTTP-Status-Code|HTTP상태코드]]

- 리소스 중심 URI 설계, HTTP 메서드 의미에 맞는 사용(GET 조회/POST 생성/PATCH 수정/DELETE 삭제)
- 상태 코드 정확한 반환(200 성공, 201 생성, 400 클라이언트 오류, 404 미존재, 500 서버 오류)
- 일관된 에러 응답 포맷(code, message, details)
- 버전 관리: URL prefix(/v1/resources) 방식 선호 — Header 방식 대비 직관적이고 프론트엔드 협업 시 명확
- 실무: 시솔지주에서 프론트엔드 협업 시 API 문서화(Swagger) + 일관된 응답 포맷 설계 경험

#### 캐시 전략? Redis를 어디에? 무효화는?
> 관련: [[Cache-Strategies|캐시전략]], [[Cache-Invalidation|캐시무효화]], [[Cache-Stampede|캐시스탬피드]]

- Cache-Aside 패턴 기본
- 실무: 시솔지주에서 Google 번역 API 메타데이터를 DB 캐시로 전환
  - 자주 변경되지 않는 국가별 메타데이터를 매 요청마다 API 호출 → 서버 시작 시 1회 로드+DB 저장
  - API latency 3초→0.9초(70% 개선)
- 트라이포드랩: Read Replica 도입 후 조회 빈도 높은 API에 Redis 캐시 계층 추가 예정이었음
- 무효화: TTL 기반 + Write-through
- 주의: 캐시-DB 불일치, 캐시 스탬피드(동시 만료 시 DB 과부하)

#### 트랜잭션 격리 수준? 데드락 경험?
> 관련: [[Isolation-Level|격리수준]], [[Transactions|트랜잭션]]

- MySQL InnoDB 기본 REPEATABLE READ — 같은 트랜잭션 내 읽기 일관성 보장, Phantom Read는 gap lock으로 방지
- 실무에서 트랜잭션 범위 최소화로 데드락 예방:
  - 디바이스 정보 조회·검증은 트랜잭션 밖에서 수행
  - 재고 갱신+데이터 입력만 lock 구간에 배치
- Lock 순서 통일(항상 품목 ID 오름차순)으로 교차 대기 방지
- 꼬리: READ COMMITTED vs REPEATABLE READ 차이 — RC는 매 쿼리마다 최신 스냅샷, RR은 트랜잭션 시작 시점 스냅샷 고정

#### NestJS 모듈 설계? DI 원리? 순환 참조?
> 관련: [[NestJS|NestJS]], [[Custom-Provider|커스텀프로바이더]], [[Injection-Scopes|인젝션스코프]]

- 클린 아키텍처 참고하여 계층 분리:
  - Controller(Interface Adapters) → UseCase(Application Core) → DomainService(핵심 비즈니스) → Repository Interface → Prisma Client(External Infrastructure)
- UseCase별로 사용자 의도 분리(JSON Response용 vs 엑셀 다운로드용), 핵심 비즈니스 변경되어도 UseCase별 영향 최소화
- DI 원리: NestJS IoC 컨테이너가 Provider의 생성·주입·생명주기 관리, @Injectable 데코레이터로 등록 → constructor에서 타입 기반 자동 주입
- 순환 참조: forwardRef()로 해결하되 근본적으로는 모듈 의존 방향을 단방향으로 설계하는 것이 중요
- 모듈 간 의존은 exports로 명시적 공개

#### GCP 경험 없는데 괜찮나?

- AWS에서 동일한 패턴을 경험했고 클라우드 개념은 이전 가능
- 구체적 매핑:
  - ECS Fargate → Cloud Run (컨테이너 서버리스)
  - SQS → Pub/Sub (메시지 큐)
  - RDS → Cloud SQL (관리형 DB)
  - CloudFront → Cloud CDN (캐싱)
  - EventBridge → Eventarc (이벤트 라우팅)
  - ECR → Artifact Registry (컨테이너 레지스트리)
- 시솔지주에서 AWS LightSail→EC2+RDS 전환, 트라이포드랩에서 단일 EC2→ECS Fargate 전환 등 인프라 마이그레이션 경험이 있어 새 클라우드 적응에 자신 있음

#### 테스트 코드 어떻게 작성하나?
> 관련: [[Service-Layer-Testing|서비스레이어테스트]], [[Test-Fixture|테스트픽스처]], [[Test-Isolation|테스트격리]]

- 시솔지주: Mocha+Chai로 테스트 0→1 도입
  - SonarQube 웹 대시보드로 팀 전체 코드 품질 지표 공유
  - PR 연동하여 커버리지 60% 미달 시 머지 불가 → 최종 70% 달성
  - CBT 특성상 오발송 시 막대한 손실 가능해서 안정성 확보가 최우선
- 트라이포드랩: jest+supertest
  - 발주 자동화 Batch에서 스케줄링 부분과 핵심 비즈니스 로직을 분리 설계
  - 테스트 코드에서도 Batch 핵심 로직을 독립적으로 검증 가능하게 함
- 꼬리: 유닛(서비스 로직) → 통합(API 엔드포인트) → E2E 순서로 피라미드 구조 지향

### 서비스 맥락 질문

#### 180만 사용자가 동시에 STT 요청 — 어떻게 설계?

- STT는 처리 시간이 수초~수분이라 동기 처리 불가
- 요청 접수(API, 즉시 jobId 반환) → 큐(Pub/Sub)에 메시지 발행 → 워커(STT 처리, 오토스케일링) → 완료 시 알림(WebSocket/푸시)
- 큐로 백프레셔 제어하여 워커 과부하 방지
- 실무 연결: 트라이포드랩에서 동일 구조
  - 발주 이벤트 → EventBridge → SQS → 워커(ECS Fargate)로 비동기 처리
  - 워커가 죽어도 SQS 메시지 유지되어 재처리 가능
- 꼬리: "큐가 밀리면?" → 워커 오토스케일링(큐 depth 기반) + 사용자에게 예상 대기시간 안내 + 우선순위 큐(유료 사용자 우선)

#### AI API(OpenAI, Google STT) 호출 시 타임아웃/재시도/비용?

- 외부 API는 불안정함이 전제
- 타임아웃: 커넥션 타임아웃(짧게, 3~5초) + 리드 타임아웃(API 특성에 따라 STT 30초, LLM 60초 등)
- 재시도: exponential backoff(1초→2초→4초) + jitter로 동시 재시도 방지, 최대 3회
- Circuit Breaker: 연속 실패 N회 시 일정 시간 요청 차단 → half-open에서 단건 테스트 → 복구 확인
- 실패 격리: DLQ에 실패 메시지 보관, 수동 재처리 or 알림
- 실무 연결: 발주 자동화에서 채널별 DLQ 운영
  - 카톡 실패(잘못된 번호)는 점진적 재시도
  - 이메일은 무조건 재시도
  - 최종 실패 시 긴급알림+수동처리
- 비용: 토큰/요청 사용량 모니터링 + rate limiting(사용자별 분당 쿼터) + 월간 비용 알림 임계값

#### 오래 걸리는 작업(문서 번역, 슬라이드 생성)의 상태 관리?

- Job 테이블 설계: id, type, status(pending→processing→done/failed), progress(%), created_at, updated_at, error_message
- 상태 알림:
  - 폴링 — 간단하지만 불필요한 요청 많음
  - WebSocket — 실시간이지만 커넥션 관리 필요
  - 초기엔 폴링으로 시작, 트래픽 커지면 WebSocket 전환이 현실적
- 멱등성 키로 동일 작업 중복 생성 방지(사용자 실수로 여러 번 클릭)
- 실무 연결: 시솔지주 환율 Batch에서 동일 패턴 — 30분 간격 스케줄 실행, 실패 시 최대 4회 재시도, 상태 관리로 중복 실행 방지
- 꼬리: "processing 중 서버가 죽으면?" → heartbeat 기반 타임아웃, 일정 시간 응답 없으면 failed 처리 후 재시도

#### B2B 멀티테넌시 설계?

- 3가지 접근:
  1. 논리적 격리(tenant_id 컬럼) — 구현 간단, 비용 낮음, 쿼리마다 WHERE 조건 필수
  2. 스키마 분리(테넌트별 스키마) — 격리 강화, 마이그레이션 복잡
  3. 물리적 분리(테넌트별 DB) — 완전 격리, 비용 최대
- 다글로 현 단계(삼성물산, 대구시청 등 B2B 확장 초기)에는 논리적 격리가 현실적
  - Prisma middleware로 모든 쿼리에 tenant_id 자동 주입
  - Row Level Security 추가하면 실수로 WHERE 빠뜨려도 안전
- 실무 연결: 트라이포드랩에서 대형 고객사(제약바이오 280억, F&B 2000억) PoC 시
  - 클린 아키텍처 기반 모듈 분리로 고객사별 요구사항 유연 대응
  - 도메인 로직은 공유, 고객사별 커스텀은 UseCase 레벨에서 분기
- 꼬리: "논리적 격리의 단점?" → 한 테넌트의 대량 쿼리가 다른 테넌트에 영향(noisy neighbor), DB 인덱스에 tenant_id 필수 포함

#### 서비스 장애 시 어떻게 대응?

- 실제 경험 기반:
  1. Grafana Alerting이 Slack/팀별 라우팅으로 자동 알림 (Error rate 1% `for:5m`, Event Loop Lag 100ms 3분 등 SLO 기반 임계값)
  2. 대시보드에서 영향 범위 파악 — TraceId로 요청 단위 로그+메트릭 연계 조회, 어떤 API·어떤 사용자에게 영향인지 확인
  3. 롤백(ECS Rolling Update 이전 태스크로 복귀) or 핫픽스 판단 — 데이터 정합성 문제면 즉시 롤백, 단순 로직 버그면 핫픽스
  4. 근본 원인 분석 — Loki 로그+Prometheus 메트릭 교차 분석, 슬로우쿼리면 EXPLAIN 확인
  5. 재발 방지 — 알림 임계값 조정, 테스트 케이스 추가, 포스트모템 공유
- 꼬리: "장애 등급을 어떻게 나누나?" → P1(서비스 전체 중단), P2(주요 기능 장애), P3(일부 사용자 영향), P4(성능 저하) — 등급별 대응 SLA 차등

### 컬처핏 질문 (1차는 직무 면접이지만 섞일 수 있음)

- [x] 장단점 — [[FIT#본인의 장단점|FIT]] 실행력/성급함
- [x] 기획자 충돌 — [[FIT#기획자와 의견 충돌 사례|FIT]] 결제 환불 사례
- [x] 긴급 이슈 판단 — [[FIT#긴급 이슈 동시 발생 시 판단 기준|FIT]] 비즈니스 임팩트 기준
- [x] 성장 목표 — [[FIT#장기적으로 어떤 개발자가 되고 싶은가요?|FIT]] 개발 리드 → CTO
- [ ] **추가**: "빠르게 변화하는 AI 기술을 어떻게 따라가나?" → 실무 적용 관점에서 검증. 커뮤니티/밋업 활동 (TS 백엔드 밋업 등). 기술 선택은 스펙이 아니라 "이 단계에서 필요한가"로 판단

---

## 4. 역질문 (나 → 면접관)

### 기술/아키텍처
1. **"현재 백엔드 인프라가 GCP 기반인가요? 주로 사용하는 GCP 서비스는 어떤 것들인가요?"** — AWS 경험 전환 계획 수립
2. **"STT 처리 파이프라인이 동기/비동기 중 어떤 구조인가요? 메시지 큐는 어떤 걸 쓰시나요?"** — 내 이벤트 아키텍처 경험과 연결
3. **"DB는 MySQL인가요 PostgreSQL인가요? ORM은?"** — 온보딩 속도 예측
4. **"1,300만 시간 음성 처리에서 가장 큰 기술적 챌린지는 무엇이었나요?"** — 기술 난이도 파악 + 관심 어필

### 팀/조직
5. **"백엔드 팀 규모와 구성이 어떻게 되나요?"** — 내 포지션과 성장 환경
6. **"코드 리뷰 프로세스와 배포 주기는?"** — 개발 문화
7. **"현재 팀에서 가장 시급한 기술 부채가 있다면?"** — 입사 후 기대 업무

### 성장/기대치
8. **"주니어 개발자에게 기대하는 온보딩 기간과 초기 업무는?"** — 현실적 기대치
9. **"B2B 엔터프라이즈 확장이 백엔드 팀에 어떤 변화를 가져오나요?"** — 비즈니스 이해도 어필
10. **"수습 3개월 기간 중 평가 기준은?"** — 반드시 확인

---

## 5. 면접 준비 체크리스트

### 보강이 필요한 기술 영역

**DB / 성능 최적화**

| 영역 | 관련 문서 | 복습 완료 |
|------|---------|----------|
| 트랜잭션/격리수준 (RR vs RC, gap lock, Phantom Read) | [[Transactions\|트랜잭션]], [[Isolation-Level\|격리수준]] | [ ] |
| 인덱스/실행계획 (카디널리티, 선택도, 커버링, 복합 인덱스) | [[Index\|인덱스]], [[Execution-Plan\|실행계획]] | [ ] |
| Read Replica (Replication Lag, failover, Prisma 연결 설정) | [[Replication\|복제]] | [ ] |
| 캐시 전략 심화 (Cache-Aside, 무효화, 스탬피드, 실무: 메타데이터 캐시) | [[Cache-Strategies\|캐시전략]], [[Cache-Invalidation\|무효화]], [[Cache-Stampede\|스탬피드]] | [ ] |
| Prisma ORM 심화 (app-level join, relationLoadStrategy, @@index) | [[ORM\|ORM]] | [ ] |

**아키텍처 / 설계 패턴**

| 영역                                                                | 관련 문서                                                                                 | 복습 완료 |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----- |
| 클린 아키텍처 (Controller→UseCase→DomainService→Repository)             | (외부 자료)                                                                               | [ ]   |
| REST API 설계 (리소스 URI, 상태 코드, 버전 관리, 에러 포맷)                        | [[REST\|REST]], [[HTTP-Status-Code\|HTTP상태코드]]                                        | [ ]   |
| 비동기 처리 패턴 (큐+워커+알림, DLQ, 멱등성)                                     | [[Messaging-Patterns\|메시징패턴]], [[Delivery-Semantics\|전달보장]], [[Idempotency-Key\|멱등성]] | [ ]   |
| 메시지 큐 비교 (Kafka vs SQS vs Pub/Sub, 비용/운영 트레이드오프)                  | [[MQ-Kafka\|MQ·Kafka]], [[Messaging-Patterns\|메시징패턴]]                                 | [ ]   |
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
