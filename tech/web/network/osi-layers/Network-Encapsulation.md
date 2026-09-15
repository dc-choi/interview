---
tags: [web, network, osi, encapsulation, socket, segment, packet, frame, mtu, mss, dpi, kernel]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["Network Encapsulation", "네트워크 캡슐화", "패킷 캡슐화", "PDU", "세그먼트 패킷 프레임", "소켓 스트림", "MTU와 MSS", "Deep Packet Inspection"]
verified_at: 2026-09-15
---

# 네트워크 데이터 흐름과 캡슐화: 스트림, 세그먼트, 패킷, 프레임

애플리케이션이 소켓에 쓴 바이트 스트림은 커널의 프로토콜 스택을 내려가며 세그먼트, 패킷, 프레임으로 차례로 감싸진 뒤 NIC를 통해 나간다. 계층마다 자기 헤더를 붙여 상위 단위를 통째로 payload로 다루는 이 과정이 캡슐화(encapsulation)이고, 수신 측은 역순으로 벗겨낸다(decapsulation). 계층별 상세는 [[Transport-Layer|L4]], [[Network-Layer|L3]], [[Physical-DataLink-Layer|L1/L2]], 전체 지도는 [[OSI-7-Layer]].

한 줄 요약: **내용물(데이터)을 상자에 넣고 송장을 붙이면 패킷, 그 상자를 트럭에 실으면 프레임이다. 트럭은 구간마다 갈아타지만 송장은 목적지까지 그대로다.**

## 소켓과 스트림: 유저 모드의 출발점

프로그램은 네트워크를 직접 만지지 않고 소켓(socket)이라는 커널 인터페이스를 쓴다. `socket()`은 파일 디스크립터를 반환하며, 연결된 `SOCK_STREAM` 소켓은 `read()`/`write()` 또는 `send()`/`recv()`로 다룬다. 파일, 장치, 소켓을 같은 디스크립터 API로 다루는 Unix 계열의 설계는 [[Linux-File-System|모든 것이 파일]] 원칙의 한 예다.

- `SOCK_STREAM`(TCP): 순서가 보장되는 신뢰성 있는 양방향 바이트 스트림. 시작과 끝의 경계가 없다.
- `SOCK_DGRAM`(UDP): 고정된 최대 길이를 가진 독립 메시지(datagram). 메시지 경계가 보존된다.

스트림에는 메시지 경계가 없다. TCP는 애플리케이션이 `write()`한 단위와 실제 세그먼트 경계, 상대가 `read()`로 받는 단위 사이에 아무 상관관계도 보장하지 않는다. 한 번 보낸 메시지가 두 번에 나뉘어 읽히거나 두 메시지가 한 번에 붙어 읽힐 수 있으므로, 애플리케이션 프로토콜이 길이 필드나 구분자로 경계를 직접 정의한다. HTTP의 `Content-Length`와 chunked 전송이 그 예다.

