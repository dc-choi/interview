---
tags: [web, network, ipv4, nat, napt, pat, stun, turn, ice]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["IPv4 NAT and Traversal", "NAT PAT", "NAT Traversal", "홀 펀칭", "STUN TURN ICE"]
verified_at: 2026-09-30
---

# IPv4 NAT, NAPT와 NAT 통과

NAT는 한 주소 영역의 IP를 다른 영역의 IP로 바꾼다. 가정과 회사에서 흔히 보는 것은 주소뿐 아니라 TCP/UDP port도 함께 바꾸는 NAPT다. PAT라고 부르는 구현도 보통 이 범주다.

## Basic NAT와 NAPT

| 방식 | 변환 키 | 의미 |
|---|---|---|
| Basic NAT | 내부 IP ↔ 외부 IP | 주소를 일대일 또는 주소 pool에서 매핑 |
| NAPT | 내부 IP:port ↔ 외부 IP:port | 여러 내부 flow가 하나의 공인 IP를 port로 공유 |

예를 들어 `10.0.0.12:53000`에서 외부 서버로 보낸 flow를 NAT가 `203.0.113.8:41001`로 바꾸고 mapping table에 기록한다. 응답은 그 상태를 역으로 조회해 내부 호스트로 전달된다.

매핑을 누가 만들고 외부에서 먼저 통신을 시작할 수 있는지에 따라 흔히 네 가지로 부른다.

| 방식 | 매핑 | 만드는 주체 | 외부에서 먼저 시작 | 한계와 실패 조건 | 대표 용도 |
|---|---|---|---|---|---|
| 정적 NAT | 내부 IP ↔ 외부 IP 1:1 고정 | 관리자 설정 | 고정 공인 주소로 가능 | 주소를 절약하지 못한다 | 내부 호스트를 고정 공인 주소로 공개 |
| 동적 NAT | 주소 pool에서 통신하는 동안 1:1 | 장비가 자동 할당 | 매핑이 살아 있는 동안만 | pool이 바닥나면 새 호스트가 외부로 나가지 못한다 | 현재는 드묾 |
| 정적 PAT(port forwarding) | 외부 IP:port ↔ 내부 IP:port 고정 | 관리자 설정 | 지정한 포트로만 가능 | 서비스마다 수동 관리 | 공유기 뒤 서버 공개 |
| 동적 PAT(NAPT) | 내부 IP:port ↔ 외부 IP:port 자동 | 장비가 흐름마다 생성 | 불가. 매핑 없는 패킷은 내부로 보낼 곳이 없다 | 매핑 timeout이 지나면 항목이 사라진다 | 가정용 공유기, 사무실 인터넷 공유 |

정적 1:1 NAT의 목적은 보안이 아니라 고정 공인 주소로의 도달성이다. 외부 접근을 허용할지는 방화벽 규칙이 정한다(아래 절). AWS 인터넷 게이트웨이도 공인 IPv4가 있는 인스턴스에 논리적인 1:1 NAT를 제공하며 인스턴스는 자기 사설 주소만 안다. 동적 NAT를 1:N이라 부르는 것은 여러 호스트가 pool의 주소를 번갈아 쓴다는 뜻이고, 한 시점에는 주소 하나를 한 호스트가 쓴다.

정적 NAT, 동적 NAT, port forwarding은 mapping을 만드는 정책을 설명하는 용어다. 실제 장비와 cloud 제품은 주소 pool, timeout, filtering, hairpinning 동작이 다르므로 이름만으로 inbound 허용 범위를 단정하지 않는다.

## 공유기와 응답 패킷의 복귀 경로

가정용 공유기는 보통 라우터, L2 스위치, 무선 AP, DHCP 서버와 방화벽 기능을 함께 제공한다. NAPT는 그중 여러 내부 기기가 적은 수의 외부 IPv4 주소로 인터넷 연결을 공유하게 하는 기능이다. 주소 공유와 인터넷 연결 공유는 서로 배타적인 설명이 아니다.

다음은 두 PC가 같은 서버의 TCP 443번 포트에 동시에 연결하는 예다. 외부 주소 `203.0.113.8`은 문서용 예시다.

| 내부 출발지 | 변환된 외부 출발지 | 외부 목적지 |
|---|---|---|
| `10.0.0.12:53000` | `203.0.113.8:41001` | `198.51.100.20:443` |
| `10.0.0.13:53000` | `203.0.113.8:41002` | `198.51.100.20:443` |

송신 시 출발지 주소와 필요한 포트를 변환하고 관련 체크섬도 갱신한다. 응답은 변환 상태를 조회해 목적지를 원래 내부 주소와 포트로 되돌린다. TCP 연결별 데이터가 논리적으로 동시에 흐르며, 한 PC의 연결이 끝나야 다음 PC가 이용하는 방식이 아니다.

