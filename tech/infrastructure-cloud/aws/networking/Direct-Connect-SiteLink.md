---
tags: [aws, networking, direct-connect, sitelink, bgp, hybrid-cloud]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["AWS Direct Connect SiteLink", "DX SiteLink", "데이터센터 간 AWS 백본 연결"]
---

# AWS Direct Connect SiteLink

SiteLink는 Direct Connect(DX) 접속 지점 사이에서 AWS 네트워크를 이용해 온프레미스 거점을 연결하는 기능이다. 거점 간 트래픽이 AWS 리전을 경유할 필요가 없으며, 이 연결만을 위해 VPC나 EC2를 만들 필요도 없다. 고객 거점에서 DX 접속 지점까지의 회선은 별도로 준비한다.

## 연결 조건과 역할

2026-10-07 공식 문서 기준이다.

- 연결할 VIF(가상 인터페이스)에 SiteLink를 켜고 같은 Direct Connect gateway(DXGW)에 연결한다.
- Transit VIF와 DXGW에 연결한 private VIF를 지원한다. Public VIF와 VGW에 직접 연결한 private VIF는 지원하지 않는다.
- 같은 AWS partition 안의 거점을 연결하며 AWS GovCloud(US)와 중국 리전에서는 사용할 수 없다. 선택한 DX 위치의 지원 여부도 확인한다.
- VPC들을 리전 안에서 묶는 [[Transit-Gateway|Transit Gateway]]와 역할이 다르다. SiteLink만 필요한 거점 간 연결에 TGW를 필수로 추가하지 않는다.

## BGP 경로 수와 터널 내부 경로를 구분한다

Private/transit VIF에서 온프레미스가 AWS에 광고하는 경로는 기본적으로 BGP 세션의 IPv4, IPv6 각각 100개다. 현재는 prefix controls로 주소군별 최대 1,000개까지 할당할 수 있다. SiteLink에도 이 설정에 따른 한도가 적용된다. 따라서 과거 자료의 100개를 지금도 변경할 수 없는 상한으로 읽으면 안 된다.

- **할당과 실제 광고는 다르다.** VIF에 예약한 수와 실제 광고 중인 경로 수를 함께 확인한다. 할당을 넘겨 광고하면 해당 BGP 세션이 DOWN/idle 상태가 된다.
- **VIF만 늘려서는 충분하지 않다.** Dedicated connection의 prefix pool과 DXGW의 합산 할당 한도도 적용된다. DXGW의 기본 총 할당 한도는 IPv4와 IPv6를 합쳐 10,000개다. 한도 상향 요청의 승인 여부는 별도로 확인한다.
- **GRE는 다른 계층의 선택이다.** SiteLink를 underlay로 쓰고 양쪽 고객 라우터 사이에 GRE 같은 overlay를 구성할 수 있다. 이때 AWS에 광고하는 터널 종단 경로와 터널 안의 고객 라우팅 세션을 분리한다. 터널 내부 경로를 DXGW에 직접 광고하는 것이 아니므로, 이를 AWS의 경로 한도 자체가 사라지는 것으로 설명하지 않는다.

마지막 항목은 overlay를 지원하는 SiteLink의 동작에서 도출한 설계 해석이다. 터널 종단 도달성, 장비의 경로 수용량과 처리 성능, 장애 시 수렴을 따로 검증한다. 먼저 필요한 경로만 광고하거나 집약할 수 있는지 확인하고, 터널이 필요한 경우에만 추가한다.

## MTU와 암호화

Private VIF의 MTU는 1500 또는 9001, transit VIF는 1500 또는 8500이다. Jumbo frame을 켜려면 기반 연결도 이를 지원해야 하며, 기반 연결 갱신으로 같은 연결의 VIF들이 최대 30초 중단될 수 있다.

터널을 추가하면 헤더가 붙으므로 양 끝 장비만 보고 MTU가 충분하다고 판단하지 않는다. 전체 경로의 유효 MTU, 큰 패킷 전달과 필요 시 TCP MSS 조정을 점검한다. 이는 터널 설계 점검 항목이며 특정 회선의 무손실 전달을 보장하지 않는다.

DX는 기본적으로 전송 트래픽을 암호화하지 않는다. AWS 내부 백본의 보호와 고객 라우터에서 DX 위치까지의 보호를 구분한다. 지원 연결의 MACsec이나 요구사항에 맞는 IPsec 구성을 검토하며, SiteLink 또는 GRE를 켰다는 사실만으로 종단 간 암호화를 충족했다고 판단하지 않는다.

## 비용과 효과를 따로 측정한다

2026-10-07 SiteLink 요금표 기준으로 활성 VIF당 시간 요금과 위치 간 GB 전송 요금이 추가된다. 트래픽이 없어도 SiteLink를 켠 VIF에는 시간 요금이 붙는다. 일반 DX 요금과 회선 사업자 비용도 별도로 확인한다.

SiteLink를 껐다고 DX 포트와 마지막 구간 회선의 비용까지 없어지는 것은 아니다. 사용량 기반 DX 포트는 트래픽이 없어도 제공된 시간에 과금되며, 사업자의 계약 조건은 별개다.

도입 평가는 아래 지표를 분리하는 방식으로 제안한다. AWS 백본을 이용한다는 사실만으로 기존 전용선보다 빠르거나 저렴하다고 결론짓지 않는다.

| 평가 축 | 확인할 증거 |
|---|---|
| 지연 | 같은 출발지와 목적지, 기간의 RTT 분포 |
| 안정성 | BGP flap, 패킷 손실, 장애 지속 시간과 우회 경로 수렴 |
| 서비스 영향 | 가까운 거점의 가용 시간과 실제 요청 지연 |
| 운영과 비용 | 변경 및 복구 작업량, 실제 전송량, 활성 VIF와 회선의 총비용 |

## 출처

- [AWS Direct Connect, Virtual interfaces and hosted virtual interfaces](https://docs.aws.amazon.com/directconnect/latest/UserGuide/WorkingWithVirtualInterfaces.html)
- [AWS Direct Connect, Direct Connect quotas](https://docs.aws.amazon.com/directconnect/latest/UserGuide/limits.html)
- [AWS Direct Connect, Inbound prefix controls](https://docs.aws.amazon.com/directconnect/latest/UserGuide/prefix-controls.html)
- [Introducing AWS Direct Connect SiteLink — AWS Networking & Content Delivery](https://aws.amazon.com/blogs/networking-and-content-delivery/introducing-aws-direct-connect-sitelink/)
- [AWS Direct Connect, Encryption in transit](https://docs.aws.amazon.com/directconnect/latest/UserGuide/encryption-in-transit.html)
- [AWS Direct Connect, SiteLink Pricing](https://aws.amazon.com/directconnect/pricing/sitelink/)
- [AWS Direct Connect, Pay-as-you-go Pricing](https://aws.amazon.com/directconnect/pricing/pay-as-you-go/)

## 관련 문서

- [[VPC-Connectivity|VPC 간 연결과 온프레미스 연결]]
- [[Transit-Gateway|AWS Transit Gateway]]
- [[networking|AWS 네트워킹 인덱스]]
