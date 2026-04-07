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

| 항목    | 내용                                                       |
| ----- | -------------------------------------------------------- |
| 회사명   | 액션파워 (ActionPower)                                       |
| 서비스   | 다글로 — AI 생산성 플랫폼 (STT, 문서 번역, 슬라이드 생성, 문제 생성, AI 대화)     |
| 단계    | Series B (60억 원 투자 유치)                                   |
| 규모    | 180만 가입자, 매년 3배 성장, 구글플레이 BEST 자기계발 앱                    |
| 도메인   | AI SaaS (B2C + B2B 엔터프라이즈)                               |
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

| 우대사항                             | 매칭도   | 내 근거                                                                                                            |
| -------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------- |
| GCP 클라우드 경험                      | **약** | AWS 경험 풍부 (ECS, RDS, CloudFront, EventBridge, SQS). GCP 직접 경험 없음                                                |
| 메시지 큐 (RabbitMQ, Kafka, Pub/Sub) | **중** | AWS EventBridge+SQS 기반 이벤트 아키텍처 설계·운영. Kafka/Pub/Sub 직접 경험은 없으나 개념 숙지                                           |
| 테스트 코드 작성                        | **중** | 시솔지주: Mocha+Chai+SonarQube로 테스트 커버리지 0→70% 달성, PR 연동 60% 미달 시 머지 불가. 트라이포드랩: jest+supertest, 스케줄링/비즈니스 로직 분리 설계 |
| 장애 분석/대응                         | **강** | Grafana/Prometheus/Loki 모니터링+알림 직접 구축, 병목 조기 탐지                                                                 |

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
> B2B → B2B2C, 두 가지 성격의 서비스를 동시에 경험

- 트라이포드랩에서 0→1 구축, 대형 고객사 PoC 성공, 단일 서버→ECS 스케일업, 모니터링 구축까지 충분히 성장
- 하지만 B2B PoC는 피드백 사이클이 수개월 단위 — 이제는 **빠르게 피드백 받으며 개선하는 B2C 환경**에서 성장하고 싶음
- 다글로는 B2B2C — 180만 B2C 사용자의 빠른 피드백 사이클과, B2B 엔터프라이즈(삼성물산, 대구시청 등)의 데이터 정합성·안정성 요구를 동시에 다루는 환경
- 트라이포드랩에서 쌓은 B2B 정합성 경험(DB Lock, 동시성 제어)을 살리면서, B2C의 빠른 개선 사이클을 동시에 경험할 수 있는 곳이라 생각
- 꼬리 대비:
  - "B2C도 느린데?" → PoC 수개월 vs B2C 주 단위, 피드백 사이클 자체가 빠름
  - "B2B는 더 이상 싫은 건가?" → B2B 경험은 값졌지만 지금 커리어 단계에서는 빠른 개선 경험이 필요. 다글로는 B2B도 함께 하니 경험을 버리는 게 아님
  - "피드백 느려지면 또 이직?" → 이직 기준은 속도가 아니라 **성장 기회**. 다글로에서 B2B2C 양쪽을 경험하는 것 자체가 장기적 성장

---

## 3. 예상 질문 (면접관 → 나)

### 이력서 기반 기술 질문

#### DB Lock으로 Race Condition 해결 — 어떤 Lock? 왜 그 방식? Optimistic vs Pessimistic?
> 관련: [[Transaction-Lock-Contention|트랜잭션·락]], [[Transactions|트랜잭션]], [[Distributed-Lock|분산락]], [[Lock|DB Lock]]

**문제 상황**
- 수천 대 IoT 디바이스가 동시에 재고 데이터를 전송 → 같은 품목에 동시 갱신 시 Lost Update 발생
- 예: 재고 100개인 품목에 디바이스 A(-5), B(-3)가 동시 도착 → 둘 다 100을 읽고 각각 95, 97로 갱신 → 최종 97 (정상: 92)

**Pessimistic Lock 선택 이유**
- `SELECT FOR UPDATE NO WAIT`로 품목 단위 Exclusive Row Lock 획득
- 재고 읽기+갱신을 원자적 처리 (읽은 값 기반으로 갱신하므로 Lost Update 원천 차단)
- `NO WAIT` 옵션: lock 획득 실패 시 즉시 에러 반환 (대기하지 않음) → 100ms 간격 최대 3회 재시도 (최악 1초 이내 완료)

**Optimistic Lock을 선택하지 않은 이유**
- Optimistic Lock은 version 컬럼 기반으로 UPDATE 시점에 충돌 감지 (`WHERE version = N` → 0 rows affected면 재시도)
- IoT 특성상 **충돌 빈도가 높음** (수천 대가 주기적으로 동시 전송) → Optimistic은 재시도 비용이 과도
- Pessimistic은 충돌 시 Lock 대기/즉시 실패로 **한 번만 수행** vs Optimistic은 충돌 시 **전체 로직 재실행**
- 재고 갱신은 짧은 트랜잭션(ms 단위)이므로 Pessimistic Lock의 대기 시간이 무시할 수준

| 기준 | Optimistic | Pessimistic |
|------|-----------|-------------|
| 충돌 빈도 | 낮을 때 유리 (읽기 많은 서비스) | 높을 때 유리 (쓰기 경합 많은 서비스) |
| 충돌 시 비용 | 전체 트랜잭션 재실행 | Lock 대기 (NO WAIT면 즉시 실패 후 재시도) |
| Lock 보유 시간 | 없음 (커밋 시점에 검증) | 트랜잭션 동안 보유 |
| 데드락 위험 | 없음 | 있음 (순서 통일로 예방) |
| 구현 | version 컬럼 추가 | SELECT FOR UPDATE |

**트랜잭션 범위 최소화**
- 디바이스 정보 조회·검증은 트랜잭션 **밖**에서 수행 (lock 보유 시간 줄이기)
- 트랜잭션 안: `SELECT FOR UPDATE`(재고 읽기) → 재고 갱신 → 데이터 입력만 배치
- Lock 순서 통일: 항상 **품목 ID 오름차순**으로 lock 획득 → 교차 대기(데드락) 방지

**Redis 분산락을 선택하지 않은 이유**
- 초기에 Redlock 검토 → 별도 인프라 의존성 + 네트워크 레이턴시 + 클럭 동기화 문제
- 단일 DB 환경에서 DB 자체 lock이면 충분 (인프라 단순성 우선)
- 분산 DB/멀티 인스턴스 환경이 되면 그때 Redis 분산락 도입 검토

**InnoDB Lock 종류**

| Lock 종류 | 설명 | 예시 |
|-----------|------|------|
| **Shared Lock (S)** | 읽기 잠금. 다른 S Lock 허용, X Lock 차단 | `SELECT ... FOR SHARE` |
| **Exclusive Lock (X)** | 쓰기 잠금. S/X 모두 차단 | `SELECT ... FOR UPDATE`, `UPDATE`, `DELETE` |
| **Record Lock** | 인덱스 레코드 하나에 거는 Lock | PK/유니크 인덱스로 정확히 1행 조회 시 |
| **Gap Lock** | 인덱스 레코드 사이의 간격을 잠금 (삽입 방지) | RR에서 범위 조건 `WHERE id BETWEEN 10 AND 20` |
| **Next-Key Lock** | Record Lock + Gap Lock 결합 | InnoDB RR 기본 동작. Phantom Read 방지 |

