---
tags: [web, network, osi, unicast, broadcast, multicast, anycast, igmp, l2, l3]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["Unicast Broadcast Multicast", "유니캐스트 브로드캐스트 멀티캐스트", "전송 방식", "브로드캐스트", "멀티캐스트", "IGMP", "애니캐스트", "Anycast"]
verified_at: 2026-09-16
---

# 유니캐스트, 브로드캐스트, 멀티캐스트: 수신 대상의 범위

전달 방식은 하나의 데이터그램이 **몇 개의 목적지에 도달하도록 의도됐는지**로 나뉜다. 주소 자체가 대상 범위를 결정하므로 이 구분은 IP 주소와 MAC 주소의 값에 직접 대응한다. L2 전달과 브로드캐스트 도메인의 상세는 [[Physical-DataLink-Layer]], L3 주소 체계와 라우팅은 [[Network-Layer]].

한 줄 요약: **유니캐스트는 지정 배송, 브로드캐스트는 전단지 전체 투입, 멀티캐스트는 구독 신청자에게만 배송이다. 셋을 가르는 것은 전송 기술이 아니라 목적지 주소다.**

## 세 방식 비교

| 구분 | 유니캐스트 | 브로드캐스트 | 멀티캐스트 |
|---|---|---|---|
| 수신 대상 | 특정 인터페이스 하나 | 해당 범위의 모든 호스트 | 그룹에 가입한 호스트들 |
| IPv4 주소 | 일반 호스트 주소 | `255.255.255.255` 또는 호스트 비트가 전부 1 | `224.0.0.0` ~ `239.255.255.255` (상위 4비트 `1110`) |
| 이더넷 MAC | 대상의 고유 MAC | `FF:FF:FF:FF:FF:FF` | `01:00:5E`로 시작하는 매핑 주소 |
| 라우터 통과 | 라우팅된다 | 기본적으로 통과하지 않는다 | 멀티캐스트 라우팅이 구성된 경우에만 |
| 송신 부하 | 수신자 수에 비례 | 1회 | 1회 (경로에서 복제) |
| 대표 용도 | 일반 통신 전부 | ARP, DHCP 탐색 | IPTV, 스트리밍 배포, 서비스 디스커버리 |

## 유니캐스트: 하나의 인터페이스

RFC 4291의 정의로는 "An identifier for a single interface. A packet sent to a unicast address is delivered to the interface identified by that address"다. 인터넷 트래픽의 대부분이 여기 속하고, TCP 연결은 구조상 유니캐스트에서만 성립한다. 양쪽 종단이 상태를 주고받아야 하기 때문이다. [[TCP-Handshake|TCP 연결]]

