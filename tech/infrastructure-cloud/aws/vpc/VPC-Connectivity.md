---
tags: [aws, vpc, network, subnet, peering, transit-gateway, infrastructure]
status: done
category: "Infrastructure - AWS"
aliases: ["VPC Peering vs Transit Gateway", "VPC 온프레미스 연결"]
verified_at: 2026-08-05
---

# VPC 간 연결과 온프레미스 연결

## 여러 VPC 연결 — Peering vs Transit Gateway

서비스가 커지면 VPC 하나로 안 됨. 계정 분리, 환경 분리, 조직 성장, M&A로 다수 VPC가 생기고 상호 통신이 필요.

### VPC Peering

두 VPC 간 **1:1 프라이빗 연결**. 요청, 승인으로 Peering 생성 → 각 Route Table에 상대 CIDR 등록.

- **장점**: 빠르고 간단, 추가 비용 최소
- **한계**: **Transitive 불가** — A↔B, B↔C가 있어도 A↔C는 안 됨. N개 VPC 완전 연결 시 **N×(N-1)/2** 연결 필요 (10개 VPC = 45개 Peering)

### SageMaker notebook에서 다른 VPC의 RDS에 연결하기

부분 검증(2026-10-13): SageMaker AI **notebook instance**의 네트워크 문서와 VPC Peering 문서를 대조했다. Studio의 네트워크 구성에 그대로 적용하지 않는다. 아래 내용만 추가 검증했으므로 기존 `verified_at`은 유지한다.

- Peering을 `active`로 만든 뒤 notebook과 RDS가 속한 서브넷의 라우팅 테이블에 상대 주소 범위를 Peering으로 보내는 경로를 각각 둔다. 연결 승인만으로 왕복 경로가 생기지는 않는다.
- DB 포트에 필요한 notebook 측 송신과 RDS 측 수신을 보안 그룹에서 허용한다. Peering 상대의 보안 그룹 참조는 같은 리전에서 사용할 수 있다. 다른 리전의 보안 그룹은 참조할 수 없으므로 허용할 상대 CIDR 범위를 지정한다.
- Direct internet access를 켠 notebook은 고객 VPC와 서비스 관리 인터넷 경로에 각각 연결된다. 기본 OS 경로는 고객 VPC의 CIDR에 해당하는 트래픽을 고객 VPC 인터페이스로 보내고 나머지는 서비스 관리 인터넷 경로로 보낸다. 따라서 Peering 양쪽의 서브넷 경로가 맞아도 다른 VPC의 RDS로 가는 notebook 내부 경로가 잘못될 수 있다.
- 이 경우 RDS 주소 범위를 고객 VPC 인터페이스와 VPC 라우터로 보내도록 notebook의 OS 경로를 조정한다. 인터페이스명과 라우터 주소는 실제 환경에서 확인하며 예시 값을 복사하지 않는다. 수동 경로는 중지와 재시작 뒤 유지되지 않으므로 반복 적용이 필요하면 시작 시 실행하는 lifecycle configuration을 사용한다.

운영 점검 제안: DNS가 반환한 주소, notebook의 OS 경로, 양쪽 서브넷 경로, 보안 그룹과 NACL을 나누어 확인한다. TCP 포트 연결 성공과 DB 인증 및 필요한 쿼리 권한 확보는 별도로 검증한다. 재시작 뒤에도 같은 경로로 연결되는지 확인한다.

### Transit Gateway (TGW)

Hub & Spoke 구조. 모든 VPC가 **TGW 한 허브**에 연결되고, TGW가 중앙 라우팅.

| 항목 | 내용 |
|---|---|
| 연결 수 | 각 VPC가 TGW에 1번 연결 → N개 |
| 라우팅 | TGW 내부 Route Table이 대상 결정 |
| 확장성 | 신규 VPC 추가가 쉬움 |
| 대역폭 | VPC attachment당 AZ별 각 방향 최대 100 Gbps (기본값, 상향은 AWS 담당자 문의) |
| 비용 | 연결당 시간 요금 + 데이터 처리 요금 |

### 선택 기준

| 상황 | 권장 |
|---|---|
| VPC 2~3개, 관계 정적 | **Peering** |
| VPC 5개 이상, 성장 예상 | **TGW** |
| 온프레미스, 멀티 리전, VPN 통합 | **TGW** (DX Gateway, Site-to-Site VPN과 결합) |

## VPC Endpoint — NAT 비용 절감

