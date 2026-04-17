---
tags: [infrastructure, network, proxy]
status: done
category: "Infrastructure - 네트워크"
aliases: ["Forward vs Reverse Proxy", "포워드 프록시 vs 리버스 프록시"]
---

# Forward Proxy vs Reverse Proxy

둘 다 "중개자"지만 **누구를 대신하느냐**가 정반대. Forward는 **클라이언트 편**, Reverse는 **서버 편**. 이름(Forward·Reverse)은 헷갈리지만 **입장의 반대 방향**이라 기억.

## 한 줄 정의

- **Forward Proxy**: 클라이언트가 외부 인터넷에 나갈 때 **클라이언트 대신** 요청을 전달
- **Reverse Proxy**: 외부 클라이언트가 서버에 들어올 때 **서버 대신** 요청을 수신

## 위치와 방향

```
Forward:   [Client] → [Forward Proxy] → Internet → [Server]
                     (클라이언트가 누군지 서버는 모름)

Reverse:   [Client] → Internet → [Reverse Proxy] → [Server 1, 2, 3]
                                  (서버 구조를 클라이언트는 모름)
```

## Forward Proxy

### 역할
- **클라이언트 대신** 외부 요청 보내고 응답 전달
- 서버 입장에선 "프록시가 요청한 것"으로 보임 — 클라이언트 식별 불가

### 주요 용도
- **익명성**: 클라이언트 IP를 서버로부터 감춤
- **방화벽 우회 / 필터링**: 회사 내부망에서 **특정 외부 사이트 차단**, 허용된 URL만 통과
- **캐싱**: 같은 외부 리소스를 여러 클라이언트가 요청할 때 **프록시에서 캐시**해 대역폭 절약
- **보안 감사**: 사내에서 나가는 모든 트래픽을 로깅·검사

### 실무 예시
- 기업 내부망의 **프록시 서버** (Squid)
- VPN 서비스
- 광고 차단기

## Reverse Proxy

### 역할
- **서버 대신** 외부 요청 수신, 내부 서버(들)로 전달
- 클라이언트는 실제 서버가 어디 있는지 몰라도 됨

### 주요 용도
- **로드 밸런싱**: 여러 내부 서버에 트래픽 분산
- **SSL/TLS 종료(termination)**: 인증서·암호화를 프록시가 담당 → 내부 서버 부담 감소
- **캐싱**: 정적 리소스·API 응답 캐시 → 응답 속도 향상
- **보안**: DDoS 완화, WAF(Web Application Firewall) 통합, 내부 서버 IP 은폐
- **경로 기반 라우팅**: `/api/*`는 API 서버로, `/static/*`은 정적 서버로
- **HTTP 프로토콜 변환**: 외부는 HTTP/2, 내부는 HTTP/1.1

### 실무 예시
- **Nginx**, **Envoy**, **HAProxy** — 전통적 Reverse Proxy
- **AWS ALB·NLB·CloudFront** — 관리형 Reverse Proxy
- **API Gateway** (Kong·Tyk) — 인증·Rate Limit까지 추가

## 비교표

| 축 | Forward Proxy | Reverse Proxy |
|---|---|---|
| 누구를 대신 | 클라이언트 | 서버 |
| 클라이언트가 프록시 존재를 인지 | ✅ (명시적 설정) | ✗ (투명) |
| 서버가 클라이언트를 아는가 | ✗ (프록시로 보임) | ✅ (프록시가 `X-Forwarded-For`로 전달) |
| 설치 위치 | 클라이언트 측 네트워크 | 서버 측 네트워크 |
| 주된 방향 | **outbound** 트래픽 제어 | **inbound** 트래픽 제어 |
| 대표 목적 | 접근 제어·익명성 | 로드 밸런싱·보안·성능 |

## X-Forwarded-For 헤더

Reverse Proxy가 클라이언트 IP를 내부 서버에 전달하는 표준 헤더.

```
X-Forwarded-For: 203.0.113.1, 198.51.100.2
```

여러 프록시를 거치면 쉼표로 누적. 내부 서버는 이 헤더를 읽어 실제 클라이언트 IP를 얻음. 단, **위조 가능**하므로 신뢰할 수 있는 프록시 체인일 때만.

## Load Balancer vs Reverse Proxy

- **Reverse Proxy**는 **로드 밸런싱 기능을 포함**한 상위 개념
- 전통적으로 **LB = L4(TCP 수준) 분산**, **Reverse Proxy = L7(HTTP 수준) 분산 + 캐싱 + SSL + 라우팅**
- 현대 인프라에선 경계 모호. Nginx를 LB로도 Reverse Proxy로도 씀
- AWS 용어: **NLB**(L4), **ALB**(L7, Reverse Proxy 역할)

## 함께 쓰는 패턴

대규모 시스템의 전형적 구성:
```
Client
  ↓
[CDN (엣지 캐시)]
  ↓
[WAF / DDoS 보호]
  ↓
[Load Balancer (NLB)]
  ↓
[API Gateway / Reverse Proxy (Nginx·Envoy·ALB)]
  ↓
[Application Servers]
```

각 계층이 다른 책임. Reverse Proxy는 **L7 라우팅·SSL·캐싱**, LB는 **L4 분산**, CDN은 **글로벌 엣지 캐시**.

## 흔한 혼동

### "프록시 = 캐싱"
둘 다 캐싱 기능이 있을 수 있지만 **본질은 중개**. 캐싱은 부가 기능.

### "Forward Proxy가 리버스 프록시의 반대말"
방향이 반대지, 용도가 반대인 건 아님. 둘 다 고유 가치.

### "NAT도 프록시 아닌가"
NAT는 L3 수준 주소 변환이라 엄밀히 다름. 프록시는 L7(또는 L4) 애플리케이션 레이어에서 중개.

## 면접 체크포인트

- Forward와 Reverse가 대신하는 주체 구분 (클라이언트 vs 서버)
- SSL Termination을 Reverse Proxy에서 하는 이유
- `X-Forwarded-For` 헤더의 역할과 한계 (위조 가능성)
- Load Balancer와 Reverse Proxy의 관계 (L4 vs L7)
- 회사 내부망에서 Forward Proxy를 쓰는 구체적 이유

## 출처
- [매일메일 — 포워드 프록시와 리버스 프록시](https://www.maeil-mail.kr/question/97)

## 관련 문서
- [[Load-Balancer|Load Balancer]]
- [[Reverse-Proxy|Reverse Proxy 상세]]
