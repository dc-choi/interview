---
tags: [web, network, ipv4, header, fragmentation, mtu, ttl, wireshark]
status: done
verified_at: 2026-09-15
category: "웹&네트워크(Web&Network)"
aliases: ["IP 헤더", "IPv4 헤더와 단편화", "IP Header and Fragmentation", "Wireshark IP 패킷 분석"]
---

# IPv4 헤더와 단편화

IP 패킷은 전달에 필요한 **헤더**와 상위 계층 데이터를 담은 **페이로드**로 구성된다. 택배의 송장과 내용물에 대응하지만, IP 헤더에는 주소 외에도 길이, 수명과 단편화 정보가 들어간다. IP 자체가 도착이나 순서를 보장하지는 않는다. 계층 전체의 역할은 [[Network-Layer]]를 참고한다.

## IPv4 헤더 구조

**20바이트는 옵션이 없는 IPv4 헤더의 길이**다. 옵션과 패딩이 있으면 최대 60바이트이며, IPv6는 구조가 다르고 기본 헤더가 40바이트다. IPv6 확장 헤더는 기본 헤더 뒤에 별도로 붙는다.

| 필드 | 크기 | 읽어야 할 의미 |
|---|---|---|
| Version | 4비트 | IP 버전. 여기서는 4 |
| IHL | 4비트 | IPv4 헤더 길이를 4바이트 단위로 표시. 5이면 20바이트, 최대 15이면 60바이트 |
| DSCP / ECN | 6 / 2비트 | 서비스별 전달 처리 표시 / 명시적 혼잡 알림. 과거 Type of Service 필드에 해당하는 영역 |
| Total Length | 16비트 | IPv4 헤더와 페이로드를 합친 바이트 수. 표현 가능한 최대값은 65,535 |
| Identification | 16비트 | 같은 원본 패킷의 단편들을 재조립할 때 사용하는 식별값 |
| Flags | 3비트 | 예약 비트, DF(단편화 금지), MF(뒤에 단편이 더 있음) |
| Fragment Offset | 13비트 | 원본 IP 페이로드 안에서 이 단편이 시작하는 위치. 헤더에 기록하는 값의 단위는 8바이트 |
| TTL | 8비트 | 전달 가능한 홉 수를 제한하는 수명 값 |
| Protocol | 8비트 | IP 페이로드를 해석할 상위 프로토콜. TCP, UDP, ICMP 등 |
| Header Checksum | 16비트 | IPv4 헤더의 오류 검출. 페이로드는 검사 범위에 포함하지 않음 |
| Source / Destination Address | 각 32비트 | 출발지와 목적지 IPv4 주소 |
| Options / Padding | 0~40바이트 | 선택 기능과 헤더 길이를 4바이트 배수로 맞추는 패딩 |

IP 페이로드에는 TCP 헤더 같은 상위 계층의 제어 정보도 포함된다. 따라서 `Total Length - IHL × 4`는 **IP 페이로드 길이**이며 애플리케이션 본문 길이와 같지 않다. 단편화된 패킷의 Total Length는 원본 전체가 아니라 해당 단편의 헤더와 데이터 길이다.

## MTU를 넘으면 어떻게 되는가