VPC endpoint는 지원하는 AWS 서비스에 인터넷 게이트웨이나 NAT 없이 접근하는 경로를 제공한다. Gateway endpoint와 interface endpoint는 경로를 만드는 방식이 다르다.

| 유형 | 대상 | 비용 |
|---|---|---|
| **Gateway Endpoint** | S3, DynamoDB | **시간 요금과 데이터 처리 요금 없음** |
| **Interface Endpoint** (PrivateLink) | PrivateLink 통합 서비스. S3와 DynamoDB도 지원 | AZ별 시간 요금 + 데이터 처리 요금 — 엔드포인트 수와 트래픽량에 따라 NAT Gateway보다 비쌀 수 있어 비교 계산 필요 |

Private Subnet에서 S3를 자주 쓰면 Gateway Endpoint 설정만으로도 NAT 비용을 크게 줄일 수 있다. 요금 구조와 NAT 대비 비교는 [[Egress-Cost]] 참조.

### 경로 생성과 실제 사용을 구분한다

부분 검증(2026-10-13): 이 endpoint 절의 연결 방식과 요금 구조를 AWS 공식 문서로 대조했다. 다른 절의 버전 민감 주장 전체를 다시 확인하지 않았으므로 기존 `verified_at`은 유지한다.

- **Gateway endpoint:** 선택한 라우팅 테이블에 서비스의 AWS 관리 prefix list를 목적지로, endpoint를 대상으로 하는 경로가 추가된다. 사용할 서브넷의 라우팅 테이블을 연결해야 하며, endpoint 생성만으로 모든 서브넷의 경로가 바뀌지는 않는다. 이 유형은 PrivateLink를 사용하지 않는다.
- **Interface endpoint:** 선택한 서브넷에 endpoint ENI가 만들어진다. IPv4 구성에서는 private DNS와 VPC의 DNS hostnames, DNS resolution을 켜면 기본 서비스 DNS 이름이 endpoint ENI의 사설 IP로 해석된다. S3의 inbound 전용 private DNS 옵션은 별도 조건이 있으므로 같은 설정으로 일반화하지 않는다.
- **연결 허용:** interface endpoint ENI의 보안 그룹에서 호출자의 필요한 포트(HTTPS API는 TCP 443)를 허용하고 NACL의 왕복 트래픽도 확인한다. Interface endpoint는 ping에 응답하지 않으므로 ping 실패만으로 연결 장애라고 판정하지 않는다.
- **경로 해석:** AWS 서비스의 public endpoint로 인터넷 게이트웨이를 거쳐 접근하는 트래픽도 AWS 네트워크 안에 머무를 수 있다. Public endpoint라는 이름만으로 AWS 외부 인터넷망을 통과한다고 단정하지 않는다.

운영 점검 제안: gateway 방식은 서브넷의 라우팅 테이블 연결과 서비스 prefix list 경로를, interface 방식은 DNS 응답과 ENI 접근을 확인한다. 이어 실제 API 호출과 권한 검증을 수행한다. Endpoint의 생성 상태, 네트워크 연결, 서비스 작업 성공은 각각 확인하며 실제 계정에서 재현한 기록과 구분한다.

## 특정 리소스 연결 — PrivateLink와 VPC Lattice

다음은 2026-10-07 공식 문서와 대조한 리소스 연결 범위다. 앞 절의 VPC 전체 라우팅과 구분한다.

**Resource VPC endpoint**는 다른 VPC의 데이터베이스나 IP/DNS 대상 리소스에 접근하는 방식이다. 공급자의 resource configuration이 공유할 대상을 나타내고 resource gateway와 연결된다. 소비자는 자기 VPC에 endpoint를 만들며, 계정 간 공유에는 AWS RAM을 사용할 수 있다. 이 경로는 별도의 로드 밸런서를 요구하지 않는다.

- resource endpoint는 TCP를 지원하며 UDP는 지원하지 않는다.
- 연결은 소비자 endpoint VPC에서 시작한다. 공급자 리소스 VPC가 이 경로로 소비자에게 새 연결을 시작하는 것은 지원하지 않는다. 요청에 대한 응답이 없다는 뜻은 아니다.
- endpoint와 resource gateway는 적어도 한 가용 영역이 겹쳐야 한다.

**VPC Lattice service network**는 연결한 서비스와 리소스를 함께 접근하도록 구성하는 논리적 네트워크다. 리소스를 서비스 네트워크에 연결하는 것과 소비자 VPC를 연결하는 것은 별도 단계다.