**데드락 — 완전한 예방은 불가능, 감지+복구가 핵심**
- 데드락의 전형적 원인: TX1이 A→B 순서, TX2가 B→A 순서로 lock 획득 → 상호 대기
- **왜 완전한 예방이 불가능한가**: Gap Lock, Next-Key Lock이 개발자가 의도하지 않은 순서로 암묵적으로 잡힘. 쿼리 실행 계획에 따라 lock 범위가 달라져 완벽한 순서 통일은 현실적으로 불가능
- **감지+복구**: InnoDB **Wait-for Graph**로 자동 탐지 → 비용 적은 트랜잭션을 자동 rollback → 앱에서 `ER_LOCK_DEADLOCK` catch 후 재시도가 정석
- **확률 완화**: Lock 순서 통일 + 트랜잭션 범위 최소화 + NO WAIT로 대기 회피 + 트랜잭션 안 외부 API 호출 금지
- 분석: `SHOW ENGINE INNODB STATUS` → LATEST DETECTED DEADLOCK 섹션 확인
- 모니터링: Grafana에서 `mysql_global_status_innodb_deadlocks` 메트릭 추적

**꼬리 질문 대비**
- "NO WAIT 대신 SKIP LOCKED는?" → SKIP LOCKED는 잠긴 행을 건너뛰고 다음 행을 읽음. 큐 패턴(작업 분배)에 적합하지만, 재고 갱신처럼 **특정 행을 반드시 처리해야 하는** 경우에는 NO WAIT가 맞음
- "FOR UPDATE와 FOR SHARE 차이?" → FOR UPDATE는 X Lock(배타적, 읽기/쓰기 모두 차단), FOR SHARE는 S Lock(공유, 읽기 허용·쓰기 차단). 재고 갱신은 읽은 후 바로 쓰므로 X Lock 필요
- "ECS 멀티 인스턴스에서도 DB Lock으로 충분한가?" → 같은 DB를 바라보는 한 충분. DB가 분리되면(샤딩 등) 분산 락 필요
- "Optimistic Lock이 나은 상황은?" → 읽기 중심 서비스, 충돌 빈도 낮은 경우 (예: 게시글 수정, 설정 변경). Lock 보유 없이 동시성 극대화
- "Gap Lock이 성능에 미치는 영향?" → 범위 잠금이므로 INSERT를 차단할 수 있음. 높은 동시성이 필요하면 RC로 변경하여 Gap Lock 비활성화 고려 (단, Phantom Read 허용 필요)
- "데드락 발생 시 애플리케이션 처리?" → InnoDB가 한쪽을 자동 rollback → `ER_LOCK_DEADLOCK` 에러 catch 후 재시도. 우리 시스템은 NO WAIT로 상호 대기 자체를 회피하여 발생 확률을 크게 낮춤
- "테이블 락은 언제 발생?" → DDL(ALTER TABLE), LOCK TABLES 명시 사용, 인덱스 없는 UPDATE/DELETE(풀스캔 시 모든 행에 lock → 사실상 테이블 락)

#### 슬로우 쿼리 99.3% 개선 — 측정 기준? EXPLAIN 분석 방법?
> 관련: [[Index|인덱스]], [[Execution-Plan|실행계획]]

- 디바이스 최신 상태 조회 서브쿼리 2000ms+ 소요
- 테이블 100만 건, 850대 디바이스, 디바이스당 평균 1,240건 균등 분포
- EXPLAIN ANALYZE로 `ORDER BY created_at DESC, id DESC` 후 전체 행 filesort 확인
- 카디널리티 분석: 디바이스 번호 선택도 0.08% → 복합 인덱스 `(device_number, created_at DESC, id DESC)` 설계
- 인덱스 스캔만으로 최상단 레코드 즉시 접근. Prisma `@@index`로 선언
- 결과: 쿼리당 15.4ms → 0.1ms. 3,000대 확장 시에도 인덱스 탐색 1건이라 데이터 양에 무관한 구조
- 꼬리:
  - "복합 인덱스 컬럼 순서 기준?" → 동등 조건(=) 컬럼을 앞에, 범위 조건(>, BETWEEN) 컬럼은 뒤에. 카디널리티가 높은 컬럼이 앞에 올수록 스캔 범위가 빨리 좁혀짐
  - "인덱스를 많이 만들면?" → SELECT는 빨라지지만 INSERT/UPDATE/DELETE 시 인덱스도 갱신해야 하므로 쓰기 성능 저하. 실제로 필요한 쿼리 패턴 기반으로 설계
  - "커버링 인덱스란?" → 쿼리에 필요한 모든 컬럼이 인덱스에 포함되어 테이블 접근(랜덤 I/O) 없이 인덱스만으로 결과 반환

#### Prisma 쿼리 증가 문제 — 구체적으로? ORM vs Raw Query 전환 기준?
> 관련: [[Execution-Plan|실행계획]], [[SQL|SQL]]

- Prisma는 lazy loading이 없어 전통적 N+1은 아님
- 문제는 app-level join 방식 — include 시 SQL JOIN이 아니라 관계마다 별도 쿼리를 발생시켜, 조인 엔티티가 늘어날수록 쿼리가 N개씩 증가
- 기존 평균 100ms → 1000ms까지 저하
- 로그 분석으로 4개 개별쿼리 확인 → 공식 문서 검토하여 relationLoadStrategy: 'join' 발견
- DB-level JOIN 전환만으로 82~90% 성능 개선
- 이후에도 문제가 생기면 실행 계획 확인 후 SQL 튜닝 단계로 넘어가야 함
- 꼬리:
  - "ORM을 왜 쓰나? Raw Query가 항상 빠르지 않나?" → 타입 안전성, 마이그레이션 관리, 생산성. 성능 크리티컬한 부분만 Raw Query로 전환. 대부분의 CRUD는 ORM이 충분
  - "Raw Query 전환 기준은?" → EXPLAIN으로 실행 계획 확인 후 ORM 생성 쿼리가 비효율적일 때. 복잡한 서브쿼리, 윈도우 함수, 벌크 연산 등
  - "Prisma 말고 TypeORM, Drizzle 등과 비교하면?" → TypeORM은 Active Record+Data Mapper 둘 다 지원하지만 복잡한 쿼리에서 불안정, Drizzle은 SQL에 가까운 타입 세이프 쿼리 빌더. Prisma는 스키마 중심 설계+마이그레이션이 강점이지만 복잡한 쿼리에서 한계

#### EventBridge+SQS 선택 이유? Kafka와 차이?
> 관련: [[MQ-Kafka|MQ·Kafka]], [[Messaging-Patterns|메시징패턴]], [[Delivery-Semantics|전달보장]]

**이벤트 기반이 필요한 이유는 위 아키텍처 전환 섹션 참고** — 핵심은 발주(핵심 도메인)와 후속 처리(부수 효과)를 분리하여 실패 격리 + 독립 확장 + 복구 가능한 구조를 만드는 것

