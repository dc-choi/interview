---
tags: [web, network, application-layer, dhcp, dns, ssh, ftp, smtp, pop3, imap, post-quantum, remote-desktop]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["Application Layer Protocols", "응용 계층 프로토콜", "DHCP DORA", "메일 프로토콜", "SSH 양자 내성 알고리즘"]
verified_at: 2026-10-27
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

### 양자 내성 알고리즘은 키 교환부터 들어왔다

OpenSSH 10.0은 하이브리드 양자 내성 키 교환 `mlkem768x25519-sha256`을 기본으로 쓰기 시작했다. 10.1은 양자 내성이 아닌 키 교환을 협상하면 client가 경고하는 `WarnWeakCrypto`(ssh_config, 기본 켜짐)를 넣었고, 10.6(2026-10-06)은 같은 옵션을 sshd_config에도 추가해 그런 client를 기본으로 로그에 남긴다.

서명은 그 뒤를 따른다. 10.6은 ML-DSA-44와 Ed25519를 묶은 하이브리드 서명 `ssh-mldsa44-ed25519`를 활성화하면서 이전 실험 구현의 `@openssh.com` 접미사를 떼었으므로, 실험 구현으로 만든 키는 다시 만들어야 한다. OpenBSD 8.0(2026-10-20, OpenSSH 10.6 포함) 릴리스 기록은 ssh(1)의 이 지원을 실험적이라고 표시하고, 2026-10-09 OpenBSD-current의 `ssh_config(5)`는 이 알고리즘을 `HostKeyAlgorithms`와 `PubkeyAcceptedAlgorithms` 기본 목록의 맨 끝에, 인증서 형식(`ssh-mldsa44-ed25519-cert`)은 인증서 묶음의 끝에 둔다. 배포판마다 OpenSSH 버전과 기본 목록이 다르므로 나눠서 확인한다. `ssh -V`는 버전을, `ssh -Q key`(또는 `ssh -Q HostKeyAlgorithms`)는 바이너리가 지원하는 알고리즘을 보여 줄 뿐 기본 목록과 순서는 보여 주지 않는다. client가 실제로 쓸 목록과 순서는 Host와 Match 블록을 적용한 설정을 출력하는 `ssh -G <host>`로, server 쪽은 유효 설정을 출력하는 `sshd -T`로 본다.

### 화면 원격과 기기 페어링

문자 셸 대신 화면을 원격으로 쓰는 도구도 같은 질문을 받는다. 상대를 어떻게 확인하고, 경로에 중계 서버가 끼는가다. Mac의 개별 창이나 화면을 iPhone과 iPad로 보내는 오픈소스 앱 Sill(Apache-2.0)의 공개 설계를 예로 들면 다음과 같다.

- **발견과 경로**: 같은 네트워크에서는 Bonjour로 Mac을 찾고, USB 연결과 기기 간 직접 Wi-Fi(기본 꺼짐)도 쓴다. 원격 접속(기본 꺼짐)은 별도 중계 서버 없이 사용자의 VPN(Tailscale 등)이나 포트 포워딩으로 연결한다.
- **암호화와 페어링**: 연결은 TLS 1.3이다. 기기마다 한 번 Mac에 표시된 코드를 스캔하거나 12자리 숫자를 입력해 페어링하고(USB는 자동), 이후 연결은 페어링한 키에 고정된다. 페어링 뒤 키를 고정하는 점은 SSH의 `known_hosts`와 같지만 첫 키를 믿는 방법이 다르다. Sill은 Mac에 표시된 코드나 USB 연결로 페어링해 첫 상대를 정한다. OpenSSH client는 기본값(`StrictHostKeyChecking ask`)에서 처음 보는 host key를 사용자가 받아들이면 기록하는 TOFU(trust on first use) 방식이라, fingerprint를 다른 경로로 대조하거나 SSHFP(`VerifyHostKeyDNS`, 기본 `no`)나 host CA를 쓰지 않으면 첫 연결 자체는 인증되지 않는다. Sill의 Require pairing 설정을 끄면 같은 네트워크의 어떤 기기든 암호화된 채로 연결할 수 있어 페어링이 주던 상대 확인이 빠진다.
- **캡처, 권한과 한계**: Mac은 ScreenCaptureKit으로 창이나 화면을 잡아 하드웨어 HEVC로 인코딩한다. 화면 기록과 손쉬운 사용 권한이 필요하고 macOS 15 이상은 로컬 네트워크 권한도 요구한다. Apple silicon과 macOS 14 이상, iOS/iPadOS 17 이상에서 동작하며 소리는 보내지 않고 클립보드는 텍스트 256KB까지다.

원격 화면 도구를 고를 때는 중계 서버의 존재, 페어링과 키 고정 방식, 원격 접속이 기본으로 열려 있는지, OS에 요구하는 권한부터 본다(설계 점검).

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

