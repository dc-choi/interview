---
tags: [web, network, osi]
status: index
category: "웹&네트워크(Web&Network)"
aliases: ["OSI 7계층", "OSI 7 Layer", "osi-layers", "TCP/IP 4계층", "TCP/IP 모델"]
verified_at: 2026-09-30
---

# OSI 7계층 (osi-layers 인덱스)

OSI 7계층 전체 지도와 계층별 상세 문서를 모은다. 흐름 한 줄: 하위(L1~L3)는 네트워크로 데이터를 물리 전달하고, L4는 전송 방식을 정하며, 상위(L5~L7)는 애플리케이션이 데이터를 만들고 해석한다.

## 계층별 상세
- [x] [[Physical-DataLink-Layer|L1/L2 물리와 데이터링크 (허브와 CSMA/CD, MAC과 프레임, L2 스위칭, VLAN과 STP, 충돌과 브로드캐스트 도메인)]]
- [x] [[Network-Layer|L3 네트워크 (IP, CIDR, 라우팅, ARP, MTU와 MSS, 패킷은 유지되고 프레임은 구간마다 바뀜, 헤더와 페이로드 검사)]]
- [x] [[Transport-Layer|L4 전송 (TCP, UDP, 소켓, 스트림, 세그먼트와 캡슐화, 포트)]]
- [x] [[Session-Presentation-Application-Layer|L5/6/7 세션, 프레젠테이션, 애플리케이션 (세션 유지, 인코딩, ALB L7)]]
- [x] [[LAN-vs-WAN|LAN과 WAN (거리가 아닌 MAC 직접 전달과 IP 라우팅으로 구분, 물리와 논리 네트워크)]]
- [x] [[Network-Encapsulation|캡슐화와 데이터 단위 (소켓 스트림 → 세그먼트 → 패킷 → 프레임, MTU/MSS와 단편화, 커널 송수신 경로, DPI)]]
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

## 출처

- [IETF, RFC 1122: Requirements for Internet Hosts, Communication Layers](https://www.rfc-editor.org/rfc/rfc1122.html)
- [IETF, RFC 801: NCP/TCP Transition Plan](https://www.rfc-editor.org/rfc/rfc801.html)
- [ISO, ISO 7498:1984 Open Systems Interconnection, Basic Reference Model](https://www.iso.org/standard/14252.html)
- [A Brief History of the Internet — Internet Society](https://www.internetsociety.org/internet/history-internet/brief-history-internet/)
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
- [[IPv4-Header]] — IPv4 헤더 필드, TTL, 단편화 필드, 캡처로 읽기
- [[Unicast-Broadcast-Multicast]] — 전달 방식과 목적지 주소, 브로드캐스트 도메인의 비용, 멀티캐스트와 IGMP
- [[네트워크(Network)]] — 카테고리 인덱스