**그렇다면 왜 EventBridge+SQS인가? (도구 선택)**
- 실제 비용 비교: MSK $574/월 vs EventBridge+SQS $0~18/월 (월 10만 발주 × 5액션 = 50만 SQS 메시지, Free Tier 범위)
- 발주라는 도메인 특성상 실시간 처리 불필요 + 최종 일관성이면 충분
- 이벤트 플로우: 발주 → SQS → 수주처리 → SQS → 카톡/이메일/발주서 각각 병렬 처리
- 채널별 DLQ 설정(카톡: 잘못된 번호 시 실패 처리, 이메일: 무조건 재시도)
- Kafka가 필요한 시점: 이벤트 리플레이, 순서 보장, 초당 수만건 이상
- 꼬리:
  - "SQS 메시지 유실 가능성은?" → SQS는 at-least-once 보장. 소비자가 처리 완료 후 삭제해야 함. 중복 수신 가능 → 소비자 측 멱등성 필수. **실무에서 이렇게 구현:**
    - 발주 ID를 멱등성 키로 사용 (비즈니스 고유 식별자)
    - 발주 테이블에 status 컬럼 + `processing_started_at` 타임스탬프로 상태 머신 설계
    - 상태 흐름: `PENDING` → `PROCESSING` → `COMPLETED` / `FAILED`
    - **워커 처리 흐름:**
      1. SQS 메시지 수신 (발주 ID 포함)
      2. 발주 레코드를 `SELECT FOR UPDATE`로 잠그고 status 확인
      3. `COMPLETED` → 이미 처리됨, 메시지 삭제 후 skip
      4. `PENDING` / `FAILED` → status를 `PROCESSING`으로, `processing_started_at`을 현재 시각으로 갱신 후 비즈니스 로직 실행
      5. `PROCESSING` → **processing_started_at 확인**: 일정 시간(예: visibility timeout의 2배) 초과 시 이전 워커가 crash한 것으로 판단 → `FAILED`로 변경 후 재처리. 미초과 시 다른 워커가 정상 처리 중이므로 skip
      6. 성공 시 `COMPLETED` + SQS 메시지 삭제
      7. 실패 시 `FAILED` + 메시지 삭제하지 않음 → visibility timeout 만료 후 SQS가 재전달
      8. SQS maxReceiveCount(예: 3회) 초과 시 DLQ로 이동 → 알림 발송 + 수동 확인
    - **visibility timeout 설정**: 발주 처리 평균 시간의 6배로 설정. 너무 짧으면 정상 처리 중에 메시지가 다시 노출되어 불필요한 중복, 너무 길면 실패 후 재처리까지 대기 시간이 김
    - **알림 채널 중복 방지**: 알림 로그 테이블에 `(발주_id, channel)` UNIQUE 제약 → 카톡/이메일/발주서 이중 발송 원천 차단
    - 재고 갱신에서 이미 `SELECT FOR UPDATE NO WAIT`를 쓰고 있었기 때문에, 같은 패턴을 발주 상태 관리에도 자연스럽게 확장
  - "SQS 소비자로 Lambda를 안 쓴 이유?" → Lambda + SQS event source mapping이 일반적인 패턴인 건 맞음. 하지만 우리 상황에서는 ECS 워커가 더 적합했음:
    - NestJS 앱 안에서 SQS 폴링을 구현하여 **도메인 로직(Prisma 모델, 발주 비즈니스 로직)을 그대로 재사용**. Lambda로 분리하면 코드 중복이나 별도 배포 파이프라인 필요
    - Prisma Client는 DB 커넥션 풀을 유지하는데, Lambda는 요청마다 cold start → **커넥션 풀 관리가 어려움** (RDS Proxy로 해결 가능하지만 추가 비용+인프라)
    - 이미 ECS Fargate 인프라가 구축되어 있어 추가 인프라 비용 없이 워커 구현 가능
    - 소규모 팀에서 **단일 코드베이스+단일 배포 파이프라인** 유지가 운영 효율적
    - Lambda가 더 나은 경우: 트래픽이 불규칙하고 유휴 시간이 긴 워크로드, 도메인 로직이 단순해서 별도 패키지로 분리 가능할 때, 초당 수천 건 이상 급격한 스케일아웃이 필요할 때
  - "visibility timeout이 뭔가?" → 소비자가 메시지를 가져간 뒤 일정 시간 내 삭제하지 않으면 다시 큐에 노출. 처리 시간보다 넉넉하게 설정해야 중복 처리 방지
  - "이벤트 순서 보장이 필요하면?" → SQS FIFO 큐(MessageGroupId 기반 순서 보장, 초당 300 TPS 제한) 또는 Kafka(파티션 내 순서 보장)
  - "Pub/Sub과 SQS 차이?" → Pub/Sub은 topic 기반 팬아웃(1:N), SQS는 큐 기반 point-to-point(1:1). 다글로에서 Pub/Sub을 쓴다면 여러 서비스가 같은 이벤트를 구독하는 구조

#### Docker 이미지 43% 경량화 — 어떻게?
> 관련: [[Multi-Stage-Build|멀티스테이지빌드]]

- NestJS 이미지가 909MB(Spring 수준)로 비정상
- .dockerignore로 불필요 파일 제외 + 멀티스테이지 빌드(build stage → production stage에 필요 파일만 복사)
- 결과: 909MB → 513MB(43.6%), 배포 시간 3분10초 → 2분20초(26.3% 단축)
- ECR 저장 비용도 절감
- 꼬리:
  - "alpine 이미지로 더 줄일 수 있지 않나?" → 가능하지만 native 모듈(bcrypt, sharp 등) 호환성 문제 발생 가능. musl libc vs glibc 차이. 안정성과 경량화의 트레이드오프
  - "distroless 이미지는?" → Google이 제공하는 최소 런타임 이미지. 셸이 없어 보안 강화되지만 디버깅이 어려움. 프로덕션에 적합
  - "더 최적화할 수 있는 방법?" → node_modules 대신 번들러(esbuild) 사용, 불필요한 devDependencies 제거 확인, Docker layer 캐싱 최적화(자주 변경되는 레이어를 뒤에 배치)

#### CloudFront+ECS 전환 — 왜? 어떤 문제가 있었나?
> 관련: [[Load-Balancer|로드밸런서]], [[Docker|Docker]], [[Messaging-Patterns|메시징패턴]]

**Before: 단일 EC2의 한계**
- Nginx + NestJS 앱이 하나의 EC2에서 동시 구동
- 문제 1: **스케일링 불가** — 트래픽 급증 시 CPU/메모리가 한 서버에 집중, 수천 대 IoT + 웹 트래픽이 같은 인스턴스를 공유
- 문제 2: **배포 시 서비스 중단** — 앱 재시작 동안 요청 유실, IoT 디바이스 연결 끊김
- 문제 3: **장애 격리 불가** — 앱 장애 = 서비스 전체 중단, 복구 수단이 SSH 접속 후 수동 재시작뿐
- 문제 4: **동기 결합** — 발주 생성 → 수주 처리 → 카톡/이메일/발주서 발송이 하나의 API 요청 안에서 순차 실행
  - 카톡 API 3초 → 사용자가 발주 버튼 누르고 3초+ 대기
  - 카톡 API 장애 → **발주 자체가 실패** (발주는 성공했어야 하는데 알림 때문에 롤백)
  - 새 알림 채널(슬랙 등) 추가 → 발주 API 코드를 직접 수정해야 함 (발주와 알림이 결합)
  - 핵심: **"발주를 생성하라"(명령)와 "발주가 생성되었다"(이벤트)가 분리되지 않음**

**왜 이벤트 기반 아키텍처가 답인가**
- 발주 도메인을 분석하면, "발주 생성" 이후의 후속 처리(수주, 카톡, 이메일, 발주서)는 **서로 의존하지 않는 독립적인 반응**
  - 카톡 실패해도 이메일은 보내야 함
  - 수주 처리와 알림 발송은 서로 기다릴 이유가 없음
  - 각 채널마다 실패 모드가 다름 (카톡: 번호 오류, 이메일: 서버 다운) → 재시도 정책도 달라야 함
- 발주 생성 = **핵심 도메인** (반드시 성공해야 함) vs 후속 처리 = **부수 효과** (실패해도 나중에 복구 가능)
- 이 둘을 이벤트로 분리하면:
  - 발주 API는 DB에 발주 저장 + 이벤트 발행만 하고 즉시 응답 → 사용자 경험 개선
  - 후속 처리는 각자 독립적으로 소비 → 실패 격리, 개별 확장, 채널 추가 시 발주 코드 수정 불필요
  - 실패해도 큐에 메시지가 남아있으므로 **복구 가능한 구조**

