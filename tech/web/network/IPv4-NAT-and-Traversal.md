---
tags: [web, network, ipv4, nat, napt, pat, stun, turn, ice]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["IPv4 NAT and Traversal", "NAT PAT", "NAT Traversal", "홀 펀칭", "STUN TURN ICE"]
verified_at: 2026-09-22
---

# IPv4 NAT, NAPT와 NAT 통과

NAT는 한 주소 영역의 IP를 다른 영역의 IP로 바꾼다. 가정과 회사에서 흔히 보는 것은 주소뿐 아니라 TCP/UDP port도 함께 바꾸는 NAPT다. PAT라고 부르는 구현도 보통 이 범주다.

## Basic NAT와 NAPT

| 방식 | 변환 키 | 의미 |
|---|---|---|
| Basic NAT | 내부 IP ↔ 외부 IP | 주소를 일대일 또는 주소 pool에서 매핑 |
| NAPT | 내부 IP:port ↔ 외부 IP:port | 여러 내부 flow가 하나의 공인 IP를 port로 공유 |

예를 들어 `10.0.0.12:53000`에서 외부 서버로 보낸 flow를 NAT가 `203.0.113.8:41001`로 바꾸고 mapping table에 기록한다. 응답은 그 상태를 역으로 조회해 내부 호스트로 전달된다.

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

두 peer가 각자 NAT 뒤에 있으면 서로가 보는 공인 endpoint와 내부 socket이 다르다. outbound packet으로 mapping을 만들고 양쪽이 적절한 시점에 서로의 외부 endpoint로 보내는 UDP hole punching이 작동할 수 있지만 NAT mapping과 filtering behavior에 따라 실패한다.

대칭 NAT라는 오래된 단일 분류만으로 성공 여부를 예측하기보다 endpoint-independent 또는 address/port-dependent mapping과 filtering을 구분해야 한다.

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

- [RFC 3022 — Traditional IP Network Address Translator](https://www.rfc-editor.org/rfc/rfc3022.html)
- [RFC 4787 — NAT Behavioral Requirements for Unicast UDP](https://www.rfc-editor.org/rfc/rfc4787.html)
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
