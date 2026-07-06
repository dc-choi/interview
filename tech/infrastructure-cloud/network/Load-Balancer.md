---
tags: [infrastructure, load-balancer, dns, proxy, spof, gslb, health-check]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Load Balancer", "로드밸런서", "GSLB", "Global Server Load Balancing"]
---

# Load Balancer

## SPOF (Single Point of Failure)

노드 하나가 망가지면 시스템 전체가 멈추는 단일 실패 지점. 해결: 레플리카, 클러스터, 스케일아웃.

## 스케일 업 vs 스케일 아웃

| 방식 | 설명 |
|------|------|
| 스케일 업 | 서버 머신의 스펙을 높이는 방법 |
| 스케일 아웃 | 서버 머신의 수를 늘리는 방법 |

유저가 많아지면 스케일 업으로 해결이 안됨. 스케일 아웃 필수.

## 네트워크 스위치 계층

| 계층 | 이름 | 역할 |
|------|------|------|
| L1 | 더미 허브 | 모두 전송 |
| L2 (MAC) | 스위칭 허브 | 정확한 목적지에만 전송 |
| L3 (IP) | 라우터 | 다른 네트워크로 패킷 전송 가능 |
| L4 (TCP) | L4 스위치 | **부하 분산 가능** |
| L7 (HTTP) | L7 스위치 | 프로토콜 정보까지 인식하여 부하 분산 |

- 라우터: 서로 다른 네트워크 간 통신 지원. 비쌈
- 스위치: 같은 네트워크 안에서 통신. 라우터보다 저렴

## 로드밸런서

부하 분산을 해주는 장치의 통칭. 예: HA Proxy

### 부하 분산 기준
- TCP 커넥션(L4), 트래픽, 가중치, HTTP 요청 수(L7)

### 분산 알고리즘 상세

대부분의 LB는 몇 개의 알고리즘을 조합해서 선택한다. 단순한 것부터 복잡한 것 순으로.

| 알고리즘 | 동작 | 장점 | 단점 |
|---|---|---|---|
| **Round Robin** | 순번대로 배분 | 구현 단순, 중간값 지연 양호 | 서버 상태 무시. 이질적 서버, 느린 요청에서 과부하 서버에도 전달 |
| **Weighted Round Robin** | 가중치 비율로 배분 | 스펙 차이 반영 | 가중치를 수동 튜닝해야 함 |
| **Dynamic Weighted RR** | 응답 지연 기반 가중치 자동 산정 | 런타임 변화에 적응 | 측정 잡음, 피드백 지연 |
| **Least Connections** | 활성 연결이 가장 적은 서버 선택 | 유휴 자원을 잘 활용, 긴 요청, 긴 세션에 강함 | 연결 수 ≠ 실제 부하일 수 있음 |
| **Least Response Time** | 연결 수 + 최근 응답 시간 종합 | 지연 민감 워크로드에 유리 | 구현, 측정 비용 증가 |
| **Power of Two Choices** | 무작위 2개 서버 중 연결 수 적은 쪽 선택 | 전역 상태 없이도 좋은 균형(이론적으로 증명) | 랜덤성 필요 |
| **PEWMA** | 지연의 지수 이동 평균을 가중치로 | P95, P99 테일 지연이 최고 | 복잡, 튜닝 필요 |
| **IP Hash / Consistent Hash** | 클라이언트 IP, 키 해시로 서버 고정 | 캐시 친화, 세션 sticky | 서버 추가/제거 시 재해싱 비용(Consistent Hash로 완화) |

### 알고리즘 선택 가이드

- **요청이 등질, 짧음** → Round Robin로 충분. 추가 기계가 할 일을 만들지 않음
- **요청 길이, 비용 편차 큼** → Least Connections 또는 Power of Two
- **지연 테일(P99) 중요** → PEWMA, Least Response Time
- **세션 sticky 필요** → IP Hash 또는 쿠키 기반(L7). 단, 서버 장애 시 sticky 키 재연결 고려
- **전역 상태를 두기 싫음** → Power of Two Choices — 완벽하진 않지만 Round Robin보다 명확히 낫다

### 핵심 트레이드오프

- **중간값(P50) 지연 vs 테일(P99) 지연** — Round Robin은 P50 좋지만 P99 나쁨
- **단순성 vs 적응성** — 더 똑똑한 알고리즘은 측정, 튜닝 비용을 동반
- **요청 손실 vs 지연** — 큐를 길게 허용하면 손실↓ 지연↑, 짧게 자르면 반대