**전환 과정 (점진적, 3단계)**

**1단계: 컨테이너화 + 로드밸런서 분리**
- Docker 컨테이너화 → ECS Fargate로 이전 (서버 관리 제거, 오토스케일링 확보)
- ALB(웹 트래픽, L7 HTTP/HTTPS) + NLB(IoT 디바이스, L4 TCP 고정 IP) 이중 구성
  - IoT 디바이스가 펌웨어에 IP를 하드코딩하여 통신 → NLB의 고정 IP(Elastic IP) 필요
- CloudFront로 정적 리소스 캐싱 → 오리진 서버 부하 감소
- Rolling Update로 무중단 배포 확보

**2단계: 이벤트 기반 아키텍처로 전환 (발주 자동화)**
- 기존: 발주 API 하나에 수주+카톡+이메일+발주서 동기 처리 → 응답 시간 수 초, 채널 실패 시 전체 실패
- 전환: EventBridge + SQS로 비동기 분리
  - 발주 생성(API) → EventBridge 이벤트 발행 → SQS 큐 → 수주 워커 처리
  - 수주 완료 → SQS → 카톡/이메일/발주서 각 채널 **병렬** 처리
- 효과:
  - 발주 API는 이벤트만 발행하고 즉시 응답 → **응답 시간 대폭 단축**
  - 채널별 독립 실패/재시도 — 카톡 실패해도 이메일은 정상 발송
  - 채널별 DLQ로 실패 격리 — 카톡(잘못된 번호 시 실패 처리), 이메일(무조건 재시도)
  - 수기 발주 1시간 → 완전 자동화, 수기 재고관리 4시간 → 10분(95.8% 절감)

**3단계: DB 읽기/쓰기 분리**
- 대형 고객사 PoC 진행 중 조회 트래픽 증가 → RDS Read Replica 도입
- 쓰기(발주/재고 갱신) → Primary, 조회(대시보드/리포트) → Replica
- 결과: 조회 API 40% 향상, DB CPU 30% 감소
- Prisma에서 `datasources`로 Primary/Replica 연결 분리

**현재 진행 중: 이벤트 기반 아키텍처 고도화**
- SQS 소비자 멱등성 강화 (발주 ID 기반 상태 머신 + processing_started_at 타임아웃)
- 이벤트 흐름 전체의 관측성(observability) 개선 — 발주 생성부터 알림 발송까지 TraceId 연계
- 채널별 재시도 정책 세분화

**꼬리 질문 대비**
- "한 번에 전환했나?" → 아니다. 서비스 운영 중이라 점진적으로. 1단계(컨테이너+LB) → 2단계(이벤트 분리) → 3단계(DB 분리) 순서. 각 단계에서 안정화 확인 후 다음 단계 진행
- "ALB vs NLB 차이?" → ALB는 L7(HTTP/HTTPS, 경로 기반 라우팅), NLB는 L4(TCP/UDP, 고정 IP, 초저지연). IoT 디바이스가 IP 기반으로 통신하므로 NLB 필요
- "Rolling Update vs Blue/Green?" → Rolling은 점진적 교체(리소스 절약, 배포 중 구/신 버전 공존), Blue/Green은 새 환경 준비 후 즉시 전환(빠른 롤백, 리소스 2배 필요). 비용 고려해 Rolling 선택
- "오토스케일링 기준은?" → API 서버: CPU 70% or 요청 수 기반, 큐 워커: SQS ApproximateNumberOfMessagesVisible(큐 depth) 기반
- "동기 → 비동기 전환 시 가장 어려웠던 점?" → 기존에 하나의 트랜잭션으로 묶여있던 로직을 분리하면서 **데이터 정합성 보장**이 핵심 과제. 발주 상태 머신 + 멱등성 키 + DLQ로 "실패해도 복구 가능한 구조"를 우선 설계
- "이벤트 유실은 어떻게 방지?" → 두 가지 레벨로 나눠서 답변:
  - **소비자 측(SQS → 워커)**: SQS at-least-once + 소비자 측 멱등성으로 중복은 허용하되 유실은 방지. DLQ로 최종 실패 메시지 보관
  - **생산자 측(API → 큐)**: 이 부분이 핵심. DB에 발주를 저장하고 EventBridge에 이벤트를 발행하는 건 **서로 다른 시스템에 대한 두 번의 쓰기(Dual Write)**. 앱이 DB 저장 후 이벤트 발행 전에 crash하면 이벤트가 유실됨 → **Transactional Outbox Pattern**으로 해결
    - 발주 INSERT + outbox 테이블 INSERT를 **같은 DB 트랜잭션**으로 묶음 → 원자적 보장
    - 별도 Relay 프로세스가 outbox를 폴링하여 EventBridge/SQS에 발행 후 processed 마킹
    - Relay가 crash해도 outbox 레코드가 남아있으므로 재시작 후 재발행 → at-least-once 발행 보장
    - 소비자 측 멱등성과 짝을 이루어 **end-to-end 신뢰성** 확보
    - 구현: NestJS `@Cron('*/5 * * * * *')`으로 5초 간격 폴링. 월 10만 발주 규모에서는 CDC(Debezium) 대비 폴링이 단순하고 충분
    - outbox 테이블: `(id, aggregate_type, aggregate_id, event_type, payload JSONB, created_at, processed_at)` — processed_at이 NULL이면 미발행
  - "Dual Write 말고 다른 방법은?" → CDC(Change Data Capture): DB WAL을 읽어 실시간 이벤트 발행. 지연 최소화지만 Debezium+Kafka Connect 등 인프라 복잡도 증가. 현재 규모에서는 과함
- "Replication Lag 문제는?" → 발주 직후 조회하면 Replica에 아직 반영 안 될 수 있음. 쓰기 직후 조회가 필요한 API는 Primary에서 읽도록 분기. 대시보드/리포트 같은 약간의 지연이 허용되는 조회만 Replica 사용
- "Graceful Shutdown은?" → ECS 태스크 종료 시 SIGTERM → 진행 중 요청 완료 대기 → 새 요청 거부 → 타임아웃 후 SIGKILL. NestJS의 `enableShutdownHooks()`로 구현. SQS 워커는 현재 처리 중인 메시지 완료 후 종료 — 미완료 메시지는 visibility timeout 만료 후 SQS가 재전달

#### Grafana/Prometheus/Loki — 무엇을 모니터링? 알림 기준?
> 관련: [[Incident-Detection-Logging|장애탐지·로깅]], [[Structured-Logging|구조화로깅]], [[Log-Pipeline|로그파이프라인]]

**왜 GPL 자체 호스팅?**
- 기존: CloudWatch + SNS + Lambda로 메트릭 알림 → **메트릭 추적 부족**, 쿼리 UX 약함, 비용 예측성 낮음
- 가중치 기반 대안 비교 후 GPL 선택 (4.65점 / ELK 3.85 / Datadog 3.35 / CloudWatch 3.10)
  - TCO(0.25): GPL 최고 — ELK는 같은 데이터량에서 운영 복잡도, Datadog은 사용량 단가 치명적
  - 메트릭 생태계(0.15): Prometheus 최강급
  - 벤더 종속(0.10): GPL 완전 이식 가능, IaC/GitOps 친화

**아키텍처 구성**

