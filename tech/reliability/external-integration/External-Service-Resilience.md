---
tags: [reliability, resilience, circuit-breaker, timeout, bulkhead]
status: done
category: "Reliability"
aliases: ["External Service Resilience", "외부 서비스 장애 대응"]
verified_at: 2026-08-31
---

# 외부 서비스 장애 대응 (Resilience Patterns)

외부 API, DB, 큐에 동기 호출이 있는 시스템은 **외부 장애가 내부로 번지는 연쇄 장애(cascading failure)** 위험이 있다. 타임아웃, 벌크헤드, 서킷 브레이커는 자주 함께 쓰지만, 모든 의존성에 같은 순서로 적용하는 표준 조합은 아니다.

## 연쇄 장애 시나리오

외부 서비스 X가 응답 지연 → X를 기다리는 커넥션, 동시 요청 슬롯, 큐 또는 워커 용량이 점유 → **내 서버의 새 요청 처리 능력 저하** → 상위 호출자에게 전파 → 더 넓은 장애.

스레드 풀이 묶이는 것은 이 현상을 설명하는 한 구현 모델일 뿐이다. Node.js에서는 대기 중인 I/O, 커넥션 풀, 동시성 제한, 이벤트 루프를 막는 작업을 함께 봐야 한다. 한 의존성의 장애가 전 시스템 중단으로 확대될 수 있으므로 호출별 용량과 실패 경로를 설계한다.

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

### 측정 범위로 구분하기

| 종류 | 언제 측정 | 초과 시 |
|---|---|---|
| **전체 요청 deadline** | 요청 시작부터 취소까지 | 남은 시간 안에 응답을 못 받으면 중단 |
| **Connection Timeout** | 연결 수립 시도 중 | 연결 수립이 늦으면 중단 |
| **Read/idle Timeout** | 응답을 읽는 중 바이트가 오지 않는 구간 | 지정 시간 동안 읽을 데이터가 없으면 중단 |

HTTP 클라이언트마다 이름과 포함 범위가 다르다. `socket timeout`이 idle timeout을 뜻할 수도 있고 전체 요청 시간을 뜻할 수도 있으므로, 실제 라이브러리 문서에서 DNS, TLS, 쓰기, 읽기, 재시도를 어디까지 포함하는지 확인한다.

### 값 선택 원칙
- 허용 가능한 오탐률을 먼저 정하고, 의존성의 실제 지연 분포에서 그에 맞는 백분위수와 여유분을 선택한다. 고정된 초 단위나 단순 배수만으로는 보편적인 정답을 정할 수 없다.
- 전체 요청 deadline에서 로컬 처리, 폴백, 필요한 재시도 시간을 남긴 뒤 하위 호출의 시간 예산을 배정한다.
- 재시도는 남은 deadline 안에서만 수행하고, 운영 지표로 오탐과 실제 지연을 다시 조정한다.

### 주의
- 타임아웃 너무 짧으면 **정상 요청도 실패** → 오탐 증가
- 타임아웃 너무 길면 **연쇄 장애 유발** → 방어 의미 없음
- 테스트 자동화가 어려움(외부 서비스 모의 필요) — 비용 고려

## 2. Bulkhead (벌크헤드)

배의 격벽에서 온 이름. **의존성별 자원(커넥션, 동시 요청 슬롯, 큐, 워커)을 격리**해서 한 영역의 장애가 다른 영역으로 번지지 않게.

### 예시
- 결제 서비스용 커넥션 풀: 20개
- 알림 서비스용 커넥션 풀: 10개
- 추천 서비스용 커넥션 풀: 10개

알림 서비스가 느려져도 결제용 풀에 여유가 남음 → 결제 경로를 보호할 수 있음.

### 벌크헤드 없으면
모든 외부 호출이 **공용 커넥션 풀이나 동시성 제한**을 나눠 쓴다. 한 서비스(예: 알림)가 느려지면 공용 용량을 모두 점유해 결제도 처리하지 못할 수 있다.

