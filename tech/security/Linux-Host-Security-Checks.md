---
tags: [security, linux, integrity, hardening, incident-response]
status: done
verified_at: 2026-11-16
category: "보안(Security)"
aliases: ["Linux Host Security Checks", "리눅스 호스트 보안 점검", "파일 무결성 점검"]
---

# Linux 호스트 보안 점검: 무결성 기준선, 로그인 기록과 기본 권한

서버 한 대를 직접 운영할 때 침해 여부를 확인하는 근거는 대부분 사고 전에 만들어 둔 것이다. 파일 해시의 기준선이 없으면 무엇이 바뀌었는지 비교할 대상이 없고, 로그인 기록 파일이 꺼져 있으면 그 기록만큼 누가 들어왔는지 재구성하기 어려워진다. 이 문서는 파일 무결성, 로그인과 명령 기록, 관리자 계정 식별, 파일 기본 권한과 비밀번호 복잡도를 점검 단위로 묶는다.

## 파일 무결성은 미리 만든 기준선과의 비교다

무결성 점검은 파일이 바뀌었는지를 해시 비교로 판정한다([[CIA-Triad|CIA Triad]]의 무결성). 해시는 한 글자만 덧붙여도 달라지므로, 정상 상태의 해시 목록을 저장해 두었다가 나중에 다시 계산해 비교하면 변경된 파일을 찾을 수 있다.

GNU coreutils의 `sha256sum`은 `-c`(`--check`)로 저장한 목록의 해시를 다시 확인한다. 이때 입력은 이전에 같은 프로그램이 출력한 형식이어야 한다.

```bash
# 기준선 생성: 공백이나 줄바꿈이 든 파일명도 안전하게 넘긴다
find /etc /usr/local/bin -type f -print0 | xargs -0 sha256sum > baseline.sha256

# 비교: 바뀐 파일은 FAILED로 보고된다
sha256sum --quiet -c baseline.sha256
```

`find ... | xargs`를 그대로 쓰면 공백, 따옴표나 줄바꿈이 든 파일명에서 잘못 동작하므로 `-print0`과 `xargs -0`을 짝지어 쓴다(find 매뉴얼). `--quiet`는 통과한 파일의 OK 출력을 생략하고, `--ignore-missing`은 목록에 있지만 사라진 파일을 실패로 세지 않으므로 삭제 탐지가 필요하면 쓰지 않는다.

`-c`는 목록에 적힌 파일만 확인하므로 나중에 새로 생긴 파일은 아무 출력도 내지 않는다. 디렉터리에 심어진 새 실행 파일을 찾으려면 현재 파일 목록을 기준선의 목록과 따로 비교하거나 전용 도구를 쓴다.

### 전용 도구: AIDE

AIDE는 설정 파일의 규칙(정규 표현식)으로 대상 파일과 검사 속성을 정하고 데이터베이스를 만든 뒤, 이후 실행에서 그 데이터베이스와 비교하는 파일, 디렉터리 무결성 검사기다. 매뉴얼(0.16.2판, 확인일 기준 홈페이지의 최신 릴리스는 0.19.5) 기준으로 `aide --init`으로 데이터베이스를 만들고 `aide --check`로 비교한다.

### 기준선이 공격자의 손에 닿으면 소용없다

root를 얻은 공격자는 파일과 함께 해시 목록이나 검사 도구도 바꿀 수 있다. AIDE 매뉴얼은 새로 만든 데이터베이스를 읽기 전용 매체 같은 안전한 위치로 옮기고, 실행 파일도 읽기 전용 매체나 변조할 수 없는 곳에 두라고 권한다. 운영 적용으로는 기준선을 검사 대상 서버 밖(별도 저장소, 버전 관리된 백업)에 두고, 패키지 업데이트나 설정 배포처럼 정상 변경이 끝난 직후에 다시 만든다. 그렇지 않으면 정상 변경과 침해가 같은 FAILED 목록에 섞인다.

### 수정 시각은 단서일 뿐 증거가 아니다

`find -mtime n`은 파일 데이터가 마지막으로 바뀐 뒤 n*24시간보다 짧은지, 긴지, 같은지로 고르며 소수 부분은 버린다. 따라서 `find / -mtime -1`은 최근 24시간 안에 내용이 바뀐 파일을 찾는다. 다만 `touch -d`나 `-t`는 수정 시각을 임의 값으로 바꿀 수 있으므로, 시각 검색에 걸리지 않았다고 변경되지 않았다고 결론 내리지 않는다. 시각은 조사 범위를 좁히는 데 쓰고, 변경 여부는 해시 비교로 판정한다.

