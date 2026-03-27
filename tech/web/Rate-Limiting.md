---
tags: [web, network, security]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["Rate Limiting", "Rate Limit", "레이트 리밋"]
---

# Rate Limit 정책 설계

특정 시간 내 요청 횟수를 제한하여 서비스를 보호하는 기법이다. DDoS 방어, 브루트포스 차단, 공정한 리소스 분배에 활용된다.

## 왜 필요한가

- **보안:** 로그인 브루트포스 공격 차단
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
- API Gateway(Kong, AWS API Gateway)에서 자주 사용

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

## 식별자 선택

| 식별자 | 장점 | 단점 |
|---|---|---|
| IP | 비인증 사용자도 제한 | NAT 뒤 사용자 구분 불가 |
| User ID | 정확한 사용자별 제한 | 인증 필요 |
| API Key | 서비스별 제한 | 키 발급/관리 필요 |

## 응답 설계

제한 초과 시:
- **상태 코드:** `429 Too Many Requests`
- **헤더:** `Retry-After: 60` (재시도까지 대기 시간)
- **응답 헤더 (선택):** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## 분산 환경에서의 Rate Limiting

서버가 여러 대일 때 각 서버가 독립적으로 카운팅하면 정확하지 않다.

**해결 방법:**
- **중앙 저장소:** Redis를 활용한 공유 카운터 (`INCR` + `EXPIRE`)
- **API Gateway:** Kong, AWS API Gateway 등에서 중앙 집중 관리
- **근사치 허용:** 서버별 로컬 카운터 + 주기적 동기화

## 면접 포인트

Q. Rate Limiting을 어떻게 설계했는가?
- Global(IP당 100회/분) + Auth 엔드포인트(IP당 10회/분) 2단계 적용
- Express middleware로 구현, IP 기반 식별

Q. 분산 환경에서는 어떻게 하는가?
- Redis의 INCR + EXPIRE로 중앙 집중 카운팅
- 또는 API Gateway 레벨에서 처리

## 관련 문서
- [[CSRF|CSRF Protection]]
- [[CORS|CORS / CSP]]
