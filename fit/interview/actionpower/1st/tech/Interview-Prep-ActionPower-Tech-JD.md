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
- API 문서와 일관된 응답 포맷으로 프런트엔드와의 계약을 명확히 한다.
- 꼬리:
  - "PATCH vs PUT?" → PUT은 대상 리소스의 교체 표현을 보내고, PATCH는 부분 변경을 보낸다. PUT에서 생략한 필드를 어떻게 처리할지는 해당 API 계약에 달려 있다.
  - "페이지네이션 방식?" → offset 기반은 단순하지만 깊은 페이지에서 느려질 수 있다. cursor 기반은 마지막 조회 키를 기준으로 다음 페이지를 가져와 성능을 안정적으로 유지한다.
  - "멱등성이 중요한 이유?" → 네트워크 실패로 재요청 시 동일 결과 보장. GET/PUT/DELETE는 기본적으로 멱등, POST는 아님 → 멱등성 키(Idempotency-Key 헤더)로 해결

### 캐시 전략? Redis를 어디에? 무효화는?
> 관련: [[Cache-Strategies|캐시전략]], [[Cache-Invalidation|캐시무효화]], [[Cache-Stampede|캐시스탬피드]]

- Cache-Aside 패턴 기본
- 자주 바뀌지 않는 외부 메타데이터는 적절한 갱신 정책과 함께 캐시해 호출 지연과 의존성을 줄인다.
- 읽기 경로의 캐시 도입은 데이터 최신성, 무효화와 원본 저장소 부하를 함께 비교해 결정한다.
- 무효화: TTL을 안전망으로 두고 DB 커밋 뒤 캐시를 삭제하는 방식을 기본으로 검토. Write-Through는 쓰기 경로에서 캐시와 DB를 함께 갱신하는 별도 선택지
- 주의: 캐시-DB 불일치, 캐시 스탬피드(동시 만료 시 DB 과부하)
- 꼬리:
  - "캐시 스탬피드 해결법?" → TTL에 jitter 추가(동시 만료 방지) + 만료 전 백그라운드 갱신 + mutex lock으로 한 요청만 DB 조회 후 캐시 갱신
  - "Cache-Aside vs Write-Through?" → Cache-Aside: 읽기 시 캐시 미스면 DB 조회 후 캐시 적재. Write-Through: 쓰기 경로에서 캐시와 DB를 함께 갱신해 직후 미스와 오래된 값을 줄이지만, 두 저장소가 원자적으로 묶이지 않으면 부분 실패, 재시도와 순서 역전을 복구해야 함
  - "Redis가 죽으면?" → 캐시는 보조 계층이므로 DB로 fallback. 다만 갑자기 전체 트래픽이 DB로 몰리면 DB도 죽을 수 있음(캐시 아발란체) → DB 커넥션 풀 제한 + rate limiting으로 보호

### 트랜잭션 격리 수준? 데드락 경험?
> 관련: [[Isolation-Level|격리수준]], [[Transactions|트랜잭션]]

**InnoDB 격리 수준과 MVCC**
- MySQL InnoDB 기본 **REPEATABLE READ** — 기본 `START TRANSACTION`에서는 첫 consistent read 시 만든 스냅샷을 재사용하고, `WITH CONSISTENT SNAPSHOT`이면 시작 시점에 스냅샷을 만든다.
- MVCC(Multi-Version Concurrency Control): undo log에 이전 버전을 보관하여 읽기와 쓰기가 서로 차단하지 않음
- RR에서 Phantom Read 방지: InnoDB는 Next-Key Lock으로 범위 검색 시 새 행 삽입도 차단

**적용 원칙**
- 동시 상태 갱신에는 격리 수준과 `SELECT FOR UPDATE`(Current Read)의 조합을 검토해 정합성을 확보한다.
- 데드락은 완전히 예방할 수 없으므로, 위 DB Lock 섹션의 완화 전략(Lock 순서 통일, 트랜잭션 범위 최소화, NOWAIT)으로 발생 확률을 줄이고, InnoDB 자동 감지+복구에 의존

**꼬리 질문 대비**
- "RC vs RR 차이?" → RC는 consistent read 문장마다 새 스냅샷을 만들고, RR은 기본적으로 첫 consistent read의 스냅샷을 재사용한다. `WITH CONSISTENT SNAPSHOT` 예외도 함께 설명한다.
- "RR인데 왜 SELECT FOR UPDATE는 최신 데이터를 읽나?" → Consistent Read(일반 SELECT)는 스냅샷, Current Read(FOR UPDATE)는 최신 커밋 데이터. lock을 걸려면 최신 데이터를 봐야 의미가 있음
- "RR에서 RC로 바꾸면 뭐가 좋아지나?" → 일반 검색과 인덱스 스캔의 Gap Lock이 줄어 INSERT 동시성이 좋아질 수 있다. 다만 외래 키와 중복 키 검사에는 Gap Lock이 남고, 범위 재조회 결과가 바뀔 수 있다.

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
- Microtask: `Promise.then`, `process.nextTick` → **콜백 실행이 끝나는 경계마다** 큐가 빌 때까지 처리
- Macrotask: `setTimeout`, `setInterval`, `setImmediate`, I/O 콜백 → 이벤트 루프 각 단계에서 실행
- 같은 턴에서는 `process.nextTick` 콜백이 Promise 마이크로태스크보다 먼저 처리된다. `setTimeout`과 `setImmediate`의 순서는 호출 맥락에 따라 달라진다.
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

