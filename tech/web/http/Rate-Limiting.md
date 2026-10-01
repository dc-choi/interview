---
tags: [web, network, security]
status: done
verified_at: 2026-09-30
category: "웹&네트워크(Web&Network)"
aliases: ["Rate Limiting", "Rate Limit", "레이트 리밋"]
---

# Rate Limit 정책 설계

특정 주체가 일정 시간에 소비할 수 있는 요청이나 작업량을 제한해 서비스를 보호하는 기법이다. 과부하와 남용을 줄이는 한 방어층이며, 공격 트래픽이 제한기 자체의 용량을 넘는 DDoS를 단독으로 막지는 못한다.

## 왜 필요한가

- **보안:** 로그인 브루트포스와 민감한 business flow 남용 완화
- **안정성:** 단일 클라이언트가 서버 리소스를 독점하는 것을 방지
- **비용:** 불필요한 요청으로 인한 인프라 비용 증가 방지
- **공정성:** 모든 사용자에게 균등한 서비스 품질 보장

## 주요 알고리즘

### Fixed Window
- 고정된 시간 창(예: 1분)마다 카운터 리셋
- 구현이 단순하지만, 창 경계에서 두 배의 요청이 통과할 수 있음

### Sliding Window Log
- 각 요청의 타임스탬프를 기록하고, 현재 시점 기준 윈도우 내 요청 수를 계산
- 정확하지만 메모리 사용량이 높음

### Sliding Window Counter
- Fixed Window + Sliding 방식의 하이브리드
- 이전 창의 가중치를 적용하여 근사치 계산
- 정확도와 효율의 균형

### Token Bucket
- 일정 속도로 토큰이 채워지고, 요청마다 토큰을 소비
- 버스트 트래픽을 허용하면서 평균 속도를 제한
- AWS API Gateway가 rate와 burst로 구성하는 Token Bucket을 사용한다. Kong Gateway의 Rate Limiting은 fixed window, Rate Limiting Advanced는 fixed window와 sliding window를 지원하므로 Token Bucket 사례로 묶지 않는다.

### Leaky Bucket
- 요청이 큐에 쌓이고, 일정 속도로 처리
- 처리 속도가 일정하지만, 큐가 가득 차면 요청을 거부

## 계층별 Rate Limiting

실제 서비스에서는 여러 계층에서 rate limit을 적용한다.

**Global Rate Limit:** 모든 엔드포인트에 적용 (예: IP당 100회/분)
- 서비스 전체를 보호하는 기본 방어선

**Endpoint Rate Limit:** 민감한 엔드포인트에 더 엄격한 제한 (예: 로그인 IP당 10회/분)
- 인증 관련 엔드포인트는 브루트포스 방지를 위해 별도 제한

**User Rate Limit:** 인증된 사용자별 제한
- IP 기반보다 정확 (NAT 뒤의 사용자 구분 가능)

**적용 위치:** API 게이트웨이에서 전체 한도를 중앙에서 걸고, 개별 서비스는 자기 자원 기준의 추가 한도를 둔다. 게이트웨이처럼 넓은 경계의 한도는 부하를 만들지 않은 다수 사용자까지 함께 막을 수 있으므로 경계마다 누가 영향을 받는지 정한다. DDoS 방어와 WAF 규칙은 네트워크 경계에서 대량, 악성 트래픽을 버리고, 애플리케이션 rate limit은 정상 트래픽을 계약 한도로 계량하는 별개의 층이라 함께 쓴다.

**헬스 체크 예외:** probe 경로에 일반 API와 같은 한도를 걸지 않는다. Kubernetes HTTP probe는 200 이상 400 미만만 성공으로 보므로, 429를 받으면 readiness 실패로 Service 엔드포인트에서 빠지거나 liveness 실패로 컨테이너가 재시작될 수 있다.

## 식별자 선택

| 식별자 | 장점 | 단점 |
|---|---|---|
| IP | 비인증 사용자도 제한 | NAT 뒤 사용자 구분 불가 |
| User ID | 정확한 사용자별 제한 | 인증 필요 |
| API Key | 서비스별 제한 | 키 발급/관리 필요 |

## 쿼터, 차단 목록과 적응형 한도

- **쿼터:** 짧은 창의 속도 제한과 별개로 사용자, API key, 테넌트별 일, 월 단위 총량을 정한다. 요금제와 구독 등급에 연결되는 비즈니스 계약이므로 초과 시 동작(차단, 추가 과금, 등급 안내)과 초기화 시점을 공개한다. 불특정 다수가 쓰는 공개 API, 등급별 제약이 다른 구독형 서비스, 한 테넌트의 자원 독점을 막아야 하는 멀티테넌트 시스템이 대표 사례다. AWS API Gateway의 usage plan도 key별 throttle과 quota를 정하지만, 보장된 상한이 아니라 best-effort 목표로 적용한다고 밝힌다.
- **차단 목록:** 악성으로 판정한 IP나 key는 속도와 무관하게 거부한다. IP 차단은 NAT 뒤의 정상 사용자를 함께 막을 수 있어 만료와 해제 절차를 둔다.
- **적응형 한도:** 고정 숫자 대신 p99 지연이나 큐 깊이 같은 신호로 한도를 움직인다. 한산한 시간에는 넓히고 몰리는 시간에는 좁히는 식이다. 신호가 틀려 한도가 무한히 풀리지 않도록 고정 상한과 함께 쓰고, 장애 중에 배포 없이 바꿀 수 있게 한도를 런타임 설정으로 둔다.
- **제한 차원:** 초당 요청 수보다 동시 실행 수, 큐 깊이나 하류 의존성의 한도가 먼저 포화되는 경우가 많다. 경계마다 먼저 포화되는 자원에 한도를 걸고, 읽기와 쓰기처럼 비용이 다른 연산은 가중치를 달리한다.

