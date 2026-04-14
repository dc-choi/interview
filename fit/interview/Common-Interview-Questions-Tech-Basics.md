---
tags: [fit, interview, questions, tech]
status: done
category: "Interview - Fit"
aliases: ["Common Interview Questions Tech Basics", "기술 질문 기본"]
---

# 자주하는 면접 질문 — 1차 기술 질문 (기본)

> 출처: 개발자 취업과 이직 한방에 해결하기

브라우저·HTTP·REST·STAR·성능 테스트 등 **기초 개념을 묻는 1차 기술 질문** 4개. 답변 안에 꼬꼬무(꼬리질문)를 유도할 키워드를 심어두는 것이 핵심.

---

## Q1. 브라우저에서 웹사이트 접근 과정 설명

> 인터넷 브라우저를 열고 특정 웹사이트에 접근할 때, 사용자와 서버 사이에 어떤 과정이 일어나는지 설명해주세요.

**답변 골격**:
1. **URL 파싱** → 스킴/호스트/포트/경로 분리
2. **DNS 조회** → 브라우저/OS 캐시 → 재귀 DNS → 권한 DNS (A 레코드)
3. **TCP 연결** (3-way handshake) → HTTPS면 TLS handshake 추가
4. **HTTP 요청** → 헤더(쿠키, User-Agent, Accept)
5. **서버 처리** → 로드밸런서 → 리버스 프록시 → 앱 서버 → DB → 응답 생성
6. **HTTP 응답** → 상태 코드, 헤더(캐시, 쿠키), 본문
7. **브라우저 렌더링** → HTML 파싱 → CSSOM → Render Tree → Layout → Paint → Composite
8. **연결 유지/종료** → Keep-Alive, HTTP/2 멀티플렉싱, HTTP/3 QUIC

**꼬꼬무 대비 키워드**: TLS 1.3, OCSP Stapling, HTTP/2 Stream, SNI, CDN, CORS Preflight, Critical Rendering Path, Service Worker

> 참고: [[HTTP-Seminar|HTTP 세미나]], [[HTTPS-TLS|HTTPS & TLS]], [[OSI-7-Layer|OSI 7 Layer]]

---

## Q2. RESTful 아키텍처 특징과 설계 시 고려사항

> 기본적인 RESTful 아키텍처의 특징과 RESTful API를 설계할 때 고려해야 할 점에 대해서 설명해주세요.

**답변 골격**:
- **REST의 6가지 제약**: Client-Server, Stateless, Cacheable, Uniform Interface, Layered System, Code on Demand (optional)
- **Uniform Interface의 4가지 세부 원칙**: 리소스 식별, 표현을 통한 리소스 조작, 자기 서술적 메시지, HATEOAS
- **설계 시 고려사항**:
  - 리소스 중심 URI 설계 (`/orders/123/items`, 동사 금지)
  - HTTP 메서드의 의미 보존 (GET 멱등/안전, PUT 멱등, POST 비멱등)
  - 적절한 상태 코드 (200, 201, 204, 400, 401, 403, 404, 409, 422, 500)
  - 페이지네이션 (cursor vs offset)
  - 버저닝 전략 (URI `/v1/`, 헤더 `Accept: application/vnd.api+json;version=1`)
  - 에러 응답 포맷 통일 (RFC 7807 Problem Details)
  - 캐시 제어 (ETag, Cache-Control, Last-Modified)
  - 보안 (인증/인가, Rate Limiting, CORS)

**꼬꼬무 대비 키워드**: Richardson Maturity Model, HATEOAS, Idempotency Key, REST vs GraphQL vs gRPC

> 참고: [[REST|REST]]

---

## Q3. 가장 해결하기 어려웠던 상황 / 가장 큰 성장을 한 상황

> 지원자가 지금까지 해온 업무 중에 가장 해결하기 어려웠던 상황이나 가장 큰 성장을 했던 상황은 무엇이었나요?

**답변 구조 (STAR)**:
- **Situation**: 맥락(팀 규모, 트래픽, 제약)
- **Task**: 구체적인 목표/지표
- **Action**: 선택한 접근 + 왜 그 방법이었는지 (대안 검토 포함)
- **Result**: 정량 지표 + 비즈니스 임팩트

**주의사항**:
- **부풀리기 금지** — 노련한 면접관은 거짓을 쉽게 간파한다
- 내가 한 일과 팀이 한 일을 명확히 구분
- "어려웠다"로 끝내지 말고 **이 경험이 내 판단 기준에 어떻게 남았는지**까지 이어가기

**꼬꼬무 대비**:
- "다른 방법은 고민 안 해봤나요?" → 검토했던 대안과 탈락 이유
- "지금 다시 한다면?" → 최근에 배운 것으로 개선 가능한 포인트
- "그 경험이 지금 어떤 판단 기준을 남겼나?" → 메타인지

---

## Q4. 성능 테스트 이유 / 대상 화면 / 성능 지표

> 새 프로젝트 오픈을 앞두고 성능 테스트를 하려고 합니다. 왜 성능 테스트를 하는지, 해야 한다면 어떤 화면을 대상으로 해야 하는지, 테스트를 통해 확인해야 할 서비스의 성능 지표는 어떤 것들이 있을까요?

**왜 하는가**
- 운영 환경에서 예상 트래픽을 견딜 수 있는지 검증 (가용성)
- 병목 지점 사전 식별 (DB, 캐시, 네트워크, 스레드 풀)
- SLO/SLA 근거 수립
- 스케일 아웃 기준/오토스케일링 임계값 설정
- 사고 발생 시 임팩트 예측

**대상 화면**
- **핫 경로**: 트래픽이 가장 몰리는 페이지 (메인, 상품 상세, 로그인)
- **결제/주문** 같은 **수익 직결 플로우**
- **N+1, 락 경합 의심 지점**: 대시보드, 관리자 통계
- **외부 API 호출 많은 화면** (장애 전파 가능)

**핵심 지표**
- **Throughput (TPS, RPS)** — 초당 처리량
- **Latency (p50, p95, p99)** — 응답 시간 분포 (평균은 함정)
- **Error Rate** — 4xx/5xx, Timeout
- **Resource**: CPU, Memory, Heap, GC pause, DB connection pool, Disk I/O, Network
- **Saturation**: Queue length, Thread pool active count

**테스트 유형**
- Load Test (정상 부하), Stress Test (한계점), Spike Test (급증), Soak Test (장시간)

> 참고: [[성능&확장성(Performance&Scalability)|성능&확장성]]

---

## 관련 문서
- [[Common-Interview-Questions|자주하는 면접 질문 (인덱스)]]
- [[Common-Interview-Questions-Tech-Scale|기술 질문 — 확장성·아키텍처]]
- [[Common-Interview-Questions-Behavioral|Behavioral 질문]]
- [[FIT|Interview Fit]]
