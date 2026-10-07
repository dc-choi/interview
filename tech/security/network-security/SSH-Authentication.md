---
tags: [security, ssh, authentication, cryptography, network]
status: done
verified_at: 2026-10-07
category: "Security - 네트워크 보안"
aliases: ["SSH Authentication", "SSH 인증", "SSH 호스트 키와 사용자 키"]
---

# SSH 인증: 서버 신원, 사용자 신원과 세션 키

SSH는 신뢰할 수 없는 네트워크에서 원격 로그인과 명령 실행을 보호하는 프로토콜이다. **서버를 믿을 수 있는지 확인하는 절차와 사용자가 그 서버 계정에 접근할 수 있는지 확인하는 절차가 다르다.** 공개키로 로그인하더라도 실제 명령과 응답을 사용자 공개키로 매번 암호화하는 것은 아니다.

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

## 확인 질문

- 호스트 키 검증은 성공했는데 사용자 인증이 실패했다면 어느 신원과 권한을 확인해야 하는가?
- 사용자 공개키가 서버에 등록돼 있다는 사실만으로 접속한 서버도 진짜라고 말할 수 있는가?
- 네트워크에서 받은 호스트 키와 같은 네트워크에서 계산한 지문을 비교하는 것만으로 신뢰가 생기는가?

## 출처

2026-10-06 기준으로 SSH의 계층, 키 교환과 공개키 인증 구조를 RFC와 대조했다. 구현 설명은 OpenSSH 매뉴얼 기준이며, RFC의 과거 알고리즘 목록을 현재 권장 설정으로 채택한 문서가 아니다. 2026-10-07에는 개인키 형식 변환을 PuTTY 매뉴얼과 대조했다. 실제 서버 접속이나 로컬 키 파일 검사는 수행하지 않았다.

- [IETF, RFC 4251: The Secure Shell (SSH) Protocol Architecture](https://www.rfc-editor.org/rfc/rfc4251.html)
- [IETF, RFC 4252: The Secure Shell (SSH) Authentication Protocol](https://www.rfc-editor.org/rfc/rfc4252.html)
- [IETF, RFC 4253: The Secure Shell (SSH) Transport Layer Protocol](https://www.rfc-editor.org/rfc/rfc4253.html)
- [OpenBSD, ssh(1)](https://man.openbsd.org/ssh.1)
- [OpenBSD, ssh-keyscan(1)](https://man.openbsd.org/ssh-keyscan.1)
- [PuTTY, Using public keys for SSH authentication](https://the.earth.li/~sgtatham/putty/0.85/htmldoc/Chapter8.html)
- [PuTTY, puttygen(1), Debian 매뉴얼 배포본](https://manpages.debian.org/testing/putty-tools/puttygen.1.en.html)

## 관련 문서

- [[Public-Key-Cryptography|공개키 암호와 서명]]
- [[Single-Host-SPA-API-Deployment-SSH-Workflow|SSH 배포 workflow]]
- [[네트워크보안(NetworkSecurity)|네트워크 보안]]
