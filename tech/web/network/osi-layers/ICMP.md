---
tags: [web, network, osi, l3, icmp, icmpv6, ping, troubleshooting]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["ICMP", "ICMPv6", "ping", "ICMP type code", "Internet Control Message Protocol"]
verified_at: 2026-09-30
---

# ICMP: 오류 보고와 진단 메시지

ICMP는 IP 전달 중 생긴 문제를 출발지에 알리고 도달 여부를 진단하는 제어 프로토콜이다. IP 위에 실려 가지만(IPv4 Protocol 번호 1) IP의 일부로 간주되며 모든 IP 구현이 갖춰야 한다. 코드에 빗대면 네트워크의 디버깅 도구에 가깝다. L3 전체 구조는 [[Network-Layer]], TTL과 단편화 메시지가 생기는 지점은 [[IPv4-Header]].

## IP를 신뢰성 있게 만들지 않는다

ICMP는 문제를 알릴 뿐 IP를 신뢰성 있는 전달로 바꾸지 않는다. 오류가 나도 ICMP 메시지가 돌아온다는 보장이 없고, 아무 보고 없이 사라지는 패킷도 있다. 재전송 같은 신뢰성은 TCP나 애플리케이션이 맡는다.

오류가 오류를 낳는 연쇄와 폭주를 막는 규칙도 있다.

- ICMP 오류 메시지에 대해서는 다시 ICMP 오류를 보내지 않는다.
- 브로드캐스트나 멀티캐스트로 받은 데이터그램, 첫 조각이 아닌 단편에는 오류를 보내지 않는다. 없는 포트로 온 브로드캐스트 UDP에 모든 호스트가 오류로 답하면 망이 마비되기 때문이다.
- 오류 메시지의 생성 속도를 제한한다. IPv4 라우터는 제한할 수 있어야 하고(SHOULD), IPv6 노드는 반드시 제한한다(MUST).

그래서 ICMP 응답이 없다는 사실만으로 경로가 끊겼다고 단정하지 않는다.

## 메시지 구조

| 필드 | 크기 | 의미 |
|---|---|---|
| Type | 8비트 | 메시지 종류 |
| Code | 8비트 | Type 안의 세부 사유 |
| Checksum | 16비트 | ICMP 메시지 전체의 오류 검출 |
| 나머지 | 가변 | Type과 Code에 따라 다르다. echo는 Identifier와 Sequence Number를 담는다 |

오류 메시지는 원인 패킷의 IP 헤더와 데이터 앞부분(RFC 792 기준 최소 64비트)을 담아 보낸다. 받은 쪽은 이것으로 어느 연결의 어느 패킷이 문제였는지 대조한다.

## 주요 type과 code (IPv4)

| Type | Code | 의미 | 쓰이는 곳 |
|---|---|---|---|
| 0 | 0 | Echo Reply | ping 응답 |
| 3 | 0 | Destination Unreachable: net unreachable | 목적지 네트워크로 가는 경로 없음 |
| 3 | 1 | Destination Unreachable: host unreachable | 목적지 호스트에 닿지 못함 |
| 3 | 3 | Destination Unreachable: port unreachable | 목적지 UDP 포트에서 받는 프로세스가 없음 |
| 3 | 4 | fragmentation needed and DF set | Path MTU Discovery의 신호 |
| 8 | 0 | Echo Request | ping 요청 |
| 11 | 0 | Time Exceeded: TTL exceeded in transit | traceroute, 라우팅 루프의 단서 |
| 11 | 1 | Time Exceeded: fragment reassembly time exceeded | 조각 재조립 시간 초과 |

## ping의 동작과 해석

`ping 8.8.8.8`은 Type 8, Code 0의 echo request에 Identifier와 Sequence Number를 담아 보내고, 목적지는 받은 데이터를 그대로 담아 출발지와 목적지를 바꾼 Type 0 echo reply로 돌려준다. 송신 측은 두 번호로 요청과 응답을 짝지어 손실과 왕복 시간을 계산한다.

