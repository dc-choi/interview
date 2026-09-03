---
tags: [nodejs, production, reliability, checklist]
status: done
verified_at: 2026-08-26
category: "OS & Runtime - Node.js"
aliases: ["Node.js Production Readiness", "Node.js 프로덕션 체크리스트"]
---

# Node.js 프로덕션 운영 체크리스트

Node.js로 서비스를 띄우는 것과 **운영 중에 안정적으로 버티는 것**은 다른 문제다. 단순 실행에서 안정적 운영으로 넘어가려면 6가지 축을 챙겨야 한다. 각 축은 별도 심화 문서로 분기되며, 이 문서는 **Node.js 특화 관점의 통합 체크리스트**다.

## Node.js 적합성 먼저 판단

모든 워크로드에 Node.js가 맞는 건 아니다. 먼저 확인:

### 적합
- **I/O 중심** — 많은 DB, API 호출, 파일 처리
- **I/O 대기 비중이 높은 웹 요청** — REST API, gateway, BFF
- **실시간 소켓** — 채팅, 알림, 이벤트 푸시
- **SPA 백엔드** — 인증, 라우팅, 집계

### 부적합
- **메인 이벤트 루프에서 직접 수행하는 CPU 집약 연산** — 복잡한 알고리즘, 대용량 이미지, 영상 처리
- **물리 계산처럼 CPU 작업을 같은 루프에 둔 실시간 게임 서버**
- **CPU를 오래 점유하는 정규식과 대량 파싱**
- **Worker Threads나 별도 서비스 없이 수행하는 대규모 병렬 계산**

부적합 영역은 **워커 스레드, 네이티브 모듈, 별도 서비스(Go, Rust, C++)** 로 분리. 메인 Node.js는 I/O 파이프라인에 집중.

## 6대 운영 축

### 1. 충분한 테스트

- 유닛 테스트는 **Use Case, 순수 함수**에 집중
- 통합 테스트는 **Testcontainers**로 실제 DB, Redis 띄워서 ([[TestContainers-Integration]])
- **비동기 타이밍 테스트** — Promise, Event Loop, setTimeout 순서를 제대로 검증
- CI에서 **매 PR 테스트 통과 의무** ([[Development-Workflow]])

Node.js 특유 함정:
- `await` 누락으로 조용히 실패하는 테스트 (반환값이 `Promise`라 테스트가 먼저 끝남)
- `jest.useFakeTimers()` 필요한 케이스 (타이머 기반 로직)
- Unhandled Promise Rejection이 테스트 프로세스에 누적

### 2. 빌드, 품질 관리

- **린트, 포맷**: ESLint + Prettier, CI에서 검사
- **타입 강제**: TypeScript `strict: true`, `noImplicitAny`
- **의존성 관리**: lock 파일 커밋, 취약점 스캔(Dependabot, Snyk) ([[Dependency-Management]])
- **빌드 아티팩트**: 동일 해시로 모든 환경에 배포 (12-Factor)

Node.js 특유:
- `node_modules` 크기 폭증 관리 (`npm prune --omit=dev`)
- Native 모듈(bcrypt, sharp) 크로스 플랫폼 빌드 주의
- `pnpm`, `yarn berry`로 디스크, 설치 속도 최적화

### 3. 수평 확장 가능한 구조 (Stateless)

일반 JavaScript callback은 한 프로세스의 main event loop thread에서 실행되므로 CPU-bound JavaScript를 그대로 두면 여러 코어에서 병렬 실행되지 않는다. 작업 특성에 따라 Worker Threads로 계산을 위임하거나, Cluster와 여러 container로 요청을 분산한다. 일부 내장 비동기 API는 libuv worker pool을 사용하므로 프로세스 전체가 항상 코어 하나만 쓰는 것은 아니다.

- **Stateless 설계** — 세션, 임시 상태는 Redis, DB에 ([[Scale-Up-vs-Out]])
- **Cluster 모듈 또는 PM2 cluster mode** — 멀티 코어 활용
- **무상태 컨테이너** — Kubernetes, ECS로 여러 인스턴스 배포
- **세션 공유** — Redis 세션 스토어

### 4. 서버 자동화 (배포, 기동)

수동 SSH 배포는 재현성과 감사 가능성을 떨어뜨리므로 자동화된 배포 경로로 대체한다.