## 응답 설계

제한 초과 시:
- **상태 코드:** `429 Too Many Requests`
- **헤더:** `Retry-After: 60` (재시도까지 대기 시간)
- **추가 헤더:** provider나 API 계약에서 정의한 limit, remaining, reset 정보를 일관되게 제공

429는 특정 주체가 정해진 시간 창의 한도를 넘었다는 뜻이고, 503은 서버가 일시적인 과부하나 점검으로 지금 요청을 처리할 수 없다는 뜻이다. 둘 다 `Retry-After`를 보낼 수 있다. 어느 한도를 넘었는지와 영향 범위를 응답에 밝혀야 호출자가 추측하지 않고 속도를 조정한다. 하류 의존성에서 받은 429나 503을 조용한 재시도나 일반 500으로 감추면 호출자가 속도를 줄이지 못해 재시도가 증폭되므로 상류로 신호를 전달한다([[Retry-Backoff-Jitter|재시도와 백오프]]).

거절 경로는 막으려는 작업보다 싸야 한다. 무거운 인증이나 본문 파싱 뒤에 거절하면 거절된 요청만으로도 포화되므로 파이프라인 앞단에서 거절한다.

## 거절 외의 과부하 대응

| 대응 | 동작 | 비용과 주의 |
|---|---|---|
| 기능 저하 | 비핵심 기능을 끄거나 품질을 낮춰 핵심 기능의 자원을 확보한다. 예: 새로 계산하는 대신 캐시된 결과를 준다 | 응답의 완전성을 가용성과 맞바꾼다. 포기해도 되는 기능을 미리 정한다([[External-Service-Resilience#Graceful Degradation\|Graceful Degradation]]) |
| 부하 평준화 | 요청을 큐에 쌓아 처리 속도를 일정하게 만든다 | 응답이 비동기가 되고 대기 시간이 늘어난다([[Cache-vs-Queue]]의 Queue-Based Load Leveling) |
| 우선순위별 지연 | 낮은 우선순위 테넌트나 작업을 미루고 나중에 다시 시도하라고 알린다 | 우선순위 기준과 지연 상한을 계약에 둔다 |
| 오토스케일링 병행 | 증설이 끝날 때까지 한도로 버티고 끝나면 한도를 푼다 | 수요가 증설 속도보다 빨리 늘면 한도만으로 버티지 못한다 |

캐시는 평균 부하를 낮추지만 최대 부하를 묶지 못한다. 캐시 miss와 인기 key 만료는 그대로 origin으로 가므로 rate limit의 대체물로 쓰지 않는다. 스트림 안에서 소비자가 못 따라올 때 멈추거나 버리는 제어는 [[Backpressure]]에서 다룬다.

## 분산 환경에서의 Rate Limiting

서버가 여러 대일 때 각 서버가 독립적으로 카운팅하면 정확하지 않다. 요청마다 식별자별 버킷에서 토큰을 하나 소비하고 없으면 429를 돌려주는 구현을 인스턴스 메모리에 두면, 인스턴스가 N대일 때 실제 허용량이 최대 N배가 된다.

**해결 방법:**
- **중앙 저장소:** Redis 같은 공유 저장소에서 increment, expiry와 allow/deny 판정을 원자적으로 실행. 분리된 `INCR`와 조건부 `EXPIRE`는 실패 사이에 TTL 없는 key를 남길 수 있어 transaction, server-side function이나 Lua script로 묶는다
- **API Gateway:** Kong, AWS API Gateway 등에서 중앙 집중 관리
- **근사치 허용:** 서버별 로컬 카운터 + 주기적 동기화

## 면접 포인트

Q. Rate Limiting을 어떻게 설계했는가?
- 전체 보호 한도와 로그인, 결제 같은 고위험 endpoint 한도를 분리한다
- IP, user, API key와 tenant 중 공정성과 우회 위험에 맞는 식별자를 선택한다

Q. 분산 환경에서는 어떻게 하는가?
- Redis에서 INCR와 EXPIRE를 Lua script나 transaction으로 묶어 원자적으로 중앙 집중 카운팅
- 또는 API Gateway 레벨에서 처리

Q. 429와 503은 어떻게 구분하는가?
- 429는 특정 주체의 한도 초과, 503은 서버 전체의 일시적 과부하나 점검이다. 둘 다 `Retry-After`로 재시도 시점을 알린다

## 출처

- [RFC 6585, 429 Too Many Requests](https://www.rfc-editor.org/rfc/rfc6585.html#section-4)
- [RFC 9110, 503 Service Unavailable](https://www.rfc-editor.org/rfc/rfc9110.html#name-503-service-unavailable)
- [Azure Architecture Center, Throttling pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/throttling)
- [Kubernetes, Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/)
- [Redis, Rate limiter pattern](https://redis.io/docs/latest/commands/incr/#pattern-rate-limiter)
- [AWS API Gateway, Throttle API requests](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html)
- [Kong, Rate Limiting Advanced](https://developer.konghq.com/plugins/rate-limiting-advanced/)
- [OWASP API Security Top 10 2023, Release Notes](https://owasp.org/API-Security/editions/2023/en/0x04-release-notes/)
- [Dowon Lee 강사, Rate Limiting Strategies](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=289786)
- [Dowon Lee 강사, API Rate Limiting 실습](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=290752)

## 관련 문서
- [[CSRF|CSRF Protection]]
- [[CORS|CORS]]
- [[Retry-Backoff-Jitter|재시도, 백오프와 지터]]
- [[External-Service-Resilience|외부 서비스 장애 대응]]
- [[Cache-vs-Queue|캐시와 큐의 역할 (Queue-Based Load Leveling)]]
