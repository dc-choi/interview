---
tags: [web, network, application-layer, dhcp, dns, ssh, ftp, smtp, pop3, imap]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["Application Layer Protocols", "응용 계층 프로토콜", "DHCP DORA", "메일 프로토콜"]
verified_at: 2026-09-30
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

| 단계 | IP 출발지 → 목적지 | 목적지 MAC | 포인트 |
|---|---|---|---|
| Discover | `0.0.0.0` → `255.255.255.255` | 브로드캐스트 | 주소가 없는 client는 출발지 IP를 0으로 둔다 |
| Offer | server → 할당할 주소(`yiaddr`) 또는 `255.255.255.255` | client MAC 또는 브로드캐스트 | 아래 전송 규칙에 따라 갈린다 |
| Request | `0.0.0.0` → `255.255.255.255` | 브로드캐스트 | 고른 server를 server identifier 옵션으로 밝힌다 |
| ACK | Offer와 같은 규칙 | Offer와 같은 규칙 | binding과 lease 확정 |

client는 UDP 68번, server는 UDP 67번 포트를 쓴다. Request를 다시 브로드캐스트하는 이유는 Offer를 보낸 모든 server에 선택 결과를 알리기 위해서다. 선택받지 못한 server는 이 메시지를 자기 제안이 거절됐다는 통지로 쓴다. server의 응답은 relay를 거친 요청(`giaddr`)이면 relay agent로, client가 이미 주소를 가진 갱신(`ciaddr`)이면 그 주소로 유니캐스트한다. 둘 다 아니면 client가 broadcast 비트를 켰을 때 브로드캐스트하고, 아니면 client MAC과 할당할 주소로 유니캐스트한다. 그래서 Offer와 ACK가 항상 유니캐스트라고 외우지 않는다.

갱신은 항상 네 단계를 처음부터 반복하지 않는다. client state와 lease 시점에 따라 기존 server에 DHCPREQUEST를 직접 보내거나 rebinding broadcast를 보낼 수 있다. DHCP는 주소를 소유권으로 영구 부여하는 것이 아니라 정해진 정책과 기간에 따라 binding을 관리한다.

## DNS와 HTTP

- **DNS**: 이름을 resource record로 해석하는 계층형 분산 시스템이다. 상세 흐름은 [[DNS]].
- **HTTP**: resource representation과 request/response semantics를 정의한다. 상세는 [[HTTP]].

DNS가 먼저이고 HTTP가 나중이라는 설명은 일반적인 웹 요청 흐름이지 모든 요청의 고정 규칙은 아니다. cache, 이미 알고 있는 IP, proxy와 service discovery에 따라 경로가 달라진다.

## Telnet과 SSH

Telnet은 범용 양방향 문자 통신과 terminal option 협상을 제공하지만 자체 confidentiality와 server authentication을 제공하지 않는다. 신뢰할 수 없는 network의 원격 shell로 사용하면 credential과 명령이 노출될 수 있다.

SSH는 암호화된 transport, server authentication과 선택 가능한 user authentication을 제공한다. 공개키 인증은 대표 방식이지만 SSH가 항상 key pair만 쓰는 것은 아니며 password 등 여러 method를 협상할 수 있다. 기본 포트는 Telnet TCP 23, SSH TCP 22이다. 공유기와 네트워크 장비의 원격 관리도 비밀번호가 평문으로 흐르는 Telnet 대신 SSH로 하고, 쓰지 않는 Telnet 포트는 닫는다.

### SSH 공개키 인증은 서명으로 개인키 소유를 증명한다

사용자는 공개키를 서버 계정에 등록해 두고(OpenSSH의 `~/.ssh/authorized_keys`), 로그인할 때 세션 식별자, 사용자 이름, 서비스 이름, 공개키 알고리즘과 공개키를 묶은 데이터에 개인키로 서명해 보낸다. 서버는 그 공개키가 해당 사용자에게 허용됐는지와 서명이 맞는지를 모두 확인한다(RFC 4252 7절). 세션 식별자는 연결마다 다른 첫 키 교환의 exchange hash라 가로챈 서명을 다른 연결에 재사용할 수 없다.

서버가 공개키로 암호화한 난수를 사용자가 개인키로 복호화해 돌려준다는 설명은 1995년 SSH-1 초안의 RSA 인증에 해당하며(그때도 복호화한 값을 세션 ID와 묶은 MD5로 응답했다), OpenSSH client는 현재 SSH protocol 2만 지원한다. 서명에서 두 키를 쓰는 방향은 [[Public-Key-Cryptography|공개키 암호와 디지털 서명]]을 따른다.

