---
tags: [infrastructure, load-balancer, dns, proxy, spof, gslb, health-check]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Load Balancer", "로드밸런서", "GSLB", "Global Server Load Balancing"]
verified_at: 2026-08-31
---

# Load Balancer

## SPOF (Single Point of Failure)

노드 하나가 망가지면 시스템 전체가 멈추는 단일 실패 지점. 해결: 레플리카, 클러스터, 스케일아웃.

## 스케일 업 vs 스케일 아웃

| 방식 | 설명 |
|------|------|
| 스케일 업 | 서버 머신의 스펙을 높이는 방법 |
| 스케일 아웃 | 서버 머신의 수를 늘리는 방법 |

스케일 업에는 장비 한계, 비용, 단일 장애 지점 문제가 있다. 고가용성과 탄력적 용량이 필요하면 스케일 아웃을 함께 설계하며, 두 방식은 병행할 수 있다.

## 네트워크 스위치 계층

| 계층 | 이름 | 역할 |
|------|------|------|
| L1 | 물리 계층 | 신호 전달 |
| L2 (MAC) | 스위치 | 링크 계층 주소로 프레임 전달 |
| L3 (IP) | 라우터 | 서로 다른 네트워크 사이에서 패킷 전달 |
| L4 (TCP/UDP) | 전송 계층 로드밸런서 | 연결과 5-tuple 같은 전송 계층 정보로 대상 선택 |
| L7 (HTTP 등) | 애플리케이션 계층 프록시 | 호스트, 경로, 헤더 같은 애플리케이션 정보로 대상 선택 |

L4와 L7은 대상 선택에 어떤 정보를 쓰는지 설명하는 분류다. 실제 장비와 소프트웨어는 여러 계층 기능을 함께 제공할 수 있다.

## 로드밸런서

클라이언트 요청을 여러 대상에 분배하는 기능의 통칭. 전용 장비, 소프트웨어 프록시(예: HAProxy), 클라우드 관리형 서비스가 될 수 있다.

### 부하 분산 기준
- L4에서는 연결, 흐름 해시, 활성 연결 수 같은 전송 계층 정보
- L7에서는 HTTP 요청, 경로, 헤더, 쿠키, 대상 상태 같은 애플리케이션 정보
- 실제 기준과 단위는 제품, 프로토콜, sticky session 설정에 따라 다름

### 분산 알고리즘 상세

지원하는 알고리즘과 의미는 제품마다 다르다. 한 대상 그룹에 하나를 고르는 제품도 있고, sticky session은 최초 선택 뒤의 라우팅을 바꿀 수 있다.

| 알고리즘 | 동작 | 장점 | 단점 |
|---|---|---|---|
| **Round Robin** | 순번대로 배분 | 구현 단순, 대상과 요청이 비슷할 때 예측 가능 | 실제 처리 비용과 활성 연결을 반영하지 않음 |
| **Weighted Round Robin** | 가중치 비율로 배분 | 스펙 차이 반영 | 가중치를 수동 튜닝해야 함 |
| **Dynamic Weighted RR** | 측정값으로 가중치를 갱신 | 런타임 변화에 적응 가능 | 구현과 측정 기준이 제품별로 다름 |
| **Least Connections** | 활성 연결이 가장 적은 서버 선택 | 유휴 자원을 잘 활용, 긴 요청, 긴 세션에 강함 | 연결 수 ≠ 실제 부하일 수 있음 |
| **Least Response Time** | 연결 수와 최근 응답 시간 등을 사용 | 지연을 반영할 수 있음 | 측정 기준과 비용이 제품별로 다름 |
| **Power of Two Choices** | 무작위 두 대상 중 부하가 낮은 쪽 선택 | 적은 상태 정보로 분산 가능 | 부하 추정 방식에 따라 결과가 달라짐 |
| **P2C + Peak EWMA** | 두 대상을 뽑고 최근 RTT와 미완료 요청 수로 계산한 점수가 낮은 쪽을 선택하는 Finagle 방식 | 느려진 대상의 최근 변화를 반영 | long polling 같은 부하와 decay 설정은 별도 검증 필요 |
| **IP Hash / Consistent Hash** | 클라이언트 IP, 키 해시로 서버 고정 | 캐시 친화, 세션 sticky | 서버 추가/제거 시 재해싱 비용(Consistent Hash로 완화) |

### 알고리즘 선택 가이드

- **요청과 대상이 비슷함** → Round Robin을 출발점으로 두고 실제 지연과 오류율을 측정
- **요청 길이, 비용 편차 큼** → 제품이 제공하는 활성 요청, 연결 수, 가중치 기반 정책을 검토
- **지연 테일(P99) 중요** → 후보 알고리즘을 같은 부하에서 측정해 선택
- **세션 sticky 필요** → 쿠키나 키 기반 정책을 검토하고, 대상 장애와 재배치 시 동작을 함께 설계

### 핵심 트레이드오프