| 계층 | 구성 요소 | 역할 |
|------|---------|------|
| **FE** | Sentry SDK → Sentry 서버 | 브라우저 JS 에러, 네트워크 지연, 퍼포먼스 트레이스 자동 수집. 이슈 그룹화 + 세션 리플레이 |
| **BE (App)** | TraceIdMiddleware | 요청마다 고유 `x-request-id` 생성 → 로그/메트릭에 전파하여 요청 단위 추적 |
| | HttpLoggingInterceptor | 요청/응답/예외를 한 지점에서 구조적으로 로깅 |
| | Winston JSON Logger | flat JSON line 포맷으로 기록 (파싱, 검색, 수집에 최적화) |
| | MetricsInterceptor + prom-client | 각 요청의 method, route, status, latency를 Prometheus 형식 메트릭으로 기록 |
| | `/metrics` 엔드포인트 | Prometheus가 주기적으로 scrape하는 노출 포인트 |
| **Log Routing** | FireLens(FluentBit) → Loki | ECS/Fargate 컨테이너 stdout → FireLens → Loki 중앙집중 로깅 |
| **Logs Plane** | Promtail → Loki(Distributor/Ingester) → S3 | JSON 파싱 → requestId/level 라벨 추가 → Chunk 저장 + 인덱스 최소화. Compactor가 오래된 로그 S3 압축/보관 |
| **Metrics Plane** | Prometheus → Thanos Sidecar → S3 | 메트릭 수집 → 블록 데이터 S3 업로드. Thanos Store Gateway/Querier로 여러 Prometheus를 하나처럼 조회 (수평 확장/멀티 리전) |
| **Alerting** | Grafana Alerting | Prometheus/Loki 기반 SLO 알람 → Slack/팀별 라우팅 |

**알림 기준 (SLO 기반)**
- `for: 5m` 지속 조건으로 단발성 스파이크 필터링 + 서비스/팀별 소유자 라우팅
  - Error rate 1% `for:5m`
  - Slow SQL 500ms+ 3회 지속
  - Event Loop Lag 100ms 3분 지속
  - RDS CPU 75% 5분
  - Replica Lag 5초 3분

**보존 전략**
- 메트릭: Prometheus 단기 보존(15일) → Thanos Sidecar가 S3로 업로드 (수개월~수년 장기 조회 가능, Prometheus 디스크 부담 감소)
- 로그: Loki 30일 핫 보관 → S3 Object Storage 콜드 보관. Compactor가 자동 블록 압축/정리
- 로그 폭증 시: Promtail `batchSize`/`batchWait`/`ingestion rate limit` 조정으로 쓰기 폭주 완충

**비용 관리**
- 메트릭 카디널리티 관리가 핵심: route/path 라벨 정규화, **userId/traceId를 라벨에 절대 포함하지 않음** (라벨 조합 폭증 → Prometheus 메모리 증가)
- 로그: flat JSON line + 불필요 필드 Drop stage → 저장/전송 비용 절감
- 저장소 사용량 정기 모니터링: Loki `bytes_ingested_total`, `chunks_stored_total` / Thanos object store upload량, 블록 수 증가율

**리스크 및 대응**

| 리스크                                  | 대응                                                       |
| ------------------------------------ | -------------------------------------------------------- |
| 카디널리티 폭발 (라벨 조합 폭증 → Prometheus OOM) | 라벨 가이드 수립, route 정규화, userId/traceId 라벨 금지               |
| 로그 과다 유입 (Loki 429)                  | Promtail batch/flush tuning, log sampling, drop stage 적용 |
| 구성 복잡성 증가                            | Helm values 표준화, ArgoCD 기반 GitOps 선언적 관리                 |

**꼬리 질문 대비**
- "CloudWatch 대신 자체 호스팅한 이유?" → 기존 CloudWatch+SNS+Lambda로는 메트릭 추적 부족. 가중치 비교에서 GPL이 TCO(5점), 메트릭 생태계(5점), 벤더 종속 회피(5점)로 총 4.65점 최고. CloudWatch는 쿼리 UX/비용 예측성이 약해서 3.10점
- "ELK 대신 Loki인 이유?" → ELK는 로그 검색/집계는 강력하지만 같은 데이터량에서 운영 복잡도와 비용이 큼 (3.85점). Loki는 인덱스 최소화 설계라 저장 비용이 낮고, LogQL로 requestId/route/level 기반 필터링이면 우리 요구에 충분
- "Prometheus pull 방식의 한계?" → 짧은 수명 컨테이너는 스크래핑 전 사라질 수 있음 → Pushgateway로 보완. 대규모에서는 service discovery 필수
- "로그 양이 폭증하면?" → Promtail의 batchSize/batchWait/ingestion rate limit 조정 + log sampling(에러 100%, 정상 10%) + drop stage로 불필요 필드 제거 + 핫/콜드 분리 보존 정책
- "Thanos 없이 Prometheus만 쓰면 안 되나?" → Prometheus 단독은 단기 보존만 가능하고 디스크 부담 큼. Thanos Sidecar로 S3에 장기 보관하면 수개월~수년 메트릭 비교 가능 + Thanos Querier로 여러 Prometheus를 하나처럼 조회(멀티 인스턴스/리전 확장 대비)
- "traceId를 라벨에 넣으면 왜 안 되나?" → 라벨은 인덱스로 사용됨. traceId처럼 고유값을 라벨에 넣으면 카디널리티가 요청 수만큼 폭발 → Prometheus 메모리 OOM. traceId는 로그 본문(flat JSON)에 기록하고 LogQL로 검색
- "FE 모니터링은?" → Sentry SDK로 브라우저 JS 에러, 네트워크 지연, 퍼포먼스 트레이스 자동 수집. Sentry 서버에서 이슈 그룹화 + 세션 리플레이 제공. 백엔드 TraceId와 연계하면 FE→BE 요청 흐름 전체 추적 가능

### JD 기반 기술 질문

#### RESTful API 설계 원칙? 버전 관리, 에러 핸들링?
> 관련: [[REST|REST]], [[HTTP-Status-Code|HTTP상태코드]]

- 리소스 중심 URI 설계, HTTP 메서드 의미에 맞는 사용(GET 조회/POST 생성/PATCH 수정/DELETE 삭제)
- 상태 코드 정확한 반환(200 성공, 201 생성, 400 클라이언트 오류, 404 미존재, 500 서버 오류)
- 일관된 에러 응답 포맷(code, message, details)
- 버전 관리: URL prefix(/v1/resources) 방식 선호 — Header 방식 대비 직관적이고 프론트엔드 협업 시 명확
- 실무: 시솔지주에서 프론트엔드 협업 시 API 문서화(Swagger) + 일관된 응답 포맷 설계 경험
- 꼬리:
  - "PATCH vs PUT?" → PUT은 리소스 전체 교체(보내지 않은 필드는 null), PATCH는 부분 수정(보낸 필드만 변경). 실무에서는 PATCH가 더 자주 사용
  - "페이지네이션 방식?" → offset 기반(간단, 대량 데이터에서 느림 — OFFSET 10000은 10000행 스캔 후 버림) vs cursor 기반(마지막 조회 ID 기준으로 다음 페이지, 일정한 성능). 트라이포드랩에서 디바이스 목록 조회 시 cursor 기반 적용
  - "멱등성이 중요한 이유?" → 네트워크 실패로 재요청 시 동일 결과 보장. GET/PUT/DELETE는 기본적으로 멱등, POST는 아님 → 멱등성 키(Idempotency-Key 헤더)로 해결

#### 캐시 전략? Redis를 어디에? 무효화는?
> 관련: [[Cache-Strategies|캐시전략]], [[Cache-Invalidation|캐시무효화]], [[Cache-Stampede|캐시스탬피드]]

- Cache-Aside 패턴 기본
- 실무: 시솔지주에서 Google 번역 API 메타데이터를 DB 캐시로 전환
  - 자주 변경되지 않는 국가별 메타데이터를 매 요청마다 API 호출 → 서버 시작 시 1회 로드+DB 저장
  - API latency 3초→0.9초(70% 개선)
