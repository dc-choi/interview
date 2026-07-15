---
tags: [fit, interview, yunhoe]
status: done
category: "Interview - Fit"
company: "윤회주식회사 (CARE IDⓒ)"
aliases: ["Yunhoe 1st Tech Extra", "윤회 1차 기술 질문 보강"]
---

# 윤회 1차 본 미팅 — 예상 기술 질문 (보강, 안전망)

> 상위 TOC: [[Interview-Prep-Yunhoe-1st|윤회 1차 본 미팅 준비]]
> 핵심 도메인 매핑 질문은 [[Interview-Prep-Yunhoe-1st-Tech|예상 기술 질문 (메인)]] 참조.
> 본 문서는 **범용 백엔드 기초, 심화**의 안전망. 한 줄 답변 + 꼬리 대비 패턴 중심.

## 1. Node.js / V8 / 이벤트 루프

- **Q. 이벤트 루프 단계?** → 개념적으로 timers → pending callbacks → idle/prepare → poll → check(setImmediate) → close callbacks로 설명한다. Node.js 20(libuv 1.45.0)부터 timers는 poll 전후가 아니라 poll 뒤에서만 처리되므로, 이 목록을 고정된 반복 시작 순서로 암기하면 안 된다. Promise와 `queueMicrotask`는 각 JS 콜백이 끝나는 경계에서 처리된다.
  - **꼬리**: `setTimeout(0)`과 `setImmediate()`의 상대 순서는 실행 문맥에 따라 달라질 수 있다. CommonJS에서는 `process.nextTick` 큐가 Promise microtask보다 먼저지만 ESM 초기 평가는 이미 microtask 안에서 실행돼 상대 순서가 달라질 수 있다.
- **Q. CPU bound 작업 들어오면?** → 메인 스레드 블로킹 → Event Loop Lag↑ → 모든 요청 지연. 해법: **Worker Thread**(파일 단위 격리, 메시지 패싱), `child_process`(별도 V8), 큐로 외부 워커에 위임 (트라이포드랩 SQS 워커 패턴)
- **Q. 메모리 누수 의심되면?** → `--inspect` + Chrome DevTools 힙 스냅샷 3장 비교, `clinic.js`, `node --heap-prof`. 흔한 원인: 리스너 누수, 글로벌 캐시 무한 증가, Closure가 큰 객체 잡고 있음
- **꼬리 패턴**: "Event Loop Lag 어디서 보나?" → Prometheus `nodejs_eventloop_lag_seconds` (prom-client), Grafana 임계 100ms로 알림 — 트라이포드랩 실제 운영

## 2. NestJS 심화

- **Q. NestJS 요청 처리 파이프라인?** → Middleware → Guard → Interceptor(전) → Pipe → Controller → Interceptor(후) → ExceptionFilter
- **Q. DI Scope 3가지?** → DEFAULT(싱글톤), REQUEST(요청마다 새 인스턴스, tenant, user 컨텍스트), TRANSIENT(주입 지점마다). REQUEST는 성능 비용 있음
- **Q. Custom Decorator 언제?** → 컨트롤러에서 반복되는 메타데이터 추출(@User(), @Tenant()). `createParamDecorator` + `ExecutionContext`
- **Q. Module 순환 의존?** → `forwardRef()` 임시 처방, 근본은 도메인 경계 재설계. DI 그래프가 엉키면 보통 모듈 분리가 잘못된 신호
- **꼬리**: "Interceptor와 Middleware 차이?" → Middleware는 Express 레벨(req/res), Interceptor는 컨트롤러 메서드 단위 + RxJS 스트림 변환, 캐싱, 로깅에 강함

## 3. TypeScript

- **Q. `unknown` vs `any`?** → `any`는 타입 시스템 무력화, `unknown`은 사용 전 narrowing 강제. **외부 입력은 무조건 `unknown`** 후 zod/class-validator로 좁히기
- **Q. 자주 쓰는 유틸리티 타입?** → `Pick`, `Omit`, `Partial`, `Required`, `Record`, `ReturnType`, `Awaited`. DTO 파생에 `Omit<User, 'password'>` 패턴
- **Q. `as const` 효과?** → 리터럴 타입 고정 + 객체 readonly. switch discriminant에 유리
- **꼬리**: "런타임 검증은?" → TS 타입은 컴파일에만 존재. zod/io-ts로 런타임 스키마 검증 — 외부 API, 환경변수, 요청 바디에 필수