**AI 기능 백엔드에 적용할 때**
- AI 처리 자체는 외부 API나 전용 실행 환경에 맡기고, Node.js는 요청 접수, 작업 전달과 결과 통지 같은 I/O 조율에 집중하는 설계를 검토한다.
- 음성 디코딩이나 모델 추론처럼 CPU 집약적인 작업을 메인 스레드에서 직접 실행하지 않는다.

**꼬리 질문 대비**
- "setTimeout(fn, 0)과 setImmediate 차이?" → `setTimeout(fn, 0)`은 Timers 단계, `setImmediate`는 Check 단계에서 실행. I/O 콜백 안에서는 `setImmediate`가 항상 먼저, 최상위 스코프에서는 순서 비보장
- "Worker Threads vs child_process?" → Worker Threads는 같은 프로세스 내 메모리 공유 가능(SharedArrayBuffer), child_process는 별도 프로세스(IPC 통신 필요, 메모리 격리). CPU 연산은 Worker Threads, 완전 격리가 필요하면 child_process
- "Node.js 클러스터링은?" → `cluster` 모듈로 CPU 코어 수만큼 워커 프로세스를 fork해 각 워커가 독립적으로 이벤트 루프를 실행한다. 컨테이너 환경에서는 애플리케이션 복제와 오토스케일링을 함께 비교한다.
- "Node.js가 멀티코어를 활용 못한다는 건 맞나?" → 메인 스레드는 싱글 코어지만, libuv 스레드 풀 + Worker Threads + 클러스터링으로 멀티코어 활용 가능. 다만 아키텍처적으로는 컨테이너 수평 확장이 더 간단하고 관리하기 쉬움

### NestJS 모듈 설계? DI 원리? 순환 참조?
> 관련: [[NestJS|NestJS]], [[Custom-Provider|커스텀프로바이더]], [[Injection-Scopes|인젝션스코프]]

- 클린 아키텍처 참고하여 계층 분리:
  - Controller(Interface Adapters) → UseCase(Application Core) → DomainService(핵심 비즈니스) → Repository Interface → Prisma Client(External Infrastructure)
- UseCase별로 사용자 의도 분리(JSON Response용 vs 엑셀 다운로드용), 핵심 비즈니스 변경되어도 UseCase별 영향 최소화
- DI 원리: NestJS IoC 컨테이너가 Provider의 생성, 주입과 생명주기를 관리. 실제 Provider 등록은 `@Module({ providers: [...] })`에서 하고, `@Injectable()`은 컨테이너가 관리할 클래스임을 표시하고 생성자 주입에 필요한 메타데이터를 남김
- 순환 참조: forwardRef()로 해결하되 근본적으로는 모듈 의존 방향을 단방향으로 설계하는 것이 중요
- 모듈 간 의존은 exports로 명시적 공개
- 꼬리:
  - "Guard vs Middleware vs Interceptor 차이?" → Middleware(요청 전처리, Express 호환), Guard(인가/인증 체크, true/false 반환), Interceptor(요청, 응답 양쪽 변환, 로깅, 캐싱, 응답 포맷)
  - "Provider scope 종류?" → DEFAULT(싱글톤, 앱 생명주기), REQUEST(요청마다 생성, 테넌트별 컨텍스트에 유용), TRANSIENT(주입마다 새 인스턴스). 대부분 DEFAULT로 충분
  - "클린 아키텍처 도입 효과?" → UseCase 분리로 단일 도메인 로직 변경 시 영향 범위 최소화. 실제로 테넌트별 커스텀 요구를 UseCase 레벨에서만 분기해서 해결

### 새 관리형 클라우드 경험이 얕다면 어떻게 답할까?

- 컨테이너 실행, 관리형 데이터베이스, 메시징, 캐시와 접근 제어의 개념은 클라우드 제공자 사이에 전이된다.
- 특정 서비스 이름의 일대일 대응을 외우기보다, 실행 단위, 동시성, 네트워크, 권한, 관측과 비용 모델을 공식 문서로 확인한다.
- 새 클라우드에서는 작은 검증 환경으로 배포, 권한, 네트워킹과 관측의 기본 경로를 먼저 확인한다.
- 꼬리:
  - 요청 기반 실행 환경과 상시 컨테이너 실행 환경의 차이: 전자는 요청 기반 확장과 유휴 축소에, 후자는 장시간 작업과 연결 제어에 유리할 수 있다. 실제 워크로드와 제약을 기준으로 비교한다.
  - "온보딩은 어떻게 하나?" → 공식 문서와 작은 검증 환경으로 서비스 경계, 권한, 네트워킹, 배포와 관측을 순서대로 확인한다.

### 테스트 코드 어떻게 작성하나?
> 관련: [[Service-Layer-Testing|서비스레이어테스트]], [[Test-Fixture|테스트픽스처]], [[Test-Isolation|테스트격리]]

- 품질 게이트는 PR 흐름에서 자동 실행하고, 중요한 변경은 병합 전에 검증한다.
- 스케줄러와 핵심 비즈니스 로직을 분리하면 테스트에서 핵심 판단을 독립적으로 검증할 수 있다.
- 꼬리:
  - "테스트 피라미드?" → 유닛(서비스 로직, 빠르고 많이) → 통합(API 엔드포인트, 중간) → E2E(전체 플로우, 느리고 적게). 아래로 갈수록 빠르고 많아야 함
  - "모킹은 언제 쓰나?" → 외부 의존성(API, 알림 등)은 모킹하고, 핵심 비즈니스 로직은 실제 저장소와의 통합 검증도 함께 둔다. 스케줄링은 분리해 핵심 로직을 독립 테스트한다.
  - "커버리지 목표치 기준?" → 숫자 자체보다 비즈니스 크리티컬 경로의 커버리지가 중요하다. 품질 게이트는 실패 비용에 비례해 설계한다.

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