| 소비자 연결 | 확인할 경계 |
|---|---|
| VPC association | 연결한 VPC의 클라이언트가 서비스 네트워크에 접근 |
| Service network VPC endpoint | endpoint를 통한 접근. Peering, TGW, VPN이나 Direct Connect를 거쳐 오는 클라이언트에도 이 연결 방식이 필요 |

네트워크 경로를 만들었다고 접근 통제가 끝나는 것은 아니다. Lattice의 서비스 네트워크 auth policy는 그 안의 **resource configuration에는 적용되지 않는다**. 서비스의 IAM 인가와 리소스 접근을 같은 정책으로 보호한다고 가정하지 않는다.

보안 그룹의 방향도 구분한다. Resource gateway의 보안 그룹은 gateway에서 리소스로 나가는 트래픽을 제어한다. 클라이언트, endpoint나 VPC association, 대상 리소스의 보안 그룹과 애플리케이션 인증을 각각 확인한다. 적용 점검에서는 DNS 응답, TCP 연결, 애플리케이션 인증 성공과 금지된 클라이언트의 접근 거절을 나눠 확인한다.

### 리전 간 PrivateLink와 장애 전환의 경계

2026-10-09 공식 문서 기준, NLB를 앞에 둔 endpoint service는 공급자가 허용한 다른 리전의 interface endpoint에서 접근할 수 있다. 이 설명을 앞 절의 resource endpoint에 그대로 적용하지 않는다.

- 공급자는 지원 리전을 설정하고 소비자는 endpoint 생성 시 서비스 리전을 선택한다. IAM의 `vpce:AllowMultiRegion` 권한도 필요하다.
- PrivateLink는 가용 영역 사이의 장애 전환을 관리하지만 리전 사이의 장애 전환은 관리하지 않는다. 다른 리전에서 접근할 수 있다는 사실만으로 서비스 리전 전체의 장애가 해결되지는 않는다.
- NLB의 TCP idle timeout을 사용자 지정한 구성과 UDP fragmentation에는 cross-Region 제약이 있다. 실제 대상 리전과 AZ의 지원 조건도 배포 전에 확인한다.

리전 장애까지 대비하려면 별도 리전의 서비스 배포, 데이터 복구와 소비자의 연결 전환을 함께 설계한다. 이는 cross-Region 연결 기능의 자동 동작이 아니라 애플리케이션 운영 책임이다.

## 온프레미스 연결 — VPN vs Direct Connect

| 옵션 | 특징 | 용도 |
|---|---|---|
| **Site-to-Site VPN** | 고객 장비와 Virtual Private Gateway 또는 TGW 사이에 IPsec 터널 구성. 공인 IP 기반 연결과 DX 위 Private IP VPN의 종단 주소를 구분 | 빠른 구축, 임시, DR 백업 경로 |
| **Direct Connect (DX)** | 표준 이더넷 광섬유 전용선. `AWS Region ↔ DX Location ↔ Customer` 경로 | 안정적 대역폭, 낮은 지연, 규제 환경 |
| **Virtual Private Gateway (VGW)** | VPN/DX의 AWS 측 종단. **단일 VPC 전용** | 단일 VPC만 연결 필요할 때 |
| **Transit Gateway** | 다수 VPC + VPN + DX 통합 허브 | 여러 VPC를 한꺼번에 온프렘과 연결 |

> 시험 포인트: **VGW는 1 VPC, TGW는 N VPC**. DX는 대역폭과 지연이 안정적이지만 **기본 암호화는 없다** — 전송 구간 암호화가 필요하면 MACsec을 지원하는 연결을 쓰거나 DX 위에 Site-to-Site VPN을 얹는다. 회선 구축에는 수 주에서 수 개월이 걸린다.

### 터널 이중화와 고객 장비 이중화

부분 검증(2026-10-13): Site-to-Site VPN의 터널, 라우팅, 고객 장비 장애 범위와 Private IP VPN의 종단 주소를 공식 문서와 대조했다.

