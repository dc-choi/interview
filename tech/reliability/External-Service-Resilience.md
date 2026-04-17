---
tags: [reliability, resilience, circuit-breaker, timeout, bulkhead]
status: done
category: "Reliability"
aliases: ["External Service Resilience", "외부 서비스 장애 대응"]
---

# 외부 서비스 장애 대응 (Resilience Patterns)

외부 API·DB·큐에 동기 호출이 있는 시스템은 **외부 장애가 내부로 번지는 연쇄 장애(cascading failure)** 를 늘 안고 산다. 세 가지 계층적 방어선 — **타임아웃 → 벌크헤드 → 서킷 브레이커** — 로 막는 것이 표준.

## 연쇄 장애 시나리오

외부 서비스 X가 응답 지연 → 내 서버 스레드들이 X를 기다리며 블록 → 스레드 풀 고갈 → **내 서버 자체가 응답 불가** → 상위 호출자에게 전파 → 전체 서비스 다운.

한 의존성의 장애가 **전 시스템 중단**으로 확대되는 고전적 패턴. 방어 없으면 매번 발생.

## 계층적 방어

```
기본 방어:   Timeout (시간 제한)
       ↓
격리:        Bulkhead (자원 격리)
       ↓
차단:        Circuit Breaker (빠른 실패)
```

## 1. Timeout (타임아웃)

**가장 기본**. 무한 대기를 막는 시간 제한.

### 3가지 타임아웃 구분

| 종류 | 언제 측정 | 초과 시 |
|---|---|---|
| **Connection Timeout** | TCP 3-way handshake 중 | 서버 주소로 연결 수립 실패 |
| **Socket Timeout** (inactivity) | 커넥션 수립 후 패킷 도착 간격 | 다음 패킷이 안 오면 끊음 |
| **Read Timeout** | 커넥션 수립 후 전체 응답 수신 | 응답 전체가 지연되면 끊음 |

HTTP 클라이언트 라이브러리마다 이름이 다르므로 **무엇을 측정하는지**로 판단.

### 값 선택 원칙
- **Connection**: 1~5초 (네트워크 건강하면 수 ms). 짧게.
- **Read/Socket**: 예상 응답 시간의 2~3배. SLA 기반.
- **상위 타임아웃 > 하위 타임아웃**: 내 서버 5초, 외부 호출 3초 식으로 계층 설계

### 주의
- 타임아웃 너무 짧으면 **정상 요청도 실패** → 오탐 증가
- 타임아웃 너무 길면 **연쇄 장애 유발** → 방어 의미 없음
- 테스트 자동화가 어려움(외부 서비스 모의 필요) — 비용 고려

## 2. Bulkhead (벌크헤드)

배의 격벽에서 온 이름. **기능별로 자원(스레드·커넥션)을 격리**해서 한 영역의 장애가 다른 영역으로 번지지 않게.

### 예시
- 결제 서비스용 커넥션 풀: 20개
- 알림 서비스용 커넥션 풀: 10개
- 추천 서비스용 커넥션 풀: 10개

알림 서비스가 느려져도 결제용 풀은 살아 있음 → 결제는 정상 동작.

### 벌크헤드 없으면
모든 외부 호출이 **공용 스레드 풀** 100개를 나눠 씀. 한 서비스(예: 알림)가 느려지면 100개 스레드 모두 그쪽에 묶여 결제도 불가.

### 구현 방식
- 각 외부 의존성마다 **별도 HTTP 커넥션 풀**
- 각 외부 의존성마다 **별도 스레드 풀**·전용 워커
- Resilience4j의 `Bulkhead` 모듈 (Semaphore·ThreadPool 기반)

## 3. Circuit Breaker (서킷 브레이커)

**빠른 실패(fail fast)** 로 연쇄 장애 차단. 외부 서비스가 지속 실패하면 아예 호출 안 하고 즉시 에러 반환.

### 3상태 머신

| 상태 | 동작 |
|---|---|
| **Closed** | 정상 — 모든 요청 통과. 실패 카운트 누적 |
| **Open** | 차단 — 즉시 실패 반환, 외부 호출 안 함 |
| **Half-Open** | 탐색 — 소수 요청만 허용해서 복구됐는지 확인 |

전이 조건:
- Closed → Open: 임계치 초과 (예: 50% 실패율, 5초 윈도우)
- Open → Half-Open: 쿨다운 시간 경과 (예: 30초)
- Half-Open → Closed: 탐색 요청 성공
- Half-Open → Open: 탐색 요청 실패

### 효과
- 외부 서비스 장애 시 내 서버 스레드가 **대기에 묶이지 않음**
- 장애 중인 외부 서비스에 불필요한 부하를 주지 않음 (회복 기회 제공)
- 사용자에게 **즉시 실패 응답** → 대기 없이 폴백 메시지 제공

### 구현
- **Resilience4j** (Java): `CircuitBreaker` 모듈, Spring과 통합
- **Hystrix** (Netflix): 유지보수 모드 (후속은 Resilience4j 권장)
- **Polly** (.NET), **cockatiel** (Node.js)

## 함께 쓰는 보조 패턴

### Retry
타임아웃·일시 오류 시 재시도. **멱등한 요청에만**. 지수 백오프(1s, 2s, 4s, 8s) + Jitter(랜덤) 필수. Thundering Herd 방지.

### Fallback
차단 시 기본값·캐시·부분 기능 제공. 예: 추천 서비스 다운 시 인기 상품 리스트 반환.

### Graceful Degradation
전체 기능이 안 되면 **핵심만 남기고 부가 기능 끔**. 결제는 되지만 추천은 생략, 등.

## 통합 구성 예

```
Request
  ↓
[Circuit Breaker: Closed/Open 확인]
  ↓ (Closed면 통과)
[Bulkhead: 전용 풀에서 자원 할당]
  ↓
[HTTP Client: Connect/Read Timeout 적용]
  ↓
External Service
```

Spring + Resilience4j에서는 애노테이션으로 적층 가능:
```
@CircuitBreaker(name = "payment", fallbackMethod = "fallbackPay")
@Bulkhead(name = "payment")
@TimeLimiter(name = "payment")
public CompletableFuture<PaymentResult> pay(...) { ... }
```

## 흔한 실수

- **타임아웃 미설정** — 기본값이 `infinite`인 라이브러리 다수. **명시적 설정**이 아니면 사고
- **상위 타임아웃 < 하위 타임아웃** — 내 API 3초인데 외부 호출 10초면 타임아웃이 의미 없음
- **Retry를 비멱등 요청에** — 중복 결제 유발
- **Circuit Breaker 없이 Retry만** — 장애 중인 외부에 부하 폭증
- **모든 의존성 공용 스레드 풀** — 벌크헤드 미적용 → 연쇄 장애

## 면접 체크포인트

- 연쇄 장애가 어떻게 발생하는지 한 시나리오
- 3가지 타임아웃(Connection·Socket·Read) 구분
- 벌크헤드가 연쇄 장애를 어떻게 막는가
- Circuit Breaker의 3상태(Closed·Open·Half-Open) 전이 조건
- Retry를 쓸 때 반드시 지켜야 할 조건 (멱등성·백오프·지터)
- 상위 타임아웃 > 하위 타임아웃 원칙

## 출처
- [매일메일 — 외부 서비스 장애 대응](https://www.maeil-mail.kr/question/74)
- [매일메일 — 타임아웃](https://www.maeil-mail.kr/question/102)

## 관련 문서
- [[Idempotency|HTTP 멱등성]]
- [[Rate-Limiting|Rate Limiting]]