- 트라이포드랩: Read Replica 도입 후 조회 빈도 높은 API에 Redis 캐시 계층 추가 예정이었음
- 무효화: TTL 기반 + Write-through
- 주의: 캐시-DB 불일치, 캐시 스탬피드(동시 만료 시 DB 과부하)
- 꼬리:
  - "캐시 스탬피드 해결법?" → TTL에 jitter 추가(동시 만료 방지) + 만료 전 백그라운드 갱신 + mutex lock으로 한 요청만 DB 조회 후 캐시 갱신
  - "Cache-Aside vs Write-Through?" → Cache-Aside: 읽기 시 캐시 미스면 DB 조회 후 캐시 적재 (lazy). Write-Through: 쓰기 시 캐시+DB 동시 갱신 (캐시 항상 최신이지만 쓰기 오버헤드)
  - "Redis가 죽으면?" → 캐시는 보조 계층이므로 DB로 fallback. 다만 갑자기 전체 트래픽이 DB로 몰리면 DB도 죽을 수 있음(캐시 아발란체) → DB 커넥션 풀 제한 + rate limiting으로 보호

#### 트랜잭션 격리 수준? 데드락 경험?
> 관련: [[Isolation-Level|격리수준]], [[Transactions|트랜잭션]]

**InnoDB 격리 수준과 MVCC**
- MySQL InnoDB 기본 **REPEATABLE READ** — 트랜잭션 시작 시점의 스냅샷(Consistent Read)을 유지
- MVCC(Multi-Version Concurrency Control): undo log에 이전 버전을 보관하여 읽기와 쓰기가 서로 차단하지 않음
- RR에서 Phantom Read 방지: InnoDB는 Next-Key Lock으로 범위 검색 시 새 행 삽입도 차단

**실무 연결**
- 재고 갱신 시스템에서 RR 격리 수준 + `SELECT FOR UPDATE`(Current Read) 조합으로 정합성 확보
- 데드락은 완전히 예방할 수 없으므로, 위 DB Lock 섹션의 완화 전략(Lock 순서 통일, 트랜잭션 범위 최소화, NO WAIT)으로 발생 확률을 줄이고, InnoDB 자동 감지+복구에 의존

**꼬리 질문 대비**
- "RC vs RR 차이?" → RC는 **매 쿼리마다** 최신 커밋 스냅샷 (Non-Repeatable Read 발생). RR은 **트랜잭션 시작 시점** 스냅샷 고정
- "RR인데 왜 SELECT FOR UPDATE는 최신 데이터를 읽나?" → Consistent Read(일반 SELECT)는 스냅샷, Current Read(FOR UPDATE)는 최신 커밋 데이터. lock을 걸려면 최신 데이터를 봐야 의미가 있음
- "RR에서 RC로 바꾸면 뭐가 좋아지나?" → Gap Lock이 비활성화되어 INSERT 동시성 향상. 단, Phantom Read 허용 필요

#### Node.js 이벤트 루프? 싱글 스레드인데 어떻게 동시 처리?
> 관련: [[Event-Loop|이벤트루프]], [[libuv|libuv]], [[Thread-vs-Event-Loop|스레드vs이벤트루프]]

**싱글 스레드의 의미**
- Node.js는 **JS 코드 실행**이 싱글 스레드(메인 스레드 = V8 엔진의 콜 스택 1개)
- 하지만 I/O 작업(파일, 네트워크, DB)은 **libuv가 OS 커널 또는 스레드 풀에 위임** → 완료 시 콜백을 이벤트 큐에 등록
- 결과적으로 JS 코드는 한 줄씩 실행하되, I/O 대기 시간 동안 다른 요청을 처리할 수 있음

**이벤트 루프 6단계 (libuv)**
1. **Timers** — `setTimeout`, `setInterval` 콜백 실행
2. **Pending Callbacks** — 이전 루프에서 지연된 I/O 콜백
3. **Idle/Prepare** — 내부 전용
4. **Poll** — 새 I/O 이벤트 대기 및 콜백 실행 (대부분의 시간을 여기서 보냄)
5. **Check** — `setImmediate` 콜백 실행
6. **Close Callbacks** — `socket.on('close')` 등

**Microtask vs Macrotask**
- Microtask: `Promise.then`, `process.nextTick` → **각 단계 사이**에 전부 소진될 때까지 실행
- Macrotask: `setTimeout`, `setInterval`, `setImmediate`, I/O 콜백 → 이벤트 루프 각 단계에서 실행
- `process.nextTick` > `Promise.then` > `setTimeout` > `setImmediate` 순서
- **실무 주의**: `process.nextTick`을 재귀 호출하면 이벤트 루프가 다음 단계로 못 넘어감(I/O starvation)

**libuv 스레드 풀**
- 기본 4개 워커 스레드 (`UV_THREADPOOL_SIZE`로 최대 1024까지 조정)
- 스레드 풀을 사용하는 작업: DNS lookup(`dns.lookup`), 파일 시스템, 압축(zlib), 암호화(crypto)
- 네트워크 I/O(TCP, HTTP)는 스레드 풀 사용하지 않음 — OS 커널(epoll/kqueue)에 직접 위임

**이벤트 루프 블로킹 방지**
- CPU 집약 작업(큰 JSON 파싱, 이미지 처리, 암호화 연산)이 메인 스레드를 블로킹
- 해결:
  1. **Worker Threads** — CPU 집약 작업을 별도 스레드에서 실행 (`worker_threads` 모듈)
  2. **자식 프로세스** — `child_process.fork()`로 별도 프로세스 위임
  3. **외부 서비스 위임** — STT, LLM 같은 무거운 처리는 전용 서비스(GPU 서버)로 분리하고 Node.js는 I/O 조율만 담당
  4. **스트리밍 처리** — 대용량 데이터를 한번에 메모리에 올리지 않고 chunk 단위로 처리

**다글로 연결**
- Node.js가 STT/LLM 서빙에 적합한 이유: AI 처리 자체는 외부 API/GPU 서버가 담당하고, Node.js는 **요청 접수 → 큐 발행 → 결과 전달**이라는 I/O 조율에 집중 → 싱글 스레드로도 높은 동시성 확보
- 반대로 Node.js에서 하면 안 되는 것: 음성 파일 디코딩, 모델 추론 같은 CPU 집약 작업을 메인 스레드에서 직접 실행

**꼬리 질문 대비**
- "setTimeout(fn, 0)과 setImmediate 차이?" → `setTimeout(fn, 0)`은 Timers 단계, `setImmediate`는 Check 단계에서 실행. I/O 콜백 안에서는 `setImmediate`가 항상 먼저, 최상위 스코프에서는 순서 비보장
- "Worker Threads vs child_process?" → Worker Threads는 같은 프로세스 내 메모리 공유 가능(SharedArrayBuffer), child_process는 별도 프로세스(IPC 통신 필요, 메모리 격리). CPU 연산은 Worker Threads, 완전 격리가 필요하면 child_process
- "이벤트 루프가 느려지는 걸 어떻게 감지?" → `monitorEventLoopDelay` API(Node.js 11+)로 이벤트 루프 지연 측정 → Prometheus 메트릭으로 노출. 실제로 GPL 모니터링에서 Event Loop Lag 100ms 3분 지속 시 알림 설정
- "Node.js 클러스터링은?" → `cluster` 모듈로 CPU 코어 수만큼 워커 프로세스 fork → 각 워커가 독립적으로 이벤트 루프 실행. 하지만 ECS Fargate 환경에서는 컨테이너 오토스케일링이 더 적합 (각 태스크가 1 프로세스)
- "Node.js가 멀티코어를 활용 못한다는 건 맞나?" → 메인 스레드는 싱글 코어지만, libuv 스레드 풀 + Worker Threads + 클러스터링으로 멀티코어 활용 가능. 다만 아키텍처적으로는 컨테이너 수평 확장이 더 간단하고 관리하기 쉬움

