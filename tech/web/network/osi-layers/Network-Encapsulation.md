---
tags: [web, network, osi, encapsulation, socket, segment, packet, frame, mtu, mss, dpi, kernel]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["Network Encapsulation", "네트워크 캡슐화", "패킷 캡슐화", "PDU", "세그먼트 패킷 프레임", "소켓 스트림", "MTU와 MSS", "Deep Packet Inspection"]
verified_at: 2026-09-22
---

# 네트워크 데이터 흐름과 캡슐화: 스트림, 세그먼트, 패킷, 프레임

TCP 애플리케이션이 소켓에 쓴 바이트 스트림은 커널의 프로토콜 스택을 내려가며 세그먼트, 패킷, 프레임으로 차례로 감싸진 뒤 NIC를 통해 나간다. 계층마다 자기 헤더를 붙여 상위 단위를 통째로 payload로 다루는 이 과정이 캡슐화(encapsulation)이고, 수신 측은 역순으로 벗겨낸다(decapsulation). 계층별 상세는 [[Transport-Layer|L4]], [[Network-Layer|L3]], [[Physical-DataLink-Layer|L1/L2]], 전체 지도는 [[OSI-7-Layer]].

한 줄 요약: **내용물(데이터)을 상자에 넣고 송장을 붙이면 패킷, 그 상자를 트럭에 실으면 프레임이다. 트럭은 구간마다 갈아타지만 송장은 목적지까지 그대로다.**

## 소켓과 스트림: 유저 모드의 출발점

프로그램은 네트워크를 직접 만지지 않고 소켓(socket)이라는 커널 인터페이스를 쓴다. `socket()`은 파일 디스크립터를 반환하며, 연결된 `SOCK_STREAM` 소켓은 `read()`/`write()` 또는 `send()`/`recv()`로 다룬다. 파일, 장치, 소켓을 같은 디스크립터 API로 다루는 Unix 계열의 설계는 [[Linux-File-System|모든 것이 파일]] 원칙의 한 예다. 파일과 같은 입출력 인터페이스를 쓴다는 뜻이지, 소켓이 디스크에 저장되는 일반 파일이라는 뜻은 아니다.

- `SOCK_STREAM`(TCP): 순서가 보장되는 신뢰성 있는 양방향 바이트 스트림. 애플리케이션 메시지의 경계를 보존하지 않는다. 무한한 데이터라는 뜻은 아니며 연결 종료와 EOF는 존재한다.
- `SOCK_DGRAM`(UDP): 고정된 최대 길이를 가진 독립 메시지(datagram). 메시지 경계가 보존된다. 그래서 모든 소켓을 스트림으로 일반화하지 않는다.

스트림에는 메시지 경계가 없다. TCP는 애플리케이션이 `write()`한 단위와 실제 세그먼트 경계, 상대가 `read()`로 받는 단위 사이에 아무 상관관계도 보장하지 않는다. `ABC`와 `DEF`를 순서대로 보내도 수신자는 `AB`, `CDEF`로 나눠 읽을 수 있다. 한 번 보낸 메시지가 두 번에 나뉘어 읽히거나 두 메시지가 한 번에 붙어 읽힐 수 있으므로, 애플리케이션 프로토콜이 길이 필드나 구분자로 경계를 직접 정의한다. HTTP의 `Content-Length`와 chunked 전송이 그 예다.

