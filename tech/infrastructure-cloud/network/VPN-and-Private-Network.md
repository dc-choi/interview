---
tags: [infrastructure, network, vpn, private-network, ipsec, security]
status: done
verified_at: 2026-09-29
category: "Infrastructure - 네트워크"
aliases: ["VPN", "Virtual Private Network", "가상 사설망", "프라이빗 네트워크"]
---

# VPN과 사설 네트워크

VPN(Virtual Private Network)은 공유된 기반 네트워크 위에 논리적으로 분리된 연결을 제공하는 기술이다. 기업의 인터넷 기반 원격 접속에서는 인증과 암호화로 보호한 터널을 통해 허용된 내부 자원에 접근하게 한다.

## 사설 네트워크는 물리적 폐쇄망과 다르다

사설 네트워크는 특정 조직이나 사용자가 관리하고 접근 범위를 제한하는 네트워크다. 유선 LAN뿐 아니라 무선 LAN, VLAN, 클라우드의 가상 네트워크와 여러 지점의 연결도 포함할 수 있다. 사설 IP를 사용한다는 사실과 외부 경로가 없는 폐쇄망이라는 사실은 구분한다.

내부망도 인터넷 출구나 원격 접속 경로를 둘 수 있으며, 내부 단말이 감염되거나 계정이 탈취될 수 있다. 안전성은 주소가 아니라 인증, 권한, 단말 상태와 네트워크 정책으로 확보한다. 사설 주소 대역은 [[Network-Layer]], 내부 분할은 [[IPv4-Subnetting]]을 참고한다.

## 전용 회선과 VPN

지점 연결에 전용 회선을 쓰면 통신사가 제공하는 연결과 서비스 수준을 이용할 수 있다. 사용자가 지사까지 직접 랜선을 매설한다는 뜻은 아니며, 상품에 따라 물리 경로를 공유할 수도 있다.

인터넷 VPN은 기존 인터넷 연결을 기반으로 지점이나 원격 단말을 연결한다. 전용 회선 비용을 줄일 수 있지만 인터넷 품질, 장비 처리량, 라이선스, 이중화와 운영 비용을 포함해 비교해야 한다. 항상 더 저렴하거나 같은 지연과 가용성을 보장하는 것은 아니다.

| 유형 | 연결 대상 | 주로 확인할 것 |
|---|---|---|
| 원격 접속 VPN | 사용자 단말과 조직의 VPN 게이트웨이 | 사용자/단말 인증, 허용 자원, 접속 종료와 계정 회수 |
| 사이트 간 VPN | 본사와 지사 또는 클라우드의 게이트웨이 | 대역 중복, 양방향 경로, 피어 인증과 이중화 |

## 암호화 터널의 동작

IPsec 터널 모드를 예로 들면 다음과 같다.

1. 양쪽 피어가 인증하고 보안 연결에 필요한 키와 알고리즘을 협상한다.
2. 정책에 맞는 내부 IP 패킷을 보호하고 바깥 IP 헤더로 감싼다. 인터넷의 라우터는 바깥 주소를 보고 전달한다.
3. 상대 게이트웨이가 검증과 복호화, 역캡슐화를 수행한 뒤 내부 패킷을 허용된 경로로 전달한다.

터널은 기존 보안 경계를 우회하는 면허가 아니다. VPN 게이트웨이와 방화벽을 통해 **승인된 진입 경로**를 만드는 것이므로 접속자, 목적지와 포트에 대한 정책이 필요하다. 게이트웨이에서 암호화가 끝난 뒤의 내부 구간이나 애플리케이션 데이터까지 자동으로 보호하지는 않는다.

VPN이라는 이름 자체가 암호화를 보장하지도 않는다. 예를 들어 BGP/MPLS IP VPN은 라우팅 분리를 제공하지만 암호화가 기본 전제는 아니다. 기밀성이 필요하면 실제 VPN 방식과 보호 구간을 확인한다.

## 경로와 운영상의 함정

- **전체 터널과 분할 터널**: 전체 터널은 일반적으로 모든 목적지 트래픽을 VPN으로, 분할 터널은 지정한 목적지 트래픽을 VPN으로 보낸다. 보안 정책, 인터넷 출구 용량과 로컬 네트워크 접근을 함께 검토한다.
- **대역 중복**: 집과 회사가 같은 사설 대역을 쓰면 목적지 경로가 충돌할 수 있다. 터널 연결 성공과 업무 서버 도달 성공은 별개다.
- **DNS**: 내부 이름을 해석할 DNS 서버와 질의 경로가 필요하다. VPN은 연결됐지만 내부 도메인만 실패하는 경우 DNS와 경로를 함께 본다.
- **MTU**: 터널 헤더와 보안 데이터만큼 내부 패킷의 여유가 줄어든다. 작은 요청은 되지만 큰 전송이 멈추면 [[Network-Encapsulation|PMTUD와 터널 MTU]]를 확인한다.
- **접근 권한**: MFA, 단말 보안, 최소 권한, 게이트웨이 패치와 접속 기록을 운영한다. VPN에 접속했다는 이유만으로 내부 서비스 전체를 허용하지 않는다.

