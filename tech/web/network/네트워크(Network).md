---
tags: [web, network]
status: index
category: "Web - 네트워크"
aliases: ["Network"]
---

# 네트워크(Network)

OSI 7계층과 캡슐화, IP 헤더, 스위치와 라우팅, TLS, 패킷 캡처, 브라우저 URL 입력부터 렌더링까지.

## 목차
- [x] [[HTTPS-TLS|HTTPS / TLS Handshake]]
- [x] [[OSI-7-Layer|OSI 7계층 (osi-layers/ 서브폴더) — 계층별 상세 (L1/L2 MAC과 프레임, L2 스위칭, L3 IP와 라우팅, ARP, L4 TCP/UDP와 소켓, L5/6/7), Internet vs Ethernet]]
- [x] [[Network-Encapsulation|캡슐화와 데이터 단위 (소켓 스트림, 세그먼트, 패킷, 프레임, MTU/MSS, 단편화, DPI)]]
- [x] [[IPv4-Header|IPv4 헤더 구조와 패킷 읽기 (필드별 의미, TTL과 traceroute, 단편화 필드, 체크섬, IPv6 대비, Wireshark 필터)]]
- [x] [[LAN-vs-WAN|LAN과 WAN (브로드캐스트 범위와 MAC vs IP 라우팅으로 구분, 물리와 논리 네트워크)]]
- [x] [[Switch-Hierarchy-and-Uplink|스위치 계층과 업링크 (엔드포인트, 액세스/디스트리뷰션/코어, collapsed core, 링크 업/다운, 포트 용량 설계)]]
- [x] [[TCP|TCP (tcp/ 서브폴더) — 헤더 구조, 핸드셰이크, 흐름/오류 제어, 혼잡 제어]]
- [x] [[Routing-Protocols|정적 라우팅과 RIP, OSPF, BGP]]
- [x] [[Routing-Table-and-Interface-Selection|호스트 라우팅 테이블과 인터페이스 선택 (longest prefix match, 메트릭, OS별 확인 명령)]]
- [x] [[IPv4-NAT-and-Traversal|IPv4 NAT, NAPT와 STUN/TURN/ICE 통과 전략]]
- [x] [[Application-Layer-Protocols|DHCP, DNS, SSH, FTP, SMTP, POP3, IMAP 프로토콜 지도]]
- [x] [[Loopback-And-Localhost|Loopback, Localhost 동작 원리 (127.0.0.1, ::1, loopback NIC, 커널 내 처리, 디버깅)]]
- [x] [[Browser-URL-Flow|브라우저 URL 입력 프로세스 (DNS→ARP→TCP/TLS→HTTP→렌더링, Core Web Vitals)]]
- [x] [[Packet-Capture-and-Wireshark|패킷 캡처와 Wireshark (libpcap/Npcap, dumpcap, dissector, promiscuous 모드, 캡처 필터와 디스플레이 필터, TCP 스트림 재조립, SPAN/TAP, TLS 복호화, 법적 범위)]]

## 관련 문서

- [[Inline-vs-Out-of-Path|인라인과 아웃오브패스 배치 (fail-open과 fail-closed, 포트 미러링과 SPAN, TAP, IDS와 IPS, GWLB와 Traffic Mirroring)]] — 보안 카테고리의 [[네트워크보안(NetworkSecurity)|네트워크 보안]] 하위
- [[웹&네트워크(Web&Network)|웹&네트워크 인덱스]]