매핑 조회에는 프로토콜, 외부 주소와 포트 등이 관여하며 구현에 따라 원격 주소와 포트도 구분한다. 모든 NAT가 목적지 포트 하나만으로 조회하거나 항상 임의의 새 포트를 선택하는 것은 아니다. UDP의 매핑 방식과 외부 패킷 허용 조건은 RFC 4787에서 별도로 구분한다.

공유기의 WAN 주소가 반드시 공인 주소인 것도 아니다. 상위 공유기나 통신사의 CGN을 거치면 다중 NAT가 될 수 있어, 외부 접속을 열 때 각 변환 구간을 확인해야 한다.

## NAT가 해결하고 깨뜨리는 것

NAPT는 여러 사설 주소가 적은 수의 공인 IPv4를 공유하게 하지만 다음 비용이 있다.

- 중간 장비가 flow state와 timeout을 관리한다.
- 외부 peer는 내부 주소와 port를 직접 알거나 임의로 접속하기 어렵다.
- payload에 주소를 실어 보내는 프로토콜은 변환과 충돌할 수 있다.
- mapping timeout 때문에 장시간 idle UDP flow는 keepalive나 재협상이 필요할 수 있다.

NAT 자체를 방화벽과 동일시하면 안 된다. 외부 packet을 허용하는 filtering policy와 translation은 다른 기능이며, 보안 경계는 명시적인 firewall rule과 인증으로 설계한다. 동적 매핑이 없는 외부 요청은 내부 전달 대상이 없을 수 있지만, 정적 매핑, 포트 포워딩이나 별도 허용 정책이 있으면 달라진다. NAT가 내부에서 시작한 악성 통신이나 애플리케이션 취약점까지 막아 주지는 않는다.

## P2P가 어려운 이유

두 peer가 각자 NAT 뒤에 있으면 서로가 보는 공인 endpoint와 내부 socket이 다르다. 한 번도 통신한 적 없는 두 peer 사이에는 매핑이 없어, 상대의 공인 IP로 먼저 보낸 패킷은 상대 NAT에서 버려진다. outbound packet으로 mapping을 만들고 양쪽이 적절한 시점에 서로의 외부 endpoint로 보내는 UDP hole punching이 작동할 수 있지만 NAT mapping과 filtering behavior에 따라 실패한다.

대칭 NAT라는 오래된 단일 분류만으로 성공 여부를 예측하기보다 endpoint-independent 또는 address/port-dependent mapping과 filtering을 구분해야 한다.

### Cone 이름을 매핑과 필터링으로 읽기

게임과 WebRTC 자료에 남아 있는 네 이름은 옛 STUN 규격(RFC 3489)에서 왔다. RFC 4787은 이 용어가 실제 NAT 동작을 설명하기에 부족해 혼란을 낳았다며 매핑과 필터링을 따로 정의한다. 아래 대응은 통용되는 해석이지 RFC가 정한 공식 표가 아니다.

| 옛 이름 | 매핑 | 필터링 | hole punching 관점 |
|---|---|---|---|
| Full Cone | 목적지와 무관(EIM) | 누구의 패킷이든 허용(EIF) | 잘 된다 |
| Restricted Cone | EIM | 보낸 적 있는 주소만 허용(ADF) | 양쪽이 서로의 공인 endpoint로 보내면 보통 통과 |
| Port Restricted Cone | EIM | 보낸 적 있는 주소와 포트만 허용(APDF) | 양쪽이 서로의 공인 endpoint로 보내면 보통 통과 |
| Symmetric | 목적지마다 다른 매핑(EDM) | 받은 상대만 회신 가능(APDF) | 상대가 쓸 외부 포트를 예측할 수 없어 실패하기 쉽다 |

hole punching은 매핑이 목적지와 무관한 EIM NAT에 기대며 목적지마다 매핑이 바뀌는 NAT에서는 동작하지 않는다(RFC 5128). 그래서 RFC 4787은 NAT가 EIM을 갖추도록 요구한다(REQ-1). 한쪽이 Symmetric이고 다른 쪽이 APDF 필터링이면 relay가 필요하지만, 다른 쪽이 EIF나 ADF 필터링이면 ICE가 relay 없이 경로를 찾을 수 있다.

### 게임의 구조 선택과 relay 대비