MTU는 링크에 실을 수 있는 IP 패킷 크기의 제한이고, Path MTU는 경로에 있는 링크 MTU의 최솟값이다. 1500바이트는 일반적인 Ethernet 구성의 예이며 인터넷 전체의 고정 한계가 아니다. [[Network-Layer#MTU와 MSS — 서로 다른 크기 제한|MTU와 TCP MSS]]

라우터가 받은 패킷이 **다음 출력 링크의 MTU를 초과했을 때**의 기본 처리는 다음과 같다.

| 조건 | 라우터의 처리 |
|---|---|
| IPv4, DF=0 | MTU 이하의 IPv4 단편들로 나누어 전달 가능 |
| IPv4, DF=1 | 단편화하지 않고 폐기. ICMP Destination Unreachable의 Fragmentation Needed(Type 3, Code 4)로 알림 |
| IPv6 | 라우터가 단편화하지 않고 폐기. ICMPv6 Packet Too Big으로 알림. 필요한 단편화는 송신 노드가 수행 |

이는 최종 수신자가 큰 데이터를 처리할 수 없다는 뜻이 아니라, **해당 링크로 한 번에 전달할 크기를 넘었다는 뜻**이다. 송신 측은 Path MTU Discovery(PMTUD) 등으로 경로의 제한을 파악하고 송신 크기를 조정한다. ICMP 오류가 필터링되거나 유실되면 이 피드백이 송신자에게 도착하지 않을 수 있다.

TCP의 세그먼트화는 바이트 스트림을 TCP 단위로 나누는 과정이고, IP 단편화는 이미 구성된 IP 패킷의 페이로드를 나누는 과정이다. 애플리케이션의 큰 `send()` 호출만으로 IP 단편화 여부를 판단하지 않는다.

### 단편화와 재조립 예시

IPv4 원본이 4000바이트(헤더 20 + 페이로드 3980), DF=0, 출력 MTU가 1500이며 옵션은 없다고 가정한다. 단편마다 20바이트의 IPv4 헤더가 붙는다.

| 단편 | IP 페이로드 길이 | Total Length | 원본 페이로드 내 시작 위치 | 헤더의 Offset 값 | MF |
|---|---|---|---|---|---|
| 첫째 | 1480 | 1500 | 0바이트 | 0 | 1 |
| 둘째 | 1480 | 1500 | 1480바이트 | 185 | 1 |
| 마지막 | 1020 | 1040 | 2960바이트 | 370 | 0 |

Offset은 `시작 위치 ÷ 8`이다. 마지막 단편을 제외한 페이로드 길이는 8바이트 배수로 맞춘다. 일반적인 IP 전달에서는 중간 라우터가 재조립하지 않고 최종 목적지에서 출발지, 목적지, Protocol, Identification을 함께 사용해 단편을 모은다.

단편마다 헤더가 추가되고 재조립 버퍼와 타이머가 필요하다. 단편이 빠진 채 재조립 시간이 만료되면 원본을 완성할 수 없으며 IP 자체는 재전송하지 않는다. 방화벽이나 중간 장비가 단편을 처리하지 못하는 경우도 있어, 상위 프로토콜에서 송신 크기를 조정해 단편화 의존도를 줄이는 편이 유리하다.

## TTL — 라우팅 루프의 수명 제한

라우터는 패킷을 **다음 홉으로 전달할 때 TTL을 최소 1 줄이며**, 보통 홉마다 1씩 줄어드는 값으로 이해한다. 감소 결과가 0 이하라면 더 전달하지 않고 폐기한다. 일반 유니캐스트에서는 ICMP Time Exceeded로 송신자에게 알리지만, 이 응답의 도착까지 보장되는 것은 아니다.

- TTL=1인 패킷은 다음 라우터가 다른 곳으로 전달할 수 없다. 그 라우터 자체가 목적지인 경우와는 구분한다.
- L2 스위치가 프레임을 전달하는 것만으로 IP TTL이 줄지는 않는다.
- TTL이 바뀌므로 IPv4 헤더 체크섬도 갱신한다. TTL은 DNS 캐시의 유효 시간과 다른 개념이다.

## 16진수로 헤더 읽기

데이터 자체가 16진수인 것은 아니다. 비트와 바이트를 사람이 짧게 읽도록 나타내는 표기이며, 16진수 한 자리는 4비트, 두 자리는 1바이트다.

IPv4 헤더의 처음 4바이트가 `45 00 05 dc`인 예를 보자. 완전한 패킷 덤프가 아니라 길이 필드를 읽기 위한 예다.

- `45`: 상위 4비트의 Version은 4, 하위 4비트의 IHL은 5이므로 헤더는 20바이트다.
- `05 dc`: Total Length는 네트워크 바이트 순서(큰 자리 바이트부터)로 `0x05dc = 5 × 256 + 220 = 1500`바이트다.
- IP 페이로드는 `1500 - 20 = 1480`바이트다. TCP라면 이 안에 TCP 헤더도 들어 있다.

숫자를 모두 암산하기보다 **필드의 위치, 비트 폭과 단위**를 먼저 읽고 Wireshark의 해석값과 맞춰 본다.

## Wireshark로 확인하기

### 캡처 필터와 디스플레이 필터

수집 대상과 화면 표시를 구분하는 필터의 원리는 [[Wireshark-Packet-Analysis#캡처 필터와 디스플레이 필터|Wireshark 필터]]에 정리했다. 아래는 캡처된 IPv4 헤더를 읽는 실습이다.

### 짧은 확인 순서

1. 자신의 트래픽이 흐르는 인터페이스를 선택해 캡처한다. VPN과 가상 인터페이스를 쓰면 어느 구간을 보는지 확인한다.
2. `ip.version == 4`를 적용하고 패킷 하나의 Packet Details에서 Internet Protocol Version 4를 펼친다.
3. Version, Header Length, Total Length, Flags, Fragment Offset, TTL, Protocol과 주소를 읽는다.
4. 필드를 선택해 Packet Bytes의 대응 위치를 확인하고, IHL 단위와 헤더/페이로드 길이를 계산한다.

| Display filter | 확인하는 대상 |
|---|---|
| `ip.hdr_len > 20` | IPv4 옵션이 있어 기본 20바이트보다 긴 헤더 |
| `ip.flags.mf == 1 or ip.frag_offset > 0` | 첫 단편부터 마지막 단편까지 포함한 IPv4 단편 후보 |
| `ip.ttl <= 1` | 캡처 시점 TTL이 1 이하인 IPv4 패킷. 이것만으로 라우팅 루프가 입증되지는 않음 |
| `ip.len > 1500` | IPv4 Total Length가 1500을 넘는 패킷. Ethernet 프레임 길이 검사가 아님 |

캡처 위치와 오프로딩도 해석에 영향을 준다. 송신 호스트에서는 TSO/GSO를 사용해 커널이나 NIC가 분할하기 전의 큰 패킷이 보일 수 있다. `ip.len > 1500`만으로 실제 선로의 MTU 위반을 단정하지 않는다. 화면의 전체 Frame 길이, IP Total Length, 캡처된 바이트 수 역시 서로 구분한다.

## 확인 포인트

- IPv4 헤더 20바이트의 조건, IHL 단위와 IPv6 기본 헤더의 차이
- MTU 초과 시 IPv4 DF 설정과 IPv6에 따라 달라지는 처리
- Fragment Offset의 8바이트 단위, MF와 재조립 위치
- TTL 감소가 L3 전달에 적용되는 이유와 ICMP 응답의 한계
- 캡처 필터와 디스플레이 필터, 화면의 큰 패킷과 실제 링크 크기의 구분

## 출처

- [YouTube, IP 헤더와 네트워크 패킷 강의](https://www.youtube.com/watch?v=5Dku-vX3w-c) — 사용자 제공 학습 메모를 바탕으로 정리. 영상 자막은 직접 대조하지 못했으며, 기술 설명은 공식 자료로 보완했다.
- [IETF, RFC 791: Internet Protocol](https://www.rfc-editor.org/rfc/rfc791) — IPv4 헤더 형식과 단편화
- [IETF, RFC 3168: The Addition of Explicit Congestion Notification to IP](https://www.rfc-editor.org/rfc/rfc3168) — DSCP와 ECN 비트 영역
- [IETF, RFC 1812: Requirements for IP Version 4 Routers](https://www.rfc-editor.org/rfc/rfc1812.html#section-5.3.1) — 재조립 위치, TTL과 ICMP
- [IETF, RFC 8200: Internet Protocol, Version 6 Specification](https://www.rfc-editor.org/rfc/rfc8200) — IPv6 기본 헤더와 송신 노드의 단편화
- [IETF, RFC 8900: IP Fragmentation Considered Fragile](https://www.rfc-editor.org/rfc/rfc8900) — MTU와 PMTUD, 단편화의 운영상 한계
- [Wireshark, User's Guide](https://www.wireshark.org/docs/wsug_html/) — 캡처, 패킷 상세/바이트 창과 오프로딩
- [Wireshark, wireshark-filter Manual](https://www.wireshark.org/docs/man-pages/wireshark-filter.html) — 필드 비교, 논리 연산과 정규표현식
- [Wireshark, Display Filter Reference: Internet Protocol Version 4](https://www.wireshark.org/docs/dfref/i/ip.html) — IPv4 필드 이름과 타입

## 관련 문서

- [[Wireshark-Packet-Analysis]] — Npcap과 dumpcap, 디코딩과 스트림 분석, 수집 범위
- [[Network-Layer]] — IP 주소, 라우팅, MTU와 MSS
- [[Transport-Layer]] — 소켓, TCP 세그먼트화와 캡슐화
- [[Physical-DataLink-Layer]] — Ethernet 프레임과 L2 스위칭
- [[TCP-Header]] — TCP 헤더의 필드와 체크섬
- [[OSI-7-Layer]] — 계층별 문서 지도
