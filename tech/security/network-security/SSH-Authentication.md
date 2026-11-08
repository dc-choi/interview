---
tags: [security, ssh, authentication, cryptography, network]
status: done
verified_at: 2026-10-07
category: "Security - 네트워크 보안"
aliases: ["SSH Authentication", "SSH 인증", "SSH 호스트 키와 사용자 키"]
---

# SSH 인증: 서버 신원, 사용자 신원과 세션 키

SSH는 신뢰할 수 없는 네트워크에서 원격 로그인과 명령 실행을 보호하는 프로토콜이다. **서버를 믿을 수 있는지 확인하는 절차와 사용자가 그 서버 계정에 접근할 수 있는지 확인하는 절차가 다르다.** 공개키로 로그인하더라도 실제 명령과 응답을 사용자 공개키로 매번 암호화하는 것은 아니다.

## 원격 셸과 터미널의 역할

SSH 접속에서 보이는 명령줄은 원격 프로그램을 조작하는 인터페이스다. SSH 자체를 검은 화면이나 서버의 운영체제와 같은 개념으로 보지 않는다. 서버 인증과 사용자 인증 뒤에 어떤 프로그램을 실행할지 정하는 연결 단계가 따로 있다.

RFC 4254의 세션은 원격 셸, 명령이나 서브시스템을 실행하며, 터미널 할당은 선택 사항이다. `shell` 요청은 원격 사용자의 기본 셸을 시작하고, `exec` 요청은 지정한 명령을 실행하도록 요청한다. 대화형 입력 없이 명령 실행과 결과 수집에 사용하는 것도 이 구조로 설명할 수 있다. 세션이 열렸다는 사실만으로 모든 명령의 실행 권한이 주어지는 것은 아니다.

2026-10-24 RFC 4254의 6절, 6.2절과 6.5절을 대조한 설명이다. 실제 서버 접속과 클라이언트별 설정은 시험하지 않았으며 기존 구현 설명의 `verified_at`은 유지한다.

## 세 계층과 세 종류의 키

RFC 4251은 SSH를 전송, 사용자 인증, 연결의 세 프로토콜로 나눈다. 전송 계층이 서버 인증, 기밀성과 무결성을 제공하고, 그 위에서 사용자 인증을 수행한다. 연결 프로토콜은 보호된 연결에 여러 논리 채널을 만들어 셸이나 포트 포워딩 등에 사용한다.

| 구분 | 증명하거나 보호하는 것 | 검증하는 쪽 |
|---|---|---|
| 서버 호스트 키 | 접속 상대 서버의 신원 | 클라이언트 |
| 사용자 인증 키 | 서버 계정에 허용된 개인키를 사용할 수 있다는 사실 | 서버 |
| 연결에서 파생한 대칭 키 | 이후 양방향 트래픽의 기밀성과 무결성 | 통신 양쪽 |

호스트 키와 사용자 키는 서로 다른 신원을 위한 키다. 서버 호스트 키를 신뢰했다고 사용자 로그인이 허가되지는 않고, 유효한 사용자 키가 있어도 가짜 서버를 알아서 판별하지는 못한다.

## 공개키 로그인 흐름

1. 보통 TCP 연결 위에서 SSH 버전 문자열을 교환하고 키 교환, 호스트 키, 암호화 등의 알고리즘을 협상한다.
2. 키 교환 중 서버가 호스트 공개키와 서명을 제시한다. 클라이언트는 서명뿐 아니라 그 키가 접속하려는 서버에 속한다는 신뢰 관계도 확인한다.
3. 양쪽은 키 교환으로 얻은 비밀과 교환 해시 등을 이용해 트래픽 보호 키를 각각 파생한다. 파생한 세션 키 자체를 네트워크로 보내는 방식이 아니다. RFC 4253의 키 파생은 클라이언트에서 서버로 가는 방향과 반대 방향을 구분한다.
4. 각 방향에서 `SSH_MSG_NEWKEYS` 이후 새 키와 알고리즘을 사용한다. 사용자 인증은 이렇게 보호된 전송 계층 위에서 진행한다.
5. 공개키 인증에서는 클라이언트가 사용할 공개키를 제시하고 개인키로 인증 요청에 서명한다. 서버는 해당 계정에 그 키가 허용됐는지와 서명이 유효한지 확인한다.
6. 인증과 서버 정책이 허용하면 셸이나 원격 명령을 위한 채널을 연다. 공개키 외의 인증 방법도 있으므로 모든 SSH 접속이 이 사용자 인증 방식을 쓰는 것은 아니다.

RFC 4252의 공개키 인증 서명에는 세션 식별자, 사용자 이름과 인증 요청 필드가 들어간다. 개인키 자체를 서버로 보내지 않고, 해당 연결의 요청에 대한 서명으로 키 사용 능력을 증명한다. 공개키 수락 가능성을 먼저 질의한 뒤 서명 요청을 보내는 절차도 허용된다.