VPN은 물리적으로 같은 LAN을 만드는 기술로 한정되지 않는다. L3 VPN은 서로 다른 서브넷을 라우팅으로 연결할 수 있으며, 모든 브로드캐스트나 모든 내부 서비스가 원격 단말까지 확장되는 것은 아니다.

## AWS Client VPN — 연결과 자원 접근을 따로 점검한다

2026-10-13 AWS 공식 문서 부분 대조 기준이다. 아래 주소 설정은 IPv4 클라이언트에 해당한다. 기존 메시 VPN 제품의 요금과 정책을 이번에 다시 검증한 것은 아니다.

- **주소 계획**: 클라이언트 IPv4 CIDR은 `/22`부터 `/12` 크기이며, 대상 네트워크와 VPC, 연결할 경로의 주소 대역과 겹치면 안 된다. 생성 뒤 클라이언트 주소 대역은 변경할 수 없다. 이 제한을 엔드포인트의 모든 설정이 변경 불가능하다는 뜻으로 확대하지 않는다.
- **대상 서브넷과 경로**: 대상 서브넷을 처음 연결하면 엔드포인트가 `available` 상태가 되고 VPN 연결이 가능해진다. 서브넷 연결 시 해당 VPC의 local route가 엔드포인트 라우팅 테이블에 자동 추가된다. 인가 규칙을 추가해서 경로가 생기는 것은 아니다.
- **인가**: 경로가 있어도 목적지 네트워크에 대한 authorization rule이 별도로 필요하다. 기본은 접근 거부이며, 규칙은 접근을 허용하는 방식이다. 특정 네트워크를 거부하는 규칙을 추가하는 방식이 아니다.
- **가용 영역**: 복수 대상 서브넷은 서로 다른 가용 영역에 둔다. AWS는 가용 영역 이중화를 위해 두 개 이상의 서브넷 연결을 권고한다.
- **분할 터널**: 연결할 때 엔드포인트의 경로를 클라이언트에 전달하고 그 경로에 해당하는 트래픽을 VPN으로 보낸다. 분할 터널에서 `0.0.0.0/0` 경로를 추가하면 연결 장애가 생길 수 있어 권고하지 않는다. 엔드포인트 라우팅 테이블을 수정하면 모든 클라이언트 연결이 재설정된다.

운영 점검은 터널 연결, 목적지 경로, 인가 규칙, 보안 그룹과 애플리케이션 응답을 나누어 수행한다. VPN 연결 성공만으로 내부 서비스에 필요한 접근이 모두 허용됐다고 판단하지 않는다.

## AWS Site-to-Site VPN — 터널 시작과 장애 뒤 재협상

부분 검증(2026-10-14): 아래 내용은 공인 IP 기반 연결의 IKE 시작과 DPD 동작을 AWS 공식 문서와 대조한 것이다. 다른 제품의 요금과 정책은 재검증하지 않아 기존 `verified_at`을 유지한다.

터널을 누가 처음 여는지와 상대 장비가 응답하지 않을 때 무엇을 하는지는 서로 다른 설정이다. 고객 장비가 시작하는 것이 기본값이지만, 모든 구성에서 고객 장비만 시작할 수 있는 것은 아니다.

| 설정 | 기본 동작 | 선택 가능한 변경 |
|---|---|---|
| Startup action | `Add`: 고객 장비가 IKE 협상을 시작한다 | `Start`: AWS가 시작한다. AWS 측 시작은 IKEv2만 지원하며 고객 게이트웨이의 IP 주소가 필요하다 |
| DPD timeout action | `Clear`: IKE 세션을 끝내고 터널과 경로를 정리한다 | `Restart`: IKE 세션을 다시 시작한다. `None`: 타임아웃에 별도 조치를 하지 않는다 |

AWS 측 시작을 사용할 때 고객 장비가 NAT 뒤에 있으면 IDr 설정도 확인한다. `Start`에는 연결 시도를 끝내는 타임아웃 설정이 없으므로 연결 실패를 관찰할 로그와 알람을 별도로 마련한다(운영 제안).

