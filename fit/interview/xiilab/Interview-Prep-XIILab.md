---
tags: [fit, interview, xiilab]
status: active
category: "Interview - Fit"
aliases: ["XIILab Interview Prep", "씨이랩 면접 준비"]
---

# 씨이랩 (XIILab) 면접 준비

> 면접일: TBD (1차 면접 - 과제 + 실무자 인터뷰)
> 채용 공고: https://xiilab.career.greetinghr.com/ko/o/173262
> 템플릿: [[Interview-Prep-Template|면접 준비 템플릿]]

---

## 1. JD 분석

### 회사 개요

| 항목    | 내용                                                                                |
| ----- | --------------------------------------------------------------------------------- |
| 회사명   | (주)씨이랩 (XIILab)                                                                   |
| 서비스   | AI 솔루션 — X-AIVA(실시간 영상분석), AstraGo(GPU 컴퓨팅 어플라이언스), Xniper(제조 공정 Vision AI QA/QC) |
| 단계    | 성장기 (2010년 설립, 스톡옵션 제도 운영)                                                        |
| 규모    | NVIDIA, AWS 글로벌 파트너                                                               |
| 도메인   | AI (영상분석, 제조 Vision AI, GPU 컴퓨팅)                                                  |
| BM 추정 | B2B — 기업·공공기관에 AI 솔루션 납품·구축                                                       |

### 포지션 정보

| 항목 | 내용 |
|------|------|
| 포지션 | Product Engineer (Full Stack) |
| 연차 | 2~8년 |
| 소속 | R&D Group |
| 주요 업무 | 제품 기능 설계·구현·운영, React 프론트엔드 + 백엔드 API 개발, DB 모델링·최적화, 모니터링·운영 |
| 채용 절차 | ~~서류~~ → ~~인성검사~~ → **1차 면접(과제+실무 인터뷰)** → 2차 면접(임원) → 처우 협의 |

### 핵심 키워드 (면접에서 반복 등장할 것)
- **Full Stack**: 프론트엔드 + 백엔드 모두 다룰 수 있는 엔지니어
- **DRI 문화**: 문제 정의부터 실행까지 한 명이 주도적으로 리드
- **AI 도구 활용(AX)**: Cursor, Claude Code 등을 적극 활용해 개발 속도·품질 향상
- **제품 중심**: 사용자 경험 개선, 기능 설계·구현·운영 전 과정
- **투명한 소통**: 슬랙 중심, 수평적 '님' 호칭

### 자격요건 vs 내 경험 매칭

| 자격요건 | 매칭도 | 내 근거 |
|---------|--------|--------|
| 관련 경력 2년 이상 | **강** | 4년차 (트라이포드랩 2년2개월 + 시솔지주 1년 + 이썸테크 6개월) |
| 웹 프론트엔드 + 백엔드 이해·개발 | **중** | 백엔드 강점. 프론트는 API 연동 협업 경험 있으나 직접 개발 경험 부족 |
| React 사용 경험 | **중** | 사이드 프로젝트 출석부(school-manage)에서 React 19 + Vite + TypeScript 풀스택 개발·운영. 30개 단체 실서비스 |
| Java/Go/Python/Node.js 중 하나 이상 | **강** | Node.js(NestJS/Express) 4년, Java(Spring) 6개월 |
| MySQL, PostgreSQL 등 DB 사용 | **강** | MySQL 메인. 슬로우쿼리 99.3% 개선, 복합 인덱스 최적화, Read Replica |
| 주도적 협업·문제해결 | **강** | FIDO 서버 개발 주도, 아키텍처 설계, 모니터링 인프라 구축 등 |

### 우대사항 vs 내 경험 매칭

| 우대사항 | 매칭도 | 내 근거 |
|---------|--------|--------|
| 기획→개발→운영 전 과정 참여 | **강** | PMF → 대형 고객사 PoC → 운영 최적화까지 전 과정 경험 |
| AWS/GCP/Azure 클라우드 운영 | **강** | AWS 실무 (ECS, RDS, CloudFront, EventBridge, SQS) |
| 테스트 코드 작성·품질 개선 | **중** | 시솔지주: Mocha+Chai+SonarQube로 커버리지 0→70%, PR 연동 60% 미달 시 머지 불가. 트라이포드랩: jest+supertest, 스케줄링/비즈니스 로직 분리 설계 |
| 성능 최적화, 장애 대응, 모니터링 | **강** | 슬로우쿼리 99.3% 개선, API 90% 향상, Grafana/Prometheus/Loki 직접 구축 |

### 기술 스택 비교

| JD 스택 | 내 경험 | 갭 분석 |
|---------|--------|--------|
| React | React 19 (사이드 프로젝트 출석부 — 30개 단체 실서비스 운영) | 프로덕션 경험 있음 |
| Node.js | Node.js (NestJS, Express) | 동일 |
| Spring | Spring (이썸테크) | 유사 — 경험 있으나 오래됨 |
| Django | — | 없음 — Python 웹 프레임워크 |
| MySQL, PostgreSQL | MySQL | 동일 (PostgreSQL 차이점 숙지 필요) |

---

## 2. 회사 맞춤 FIT 답변

### 1분 자기소개
> 구조: 이름/역할 → 도메인 경험 → 핵심 성과 → 핵심 철학 → 왜 씨이랩 → 마무리

안녕하세요, 4년차 백엔드 개발자 최동철입니다.