## 로그인과 명령 기록

| 파일과 명령 | 기록하는 것 | 점검할 조건 |
|---|---|---|
| `/var/run/utmp` (`who`) | 지금 시스템을 쓰는 사용자 | 현재 접속만 보이며 과거 이력은 아니다. 모든 프로그램이 utmp에 기록하지는 않는다 |
| `/var/log/wtmp` (`last`) | 모든 로그인과 로그아웃 | 파일이 있어야 기록된다. 지우면 기록이 꺼진다 |
| 프로세스 accounting 파일 (`lastcomm`) | 이전에 실행된 명령의 이름 | 커널 기능이 있고 accounting을 켠 경우에만, 프로세스가 끝날 때 기록된다 |

utmp(5) 매뉴얼은 wtmp를 기록하는 login, init과 일부 getty가 이 파일을 새로 만들지 않으므로, wtmp를 지우면 기록이 꺼진다고 적는다. 반대로 utmp는 Linux에서 항상 있어야 하며 파일을 지워 끄는 방식이 아니다. 다만 systemd의 tmpfiles 설정(`var.conf`)은 utmp를 켠 빌드에서 `/var/log/wtmp`를 만들도록 되어 있어, 이런 시스템에서는 지운 wtmp가 다음 부팅 때 다시 생길 수 있다. wtmp 기록이 비어 있는 것은 접속이 없었다는 뜻일 수도, 파일이 지워지거나 비워졌다는 뜻일 수도 있다. 파일 존재와 크기 변화도 점검 대상에 넣고, 원격 로그 수집으로 서버 밖에 사본을 남긴다([[Audit-Log|감사 로그]]).

이 표는 utmp와 wtmp를 계속 쓰는 배포판에 맞는다. Debian 13 릴리스 노트는 util-linux 패키지가 더 이상 `last`와 `lastb`를, login 패키지가 `lastlog`를 제공하지 않고 이 파일들이 2038년 이후 쓸 수 없게 된다고 적는다. 대체로는 `last`에 wtmpdb, `lastlog`에 lastlog2, `lastb`에 비슷한 정보를 주는 `lslogins --failed`를 안내하며, 새 패키지는 업그레이드 뒤 직접 설치해야 한다. 이런 배포판에서는 어떤 로그인 기록을 남기도록 설치했는지부터 확인한다. 아래 출처의 man7 last(1)은 acct 패키지판이며 배포판이 제공하는 `last` 구현과 다를 수 있다.

명령 기록은 커널이 `CONFIG_BSD_PROCESS_ACCT`로 빌드되어 있고 `acct(2)`로 accounting을 시작한 뒤에만 남는다. 기록은 프로세스가 종료될 때 쓰이므로 아직 실행 중인 프로세스는 `lastcomm`에 나오지 않는다. 남는 것은 마지막으로 실행한 명령의 이름(basename)이며 인자와 전체 경로는 남지 않는다. 기본으로 켜져 있다고 가정하지 말고, 사고 조사에 쓸 계획이면 미리 켰는지 확인한다.

로그인 실패가 몰린 뒤 성공했다는 순서만으로 계정 탈취를 확정하지 않는 조사 원칙은 [[Security-Incident-Response|보안 사고 대응]]을 따른다.

## 관리자 권한은 이름이 아니라 식별자로 정해진다

passwd(5)는 권한 있는 root 계정(superuser)의 사용자 ID가 0이라고 적는다. capabilities(7)는 전통적인 UNIX 구현에서 effective user ID가 0인 프로세스를 privileged process로 부르며 커널 권한 검사를 모두 건너뛴다고 설명한다. 권한은 계정 이름이 아니라 UID로 결정되므로, `root`가 아닌 이름의 계정에 UID 0을 주면 그 계정도 관리자다. 점검은 이름이 아니라 UID로 한다.

같은 매뉴얼은 Linux 2.2부터 superuser 권한을 capability라는 단위로 나눠 따로 켜고 끌 수 있다고 설명한다. UID 0이 아닌 프로세스도 capability를 가질 수 있으므로, UID 0 점검은 필요한 확인이지만 관리자 권한 경로 전체를 덮지는 않는다.