## 4. HTTP / REST / 네트워크

- **Q. REST의 멱등성?** → GET/PUT/DELETE는 멱등, POST는 비멱등. 결제, 발급 같은 비멱등 작업엔 **Idempotency-Key 헤더** + 서버 측 키 저장(Redis TTL)
- **Q. 401 vs 403?** → 401 인증 실패(로그인 필요), 403 인증은 됐는데 권한 없음. 두 개 헷갈리면 클라이언트 로직(재로그인 vs 에러 표시)이 깨짐
- **Q. CORS preflight 트리거?** → 비단순 메서드(PUT/DELETE/PATCH), 커스텀 헤더, JSON Content-Type 등. OPTIONS 요청에 `Access-Control-Allow-*` 응답 필요
- **Q. HTTPS 핸드셰이크 압축 설명?** → TCP 3-way → TLS ClientHello → 인증서 검증 → 키 교환(ECDHE) → 세션 키 생성 → 암호화 통신. TLS 1.3은 1-RTT, Session Resumption은 0-RTT 가능
- **꼬리**: "REST vs GraphQL vs gRPC?" → CRUD, 캐시 친화 → REST / 다양한 클라이언트, 오버패칭 회피 → GraphQL / 내부 마이크로서비스, 저지연 → gRPC. **윤회처럼 외부 표준, 파트너 연동이 핵심이면 REST가 합리**

## 5. 인증 / 보안

- **Q. JWT vs 세션 트레이드오프?** → JWT는 무상태, 수평 확장 쉬움, 로그아웃 어려움(블랙리스트 필요), 세션은 서버 상태, 즉시 무효화 가능. **금융, 민감 작업엔 세션 + Redis가 안전**
- **Q. OAuth 2.0 + OIDC?** → OAuth는 **인가**(타사 리소스 접근), OIDC는 그 위에 **인증**(누군지) + ID Token. SaaS B2B면 OIDC + SAML 둘 다 고객사 요구
- **Q. RBAC vs ABAC?** → Role-Based는 단순, 관리 편함, Attribute-Based는 (테넌트, 시간, 리소스 속성)으로 세밀. DPP는 actor 단계(브랜드/공장/재활용업체)+자원 단계 검증 필요 → ABAC 친화
- **Q. CSRF 방어?** → SameSite=Lax/Strict 쿠키, CSRF 토큰, Origin/Referer 검증. SPA + JWT in Authorization 헤더 패턴이면 CSRF 자체가 약함
- **Q. FIDO/패스키 한 줄?** → 도메인 바인딩된 비대칭 키 인증, **phishing-resistant**. 비밀번호 + OTP 대체. 본인 보안학과, FIDO 경험 어필 — DPP B2B 어드민 콘솔에 적합

## 6. RDBMS 심화

- **Q. 격리 수준 4개와 현상?** → READ UNCOMMITTED(dirty read) / READ COMMITTED(non-repeatable read) / REPEATABLE READ(phantom read, MySQL 기본) / SERIALIZABLE. MySQL InnoDB의 RR은 갭락으로 phantom도 대부분 막음
- **Q. MVCC 원리?** → 각 트랜잭션이 자기 스냅샷(version)을 봄. 읽기-쓰기가 서로 안 막힘. 단점: undo log 누적, long transaction이 vacuum/purge 막음
- **Q. B+Tree 인덱스 vs Hash?** → B+Tree는 범위 쿼리, 정렬에 강함(대부분 DB 기본), Hash는 정확 매칭만 빠름(MySQL MEMORY, PG Hash Index). 시계열, 범위 조회 많은 DPP는 B+Tree가 정답
- **Q. 정규화 vs 비정규화?** → 쓰기, 일관성 우선 정규화, 읽기, 집계 우선 비정규화. 멀티테넌트 SaaS에서 자주 쓰는 집계는 별도 read model로 비정규화
- **Q. 파티셔닝 vs 샤딩?** → 파티셔닝은 한 DB 안에서 테이블 분할(시간/해시/리스트), 샤딩은 DB 인스턴스 분리. 파티셔닝은 운영 단순, 관리 편함이 강점
- **꼬리**: "PG와 MySQL 큰 차이?" → MVCC 구현(PG는 dead tuple + VACUUM, MySQL은 undo log), 인덱스 다양성(PG가 GIN/GiST/BRIN 등 풍부), JSONB(PG가 강함), CTE/Window 함수(PG가 우위) — **DPP처럼 시계열, 반정형 데이터면 PG 친화**