트라이포드랩에서 NestJS 기반 VMI 서비스의 핵심 기능을 설계하고 운영해왔습니다. 수천 대 IoT 기기의 동시 요청을 DB Lock으로 해결하고, EventBridge와 SQS 기반 이벤트 아키텍처로 수기 발주 프로세스를 완전 자동화했습니다. 운영 중에는 복합 인덱스 최적화로 슬로우 쿼리를 99.3% 개선하고, 단일 서버 구조를 CloudFront+ECS 아키텍처로 전환해 안정적인 스케일링 환경을 마련했습니다.

저는 문제를 발견하면 정의부터 해결까지 직접 끌고 가는 것을 좋아합니다. 씨이랩의 DRI 문화가 제가 일해온 방식과 잘 맞다고 느꼈고, AI 솔루션이라는 도메인에서 제품의 전체 과정에 참여하며 풀스택으로 성장하고 싶어 지원했습니다.

### 지원 동기
> 구조: 회사의 미션 이해 → 내 관련 경험 → 연결점 → 기여하고 싶은 것

- **회사의 문제**: 씨이랩은 AI 영상분석(X-AIVA), 제조 Vision AI(Xniper) 등 실제 산업 현장의 문제를 AI로 해결하는 회사. Product Engineer로서 제품의 프론트부터 백엔드까지 책임지는 역할
- **내 연결점**: 트라이포드랩에서 제품의 0→1 구축부터 대형 고객사 PoC, 운영 최적화까지 전 과정을 경험. 특히 IoT 하드웨어 연동 서비스에서 대규모 동시 요청 처리, 이벤트 기반 자동화, 인프라 고도화를 주도
- **기여하고 싶은 것**: 백엔드 역량을 기반으로 프론트엔드까지 영역을 넓혀 제품 전체를 주도할 수 있는 엔지니어가 되고 싶음. DRI 문화에서 AI 도구를 활용해 빠르게 학습하고 기여하겠음

### 이직 사유
> B2B → B2B, 제품 엔지니어 성장 관점

- 트라이포드랩에서 VMI 서비스의 핵심 기능 설계부터 대형 고객사 PoC 성공까지 충분히 성장
- 하지만 백엔드에만 집중하다 보니 **제품 전체를 보는 시야**가 부족하다고 느낌. 프론트엔드까지 직접 구현해 사용자 경험 전체를 주도하고 싶음
- 씨이랩의 Product Engineer 포지션은 프론트+백엔드를 모두 다루며, DRI로서 문제 정의부터 해결까지 주도하는 역할 — 정확히 원하던 성장 방향
- 꼬리 대비: "React 경험 없는데 괜찮나?" → 사이드 프로젝트 출석부를 React 19 + tRPC로 직접 개발해서 30개 단체가 실제 사용 중인 프로덕션 서비스를 운영하고 있음. 커스텀 훅, React Query, 인증 흐름 등 실전 경험이 있고, AI 도구(Claude Code)를 활용해 부족한 부분은 빠르게 보완할 자신 있음

---

## 3. 예상 질문 (면접관 → 나)

### 이력서 기반 기술 질문

#### DB Lock으로 Race Condition 해결 — 어떤 Lock? 왜? Optimistic vs Pessimistic?
> 관련: [[Transaction-Lock-Contention|트랜잭션·락]], [[Transactions|트랜잭션]], [[Distributed-Lock|분산락]], [[Lock|DB Lock]]

**문제 상황**
- 수천 대 IoT 디바이스가 동시에 재고 데이터를 전송 → 같은 품목에 동시 갱신 시 Lost Update 발생
- 예: 재고 100개인 품목에 디바이스 A(-5), B(-3)가 동시 도착 → 둘 다 100을 읽고 각각 95, 97로 갱신 → 최종 97 (정상: 92)

**Pessimistic Lock 선택 이유**
- `SELECT FOR UPDATE NO WAIT`로 품목 단위 Exclusive Row Lock 획득
- 재고 읽기+갱신을 원자적 처리 (읽은 값 기반으로 갱신하므로 Lost Update 원천 차단)
- `NO WAIT` 옵션: lock 획득 실패 시 즉시 에러 반환 → 100ms 간격 최대 3회 재시도 (최악 1초 이내 완료)

**Optimistic Lock을 선택하지 않은 이유**
- IoT 특성상 **충돌 빈도가 높음** (수천 대가 주기적으로 동시 전송) → Optimistic은 재시도 비용이 과도
- Pessimistic은 충돌 시 Lock 대기/즉시 실패로 **한 번만 수행** vs Optimistic은 충돌 시 **전체 로직 재실행**

| 기준 | Optimistic | Pessimistic |
|------|-----------|-------------|
| 충돌 빈도 | 낮을 때 유리 | 높을 때 유리 |
| 충돌 시 비용 | 전체 트랜잭션 재실행 | Lock 대기 (NO WAIT면 즉시 실패 후 재시도) |
| Lock 보유 시간 | 없음 | 트랜잭션 동안 보유 |
| 데드락 위험 | 없음 | 있음 (순서 통일로 예방) |

**트랜잭션 범위 최소화**
- 디바이스 정보 조회·검증은 트랜잭션 **밖**에서 수행 (lock 보유 시간 줄이기)
- Lock 순서 통일: 항상 **품목 ID 오름차순**으로 lock 획득 → 교차 대기(데드락) 방지