- ping 성공은 IP 경로와 상대 호스트의 ICMP 응답을 확인할 뿐이다. 특정 TCP 포트의 서비스가 정상이라는 뜻이 아니므로 서비스는 그 포트로 연결하거나 HTTP health check로 확인한다.
- ping 실패도 장애의 증거가 아니다. 보안 그룹이나 방화벽이 echo만 막고 서비스 포트는 열어 둔 경우가 흔하다.
- 어느 홉에서 막히는지는 TTL을 1씩 늘려 Time Exceeded를 받아 보는 traceroute로 좁힌다([[IPv4-Header#TTL: 홉 카운트로 동작하는 생존 한도|TTL과 traceroute]]).

## ICMPv6는 번호와 역할이 다르다

IPv6는 ICMPv6(Next Header 58)를 쓴다. type 0~127은 오류, 128~255는 정보 메시지다.

| ICMPv6 Type | 의미 | IPv4 대응 |
|---|---|---|
| 1 | Destination Unreachable | Type 3 |
| 2 | Packet Too Big | Type 3 Code 4 |
| 3 | Time Exceeded | Type 11 |
| 4 | Parameter Problem | Type 12 |
| 128, 129 | Echo Request, Echo Reply | Type 8, 0 |
| 133~137 | Router Solicitation, Router Advertisement, Neighbor Solicitation, Neighbor Advertisement, Redirect | ARP, ICMP router discovery, Redirect |

IPv6의 Neighbor Discovery는 IPv4의 ARP, ICMP router discovery와 redirect를 합친 역할을 ICMPv6 메시지로 수행한다. 그래서 ICMPv6를 통째로 막으면 같은 링크의 주소 해석과 기본 게이트웨이 탐색부터 깨진다.

## 방화벽에서 무엇을 막을까

| 메시지 | 막았을 때의 영향 | 판단 |
|---|---|---|
| Echo request, reply | ping 진단이 안 된다. 스캔 노출은 줄어든다 | IPv4는 정책에 따라 고른다. IPv6는 주소 공간이 넓어 스캔 위험이 낮으므로 echo request를 걸러낼 필요가 없다고 본다(RFC 4890) |
| IPv4 Type 3 Code 4, ICMPv6 Packet Too Big | DF가 켜진 큰 패킷만 조용히 사라지는 PMTUD black hole | 허용 |
| Destination Unreachable, Time Exceeded | 연결 실패가 timeout으로만 드러나고 traceroute가 동작하지 않는다 | 허용 |
| ICMPv6 Neighbor Discovery(133~137) | IPv6 주소 해석과 라우터 탐색 실패 | 링크 안에서 허용 |

큰 요청만 실패하는 증상의 진단은 [[Network-Encapsulation#크기 제한: MTU, MSS와 단편화|MTU, MSS와 단편화]]로 이어진다.

## 면접 체크포인트

- ICMP가 IP의 일부이면서도 IP를 신뢰성 있게 만들지 않는 이유와 오류 메시지 생성 제한
- Type, Code, Checksum 구조와 echo request 8, echo reply 0, destination unreachable 3, time exceeded 11
- ping 성공과 서비스 정상의 차이, ping 실패가 장애의 증거가 아닌 이유
- ICMP 전체 차단이 PMTUD와 traceroute를 깨뜨리는 이유, IPv6에서 ICMPv6 차단이 더 위험한 이유

## 출처

- [RFC 792 — Internet Control Message Protocol](https://www.rfc-editor.org/rfc/rfc792.html)
- [RFC 1122 — Requirements for Internet Hosts, Communication Layers, 3.2.2 ICMP](https://www.rfc-editor.org/rfc/rfc1122.html)
- [RFC 1812 — Requirements for IP Version 4 Routers, 4.3.2.8 Rate Limiting](https://www.rfc-editor.org/rfc/rfc1812.html#section-4.3.2.8)
- [RFC 4443 — Internet Control Message Protocol (ICMPv6) for IPv6](https://www.rfc-editor.org/rfc/rfc4443.html)
- [RFC 4861 — Neighbor Discovery for IP version 6](https://www.rfc-editor.org/rfc/rfc4861.html)
- [RFC 4890 — Recommendations for Filtering ICMPv6 Messages in Firewalls](https://www.rfc-editor.org/rfc/rfc4890.html)
- [인프런, 감자, ICMP](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160816)

## 관련 문서

- [[Network-Layer|네트워크 계층 (L3)]]
- [[IPv4-Header|IPv4 헤더, TTL과 단편화]]
- [[Network-Encapsulation|캡슐화, MTU와 PMTUD]]
- [[Linux-Netfilter-and-iptables|netfilter REJECT와 ICMP port unreachable]]
- [[OSI-7-Layer|OSI 7계층 인덱스]]