- **중간값(P50) 지연 vs 테일(P99) 지연** — 알고리즘의 일반 특성이 아니라 요청 편차, 대상 상태, 큐잉을 함께 측정
- **단순성 vs 적응성** — 더 똑똑한 알고리즘은 측정, 튜닝 비용을 동반
- **요청 손실 vs 지연** — 큐를 길게 허용하면 손실↓ 지연↑, 짧게 자르면 반대

### 헬스 체크 방식
- TCP 연결 가능 여부 확인
- 헬스 체크 API의 응답 확인
- 트래픽을 받을 준비가 됐는지 확인하는 범위에서 의존성 검사와 실패 기준을 정함

헬스 체크가 실패한 대상을 어떻게 다루는지는 제품과 설정에 따라 다르다. 예를 들어 모든 대상이 unhealthy일 때 fail-open 하는 구현도 있으므로, 장애 시 실제 라우팅을 운영 환경에서 확인한다.

### 세션 분산 문제
- **로컬 세션 상태**: 웹 서버 메모리에만 로그인 세션을 두면 다른 서버로 간 요청이 세션을 찾지 못할 수 있음 → 공유 세션 저장소 또는 sticky session을 검토
- **IP 기반 고정 분산**: 모바일 IP 변경, NAT 공유, 프록시 환경에서 안정적 식별자가 아닐 수 있음
- **쿠키나 키 기반 고정 분산**: 같은 대상을 고를 수 있지만 대상 장애와 재배치에서는 세션 복구 경로가 필요

## DNS

### DNS Round Robin
- DNS에 하나의 이름으로 여러 IP를 등록할 수 있음
- 응답 순서와 클라이언트의 IP 선택은 리졸버와 클라이언트 구현에 따라 달라지며, DNS는 요청마다 수행하는 정밀한 부하 분산 장치가 아님

### 문제와 해결
- **문제 1**: DNS 응답은 TTL 동안 캐시될 수 있어 IP 추가, 삭제, 변경이 모든 클라이언트에 즉시 반영되지 않음 → 허용 가능한 변경, 페일오버 지연과 질의량을 함께 보고 TTL 선택
- **문제 2**: 리졸버 캐시, 응답 순서와 클라이언트의 IP 선택 때문에 트래픽이 고르게 분산된다고 보장할 수 없음

### GSLB (Global Server Load Balancing)

단순 DNS Round Robin보다 풍부한 정책으로 여러 리전과 엔드포인트를 선택하는 방식. DNS 기반 구현이 많지만, 어떤 신호를 쓸 수 있는지와 전환 동작은 제품과 구성에 따라 다르다.

- **선택 기준**: 지리, 지연, 서버 상태, 가중치 같은 신호를 조합할 수 있음
- **헬스 체크 기반 페일오버**: 장애 리전의 DNS 응답을 줄이거나 다른 리전으로 유도할 수 있다. 다만 감지 시간과 기존 DNS 캐시 때문에 모든 사용자의 즉시 전환을 보장하지 않는다.
- IP별 **가중치** 분산, 위치 기반 라우팅 (AWS 구현은 [[Route53]] 라우팅 정책)
- **리전 간 이동의 전제 조건**: 어느 서버로 가도 인증과 상태가 이어져야 한다. 공유 세션 저장소, stateless 토큰, 복제 전략 중 서비스 요구에 맞는 방식을 선택한다.

## 프록시

### Forward Proxy
- 클라이언트 측에서 외부 요청을 대신 보내는 중계자
- egress 제어, 접근 정책, 캐시, 프라이버시 같은 목적에 따라 사용. 원격 서버에는 일반적으로 프록시의 출발지 IP가 보임

### Reverse Proxy
- 서비스 앞에서 요청을 받아 백엔드로 전달하는 중계자
- 부하 분산, TLS 종료, 경로 기반 라우팅, 단일 공개 엔드포인트 제공 등에 활용

### Database Proxy
- DB 커넥션 수와 인증, 라우팅을 조율할 수 있는 중계 계층
- 서버리스에서 급격한 연결 증가를 다루는 선택지가 될 수 있지만, 항상 필요한 것은 아니다. DB, 드라이버, 풀 설정, 트래픽을 함께 보고 결정한다.

## 출처
- [AWS Elastic Load Balancing, How Elastic Load Balancing works](https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html)
- [AWS Elastic Load Balancing, Health checks for Application Load Balancer target groups](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html)
- [AWS Elastic Load Balancing, Target group health and DNS failover](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html)
- [AWS Route 53, Choosing TTL values for DNS records](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/best-practices-dns.html#best-practices-dns-choosing-ttl-values)
- [HAProxy, Backend load balancing algorithms](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/configuration-basics/backends/)
- [Finagle, Clients: Load Balancing](https://twitter.github.io/finagle/guide/Clients.html#load-balancing)

## 관련 문서
- [[IaC|IaC]]
- [[Reverse-Proxy|Reverse Proxy]]
- [[Realtime-Chat-Architecture|실시간 채팅 아키텍처]]
- [[Route53|Route 53 (라우팅 정책, 헬스 체크)]]
- [[Browser-URL-Flow|브라우저 URL 입력 프로세스]]
- [[Network-Perimeter-Security|네트워크 경계 보안 (공인 IP 배치, UTM, WAF)]]