## OpenSSH의 두 공개키 목록

| 파일 이름 | 일반적인 위치와 역할 |
|---|---|
| `known_hosts` | 클라이언트 측에서 서버 이름과 호스트 공개키의 신뢰 관계를 기억 |
| `authorized_keys` | 서버의 대상 사용자 계정에서 로그인을 허용할 사용자 공개키를 지정 |

두 파일은 비밀키 저장소가 아니다. 이 표는 OpenSSH의 일반적인 파일 기반 방식이며, 인증서와 신뢰하는 CA를 이용하는 구성도 가능하다. 프로토콜의 역할과 특정 구현의 파일 배치를 구분한다.

## 첫 접속과 호스트 키 변경

처음 본 키에 서명이 맞는다는 사실만으로 그 키가 의도한 서버의 것이라고 알 수는 없다. 서버 콘솔이나 이미 신뢰하는 관리 경로에서 얻은 지문과 비교해야 한다. 처음 받은 키를 그대로 신뢰하는 방식은 최초 접속 때의 중간자 공격을 막지 못한다.

`ssh-keyscan`은 상대가 내놓는 공개키를 수집하는 도구다. 수집 결과를 별도 확인 없이 신뢰 목록에 넣으면 공격자가 제시한 키도 신뢰할 수 있다. 수집과 인증은 별개다.

이미 알던 호스트 키가 바뀌었다면 정상적인 서버 교체나 키 회전일 수도 있고 다른 서버나 공격자에게 연결된 것일 수도 있다. 경고를 없애려고 기존 기록부터 지우지 말고, 변경 이유와 새 지문을 신뢰하는 경로로 확인한다. CI 배포에서 호스트 키 검증을 생략하는 위험과 실제 설정은 [[Single-Host-SPA-API-Deployment-SSH-Workflow|SSH 배포 workflow]]에서 다룬다.

## 개인키 저장 형식: PEM과 PPK

키 알고리즘과 파일 저장 형식은 별개다. PuTTY의 PPK와 OpenSSH 개인키 형식 사이의 변환은 같은 키를 다른 클라이언트에서 읽게 만드는 작업이다. 확장자만 바꾸는 것으로 변환되지 않으며, 키를 새로 생성하거나 서버의 접근 권한을 바꾸는 작업도 아니다.

Windows PuTTYgen에서는 OpenSSH 키를 `Conversions > Import key`로 읽고 `Save private key`로 PPK를 저장한다. 반대 방향은 PPK를 `Load`한 뒤 `Conversions > Export OpenSSH key`를 사용한다. 가져오기와 내보내기에서 패스프레이즈 보호를 확인한다.

Unix/Linux용 `puttygen`이 설치된 환경의 변환 예시는 다음과 같다. 기존 출력 파일이 없는 별도 경로를 사용한다.

```bash
puttygen input.pem -O private -o converted.ppk
puttygen input.ppk -O private-openssh -o converted.pem
```

`private-openssh`는 해당 키 유형에 가능한 가장 오래된 OpenSSH 형식을 고른다. Ed25519는 새 OpenSSH 형식이 필요하므로 출력 이름이 `.pem`이어도 구형 PEM 형식이라고 단정할 수 없다. 새 형식을 강제하려면 `private-openssh-new`를 쓴다.

변환 전후 공개키 지문을 같은 알고리즘으로 비교하고 출력 파일의 접근 권한과 암호화 여부를 확인한다. 패스프레이즈를 새로 설정하거나 바꾸려면 `-P`를 사용한다. 개인키를 온라인 변환 사이트에 올리지 않고, 신뢰하는 로컬 도구에서 처리한다. 이는 운영 점검 제안이며 실제 키 파일을 읽거나 변환한 기록은 아니다.

## 포워딩 권한도 로그인 계정의 경계 안에 둔다

SSH 로그인 허용과 포워딩 허용은 따로 점검한다. 서버 프로세스가 높은 권한으로 실행되더라도 포워딩 대상 파일과 Unix 소켓의 접근은 인증된 사용자 권한으로 제한해야 한다. 경로 문자열 검사만으로 심볼릭 링크 교체나 검사 후 사용의 경합까지 막았다고 판단하지 않는다.

2026-11-02 Tailscale 공식 TS-2026-014를 대조했다. Tailscale SSH의 Unix 소켓 포워딩은 인증되고 포워딩이 허용된 peer가 root 전용 소켓에 닿을 수 있던 문제이며, 1.104.4 이상에서 인증된 사용자 권한으로 처리하도록 수정됐다. SSH 인증 없는 인터넷 공격과 같은 조건으로 설명하지 않는다.