- VPN 연결 하나에는 터널 두 개가 있다. 공인 IP 기반 Site-to-Site VPN에서는 각 AWS 터널 종단이 서로 다른 공인 IP와 AZ를 사용한다. 고객 장비에서 두 터널을 모두 구성해야 한쪽 유지보수나 장애 때 다른 터널을 사용할 수 있다.
- **Private IP VPN over Direct Connect**는 공인 IP를 쓰는 설명의 예외다. Direct Connect의 transit VIF, Direct Connect gateway와 TGW를 이용하며, IPsec 터널의 TGW 측과 고객 장비 측 종단에 사설 IP를 지정한다.
- 터널 두 개가 있어도 고객 측 장비 하나의 장애까지 해결되지는 않는다. 장비 장애에 대비하려면 별도 고객 장비와 두 번째 VPN 연결을 구성하는 방식이 있다.
- VGW 기반 이중 장비 구성에서는 두 장비가 같은 대상 IP 범위를 광고하고 BGP 경로 정보로 가용 경로를 선택하도록 설계한다. 터널 상태와 실제 선택된 경로를 함께 확인한다.
- 연결 생성 시 정적 또는 동적 라우팅을 정하고 VPC 서브넷의 라우팅 테이블도 갱신한다. VPN 연결을 만들었다는 사실만으로 애플리케이션의 왕복 통신이 보장되지는 않는다.

운영 점검 제안: 터널 하나의 중단과 고객 장비 하나의 중단을 별도 장애 시나리오로 둔다. 각각 실제 트래픽의 전환과 복구를 확인한다. 전용선의 백업으로 VPN을 사용할 때도 백업 경로 존재와 전환 성공을 구분한다.

### 이전 과도기에 계층을 나눠 둘 때

부분 검증(2026-10-13): AWS Prescriptive Guidance의 wave 계획 문서와 Direct Connect 요금 페이지를 대조했다. 아래 내용만 추가 검증했으므로 기존 `verified_at`은 유지한다. 의존성 판정과 move group, wave 구성 자체는 [[Cloud-Migration-Strategies|클라우드 마이그레이션 전략]]을 따르고, 이 절은 그 과도기에 회선이 맡는 조건만 다룬다.

- 앱 서버를 먼저 AWS로 옮기고 DB는 온프레미스에 둔 채 Direct Connect나 VPN으로 잇는 과도기 구성은 두 계층의 의존이 위치와 무관할 때만 성립한다. 같은 로컬 네트워크에서 동작하던 두 시스템이라도 앱 서버와 DB 사이 통신이 낮은 지연에 크게 의존하면 위치에 묶인 의존(hard dependency)이라, 한쪽만 옮기면 해결할 수 없는 기능이나 성능 문제가 생긴다. 이런 계층은 함께 전환한다. 지연 허용치는 네트워크 데이터만으로 판단하기 어려우므로 애플리케이션 담당자와 확인한다.
- 요청 하나가 DB를 순차로 여러 번 왕복하는 경로에서는 회선 RTT 증가분이 왕복 횟수만큼 쌓인다(설계 해석). 병렬로 보내거나 한 번에 묶는 쿼리는 그만큼 쌓이지 않는다. 운영 제안으로, 대표 요청의 쿼리 수와 실제 회선 RTT를 리허설로 측정하고 순차 왕복이 많은 경로는 분리 전에 줄이거나 DB와 함께 옮긴다.
- Active Directory, 백업과 모니터링 같은 공유 서비스는 모든 앱이 의존해 이전 묶음을 판정할 때는 빼지만, 과도기에는 AWS로 옮긴 서버도 계속 써야 한다. 회선을 통해 인증, DNS, 백업과 모니터링이 동작하는지 확인하거나 첫 이전 전에 AWS 쪽 landing zone에 준비한다(설계 제안).
- Direct Connect 요금은 연결 용량, 포트 시간과 AWS에서 나가는 전송량으로 정해진다. 포트 시간은 데이터가 흐르지 않아도 청구되고, 나가는 전송 단가는 출발 리전이나 Local Zone과 DX 위치에 따라 다르며, 들어오는 전송은 모든 DX 위치에서 GB당 0달러다. Direct Connect 파트너나 회선 사업자의 요금은 이 요금에 포함되지 않는다(2026-10-13 요금 페이지 기준, 회선 구성 비용은 [[Direct-Connect-SiteLink|Direct Connect SiteLink]] 참고). 과도기가 길어질수록 포트 비용과 양쪽 운영 부담이 쌓이므로 종료 조건을 함께 정한다(운영 제안).

운영 점검 제안: 서버를 먼저 옮기고 DB를 나중에 옮긴 사례가 있어도 이를 일반적인 순서로 삼지 않는다. 계층 사이 의존의 성격과 측정한 지연으로 판단한다. DB 전환과 롤백은 [[RDS-Zero-Downtime-Migration|RDS 무중단 마이그레이션]]을 따른다.

## 출처