운영 점검은 최초 연결, 유휴 상태, DPD 타임아웃 뒤 재연결을 나누어 수행한다. 터널 두 개의 구성과 고객 장비 이중화는 [[VPC-Connectivity#터널 이중화와 고객 장비 이중화|별도 장애 범위]]다. IKE 협상 성공만으로 목적지 경로와 애플리케이션 통신까지 정상이라고 판단하지 않는다.

## 메시 VPN (오버레이 네트워크)

전통적인 원격 접속 VPN은 모든 단말이 중앙 게이트웨이를 거치는 hub-and-spoke 구조다. 메시 VPN은 단말끼리 직접 암호화 터널을 맺어, 폰, 태블릿, 노트북, 데스크톱, 홈랩 서버와 NAS를 하나의 사설 네트워크처럼 묶는다. 공유기에 포트를 열거나 공인 IP를 두지 않고도 밖에서 집의 장비에 접속할 수 있어 개인 인프라와 원격 개발에 많이 쓰인다. Tailscale이 대표적인 예다.

Tailscale 공식 설명 기준 구조는 다음과 같다.

1. **데이터 평면**: 단말 사이 트래픽은 WireGuard 암호화 터널로 흐른다. 각 단말이 자기 키 쌍을 만들고 공개 키만 공유하므로 개인 키는 단말을 떠나지 않는다.
2. **제어 평면**: 중앙 코디네이션 서버는 공개 키, 주소와 정책 같은 메타데이터만 교환하고 실제 데이터 트래픽은 거의 받지 않는다. 정책은 중앙에서 정하고 적용은 각 단말이 한다.
3. **NAT 통과와 relay**: 양쪽이 NAT나 방화벽 뒤에 있으면 STUN, ICE 방식으로 직접 경로를 찾는다 ([[IPv4-NAT-and-Traversal|NAT와 통과 전략]]). 직접 연결이 실패하면 DERP relay 서버가 이미 암호화된 패킷을 중계하므로 연결은 유지되지만 지연이 늘 수 있다.

2026-09-29 요금 페이지 기준 개인용 무료 Personal 플랜은 사용자 6명까지, 사용자 단말 수 제한 없이 대부분의 기능을 제공하며 ACL 그룹 3개 등 일부 한도가 있다. 한도는 바뀔 수 있으므로 도입 시 다시 확인한다.

활용 예로는 밖에서 폰의 SSH 터미널 앱으로 집 데스크톱에 접속해 코딩 에이전트 세션을 이어 가거나, NAS 파일을 운영체제와 무관하게 주고받는 구성이 있다.

보안 점검은 기존 VPN과 같은 원칙을 따른다.

- **접근 제어(ACL)**: 기본 정책이 모든 단말 간 통신을 허용하는지 확인하고, 단말과 태그별로 필요한 포트만 열어 둔다. 개인 기기가 뚫리면 메시 전체가 노출될 수 있다.
- **키 만료**: 단말 키는 기본 180일 뒤 만료돼 재인증을 요구한다. 손대기 어려운 서버나 NAS만 만료를 끄고, 개인 단말은 만료를 유지한다.
- **분실과 회수**: 잃어버린 기기와 쓰지 않는 단말은 관리 콘솔에서 즉시 제거한다.
- **노출 범위**: 서브넷 라우터나 exit node로 LAN 전체나 인터넷 출구를 공유하면 위의 전체 터널, 대역 중복과 DNS 함정이 그대로 적용된다.

## 출처

AWS Client VPN 절은 2026-10-13 아래 AWS 공식 문서와 대조했다. 다른 절의 검증 기준은 기존 기록을 유지한다.

- [IETF, RFC 4301: Security Architecture for the Internet Protocol](https://www.rfc-editor.org/rfc/rfc4301.html)
- [IETF, RFC 4364: BGP/MPLS IP Virtual Private Networks](https://www.rfc-editor.org/rfc/rfc4364.html)
- [NIST, SP 800-46 Rev. 2: Guide to Enterprise Telework, Remote Access, and BYOD Security](https://csrc.nist.gov/pubs/sp/800/46/r2/final)
- [How Tailscale works — Tailscale Blog](https://tailscale.com/blog/how-tailscale-works)
- [Tailscale, Pricing](https://tailscale.com/pricing)
- [Tailscale Docs, Key expiry](https://tailscale.com/kb/1028/key-expiry)
- [AWS Client VPN, Create an AWS Client VPN endpoint](https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-endpoint-create.html)
- [AWS Client VPN, AWS Client VPN target networks](https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-target.html)
- [AWS Client VPN, AWS Client VPN authorization rules](https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-rules.html)
- [AWS Client VPN, Split-tunnel on AWS Client VPN endpoints](https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/split-tunnel-vpn.html)
- [AWS Site-to-Site VPN, AWS Site-to-Site VPN tunnel initiation options](https://docs.aws.amazon.com/vpn/latest/s2svpn/initiate-vpn-tunnels.html) — 2026-10-14 IKE 시작 주체, IKEv2와 NAT 조건 대조
- [AWS Site-to-Site VPN, Configure tunnel options for AWS Site-to-Site VPN](https://docs.aws.amazon.com/vpn/latest/s2svpn/tunnel-configure.html) — 2026-10-14 Startup action과 DPD timeout action 대조

## 관련 문서

- [[Network-Layer|사설 IP와 라우팅]]
- [[IPv4-Subnetting|서브넷팅과 주소 관리]]
- [[IPv4-NAT-and-Traversal|NAT와 통과 전략]]
- [[Routing-Table-and-Interface-Selection|목적지별 경로 선택]]
- [[DNS|이름 해석과 DNS 보안]]
- [[Network-Separation|망분리와 망연계 (물리적, 논리적 분리)]]
- [[인프라네트워크(InfraNetwork)|인프라 네트워크 인덱스]]