`send()`는 성공하면 보낸 바이트 수를 반환하지만, send(2)는 전달 실패가 반환값에 암시되지 않고 지역에서 감지한 오류만 -1로 나타난다고 명시한다. 즉 성공 반환값은 상대가 받았다는 확인이 아니다. send(2)는 flags가 0인 `send()`가 write(2)와 같다고 설명하고, write(2)는 성공한 호출이 요청한 `count`보다 적게 전송할 수 있으며 이때 호출자가 다시 호출해 남은 바이트를 보낼 수 있다고 적는다. 그래서 반환값을 확인해 남은 바이트를 다시 보낸다. 호출 한 번, TCP 세그먼트 하나, 수신 측 `recv()` 한 번은 서로 일대일이 아니며, 버퍼링과 흐름 제어, 혼잡 제어가 실제 송신 시점과 크기를 정한다. 이후의 분할, 캡슐화, 재전송은 애플리케이션이 아니라 커널과 NIC offload가 처리한다. 시스템 콜을 경계로 유저 모드와 커널 모드가 나뉘는 구조는 [[Concurrency-and-Process-Overview#커널모드vs유저모드|커널 모드와 유저 모드]].

## 계층별 데이터 단위와 캡슐화

| 계층 | 단위(PDU) | 붙는 정보 | 주소 |
|---|---|---|---|
| L7 | 데이터, 메시지 | HTTP 헤더 같은 애플리케이션 프로토콜 정보 | URL, 호스트명 |
| L4 | 세그먼트(TCP), 데이터그램(UDP) | TCP 헤더 최소 20바이트: 포트, 시퀀스/ACK 번호, 플래그, 윈도우 | 포트 |
| L3 | 패킷(IP 데이터그램) | IPv4 헤더 최소 20바이트, IPv6 헤더 고정 40바이트: 출발지/목적지 IP, TTL | IP |
| L2 | 프레임 | 이더넷 헤더 14바이트(목적지/출발지 MAC, EtherType) + 끝의 FCS 4바이트 | MAC |

각 계층은 바로 위 계층의 단위 전체를 payload로 보고 자기 헤더를 앞에 붙인다. 그래서 **payload는 어느 계층에서 보느냐에 따라 다르다.** TCP의 payload는 바이트 조각이고, IP의 payload에는 TCP 헤더까지 들어가며, 이더넷의 payload는 IP 패킷 전체다. L2만 예외적으로 오류 검출용 FCS를 뒤에도 붙인다. IPv4 패킷을 실은 이더넷 프레임의 EtherType은 `0x0800`이다. 이 표는 프로토콜의 논리적 구성 순서이지 단계마다 데이터를 새 메모리로 복사한다는 뜻은 아니다. IPv4 헤더의 필드별 비트 구조는 [[IPv4-Header]], TCP 헤더는 [[TCP-Header]], 프레임 필드는 [[Physical-DataLink-Layer#프레임 구조|L2 프레임 구조]].

택배 비유로 정리하면 다음과 같다.

- **페이로드**: 상자 안의 실제 내용물. 상위 계층이 만든 단위 전체.
- **헤더**: 보내는 사람과 받는 사람이 적힌 송장. 계층마다 자기 송장을 하나씩 더 붙인다.
- **패킷**: 송장이 붙은 상자. 출발지에서 목적지까지 같은 상자가 간다.
- **프레임**: 상자를 싣고 한 구간을 달리는 트럭. 라우터마다 트럭을 갈아탄다.

트럭 비유는 구간마다 바뀐다는 점을 잡기 위한 것이고 정확히 대응하지는 않는다. 일반적인 IP over Ethernet에서 한 프레임은 IP 패킷 하나만 싣는다. 프레임은 라우터에서 다음 링크에 맞게 새로 만들어지며, 모든 링크가 이더넷인 것도 아니다.

패킷의 IP 주소는 end-to-end로 유지되고 프레임의 MAC 주소는 hop-by-hop으로 바뀐다는 점이 가장 중요한 통찰이다. 다만 NAT가 없는 일반 전달을 전제로 한 말이며, TTL, 헤더 체크섬, NAT와 터널이 헤더를 바꾸는 예외는 [[Network-Layer#패킷은 유지되고 프레임은 구간마다 바뀐다 (핵심)|패킷은 유지되고 프레임은 구간마다 바뀐다]], NAT는 [[IPv4-NAT-and-Traversal]].

패킷은 문맥에 따라 네트워크 데이터 단위를 넓게 부르는 말이며, 이 문서에서는 L3의 IP 패킷을 뜻한다. 세그먼트는 여기서 TCP 단위지만 다른 분야에서도 쓰이는 용어다. TCP 세그먼트에는 데이터뿐 아니라 페이로드 없는 ACK 같은 제어 정보도 실린다. UDP 데이터그램은 애플리케이션의 독립 메시지이며 TCP처럼 스트림을 잘랐다는 뜻이 아니다. 데이터그램이라는 말은 IP에서도 사용한다. tcpdump나 Wireshark 같은 도구가 캡처하는 것은 프레임이고 도구가 그 안의 IP 헤더, TCP 헤더, payload를 계층별로 펼쳐 보여 준다. 캡처 도구의 구조와 캡처 위치는 [[Packet-Capture-and-Wireshark|패킷 캡처와 Wireshark]].

## 크기 제한: MTU, MSS와 단편화

**MTU(Maximum Transmission Unit)**는 한 링크에 실을 수 있는 IP 패킷의 최대 길이다. IP 헤더는 포함하고 이더넷 헤더와 FCS는 포함하지 않는다. 이더넷은 IP 데이터그램 최대 1500바이트, 데이터 필드 최소 46바이트를 규정하며, 최소에 못 미치면 0으로 채운 패딩을 붙인다. 이 패딩은 IP 헤더의 total length에 포함되지 않는다. 1500은 일반 이더넷의 예이지 모든 링크와 터널의 공통값이 아니며, 경로 위 링크 MTU의 최솟값이 **Path MTU**다.

**MSS(Maximum Segment Size)**는 TCP 세그먼트 하나에 담을 수 있는 payload의 상한이다. 수신자가 SYN에서 광고하는 MSS와 경로 MTU를 함께 고려해 실제 송신 데이터 크기를 제한한다. 광고 MSS는 기본 IP/TCP 헤더를 기준으로 산정하고, 송신 시 옵션 공간도 따로 반영한다. 옵션이 없는 MTU 1500의 이더넷 IPv4에서는 `1500 - 20 - 20 = 1460`바이트다. TCP는 수신 MSS와 경로 MTU, 실제 헤더 크기에 맞춰 데이터를 나눈다. 완성된 IP 패킷이 경로 MTU 이내이면 크기 초과에 따른 IP 단편화를 피할 수 있다. 경로 중간의 MTU가 더 작으면 PMTUD로 크기를 줄이거나 IPv4에서 단편화가 필요해진다. MSS 옵션을 받지 못하면 IPv4는 536, IPv6는 1220을 기본 송신 MSS로 가정한다. 혼잡 제어와 MSS 계산의 상세는 [[TCP-Congestion-Control#CWND 초기화 — MSS|TCP 혼잡 제어의 MSS]].

TCP 세그먼트화와 IP 단편화는 별개다. 전자는 스트림을 TCP 전송 단위로 나누는 것이고 후자는 이미 만들어진 IP 패킷을 더 작은 IP 단편으로 나누는 것이다. 애플리케이션이 MTU보다 큰 데이터를 썼다고 곧바로 IP 단편화가 일어나지는 않는다. 출발지 링크 또는 경로 중간 링크의 MTU보다 큰 IP 패킷을 보낼 때 단편화나 폐기 문제가 생긴다.

- **IPv4**: 라우터가 패킷을 단편화할 수 있다. DF(Don't Fragment) 플래그가 설정된 패킷은 단편화 대신 폐기된다. 모든 호스트는 576바이트까지의 데이터그램을 받아들여야 한다.
- **Path MTU Discovery**: 송신 호스트가 DF를 켜고 보내다가 라우터의 ICMP Destination Unreachable(code 4, fragmentation needed and DF set) 메시지에 담긴 next-hop MTU를 보고 경로 MTU 추정치를 줄인다. 방화벽이 ICMP를 전부 막으면 이 신호가 사라져 큰 패킷만 조용히 실패하는 black hole이 생긴다. ICMP의 역할은 [[Network-Layer#ARP — IP를 MAC으로 해석|ARP와 ICMP]] 절의 ICMP 문단 참고.
- **IPv6**: 라우터는 단편화하지 않고 출발지 노드만 단편화한다. 모든 링크의 MTU는 1280바이트 이상이어야 한다.

### 단편화 비용과 터널의 유효 MTU

IPv4 단편마다 IP 헤더가 붙고, 수신지는 출발지/목적지 주소, 프로토콜과 Identification으로 단편을 묶어 Offset과 MF를 보고 재조립한다. 일반 IP 전달에서 재조립은 최종 수신지가 담당한다. 필드와 계산 예는 [[IPv4-Header]].

같은 데이터량이라도 단편화하면 패킷 수와 헤더 오버헤드가 늘고, 수신지의 재조립 버퍼와 타이머가 필요하다. 단편 하나를 잃으면 원래 IP 데이터그램을 완성할 수 없다. IP 자체는 재전송하지 않으며 TCP나 신뢰성을 구현한 상위 계층이 복구한다. 패킷 처리량(PPS) 부담과 중간 장비의 단편 폐기도 고려해야 한다.

장비 성능이 좋아져도 MTU 제한은 사라지지 않는다. 특히 VPN/IPsec 터널에서는 바깥 IP 헤더와 보안 헤더, 인증 데이터, 패딩 등이 추가돼 내부 패킷에 쓸 수 있는 MTU가 줄어든다. 추가 크기는 모드와 알고리즘에 따라 달라 고정된 값으로 빼지 않는다.

대응은 목적지 경로와 터널에 맞게 송신 크기를 조정하는 것이다. IPv4/IPv6 PMTUD에 필요한 ICMP를 전달하고, 지원되는 전송 계층에서는 탐색 패킷의 성공 여부를 이용하는 PLPMTUD도 활용한다. TCP의 MSS 조정은 TCP에만 적용되므로 UDP까지 해결하지 않는다. 전체 망의 MTU를 무작정 낮추기보다 터널 오버헤드, 큰 패킷 실패 여부와 양방향 경로를 확인한다. [[VPN-and-Private-Network|VPN 구성과 운영]]

## 커널 안의 송수신 경로

Linux 계열을 기준으로 한 일반 모델이며 세부 단계는 OS와 드라이버에 따라 다르다.

1. **시스템 콜**: `send()`가 유저 모드에서 커널 모드로 전환하고 데이터를 소켓 송신 버퍼에 복사한다.
2. **TCP**: 송신 윈도우와 혼잡 윈도우가 허용하는 만큼 MSS 단위로 세그먼트를 만들고 TCP 헤더를 붙인다. ACK를 받을 때까지 버퍼에 보관해 재전송에 대비한다.
3. **IP**: 라우팅 테이블에서 출구 인터페이스와 next hop을 고르고 IP 헤더를 붙인다. [[Routing-Table-and-Interface-Selection|인터페이스 선택 원리]]
4. **L2**: next hop의 MAC을 ARP 또는 Neighbor Discovery로 해석해 이더넷 헤더를 붙인다. 다른 네트워크로 가는 패킷의 목적지 MAC은 게이트웨이 라우터의 MAC이다.
5. **큐잉과 전송**: 인터페이스 송신 큐를 거쳐 드라이버가 NIC의 링 버퍼로 넘기고, NIC가 FCS를 붙여 비트 신호로 내보낸다.

수신 경로는 같은 계층들을 반대 순서로 지나지만 송신 단계의 거울상은 아니다. Linux 커널 문서 기준으로 장치는 새 이벤트를 인터럽트로 호스트에 알리고 호스트가 NAPI 인스턴스를 스케줄해 폴링으로 처리하며, 인터럽트 없이 폴링만 하는 busy polling도 선택할 수 있다. NAPI 자체는 기본적으로 이벤트를 합치지 않고, 배칭은 대개 장치의 IRQ coalescing에서 생긴다. GRO는 GSO의 짝으로 정의되며, GRO가 합친 프레임을 GSO로 다시 나누면 같은 프레임 열이 되는 것이 이상적 동작이다. 그 뒤 IP와 TCP가 헤더를 벗기며 검증하고 목적지 포트의 소켓 수신 버퍼에 넣는다. 애플리케이션은 그 버퍼에서 `recv()`로 꺼내므로 커널이 프레임을 처리한 시점과 애플리케이션이 읽는 시점이 반드시 일치하지는 않는다. 송신과 마찬가지로 세부 단계는 OS, 드라이버와 offload 설정에 따라 달라진다. 목적지가 loopback이면 NIC 없이 커널 안에서 같은 경로를 돈다. [[Loopback-And-Localhost#패킷이 커널 내부에서 처리되는 경로|loopback의 커널 내부 처리]]

현대 NIC는 체크섬 계산이나 세그먼트 분할 같은 작업을 하드웨어로 넘겨받는 offload 기능을 갖는 경우가 많다. Linux의 TSO(TCP Segmentation Offload)가 켜져 있으면 커널은 MSS보다 큰 버퍼를 NIC에 넘기고 NIC가 최종 분할을 맡는다. 그래서 위의 논리적 그림만으로 `send()` 호출 순간 세그먼트가 모두 만들어져 선로에 나갔다고 판단하지 않는다. 송신 호스트에서 캡처한 패킷은 MSS보다 큰 세그먼트나 아직 계산되지 않은 체크섬으로 보일 수 있으므로, 캡처 결과를 해석할 때 offload 설정을 함께 확인한다.

## DPI(Deep Packet Inspection): 내용물까지 검사

송장(헤더)은 밖으로 드러나 있어 라우터와 방화벽이 늘 읽는다. DPI는 여기서 멈추지 않고 상자 안의 내용물(payload)까지 열어 보는 기술이다. L3/L4 헤더만 보는 장비가 IP와 포트로 판단한다면 DPI는 L7 내용으로 판단한다. IP 전달의 필수 절차가 아니라 보안 장비나 트래픽 분석 시스템이 추가로 수행하는 기능이다. DPI 장비를 경로 위에 두어 차단할지 사본만 보고 탐지할지는 [[Inline-vs-Out-of-Path|인라인과 아웃오브패스 배치]].

- **용도**: IDS/IPS의 시그니처 탐지, 애플리케이션 식별 기반 방화벽 정책, 악성 코드와 데이터 유출 차단, 트래픽 분류와 QoS, 콘텐츠 필터링.
- **한계**: TLS로 암호화된 payload는 중간 장비가 캡처했다는 이유만으로 평문이 되지 않는다. 평문 검사는 복호화 가능한 종단이나 TLS 종료 지점 같은 조건이 필요하다. 그래서 TLS handshake의 SNI 같은 평문 메타데이터와 트래픽 패턴에 의존하거나, 조직 내부에 자체 CA를 배포해 복호화 후 재암호화하는 TLS 가로채기를 쓴다.
- **암호화돼도 남는 정보**: RFC 8404는 TLS 같은 애플리케이션 계층 암호화에서도 출발지와 목적지 IP, 프로토콜 번호, 출발지와 목적지 포트로 이루어진 5-tuple에 접근할 수 있다고 정리한다(Section 3.1.1). 또한 서비스 제공자 장비는 데이터링크, 네트워크, 전송 계층 헤더만 보도록 설계되지만 그 헤더 정보와 패킷 크기만으로도 대체로 높은 정확도를 얻는다고 적는다(Section 1.2). 패턴이 일치하는 트래픽 흐름을 식별하는 fingerprinting은 평문 세션과 암호화 세션 모두에 쓰인다(Section 2.1.3). 다만 본문을 읽는 것과는 다르고, RFC 8404는 애플리케이션과 전송 계층 암호화가 트래픽 유형 추정을 더 복잡하고 덜 정확하게 만든다고 본다(Section 2.2.2). 보이는 헤더의 범위도 암호화 계층과 터널 구성에 따라 달라져, IPsec 터널 모드는 원래 5-tuple 접근을 막는다(Section 3.1.1).
- **트레이드오프**: 내용물 열람은 프라이버시와 법적 문제를 동반하고 모든 payload를 검사하는 만큼 처리량이 줄며, 시그니처 오탐이 정상 트래픽을 막을 수 있다. 어떤 트래픽을 어디까지 볼지, 누가 접근하고 얼마나 보관할지를 정책으로 명시하고 기록을 남긴다.

AWS에서는 이런 DPI 어플라이언스를 [[ELB|Gateway Load Balancer]] 뒤에 두고 트래픽을 통과시키는 구성이 대표적이다. TLS handshake 절차는 [[HTTPS-TLS|HTTPS와 TLS handshake]].

## 트러블슈팅 체크포인트

- 특정 크기 이상의 요청이나 파일 전송만 실패하면 경로 MTU, PMTUD 차단, 터널 오버헤드를 의심한다.
- `send()` 반환을 전달 완료로 착각한 로직이 있는지, 반환값이 요청 길이보다 작은 경우를 처리하는지 본다. 전달 보장은 애플리케이션 계층의 응답이나 ACK 확인으로 설계한다.
- 전송 장애는 로컬 송신 버퍼가 막힌 것인지, 전송 중 손실과 재전송인지, 수신 애플리케이션이 늦게 읽는 것인지 순서로 구분한다.
- TCP 위에서 한 번의 `write()`가 한 번의 `read()`로 온다고 가정한 파서는 조각난 메시지에서 깨진다. 길이 접두사나 구분자 기반 프레이밍을 확인한다.
- 캡처 결과를 읽을 때는 어느 계층의 헤더를 보고 있는지, offload가 개입했는지 먼저 확인한다.

## 면접 체크포인트

- 스트림에서 세그먼트, 패킷, 프레임으로 내려가는 순서와 계층마다 붙는 헤더 정보, 계층마다 payload가 달라지는 이유
- 소켓이 파일 디스크립터이고 `read()`/`write()`로 다룰 수 있는 이유, 그럼에도 디스크 파일이 아닌 이유
- TCP가 메시지 경계를 보존하지 않는 이유와 애플리케이션 프로토콜의 대응, `send()` 반환값의 의미
- MTU와 MSS의 관계, 1500과 1460의 계산, PMTUD와 ICMP 차단의 부작용
- TCP 세그먼트화와 IP 단편화의 구분, IPv4는 라우터 단편화가 가능하고 IPv6는 출발지만 단편화한다는 차이
- 패킷의 IP는 end-to-end, 프레임의 MAC은 hop-by-hop, 그리고 TTL과 NAT라는 예외
- DPI의 정의와 용도, TLS 환경의 한계와 암호화돼도 남는 메타데이터, 프라이버시 트레이드오프

## 출처

이번 참고 영상은 제공된 메모를 바탕으로 반영했으며 영상 본문과 자막은 직접 확인하지 못했다. 보완한 기술 설명은 아래 공식 자료와 대조했다.

- [IP 단편화와 MTU — YouTube, 제공 메모의 참고 영상](https://www.youtube.com/watch?v=JYBRE_eD7a8&list=PLXvgR_grOs1BFH-TuqFsfHqbh-gpMbFoy&index=34)
- [패킷, 세그먼트와 스트림 — YouTube, 제공 메모의 참고 영상](https://www.youtube.com/watch?v=SJOdlS1uDBg&list=PLXvgR_grOs1BFH-TuqFsfHqbh-gpMbFoy&index=35)
- [IETF, RFC 768: User Datagram Protocol](https://www.rfc-editor.org/rfc/rfc768.html)
- [IETF, RFC 6691: TCP Options and Maximum Segment Size](https://www.rfc-editor.org/rfc/rfc6691.html)
- [IETF, RFC 8900: IP Fragmentation Considered Fragile](https://www.rfc-editor.org/rfc/rfc8900.html)
- [IETF, RFC 8899: Packetization Layer Path MTU Discovery for Datagram Transports](https://www.rfc-editor.org/rfc/rfc8899.html)
- [IETF, RFC 4301: Security Architecture for the Internet Protocol](https://www.rfc-editor.org/rfc/rfc4301.html)

- [패킷의 생성 원리와 캡슐화 — 널널한 개발자 TV](https://www.youtube.com/watch?v=Bz-K-DPfioE&list=PLXvgR_grOs1BFH-TuqFsfHqbh-gpMbFoy&index=14)
- [IETF, RFC 894: A Standard for the Transmission of IP Datagrams over Ethernet Networks](https://www.rfc-editor.org/rfc/rfc894.html)
- [IETF, RFC 791: Internet Protocol](https://www.rfc-editor.org/rfc/rfc791.html)
- [IETF, RFC 9293: Transmission Control Protocol (TCP)](https://www.rfc-editor.org/rfc/rfc9293.html)
- [IETF, RFC 8200: Internet Protocol, Version 6 (IPv6) Specification](https://www.rfc-editor.org/rfc/rfc8200.html)
- [IETF, RFC 1191: Path MTU Discovery](https://www.rfc-editor.org/rfc/rfc1191.html)
- [IETF, RFC 8404: Effects of Pervasive Encryption on Operators](https://www.rfc-editor.org/rfc/rfc8404.html)
- [Linux man-pages, socket(2)](https://man7.org/linux/man-pages/man2/socket.2.html)
- [Linux man-pages, send(2)](https://man7.org/linux/man-pages/man2/send.2.html)
- [Linux man-pages, write(2)](https://man7.org/linux/man-pages/man2/write.2.html)
- [Linux Kernel Documentation, Segmentation Offloads](https://docs.kernel.org/networking/segmentation-offloads.html)
- [Linux Kernel Documentation, NAPI](https://docs.kernel.org/networking/napi.html)

## 관련 문서

- [[Transport-Layer|L4 전송 계층 (세그먼트, 포트, TCP/UDP)]]
- [[Network-Layer|L3 네트워크 계층 (패킷, IP, 라우팅, ARP)]]
- [[IPv4-Header|IPv4 헤더 구조와 패킷 읽기]]
- [[IPv4-NAT-and-Traversal|IPv4 NAT, NAPT와 NAT 통과]]
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
- [[Proxy-Internals|프락시 동작 구조 (유저 모드 소켓 스트림 중계)]]
- [[Unicast-Broadcast-Multicast|유니캐스트, 브로드캐스트, 멀티캐스트]]
- [[네트워크(Network)|네트워크 인덱스]]