#### NestJS 모듈 설계? DI 원리? 순환 참조?
> 관련: [[NestJS|NestJS]], [[Custom-Provider|커스텀프로바이더]], [[Injection-Scopes|인젝션스코프]]

- 클린 아키텍처 참고하여 계층 분리:
  - Controller(Interface Adapters) → UseCase(Application Core) → DomainService(핵심 비즈니스) → Repository Interface → Prisma Client(External Infrastructure)
- UseCase별로 사용자 의도 분리(JSON Response용 vs 엑셀 다운로드용), 핵심 비즈니스 변경되어도 UseCase별 영향 최소화
- DI 원리: NestJS IoC 컨테이너가 Provider의 생성·주입·생명주기 관리, @Injectable 데코레이터로 등록 → constructor에서 타입 기반 자동 주입
- 순환 참조: forwardRef()로 해결하되 근본적으로는 모듈 의존 방향을 단방향으로 설계하는 것이 중요
- 모듈 간 의존은 exports로 명시적 공개
- 꼬리:
  - "Guard vs Middleware vs Interceptor 차이?" → Middleware(요청 전처리, Express 호환), Guard(인가/인증 체크, true/false 반환), Interceptor(요청·응답 양쪽 변환, 로깅·캐싱·응답 포맷)
  - "Provider scope 종류?" → DEFAULT(싱글톤, 앱 생명주기), REQUEST(요청마다 생성, 테넌트별 컨텍스트에 유용), TRANSIENT(주입마다 새 인스턴스). 대부분 DEFAULT로 충분
  - "클린 아키텍처 도입 효과?" → UseCase 분리로 단일 도메인 로직 변경 시 영향 범위 최소화. 실제로 고객사별 커스텀 요구를 UseCase 레벨에서만 분기해서 해결

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
- 꼬리:
  - "Cloud Run과 ECS Fargate 차이?" → Cloud Run은 요청 기반 0→N 스케일링(요청 없으면 0), Fargate는 태스크 단위 상시 구동. Cloud Run이 서버리스에 더 가깝고 비용 효율적
  - "온보딩 얼마나 걸릴 것 같나?" → 개념은 동일하니 서비스 매핑에 1~2주, IAM/네트워킹 같은 GCP 고유 설정 적응에 추가 1~2주. 기존 인프라 마이그레이션 경험(LightSail→EC2, EC2→ECS)이 있어 빠르게 적응할 자신 있음

#### 테스트 코드 어떻게 작성하나?
> 관련: [[Service-Layer-Testing|서비스레이어테스트]], [[Test-Fixture|테스트픽스처]], [[Test-Isolation|테스트격리]]

- 시솔지주: Mocha+Chai로 테스트 0→1 도입
  - SonarQube 웹 대시보드로 팀 전체 코드 품질 지표 공유
  - PR 연동하여 커버리지 60% 미달 시 머지 불가 → 최종 70% 달성
  - CBT 특성상 오발송 시 막대한 손실 가능해서 안정성 확보가 최우선
- 트라이포드랩: jest+supertest
  - 발주 자동화 Batch에서 스케줄링 부분과 핵심 비즈니스 로직을 분리 설계
  - 테스트 코드에서도 Batch 핵심 로직을 독립적으로 검증 가능하게 함
- 꼬리:
  - "테스트 피라미드?" → 유닛(서비스 로직, 빠르고 많이) → 통합(API 엔드포인트, 중간) → E2E(전체 플로우, 느리고 적게). 아래로 갈수록 빠르고 많아야 함
  - "모킹은 언제 쓰나?" → 외부 의존성(API, 메일 발송 등)은 모킹. 핵심 비즈니스 로직은 실제 DB로 테스트하는 게 안전. 트라이포드랩에서 발주 Batch 테스트 시 스케줄링은 분리하고 핵심 로직만 독립 테스트
  - "커버리지 목표치 기준?" → 숫자 자체보다 비즈니스 크리티컬 경로의 커버리지가 중요. 시솔지주에서 60% 게이트를 둔 이유는 CBT 오발송 리스크 때문 — 도메인 리스크에 비례

### 서비스 맥락 질문

#### 180만 사용자가 동시에 STT 요청 — 어떻게 설계?

- STT는 처리 시간이 수초~수분이라 동기 처리 불가
- 요청 접수(API, 즉시 jobId 반환) → 큐(Pub/Sub)에 메시지 발행 → 워커(STT 처리, 오토스케일링) → 완료 시 알림(WebSocket/푸시)
- 큐로 백프레셔 제어하여 워커 과부하 방지
- 실무 연결: 트라이포드랩에서 동일 구조
  - 발주 이벤트 → EventBridge → SQS → 워커(ECS Fargate)로 비동기 처리
  - 워커가 죽어도 SQS 메시지 유지되어 재처리 가능
**대용량 오디오 업로드 — 스트리밍 처리**
- 1,300만 시간 분량 → 개별 파일이 수백MB~수GB일 수 있음. 전체를 메모리에 올리면 OOM
- Node.js Stream으로 chunk 단위 처리:
  - 클라이언트 → API 서버: `multipart/form-data` 스트리밍 수신 (busboy/multer의 stream 모드)
  - API 서버 → 오브젝트 스토리지: 수신하면서 동시에 GCS/S3에 스트리밍 업로드 (`stream.pipe()`)
  - 메모리 사용량: 파일 크기와 무관하게 **버퍼 크기(highWaterMark)만큼만** 사용 (기본 16KB~64KB)
- **백프레셔(Backpressure)**: 생산자(클라이언트)가 소비자(스토리지 업로드)보다 빠르면 Node.js Stream이 자동으로 `pause()` → 내부 버퍼가 `highWaterMark` 이하로 내려가면 `resume()`. `pipe()`가 이 메커니즘을 자동 처리
- Presigned URL 패턴: 대용량 파일은 API 서버를 경유하지 않고, **서버가 Presigned URL을 발급 → 클라이언트가 GCS/S3에 직접 업로드** → 업로드 완료 콜백/이벤트로 후속 처리 트리거. 서버 부하 제거 + 업로드 속도 향상

**실무 연결**: 트라이포드랩에서 동일 구조
- 발주 이벤트 → EventBridge → SQS → 워커(ECS Fargate)로 비동기 처리
- 워커가 죽어도 SQS 메시지 유지되어 재처리 가능
- IoT 디바이스에서 대량 데이터 수신 시에도 스트리밍 처리로 메모리 안정성 확보

**꼬리:**
- "큐가 밀리면?" → 워커 오토스케일링(큐 depth 기반) + 사용자에게 예상 대기시간 안내 + 우선순위 큐(유료 사용자 우선)
- "STT 결과를 어디에 저장?" → 오디오 원본은 오브젝트 스토리지(S3/GCS), 텍스트 결과는 DB. 대용량 바이너리는 DB에 넣지 않음
- "동시 요청 제한은?" → API Gateway or 애플리케이션 레벨 rate limiting. 사용자별/플랜별 분당 쿼터. 429 Too Many Requests 반환 + Retry-After 헤더
- "Presigned URL의 보안은?" → URL에 만료 시간(예: 15분) + 파일 크기 제한 + Content-Type 제한 설정. 서버 측에서 업로드 완료 후 파일 유효성 검증(포맷, 크기, 악성 파일 스캔)
- "스트리밍 중 연결 끊기면?" → GCS/S3의 Resumable Upload 활용. 클라이언트가 중단된 지점부터 재개 가능. 서버 측에서는 미완료 멀티파트 업로드를 lifecycle policy로 자동 정리

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
- 꼬리:
  - "Circuit Breaker 상태를 어디서 관리?" → 단일 인스턴스면 in-memory, 멀티 인스턴스면 Redis에 상태 공유. NestJS에서는 opossum 같은 라이브러리 활용
  - "Fallback 전략은?" → 대체 모델/프로바이더로 전환(OpenAI 장애 시 Anthropic 등), 캐시된 이전 결과 반환, 사용자에게 "잠시 후 다시 시도" 안내. 핵심은 사용자 경험이 완전히 끊기지 않는 것
  - "재시도 시 jitter를 왜 넣나?" → exponential backoff만 하면 모든 클라이언트가 같은 타이밍에 재시도 → 또 동시 과부하. jitter(랜덤 지연)로 재시도 시점을 분산