### 헬스 체크 방식
- TCP 연결 가능 여부만 확인
- 헬스 체크 API를 만들어 요청/응답 확인
- API 내부 코드에 따라 더 엄격한 검증 가능

### 세션 분산 문제
- **비일관적 분산**: 로그인 세션을 웹 서버 자체 메모리에 캐싱하면 다른 서버로 요청 시 재로그인 → **Redis에 세션 저장**
- **IP 기반 고정 분산**: 모바일 IP 변경 시 문제 → 역시 Redis에 캐싱
- **보장된 분산**: HTTP 헤더 특정 정보로 같은 서버로 분산 보장 시 서버 자체 메모리 캐싱 가능 (Redis보다 빠른 접근이 필요한 경우)

## DNS

### DNS Round Robin
- DNS에 도메인으로 여러 서버 IP(로드밸런서들의 IP)를 등록
- 순번대로 돌아가면서 DNS Resolve

### 문제와 해결
- **문제 1**: DNS Resolve된 IP가 TTL 시간만큼 캐싱됨. IP 추가/삭제/변경 전파에 TTL만큼 소요 → TTL을 짧게 (20초~1분)
- **문제 2**: 단순 순서대로 IP 전달이라 특정 노드로 트래픽이 몰릴 수 있음

### GSLB (Global Server Load Balancing)

단순 DNS Round Robin의 한계를 넘어, **전 세계 여러 리전의 서버 중 사용자에게 가장 적절한 서버를 선택**해 주는 방식. DNS 기반으로 구현되는 경우가 많지만(Route 53 라우팅 정책 등) 단순 DNS와는 목적과 기능의 깊이가 다르다.

- **선택 기준**: 지리적 근접성만이 아니라 서버 상태(헬스 체크), 부하, 네트워크 품질, 장애 여부를 종합
- **헬스 체크 기반 페일오버**: 서울 리전이 응답하지 않으면 그 IP를 응답에서 제외하고 부산 등 다른 리전으로 유도 — 사용자에게는 서비스 전체 장애가 아니라 일시적 지연으로 보임
- IP별 **가중치** 분산, 위치 기반 라우팅 (AWS 구현은 [[Route53]] 라우팅 정책)
- **리전 간 이동의 전제 조건**: 어느 서버로 가도 로그인이 유지되어야 함 → 세션 외부 저장소(Redis) 분리 또는 JWT (위 세션 분산 문제와 같은 축)

## 프록시

### Forward Proxy
- 일반적으로 "프록시"라고 하면 포워드 프록시
- 내 IP를 서버에 남기고 싶지 않을 때, 특정 IP만 접속 허용할 때 사용

### Reverse Proxy
- 로드밸런서로 많이 사용 (부하 분산)
- 외부 서비스에 허가된 IP만 등록해야 할 때, 웹 서버는 여러 대인데 IP는 하나만 등록한 경우

### Database Proxy
- DB 커넥션은 제한이 있음. 중간에 프록시를 두어 커넥션을 조율
- **서버리스 환경**에서 특히 필요. 커넥션 수가 얼마나 생길지 모르기 때문
- DB와 웹 서버 중간에 프록시가 필요

## 출처
- [Tecoble — 로드 밸런싱이란](https://tecoble.techcourse.co.kr/post/2021-11-07-load-balancing/)
- [samwho.dev — Load Balancing](https://samwho.dev/load-balancing/)
- [devpill — 로드 밸런싱 알고리즘 5가지 전략](https://maily.so/devpill/posts/67aebb20)
- [웹 브라우저 URL 입력 과정과 인프라 흐름 — YouTube 강의](https://www.youtube.com/watch?v=GAyZ_QgYYYo&list=PLXvgR_grOs1DEoZFABFCjo7dsXt1BhVih)

## 관련 문서
- [[IaC|IaC]]
- [[Reverse-Proxy|Reverse Proxy]]
- [[Realtime-Chat-Architecture|실시간 채팅 아키텍처]]
- [[Route53|Route 53 (라우팅 정책, 헬스 체크)]]
- [[Browser-URL-Flow|브라우저 URL 입력 프로세스]]
- [[Network-Perimeter-Security|네트워크 경계 보안 (공인 IP 배치, UTM, WAF)]]