공식 완화책은 `tailscaled` **서비스 환경**에 `TS_SSH_DISABLE_FORWARDING=1`을 설정하고 서비스를 재시작하는 것이다. 셸 한 곳에 환경 변수를 설정하는 것과 서비스에 적용하는 것은 다르다. 포워딩이 필요 없다면 Tailscale SSH 전체를 끄지 않고 이 경로를 줄일 수 있지만, 같은 릴리스에서 수정한 SSH 세션 메모리 고갈(TS-2026-015) 등 다른 문제까지 고치는 설정은 아니다. 현재 버전과 사용 기능에 맞는 공식 공지를 확인하고 업데이트한다. 실제 설정이나 재시작은 수행하지 않았다.

2026-10-28 사용자 제공 GeekNews 발췌는 조사 중의 권고를 담고 있다. 그 당시의 모든 사용자 비활성화 불필요 평가를 영구적인 안전 보증으로 사용하지 않는다. 기존 SSH 일반 설명 전체는 다시 대조하지 않아 위 `verified_at`은 유지한다.

## 비밀번호 인증은 해시 문자열 비교에 기대고 있다

PAM 없이 비밀번호를 확인하는 OpenSSH는 입력한 비밀번호를 `crypt()`로 해시한 결과와 shadow 파일의 저장값을 `strcmp`로 비교한다. 10.6p2와 배포판 백포트 이전에는 저장값이 해시가 아니라 비밀번호 미설정 표식 `*`여도 같은 비교를 거쳤다. 그래서 해시 함수가 실패를 NULL 대신 `*`로 돌려주면 그 계정이 열릴 수 있었다. `*`는 키로만 로그인하는 계정에 흔한 값이고, `!`로 잠근 계정은 Alpine이 영향 없음으로 분류했다. 오류 표시 값이 정상 데이터의 값과 겹치지 않는지는 라이브러리 경계에서 따로 확인한다.

2026-11-08 Alpine 공지와 보안 추적기, OpenSSH 10.6p2 릴리스 노트와 수정 커밋, CVE 레코드, musl 메일링 리스트를 대조한 사례가 CVE-2026-123158이다.

- **원인:** musl의 `crypt()`는 키가 256바이트를 넘으면 오류 표시로 `*`를 돌려준다. Alpine 기본 이미지의 `root`처럼 비밀번호 필드가 `*`인 계정에 257~1024바이트 비밀번호를 보내면 두 문자열이 같아 인증을 통과한다. 1024는 sshd의 비밀번호 길이 상한이다. 저장값이 짧으면 sshd가 다른 계정의 salt를 빌리므로 `$5$`나 `$6$` 해시를 가진 다른 계정이 하나 이상 있어야 한다.
- **조건:** PAM을 쓰지 않는 `openssh-server`와 `UsePAM no`인 `openssh-server-pam`이 대상이고, `UsePAM yes`이면 해당하지 않는다. `PasswordAuthentication yes`(OpenSSH 기본값)여야 하며, 기본값 `PermitRootLogin prohibit-password`가 root를 막으므로 root 계정은 `PermitRootLogin yes`일 때만 열린다. Alpine은 3.21~3.24와 edge, 정기 갱신이 끝난 3.16~3.20에서 확인했다. musl 메인테이너는 Dropbear 등 OpenSSH가 아닌 서버는 영향이 없다고 밝혔다.
- **수정 위치:** OpenSSH가 저장값이 최소 해시 길이보다 짧으면 비교하지 않도록 고쳤고 업스트림은 10.6p2(2026-11-05)에 넣었다. OpenSSH는 근본 원인이 자기 코드에 있다고 보지 않고, musl 메인테이너도 musl의 버그가 아니라 호출부의 잘못된 사용이라고 보면서 다음 릴리스 주기에 이 동작을 바꿀 가능성이 높다고 밝혔다. Alpine stable branch는 백포트한 패키지로 고쳤으므로(예: 3.24는 `openssh` `10.3_p1-r2`) 업스트림 버전 번호만으로 판단하지 않고 보안 추적기의 branch별 수정 버전을 본다.
- **대응:** `apk upgrade -U -a` 뒤 `rc-service sshd restart`로 실행 중인 데몬까지 바꾼다. 당장 올릴 수 없으면 기존 세션을 연 채로 공개키 접속이 되는지 확인하고 `PasswordAuthentication no`로 바꾼 뒤 재시작하며, 재시작 뒤 새 로그인을 확인한 다음 기존 세션을 닫는다. 로그인을 배제할 수 없으면 침해된 장비로 다룬다. 컨테이너 안에서 sshd를 실행하지 않는 경우는 Alpine 공지의 영향 없음 범위다.