## 7. 트랜잭션 패턴

- **Q. 분산 트랜잭션 왜 어렵나?** → 2PC는 코디네이터 장애, 블로킹, 성능 이슈. 실무는 **Saga + 보상 트랜잭션** 또는 **Outbox 패턴**으로 결과적 일관성
- **Q. Outbox 패턴?** → DB 트랜잭션 안에 도메인 변경 + outbox 테이블 INSERT를 **같이 커밋** → 별도 publisher가 outbox를 폴링/CDC해서 이벤트 발행. **"DB 저장은 됐는데 이벤트는 안 갔다" 사고 방지**
- **Q. Saga 두 가지 스타일?** → Choreography(각 서비스가 이벤트 듣고 자기 단계 수행) vs Orchestration(중앙 코디네이터가 호출 순서 통제). 단계 적으면 코레오, 복잡하면 오케스트레이션
- **꼬리**: "Outbox vs Transactional Messaging?" → Kafka Transactions처럼 native가 있어도, **DB와 브로커가 다른 시스템**이면 Outbox가 가장 보편적 안전망

## 8. Redis / 캐시

- **Q. Cache-aside vs Write-through vs Write-behind?** → Cache-aside(app이 직접 read/write, 일관성 위험), Write-through(쓰기 시 캐시, DB 같이, 안전, 느림), Write-behind(쓰기 캐시 우선, 지연 동기화). 대부분 Cache-aside + TTL이 시작점
- **Q. 캐시 무효화 어떻게?** → ① TTL ② 명시적 invalidate (쓰기 후 키 삭제) ③ 버전 키 (`v:42:user:1`). **"캐시 무효화는 컴퓨터 과학에서 가장 어려운 2가지 중 하나"** — 도메인별 무효화 전략 명문화 필요
- **Q. 캐시 스탬피드?** → 인기 키 만료 직후 동시 미스 → DB로 폭주. 해법: **싱글플라이트**(첫 요청만 DB, 나머지 대기), **확률적 조기 갱신**, 짧은 분산 락
- **Q. Redis 자료구조 활용?** → String(카운터, 캐시), Hash(객체), Sorted Set(랭킹, 시간 기반 큐), Stream(이벤트), HyperLogLog(고유수 추정), Bitmap(출석/플래그)
- **꼬리**: "Redis 단일 인스턴스 한계?" → 메모리, 단일 스레드 — Cluster로 샤딩(슬롯 16384), Sentinel로 HA. 멀티테넌트면 키 prefix로 논리 격리

## 9. 테스트 / CI/CD / 관측성