**Redis 분산락을 선택하지 않은 이유**
- 단일 DB 환경에서 DB 자체 lock이면 충분 (인프라 단순성 우선)
- 분산 DB/멀티 인스턴스 환경이 되면 그때 Redis 분산락 도입 검토

**꼬리 질문 대비**
- "NO WAIT 대신 SKIP LOCKED는?" → SKIP LOCKED는 잠긴 행을 건너뛰고 다음 행을 읽음. 큐 패턴에 적합하지만, 재고 갱신처럼 **특정 행을 반드시 처리해야 하는** 경우에는 NO WAIT가 맞음
- "ECS 멀티 인스턴스에서도 DB Lock으로 충분한가?" → 같은 DB를 바라보는 한 충분. DB가 분리되면(샤딩 등) 분산 락 필요
- "Optimistic Lock이 나은 상황은?" → 읽기 중심 서비스, 충돌 빈도 낮은 경우 (예: 게시글 수정, 설정 변경)
- "데드락 발생 시 처리?" → InnoDB Wait-for Graph로 자동 탐지 → 비용 적은 TX 자동 rollback → 앱에서 catch 후 재시도

#### 슬로우 쿼리 99.3% 개선 — 측정 방법? EXPLAIN 분석?
> 관련: [[Index|인덱스]], [[Execution-Plan|실행계획]]

- 디바이스 최신 상태 조회 서브쿼리 2000ms+ 소요
- 테이블 100만 건, 850대 디바이스, 디바이스당 평균 1,240건 균등 분포
- EXPLAIN ANALYZE로 `ORDER BY created_at DESC, id DESC` 후 전체 행 filesort 확인
- 카디널리티 분석: 디바이스 번호 선택도 0.08% → 복합 인덱스 `(device_number, created_at DESC, id DESC)` 설계
- 인덱스 스캔만으로 최상단 레코드 즉시 접근. Prisma `@@index`로 선언
- 결과: 쿼리당 15.4ms → 0.1ms. 3,000대 확장 시에도 인덱스 탐색 1건이라 데이터 양에 무관한 구조
- 꼬리:
  - "복합 인덱스 컬럼 순서 기준?" → 동등 조건(=) 컬럼을 앞에, 범위 조건은 뒤에. 카디널리티 높은 컬럼이 앞에
  - "인덱스를 많이 만들면?" → SELECT는 빨라지지만 INSERT/UPDATE/DELETE 시 인덱스도 갱신 → 쓰기 성능 저하
  - "커버링 인덱스란?" → 쿼리에 필요한 모든 컬럼이 인덱스에 포함되어 테이블 접근 없이 결과 반환

#### Prisma 쿼리 증가 문제 — 구체적으로? ORM vs Raw Query 전환 기준?
> 관련: [[Execution-Plan|실행계획]], [[SQL|SQL]]

- Prisma는 lazy loading이 없어 전통적 N+1은 아님
- 문제는 app-level join 방식 — include 시 SQL JOIN이 아니라 관계마다 별도 쿼리를 발생시켜, 조인 엔티티가 늘어날수록 쿼리가 N개씩 증가
- 기존 평균 100ms → 1000ms까지 저하
- 로그 분석으로 4개 개별쿼리 확인 → 공식 문서 검토하여 relationLoadStrategy: 'join' 발견
- DB-level JOIN 전환만으로 82~90% 성능 개선
- 꼬리:
  - "ORM을 왜 쓰나?" → 타입 안전성, 마이그레이션 관리, 생산성. 성능 크리티컬한 부분만 Raw Query로 전환
  - "Raw Query 전환 기준은?" → EXPLAIN으로 실행 계획 확인 후 ORM 생성 쿼리가 비효율적일 때
  - "Prisma 말고 다른 ORM은?" → 출석부 프로젝트에서는 Prisma + Kysely 조합 사용. Prisma로 스키마/마이그레이션 관리, Kysely로 복잡한 쿼리를 타입세이프하게 작성

#### EventBridge+SQS 선택 이유? Kafka와 차이?
> 관련: [[MQ-Kafka|MQ·Kafka]], [[Messaging-Patterns|메시징패턴]], [[Delivery-Semantics|전달보장]]

- 실제 비용 비교: MSK $574/월 vs EventBridge+SQS $0~18/월
- 발주라는 도메인 특성상 실시간 처리 불필요 + 최종 일관성이면 충분
- 이벤트 플로우: 발주 → SQS → 수주처리 → SQS → 카톡/이메일/발주서 각각 병렬 처리
- 채널별 DLQ 설정(카톡: 잘못된 번호 시 실패 처리, 이메일: 무조건 재시도)
- Kafka가 필요한 시점: 이벤트 리플레이, 순서 보장, 초당 수만건 이상
- 꼬리:
  - "SQS 메시지 유실 가능성은?" → at-least-once 보장. 소비자 측 멱등성 필수. 발주 ID 기반 상태 머신으로 중복 처리 방지
  - "이벤트 순서 보장이 필요하면?" → SQS FIFO 큐(MessageGroupId 기반, 초당 300 TPS) 또는 Kafka(파티션 내 순서 보장)

#### CloudFront+ECS 전환 — 왜? 어떤 문제?
> 관련: [[Load-Balancer|로드밸런서]], [[Docker|Docker]], [[Messaging-Patterns|메시징패턴]]

