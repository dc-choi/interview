---
tags: [aws, elb, alb, nlb, gwlb, load-balancer, infrastructure]
status: done
category: "Infrastructure - AWS"
aliases: ["ELB", "AWS ELB", "Elastic Load Balancer", "ALB", "NLB", "GWLB"]
---

# ELB, Elastic Load Balancer

AWS의 관리형 **L4/L7 부하분산** 서비스. 외부, 내부 클라이언트 요청을 VPC 내 가용영역의 EC2(또는 IP, Lambda 등)로 분산하고 대상 상태를 검사한다. 일반 [[Load-Balancer]] 개념의 AWS 구현체. ALB, NLB, GWLB 3가지 타입으로 구성되며 **CLB(Classic)는 지원 종료**.

## 공통 동작 모델

- 클라이언트는 **ELB의 DNS 주소**로 요청 → ELB가 대상 그룹(Target Group)의 정상 인스턴스로 분배
- VPC 내 리소스로 **보안그룹 적용 가능** (ALB, NLB 한정 — GWLB는 별도)
- 배치 방식
  - **Internet-facing**: 공인 IP + 사설 IP 부여 — 외부 노출
  - **Internal**: 사설 IP만 — 내부 마이크로서비스용
- **Listener**: 수신 포트당 1개. ELB 하나에 80, 443 리스너 동시 등록 가능 → 각 리스너가 어느 Target Group으로 보낼지 룰 보유
- **헬스 체크**: 정상 대상에만 요청 전달. 실패하면 자동 제외 후 복구되면 재투입
- **SSL Offload** 지원: ACM 인증서로 ELB가 TLS 종료(termination) → 백엔드 EC2는 HTTP만 처리

## Target Group (대상 그룹)

ELB가 트래픽을 보낼 **대상의 집합**.

- 대상 타입: `instance` / `ip` / `lambda` / `alb`(NLB만)
- 등록된 대상 리스트, 헬스 체크 방법(HTTP, HTTPS, TCP), 검사 주기, 정상 임계치 등을 정의
- 속성 항목에 **Cross-Zone Load Balancing**, **Sticky Session** 등 설정 위치
- 하나의 ELB가 여러 Target Group을 가질 수 있고, 리스너 룰로 라우팅 분기

## ALB — Application Load Balancer

**Layer 7** (HTTP/HTTPS) 로드밸런서. 마이크로서비스, 웹 트래픽의 기본 선택지.

| 속성 | 내용 |
|---|---|
| 계층 | L7 |
| 프로토콜 | HTTP, HTTPS, gRPC, WebSocket |
| 라우팅 기준 | HTTP Header, Method, Host, Path, Query, Source IP |
| SSL Offload | **ACM 통합** 지원 |
| Cross-Zone | 기본 활성 (요금 부과 없음) |
| 클라이언트 IP | **`X-Forwarded-For` 헤더**로 전달 (Source IP는 ALB Private IP로 치환) |
| Public IP | **유동적** — 변경됨, DNS 이름으로 접근 필요 |
| 대상 | EC2, IP, Lambda, 컨테이너 |

**라우팅 예시**: User-Agent가 Android면 모바일 전용 Target Group으로 전달, `/api/*` 경로는 API 그룹으로, 그 외는 정적 페이지 반환.

## NLB — Network Load Balancer

**Layer 4** (TCP/UDP/TLS) 로드밸런서. 초저지연, 고정 IP가 필요한 워크로드용.

| 속성 | 내용 |
|---|---|
| 계층 | L4 |
| 프로토콜 | TCP, UDP, TCP_UDP, TLS |
| 라우팅 기준 | 프로토콜, 5-tuple(Src IP, Port, Dst IP, Port, Proto) + TCP 시퀀스 |
| 동작 | TCP 헤더 조작 없음. **3-way handshake만 대리** |
| 클라이언트 IP | **원본 그대로 전달** (Source IP 보존) — Proxy Protocol v2도 지원 |
| Public IP | **고정** — AZ별로 Elastic IP 할당 가능 |
| Cross-Zone | 기본 비활성 (활성 시 AZ 간 데이터 처리 요금 부과) |
| SSL Offload | TLS 리스너 사용 시 가능 |

**선택 기준**: UDP 트래픽, 고정 IP 화이트리스트 필요, 극단적 처리량(수백만 RPS), 게임/IoT 등.

## GWLB — Gateway Load Balancer

**Layer 3** 로드밸런서. **서드파티 보안 어플라이언스**(방화벽, IDS/IPS, DPI) 부하분산 전용으로 탄생.