### SMTP 수락과 최종 배달은 다르다

메일 발송 성공은 어느 단계의 응답인지부터 구분한다(RFC 5321 3.3, 4.2.5절).

| 관측한 응답 | 의미 | 보장하지 않는 것 |
|---|---|---|
| `RCPT TO` 뒤 `250` | 해당 SMTP 서버가 수신자 경로를 수락 | 메시지 본문 수락, 최종 mailbox 배달 |
| `DATA` 시작의 `354` | 본문을 보내라는 중간 응답 | 전송 완료 |
| 본문 종료 뒤 `250` | 서버가 배달 또는 실패 보고 책임을 인수 | 최종 수신함 도착, 사용자 열람 |

없는 주소를 `RCPT TO` 단계에서 `550`으로 거부할 수도 있고, 본문 수신 뒤 검증하거나 relay 이후 실패를 반송할 수도 있다. 내부 도메인은 즉시 거절하고 외부 도메인은 항상 수락한다는 규칙은 없다. Google도 존재하지 않는 계정의 `550 5.1.1`을 공식 오류 목록에 명시한다. 응답 차이는 접속한 서버, relay 경로와 정책을 확인해야 하며 계정 열거 방지 하나로 단정하지 않는다.

운영에서는 동기 SMTP 오류와 수락 이후 bounce를 별도로 처리하고, 제출 성공과 배달 실패 상태를 구분한다. 정상 주소, 즉시 거절, 수락 이후 실패를 각각 시험한다. bounce의 기본 목적지는 화면에 보이는 `From` 헤더가 아니라 SMTP envelope의 reverse-path다. null reverse-path 메시지에는 반송 루프를 막기 위해 다시 오류 메일을 보내지 않는다.

## Proxy와 VPN

proxy는 client 또는 server를 대신해 특정 application traffic을 전달한다. cache가 hit하면 latency와 origin 부하를 줄일 수 있지만 언제나 속도를 높이는 장치는 아니다. [[Forward-vs-Reverse-Proxy]]

VPN의 원격 접속과 사이트 간 연결, 터널의 보호 범위, MTU와 split-tunnel 정책은 [[VPN-and-Private-Network|VPN과 사설 네트워크]]에서 다룬다.

## 출처

2026-10-06 부분 대조: SMTP 수락과 배달 책임은 RFC 5321 3.3, 4.2.5, 6.1절, 계정 부재 오류는 Google 공식 목록으로 확인했다. 나머지 프로토콜의 재검증 날짜는 갱신하지 않았다. 2026-10-27에는 SSH 양자 내성 알고리즘 절을 OpenSSH 릴리스 노트와 OpenBSD 문서로, 화면 원격 절을 Sill 저장소 README로 대조했다.

- [Gmail SMTP errors and codes — Google Workspace](https://knowledge.workspace.google.com/admin/support/troubleshooting/gmail-smtp-errors-and-codes)
- 김영한 강사, [DNS](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61356)
- [RFC 2131 — Dynamic Host Configuration Protocol](https://www.rfc-editor.org/rfc/rfc2131.html)
- [RFC 4251 — Secure Shell Protocol Architecture](https://www.rfc-editor.org/rfc/rfc4251.html)
- [RFC 4252 — Secure Shell Authentication Protocol](https://www.rfc-editor.org/rfc/rfc4252.html)
- [RFC 4253 — Secure Shell Transport Layer Protocol](https://www.rfc-editor.org/rfc/rfc4253.html)
- [SSH (Secure Shell) Remote Login Protocol, draft-ylonen-ssh-protocol-00 — IETF](https://www.ietf.org/archive/id/draft-ylonen-ssh-protocol-00.txt)
- [ssh(1) — OpenBSD manual pages](https://man.openbsd.org/ssh) — 2026-10-27 `-Q`, `-G` 대조
- [sshd(8) — OpenBSD manual pages](https://man.openbsd.org/sshd) — `-T` 확장 시험 모드
- [OpenSSH Release Notes — OpenSSH](https://www.openssh.org/releasenotes.html) — 2026-10-27 10.0, 10.1, 10.6의 양자 내성 키 교환, WarnWeakCrypto와 하이브리드 서명 항목 대조
- [ssh_config(5) — OpenBSD manual pages](https://man.openbsd.org/ssh_config) — 2026-10-09판 기본 알고리즘 목록, `StrictHostKeyChecking`과 `VerifyHostKeyDNS` 기본값
- [OpenBSD 8.0 — OpenBSD](https://www.openbsd.org/80.html)
- [Sill README — GitHub, Saffsanity/sill](https://github.com/Saffsanity/sill)
- [Sill - iPhone과 iPad에서 Mac의 개별 창을 원격 조작하는 무료 앱 — GeekNews](https://news.hada.io/topic?id=35476)
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