- 단일 EC2에서 Nginx+App 동시 구동 → 트래픽 급증 시 CPU/메모리 집중+배포 시 서비스 중단 위험
- CloudFront(정적 리소스 캐싱) + ALB(웹 트래픽) + NLB(IoT 디바이스 고정 IP 통신) + ECS Fargate(오토스케일링) + Rolling Update 무중단 배포
- IoT 디바이스의 IP 기반 통신 요구사항 때문에 NLB를 별도 구성
- 꼬리:
  - "ALB vs NLB 차이?" → ALB는 L7(HTTP/HTTPS, 경로 기반 라우팅), NLB는 L4(TCP/UDP, 고정 IP, 초저지연)
  - "Rolling Update vs Blue/Green?" → Rolling은 점진적 교체(리소스 절약), Blue/Green은 즉시 전환(빠른 롤백). 비용 고려해 Rolling 선택

#### Docker 이미지 43% 경량화 방법?
> 관련: [[Multi-Stage-Build|멀티스테이지빌드]]

- NestJS 이미지가 909MB(Spring 수준)로 비정상
- .dockerignore로 불필요 파일 제외 + 멀티스테이지 빌드(build stage → production stage에 필요 파일만 복사)
- 결과: 909MB → 513MB(43.6%), 배포 시간 3분10초 → 2분20초(26.3% 단축)
- ECR 저장 비용도 절감
- 꼬리:
  - "alpine 이미지로 더 줄일 수 있지 않나?" → 가능하지만 native 모듈 호환성 문제. musl libc vs glibc 차이
  - "더 최적화 방법?" → esbuild 번들러 사용, Docker layer 캐싱 최적화(자주 변경되는 레이어를 뒤에 배치)

#### Grafana/Prometheus/Loki — 무엇을 모니터링? 알림 기준?
> 관련: [[Incident-Detection-Logging|장애탐지·로깅]], [[Structured-Logging|구조화로깅]], [[Log-Pipeline|로그파이프라인]]

**왜 GPL 자체 호스팅?**
- 기존 CloudWatch+SNS+Lambda로는 메트릭 추적 부족. 가중치 기반 대안 비교 후 GPL 선택 (4.65점 / ELK 3.85 / Datadog 3.35 / CloudWatch 3.10)

**아키텍처 구성**
- Prometheus+Thanos(메트릭, S3 장기 보관) + Loki(로그, Promtail+FireLens) + Grafana(통합 시각화)
- TraceIdMiddleware+HttpLoggingInterceptor로 요청 단위 추적
- 메트릭 카디널리티 관리: route 정규화, userId/traceId를 라벨에 절대 포함하지 않음

**알림 기준 (SLO 기반)**
- Error rate 1% `for:5m`
- Slow SQL 500ms+ 3회 지속
- Event Loop Lag 100ms 3분 지속
- RDS CPU 75% 5분
- Replica Lag 5초 3분

**꼬리 질문 대비**
- "ELK 대신 Loki인 이유?" → ELK는 운영 복잡도와 비용이 큼. Loki는 인덱스 최소화 설계라 저장 비용 낮음
- "traceId를 라벨에 넣으면 왜 안 되나?" → 카디널리티 폭발 → Prometheus OOM. traceId는 로그 본문에 기록하고 LogQL로 검색
- "Prometheus pull 방식의 한계?" → 짧은 수명 컨테이너는 스크래핑 전 사라질 수 있음 → Pushgateway로 보완

### JD 기반 기술 질문

#### React 경험이 있나? 프론트엔드 어떻게 할 건가?

- **사이드 프로젝트 "출석부" (school-manage)** — React 19 + Vite + TypeScript 기반 풀스택 서비스를 직접 기획→설계→개발→운영. 30개 단체가 실제 사용 중인 프로덕션 앱
- **React 핵심 패턴 실전 적용 경험**:
  - **커스텀 훅 아키텍처**: 도메인별 훅 설계 (`useStudents`, `useAttendance`, `useGroups`, `useDashboardStatistics` 등). 각 훅이 CRUD + 필터링 + 페이지네이션 + 캐시 무효화를 캡슐화
  - **TanStack React Query + tRPC**: 서버 상태 관리. staleTime 5분, 조건부 쿼리(`enabled: !!groupId`), 뮤테이션 후 캐시 무효화(`utils.student.list.invalidate()`)
  - **Radix UI + Tailwind + CVA(shadcn/ui 패턴)**: 접근성 있는 헤드리스 UI 컴포넌트 + 유틸리티 CSS + class-variance-authority
  - **React Router DOM v6**: 클라이언트 사이드 라우팅, URL 기반 검색/필터 상태 동기화(`useSearchParams`)
  - **Context API 기반 인증**: `AuthProvider` + `useAuth()` 훅, 안전 체크(`throw new Error` if used outside provider)
  - **에러 바운더리**: 클래스 기반 `GlobalErrorBoundary` + 라우트 레벨 `RouteErrorFallback`