- **Q. 테스트 피라미드?** → 단위(많이, 빠름) > 통합(DB, MQ 같이) > E2E(적게, 느림). 본인은 시솔지주에서 PR 게이트 커버리지 60%로 머지 차단 — **숫자보다 게이트가 정착이 어려운 부분**이라는 점 어필
- **Q. 실 DB로 테스트?** → testcontainers(Postgres/MySQL/Redis 컨테이너) 또는 docker-compose. 트랜잭션 롤백 패턴(`BEGIN ... ROLLBACK`)으로 격리, 속도 동시 확보. **본인의 입사 후 6개월 도입 항목 중 하나**
- **Q. 무중단 배포 방식?** → Rolling(ECS 기본, 단순), Blue-Green(두 환경 swap, 즉시 롤백), Canary(소수 트래픽 → 점진 확대). DB 마이그레이션은 backward-compatible 단계로 분해 (Expand-Migrate-Contract)
- **Q. 관측성 3축?** → Metrics(집계, RED/USE) / Logs(이벤트, 구조화 JSON) / Traces(요청 흐름, OpenTelemetry). **TraceId로 3축 연결**이 핵심 — 트라이포드랩 Grafana/Prometheus/Loki 스택에서 실제 운영
- **꼬리**: "RED vs USE?" → RED(Rate/Errors/Duration, 요청 기반 서비스) / USE(Utilization/Saturation/Errors, 리소스 기반). API 서버는 RED, DB, 큐는 USE

## 10. 시스템 디자인 즉석 (대표가 던질 만한 화이트보드 질문)

> 답변 구조 통일: **요구사항 정리 → 트래픽, 데이터 추정 → 핵심 컴포넌트 → 정합성, 확장성 트레이드오프 → 운영 고려**

- **Q. "DPP QR을 매장 직원이 1초에 1000건 스캔. 검증 API 설계?"**
  - 요구: P99 200ms, 위변조 차단
  - 컴포넌트: API Gateway → 인증(테넌트 키) → 서명 검증(in-process 비대칭 키) → Redis 캐시(최근 검증 결과) → DB(원장)
  - 트레이드오프: 서명만 검증하면 stateless, 빠름 vs DB 조회까지 하면 폐기, 정지 상태 반영 가능. 보통 **서명 + 짧은 TTL Redis** 조합
- **Q. "브랜드사 100개가 각자 100만 제품 발급. 발급 큐 설계?"**
  - 테넌트별 SQS FIFO + MessageGroupId(tenantId) → 워커 풀(테넌트별 동시성 상한)
  - noisy neighbor 방지: 테넌트별 rate limit + 우선순위 큐
- **Q. "재고 이벤트가 분당 10만 건. 분석 대시보드 어떻게?"**
  - OLTP는 핫 데이터만 유지 → CDC(Debezium) → Kafka/Kinesis → 분석 스토어(ClickHouse/Snowflake)
  - 대시보드는 분석 스토어에 직접 쿼리. OLTP에 분석 쿼리 절대 금지

## 답변 룰 (대표 직접 면접 톤)

1. **결론 먼저 한 줄** → 근거, 트레이드오프 → 실무 사례 한 줄 (트라이포드랩 / 시솔지주 / FIDO)
2. **모르면 "모릅니다 + 인접 지식 + 어떻게 빠르게 알아낼지"** — 추측 금지. 본 미팅은 신뢰가 검증되는 자리
3. **"왜 그 선택?"이 항상 따라옴** — 대안과 트레이드오프를 함께 말하기 (예: SQS vs Kafka vs SNS 비교 한 줄)
4. **도메인으로 끌어오기** — 어떤 질문이든 마지막에 "CARE ID에서는 ~로 매핑됩니다" 한 줄로 닫으면 가산점

## 관련 문서

- [[Interview-Prep-Yunhoe-1st|1차 본 미팅 TOC]]
- [[Interview-Prep-Yunhoe-1st-FIT|JD 매칭 & FIT 답변]]
- [[Interview-Prep-Yunhoe-1st-Tech|예상 기술 질문 (메인 — 도메인 매핑 깊이)]]
- [[Interview-Prep-Yunhoe-1st-Lead-Questions|백엔드 리드, 컬처핏, 역질문, 체크리스트]]
- [[My-Tech-Cards|마스터 기술 카드 8개 + vault 카테고리 인덱스]] — 답변 보강 시 마스터로 가서 vault 서치

## 출처

- [The Node.js Event Loop — Node.js 공식 문서](https://nodejs.org/learn/asynchronous-work/event-loop-timers-and-nexttick)
- [Process: queueMicrotask와 process.nextTick — Node.js 공식 문서](https://nodejs.org/api/process.html#when-to-use-queuemicrotask-vs-processnexttick)