### 구현 방식
- 각 외부 의존성마다 **별도 HTTP 커넥션 풀과 최대 동시 요청 수**
- 블로킹 작업이나 CPU 작업이 있다면 의존성별 **전용 큐나 워커**
- 격리 한도를 초과했을 때의 빠른 실패와 폴백

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
- 외부 서비스 장애 시 내 서버의 커넥션과 동시 처리 용량이 **대기에 묶이지 않음**
- 장애 중인 외부 서비스에 불필요한 부하를 주지 않음 (회복 기회 제공)
- 사용자에게 **즉시 실패 응답** → 대기 없이 폴백 메시지 제공

### 한계
서킷 브레이커는 모달(modal) 동작이라 테스트가 어렵고, 의존성이 회복된 뒤에도 열린 회로가 정상 트래픽 복귀를 늦춰 전체 복구 시간을 늘릴 수 있다. 재시도 부하 억제만이 목적이면 토큰 버킷 재시도 예산이 대안이다 ([[Retry-Backoff-Jitter|지수 백오프와 지터]]).

## 함께 쓰는 보조 패턴

### Retry
타임아웃과 일시 오류에 재시도한다. 원래 멱등한 작업, 같은 idempotency key나 operation token으로 중복 효과를 막은 작업, 또는 요청이 서버에 적용되지 않았음을 확실히 판별한 경우에만 자동 재시도한다. 응답 없는 timeout은 효과가 없었다는 증거가 아니므로, 오류 종류를 분류하고 한 계층에서만 제한 횟수와 전체 시간을 두고 지수 백오프와 jitter를 적용한다. 공식, full jitter 등 변형 비교와 토큰 버킷 재시도 예산은 [[Retry-Backoff-Jitter|지수 백오프와 지터]].

### Fallback
차단 시 기본값, 캐시, 부분 기능 제공. 예: 추천 서비스 다운 시 인기 상품 리스트 반환.

### Graceful Degradation
전체 기능이 안 되면 **핵심만 남기고 부가 기능 끔**. 결제는 되지만 추천은 생략하는 식.

## 통합 구성 예

```
Request
  ↓
[Circuit Breaker: Closed/Open 확인]
  ↓ (Closed면 통과)
[Bulkhead: 전용 풀에서 자원 할당]
  ↓
[HTTP Client: 전체 deadline, 연결, 읽기 timeout 적용]
  ↓
External Service
```

구체적인 라이브러리의 조합 순서, 기본값, 취소 전파 방식은 런타임과 버전에 따라 다르므로 적용 전 해당 문서와 장애 테스트로 확인한다.

## 흔한 실수

- **타임아웃 의미 미확인** — 라이브러리 기본값과 `timeout`의 범위는 버전마다 다르다. 전체 deadline과 각 세부 timeout을 명시한다.
- **호출 시간 예산 미배정** — 내 API deadline 안에 외부 호출, 폴백, 필요한 재시도를 모두 넣지 못하면 취소 뒤에도 자원이 남을 수 있다.
- **중복 방지 없이 비멱등 요청 재시도** — 중복 결제 같은 부작용 유발
- **Circuit Breaker 없이 Retry만** — 장애 중인 외부에 부하를 증폭할 수 있음
- **모든 의존성 공용 용량 사용** — 벌크헤드 미적용 → 연쇄 장애

## 면접 체크포인트

- 연쇄 장애가 어떻게 발생하는지 한 시나리오
- 전체 deadline, 연결, 읽기 timeout의 측정 범위와 라이브러리별 차이
- 벌크헤드가 연쇄 장애를 어떻게 막는가
- Circuit Breaker의 3상태(Closed, Open, Half-Open) 전이 조건
- Retry를 쓸 때 반드시 지켜야 할 조건 (중복 효과 방지, 백오프, 지터, 제한)
- 요청 deadline 안에서 하위 호출 시간 예산을 배정하는 방법

## 출처
- [Timeouts, retries, and backoff with jitter — Amazon Builders' Library, Marc Brooker](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- [Making retries safe with idempotent APIs — Amazon Builders' Library](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)
- [AWS Well-Architected Framework, Control and limit retry calls](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_limit_retries.html)
- [IETF, RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)

## 관련 문서
- [[Idempotency|HTTP 멱등성]]
- [[Rate-Limiting|Rate Limiting]]
