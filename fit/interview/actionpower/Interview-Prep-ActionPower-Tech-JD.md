---
tags: [fit, interview, actionpower]
status: done
category: "Interview - Fit"
aliases: ["ActionPower JD 기반 기술 질문", "액션파워 JD 기술 질문"]
---
# 액션파워 1차 — JD 기반 기술 질문

> 상위 TOC: [[Interview-Prep-ActionPower|액션파워 1차 면접 준비]]

---

### RESTful API 설계 원칙? 버전 관리, 에러 핸들링?
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

### 캐시 전략? Redis를 어디에? 무효화는?
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

### 트랜잭션 격리 수준? 데드락 경험?
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

### Node.js 이벤트 루프? 싱글 스레드인데 어떻게 동시 처리?
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

### NestJS 모듈 설계? DI 원리? 순환 참조?
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

### GCP 경험 없는데 괜찮나?

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

### 테스트 코드 어떻게 작성하나?
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

---

## 관련 문서
- [[Interview-Prep-ActionPower|1차 면접 TOC]]
- [[Interview-Prep-ActionPower-JD|JD 분석 & FIT 답변]]
- [[Interview-Prep-ActionPower-Tech-Resume1|이력서 기술 질문 1]]
- [[Interview-Prep-ActionPower-Tech-Resume2|이력서 기술 질문 2]]
- [[Interview-Prep-ActionPower-Tech-Resume3|이력서 기술 질문 3]]
- [[Interview-Prep-ActionPower-Tech-Resume4|이력서 기술 질문 4]]
- [[Interview-Prep-ActionPower-Service|서비스 맥락 + 컬처핏 + 역질문]]
- [[Interview-Prep-ActionPower-Checklist|면접 준비 체크리스트]]
