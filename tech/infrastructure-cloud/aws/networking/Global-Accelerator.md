---
status: done
category: "Infrastructure - AWS"
tags: [aws, saa, global-accelerator, network, anycast, edge, performance]
aliases: [Global Accelerator, AGA, AWS Global Accelerator]
---

# Global Accelerator

AWS 엣지 로케이션의 **Anycast IP 2개**를 글로벌 진입점으로 제공하고, 그 뒤로 **AWS 백본 네트워크**를 통해 가까운 리전 엔드포인트(ALB/NLB/EC2/EIP)로 트래픽을 흘려보내는 L4 네트워크 가속 서비스.

## 핵심 개념

- **글로벌 진입점**: 모든 사용자에게 **고정 Anycast IP 2개** 제공. DNS 변경 없이 IP만 클라이언트에 박아 둘 수 있어 게임, VoIP, IoT처럼 DNS 캐싱이 어려운 환경에 유리.
- **AWS 백본**: 사용자는 가까운 엣지로 들어오고, 거기서부터 목적지 리전까지는 인터넷이 아니라 AWS 사설 백본을 탄다 → 지연, 지터, 패킷 손실 감소.
- **L4 가속**: TCP/UDP 둘 다 지원. HTTP/HTTPS에 국한되지 않음.
- **AWS Shield Standard 자동 통합** → Anycast IP가 DDoS 흡수면 역할.

## Anycast 기본

- Unicast는 1 IP ↔ 1 호스트. **Anycast는 동일 IP를 여러 위치에서 동시에 광고** → BGP가 가장 가까운(라우팅 비용 최소) 위치로 자동 라우팅.
- 대표 사례: Google Public DNS `8.8.8.8` (전 세계 분산).
- Global Accelerator는 엣지 로케이션에서 동일 Anycast IP를 광고 → 사용자는 자기 ISP에서 가장 가까운 엣지로 진입.

## 구성 요소

### Accelerator

- 최상위 리소스. 생성 시 **Anycast IP 2개** 자동 할당 (또는 BYOIP).
- 표준(Standard) / 사용자 지정 라우팅(Custom Routing) 2종.

### Listener

- 서비스 포트와 프로토콜 정의(TCP/UDP).
- **Client IP Preservation**: 엔드포인트가 ALB 또는 EC2일 때 활성화 가능(기본 ON). 백엔드에서 원본 클라이언트 IP를 그대로 본다. NLB, EIP 엔드포인트는 비해당.

### Endpoint Group

- **리전 단위** 그룹. 한 리스너 아래 여러 리전을 둘 수 있다.
- 리전별 옵션:
  - **Traffic Dial (0–100%)** — 그 리전으로 보낼 트래픽 비율. 점진적 페일오버, 블루/그린 리전 전환에 사용.
  - **포트 재정의(Port Override)** — 리스너 포트와 엔드포인트 포트가 다를 때 매핑.
  - **헬스 체크 설정** — 프로토콜(TCP/HTTP/HTTPS), 경로, 임계값.

### Endpoint

- 실제 트래픽이 도달할 대상. 종류: **ALB / NLB / EC2 인스턴스 / Elastic IP**.
- 그룹 내에서 **Endpoint Weight (0–255)** 로 가중치 분배.
- 헬스체크는 TCP/HTTP/HTTPS 중 선택. UDP 리스너도 상태체크는 이 3종으로.

## 동작 흐름

1. 클라이언트가 Anycast IP로 요청 발신.
2. BGP 라우팅으로 **가장 가까운 엣지 로케이션** 도착.
3. 엣지에서 AWS 백본을 타고 **헬스 OK + Traffic Dial > 0 + 가장 가까운 Endpoint Group** 선택.
4. 그룹 내에서 가중치 기반으로 **Endpoint 선택** → 트래픽 전달.
5. 엔드포인트(ALB/NLB/EC2)가 하위 인스턴스로 라우팅.

## 사용 사례

- **비-HTTP 글로벌 트래픽**: 게임 서버(UDP), VoIP/SIP, MQTT, FTP, 금융 거래 TCP.
- **고정 IP가 필요한 환경**: 엔터프라이즈 방화벽 화이트리스트, 모바일 게임 클라이언트 하드코딩.
- **글로벌 페일오버**: 멀티 리전 DR에서 Traffic Dial로 단계적 절체.
- **백본 가속**: HTTP라도 캐시 효과가 작은 동적 API에 백본 가속만 얻고 싶을 때 (CloudFront 캐시 불요).

## CloudFront와의 차이

| 항목 | Global Accelerator | CloudFront |
|---|---|---|
| 계층 | L4 (TCP/UDP) | L7 (HTTP/HTTPS, WebSocket) |
| 진입 IP | **고정 Anycast IP 2개** | 동적 IP (DNS 기반) |
| 캐싱 | 없음 | 있음 (엣지 캐시) |
| 주 용도 | 비-HTTP, 고정 IP, 백본 가속 | 정적/동적 콘텐츠 캐싱, 글로벌 웹 가속 |
| 오리진 | ALB/NLB/EC2/EIP | S3, ALB, 외부 HTTP 오리진 등 |
| 클라이언트 IP 보존 | ALB, EC2에서 옵션 | 헤더(`X-Forwarded-For`)로 전달 |
| WAF 연동 | 직접 ❌ (오리진 측에서) | 직접 ✅ |

**결정 룰**: 캐시가 의미 있는 HTTP 콘텐츠 → CloudFront. 그 외(UDP, 고정 IP, 백본만 필요) → Global Accelerator. 둘 다 쓰는 구성도 가능.

## BYOIP

- **Bring Your Own IP**: 자체 보유 IPv4 주소 범위(`/24` 이상)를 AWS로 가져와 Global Accelerator의 Anycast IP로 사용.
- 기존 IP 평판, 화이트리스트를 그대로 유지하면서 AWS로 이전할 때 유용.

## 가격

- Accelerator 시간당 고정 요금 + 데이터 전송 프리미엄(DT-Premium, 지역별 요율).
- HTTP 캐시 절감 효과가 없으므로 **CloudFront 대비 비싸질 수 있음** — 캐시 가능 워크로드면 CloudFront 우선 검토.

## 시험 체크포인트

- **고정 IP 2개**가 필요한가? → Global Accelerator. CloudFront는 동적 IP.
- **UDP/비-HTTP**? → Global Accelerator. CloudFront는 HTTP/HTTPS, WebSocket만.
- **글로벌 페일오버 / Traffic Dial**로 점진 절체 시나리오 → Global Accelerator.
- **AWS 백본을 타고 빠르게**가 키워드면 Global Accelerator.
- 엔드포인트 = **ALB / NLB / EC2 / EIP**. S3, Lambda 직접 ❌.
- **Client IP Preservation**: ALB, EC2 엔드포인트에서만, NLB, EIP는 불필요(NLB는 원래 보존).
- **Shield Standard** 자동 포함. Advanced는 별도.
- CloudFront vs AGA 결정 트리: 캐시 필요 + HTTP → CF / 그 외 + 고정 IP → AGA.

## 출처

- AWS SAA C03 학습 자료 (로컬)

## 관련 문서

- [[CloudFront]]
- [[ELB]]
- [[Route53]]
- [[VPC]]
- [[CDN]]
