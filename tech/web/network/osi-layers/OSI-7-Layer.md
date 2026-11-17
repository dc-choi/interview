---
tags: [web, network, osi]
status: index
category: "웹&네트워크(Web&Network)"
aliases: ["OSI 7계층", "OSI 7 Layer", "osi-layers", "TCP/IP 4계층", "TCP/IP 모델"]
verified_at: 2026-11-17
---

# OSI 7계층 (osi-layers 인덱스)

OSI 7계층 전체 지도와 계층별 상세 문서를 모은다. 흐름 한 줄: 하위(L1~L3)는 네트워크로 데이터를 물리 전달하고, L4는 전송 방식을 정하며, 상위(L5~L7)는 애플리케이션이 데이터를 만들고 해석한다.

## 계층별 상세
- [x] [[Physical-DataLink-Layer|L1/L2 물리와 데이터링크 (FDM, TDM, WDM, CDM 다중화, 허브와 CSMA/CD, MAC과 프레임, L2 스위칭, VLAN과 STP, 충돌과 브로드캐스트 도메인)]]
- [x] [[Network-Layer|L3 네트워크 (IP, CIDR, 라우팅, ARP, MTU와 MSS, 패킷은 유지되고 프레임은 구간마다 바뀜, 헤더와 페이로드 검사)]]
- [x] [[Transport-Layer|L4 전송 (TCP, UDP, 소켓, 스트림, 세그먼트와 캡슐화, 포트)]]
- [x] [[Transport-Layer-Sockets|L4 소켓과 포트 (소켓의 두 의미, bind/listen/accept와 포트 공유, 수신 측 역다중화 순서, 5-tuple과 임시 포트 고갈, 메시지 경계와 프레이밍)]]
- [x] [[Session-Presentation-Application-Layer|L5/6/7 세션, 프레젠테이션, 애플리케이션 (세션 유지, 인코딩, ALB L7)]]
- [x] [[LAN-vs-WAN|LAN과 WAN (거리가 아닌 MAC 직접 전달과 IP 라우팅으로 구분, 물리와 논리 네트워크, 노드와 호스트 용어)]]
- [x] [[Network-Encapsulation|캡슐화와 데이터 단위 (소켓 스트림 → 세그먼트 → 패킷 → 프레임, 라우터 홉의 재캡슐화, MTU/MSS와 단편화, 커널 송수신 경로, DPI)]]
- [x] [[IPv4-Header|IPv4 헤더 구조와 패킷 읽기 (필드별 의미, TTL, 단편화 필드, 체크섬, IPv6 대비, Wireshark 필터)]]
- [x] [[ICMP|ICMP (오류 보고와 진단, type과 code, ping 해석, ICMPv6와 Neighbor Discovery, 방화벽 필터링 기준)]]
- [x] [[Unicast-Broadcast-Multicast|유니캐스트, 브로드캐스트, 멀티캐스트 (수신 대상 범위, limited/directed broadcast, IGMP와 MAC 매핑, IPv6의 애니캐스트)]]

## OSI 7계층 한눈에

| 계층 | 이름 | 역할 | 프로토콜/장비 예시 |
|------|------|------|------------------|
| 7 | 응용(Application) | 사용자와 직접 상호작용 | HTTP, FTP, SMTP, DNS |
| 6 | 표현(Presentation) | 데이터 형식 변환, 암호화 | SSL/TLS, JPEG, JSON |
| 5 | 세션(Session) | 연결 설정/유지/해제 | NetBIOS, RPC |
| 4 | 전송(Transport) | 신뢰성 있는 데이터 전송 | TCP, UDP |
| 3 | 네트워크(Network) | 경로 설정(라우팅) | IP, ICMP, 라우터 |
| 2 | 데이터링크(Data Link) | 물리 주소 지정, 오류 검출 | Ethernet, MAC, 스위치 |
| 1 | 물리(Physical) | 전기 신호 전송 | 케이블, 허브, 리피터 |

### 외우는법
- 상위(7→5): 애플리케이션이 데이터를 만들고
- 중간(4): 전송 방식(TCP/UDP) 결정
- 하위(3→1): 네트워크를 통해 물리적으로 전달

## TCP/IP 모델과의 대응

계층화는 복잡한 통신을 기능별 블랙박스로 나누는 분할 정복이다. 각 계층은 아래 계층이 제공하는 서비스만 쓰고 자기 헤더만 해석하므로, 웹 개발자는 HTTP만으로 서버와 통신하고 장비 제조사는 자기 계층만 맞춰도 서로 다른 구현이 연결된다. 하드웨어와 OS가 달라도 같은 프로토콜을 지키면 통신된다.