실제 악용은 Previdian 페이지의 공격 시도 관측 기록만 확인했고, 그 페이지 안의 관측 시각도 서로 맞지 않는다. 2026-11-06 판 CISA KEV 피드에는 없다. 이 절은 공지와 소스 대조이며 실제 서버에서 재현하거나 설정을 바꾸지 않았다.

## 확인 질문

- 호스트 키 검증은 성공했는데 사용자 인증이 실패했다면 어느 신원과 권한을 확인해야 하는가?
- 사용자 공개키가 서버에 등록돼 있다는 사실만으로 접속한 서버도 진짜라고 말할 수 있는가?
- 네트워크에서 받은 호스트 키와 같은 네트워크에서 계산한 지문을 비교하는 것만으로 신뢰가 생기는가?

## 출처

2026-10-06 기준으로 SSH의 계층, 키 교환과 공개키 인증 구조를 RFC와 대조했다. 구현 설명은 OpenSSH 매뉴얼 기준이며, RFC의 과거 알고리즘 목록을 현재 권장 설정으로 채택한 문서가 아니다. 2026-10-07에는 개인키 형식 변환을 PuTTY 매뉴얼과 대조했다. 실제 서버 접속이나 로컬 키 파일 검사는 수행하지 않았다.

- [IETF, RFC 4251: The Secure Shell (SSH) Protocol Architecture](https://www.rfc-editor.org/rfc/rfc4251.html)
- [IETF, RFC 4252: The Secure Shell (SSH) Authentication Protocol](https://www.rfc-editor.org/rfc/rfc4252.html)
- [IETF, RFC 4253: The Secure Shell (SSH) Transport Layer Protocol](https://www.rfc-editor.org/rfc/rfc4253.html)
- [IETF, RFC 4254: The Secure Shell (SSH) Connection Protocol](https://www.rfc-editor.org/rfc/rfc4254.html) — 세션, 선택적 터미널 할당과 셸 및 명령 요청
- [OpenBSD, ssh(1)](https://man.openbsd.org/ssh.1)
- [OpenBSD, ssh-keyscan(1)](https://man.openbsd.org/ssh-keyscan.1)
- [PuTTY, Using public keys for SSH authentication](https://the.earth.li/~sgtatham/putty/0.85/htmldoc/Chapter8.html)
- [PuTTY, puttygen(1), Debian 매뉴얼 배포본](https://manpages.debian.org/testing/putty-tools/puttygen.1.en.html)
- [Tailscale, Security Bulletins: TS-2026-014, TS-2026-015](https://tailscale.com/security-bulletins) — 2026-11-02 인증/포워딩 조건, 수정 버전과 서비스 환경 완화 대조
- [Alpine Linux, Security advisory: openssh-server password authentication bypass](https://alpinelinux.org/posts/2026-11-05-openssh-password-authentication-bypass/) — 2026-11-08 원인, 조건, 확인한 릴리스, 대응과 영향 없음 범위 대조
- [Alpine Security Tracker, CVE-2026-123158](https://security.alpinelinux.org/vuln/CVE-2026-123158) — 2026-11-08 branch별 수정 패키지 버전 확인
- [OpenSSH 10.6p2 Release Notes — OpenSSH](https://www.openssh.org/releasenotes.html#10.6p2) — 2026-11-05 릴리스
- [avoid password authn bypass — GitHub openssh/openssh-portable](https://github.com/openssh/openssh-portable/commit/4353fdc43ef646c43a8dda7025cc1a898caf1482) — 최소 해시 길이 검사와 근본 원인에 대한 커밋 메시지 확인
- [auth-passwd.c — GitHub openssh/openssh-portable](https://github.com/openssh/openssh-portable/blob/master/auth-passwd.c) — `strcmp` 비교와 `MAX_PASSWORD_LEN` 1024 확인
- [Advisory for OpenSSH+musl users — musl mailing list](https://www.openwall.com/lists/musl/2026/11/05/4) — 2026-11-05 메인테이너의 입장, 다음 릴리스의 변경 가능성과 Dropbear 등 영향 범위
- [CVE Program, CVE-2026-123158](https://www.cve.org/CVERecord?id=CVE-2026-123158) — 2026-11-05 게시, CVE API 레코드로 설명 확인
- [CISA, Known Exploited Vulnerabilities Catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) — 2026-11-06 판 피드에 미등재 확인
- [CVE-2026-123158 — Previdian](https://previdian.com/CVE-2026-123158) — 보안 업체의 공격 시도 관측 기록, 단일 출처

## 관련 문서

- [[Public-Key-Cryptography|공개키 암호와 서명]]
- [[Single-Host-SPA-API-Deployment-SSH-Workflow|SSH 배포 workflow]]
- [[네트워크보안(NetworkSecurity)|네트워크 보안]]
