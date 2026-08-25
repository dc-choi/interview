---
tags: [fit, interview, questions, tech]
status: done
category: "Interview - Fit"
aliases: ["Common Interview Questions Tech Basics", "기술 질문 기본"]
---

# 자주하는 면접 질문 — 1차 기술 질문 (기본)

브라우저, HTTP, REST, 성능 테스트를 묻는 **기초 기술 질문** 3개와, 별도 Behavioral 질문 안내 1개.

---

## Q1. 브라우저에서 웹사이트 접근 과정 설명

> 인터넷 브라우저를 열고 특정 웹사이트에 접근할 때, 사용자와 서버 사이에 어떤 과정이 일어나는지 설명해주세요.

**질문 의도**
- DNS, 전송 계층, HTTP와 렌더링을 순서와 책임에 맞게 연결하는지 본다.
- HTTP 버전에 따라 연결 경로가 달라진다는 점을 구분하는지 본다.

**답변 골격**:
1. **URL 파싱** → 스킴/호스트/포트/경로 분리
2. **DNS 조회** → 브라우저/OS 캐시 → 재귀 DNS → 권한 DNS (A 레코드)
3. **연결 수립** → HTTP/1.1, HTTP/2는 TCP 3-way handshake를 하고 HTTPS라면 TLS handshake를 추가, HTTP/3는 UDP 위 QUIC과 TLS 1.3을 사용
4. **HTTP 요청** → 헤더(쿠키, User-Agent, Accept)
5. **서버 처리** → 로드밸런서 → 리버스 프록시 → 앱 서버 → DB → 응답 생성
6. **HTTP 응답** → 상태 코드, 헤더(캐시, 쿠키), 본문
7. **브라우저 렌더링** → HTML 파싱 → CSSOM → Render Tree → Layout → Paint → Composite
8. **연결 유지/종료** → Keep-Alive, HTTP/2 멀티플렉싱, HTTP/3 QUIC

**흔한 오답**
- DNS 조회만 설명하고 캐시, 연결 수립, 응답 뒤 렌더링을 빠뜨린다.
- HTTP/3도 TCP 연결을 거친다고 일반화한다.

**꼬리질문**
- TLS handshake가 필요한 이유와 인증서 검증 실패 시 브라우저 동작은 무엇인가?
- HTTP/2와 HTTP/3의 멀티플렉싱과 head-of-line blocking 차이는 무엇인가?

> 학습 정본: [[HTTP-Seminar|HTTP 세미나]], [[HTTPS-TLS|HTTPS & TLS]], [[OSI-7-Layer|OSI 7 Layer]]

---

## Q2. RESTful 아키텍처 특징과 설계 시 고려사항

> 기본적인 RESTful 아키텍처의 특징과 RESTful API를 설계할 때 고려해야 할 점에 대해서 설명해주세요.

**질문 의도**
- REST 제약이 URI 형식만이 아니라 통신 인터페이스의 제약이라는 점을 아는지 본다.
- HTTP 의미론과 운영 제약을 API 설계에 연결하는지 본다.

**답변 골격**:
- **REST의 6가지 제약**: Client-Server, Stateless, Cacheable, Uniform Interface, Layered System, Code on Demand (optional)
- **Uniform Interface의 4가지 세부 원칙**: 리소스 식별, 표현을 통한 리소스 조작, 자기 서술적 메시지, HATEOAS
- **설계 시 고려사항**:
  - 리소스 중심 URI 설계 (`/orders/123/items`, 동사 금지)
  - HTTP 메서드의 의미 보존 (GET 안전/멱등, PUT 멱등, POST는 일반적으로 멱등을 보장하지 않으므로 필요하면 Idempotency Key를 설계)
  - 적절한 상태 코드 (200, 201, 204, 400, 401, 403, 404, 409, 422, 500)
  - 페이지네이션 (cursor vs offset)
  - 버저닝 전략 (URI `/v1/`, 헤더 `Accept: application/vnd.api+json;version=1`)
  - 에러 응답 포맷 통일 (RFC 9457 Problem Details, RFC 7807 대체)
  - 캐시 제어 (ETag, Cache-Control, Last-Modified)
  - 보안 (인증/인가, Rate Limiting, CORS)

**흔한 오답**
- REST를 동사가 없는 URI 규칙으로만 설명한다.
- 모든 POST가 자동으로 중복 안전하다고 가정한다.

**꼬리질문**
- PUT과 PATCH는 어떤 기준으로 나누는가?
- cursor와 offset 페이지네이션의 일관성, 성능 차이는 무엇인가?

> 학습 정본: [[REST|REST]]

---

## Q3. 가장 해결하기 어려웠던 상황 / 가장 큰 성장을 한 상황

> 지원자가 지금까지 해온 업무 중에 가장 해결하기 어려웠던 상황이나 가장 큰 성장을 했던 상황은 무엇이었나요?

> 개인 경험과 FIT 질문이므로 사실형 기술 질문 풀에 답변 본문을 복제하지 않는다.

**준비 포인트**
- STAR로 맥락, 본인 역할, 대안 검토, 정량 결과와 남은 판단 기준을 연결한다.
- 개인 경험은 부풀리지 않고, 내가 한 일과 팀이 한 일을 구분한다.

**마스터**: [[Common-Interview-Questions-Behavioral|Behavioral 질문]], [[My-FIT-Answers|내 FIT 답변 마스터]]

---

## Q4. 성능 테스트 이유 / 대상 화면 / 성능 지표

> 새 프로젝트 오픈을 앞두고 성능 테스트를 하려고 합니다. 왜 성능 테스트를 하는지, 해야 한다면 어떤 화면을 대상으로 해야 하는지, 테스트를 통해 확인해야 할 서비스의 성능 지표는 어떤 것들이 있을까요?

**질문 의도**
- 서비스 목표와 예상 부하를 검증 가능한 테스트 시나리오로 바꾸는지 본다.
- 평균 응답 시간만 보지 않고 지연, 오류, 자원 포화를 함께 해석하는지 본다.

**핵심 답변: 왜 하는가**
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

**흔한 오답**
- 평균 latency만 보고 p95/p99, 오류율과 saturation을 누락한다.
- 실제 트래픽 경로나 SLO 없이 임의의 TPS만 높게 잡는다.

**꼬리질문**
- 목표 p95와 오류율은 어떤 사용자 시나리오와 SLO에서 정하는가?
- 병목이 DB connection pool일 때 애플리케이션과 DB에서 각각 무엇을 측정하는가?

> 학습 정본: [[성능&확장성(Performance&Scalability)|성능&확장성]]

---

## 출처

- 개발자 취업과 이직 한방에 해결하기
- [RFC 9457: Problem Details for HTTP APIs — RFC Editor](https://www.rfc-editor.org/rfc/rfc9457.html)

## 관련 문서
- [[Common-Interview-Questions|자주하는 면접 질문 (인덱스)]]
- [[Common-Interview-Questions-Tech-Scale|기술 질문 — 확장성, 아키텍처]]
- [[Common-Interview-Questions-Behavioral|Behavioral 질문]]
- [[Common-Interview-Questions|Interview Fit]]