- **배포 자동화**: GitHub Actions, CodeBuild, ArgoCD로 푸시 → 빌드 → 테스트 → 배포 ([[CI-Tool-Selection]])
- **프로세스 관리자**: PM2, systemd, Docker/Kubernetes로 **crash → 자동 재시작**
- **Infrastructure as Code**: Terraform, CDK로 인프라도 코드로 ([[IaC]])
- **Blue-Green, Canary** 배포로 무중단 롤아웃

Node.js 특유:
- **Unhandled exception**이 프로세스를 죽임 → 재시작 없으면 즉시 장애
- Cluster master, worker 관계 복구 로직
- 치명 오류 관측에는 기본 종료를 막지 않는 `uncaughtExceptionMonitor`를 우선한다. `uncaughtException`이나 `unhandledRejection` listener를 직접 등록하면 종료 책임도 애플리케이션이 지므로, 동기식 최소 기록만 남기고 nonzero로 종료한다. 비동기 graceful drain은 상태가 정상인 SIGTERM 같은 종료 신호에만 사용한다.

### 5. 모니터링, 관측성

- **Logs + Metrics + Traces** 3축 ([[Logs-vs-Metrics]])
- **Node.js 특화 APM** — Datadog, New Relic, Whatap, Sentry로 이벤트 루프 지연, 메모리, 비동기 스택 추적
- **Event Loop 지연 측정** — `perf_hooks.monitorEventLoopDelay()` 또는 APM 내장
- **Memory 모니터링** — OOM 사전 감지 ([[OOM-Troubleshooting]])
- **Request ID와 trace context 구분** — request ID는 로그 상관관계, W3C trace context는 span 연결에 사용 ([[Structured-Logging]])

핵심 경고 지표:
- latency SLO에서 역산한 Event Loop lag 초과 (100ms 지속은 조사 기준 예시)
- 메모리 점유율 지속 증가 (누수 의심)
- Unhandled Rejection 발생
- GC 시간 급증

### 6. 로그 관리

- **구조화 로깅** — JSON 포맷 (`pino`, `winston`) ([[Structured-Logging]])
- **레벨 분리** — DEBUG는 개발만, INFO 이상만 프로덕션
- **거래, 결제의 정본은 트랜잭션 저장소에** — 일반 로그를 금액이나 상태의 정본으로 쓰지 않음
- **일반 로그는 스트림 파이프라인** — Fluentd, Fluent Bit → S3, ELK ([[Log-Pipeline]])
- **초기 로그 시스템은 버려질 가능성이 높다** — 초반엔 단순하게, 서비스 검증 후 본격 시스템 구축

Node.js 특유:
- `console.log`도 stdout에 쓸 수 있지만 요청 문맥, 레벨, JSON 형식과 수집 경로를 일관되게 강제하려면 구조화 로깅 계약을 둔다.
- 많은 로그가 병목인지와 `console`의 동기 여부는 backing stream, 플랫폼과 실행 환경에 따라 달라진다. 실제 배포 환경에서 로그량을 측정하고 필요하면 샘플링, 버퍼링 또는 전용 로거를 적용한다.

## 추가 Node.js 운영 포인트

### Callback Hell 탈출
- **Promise + async/await** 표준 ([[Promise-Async]])
- 병렬은 `Promise.all`, 순차는 `for await`
- 에러는 try/catch 또는 중앙 에러 미들웨어

### DB 혼합 전략
- **MySQL/PostgreSQL**: 트랜잭션, 결제, 관계형 핵심 데이터
- **MongoDB**: 유연 스키마, 위치 기반, 문서형 데이터
- **Redis**: 캐시, 세션, 큐, 분산 락
- 하나만 고집하지 말고 **워크로드별 적재적소**

### 결제 시스템은 다르게 다룬다
결제는 실패 시 돈, 신뢰 둘 다 날아감. 일반 API와 분리된 원칙 적용:
- PG사 스펙 **한 글자도 틀리지 말 것**
- 숙련 개발자가 설계, 구현, 리뷰
- DB unique 제약 + 트랜잭션 적극 활용
- 공격 상시 대비 (레이트 리밋, IP 제한, 서명 검증)
- 멱등 키 필수 ([[Idempotency]])