현실의 인터넷은 OSI가 아니라 TCP/IP 프로토콜 묶음으로 동작한다. RFC 1122는 이를 Link, Internet, Transport, Application의 4계층으로 설명하고, 교재에 따라 Link를 물리와 데이터링크로 나눈 5계층으로 쓴다.

| TCP/IP 4계층 (RFC 1122) | 5계층 표기 | OSI 대응 | 데이터 단위 | 예시 |
|---|---|---|---|---|
| Application | 애플리케이션 | L7, L6 (교재에 따라 L5 포함) | 메시지 | HTTP, DNS, SSH, SMTP |
| Transport | 트랜스포트 | L4 | 세그먼트, 데이터그램 | TCP, UDP |
| Internet | 네트워크 | L3 | 패킷 | IP, ICMP |
| Link | 데이터링크 | L2 | 프레임 | Ethernet, Wi-Fi, ARP |
| Link | 물리 | L1 | 비트 | 케이블, 광, 무선 |

- RFC 1122는 인터넷의 응용 계층이 OSI의 Presentation과 Application 기능을 합친 것이라고 설명한다. 세션 유지 같은 L5 기능은 TCP 연결, TLS 세션, HTTP 쿠키처럼 여러 곳에 흩어져 있어 OSI 계층과 일대일로 맞지 않는다([[Session-Presentation-Application-Layer]]).
- 송신 측에서는 HTTP 메시지에 TCP 헤더가 붙어 세그먼트, IP 헤더가 붙어 패킷, 이더넷 헤더와 트레일러가 붙어 프레임이 된 뒤 물리 신호로 나간다. 단계별 크기와 커널 경로는 [[Network-Encapsulation]].

### 왜 OSI가 아니라 TCP/IP인가

ARPANET은 1969년 설치가 시작된 연구망이었고, 그 호스트 간 프로토콜(NCP)은 패킷 무선과 위성처럼 성격이 다른 망을 잇기에 부족했다. 1973년 여러 망을 가로지르는 프로토콜 설계가 시작돼 1974년 논문으로 공개됐고, ARPANET은 1983년 1월 1일 NCP에서 TCP/IP로 전환했다. TCP/IP 구현을 포함한 BSD 유닉스 배포판은 연구 커뮤니티로 프로토콜을 퍼뜨린 핵심 요소가 됐다. OSI 참조 모델은 그 뒤인 1984년에 ISO 7498로 표준이 됐다. 이미 운영 중인 망과 구현이 TCP/IP 위에서 자랐으므로 실무는 TCP/IP를 따르고, OSI 번호는 L4, L7 장비처럼 기능을 부르는 공통 어휘로 주로 남았다.

## Internet vs Ethernet

| 구분 | Internet | Ethernet |
|------|----------|----------|
| 범위 | 전 세계 네트워크의 네트워크 (WAN) | 근거리 통신망 (LAN) |
| 계층 | OSI 3계층(네트워크) - IP 기반 | OSI 2계층(데이터링크) - MAC 기반 |
| 주소 | IP 주소 (논리적) | MAC 주소 (물리적) |
| 프로토콜 | TCP/IP | IEEE 802.3 |
| 예시 | 웹 브라우징, 이메일 | 사무실 내 PC 연결 |

- Ethernet은 LAN 내 장비 간 통신 기술
- Internet은 여러 LAN을 IP로 연결한 거대 네트워크
- 거리 기준이 흔들리는 이유와 판별 예시는 [[LAN-vs-WAN]]

## 계층으로 장애 위치를 좁힌다

계층 모델은 연결 실패를 한 덩어리로 두지 않고 어느 단계에서 멈췄는지 묻는 순서로 쓴다. 클라이언트가 받은 오류는 멈춘 단계를 좁히는 첫 단서이고, 한 오류가 한 단계에만 대응하지는 않는다. errno와 `getaddrinfo` 오류는 Linux man-pages, 종료 코드는 curl 매뉴얼 기준이다.