```bash
awk -F: '$3 == 0 { print $1 }' /etc/passwd   # root 한 줄만 나와야 한다
```

shadow를 쓰는 시스템에서 암호화된 비밀번호는 superuser만 읽을 수 있는 `/etc/shadow`에 있다. `/etc/passwd`는 계정 목록이지 비밀번호 저장소가 아니지만, UID와 셸을 바꾸면 권한이 바뀌므로 무결성 기준선에서 빼지 않는다.

Windows의 기본 Administrator 계정도 이름이 아니라 식별자로 찾는다. 이 계정의 SID는 `S-1-5-<도메인>-500`으로 RID가 500이다. Local Accounts 문서 기준으로 이 계정은 삭제할 수 없지만 이름을 바꾸거나 비활성화할 수 있다(Security identifiers 문서의 SID 표는 비활성화할 수 없다고 적어 서로 다르며, 여기서는 Local Accounts 문서와 Administrator account status 정책 문서를 따른다). 정책 문서 기준 기본값은 클라이언트에서 비활성화, 독립 서버와 멤버 서버에서 활성화다. 이름을 바꾼 것만으로 관리자 계정이 숨겨졌다고 보지 않는다. 다만 RID 500은 기본 계정 하나를 가리킬 뿐이며, 관리자 전체는 Administrators 그룹(`S-1-5-32-544`) 같은 그룹 구성원으로 확인한다.

## umask는 빼기가 아니라 비트를 끈다

umask는 `open(2)`과 `mkdir(2)`에 전달된 mode에서 umask에 켜진 권한 비트를 끈다. 매뉴얼의 예로 0666을 요청한 파일은 umask 022에서 `0666 & ~022 = 0644`(rw-r--r--)가 된다. 0777로 만든 디렉터리라면 같은 계산으로 0755다. 매뉴얼은 프로세스 umask의 흔한 기본값을 022(그룹과 기타의 쓰기 제거)로 적지만, 실제 값은 배포판과 로그인 설정에 따라 다르므로 `umask`로 확인한다.

자릿수 빼기로 계산하면 umask에 요청 모드에 없는 비트가 있을 때 틀린다. umask 033에서 0666 파일은 빼기로는 633이지만 실제로는 `0666 & ~033 = 0644`다. 실행 비트가 원래 없으므로 끌 것도 없기 때문이다.

부모 디렉터리에 default ACL이 있으면 umask는 무시되고 상속한 ACL이 권한을 정한다. 이때도 요청한 mode에 없는 비트는 꺼진다. umask만 보고 새 파일의 권한을 단정하지 않는다.

## 비밀번호 복잡도: pam_pwquality의 음수 credit

pam_pwquality의 `dcredit`, `ucredit`, `lcredit`, `ocredit`는 각각 숫자, 대문자, 소문자, 그 밖의 문자에 대한 설정이다. 값을 음수로 주면 그 종류의 최소 개수가 된다. 예를 들어 `dcredit=-1 ucredit=-1 ocredit=-1`은 숫자, 대문자, 특수문자를 하나 이상 요구한다. 네 옵션의 기본값은 libpwquality 1.3.0부터 0이고 그 전 버전은 1이었으므로, 어느 쪽이든 기본 설정만으로는 종류별 최소 개수가 강제되지 않는다. 설정이 실제로 적용되는지는 일반 사용자로 비밀번호 변경을 시험해 확인한다. `enforce_for_root`가 기본으로 꺼져 있어 root는 검사에 실패해도 메시지만 보고 비밀번호를 바꿀 수 있기 때문이다.

문자 종류 규칙 자체를 둘지는 따로 판단한다. NIST SP 800-63B-4의 3.1.1.2는 이 지침을 따르는 검증자와 CSP가 서로 다른 문자 종류의 혼합 같은 구성 규칙을 강제하지 않도록 정한다(적용 범위는 [[Auth-Method-Selection|인증 방식 선택]] 참고). 적용할 규정이 문자 종류를 요구할 때 위 설정으로 구현한다.

## 점검 체크리스트