- [AWS Gateway endpoints — 라우팅 테이블 연결과 PrivateLink 구분](https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html)
- [AWS PrivateLink access to AWS services — ENI, private DNS와 public endpoint 경로](https://docs.aws.amazon.com/vpc/latest/privatelink/privatelink-access-aws-services.html)
- [AWS interface VPC endpoint creation — DNS 조건, 보안 그룹과 ICMP 제한](https://docs.aws.amazon.com/vpc/latest/privatelink/create-interface-endpoint.html)
- [Amazon SageMaker AI networking — notebook instance의 기본 경로와 direct internet access](https://docs.aws.amazon.com/sagemaker/latest/dg/appendix-notebook-and-internet-access.html)
- [AWS VPC Peering routing — 양쪽 서브넷의 왕복 경로](https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-routing.html)
- [AWS VPC Peering security groups — 같은 리전 참조와 리전 간 CIDR 조건](https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-security-groups.html)
- [Understanding Amazon SageMaker notebook instance networking configurations and advanced routing options — AWS](https://aws.amazon.com/blogs/machine-learning/understanding-amazon-sagemaker-notebook-instance-networking-configurations-and-advanced-routing-options/) — 2018년 게시, 2022년 검토된 OS 경로와 lifecycle 구성 예시
- [AWS Private IP VPN over Direct Connect — 사설 IP 터널 종단과 TGW 연결](https://docs.aws.amazon.com/vpn/latest/s2svpn/private-ip-dx.html)
- [AWS Site-to-Site VPN tunnel options — 터널 두 개와 장애 전환](https://docs.aws.amazon.com/vpn/latest/s2svpn/VPNTunnels.html)
- [AWS Site-to-Site VPN redundant connections — 고객 장비 이중화](https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-redundant-connection.html)
- [AWS Site-to-Site VPN routing options — 정적, 동적 경로와 서브넷 라우팅](https://docs.aws.amazon.com/vpn/latest/s2svpn/VPNRoutingTypes.html)

- [AWS PrivateLink service sharing — cross-Region 권한과 장애 전환 경계](https://docs.aws.amazon.com/vpc/latest/privatelink/privatelink-share-your-services.html)
- [AWS PrivateLink resource access — resource endpoint 구성과 연결 제약](https://docs.aws.amazon.com/vpc/latest/privatelink/privatelink-access-resources.html)
- [AWS VPC Lattice operation — 서비스 네트워크와 소비자 연결 방식](https://docs.aws.amazon.com/vpc-lattice/latest/ug/how-it-works.html)
- [AWS VPC Lattice auth policies — resource configuration 적용 제외](https://docs.aws.amazon.com/vpc-lattice/latest/ug/auth-policies.html)
- [AWS VPC Lattice security groups — 클라이언트, 대상과 resource gateway의 방향](https://docs.aws.amazon.com/vpc-lattice/latest/ug/security-groups.html)
- [AWS Transit Gateway quotas — attachment당 AZ별 대역폭](https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-quotas.html)
- [AWS Transit Gateway pricing — attachment 시간 요금, 데이터 처리 요금](https://aws.amazon.com/transit-gateway/pricing/)
- [Amazon VPC pricing — Gateway Endpoint 무과금, NAT Gateway 요금](https://aws.amazon.com/vpc/pricing/)
- [AWS PrivateLink pricing — Interface Endpoint AZ별 시간 요금, 데이터 처리 요금](https://aws.amazon.com/privatelink/pricing/)
- [Encryption in AWS Direct Connect — 기본 미암호화, MACsec, DX 위 VPN](https://docs.aws.amazon.com/directconnect/latest/UserGuide/encryption-in-transit.html)
- [AWS Prescriptive Guidance wave planning — 위치에 묶인 의존과 지연 허용치 판단](https://docs.aws.amazon.com/prescriptive-guidance/latest/application-portfolio-assessment-guide/wave-planning.html)
- [AWS Direct Connect pricing — 연결 용량, 포트 시간과 나가는 전송량 과금, 파트너 요금 별도](https://aws.amazon.com/directconnect/pricing/)
- [\[Keynote\] 네오위즈의 클라우드 여정 Evolution for NEOWIZ — Amazon Web Services Korea](https://www.youtube.com/watch?v=2wqU_KDCLxk)

## 관련 문서

- [[RDS-Security-Group|RDS 보안 그룹 구성]]
- [[VPC-NAT-Security|NAT, 보안 그룹과 NACL]]
- [[Cloud-Migration-Strategies|클라우드 마이그레이션 전략]]
- [[RDS-Zero-Downtime-Migration|RDS 무중단 마이그레이션]]
- [[Direct-Connect-SiteLink|Direct Connect SiteLink]]