사용자 인증과 별개로 client는 server의 host key로 서버를 인증한다. host 이름과 공개 host key의 대응을 로컬 DB(OpenSSH의 `~/.ssh/known_hosts`)에 두고, 키가 바뀌면 경고하며 password 인증을 막는다. 자동화에서 이 검증을 끄는 위험은 [[Single-Host-SPA-API-Deployment-SSH-Workflow#runner가 들어오는 경로와 host key|SSH 배포의 host key 검증]]. 터미널은 입출력을 맡는 프로그램이고, 그 안에서 실행한 SSH client가 원격 서버의 셸과 연결된다. 명령을 해석하는 주체는 원격 셸이다.

## FTP, FTPS와 SFTP

FTP는 보통 하나의 control connection과 별도의 data connection을 사용한다. active/passive mode에 따라 data connection을 여는 쪽이 달라 NAT와 firewall rule을 복잡하게 할 수 있다.

기본 FTP는 credential과 data를 암호화하지 않는다. FTPS는 FTP에 TLS를 적용한 프로토콜이고, SFTP는 SSH subsystem으로 동작하는 별개 프로토콜이다. 이름이 비슷해도 port와 운영 경로가 다르다.

## SMTP, POP3와 IMAP

| 프로토콜 | 핵심 역할 | 기본 TCP 포트 | 운영 관점 |
|---|---|---|---|
| SMTP | message submission과 mail server 간 relay | 25 server 간 relay, 587 submission(STARTTLS), 465 submission(implicit TLS) | 보내는 경로, queue와 재시도 |
| POP3 | server mailbox에서 message retrieval | 110, 995(implicit TLS) | 단순 다운로드 중심, server 보존 정책 별도 |
| IMAP | server mailbox와 folder, flag 상태 접근 | 143, 993(implicit TLS) | 여러 device에서 server state 동기화에 적합 |

메일을 보낸다는 동작과 mailbox를 읽는 동작은 프로토콜이 다르다. RFC 8314는 메일 client와 submission, mailbox 접근 server 사이의 평문 접속을 폐기 대상으로 보고 implicit TLS 포트를 우선하라고 권고하며, 전환 기간에는 587의 STARTTLS와 465의 implicit TLS를 모두 구현하라고(SHOULD) 둔다. 현대 배포에서는 TLS, authentication, spam 방어와 SPF/DKIM/DMARC 정책까지 함께 설계하며 기본 port 번호만으로 보안을 판단하지 않는다.

## Proxy와 VPN

proxy는 client 또는 server를 대신해 특정 application traffic을 전달한다. cache가 hit하면 latency와 origin 부하를 줄일 수 있지만 언제나 속도를 높이는 장치는 아니다. [[Forward-vs-Reverse-Proxy]]

VPN의 원격 접속과 사이트 간 연결, 터널의 보호 범위, MTU와 split-tunnel 정책은 [[VPN-and-Private-Network|VPN과 사설 네트워크]]에서 다룬다.

## 출처

- 김영한 강사, [DNS](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61356)
- [RFC 2131 — Dynamic Host Configuration Protocol](https://www.rfc-editor.org/rfc/rfc2131.html)
- [RFC 4251 — Secure Shell Protocol Architecture](https://www.rfc-editor.org/rfc/rfc4251.html)
- [RFC 4252 — Secure Shell Authentication Protocol](https://www.rfc-editor.org/rfc/rfc4252.html)
- [RFC 4253 — Secure Shell Transport Layer Protocol](https://www.rfc-editor.org/rfc/rfc4253.html)
- [SSH (Secure Shell) Remote Login Protocol, draft-ylonen-ssh-protocol-00 — IETF](https://www.ietf.org/archive/id/draft-ylonen-ssh-protocol-00.txt)
- [ssh(1) — OpenBSD manual pages](https://man.openbsd.org/ssh)
- [RFC 959 — File Transfer Protocol](https://www.rfc-editor.org/rfc/rfc959.html)
- [RFC 5321 — Simple Mail Transfer Protocol](https://www.rfc-editor.org/rfc/rfc5321.html)
- [RFC 6409 — Message Submission for Mail](https://www.rfc-editor.org/rfc/rfc6409.html)
- [RFC 8314 — Cleartext Considered Obsolete: Use of TLS for Email Submission and Access](https://www.rfc-editor.org/rfc/rfc8314.html)
- [RFC 1939 — Post Office Protocol 3](https://www.rfc-editor.org/rfc/rfc1939.html)
- [RFC 9051 — Internet Message Access Protocol 4rev2](https://www.rfc-editor.org/rfc/rfc9051.html)
- [그림으로 쉽게 배우는 네트워크 — DHCP, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160818)
- [그림으로 쉽게 배우는 네트워크 — Telnet과 SSH, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160830)
- [그림으로 쉽게 배우는 네트워크 — SMTP, POP, IMAP, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160832)

## 관련 문서

- [[Session-Presentation-Application-Layer|OSI 상위 계층]]
- [[Browser-URL-Flow|브라우저 URL 요청 흐름]]
- [[Forward-vs-Reverse-Proxy|Forward Proxy와 Reverse Proxy]]
- [[네트워크(Network)|네트워크 인덱스]]
