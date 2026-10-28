---
tags: [web, network, ipv4, nat, napt, pat, stun, turn, ice, quic, iroh]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["IPv4 NAT and Traversal", "NAT PAT", "NAT Traversal", "홀 펀칭", "STUN TURN ICE", "iroh"]
verified_at: 2026-10-27
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

### 공개 키로 상대를 지정하는 QUIC 연결: iroh

ICE가 IP 주소와 port 후보를 고르는 절차라면, 상대를 공개 키로 지정하고 경로는 라이브러리가 찾게 하는 방식도 있다. iroh는 이 방식의 Rust 라이브러리로 2026-06-15 1.0을 냈고 2026-10-27 기준 최신은 1.4.1이다. 각 endpoint를 Ed25519 공개 키(endpoint ID)로 식별하고 그 키를 TLS 신원으로 쓴다.

- **경로 선택**: 가능하면 hole punching으로 직접 연결하고, 실패하면 relay 서버를 거친다. relay는 endpoint ID로 주소가 지정된 암호화 패킷만 전달하고 내용은 읽지 못한다. hole punching 방식은 Tailscale을 본떴다고 개발사가 밝혔다.
- **인증과 암호화**: QUIC 위에서 동작해 모든 연결이 종단 간 암호화되고, 공개 키로 dial하므로 양쪽이 서로를 인증한다. 자체 서명 인증서로 시작했다가 rustls가 지원한 뒤 TLS raw public key(RFC 7250)로 바꿨다.
- **주소 조회**: endpoint ID만으로 상대를 찾으려면 현재 주소를 알려 주는 조회가 필요하다. 서명된 DNS 레코드 형식(pkarr)의 중앙 조회 서비스를 두고, BitTorrent mainline DHT를 직접 쓰는 길도 남겼다.
- **경로 전환과 NAT 통과**: QUIC multipath 초안과 QUIC NAT traversal 초안을 구현해 한 연결 안에서 여러 경로를 관리하고 상황에 따라 바꾼다. upstream 반영이 어려워 QUIC 구현(quinn)을 noq로 포크했다.
- **프로토콜 구분**: 스트림마다 협상하지 않고 TLS ALPN으로 응용 프로토콜을 고른다. 추가 비용은 없지만 ClientHello의 ALPN은 경로상 관찰자에게 보이고, 이를 가릴 Encrypted ClientHello는 1.0에 넣지 않았다. 양자 내성 서명은 키가 커서 endpoint ID를 키에서 따로 유도해야 하므로 넣지 않았고, 선택적 양자 내성 키 교환은 들어갔다.
- **호환 약속**: 1.x endpoint끼리는 minor 버전과 언어에 관계없이 통신하고, wire 호환을 깨는 변경은 major 릴리스에만 넣는다고 밝혔다. 공개 relay는 1.0 계열에 계속 제공하고 0.35 계열은 2026-12-31까지 제공한다. 공개 relay의 중계 트래픽에는 바뀔 수 있는 rate limit이 있다.
- **사용 지표**: 연결 데이터의 95%가 기기 사이를 직접 오가는 경우가 흔하고 최근 30일 공개 relay에서 2억 개가 넘는 endpoint가 만들어졌다고 개발사가 밝혔다. 측정 방법을 공개하지 않은 자체 보고다.

BLAKE3 content addressing으로 큰 blob을 검증하며 스트리밍하는 iroh-blobs, publish-subscribe 확산을 맡는 iroh-gossip은 별도 crate다. 연결 계층과 응용 프로토콜을 나눈 구조라, 운영에 쓰려면 공개 relay의 정책과 rate limit에 기댈지 자체 relay를 둘지를 함께 정한다(설계 제안).

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
- [Iroh 1.0 - Dial Keys, not IPs — iroh blog, n0](https://iroh.computer/blog/v1)
- [The road to iroh 1.0 — iroh blog, Rüdiger Klaehn](https://iroh.computer/blog/the-road-to-iroh-1-0)
- [iroh 1.4.1 README — docs.rs](https://docs.rs/crate/iroh/1.4.1) — 2026-10-27 dial 방식, relay 역할과 구성 crate 대조. 1.4.1은 2026-10-21 배포
- [Managing multiple paths for a QUIC connection (draft-ietf-quic-multipath) — IETF Datatracker](https://datatracker.ietf.org/doc/draft-ietf-quic-multipath/), [Using QUIC to traverse NATs (draft-seemann-quic-nat-traversal) — IETF Datatracker](https://datatracker.ietf.org/doc/draft-seemann-quic-nat-traversal/)
- [RFC 7250 — Using Raw Public Keys in Transport Layer Security (TLS) and Datagram Transport Layer Security (DTLS)](https://www.rfc-editor.org/rfc/rfc7250.html)
- [iroh 1.0까지의 여정 - IPFS 구현에서 공개 키 기반 연결 라이브러리로 — GeekNews](https://news.hada.io/topic?id=35506)
- [그림으로 쉽게 배우는 네트워크 — NAT과 PAT, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160819)
- [그림으로 쉽게 배우는 네트워크 — NAT traversal, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160820)

## 관련 문서

- [[Network-Layer|네트워크 계층과 IPv4]]
- [[Realtime-Communication-Comparison|WebRTC와 STUN, TURN, ICE]]
- [[VPC-NAT-Security|AWS VPC NAT와 보안 경계]]
- [[네트워크(Network)|네트워크 인덱스]]
