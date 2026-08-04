---
tags: [web, network, application-layer, dhcp, dns, ssh, ftp, smtp, pop3, imap]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["Application Layer Protocols", "응용 계층 프로토콜", "DHCP DORA", "메일 프로토콜"]
verified_at: 2026-08-04
---

# DHCP, 원격 접속, 파일과 메일 프로토콜

애플리케이션 계층은 사용자의 업무 의미를 정하고 TCP나 UDP를 이용한다. 같은 계층이라는 이유로 같은 연결 방식이나 보안 특성을 갖는 것은 아니다.

## DHCP: 주소뿐 아니라 host 설정 전달

DHCP는 client에게 IP 주소, subnet mask, default gateway, DNS server와 lease 같은 초기 설정을 전달한다. IPv4 DHCP client는 아직 자기 주소와 server 위치를 모를 수 있어 UDP broadcast를 사용할 수 있으며, relay agent가 다른 subnet의 server로 요청을 전달할 수 있다.

새 주소를 받는 대표 흐름은 DORA로 외운다.

1. **Discover**: client가 사용 가능한 server를 찾는다.
2. **Offer**: server가 주소와 설정을 제안한다.
3. **Request**: client가 선택한 제안을 요청한다.
4. **ACK**: server가 binding과 lease를 확정한다.

갱신은 항상 네 단계를 처음부터 반복하지 않는다. client state와 lease 시점에 따라 기존 server에 DHCPREQUEST를 직접 보내거나 rebinding broadcast를 보낼 수 있다. DHCP는 주소를 소유권으로 영구 부여하는 것이 아니라 정해진 정책과 기간에 따라 binding을 관리한다.

## DNS와 HTTP

- **DNS**: 이름을 resource record로 해석하는 계층형 분산 시스템이다. 상세 흐름은 [[DNS]].
- **HTTP**: resource representation과 request/response semantics를 정의한다. 상세는 [[HTTP]].

DNS가 먼저이고 HTTP가 나중이라는 설명은 일반적인 웹 요청 흐름이지 모든 요청의 고정 규칙은 아니다. cache, 이미 알고 있는 IP, proxy와 service discovery에 따라 경로가 달라진다.

## Telnet과 SSH

Telnet은 범용 양방향 문자 통신과 terminal option 협상을 제공하지만 자체 confidentiality와 server authentication을 제공하지 않는다. 신뢰할 수 없는 network의 원격 shell로 사용하면 credential과 명령이 노출될 수 있다.

SSH는 암호화된 transport, server authentication과 선택 가능한 user authentication을 제공한다. 공개키 인증은 대표 방식이지만 SSH가 항상 key pair만 쓰는 것은 아니며 password 등 여러 method를 협상할 수 있다.

## FTP, FTPS와 SFTP

FTP는 보통 하나의 control connection과 별도의 data connection을 사용한다. active/passive mode에 따라 data connection을 여는 쪽이 달라 NAT와 firewall rule을 복잡하게 할 수 있다.

기본 FTP는 credential과 data를 암호화하지 않는다. FTPS는 FTP에 TLS를 적용한 프로토콜이고, SFTP는 SSH subsystem으로 동작하는 별개 프로토콜이다. 이름이 비슷해도 port와 운영 경로가 다르다.

## SMTP, POP3와 IMAP

| 프로토콜 | 핵심 역할 | 운영 관점 |
|---|---|---|
| SMTP | message submission과 mail server 간 relay | 보내는 경로, queue와 재시도 |
| POP3 | server mailbox에서 message retrieval | 단순 다운로드 중심, server 보존 정책 별도 |
| IMAP | server mailbox와 folder, flag 상태 접근 | 여러 device에서 server state 동기화에 적합 |

메일을 보낸다는 동작과 mailbox를 읽는 동작은 프로토콜이 다르다. 현대 배포에서는 TLS, authentication, spam 방어와 SPF/DKIM/DMARC 정책까지 함께 설계하며 기본 port 번호만으로 보안을 판단하지 않는다.

## Proxy와 VPN

proxy는 client 또는 server를 대신해 특정 application traffic을 전달한다. cache가 hit하면 latency와 origin 부하를 줄일 수 있지만 언제나 속도를 높이는 장치는 아니다. [[Forward-vs-Reverse-Proxy]]

VPN은 공개 network 위에 인증되고 보호된 tunnel을 만들어 떨어진 private network나 host를 논리적으로 연결한다. 암호화와 encapsulation 비용, MTU, route와 split-tunnel 정책을 함께 검토해야 한다. VPN을 사용했다는 사실만으로 tunnel 양끝의 application 권한이 자동 보장되지는 않는다.

## 출처

- 김영한 강사, [DNS](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61356)
- [RFC 2131 — Dynamic Host Configuration Protocol](https://www.rfc-editor.org/rfc/rfc2131.html)
- [RFC 4251 — Secure Shell Protocol Architecture](https://www.rfc-editor.org/rfc/rfc4251.html)
- [RFC 959 — File Transfer Protocol](https://www.rfc-editor.org/rfc/rfc959.html)
- [RFC 5321 — Simple Mail Transfer Protocol](https://www.rfc-editor.org/rfc/rfc5321.html)
- [RFC 1939 — Post Office Protocol 3](https://www.rfc-editor.org/rfc/rfc1939.html)
- [RFC 9051 — Internet Message Access Protocol 4rev2](https://www.rfc-editor.org/rfc/rfc9051.html)
- [그림으로 쉽게 배우는 네트워크 — DHCP, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160818)
- [그림으로 쉽게 배우는 네트워크 — SSH, FTP와 메일 프로토콜, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160830)

## 관련 문서

- [[Session-Presentation-Application-Layer|OSI 상위 계층]]
- [[Browser-URL-Flow|브라우저 URL 요청 흐름]]
- [[Forward-vs-Reverse-Proxy|Forward Proxy와 Reverse Proxy]]
- [[네트워크(Network)|네트워크 인덱스]]