- **tRPC End-to-End 타입 안전성**: Prisma 스키마 → 백엔드 라우터 → 프론트엔드 훅까지 타입이 자동 전파. REST에서 tRPC로 전환하면서 서버/클라이언트 타입 불일치 문제를 원천 해결
- **실전 UX 패턴**: 3단계 온보딩 플로우, 벌크 작업(일괄 삭제/졸업/등록), Excel 임포트/엑스포트, 캘린더 기반 출석 인터페이스, 역할 기반 UI(관리자/게스트)
- **GA4 애널리틱스 통합**: 중앙화된 analytics 모듈로 가입/로그인/기능 사용 이벤트 추적
- 백엔드 API 설계 시 프론트엔드 협업 경험 있음 (시솔지주: Swagger 문서화 + 일관된 응답 포맷 설계)
- AI 도구(Claude Code)를 적극 활용해 빠르게 학습·구현 — 씨이랩 자체가 AX를 강조하는 회사
- 꼬리 대비:
  - "React 상태관리는 어떻게?" → 서버 상태는 React Query(tRPC), 클라이언트 상태는 Context API + useState. Redux/Zustand 같은 글로벌 상태 라이브러리 없이도 서버 상태와 클라이언트 상태를 명확히 분리하면 충분
  - "컴포넌트 설계 원칙?" → 기능 단위(Feature-Sliced) 폴더 구조. 각 도메인(auth, attendance, student, group)이 자체 hooks/components/utils 보유. 공통 UI만 shared로 분리
  - "성능 최적화 경험?" → React Query staleTime으로 불필요한 리페치 방지, 조건부 쿼리로 의존성 없는 fetch 차단. 랜딩 페이지 리디자인으로 이탈률 81.8%→12.5% 개선
  - "SSR/SSG 경험?" → 출석부는 SPA(Vite). SSR이 필요한 경우 Next.js 활용 가능하나 현재 프로젝트는 인증 기반 앱이라 SPA가 적합

#### Full Stack으로 일할 때 프론트/백 우선순위는?

- 기능 단위로 프론트→백 수직 슬라이싱 — 하나의 기능을 API 설계부터 UI까지 한 사람이 일관되게 구현
- 사용자 경험 관점에서 API 설계부터 UI까지 일관성 있게
- 실무: 출석부 프로젝트에서 기획→설계→개발→운영 전 과정 직접 담당, 30개 단체 실서비스 운영 중
- **모노레포 구조**: pnpm workspaces + Turborepo로 `apps/api`(Express+tRPC) + `apps/web`(Vite+React) + `packages/trpc`(공유 라우터) 구성. 프론트/백이 같은 타입을 공유하면서 독립 배포 가능
- 꼬리:
  - "프론트/백 중 어디가 강점?" → 백엔드가 강점이지만 프론트도 직접 프로덕션 서비스를 운영한 경험이 있어 양쪽 모두 기여 가능. 처음에는 백엔드 비중이 높겠지만 점진적으로 풀스택으로 영역 확장
  - "모노레포 장단점?" → 장점: 타입 공유, 의존성 일원 관리, 원자적 커밋. 단점: 빌드 시간 증가, CI 설정 복잡도. Turborepo 캐싱으로 빌드 시간 완화

#### tRPC를 왜 선택? REST와 비교하면?

- **문제**: REST API에서 프론트/백 간 타입 불일치가 런타임 에러로 이어지는 경험. 엔드포인트 변경 시 Swagger 문서 수동 갱신 필요
- **tRPC 선택 이유**: 
  - 코드 생성 없이 TypeScript 타입이 자동 전파 → 컴파일 타임에 API 변경 감지
  - React Query와 네이티브 통합 → 캐싱/리페치/뮤테이션 자동 관리
  - 모노레포에서 `@school/trpc` 패키지로 라우터 정의를 공유 → 프론트에서 `trpc.student.list.useQuery()` 형태로 타입세이프 호출
- **REST 대비 트레이드오프**: tRPC는 TypeScript 모노레포 전용(외부 클라이언트에는 부적합). 외부 API 제공이 필요하면 REST/GraphQL 병행
- 꼬리:
  - "GraphQL과 비교하면?" → GraphQL은 스키마 정의+코드 생성 필요, 오버페칭 해결에 강점. tRPC는 TypeScript 프로젝트에서 가장 가볍게 E2E 타입 안전성 확보. 외부 클라이언트가 없으면 tRPC가 생산성 최고
  - "tRPC에서 인증/인가는?" → tRPC middleware에서 JWT 토큰 검증 → context에 사용자 정보 주입 → 각 procedure에서 context.user 참조

#### 사일런트 토큰 리프레시 어떻게 구현?

- tRPC 클라이언트 레벨에서 401 응답 인터셉트 → refresh token으로 새 access token 발급 → 원래 요청 재시도
- **핵심**: 동시 요청 시 refresh 중복 호출 방지 — 공유 Promise로 첫 번째 refresh만 실행, 나머지는 같은 Promise를 await
- access token은 sessionStorage, refresh token은 httpOnly cookie
- 꼬리:
  - "왜 sessionStorage?" → 탭 간 격리(보안), XSS 취약점은 있지만 httpOnly cookie는 CSRF 리스크. 트레이드오프 인지하고 선택. refresh token이 httpOnly cookie이므로 access token 탈취 시에도 재발급 차단 가능
  - "무한 루프 방지?" → refresh 실패 시(refresh token도 만료) 로그아웃 처리. refresh 요청 자체에는 인터셉터 미적용

#### DB 모델링 접근법? 정규화 vs 비정규화 기준?
> 관련: [[Index|인덱스]], [[SQL|SQL]]

