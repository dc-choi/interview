---
tags: [aws, elb, alb, nlb, gwlb, load-balancer, infrastructure]
status: done
category: "Infrastructure - AWS"
aliases: ["ELB", "AWS ELB", "Elastic Load Balancer", "ALB", "NLB", "GWLB"]
verified_at: 2026-07-21
---

# ELB, Elastic Load Balancer

AWS의 관리형 부하분산 서비스. 외부, 내부 클라이언트 요청을 여러 대상에 분산하고 대상 상태를 검사한다. 일반 [[Load-Balancer]] 개념의 AWS 구현체다. 현행 선택지는 ALB, NLB, GWLB이며, 이전 세대 CLB(Classic)도 지원되지만 AWS는 기능과 워크로드에 맞춰 ALB 또는 NLB로 마이그레이션할 수 있는 도구를 제공한다.

## 공통 동작 모델

- 클라이언트는 **ELB의 DNS 주소**로 요청 → ELB가 대상 그룹(Target Group)의 정상 인스턴스로 분배
- **보안 그룹**은 ALB에 적용할 수 있고 NLB도 생성 시 보안 그룹을 연결한 구성에서 사용할 수 있다. GWLB의 보안 제어 방식은 별도다.
- 배치 방식
  - **Internet-facing**: 공인 IP + 사설 IP 부여 — 외부 노출
  - **Internal**: 사설 IP만 — 내부 마이크로서비스용
- **Listener**: 프로토콜과 포트 조합으로 수신 연결을 정의한다. 한 로드밸런서에 80, 443 같은 여러 리스너를 둘 수 있으며, 지원되는 유형에서는 규칙으로 대상 그룹을 선택한다.
- **헬스 체크**: 정상 대상에만 요청 전달. 실패하면 자동 제외 후 복구되면 재투입
- **TLS 종료** 지원: ACM 인증서로 로드밸런서가 TLS를 종료할 수 있다. 백엔드 구간을 HTTP로 둘지 다시 HTTPS로 암호화할지는 대상 그룹 구성과 보안 요구에 따라 정한다.

## Target Group (대상 그룹)

ELB가 트래픽을 보낼 **대상의 집합**.

- 대상 타입은 로드밸런서 유형마다 다르다. ALB는 `instance`, `ip`, `lambda`, NLB는 `instance`, `ip`, `alb` 등을 지원한다.
- 등록된 대상 리스트, 헬스 체크 방법(HTTP, HTTPS, TCP), 검사 주기, 정상 임계치 등을 정의
- 교차 영역 부하분산과 고정 세션의 지원 여부와 설정 위치는 로드밸런서, 대상 그룹 유형에 따라 다르다.
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

**HTTP/2 종단**: ALB는 HTTPS 리스너에서 클라이언트와 HTTP/2를 협상하고 미지원 클라이언트에는 HTTP/1.1을 사용한다. 대상 그룹의 프로토콜 버전은 HTTP/1.1, HTTP/2, gRPC 중 워크로드에 맞게 구성할 수 있으므로 백엔드가 항상 HTTP/1.1인 것은 아니다. 프로토콜 자체는 [[HTTP-2|HTTP/2]].

## NLB — Network Load Balancer

**Layer 4** (TCP/UDP/TLS) 로드밸런서. 초저지연, 고정 IP가 필요한 워크로드용.

| 속성 | 내용 |
|---|---|
| 계층 | L4 |
| 프로토콜 | TCP, UDP, TCP_UDP, TLS |
| 라우팅 기준 | 프로토콜, 5-tuple(Src IP, Port, Dst IP, Port, Proto) + TCP 시퀀스 |
| 동작 | 연결 또는 흐름 단위 해시로 대상을 선택하는 L4 부하분산 |
| 클라이언트 IP | 대상 유형과 프로토콜에 따라 원본 IP 보존을 지원하며, 필요한 메타데이터는 Proxy Protocol v2로 전달 가능 |
| Public IP | **고정** — AZ별로 Elastic IP 할당 가능 |
| Cross-Zone | 기본 비활성 (활성 시 AZ 간 데이터 처리 요금 부과) |
| SSL Offload | TLS 리스너 사용 시 가능 |

**선택 기준**: UDP 트래픽, AZ별 고정 IP 또는 Elastic IP 요구, 높은 처리량과 낮은 지연이 중요한 게임, IoT 등.

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

교차 영역 부하분산을 끄면 각 로드밸런서 노드는 자기 AZ의 정상 대상에만 트래픽을 분배한다. AZ별 대상 수가 크게 다르면 DNS 응답과 클라이언트 연결 분포에 따라 대상별 부하가 불균형해질 수 있다.

활성화하면 각 노드가 활성화된 모든 AZ의 정상 대상을 선택할 수 있다. 실제 분포는 라우팅 알고리즘, 연결 지속 시간, 대상 상태에 영향을 받으므로 항상 정확히 같은 비율이라고 보장하지 않는다.

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

대상을 등록 해제할 때 새 요청 전달을 중단하고 진행 중인 요청이나 연결이 끝날 시간을 주는 기능이다. 기본값과 허용 범위는 로드밸런서, 대상 그룹 유형의 `deregistration_delay` 속성을 확인해야 한다. 이 기능만으로 무중단이 보장되지는 않으며 애플리케이션 종료 유예, 연결 시간 제한, 배포 순서도 함께 맞춰야 한다.

## 시험 체크포인트

- **ALB vs NLB vs GWLB** 선택 — L7 라우팅 = ALB, 고정 IP/UDP = NLB, 가상 어플라이언스 = GWLB
- **Cross-Zone**: ALB는 기본 활성, **NLB는 기본 비활성** + 활성 시 AZ 간 데이터 요금
- **클라이언트 IP**: ALB는 `X-Forwarded-For`, NLB는 원본 보존
- **NLB만 고정 IP**(Elastic IP 할당 가능) — IP 화이트리스트 시나리오
- **Sticky Session**: ALB는 쿠키, NLB는 소스 IP. 외부 세션 저장소 권장
- **Connection Draining**은 진행 중 요청 종료를 돕지만 무중단을 단독 보장하지 않음
- **ACM + SSL Offload**: ALB, NLB(TLS 리스너)에서 인증서 관리 위임
- **CLB는 이전 세대** — 기존 구성은 지원되지만 신규 설계는 ALB, NLB, GWLB의 기능을 우선 검토

## 출처
- [Elastic Load Balancing 작동 방식](https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html)
- [Classic Load Balancer 마이그레이션](https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/migrate-classic-load-balancer.html)
- [Network Load Balancer 대상 그룹 속성](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/edit-target-group-attributes.html)

## 관련 문서
- [[Load-Balancer|Load Balancer 일반 개념]]
- [[HTTP-2|HTTP/2]] — ALB가 L7에서 종단하는 프로토콜
- [[VPC|AWS VPC]]
- [[EC2|EC2, AWS 코어]]
- [[CDN|CloudFront]]
- [[AWS-Cost-Optimization|AWS 비용 최적화]]
- [[RDS-Security-Group|RDS Security Group]]