- 리스너 포트 없음 — 모든 IP 트래픽 그대로 전달
- 대상 그룹 인스턴스와 **Geneve Protocol(UDP 6081)** 가상 터널로 통신
- 트래픽이 GWLB → 보안 어플라이언스 통과 → 다시 GWLB → 목적지로 흐름
- 시험 포인트: "3rd-party 가상 어플라이언스, 인라인 패킷 검사" 키워드가 나오면 GWLB

## ELB 타입 비교 요약

| 항목 | ALB | NLB | GWLB |
|---|---|---|---|
| OSI 계층 | L7 | L4 | L3 |
| 프로토콜 | HTTP/HTTPS/gRPC | TCP/UDP/TLS | IP (Geneve) |
| 라우팅 룰 | Host, Path, Header 등 | 5-tuple | 패킷 단위 |
| 클라이언트 IP 보존 | X-Forwarded-For | 원본 보존 | 원본 보존 |
| Public IP | 유동 | **고정** | N/A |
| 주 용도 | 웹, API, MSA | 게임, IoT, 고정IP 요건 | 3rd-party 보안 어플라이언스 |

## Sticky Session (스티키 세션)

특정 클라이언트의 후속 요청을 **이전에 처리한 동일 EC2**로 다시 보내는 기능.

- ALB: 쿠키 기반 (AWS 생성 쿠키 또는 애플리케이션 쿠키)
- NLB: 소스 IP 기반
- 세션 상태를 서버 메모리에 두는 레거시 앱에 사용. 가능하면 **세션을 Redis, DynamoDB로 외부화**해 ELB는 무상태로 운영하는 게 모범 사례

## Cross-Zone Load Balancing (교차 영역 로드밸런싱)

기본 ELB는 **AZ별로 트래픽 비율을 50:50**으로 나눈다. AZ-a에 EC2 2대, AZ-b에 EC2 8대면 a 쪽 2대가 b 쪽 8대와 동일한 부하를 받아 a가 과부하.

활성화하면 **EC2 개수 기반으로 균등 분배** — 위 예에서 10대 모두에 10%씩.

| ELB | 기본값 | 활성 시 비용 |
|---|---|---|
| ALB | **활성** | 무료 (AZ 간 데이터 처리 비용 없음) |
| NLB | **비활성** | AZ 간 데이터 처리 요금 부과 |
| GWLB | 비활성 | AZ 간 데이터 처리 요금 부과 |

## X-Forwarded-For

L7(ALB)에서 클라이언트 원본 IP를 EC2가 알 수 있도록 ELB가 자동 주입하는 HTTP 헤더.

```
X-Forwarded-For: <client-ip>, <proxy1-ip>, <proxy2-ip>
```

L4(NLB)는 헤더가 없는 대신 **Source IP 자체를 보존**하거나 Proxy Protocol v2로 전달.

## Connection Draining (Deregistration Delay)

Auto Scaling으로 EC2가 종료되거나 대상 그룹에서 제외될 때, **진행 중인 요청을 마칠 때까지 일정 시간 대기** 후 종료. 기본 300초, 0~3600초 설정. 너무 짧으면 사용자가 502를 보고, 너무 길면 스케일 인 지연.

## 시험 체크포인트

- **ALB vs NLB vs GWLB** 선택 — L7 라우팅 = ALB, 고정 IP/UDP = NLB, 가상 어플라이언스 = GWLB
- **Cross-Zone**: ALB는 기본 활성, **NLB는 기본 비활성** + 활성 시 AZ 간 데이터 요금
- **클라이언트 IP**: ALB는 `X-Forwarded-For`, NLB는 원본 보존
- **NLB만 고정 IP**(Elastic IP 할당 가능) — IP 화이트리스트 시나리오
- **Sticky Session**: ALB는 쿠키, NLB는 소스 IP. 외부 세션 저장소 권장
- **Connection Draining**으로 무중단 배포, 스케일 인 보장
- **ACM + SSL Offload**: ALB, NLB(TLS 리스너)에서 인증서 관리 위임
- **CLB는 deprecated** — 신규 설계 시 선택지에서 제외

## 출처
- AWS SAA C03 학습 자료 (로컬)

## 관련 문서
- [[Load-Balancer|Load Balancer 일반 개념]]
- [[VPC|AWS VPC]]
- [[EC2|EC2, AWS 코어]]
- [[CDN|CloudFront]]
- [[AWS-Cost-Optimization|AWS 비용 최적화]]
- [[RDS-Security-Group|RDS Security Group]]