- 도메인 모델 기반 설계 → 3NF 기본 → 조회 성능 필요 시 비정규화
- 실무: 시솔지주에서 MongoDB→MySQL 마이그레이션
  - MongoDB 스키마리스 구조를 MySQL 정규화 스키마로 재설계
  - 배치 프로세스로 100만 건 데이터 무중단 마이그레이션 도구 자체 개발
  - 데이터 정합성 검증 포함

#### AWS 클라우드 아키텍처 설계 경험?

- 시솔지주: AWS LightSail → EC2+RDS 전환
- 트라이포드랩: 단일 EC2 → CloudFront+ALB+NLB+ECS Fargate 아키텍처 직접 설계
- 고객사 On-Premise 마이그레이션: AWS 클라우드 → CentOS 7.1 환경으로 전환, Nginx 리버스 프록시+PM2 무중단 구성

#### 테스트 코드 어떻게 작성하나?
> 관련: [[Service-Layer-Testing|서비스레이어테스트]], [[Test-Fixture|테스트픽스처]], [[Test-Isolation|테스트격리]]

- 시솔지주: Mocha+Chai로 테스트 0→1 도입
  - SonarQube 웹 대시보드로 팀 전체 코드 품질 지표 공유
  - PR 연동하여 커버리지 60% 미달 시 머지 불가 → 최종 70% 달성
  - CBT 특성상 오발송 시 막대한 손실 가능해서 안정성 확보가 최우선
- 트라이포드랩: jest+supertest
  - 발주 자동화 Batch에서 스케줄링과 핵심 비즈니스 로직 분리하여 독립적으로 검증 가능하게 설계
- 꼬리: 유닛(서비스 로직) → 통합(API 엔드포인트) → E2E 순서로 피라미드 구조 지향

#### AI 도구를 업무에 어떻게 활용하나?

- Claude Code를 일상적으로 사용
- 코드 작성, 리뷰, 디버깅, 문서화에 활용
- 면접 준비 문서 자체도 Claude Code 스킬로 자동 생성하는 시스템 구축
- 출석부 프로젝트에서 AI 기반 Spec-Driven Development 워크플로우 도입으로 생산성 향상
- 씨이랩의 AX 방향과 직접 일치

#### DRI로 일한 경험? 문제 정의부터 해결까지 주도한 사례?

- **Prisma 성능 문제**: 로그 분석으로 4개 개별쿼리 직접 발견 → 공식 문서 검토 → relationLoadStrategy 적용 → 82~90% 성능 개선. 하코 3000명 커뮤니티에서 이 주제로 발표
- **모니터링 인프라**: CloudWatch 한계(쿼리 성능, 비용) 직접 분석 → Datadog/NewRelic/ELK 대안 비교 → GPL 스택 자체 호스팅 결정 → 직접 구축. SLO 기반 경보 체계 정착
- **FIDO 서버**: 담당 개발자 퇴사 후 팀 리드 직접 맡음 → 3개월 내 FIDO Spec 처음부터 학습 → 인증 통과. 오픈소스 라이브러리 규격 미준수 발견 → GitHub 이슈 생성으로 커뮤니티 기여

### 서비스 맥락 질문

#### CCTV 영상분석 서비스에서 실시간 데이터를 웹에 보여줘야 한다면?

- WebSocket/SSE로 실시간 스트리밍, 대시보드 React 컴포넌트 설계
- 대량 이벤트는 백엔드에서 집계 후 전송 — 클라이언트 부하 최소화
- 실무 연결: 트라이포드랩에서 IoT 디바이스 실시간 데이터 수신 처리 경험 (디바이스 타임아웃 1초, 전송 주기 4시간)
- 꼬리: "이벤트가 너무 많으면?" → 백엔드에서 시간 윈도우 기반 집계, 클라이언트에는 변경분만 전송

#### 제조 공정 QA/QC 데이터를 대시보드로 제공한다면 설계는?

- 시계열 데이터 → 배치 집계 + 실시간 알림 분리
- 대시보드는 집계 데이터 조회(Read Replica 활용), 이상 감지 시 실시간 알림
- 실무 연결: 트라이포드랩에서 Read Replica 도입으로 조회 40% 향상, DB CPU 30% 감소한 경험 동일 패턴

#### 고객사마다 다른 요구사항을 하나의 제품으로 대응하려면?

- 클린 아키텍처 기반 모듈 분리 경험 활용
  - Controller → UseCase → DomainService → Repository 계층 분리
  - 도메인 로직은 공유, 고객사별 커스텀은 UseCase 레벨에서 분기
- 실무 연결: 트라이포드랩에서 대형 고객사(제약바이오 280억, F&B 2000억) PoC 시 동일 구조로 유연하게 대응

#### AI 모델 결과를 사용자에게 보여주는 UI/UX를 설계한다면?

- 비동기 Job 패턴: 요청 접수(즉시 jobId 반환) → 큐 → 워커(AI 처리) → 완료 알림
- Job 테이블: status(pending→processing→done/failed), progress(%), error_message
- 상태 알림: 초기엔 폴링, 트래픽 커지면 WebSocket 전환
- 실무 연결: 발주 자동화에서 동일 비동기 처리 패턴 (EventBridge → SQS → 워커)

#### 서비스 장애 시 대응 프로세스?