- 해시 기준선이 있고, 서버 밖이나 읽기 전용 위치에 보관되며, 정상 변경 뒤에 갱신되는가
- 기준선에 `/etc/passwd`, `/etc/shadow`, 서비스 설정과 직접 설치한 실행 파일이 포함되고, 새로 생긴 파일도 비교하는가
- 배포판이 쓰는 로그인 기록(wtmp 또는 설치한 wtmpdb)이 남고 서버 밖으로도 수집되는가
- 명령 기록이 필요하면 process accounting을 실제로 켰는가
- UID 0 계정이 root 하나뿐이고, capability를 가진 실행 파일과 프로세스도 확인했는가
- 서비스 계정의 umask와 상위 디렉터리의 default ACL을 확인했는가
- 적용할 규정이 문자 종류를 요구한다면 음수 credit으로 설정되어 있는가
- 방화벽 규칙의 추가 위치와 차단 대상은 [[Linux-Netfilter-and-iptables|Netfilter와 iptables]]를 따른다

## 출처

- [man7.org, umask(2)](https://man7.org/linux/man-pages/man2/umask.2.html) — mode에서 권한을 끄는 방식, 022 예시, default ACL 우선
- [man7.org, sha256sum(1)](https://man7.org/linux/man-pages/man1/sha256sum.1.html) — GNU coreutils 9.11, `--check`와 검증 옵션
- [man7.org, find(1)](https://man7.org/linux/man-pages/man1/find.1.html) — `-mtime`의 24시간 단위와 `-print0`
- [man7.org, touch(1)](https://man7.org/linux/man-pages/man1/touch.1.html)
- [man7.org, utmp(5)](https://man7.org/linux/man-pages/man5/utmp.5.html)
- [man7.org, last(1)](https://man7.org/linux/man-pages/man1/last.1.html) — acct 패키지판
- [Release Notes for Debian 13 (trixie), Issues to be aware of — Debian](https://www.debian.org/releases/trixie/release-notes/issues.html) — `last`, `lastb`, `lastlog` 제거와 대체 명령
- [tmpfiles.d/var.conf.in — GitHub, systemd/systemd](https://github.com/systemd/systemd/blob/main/tmpfiles.d/var.conf.in) — utmp 빌드의 `/var/log/wtmp` 생성
- [man7.org, lastcomm(1)](https://man7.org/linux/man-pages/man1/lastcomm.1.html)
- [man7.org, acct(5)](https://man7.org/linux/man-pages/man5/acct.5.html)
- [man7.org, passwd(5)](https://man7.org/linux/man-pages/man5/passwd.5.html)
- [man7.org, capabilities(7)](https://man7.org/linux/man-pages/man7/capabilities.7.html)
- [libpwquality, pam_pwquality(8)](https://github.com/libpwquality/libpwquality/blob/master/doc/man/pam_pwquality.8.pod) — 음수 credit의 의미, 기본값 0, `enforce_for_root`
- [linux.die.net, pam_pwquality(8)](https://linux.die.net/man/8/pam_pwquality) — 구판 사본, credit 기본값 1
- [libpwquality, pwquality.conf(5)](https://github.com/libpwquality/libpwquality/blob/master/doc/man/pwquality.conf.5.pod) — credit 기본값 0
- [libpwquality NEWS — GitHub, libpwquality/libpwquality](https://github.com/libpwquality/libpwquality/blob/master/NEWS) — 1.3.0의 기본값 변경
- [NIST, SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html) — 3.1.1.2 구성 규칙 금지
- [AIDE — aide.github.io](https://aide.github.io/) — 2026-11-16 최신 릴리스 0.19.5 확인
- [AIDE, Manual Version 0.16.2](https://aide.github.io/doc/) — `--init`, `--check`와 읽기 전용 보관 권고
- [Microsoft Learn, Security identifiers](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-identifiers) — Administrator RID 500, Administrators 그룹 SID
- [Microsoft Learn, Local Accounts](https://learn.microsoft.com/en-us/windows/security/identity-protection/access-control/local-accounts) — 기본 Administrator의 삭제 불가, 개명과 비활성화
- [Microsoft Learn, Accounts: Administrator account status](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/accounts-administrator-account-status) — 클라이언트와 서버별 기본값

## 관련 문서

- [[CIA-Triad|CIA Triad (기밀성, 무결성, 가용성)]]
- [[Security-Incident-Response|보안 사고 대응]]
- [[Audit-Log|감사 로그]]
- [[Linux-Netfilter-and-iptables|Netfilter와 iptables]]
- [[Linux-File-System|Linux 파일 시스템]]
- [[SSH-Authentication|SSH 인증]]
- [[Auth-Method-Selection|인증 방식 선택]]