표의 순서는 계층 번호가 아니라 클라이언트가 오류를 만나는 순서다. DNS는 응용 계층 프로토콜이지만 조회는 연결보다 먼저 일어나고 resolver까지의 도달에 기댄다. 구간을 직접 확인할 때는 링크와 게이트웨이부터 올라간다([[WiFi-Generations#연결 구간을 나눠 진단한다|연결 구간 진단]]). 같은 사슬의 실패 지점 목록은 [[Browser-URL-Flow#전체 체인에서 실패하는 지점들|요청 사슬의 실패 지점]]에 있다.

| 질문 | 그 단계에서 멈췄을 때의 증상 |
|---|---|
| 이름이 주소로 바뀌는가 | `getaddrinfo`의 `EAI_NONAME`(이름을 모름)이나 `EAI_AGAIN`(네임서버의 일시 실패). curl 종료 코드 6 |
| 목적지 망에 닿는가 | `connect()`의 `ENETUNREACH`, 구간별 ping과 traceroute가 끊기는 지점. 오류 통지 없이 사라지는 도달 실패는 아래 행의 시간 초과로만 보인다 |
| TCP 연결이 맺어지는가 | `ECONNREFUSED`(거부) 또는 `ETIMEDOUT`(시간 초과). curl의 7은 호스트 연결 실패(Failed to connect to host)라 위 행의 도달 실패도 여기로 보일 수 있고(해석), 28은 정해 둔 제한 시간에 도달한 경우라 이름 해석, TLS, 응답 대기 단계에서도 난다. errno와 curl 종료 코드는 일대일로 짝짓지 않는다 |
| TLS가 서는가 | 핸드셰이크 실패(curl 35), 알려진 CA로 인증서를 검증하지 못함(curl 60) |
| 요청이 서비스에 닿는가 | HTTP 상태 코드. 502와 504는 그 응답을 만든 게이트웨이나 프록시와 그 upstream 사이를 가리킨다 |

- **거부와 시간 초과는 다른 정보다.** 거부는 대개 SYN이 상대 호스트의 TCP까지 닿았고 그 주소와 포트에 듣는 소켓이 없어 RST가 돌아온 경우다(RFC 9293 3.5.2). 다만 경로나 호스트의 방화벽이 REJECT로 RST나 ICMP 오류를 대신 돌려주면 클라이언트에는 대개 시간 초과가 아닌 즉시 실패로 보인다. RFC 9293 3.9.2.2는 IPv4 ICMP Destination Unreachable의 코드 2~4를 연결을 끊는 것이 권고되는(SHOULD) hard error로, 코드 0, 1, 5를 끊으면 안 되는(MUST NOT) soft error로 나눈다(ICMPv6는 코드 체계가 다르다). iptables REJECT의 기본값인 port unreachable(코드 3)은 hard error이고 net과 host unreachable(코드 0과 1)은 soft error지만, 같은 절은 연결 수립 중에 soft error를 hard error처럼 다루는 구현이 널리 있다고도 적는다. 돌려주는 유형에 따라 errno가 거부가 아닐 수 있고 유형별 대응은 대조하지 않았다. 그래서 거부가 확인해 주는 것은 응답한 장비까지 경로가 살아 있다는 점까지다. 시간 초과는 제한 시간 안에 답이 오지 않은 것이라 패킷이 통지 없이 사라지는 경우(상대 호스트가 꺼져 있고 오류 통지도 오지 않음, 돌아오는 경로가 없음, 경로나 호스트의 필터가 응답 없이 버림)와 서버가 새 연결을 받지 못할 만큼 바쁜 경우를 보고, 제한 시간이 경로 지연보다 짧지 않은지도 확인한다. 필터가 버리는 방식에 따른 차이는 [[Linux-Netfilter-and-iptables#target의 의미|DROP과 REJECT]], 소켓과 RST의 관계는 [[Transport-Layer-Sockets|소켓과 포트]]에 있다.
- **프로세스가 떠 있는 것과 망에서 닿는 것은 다르다.** 서버가 `127.0.0.1`에만 bind했으면 같은 호스트(컨테이너라면 같은 네트워크 네임스페이스, [[Docker-Bridge-Networking|도커 브리지 네트워킹]])에서 그 주소로 접속할 때만 연결된다. resolver가 `localhost`에 `::1`을 먼저 돌려주는데 서버가 IPv4에만 듣고 있으면 같은 호스트에서도 연결이 실패할 수 있다. 다른 호스트의 접속은 SYN이 그 호스트의 TCP까지 닿으면 거부되고, 앞단의 방화벽이나 보안 그룹이 버리면 시간 초과로 보인다([[Loopback-And-Localhost#프로세스 포트 바인딩 — 접근 범위 제어|바인딩 주소와 접근 범위]]).
- **아래 단계의 성공은 위 단계를 보장하지 않는다.** ping이 돼도 TCP 포트는 막혀 있을 수 있고, ICMP를 막는 장비 때문에 ping만 안 될 수도 있다([[ICMP#ping의 동작과 해석|ping 해석]]). 구간별 확인은 [[WiFi-Generations#연결 구간을 나눠 진단한다|연결 구간 진단]], 한 변수씩 바꾸는 실습은 [[Network-Lab-Practice#실패를 한 변수씩 만든다|네트워크 실습]]에 있다.
- **증상이 보인 단계와 원인이 있는 단계는 다를 수 있다.** 이름 조회 실패로 보였지만 그 아래에서 DNS 서버로 가는 경로 광고가 철회돼 있었던 사례가 [[Network-Failure-Cases|네트워크 장애 사례]]에 있다.
- 502는 게이트웨이나 프록시가 upstream에서 유효하지 않은 응답을 받은 것이고 504는 제때 응답을 받지 못한 것이다(RFC 9110 15.6.3, 15.6.5). 응답이 돌아왔으므로 클라이언트에서 그 응답을 만든 장비까지는 통과한 것이다. 체인이 여러 단이면 어느 장비가 만든 응답인지부터 가리고([[ELB-5XX-Troubleshooting|ALB 5XX 진단]]), 그 장비([[Load-Balancer|로드밸런서]]나 [[Reverse-Proxy|리버스 프록시]])의 upstream 연결과 시간 제한, upstream 애플리케이션의 지연을 본다. 코드별 의미는 [[HTTP-Status-Code|HTTP 상태 코드]], 이름 해석은 [[DNS#트러블슈팅|DNS 트러블슈팅]], 인증서와 핸드셰이크는 [[HTTPS-TLS|HTTPS와 TLS]]를 참고한다.

## 출처

- [IETF, RFC 1122: Requirements for Internet Hosts, Communication Layers](https://www.rfc-editor.org/rfc/rfc1122.html)
- [IETF, RFC 801: NCP/TCP Transition Plan](https://www.rfc-editor.org/rfc/rfc801.html)
- [ISO, ISO 7498:1984 Open Systems Interconnection, Basic Reference Model](https://www.iso.org/standard/14252.html)
- [IETF, RFC 9293: Transmission Control Protocol (TCP)](https://www.rfc-editor.org/rfc/rfc9293.html)
- [IETF, RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [Linux man-pages, connect(2)](https://man7.org/linux/man-pages/man2/connect.2.html)
- [Linux man-pages, getaddrinfo(3)](https://man7.org/linux/man-pages/man3/getaddrinfo.3.html)
- [netfilter, iptables-extensions(8)](https://man7.org/linux/man-pages/man8/iptables-extensions.8.html) — REJECT target
- [curl, curl man page](https://curl.se/docs/manpage.html) — Exit codes 절, --connect-timeout과 --max-time 항목
- [A Brief History of the Internet — Internet Society](https://www.internetsociety.org/internet/history-internet/brief-history-internet/)
- [I Bet Nobody Has Ever Explained the Networking Topics Like This Before — Cloud X Berry](https://www.youtube.com/watch?v=TR0RU2pmMeA)
- [인프런, 감자, 블랙박스](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160776)
- [인프런, 감자, 프로토콜](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160777)
- [인프런, 감자, 네트워크의 역사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160778)
- [인프런, 감자, TCP/IP 5계층, OSI 7계층](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160779)
- [인프런, 감자, 애플리케이션 계층](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160828)

## 관련 문서

- [[Physical-DataLink-Layer]] — L1/L2 상세 (허브, CSMA/CD, MAC, 프레임, 스위치 동작, VLAN과 STP)
- [[Switch-Hierarchy-and-Uplink]] — 액세스, 디스트리뷰션, 코어 계층과 업링크, 포트 용량 설계 (tech/web/network)
- [[LAN-vs-WAN]] — LAN과 WAN 구분 기준
- [[Network-Encapsulation]] — 스트림에서 프레임까지의 캡슐화, MTU/MSS, DPI
- [[Transport-Layer-Sockets]] — 소켓 식별, 역다중화, 메시지 경계
- [[IPv4-Header]] — IPv4 헤더 필드, TTL, 단편화 필드, 캡처로 읽기
- [[Unicast-Broadcast-Multicast]] — 전달 방식과 목적지 주소, 브로드캐스트 도메인의 비용, 멀티캐스트와 IGMP
- [[네트워크(Network)]] — 카테고리 인덱스