#### 오래 걸리는 작업(문서 번역, 슬라이드 생성)의 상태 관리?

- Job 테이블 설계: id, type, status(pending→processing→done/failed), progress(%), created_at, updated_at, error_message
- 상태 알림:
  - 폴링 — 간단하지만 불필요한 요청 많음
  - WebSocket — 실시간이지만 커넥션 관리 필요
  - 초기엔 폴링으로 시작, 트래픽 커지면 WebSocket 전환이 현실적
- 멱등성 키로 동일 작업 중복 생성 방지(사용자 실수로 여러 번 클릭)
- 실무 연결: 시솔지주 환율 Batch에서 동일 패턴 — 30분 간격 스케줄 실행, 실패 시 최대 4회 재시도, 상태 관리로 중복 실행 방지
- 꼬리:
  - "processing 중 서버가 죽으면?" → heartbeat 기반 타임아웃, 일정 시간 응답 없으면 failed 처리 후 재시도
  - "폴링 vs WebSocket vs SSE?" → 폴링(구현 간단, 불필요 요청), WebSocket(양방향, 커넥션 관리 복잡), SSE(서버→클라이언트 단방향, HTTP 기반으로 간단). 진행률 알림은 서버→클라이언트 단방향이니 SSE도 좋은 선택
  - "멱등성 키 구현은?" → 클라이언트가 UUID 생성하여 요청 헤더에 포함. 서버는 키를 Redis/DB에 저장하고 동일 키 재요청 시 기존 결과 반환. TTL로 자동 만료

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
- 꼬리:
  - "논리적 격리의 단점?" → 한 테넌트의 대량 쿼리가 다른 테넌트에 영향(noisy neighbor), DB 인덱스에 tenant_id 필수 포함
  - "noisy neighbor 어떻게 대응?" → 테넌트별 rate limiting + 쿼리 리소스 제한(커넥션 풀 분리) + 특정 테넌트가 임계치 초과 시 알림. 궁극적으로는 대형 고객사는 스키마/DB 분리 검토
  - "논리적 → 물리적 격리로 전환 시점?" → 보안/컴플라이언스 요구(고객 데이터 완전 분리 필요), 성능 격리 필요(대형 고객사 트래픽이 다른 테넌트에 영향), 고객사 수가 일정 규모 이상일 때

#### 서비스 장애 시 어떻게 대응?

- 실제 경험 기반:
  1. Grafana Alerting이 Slack/팀별 라우팅으로 자동 알림 (Error rate 1% `for:5m`, Event Loop Lag 100ms 3분 등 SLO 기반 임계값)
  2. 대시보드에서 영향 범위 파악 — TraceId로 요청 단위 로그+메트릭 연계 조회, 어떤 API·어떤 사용자에게 영향인지 확인
  3. 롤백(ECS Rolling Update 이전 태스크로 복귀) or 핫픽스 판단 — 데이터 정합성 문제면 즉시 롤백, 단순 로직 버그면 핫픽스
  4. 근본 원인 분석 — Loki 로그+Prometheus 메트릭 교차 분석, 슬로우쿼리면 EXPLAIN 확인
  5. 재발 방지 — 알림 임계값 조정, 테스트 케이스 추가, 포스트모템 공유
- 꼬리:
  - "장애 등급을 어떻게 나누나?" → P1(서비스 전체 중단), P2(주요 기능 장애), P3(일부 사용자 영향), P4(성능 저하) — 등급별 대응 SLA 차등
  - "포스트모템에 뭘 쓰나?" → 타임라인(발생→감지→대응→복구), 근본 원인, 영향 범위, 재발 방지 액션 아이템. 비난 없는 문화(blameless postmortem)가 핵심
  - "장애를 미리 방지하는 방법?" → SLO 기반 알림(문제가 커지기 전에 감지), 카나리 배포(일부 트래픽만 새 버전으로), 로드 테스트(k6, Artillery 등으로 병목 사전 발견), 코드 리뷰+테스트 커버리지 게이트

### 컬처핏 질문 (1차는 직무 면접이지만 섞일 수 있음)

- [x] 장단점 — [[FIT#본인의 장단점|FIT]] 실행력/성급함
- [x] 기획자 충돌 — [[FIT#기획자와 의견 충돌 사례|FIT]] 결제 환불 사례
- [x] 긴급 이슈 판단 — [[FIT#긴급 이슈 동시 발생 시 판단 기준|FIT]] 비즈니스 임팩트 기준
- [x] 성장 목표 — [[FIT#장기적으로 어떤 개발자가 되고 싶은가요?|FIT]] 개발 리드 → CTO
- [ ] **추가**: "빠르게 변화하는 AI 기술을 어떻게 따라가나?"
  - **원칙**: 기술 자체를 쫓는 게 아니라, **"이 단계의 서비스에 필요한가?"**로 판단
  - **정보 수집**: AI 관련 기술 블로그(OpenAI, Google AI, Anthropic), Hacker News, 커뮤니티 디스커션을 주기적으로 확인. 새 모델/API가 나오면 **비용, 레이턴시, 정확도** 3가지 축으로 빠르게 평가
  - **검증 프로세스**: 관심 기술 → 프로토타입(1~2일) → 기존 시스템 대비 정량 비교 → 도입 여부 판단. 트라이포드랩에서 EventBridge+SQS 선택 시 MSK와 정량 비교(비용 99% 절감)한 것과 같은 접근
  - **커뮤니티 활동**: 하코 3000명 커뮤니티 Prisma 성능 개선 발표, 카카오테크 캠퍼스 멘토링. 발표 준비 과정에서 기술을 깊이 파고, 질의응답에서 다른 관점을 얻음
  - **백엔드 엔지니어로서의 포지셔닝**: AI 모델 자체를 개발하는 게 아니라, AI를 **안정적으로 서빙하는 인프라**가 역할. 새 AI 기술이 나와도 큐+워커, 타임아웃/재시도, 비용 관리 같은 서빙 패턴은 공통 → 이 패턴을 탄탄히 갖추면 어떤 AI 기술이든 빠르게 통합 가능
  - 꼬리:
    - "최근 관심 있는 기술은?" → Claude MCP(Model Context Protocol) — AI가 외부 도구/데이터에 접근하는 표준 프로토콜. 백엔드에서 MCP 서버를 구축하면 AI 에이전트가 DB, API, 문서 등을 직접 조회할 수 있어 AI 서비스의 확장성이 크게 높아짐. 다글로처럼 다양한 AI 기능(STT, 번역, 슬라이드)을 제공하는 플랫폼에서 유용할 것으로 기대
    - "기술 도입 실패 경험은?" → 모든 기술 도입이 성공하진 않음. 중요한 건 **빠르게 실패하고 빠르게 되돌리는 것**. 프로토타입 단계에서 걸러내면 프로덕션 리스크 최소화

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