`send()`가 반환됐다는 것은 데이터가 커널의 소켓 송신 버퍼에 복사됐다는 뜻이지 상대가 받았다는 뜻이 아니다. 이후의 분할, 캡슐화, 재전송은 모두 커널의 몫이며 애플리케이션은 관여하지 않는다. 시스템 콜을 경계로 유저 모드와 커널 모드가 나뉘는 구조는 [[Concurrency-and-Process-Overview#커널모드vs유저모드|커널 모드와 유저 모드]].

## 계층별 데이터 단위와 캡슐화

| 계층 | 단위(PDU) | 붙는 정보 | 주소 |
|---|---|---|---|
| L7 | 데이터, 메시지 | HTTP 헤더 같은 애플리케이션 프로토콜 정보 | URL, 호스트명 |
| L4 | 세그먼트(TCP), 데이터그램(UDP) | TCP 헤더 최소 20바이트: 포트, 시퀀스/ACK 번호, 플래그, 윈도우 | 포트 |
| L3 | 패킷(IP 데이터그램) | IPv4 헤더 최소 20바이트, IPv6 헤더 고정 40바이트: 출발지/목적지 IP, TTL | IP |
| L2 | 프레임 | 이더넷 헤더 14바이트(목적지/출발지 MAC, EtherType) + 끝의 FCS 4바이트 | MAC |

각 계층은 바로 위 계층의 단위 전체를 payload로 보고 자기 헤더를 앞에 붙인다. L2만 예외적으로 오류 검출용 FCS를 뒤에도 붙인다. IPv4 패킷을 실은 이더넷 프레임의 EtherType은 `0x0800`이다. IPv4 헤더의 필드별 비트 구조는 [[IPv4-Header]], TCP 헤더는 [[TCP-Header]].

택배 비유로 정리하면 다음과 같다.

- **페이로드**: 상자 안의 실제 내용물. 상위 계층이 만든 단위 전체.
- **헤더**: 보내는 사람과 받는 사람이 적힌 송장. 계층마다 자기 송장을 하나씩 더 붙인다.
- **패킷**: 송장이 붙은 상자. 출발지에서 목적지까지 같은 상자가 간다.
- **프레임**: 상자를 싣고 한 구간을 달리는 트럭. 라우터마다 트럭을 갈아탄다.

패킷의 IP 주소는 end-to-end로 유지되고 프레임의 MAC 주소는 hop-by-hop으로 바뀐다는 점이 가장 중요한 통찰이다. 상세는 [[Network-Layer#패킷은 유지되고 프레임은 구간마다 바뀐다 (핵심)|패킷은 유지되고 프레임은 구간마다 바뀐다]].

일상 용어로 패킷은 모든 단위를 통칭하지만, 정확한 의미의 패킷은 L3 단위다. tcpdump나 Wireshark 같은 도구가 캡처하는 것은 프레임이고, 도구가 그 안의 IP 헤더, TCP 헤더, payload를 계층별로 펼쳐 보여 준다. 캡처 도구의 구조와 캡처 위치는 [[Packet-Capture-and-Wireshark|패킷 캡처와 Wireshark]].

## 크기 제한: MTU, MSS와 단편화

**MTU(Maximum Transmission Unit)**는 한 링크가 프레임 하나에 실을 수 있는 L3 payload의 최대 크기다. 이더넷은 IP 데이터그램 최대 1500바이트, 데이터 필드 최소 46바이트를 규정하며, 최소에 못 미치면 0으로 채운 패딩을 붙인다. 이 패딩은 IP 헤더의 total length에 포함되지 않는다.

**MSS(Maximum Segment Size)**는 TCP 세그먼트 하나에 담을 수 있는 payload의 상한이다. MTU에서 IP 헤더와 TCP 헤더를 뺀 값으로, 옵션이 없는 이더넷 IPv4에서는 `1500 - 20 - 20 = 1460`바이트다. TCP는 스트림을 MSS 이하 조각으로 잘라 세그먼트를 만들기 때문에 정상 경로에서는 IP 단편화가 일어나지 않는다. MSS 옵션을 받지 못하면 IPv4는 536, IPv6는 1220을 기본 송신 MSS로 가정한다. 혼잡 제어와 MSS 계산의 상세는 [[TCP-Congestion-Control#CWND 초기화 — MSS|TCP 혼잡 제어의 MSS]].

경로 중간 링크의 MTU가 더 작으면 단편화 문제가 생긴다.

- **IPv4**: 라우터가 패킷을 단편화할 수 있다. DF(Don't Fragment) 플래그가 설정된 패킷은 단편화 대신 폐기된다. 모든 호스트는 576바이트까지의 데이터그램을 받아들여야 한다.
- **Path MTU Discovery**: 송신 호스트가 DF를 켜고 보내다가 라우터의 ICMP Destination Unreachable(code 4, fragmentation needed and DF set) 메시지에 담긴 next-hop MTU를 보고 경로 MTU 추정치를 줄인다. 방화벽이 ICMP를 전부 막으면 이 신호가 사라져 큰 패킷만 조용히 실패하는 black hole이 생긴다. [[Network-Layer#ARP — IP를 MAC으로 해석|ICMP를 무조건 막으면 안 되는 이유]]
- **IPv6**: 라우터는 단편화하지 않고 출발지 노드만 단편화한다. 모든 링크의 MTU는 1280바이트 이상이어야 한다.

VPN이나 터널은 원래 패킷을 다시 캡슐화해 헤더가 더 붙으므로 실질 MTU가 줄어든다. 특정 크기 이상의 요청만 실패한다면 MTU를 먼저 의심한다. [[Application-Layer-Protocols|VPN과 터널의 MTU 고려]]

## 커널 안의 송신 경로

Linux 계열을 기준으로 한 일반 모델이며 세부 단계는 OS와 드라이버에 따라 다르다.

1. **시스템 콜**: `send()`가 유저 모드에서 커널 모드로 전환하고 데이터를 소켓 송신 버퍼에 복사한다.
2. **TCP**: 송신 윈도우와 혼잡 윈도우가 허용하는 만큼 MSS 단위로 세그먼트를 만들고 TCP 헤더를 붙인다. ACK를 받을 때까지 버퍼에 보관해 재전송에 대비한다.
3. **IP**: 라우팅 테이블에서 출구 인터페이스와 next hop을 고르고 IP 헤더를 붙인다. [[Routing-Table-and-Interface-Selection|인터페이스 선택 원리]]
4. **L2**: next hop의 MAC을 ARP 또는 Neighbor Discovery로 해석해 이더넷 헤더를 붙인다. 다른 네트워크로 가는 패킷의 목적지 MAC은 게이트웨이 라우터의 MAC이다.
5. **큐잉과 전송**: 인터페이스 송신 큐를 거쳐 드라이버가 NIC의 링 버퍼로 넘기고, NIC가 FCS를 붙여 비트 신호로 내보낸다.

수신은 정확히 역순이다. NIC가 프레임을 받으면 인터럽트로 드라이버가 깨어나고, IP와 TCP가 헤더를 벗기며 검증한 뒤 목적지 포트의 소켓 수신 버퍼에 넣고, 애플리케이션이 `recv()`로 꺼낸다. 목적지가 loopback이면 NIC 없이 커널 안에서 같은 경로를 돈다. [[Loopback-And-Localhost#패킷이 커널 내부에서 처리되는 경로|loopback의 커널 내부 처리]]

현대 NIC는 체크섬 계산이나 세그먼트 분할 같은 작업을 하드웨어로 넘겨받는 offload 기능을 갖는 경우가 많다. 이 경우 송신 호스트에서 캡처한 패킷은 MSS보다 큰 세그먼트나 아직 계산되지 않은 체크섬으로 보일 수 있으므로, 캡처 결과를 해석할 때 offload 설정을 함께 확인한다.

## DPI(Deep Packet Inspection): 내용물까지 검사

송장(헤더)은 밖으로 드러나 있어 라우터와 방화벽이 늘 읽는다. DPI는 여기서 멈추지 않고 상자 안의 내용물(payload)까지 열어 보는 기술이다. L3/L4 헤더만 보는 장비가 IP와 포트로 판단한다면 DPI는 L7 내용으로 판단한다. DPI 장비를 경로 위에 두어 차단할지 사본만 보고 탐지할지는 [[Inline-vs-Out-of-Path|인라인과 아웃오브패스 배치]].

- **용도**: IDS/IPS의 시그니처 탐지, 애플리케이션 식별 기반 방화벽 정책, 악성 코드와 데이터 유출 차단, 트래픽 분류와 QoS, 콘텐츠 필터링.
- **한계**: TLS로 암호화된 payload는 읽을 수 없다. 그래서 TLS handshake의 SNI 같은 평문 메타데이터와 트래픽 패턴에 의존하거나, 조직 내부에 자체 CA를 배포해 복호화 후 재암호화하는 TLS 가로채기를 쓴다.
- **트레이드오프**: 내용물 열람은 프라이버시와 법적 문제를 동반하고, 모든 payload를 검사하는 만큼 처리량이 줄며, 시그니처 오탐이 정상 트래픽을 막을 수 있다. 어떤 트래픽을 어디까지 볼지 정책으로 명시하고 기록을 남긴다.

AWS에서는 이런 DPI 어플라이언스를 [[ELB|Gateway Load Balancer]] 뒤에 두고 트래픽을 통과시키는 구성이 대표적이다. [[HTTPS-TLS|TLS handshake와 SNI]]

## 트러블슈팅 체크포인트

- 특정 크기 이상의 요청이나 파일 전송만 실패하면 경로 MTU, PMTUD 차단, 터널 오버헤드를 의심한다.
- `send()` 반환을 전달 완료로 착각한 로직이 있는지 본다. 전달 보장은 애플리케이션 계층의 응답이나 ACK 확인으로 설계한다.
- TCP 위에서 한 번의 `write()`가 한 번의 `read()`로 온다고 가정한 파서는 조각난 메시지에서 깨진다. 길이 접두사나 구분자 기반 프레이밍을 확인한다.
- 캡처 결과를 읽을 때는 어느 계층의 헤더를 보고 있는지, offload가 개입했는지 먼저 확인한다.

## 면접 체크포인트

- 스트림에서 세그먼트, 패킷, 프레임으로 내려가는 순서와 계층마다 붙는 헤더 정보
- 소켓이 파일 디스크립터이고 `read()`/`write()`로 다룰 수 있는 이유
- TCP가 메시지 경계를 보존하지 않는 이유와 애플리케이션 프로토콜의 대응
- MTU와 MSS의 관계, 1500과 1460의 계산, PMTUD와 ICMP 차단의 부작용
- IPv4는 라우터 단편화가 가능하고 IPv6는 출발지만 단편화한다는 차이
- 패킷의 IP는 end-to-end, 프레임의 MAC은 hop-by-hop
- DPI의 정의와 용도, TLS 환경에서의 한계와 프라이버시 트레이드오프

## 출처

- [패킷의 생성 원리와 캡슐화 — 널널한 개발자 TV](https://www.youtube.com/watch?v=Bz-K-DPfioE&list=PLXvgR_grOs1BFH-TuqFsfHqbh-gpMbFoy&index=14)
- [IETF, RFC 894: A Standard for the Transmission of IP Datagrams over Ethernet Networks](https://www.rfc-editor.org/rfc/rfc894.html)
- [IETF, RFC 791: Internet Protocol](https://www.rfc-editor.org/rfc/rfc791.html)
- [IETF, RFC 9293: Transmission Control Protocol (TCP)](https://www.rfc-editor.org/rfc/rfc9293.html)
- [IETF, RFC 8200: Internet Protocol, Version 6 (IPv6) Specification](https://www.rfc-editor.org/rfc/rfc8200.html)
- [IETF, RFC 1191: Path MTU Discovery](https://www.rfc-editor.org/rfc/rfc1191.html)
- [Linux man-pages, socket(2)](https://man7.org/linux/man-pages/man2/socket.2.html)

## 관련 문서

- [[Transport-Layer|L4 전송 계층 (세그먼트, 포트, TCP/UDP)]]
- [[Network-Layer|L3 네트워크 계층 (패킷, IP, 라우팅, ARP)]]
- [[IPv4-Header|IPv4 헤더 구조와 패킷 읽기]]
- [[Packet-Capture-and-Wireshark|패킷 캡처와 Wireshark]]
- [[Physical-DataLink-Layer|L1/L2 물리와 데이터링크 (프레임, MAC, 스위치)]]
- [[OSI-7-Layer|OSI 7계층 전체 지도]]
- [[TCP-Congestion-Control|TCP 혼잡 제어 (MSS와 MTU 계산)]]
- [[Routing-Table-and-Interface-Selection|호스트 라우팅 테이블과 인터페이스 선택]]
- [[Loopback-And-Localhost|Loopback의 커널 내부 처리 경로]]
- [[Browser-URL-Flow|브라우저 URL 입력 흐름]]
- [[HTTPS-TLS|HTTPS와 TLS Handshake]]
- [[Concurrency-and-Process-Overview|OS 개요 (커널 모드와 유저 모드)]]
- [[Linux-File-System|Linux 파일 시스템 (모든 것이 파일)]]
- [[ELB|AWS ELB (Gateway Load Balancer와 보안 어플라이언스)]]
- [[Inline-vs-Out-of-Path|인라인과 아웃오브패스 배치 (IDS와 IPS)]]
- [[네트워크(Network)|네트워크 인덱스]]