- 실제 경험 기반:
  1. Grafana Alerting이 Slack/팀별 라우팅으로 자동 알림 (Error rate 1% `for:5m`, Event Loop Lag 100ms 3분 등 SLO 기반 임계값)
  2. 대시보드에서 영향 범위 파악 — TraceId로 요청 단위 로그+메트릭 연계 조회
  3. 롤백(ECS Rolling Update 이전 태스크로 복귀) or 핫픽스 판단
  4. 근본 원인 분석 — Loki 로그+Prometheus 메트릭 교차 분석
  5. 재발 방지 — 알림 임계값 조정, 테스트 케이스 추가, 포스트모템 공유

### 컬처핏 / 소프트스킬 질문

- [ ] 장단점 — [[FIT#본인의 장단점|FIT]] 실행력/성급함
- [ ] 동료 갈등 — [[FIT|FIT]] 참고
- [ ] 기획자 충돌 — [[FIT#기획자와 의견 충돌 사례|FIT]] 참고
- [ ] 긴급 이슈 판단 — [[FIT#긴급 이슈 동시 발생 시 판단 기준|FIT]] 비즈니스 임팩트 기준
- [ ] 성장 목표 — [[FIT#장기적으로 어떤 개발자가 되고 싶은가요?|FIT]] 개발 리드 → CTO
- [ ] **추가**: "새로운 기술(React 등)을 어떻게 학습하나?" → AI 도구 활용 + 공식 문서 + 작은 프로젝트로 빠르게 실전 적용
- [ ] **추가**: "AI 도구를 활용한 구체적 경험은?" → Claude Code로 코드 작성·리뷰·디버깅, 커스텀 스킬/훅/MCP 서버 구축으로 개발 워크플로우 자동화

---

## 4. 역질문 (나 → 면접관)

### 기술/아키텍처
1. **"현재 제품의 기술 스택이 어떻게 구성되어 있나요? 프론트엔드와 백엔드 비중은?"** — 온보딩 계획 수립
2. **"X-AIVA, Xniper 등 제품별로 팀이 나뉘어져 있나요, 하나의 팀이 여러 제품을 담당하나요?"** — 업무 범위 파악
3. **"AI 모델 팀과 Product Engineer 사이의 협업은 어떻게 이루어지나요?"** — AI 도메인 이해도 + 협업 방식
4. **"Claude Code 외에 팀에서 활용하는 AI 도구가 더 있나요?"** — AX 문화 깊이 파악 + 관심 어필

### 팀/조직
5. **"R&D Group의 팀 규모와 구성이 어떻게 되나요?"** — 포지션과 성장 환경
6. **"코드 리뷰 프로세스와 배포 주기는?"** — 개발 문화
7. **"DRI 문화에서 과제의 범위와 책임은 어떻게 정해지나요?"** — 실제 운영 방식

### 성장/기대치
8. **"이 포지션에서 초기 3개월간 기대하는 역할과 성과는?"** — 현실적 기대치
9. **"Product Engineer로서 장기적으로 어떤 성장 경로가 가능한가요?"** — 커리어 방향
10. **"현재 팀에서 가장 시급한 기술적 챌린지는?"** — 입사 후 기여 포인트 파악

---

## 5. 면접 준비 체크리스트

### 보강이 필요한 기술 영역

**프론트엔드 (React) — 출석부 프로젝트 기반**

| 영역 | 관련 문서 | 복습 완료 |
|------|---------|----------|
| React 커스텀 훅 패턴 (useStudents, useAttendance 등 도메인 훅 설계) | 출석부 소스 | [ ] |
| React Query + tRPC (서버 상태 관리, 캐시 무효화, 조건부 쿼리) | 출석부 소스 | [ ] |
| tRPC E2E 타입 안전성 (모노레포 타입 공유, REST→tRPC 전환 이유) | 출석부 소스 | [ ] |
| 인증 흐름 (Context 기반 AuthProvider, 사일런트 토큰 리프레시, 중복 방지) | 출석부 소스 | [ ] |
| 컴포넌트 설계 (Feature-Sliced 구조, Radix UI + Tailwind + CVA) | 출석부 소스 | [ ] |
| 에러 처리 (GlobalErrorBoundary, RouteErrorFallback) | 출석부 소스 | [ ] |
| React Router DOM v6 (URL 기반 필터/검색 상태 동기화) | 출석부 소스 | [ ] |

**DB / 성능 최적화**

| 영역 | 관련 문서 | 복습 완료 |
|------|---------|----------|
| 트랜잭션/격리수준 (RR vs RC, gap lock, Phantom Read) | [[Transactions\|트랜잭션]], [[Isolation-Level\|격리수준]] | [ ] |
| 인덱스/실행계획 (카디널리티, 선택도, 커버링, 복합 인덱스) | [[Index\|인덱스]], [[Execution-Plan\|실행계획]] | [ ] |
| DB 모델링·정규화 (3NF, 비정규화 기준) | [[Index\|인덱스]], [[SQL\|SQL]] | [ ] |
| Prisma ORM 심화 (app-level join, relationLoadStrategy) | [[ORM\|ORM]] | [ ] |

**아키텍처 / 설계 패턴**

| 영역 | 관련 문서 | 복습 완료 |
|------|---------|----------|
| 클린 아키텍처 (Controller→UseCase→DomainService→Repository) | (외부 자료) | [ ] |
| 비동기 처리 패턴 (큐+워커+알림, DLQ, 멱등성) | [[Messaging-Patterns\|메시징패턴]], [[Delivery-Semantics\|전달보장]], [[Idempotency-Key\|멱등성]] | [ ] |

**NestJS / Node.js**

| 영역 | 관련 문서 | 복습 완료 |
|------|---------|----------|
| NestJS 심화 (DI/IoC 컨테이너, 모듈, 라이프사이클) | [[NestJS\|NestJS]], [[Request-Lifecycle\|요청라이프사이클]] | [ ] |
| Node.js 이벤트 루프/libuv | [[Event-Loop\|이벤트루프]], [[libuv\|libuv]], [[Thread-vs-Event-Loop\|스레드vs이벤트루프]] | [ ] |
| Node.js 비동기 프로그래밍 심화 | [[Async-Programming\|비동기프로그래밍]], [[Async-Internals\|비동기내부구조]] | [ ] |

**인프라 / DevOps**

| 영역 | 관련 문서 | 복습 완료 |
|------|---------|----------|
| Docker 멀티스테이지 빌드 / .dockerignore 최적화 | [[Multi-Stage-Build\|멀티스테이지빌드]] | [ ] |
| 모니터링 (Prometheus+Thanos, Loki, Grafana Alerting, SLO 기반 경보) | [[Incident-Detection-Logging\|장애탐지·로깅]], [[Log-Pipeline\|로그파이프라인]] | [ ] |

**테스트 / 품질**

| 영역 | 관련 문서 | 복습 완료 |
|------|---------|----------|
| 테스트 전략 (피라미드, 유닛→통합→E2E, SonarQube 커버리지 관리) | [[Service-Layer-Testing\|서비스레이어테스트]], [[Test-Fixture\|픽스처]], [[Test-Isolation\|격리]] | [ ] |

### 과제 대비
> 1차 면접에 과제가 포함됨 — Full Stack 과제일 가능성 높음

- [ ] 출석부 프로젝트 코드 리뷰 — 면접에서 설명할 수 있도록 핵심 패턴 정리 (tRPC 설정, 커스텀 훅, 인증 흐름)
- [ ] React + Vite + TypeScript 프로젝트 빠른 셋업 연습 (10분 이내)
- [ ] React ↔ Express/NestJS API 연동 CRUD 빠르게 구현하는 연습
- [ ] AI 도구(Claude Code) 활용한 프론트엔드 개발 연습
- [ ] Radix UI + Tailwind 컴포넌트 빠르게 조합하는 연습

### 강하게 어필할 포인트
1. **Node.js(NestJS) + MySQL** — JD 자격요건과 정확히 일치
2. **React 프로덕션 경험** — 사이드 프로젝트 출석부를 React 19 + tRPC로 직접 개발·운영, 30개 단체 실서비스. 커스텀 훅 아키텍처, 서버 상태 관리, 인증 흐름, GA4 통합까지 프론트엔드 전 영역 경험
3. **DRI 경험** — Prisma 성능 문제 로그 분석→공식 문서 검토→82~90% 개선, 하코 3000명 커뮤니티 발표. 모니터링 인프라 필요성 제기→GPL 스택 직접 구축
4. **제품 전 과정 참여** — PMF → 대형 고객사(제약바이오 280억, F&B 2000억) PoC 성공 → 운영 최적화 (우대사항과 직접 연결)
5. **정량적 성과** — 슬로우쿼리 99.3%(15.4ms→0.1ms), API 82~90% 향상, Docker 43.6%(909→513MB), 배포 26.3% 단축, 재고관리 95.8% 절감, 발주 완전 자동화
6. **인프라·모니터링** — 단일 EC2→ALB+NLB+ECS Fargate 직접 설계, Read Replica(조회 40%↑, CPU 30%↓), SLO 기반 경보 7개 지표 체계 구축
7. **AI 도구 활용** — Claude Code 일상적 사용, 커스텀 스킬/훅/MCP 서버 구축, AI 기반 Spec-Driven Development 워크플로우 도입 (씨이랩 AX 문화와 직접 연결)
8. **FIDO 서버 팀 리드** — 담당자 퇴사 후 3개월 내 팀 리드+인증 통과. 오픈소스 규격 미준수 발견→커뮤니티 기여. 주도적 문제해결+빠른 학습 능력 증명
9. **커뮤니티 기여** — 하코 3000명 발표, 카카오테크 캠퍼스 백엔드 멘토, FIDO 오픈소스 이슈 생성

### 주의사항
> [[FIT#면접 현장 주의사항|면접 현장 주의사항]] 참고

- **React 경험을 자신감 있게 어필** → 출석부 프로젝트가 30개 단체 실서비스 운영 중인 프로덕션 앱임을 강조. "사이드 프로젝트"라는 단어만으로 끝내지 말고 구체적 기술(React 19, tRPC, React Query, 모노레포)과 규모(30개 단체) 언급
- **Full Stack 지원이므로 프론트/백 균형 있게 어필** → 백엔드 강점 + 프론트엔드 실전 경험을 모두 보여주기. "백엔드만 잘한다"로 들리지 않도록
- **"성급함" 단점 → 기술적 실행 판단 예시로 한정** (이썸테크 6개월 퇴사와 연결하지 않기)
- **CTO 목표 → "권한"이 아니라 "영향력"과 "기여의 크기"로 표현**
- **DRI 문화 어필 시 구체적 사례로** → "주도적입니다"가 아니라 "이런 문제를 발견하고 이렇게 해결했습니다"
- **1차는 과제+실무 면접** — 기술 답변과 실제 코딩 역량에 집중
