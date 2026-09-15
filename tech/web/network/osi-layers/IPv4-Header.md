---
tags: [web, network, osi, l3, ip, ipv4, header, ttl, fragmentation, wireshark]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["IPv4 Header", "IPv4 헤더", "IP 헤더", "IP Header", "TTL", "Time to Live", "패킷 헤더 분석", "Wireshark 필터"]
verified_at: 2026-09-15
---

# IPv4 헤더 구조와 패킷 읽기

패킷은 내용물인 페이로드와 송장인 헤더로 이루어진다. 라우터는 페이로드를 열지 않고 IP 헤더만 읽어 다음 홉을 정하므로, 헤더의 각 필드가 무엇을 뜻하는지 알면 캡처한 패킷에서 문제 지점을 바로 짚을 수 있다. 옵션이 없는 IPv4 헤더는 20바이트다. L3의 역할은 [[Network-Layer]], 계층별 캡슐화와 MTU는 [[Network-Encapsulation]], 바로 위 L4의 헤더는 [[TCP-Header]].

## 왜 이런 필드들이 필요한가

- 어디로 보내고 문제가 생기면 누구에게 알릴지: 목적지 주소, 출발지 주소
- 얼마나 크고 안에 무엇이 들었는지: Total Length, Protocol
- 언제 버릴지: TTL
- 쪼개졌다면 어떻게 다시 맞출지: Identification, Flags, Fragment Offset
- 송장 자체가 깨지지 않았는지: Header Checksum

## 필드별 의미