L2 스위치는 목적지 MAC을 MAC 테이블에서 조회해 해당 포트로만 보낸다. 다만 테이블에 없는 목적지는 unknown unicast로 같은 VLAN에 플러딩되므로, 유니캐스트라고 항상 한 포트로만 나가는 것은 아니다. [[Physical-DataLink-Layer#브로드캐스트와 유니캐스트, 그리고 도메인|스위치의 전달과 플러딩]]

## 브로드캐스트: 범위 안의 전부

IPv4에는 두 종류가 있다.

- **limited broadcast (`255.255.255.255`)**: RFC 919는 "The address 255.255.255.255 denotes a broadcast on a local hardware network, which must not be forwarded"라고 규정한다. 자기 네트워크 번호를 아직 모르는 호스트가 쓴다. DHCP 탐색이 대표적이다.
- **directed broadcast (호스트 비트 전부 1)**: 특정 네트워크 전체를 향한다. 네트워크 36이면 `36.255.255.255` 형태다. 목적지 네트워크에 도달하면 더 전달되지 않으며, RFC 919는 성능이나 보안상의 이유로 게이트웨이가 브로드캐스트를 전달하지 않기로 선택할 수 있다고 적는다. 증폭 공격에 악용된 이력 때문에 오늘날 라우터는 대체로 이를 차단한다.

브로드캐스트의 도달 범위는 브로드캐스트 도메인이고, 실무에서 그 경계는 VLAN과 LAN의 경계와 같다. [[LAN-vs-WAN]]

### 비용은 충돌이 아니라 전원의 처리다

브로드캐스트가 네트워크를 느리게 만든다는 설명에 CSMA/CD와 충돌이 자주 따라붙지만, 이는 허브와 반이중 이더넷 시절의 그림이다. 스위치는 충돌 도메인을 포트별로 나누고 전이중 링크에서는 충돌 자체가 발생하지 않는다. 지금 브로드캐스트가 비싼 이유는 다르다.

- 스위치가 입력 포트를 제외한 같은 VLAN의 모든 포트로 프레임을 복제한다.
- 그 도메인의 **모든 호스트**가 프레임을 수신해 인터럽트를 받고, 상위 계층까지 올려 자기와 무관함을 확인한 뒤에야 버린다. NIC 필터로 걸러지는 유니캐스트와 달리 CPU 비용이 전 호스트에 분산된다.
- 이중화 링크에서 STP 없이 루프가 생기면 브로드캐스트가 무한 순환하며 링크를 포화시킨다. [[Physical-DataLink-Layer#중복 링크와 Spanning Tree|브로드캐스트 스톰과 STP]]

그래서 대응은 브로드캐스트를 없애는 것이 아니라 도메인을 작게 유지하는 것이다. VLAN으로 분할하고, 필요하면 스위치의 storm control로 상한을 둔다.

## 멀티캐스트: 그룹에 가입한 대상만

RFC 1112은 멀티캐스트를 "the transmission of an IP datagram to a 'host group', a set of zero or more hosts identified by a single IP destination address"로 정의한다. 수신자가 정해져 있다는 점은 유니캐스트를 닮았고 한 번 보내 여럿에게 닿는다는 점은 브로드캐스트를 닮았지만, **수신자가 스스로 가입한다**는 점이 둘 다와 다르다.

- **그룹 주소**: `224.0.0.0` ~ `239.255.255.255`. 관리적으로 할당된 영구 그룹과 필요할 때 만들어지는 임시 그룹이 있다. `224.0.0.1`은 직접 연결된 네트워크의 모든 IP 호스트를 뜻한다.
- **IGMP**: 호스트가 인접 멀티캐스트 라우터에 자신의 그룹 가입을 보고하는 프로토콜이다. 라우터는 이 보고를 근거로 관심 있는 수신자가 있는 네트워크에만 트래픽을 전달한다. 가입 보고가 없으면 그 구간으로는 흐르지 않는 것이 브로드캐스트와의 결정적 차이다.
- **TTL 범위 제한**: 기본 TTL은 1이라 별도 설정이 없으면 로컬 네트워크를 벗어나지 않는다.
- **MAC 매핑**: "An IP host group address is mapped to an Ethernet multicast address by placing the low-order 23-bits of the IP address into the low-order 23 bits of the Ethernet multicast address 01-00-5E-00-00-00." 그룹 주소 28비트 중 23비트만 옮기므로 서로 다른 여러 IP 그룹이 같은 이더넷 주소로 겹친다. 겹친 그룹의 프레임은 NIC를 통과하므로 상위 계층에서 한 번 더 걸러야 한다.
- **IGMP snooping**: L2 스위치는 기본적으로 멀티캐스트 프레임을 플러딩한다. 스위치가 IGMP 메시지를 엿보고 가입 포트로만 전달하게 하는 기능이 IGMP snooping이며, 이것이 없으면 멀티캐스트가 브로드캐스트처럼 동작해 절약 효과가 사라진다.

## IPv6와 애니캐스트

IPv6에는 브로드캐스트가 없다. RFC 4291은 "There are no broadcast addresses in IPv6, their function being superseded by multicast addresses"라고 명시하고, 주소 유형을 유니캐스트, 애니캐스트, 멀티캐스트 셋으로 둔다. IPv4에서 브로드캐스트로 하던 ARP는 IPv6에서 Neighbor Discovery의 멀티캐스트로 대체됐다.

애니캐스트는 "An identifier for a set of interfaces... A packet sent to an anycast address is delivered to one of the interfaces identified by that address (the 'nearest' one, according to the routing protocols' measure of distance)"다. 여럿에게 보내는 것이 아니라 **여럿 중 가장 가까운 하나**에 닿는다는 점에서 멀티캐스트와 다르다. 같은 IP를 여러 지역에서 광고해 가까운 거점으로 유도하는 [[CDN]]과 공용 DNS 리졸버가 이 방식을 쓴다.

## 실무 체크포인트

- 브로드캐스트 도메인 크기를 설계 변수로 둔다. 한 VLAN에 장비가 많아질수록 ARP와 탐색 트래픽이 전 호스트의 비용이 된다.
- directed broadcast는 기본 차단으로 두고 필요한 경우에만 명시적으로 연다.
- 멀티캐스트를 도입하면 IGMP snooping 활성화를 함께 확인한다. 없으면 대역폭 절약 효과가 나지 않는다.
- 클라우드 VPC는 일반적으로 브로드캐스트와 멀티캐스트를 제공하지 않는다. AWS에서 VPC 간 IP 멀티캐스트가 필요하면 Transit Gateway의 멀티캐스트 도메인을 쓴다. [[Transit-Gateway|TGW 멀티캐스트]]
- 그래서 클라우드에서 다수 배포가 필요하면 네트워크 멀티캐스트 대신 애플리케이션 계층의 pub/sub으로 푼다. [[Redis-Streams-PubSub|Redis Pub/Sub]]
- mDNS나 SSDP 같은 로컬 탐색 프로토콜은 멀티캐스트에 의존하므로, 서브넷을 나누면 탐색이 끊긴다는 점을 사전에 확인한다.

## 면접 체크포인트

- 세 방식을 가르는 기준이 목적지 주소이고 그 값이 L2와 L3 양쪽에 대응한다는 점
- limited broadcast와 directed broadcast의 차이, 라우터가 브로드캐스트를 전달하지 않는 이유
- 브로드캐스트의 실제 비용이 스위치드 전이중 환경에서는 충돌이 아니라 전 호스트의 수신 처리와 플러딩이라는 점
- 멀티캐스트가 브로드캐스트와 다른 결정적 지점인 IGMP 가입 기반 전달, IGMP snooping이 없을 때의 결과
- IP 멀티캐스트 주소와 이더넷 주소가 23비트만 매핑돼 겹치는 이유와 그 영향
- IPv6에 브로드캐스트가 없는 이유, 애니캐스트가 멀티캐스트와 다른 점

## 출처

- [Unicast, Broadcast, Multicast — 널널한 개발자 TV](https://www.youtube.com/watch?v=5D9qz2CEIus&list=PLXvgR_grOs1BFH-TuqFsfHqbh-gpMbFoy&index=28)
- [IETF, RFC 919: Broadcasting Internet Datagrams](https://www.rfc-editor.org/rfc/rfc919.html)
- [IETF, RFC 1112: Host Extensions for IP Multicasting](https://www.rfc-editor.org/rfc/rfc1112.html)
- [IETF, RFC 4291: IP Version 6 Addressing Architecture](https://www.rfc-editor.org/rfc/rfc4291.html)
- [AWS, Multicast in Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-multicast-overview.html)

## 관련 문서

- [[Physical-DataLink-Layer|L1/L2 물리와 데이터링크 (MAC, 플러딩, 충돌과 브로드캐스트 도메인)]]
- [[Network-Layer|L3 네트워크 계층 (IP, 라우팅, ARP)]]
- [[LAN-vs-WAN|LAN과 WAN (브로드캐스트 도메인이 경계인 이유)]]
- [[IPv4-Header|IPv4 헤더 구조 (TTL)]]
- [[Network-Encapsulation|캡슐화와 데이터 단위]]
- [[CDN|CDN (애니캐스트 기반 엣지 유도)]]
- [[Transit-Gateway|AWS Transit Gateway (멀티캐스트 도메인)]]
- [[OSI-7-Layer|OSI 7계층 전체 지도]]
- [[네트워크(Network)|네트워크 인덱스]]
