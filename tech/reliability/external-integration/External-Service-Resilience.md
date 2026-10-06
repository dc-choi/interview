---
tags: [reliability, resilience, circuit-breaker, timeout, bulkhead]
status: done
category: "Reliability"
aliases: ["External Service Resilience", "외부 서비스 장애 대응"]
verified_at: 2026-10-06
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
| **전체 요청 deadline** | 요청 시작부터 정해 둔 종료 시각까지 | 응답 대기 중단과 취소 요청, 실제 작업 종료는 별도 확인 |
| **Connection Timeout** | 연결 수립 시도 중 | 연결 수립이 늦으면 중단 |
| **Read/idle Timeout** | 응답을 읽는 중 바이트가 오지 않는 구간 | 지정 시간 동안 읽을 데이터가 없으면 중단 |

HTTP 클라이언트마다 이름과 포함 범위가 다르다. `socket timeout`이 idle timeout을 뜻할 수도 있고 전체 요청 시간을 뜻할 수도 있으므로, 실제 라이브러리 문서에서 DNS, TLS, 쓰기, 읽기, 재시도를 어디까지 포함하는지 확인한다.

### 값 선택 원칙
- 허용 가능한 오탐률을 먼저 정하고, 의존성의 실제 지연 분포에서 그에 맞는 백분위수와 여유분을 선택한다. 고정된 초 단위나 단순 배수만으로는 보편적인 정답을 정할 수 없다.
- 전체 요청 deadline에서 로컬 처리, 폴백, 필요한 재시도 시간을 남긴 뒤 하위 호출의 시간 예산을 배정한다.
- 재시도는 남은 deadline 안에서만 수행하고, 운영 지표로 오탐과 실제 지연을 다시 조정한다.

### 응답 대기 종료와 작업 취소는 다르다

클라이언트가 기다리기를 포기해도 서버의 DB 쿼리나 외부 호출이 자동으로 끝난다고 볼 수 없다. gRPC도 deadline 초과로 RPC를 취소하지만, 요청을 처리하던 애플리케이션 작업을 멈추는 책임은 서버에 있다. 오래 실행되는 handler는 취소 상태를 확인하고 하위 작업 중단과 자원 정리를 연결해야 한다.

- 하위 호출에는 최초 timeout을 새로 주지 않고 이미 쓴 시간을 뺀 예산을 전달한다. 전체 2초 중 0.5초를 썼다면 남은 상한은 1.5초이며 로컬 마무리 시간도 이 안에 남긴다.
- gRPC의 deadline 자동 전파는 구현 언어와 설정에 따라 다르다. 일반 HTTP 호출이나 DB 드라이버까지 같은 동작이라고 가정하지 않는다.
- 취소 신호를 보냈다는 사실과 작업이 종료됐다는 사실을 구분한다. 라이브러리의 협력적 취소 지원과 정리 경로를 확인한다.
- 결제처럼 부작용이 있는 요청의 timeout은 실패 확정이나 롤백 증거가 아니다. 같은 작업 식별자로 결과를 조회하거나 대사한 뒤 멱등성 조건에 맞춰 재시도한다.

운영 검증에서는 지연된 의존성과 클라이언트 연결 종료를 재현하고, 대기 종료 시각, 서버 작업 종료 시각과 커넥션 반환을 함께 관측한다. 이는 취소가 자원 회수로 이어지는지 확인하기 위한 점검 제안이다.

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
- Open → Half-Open: 대기 시간 경과 뒤 탐색 허용. 전이를 일으키는 호출이나 타이머는 구현과 설정에 따라 다름
- Half-Open → Closed: 탐색 결과가 설정한 복구 조건을 만족
- Half-Open → Open: 탐색 결과가 실패 조건을 만족

### 복구 탐색과 트래픽 복귀는 별도다

2026-10-06 Resilience4j 공식 문서 기준으로 Open은 요청을 `CallNotPermittedException`으로 거절한다. 서킷 브레이커 자체가 요청을 저장했다가 한꺼번에 방출하는 큐는 아니다. 복구 직후 요청이 몰린다면 호출자의 재시도, 별도 큐와 새 유입을 구분한다.

- Half-Open의 허용 호출 수는 탐색 표본이다. 기본 10회가 전체 호출자의 합산 상한은 아니며, 별도 브레이커를 가진 호출자가 함께 탐색하면 하류 부하가 합쳐질 수 있다.
- `automaticTransitionFromOpenToHalfOpenEnabled`의 기본값은 `false`다. 이때 대기 시간이 지나도 다음 호출이 있어야 전이하며, 브레이커가 시험 요청을 스스로 생성하지 않는다.
- Half-Open에서는 실패율과 느린 호출 비율을 설정한 임계치와 비교한다. 느린 호출 비율에 따른 재차 차단은 트래픽을 점진적으로 늘리는 slow start와 다른 기능이다.
- Closed에서는 sliding window 크기가 동시 호출 수를 제한하지 않는다. 동시성은 Bulkhead 등으로 제한하고, 복귀 시 유입량 조절은 별도로 설계한다.

운영 점검 제안: 브레이커별 탐색 성공뿐 아니라 전체 호출량, 큐 잔량과 의존성의 지연을 함께 본다. 복귀 직후 재차 차단되면 재시도 예산과 유입 한도를 조정한 뒤 같은 부하에서 재현한다.

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

평소에 쓰이지 않는 폴백 경로는 잠복 결함을 품기 쉽다. Amazon Builders' Library는 분산 시스템의 폴백이 테스트하기 어렵고 그 자체도 실패할 수 있으며 장애 범위와 복구 시간을 키우는 경우가 많다고 보고, 주 경로의 신뢰성을 먼저 높이거나 두 경로를 평소에도 함께 실행하는 failover로 바꾸라고 권한다. LLM 호출의 폴백은 [[LLM-Failure-Handling|LLM 실패 처리]]를 본다.

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

2026-10-06 부분 검증: deadline의 측정 범위, 남은 시간 전파와 서버 작업 취소 책임을 gRPC 공식 가이드에 대조했다. 추가로 Resilience4j의 요청 거절, Half-Open 전이와 탐색, 동시성 제한의 경계를 공식 문서에 대조했다. 모든 라이브러리의 복구 동작을 검증한 것은 아니다.

- [Resilience4j, CircuitBreaker](https://resilience4j.readme.io/docs/circuitbreaker)
- [gRPC, Deadlines](https://grpc.io/docs/guides/deadlines/)
- [gRPC, Cancellation](https://grpc.io/docs/guides/cancellation/)
- [Timeouts, retries, and backoff with jitter — Amazon Builders' Library, Marc Brooker](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- [Making retries safe with idempotent APIs — Amazon Builders' Library](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)
- [AWS Well-Architected Framework, Control and limit retry calls](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_limit_retries.html)
- [IETF, RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [Avoiding fallback in distributed systems — Amazon Builders' Library, Jacob Gabrielson](https://builder.aws.com/content/3EuS9Sakq7L3VLQIF3qzfMfke1Y/avoiding-fallback-in-distributed-systems)

## 관련 문서
- [[Idempotency|HTTP 멱등성]]
- [[LLM-Failure-Handling|LLM 실패 처리]]
- [[Rate-Limiting|Rate Limiting]]