| 필드 | 비트 | 역할 |
|---|---|---|
| Version | 4 | IP 버전. IPv4는 4 |
| IHL | 4 | 헤더 길이를 32비트 워드 수로 표시. 최소 5(20바이트), 최대 15(60바이트) |
| Type of Service | 8 | 원래 서비스 품질 힌트. 이후 앞 6비트는 DSCP, 뒤 2비트는 ECN으로 재정의 |
| Total Length | 16 | 헤더와 데이터를 합친 패킷 전체 길이. 최대 65,535바이트 |
| Identification | 16 | 같은 원본 패킷에서 나온 조각을 묶는 식별자 |
| Flags | 3 | 비트 0 예약(0), 비트 1 DF(Don't Fragment), 비트 2 MF(More Fragments) |
| Fragment Offset | 13 | 이 조각이 원본의 어디서 시작하는지를 8바이트 단위로 표시 |
| Time to Live | 8 | 패킷이 살아 있을 수 있는 한도. 0이 되면 폐기 |
| Protocol | 8 | 페이로드의 상위 프로토콜. 1 ICMP, 6 TCP, 17 UDP |
| Header Checksum | 16 | 헤더만 대상으로 한 오류 검출값 |
| Source Address | 32 | 출발지 IP |
| Destination Address | 32 | 목적지 IP |
| Options, Padding | 가변 | 드물게 쓰는 확장. 있으면 IHL이 5보다 커지고 32비트 경계까지 0으로 채운다 |

### TTL: 홉 카운트로 동작하는 생존 한도

규격상 TTL은 초 단위의 최대 생존 시간이지만, 패킷을 처리하는 모든 장비가 1초 미만으로 처리해도 최소 1을 빼야 하므로 실제로는 라우터를 지날 때마다 1씩 줄어드는 홉 카운트로 동작한다. 0이 되면 그 라우터가 패킷을 폐기하고, 출발지에 ICMP Time Exceeded(type 11, code 0: time to live exceeded in transit)를 보낼 수 있다.

TTL이 필요한 이유는 라우팅 루프다. 라우팅 테이블이 수렴하는 동안이나 설정 오류로 패킷이 라우터 사이를 맴돌 수 있는데, TTL이 없으면 그 패킷이 영원히 대역폭을 먹는다. [[Routing-Protocols|라우팅 프로토콜의 수렴과 루프]]

이 동작을 역이용한 도구가 traceroute다. TTL을 1, 2, 3으로 늘리며 보내면 홉마다 다른 라우터가 Time Exceeded를 돌려주므로 경로를 그릴 수 있다. 초기 TTL은 OS마다 다르며 Linux 계열은 흔히 64, Windows는 흔히 128을 쓰므로, 캡처된 TTL로 지나온 홉 수와 송신 OS를 추정하기도 한다.

### Identification, Flags, Fragment Offset: 단편화 필드

패킷이 다음 링크의 MTU보다 크면 IPv4 라우터는 패킷을 조각낼 수 있다. 조각마다 IP 헤더를 복사해 붙이고, 같은 원본의 조각은 같은 Identification을 가진다. 마지막 조각만 MF가 0이고, Fragment Offset은 8바이트 단위라 마지막을 뺀 조각의 데이터 길이는 8의 배수여야 한다.

- 재조립은 최종 수신 호스트만 한다. 중간 라우터는 조각을 모으지 않는다.
- 조각 하나만 잃어도 원본 전체를 버리고, 재조립 시간이 넘으면 ICMP Time Exceeded code 1(fragment reassembly time exceeded)이 나간다.
- DF가 1이면 조각내지 않고 폐기한 뒤 ICMP fragmentation needed를 보내며, 이것이 Path MTU Discovery의 신호다.
- L4 헤더는 첫 조각에만 있어 방화벽과 NAT가 나머지 조각을 판단하기 어렵다.

단편화를 피해야 하는 이유는 이 비용들 때문이다. TCP가 MSS로 미리 잘라 보내는 이유, MTU와 PMTUD의 상세는 [[Network-Encapsulation#크기 제한: MTU, MSS와 단편화|MTU, MSS와 단편화]].

### Header Checksum: 헤더만 지키는 검사

헤더의 16비트 워드를 1의 보수로 더한 값의 1의 보수다. TTL이 홉마다 바뀌므로 헤더를 처리하는 모든 지점에서 검증하고 다시 계산한다. 데이터는 보호하지 않으며, 페이로드의 오류 검출은 TCP와 UDP 체크섬의 몫이다.

## IPv6 헤더와의 대비

| 항목 | IPv4 | IPv6 |
|---|---|---|
| 기본 헤더 길이 | 20바이트에서 옵션에 따라 60바이트까지 가변 | 40바이트 고정, 확장 헤더로 기능 추가 |
| 헤더 체크섬 | 있음, 홉마다 재계산 | 없음. 링크 계층과 L4 체크섬에 맡김 |
| 단편화 | 라우터도 조각낼 수 있음 | 출발지만 조각냄. 라우터는 하지 않음 |
| 생존 한도 | Time to Live | Hop Limit |
| 상위 프로토콜 | Protocol | Next Header |

IPv6는 라우터가 홉마다 해야 하는 일을 줄이는 방향으로 헤더를 단순화했다. 체크섬 재계산과 라우터 단편화가 사라진 것이 그 결과다.

## 캡처로 헤더 읽기

16진수 한 자리는 4비트, 두 자리는 1바이트다. 헤더 첫 바이트가 `45`이면 앞 4비트 `4`가 Version, 뒤 4비트 `5`가 IHL이다. 진법 변환의 기초는 [[Digital-Fundamentals#진법과 변환|진법과 변환]].

옵션 없는 IPv4 헤더 20바이트의 예다.

```text
45 00 00 73 00 00 40 00 40 11 b8 61 c0 a8 00 01 c0 a8 00 c7
```

| 바이트 | 값 | 해석 |
|---|---|---|
| 0 | `45` | Version 4, IHL 5 (20바이트) |
| 1 | `00` | DSCP 0, ECN 0 |
| 2~3 | `00 73` | Total Length 115 |
| 4~5 | `00 00` | Identification 0 |
| 6~7 | `40 00` | Flags `010` (DF 설정), Fragment Offset 0 |
| 8 | `40` | TTL 64 |
| 9 | `11` | Protocol 17 (UDP) |
| 10~11 | `b8 61` | Header Checksum |
| 12~15 | `c0 a8 00 01` | 출발지 192.168.0.1 |
| 16~19 | `c0 a8 00 c7` | 목적지 192.168.0.199 |

Wireshark와 tcpdump가 캡처하는 단위는 프레임이므로, 실제 캡처에서는 이 20바이트 앞에 14바이트 이더넷 헤더가 먼저 온다. 캡처 도구의 구조, 캡처 위치와 법적 범위는 [[Packet-Capture-and-Wireshark|패킷 캡처와 Wireshark]].

### 캡처 필터와 디스플레이 필터

- **캡처 필터**: 캡처 시점에 거르는 BPF 문법. tcpdump와 같다. 예: `host 192.168.0.1 and udp`
- **디스플레이 필터**: 캡처한 뒤 화면에서 거르는 Wireshark 고유 문법. 프로토콜 필드 이름으로 조건을 건다.

| 디스플레이 필터 | 뜻 |
|---|---|
| `ip.addr == 192.168.0.1` | 출발지 또는 목적지가 해당 IP |
| `ip.src == 10.0.0.0/8` | 출발지가 해당 대역 (CIDR 표기 가능) |
| `ip.ttl < 10` | TTL이 거의 소진된 패킷 |
| `ip.flags.mf == 1 \|\| ip.frag_offset > 0` | 단편화된 조각 |
| `http.host matches "acme\\.(org\|com\|net)"` | 필드 값이 PCRE2 정규표현식과 일치 |

`matches` 연산자는 Perl 호환 정규표현식을 쓴다. 문자열 리터럴이 Wireshark 필터 엔진과 PCRE2에서 두 번 파싱되므로 역슬래시를 두 번 써야 한다. tcpdump는 `-v` 옵션으로 TTL, Identification, 플래그와 오프셋을 함께 출력한다.

```bash
tcpdump -i en0 -n -v 'ip and host 192.168.0.1'
```

송신 호스트에서 캡처하면 NIC offload 때문에 체크섬이 틀리게 보일 수 있다. 수신 측 캡처와 비교하거나 offload 설정을 확인한 뒤 판단한다.

## 트러블슈팅 체크포인트

- ICMP Time Exceeded가 반복되면 라우팅 루프를 의심하고 traceroute로 맴도는 구간을 찾는다.
- 큰 요청만 실패하면 DF가 설정된 패킷의 fragmentation needed가 막히는 PMTUD black hole을 의심한다.
- 조각 패킷이 많이 보이면 경로의 MTU 불일치나 터널 오버헤드를 확인한다.
- 캡처에서 IHL이 5보다 큰 패킷이 보이면 옵션이 붙은 것이며, 일부 장비는 이런 패킷을 느린 경로로 처리하거나 버린다.

## 면접 체크포인트

- IPv4 헤더가 기본 20바이트인 이유와 IHL, Total Length의 관계
- TTL이 규격상 초 단위지만 실제로 홉 카운트로 동작하는 이유와 traceroute 원리
- Identification, DF, MF, Fragment Offset으로 조각을 재조립하는 방식과 단편화를 피하는 이유
- 헤더 체크섬이 헤더만 보호하고 홉마다 재계산되는 이유
- IPv6가 체크섬과 라우터 단편화를 없앤 이유
- 캡처 필터와 디스플레이 필터의 차이, 16진수 덤프에서 Version과 IHL을 읽는 법

## 출처

- [Wireshark의 내부구조와 작동원리 — 널널한 개발자 TV](https://www.youtube.com/watch?v=5Dku-vX3w-c&list=PLXvgR_grOs1BFH-TuqFsfHqbh-gpMbFoy&index=17)
- [IETF, RFC 791: Internet Protocol](https://www.rfc-editor.org/rfc/rfc791.html)
- [IETF, RFC 792: Internet Control Message Protocol](https://www.rfc-editor.org/rfc/rfc792.html)
- [IETF, RFC 3168: The Addition of Explicit Congestion Notification (ECN) to IP](https://www.rfc-editor.org/rfc/rfc3168.html)
- [IETF, RFC 8200: Internet Protocol, Version 6 (IPv6) Specification](https://www.rfc-editor.org/rfc/rfc8200.html)
- [Wireshark, User's Guide: Building Display Filter Expressions](https://www.wireshark.org/docs/wsug_html_chunked/ChWorkBuildDisplayFilterSection.html)

## 관련 문서

- [[Network-Layer|L3 네트워크 계층 (패킷, IP, 라우팅, ARP)]]
- [[Network-Encapsulation|캡슐화와 데이터 단위 (MTU, MSS, 단편화, PMTUD)]]
- [[Packet-Capture-and-Wireshark|패킷 캡처와 Wireshark]]
- [[TCP-Header|TCP 헤더 구조]]
- [[Routing-Protocols|정적 라우팅과 RIP, OSPF, BGP]]
- [[Digital-Fundamentals|디지털 기초 (비트, 16진수, 진법 변환)]]
- [[OSI-7-Layer|OSI 7계층 전체 지도]]
- [[네트워크(Network)|네트워크 인덱스]]