### 정기점검, 패치
- Node.js LTS 버전 추적, EOL 전 업그레이드
- 의존성 보안 패치 정기 적용
- 인증서 갱신 자동화 (Let's Encrypt, ACM)

### NestJS 배포 관행
- **환경 모드 명시** — `NODE_ENV`는 Node.js 자체의 예약 동작이 아니라 애플리케이션과 라이브러리가 해석하는 관례다. 사용하는 의존성이 요구하면 `production`을 명시하고, 실제로 바뀌는 로깅, 캐시와 오류 노출 동작을 배포 전 검증한다.
- 헬스체크는 **@nestjs/terminus**가 공식 경로 — readiness/liveness 프레임으로 HTTP ping, TypeORM DB, 디스크, 메모리 인디케이터를 내장하고 `HealthIndicatorService`로 커스텀 인디케이터를 만든다 (`check(key)`로 시작해 `indicator.up()`/`down(부가정보)`를 반환). 구 `HealthIndicator` 상속, `getStatus()`와 `HealthCheckError`는 12.0.0에서 제거됐다. v12부터 인디케이터는 down 결과를 반환해야 503이 되고, 예외를 던지면 예상치 못한 실패로 처리돼 500이 된다. 응답 status는 `ok`/`error`에 더해 **`shutting_down`**이 있다. `gracefulShutdownTimeoutMs`는 readiness 주기 하나가 아니라 `periodSeconds × failureThreshold`, probe 위상, EndpointSlice와 외부 LB 전파 시간을 함께 반영하고, 전체 drain과 리소스 정리는 `terminationGracePeriodSeconds` 안에 끝내야 한다. 무중단 여부는 실제 rollout의 오류율과 중단 요청으로 검증한다 (수동 HealthService 패턴은 [[NestJS-Lifecycle]]).
- `nest start`는 `node dist/main.js` 래퍼에 자동 `nest build`가 붙은 것 — 운영에선 빌드 산출물을 `node dist/main.js`로 직접 실행.

## 초기 스타트업 vs 운영 성숙

완벽부터 추구하면 서비스 출시 못 한다. 단계별 접근:

**초기 (PMF 이전, 작은 워크로드와 완화된 SLO를 측정으로 확인한 경우)**:
- 핵심 테스트만, CI 파이프라인 최소
- 단일 인스턴스 + 관리형 DB로 시작하고 병목이 확인되면 확장
- 에러 모니터링(Sentry) + 기본 로그
- 대규모 부하 테스트는 미루되, 기본 용량과 실패 임계치는 확인

**중기 (서비스 검증 후)**:
- 로그 시스템 재구축 (ELK 등)
- 수평 확장, Auto Scaling
- APM 도입
- 장애 대응 절차 수립 ([[Incident-Recovery-Prevention]])

**성숙기**:
- 멀티 리전, DR
- SLO, Error Budget 운영
- 카오스 엔지니어링
- 성능 튜닝 (Event Loop 최적화, 네이티브 모듈)

**원칙**: SLO와 측정값으로 다음 병목을 정하고, 근거 없는 선제 최적화는 미룬다.

## 면접 체크포인트

- Node.js가 적합한 워크로드와 부적합한 워크로드 구분
- 6대 운영 축 (테스트, 빌드, 확장, 자동화, 모니터링, 로그) 각각의 핵심
- `uncaughtException`, `unhandledRejection` 처리 이유
- 왜 결제 시스템은 별도 원칙으로 다루어야 하는가
- 초기 단계와 성숙 단계의 운영 전략 차이

## 출처
- [supims (brunch) — 안정적인 Node.js 기반 백엔드 시스템 1~9편](https://brunch.co.kr/@supims/122)
- [Node.js, Console](https://nodejs.org/api/console.html)
- [Node.js — Process events](https://nodejs.org/api/process.html#process_event_uncaughtexceptionmonitor)
- [Node.js — Worker threads](https://nodejs.org/api/worker_threads.html)
- [NestJS — Deployment](https://docs.nestjs.com/deployment)
- [NestJS — Terminus (Healthchecks)](https://docs.nestjs.com/recipes/terminus)
- [Terminus 12.0.0 release — NestJS](https://github.com/nestjs/terminus/releases/tag/12.0.0)
- [NestJS — Migration guide (v11)](https://docs.nestjs.com/v11/migration-guide)

## 관련 문서
- [[Backend-Engineer-Baseline|백엔드 엔지니어 기본 역량 체크리스트]]
- [[Zero-Downtime-Deployment|무중단 배포]]
- [[Node.js|Node.js 개요]]
- [[Scale-Up-vs-Out|Scale Up vs Scale Out]]
- [[Logs-vs-Metrics|로그, 메트릭, 트레이스]]
- [[External-Service-Resilience|외부 서비스 장애 대응]]
- [[OOM-Troubleshooting|Node.js OOM 트러블슈팅]]
- [[Incident-Recovery-Prevention|장애 복구와 재발 방지]]