- 온라인 게임은 서버가 판정을 쥐는 클라이언트-서버 구조를 흔히 쓴다. 치팅에 강하고, 클라이언트가 서버의 공인 주소로 먼저 접속하므로 NAT가 문제되지 않는다. 대신 모든 입력이 서버를 왕복해 지연이 늘어난다.
- 격투 게임처럼 지연에 민감한 장르는 클라이언트끼리 직접 잇는 P2P를 쓰기도 한다. 지연은 줄지만 상대 클라이언트를 신뢰해야 하고 NAT 통과가 필요하다.
- 연결 절차: 각 peer가 공인 주소의 rendezvous 서버에 접속하면 서버는 패킷에 보이는 공인 IP:port와 peer가 알려 준 사설 IP:port를 기록해 상대에게 둘 다 전달한다. 각 peer는 두 주소로 보내 먼저 성공한 쪽을 쓴다. 같은 LAN이면 사설 주소가, 다른 망이면 공인 주소가 성공한다. ICE의 host candidate와 server-reflexive candidate가 이 두 주소에 해당한다.
- 사용자의 NAT 동작은 미리 알 수 없으므로 직접 연결 실패에 대비한 relay 서버를 기본으로 둔다. relay는 가장 확실하지만 가장 비효율적인 방법이라 마지막 수단으로 쓴다(RFC 5128, 아래 TURN).

## STUN, TURN, ICE

- **STUN**: client가 NAT 밖에서 보이는 server-reflexive address를 알아내고 연결 가능성을 점검하는 프로토콜이다. NAT를 대신 통과시키거나 media를 relay하지 않는다.
- **TURN**: 직접 연결이 불가능할 때 relay address를 할당하고 트래픽을 중계한다. 성공 가능성을 높이지만 bandwidth 비용과 추가 지연이 생긴다.
- **ICE**: host, server-reflexive, relayed candidate를 모으고 connectivity check로 실제 동작하는 candidate pair를 선택한다.

ICE는 가능한 직접 경로를 먼저 찾고 필요할 때 relay로 후퇴하는 orchestration이다. hole punching만 구현하고 TURN fallback을 생략하면 회사망, carrier-grade NAT와 엄격한 firewall 환경에서 연결 성공률을 보장하기 어렵다. WebRTC 적용은 [[Realtime-Communication-Comparison]].

## 운영 체크리스트

- mapping timeout보다 긴 idle 구간이 있다면 keepalive와 재연결 비용을 계산했는가
- 양방향 연결이 필요하면 TURN capacity와 egress 비용을 산정했는가
- signaling, candidate와 relay credential에 인증과 만료가 있는가
- NAT success rate, selected candidate type, connection setup latency를 관측하는가
- private IP를 identity나 authorization 근거로 사용하지 않는가

## 출처

이번 참고 영상은 제공된 메모를 바탕으로 반영했으며 영상 본문과 자막은 직접 확인하지 못했다. 보완한 기술 설명은 아래 공식 자료와 대조했다.

- [RFC 6598 — IANA-Reserved IPv4 Prefix for Shared Address Space](https://www.rfc-editor.org/rfc/rfc6598.html)
- [인터넷 공유기의 작동 원리와 NAT — YouTube, 제공 메모의 참고 영상](https://www.youtube.com/watch?v=7BvzxbG4y3Y&list=PLXvgR_grOs1BkUIxKsLEUdefyMWMA0_U-)

- [RFC 2663 — IP Network Address Translator (NAT) Terminology and Considerations](https://www.rfc-editor.org/rfc/rfc2663.html)
- [RFC 3022 — Traditional IP Network Address Translator](https://www.rfc-editor.org/rfc/rfc3022.html)
- [RFC 3489 — STUN, Simple Traversal of UDP Through NATs (폐기된 옛 규격, Cone 용어의 출처)](https://www.rfc-editor.org/rfc/rfc3489.html)
- [RFC 4787 — NAT Behavioral Requirements for Unicast UDP](https://www.rfc-editor.org/rfc/rfc4787.html)
- [RFC 5128 — State of Peer-to-Peer Communication across NATs](https://www.rfc-editor.org/rfc/rfc5128.html)
- [Enable internet access for a VPC using an internet gateway — AWS Documentation](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html)
- [RFC 8445 — Interactive Connectivity Establishment](https://www.rfc-editor.org/rfc/rfc8445.html)
- [RFC 8489 — Session Traversal Utilities for NAT](https://www.rfc-editor.org/rfc/rfc8489.html)
- [RFC 8656 — Traversal Using Relays around NAT](https://www.rfc-editor.org/rfc/rfc8656.html)
- [그림으로 쉽게 배우는 네트워크 — NAT과 PAT, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160819)
- [그림으로 쉽게 배우는 네트워크 — NAT traversal, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160820)

## 관련 문서

- [[Network-Layer|네트워크 계층과 IPv4]]
- [[Realtime-Communication-Comparison|WebRTC와 STUN, TURN, ICE]]
- [[VPC-NAT-Security|AWS VPC NAT와 보안 경계]]
- [[네트워크(Network)|네트워크 인덱스]]
