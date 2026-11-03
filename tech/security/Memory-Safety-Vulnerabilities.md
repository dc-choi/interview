---
tags: [security, memory-safety, vulnerability, cwe, openssl, php]
status: done
verified_at: 2026-11-03
category: "보안(Security)"
aliases: ["Memory Safety Vulnerabilities", "메모리 안전성 취약점", "Out-of-bounds Read", "범위 밖 읽기", "Use After Free", "해제 후 사용", "Heartbleed", "PHP2Shell"]
---

# 메모리 안전성 취약점: 범위 밖 읽기와 해제 후 사용

메모리 안전성 결함은 프로그램이 할당받은 범위 밖의 메모리나 수명이 끝난 메모리에 접근하는 결함이며, 이 문서는 그중 범위 밖 읽기와 해제 후 사용을 다룬다. 주로 언어가 경계와 수명을 검사하지 않는 C와 C++ 코드에서 생긴다. TLS 라이브러리나 언어 런타임처럼 애플리케이션 아래 계층에 있으면 영향 버전을 쓰는 서비스가 애플리케이션 코드와 관계없이 영향 범위에 들어간다. 어떤 결과로 이어지는지는 유형마다 다르다. CWE 기준으로 범위 밖 읽기는 메모리 노출, 보호 장치 우회와 서비스 거부를 결과로 들고 코드 실행 항목은 없으며, 해제 후 사용은 여기에 메모리 변조와 코드 실행이 더해진다.

## 두 유형의 결과는 다르다

| 구분 | 범위 밖 읽기 (CWE-125) | 해제 후 사용 (CWE-416) |
|---|---|---|
| 정의 | 의도한 버퍼의 끝 뒤나 시작 앞을 읽는다 | 해제한 메모리를 다시 쓰거나 참조한다 |
| CWE가 드는 결과 | 메모리 읽기와 보호 장치 우회(기밀성), 서비스 거부, 그 밖에 맥락에 따라 다른 결과. 코드 실행 항목은 없다 | 메모리 변조, 서비스 거부, 메모리 읽기, 권한 없는 코드나 명령 실행 |
| 대표 사례 | Heartbleed (CVE-2014-0160) | PHP2Shell의 CVE-2026-109619 |

Heartbleed처럼 읽은 바이트를 응답에 담기만 하는 범위 밖 읽기는 노출에서 그치지만, 새어 나간 메모리 주소는 다른 공격이 완화 기법을 우회하는 데 쓰일 수 있다(CISA의 Heartbleed 경보). CWE 결과 표에도 맥락에 따라 다른 결과 항목이 있으므로 읽은 값을 포인터나 길이로 다시 쓰는 결함은 따로 따진다(이 문서의 해석). 해제 후 사용도 충돌 대신 민감 정보를 흘릴 수 있다(CWE-416). 그래서 Heartbleed는 유출, PHP2Shell은 코드 실행이라고 사례로 나누기보다 두 CWE가 허용하는 결과의 범위로 구분한다.

## Heartbleed: 요청이 적은 길이를 그대로 믿었다

TLS heartbeat 확장(RFC 6520)에서 요청은 payload와 그 길이 `payload_length`(16비트)를 담고, 응답은 요청 payload의 정확한 사본을 돌려준다. RFC는 받은 메시지의 `payload_length`가 너무 크면 그 메시지를 조용히 버려야 한다(MUST)고 정한다.

OpenSSL 1.0.1부터 1.0.1f까지와 1.0.2-beta1은 이 길이를 실제로 받은 레코드의 길이와 대조하지 않았다. 짧은 payload에 큰 길이를 적은 요청을 받으면 실제 payload 뒤의 메모리까지 응답에 담았다. OpenSSL 권고는 연결된 클라이언트나 서버에 최대 64k의 메모리가 드러날 수 있다고 적었다. 이 결함을 독립적으로 발견한 Codenomicon은 이 한도가 heartbeat 한 번에만 적용되고 공격 전체의 총량 제한은 없다고 설명했다. CWE는 Heartbleed를 일관되지 않은 길이 값(CWE-130)이 범위 밖 읽기로 이어진 연쇄 사례로 든다.

수정 커밋은 `1 + 2 + payload + 16`이 수신 레코드 길이를 넘으면 RFC 6520대로 메시지를 버리는 검사를 넣었다. 2014-04-07 권고는 1.0.1g로 올리라고 안내했고, 즉시 올릴 수 없으면 `-DOPENSSL_NO_HEARTBEATS`로 다시 컴파일하는 대안을 제시했다.

- **영향:** CISA는 원격 공격자가 애플리케이션의 메모리를 64k씩 가져가 비밀키, 서비스의 사용자 이름과 비밀번호, 완화 기법 우회에 쓸 메모리 주소를 얻을 수 있다고 경고했다. NVD의 CVSS v3.1 점수는 7.5이며 기밀성 영향만 높음이고 무결성과 가용성 영향은 없다.
- **패치 뒤에 남는 일:** CISA는 취약 버전으로 만든 키를 유출된 것으로 보고 패치 뒤 다시 만들어 배포하라고 권했다. Codenomicon은 악용이 로그에 이상 흔적을 남기지 않는다고 설명했다. 노출 여부를 로그로 증명할 수 없으므로 키와 인증서 교체를 패치와 별도 작업으로 계획한다([[Certificate-Lifecycle-Management|인증서 수명주기 관리]]).

## PHP2Shell: 요청 사이의 분리는 엔진의 정리 절차에 달려 있다

PHP-FPM과 Apache mod_php에서는 한 워커 프로세스가 여러 요청을 차례로 처리한다. PHP-FPM의 `pm.max_requests`는 자식 프로세스가 다시 생성되기 전에 처리할 요청 수이고, 기본값 0은 무제한이다. 같은 워커가 이어 받는 요청 사이를 나누는 것은 운영체제의 프로세스 경계가 아니라 엔진이 요청 메모리를 해제하기 전에 전역 상태를 초기화하는 절차다. 2026-10-21 공개된 두 취약점은 메모리 부족이나 다른 치명적 오류에서 이 정리가 어긋나는 경로다. CVE-2026-109619는 초기화가 빠진 전역 상태가 같은 워커의 다음 요청으로 넘어가는 경로이고, CVE-2026-109618은 같은 요청의 종료 절차가 무효 상태를 읽는 경로다. 두 CVE를 함께 다룬 php.net 공지는 애플리케이션 코드가 실행되기 전에 인증 없는 요청으로 공격할 수 있는 mod_php의 위험을 가장 높게 봤다. 수정 버전, 영향 범위와 탐지 신호 같은 운영 대응은 [[Dependency-Vulnerability-Scanning#언어 런타임은 버전 관리와 호스팅 책임으로 대응한다|의존성 취약점 스캔의 언어 런타임 절]]에 있다.

| 취약점 | 무엇이 남고 누가 읽는가 | 확인된 영향 |
|---|---|---|
| CVE-2026-109618 | 메모리 부족 오류에서 `longjmp()`로 요청 처리를 중단하면서 요청 메모리를 무효 상태로 남기고, 같은 요청의 종료 절차가 그 상태를 읽거나 그 값으로 분기할 수 있다 | 웹 워커 계정 권한의 인증 없는 원격 코드 실행 |
| CVE-2026-109619 | 워커가 유지하는 오류, 세션, 객체와 확장의 전역 상태가 기록된 뒤 치명적 오류로 초기화가 빠지고, 같은 워커에 도착한 다음 요청이 초기화 전에 그 상태로 해제된 메모리를 쓴다 | 웹 워커 권한의 인증 없는 heap 해제 후 사용, 메모리 노출과 원격 코드 실행 |

- **CVE-2026-109619의 같은 워커 조건:** 상태를 남기는 요청과 그 상태를 쓰는 요청이 같은 워커에 도착해야 한다. Calif가 설명한 mod_php 경로에서는 정상 모듈 활성화 전에 치명적 오류가 나 요청 종료가 Session의 RSHUTDOWN 훅을 건너뛰고, 다음 요청을 받는 Apache 자식에는 Session 전역이 남은 채 그것이 가리키던 요청 할당이 해제돼 있다. PHP-FPM은 요청 시작이 실패하면 워커를 끝내 그 상태를 쓸 두 번째 요청이 없다. 그래서 확인된 FPM 경로는 시작이 성공한 뒤 애플리케이션 실행 중에 상태를 남기며, Calif는 시작 뒤의 경로를 mod_php와 PHP-FPM 모두에서 애플리케이션에 의존하는 원격 코드 실행으로 설명한다.
- **CVE-2026-109618의 SAPI별 차이:** Apache mod_php는 요청 시작이 실패해도 종료 절차를 항상 호출하므로 그 절차가 무효 상태에 닿을 수 있고, PHP-FPM은 시작이 실패하면 자식 프로세스를 끝내 그 상태를 쓰지 않는다. 완전한 원격 코드 실행은 mod_php에서 검증됐고, FPM은 소스 분석상 영향 대상이지만 완전한 익스플로잇은 시연되지 않았다.
- **코드 실행 없는 노출:** 발견에 참여한 Wiz는 원격 코드 실행 없이도 PHP 프로세스 메모리에서 비밀번호, 토큰과 API 키를 읽을 수 있음을 따로 시연했다. 해제 후 사용도 Heartbleed식 노출을 만들 수 있으므로, 공개 전후에 노출됐던 서버는 패치와 별도로 비밀 교체를 판단한다(운영 제안, [[Secret-Management|시크릿 관리]]).

### 공격 시도, 성공과 권한 상승의 증거를 나눈다

같은 취약점의 관측도 시점과 구성에 따라 달라진다. 공개 PoC가 한 환경에서 실패한 사실과, 별도의 공격자가 다른 환경에서 성공한 사실은 양립할 수 있다. PHP 빌드, SAPI, 메모리 한도와 워커 재사용 조건을 붙여 기록한다.

2026-11-02 대조한 근거의 범위는 다음과 같다.

- AWS의 10-21 MadPot 보고는 10-17 이후 **악용 시도**를 관측했지만 당시 보고는 실제 시스템에서의 성공을 확정하지 않았다. 10-24의 별도 공개 허니팟 보고는 PHP 8.4.26, 단일 워커 Apache mod_php에서 공격 요청, 메모리 노출과 후속 셸 실행을 연결했다. 이 구성의 성공을 다른 배포에서의 신뢰성으로 확대하지 않는다.
- Wiz의 10-27 직접 관측에서는 공개 PoC 계열이 메모리 고갈을 일으켜도 다음 주소 유출 단계에 실패했고 최종 실행 단계에 도달하지 못했다. 같은 보고는 다른 연구자의 허니팟 성공을 인정하며, 범용 공개 공격 도구를 확인하지 못한 상태와 특정 대상용 공격의 존재를 구분했다. 공개 PoC의 실패를 패치 불필요의 근거로 사용하지 않는다.
- CISA의 공식 KEV 저장소는 CVE-2026-109618과 CVE-2026-109619를 10-26 추가한 것으로 기록한다. KEV 등재는 모든 구성에서 같은 공격이 성공한다는 뜻은 아니다.
- Dream의 10-29 갱신 조사에는 특정 PAN-OS 방화벽/관리 서버 25대의 침해 아티팩트와 PHP2Shell 뒤 커널 권한 상승(CVE-2026-46300)을 연결한 분석이 있다. Unit 42도 같은 공격 도구와 결과를 독립 확인했다고 공지했다. 인터넷에 노출된 관리 인터페이스 접근을 제거하고 공급자의 수정본을 적용하라는 권고다. 25대라는 관측을 전체 PHP 배포의 성공률로 일반화하지 않는다.
- **조사 시작일(2026-11-03 대조):** 같은 10-21 AWS 보고는 보안 책임자에게 조사를 공개일이 아니라 가장 이른 알려진 악용부터 시작하라며, PHP2Shell은 적어도 10-17부터 보라고 권했다. 즉시 할 조치로는 웹 서버 로그 검토, form 업로드에 `PHP_SESSION_UPLOAD_PROGRESS` 문자열이 든 POST 요청 찾기, 웹 애플리케이션 서버의 예상 밖 프로세스 실행과 파일 변경 확인을 들었다. 이 문자열 검색은 upload progress 필드 이름을 기본값으로 둔 경우를 전제하므로 이름을 바꾼 사이트는 설정한 이름으로 찾는다(해석). 공개한 IP 지표는 공유 익명화 인프라를 포함하므로 차단 대신 조사 대상으로 쓰라고 적었다. Wiz가 든 탐지 신호와 공개 전후 로그 확인은 [[Dependency-Vulnerability-Scanning#언어 런타임은 버전 관리와 호스팅 책임으로 대응한다|언어 런타임 절]], 공개일 이전으로 조사 범위를 여는 원리는 [[Coordinated-Vulnerability-Disclosure#공개일과 악용 시작일은 다르다|공개일과 악용 시작일]]에 있다.

## 펌웨어에서는 부팅 단계의 도달 가능성도 본다

EDK II의 CVE-2026-97631은 운영체제 안의 PHP와 다른 공격 표면이다. TianoCore의 2026-10-22 GHSA는 IPv4/IPv6 PXE 부팅 중 ICMP 오류 메시지를 전달할 수 있는 비인증 네트워크 공격자가 DXE 단계의 고정 버퍼 밖에 쓸 수 있다고 설명한다. 운영체제 구성요소의 Secure Boot 검증 전에 실행되는 경로이며, 로컬 디스크로만 부팅하는 정상 런타임까지 같은 노출 창으로 보지 않는다.

상류 코드 수정, 안정 릴리스, 하드웨어 공급자의 펌웨어 빌드와 실제 장비 적용은 별도 상태다. 공식 GHSA의 수정 버전 필드와 연결된 코드 패치가 함께 있어도 모든 장비에 업데이트가 배포됐다는 뜻은 아니다. 자산별 PXE 사용 여부, 패킷 도달 경로, 펌웨어 공급자와 적용 버전을 확인한다. 전 세계 서버 대부분이 실제로 악용 가능한 상태라는 규모는 이번에 검증하지 않았다.

## 원격 코드 실행의 권한은 워커 계정에서 시작한다

두 GHSA는 확인된 영향을 웹 워커 계정의 권한으로 적는다. 아래 설정 근거는 PHP-FPM 기준이다. mod_php는 Apache 자식 프로세스 안에서 요청을 처리하므로(Calif) 그 프로세스의 계정을 따로 확인하며, Apache의 사용자 지정 방식은 이 문서에서 대조하지 않았다. PHP-FPM 풀의 `user` 지시어는 FPM 프로세스의 Unix 사용자이며 필수 항목이다. 기본 풀 설정 템플릿은 자식 프로세스의 사용자 지정이 마스터가 root로 실행될 때만 가능하고 자식이 만들어진 뒤 적용된다고 적으며, 풀을 root로 돌리려면 기본으로 꺼진 `--allow-to-run-as-root` 옵션이 필요하다. CISA도 임의 코드를 실행한 공격자는 그 소프트웨어를 실행하는 계정을 장악할 수 있다고 설명한다.

따라서 GHSA가 밝힌 웹 워커 계정 기준과 위 FPM 설정에서는 원격 코드 실행을 곧바로 서버의 root 장악으로 읽지 않는다. 영향 범위는 워커 계정이 읽고 쓸 수 있는 것, 즉 애플리케이션 설정의 DB 접속 정보, 프로세스 환경 변수, 세션 파일과 소스에서 시작한다. 권한 상승 없이도 그 호스트에서 네트워크로 닿는 내부 서비스, 읽은 자격 증명으로 접속할 수 있는 DB와 클라우드 인스턴스의 역할 자격 증명이 범위에 들어간다. 호스트의 다른 계정과 root 권한은 별도의 권한 상승 단계로 본다(이 문서의 영향 산정 제안). 반대로 풀 사용자를 root로 두었거나 워커 계정에 넓은 쓰기 권한을 줬다면 같은 취약점의 피해가 커진다.

## 설정은 노출을 줄일 뿐이고 수정은 업데이트다

- php.net은 업데이트만이 완전한 해결이고 설정 완화는 특정 공격 경로의 노출만 줄일 뿐 설치를 안전하게 만들지 않는다고 적는다. 관리자 수준에서 `memory_limit=-1`을 설정하고 강제하는 것이 CVE-2026-109618의 주된 설정 완화지만, 그 아래의 할당 실패가 여전히 취약 경로에 닿을 수 있어 완전하지 않다.
- CVE-2026-109619 권고는 성능이 중요하지 않으면 PHP-FPM의 `pm.max_requests=1`로 워커가 실행할 요청 수를 제한하는 방안을 고려하라고 권한다. 같은 권고는 여러 워커와 재활용이 요청당 성공률을 낮출 뿐 조건을 없애지 못하며, 완전한 상태 초기화 패치를 담은 릴리스로 올리는 것만이 신뢰할 수 있는 완화라고 적는다. 워커 재생성은 오래 남는 상태를 줄이는 운영 수단이지 정리 절차의 결함을 고친 것이 아니다(이 문서의 해석).
- **앞단 WAF 규칙도 완화다:** Cloudflare는 2026-10-21 03:02 UTC부터 Free와 유료 WAF 고객이 두 CVE에 기본으로 보호됐다고 밝혔다. 요청 쪽 규칙은 Free용 Cloudflare Managed Free Ruleset과 유료용 Cloudflare Managed Ruleset에 각각 7개(규칙 ID는 서로 다름)로 공개됐고, 응답 쪽 Cloudflare Managed Response Firewall Default도 모든 요금제에 자동 배포됐다. 유료 요금제의 기본 보호는 Managed Ruleset을 쓰는 고객 기준이며, Pro, Business, Enterprise 고객에게는 Managed Ruleset이 block으로 배포됐는지 확인하라고 안내했다. 요청 데이터만으로는 공격과 정상 트래픽을 가를 근거가 늘 충분하지 않아, 같은 HTTP 트랜잭션의 요청과 origin 응답 신호를 결합해 일치하는 응답을 요청자에게 닿기 전에 막는 기능(full transaction detection)을 만들었고, 이 보호가 그 기능으로 낸 첫 managed detection이라고 밝힌다. 응답 단계 차단은 origin이 요청을 처리한 뒤에 작동하므로, 요청 단계 규칙이 놓친 공격이 origin에서 일으킨 영향은 되돌리지 않는다(해석). Cloudflare도 결함이 PHP 런타임에 있어 사이트 코드나 플러그인 업데이트만으로는 고쳐지지 않는다며 WAF를 켠 채 PHP를 업데이트하라고 권한다.
- **수정 릴리스로 끝나지 않는 관련 취약점:** 10-23 PHP가 informational advisory로 알린 CVE-2026-115560은 설정과 애플리케이션 코드가 드물게 조합될 때만 생기고 10-21 수정 릴리스(8.5.12 포함)로 고쳐지지 않으며 다음 정기 릴리스에서 고칠 예정이다. PHP는 그때까지 `session.upload_progress.enabled=0`을 권했다([[Dependency-Vulnerability-Scanning#언어 런타임은 버전 관리와 호스팅 책임으로 대응한다|언어 런타임 절]]). Cloudflare는 기존 #6 규칙이 기본 upload progress 필드 이름을 쓰는 사이트에서 알려진 공격 시도를 막지만, `session.upload_progress.name`을 바꾼 사이트는 이 규칙의 보호를 받지 못한다고 적었다.
- **WAF를 거치지 않는 경로:** 이 규칙은 Cloudflare를 거친 요청에만 적용되므로 origin에 직접 닿는 경로가 남아 있으면 그 경로는 완화 밖에 있다(해석). Cloudflare의 origin 보호 문서는 origin 연결을 잠그는 방법으로 Cloudflare Tunnel, Authenticated Origin Pulls와 Cloudflare IP 허용 목록 등을 든다. IP 허용 목록은 보안 등급이 중간이고 IP spoofing에 취약하다고 적었고, Cloudflare가 주는 기본 Authenticated Origin Pulls 인증서는 요청이 Cloudflare 네트워크에서 왔다는 것만 보장하므로 더 엄격하게 하려면 자체 인증서를 올리라고 권한다.
- **업로드 차단은 영향부터 본다:** AWS는 설정만으로 두 문제를 완전히 해결하는 우회책은 없다고 적으면서, 즉시 패치할 수 없는 배포에서는 PHP의 multipart 파일 업로드 차단을 고려하되 적용 전에 애플리케이션에 주는 영향을 확인하라고 권했다.
- 수정 릴리스(8.5.12, 8.4.27, 8.3.36, 8.2.35)부터 `memory_limit`은 한도를 넘는 할당도 대개 완료한 뒤 치명적 오류를 내는 soft limit이다. 업그레이드 뒤에는 메모리 경보와 한도 설정을 이 동작에 맞춰 다시 확인한다(운영 제안).
- 개발 단계에서는 AddressSanitizer가 범위 밖 접근과 해제 후 사용을 잡는다([[C-Pointers-and-Dynamic-Memory#메모리 오류와 도구|C 메모리 오류와 도구]]). 결함 유형 자체를 줄이는 언어 선택은 [[Programming-Language-Landscape#메모리 안전성 권고|메모리 안전성 권고]]를 따른다.

## 다른 런타임에 적용할 질문

Node.js는 적은 수의 스레드가 많은 클라이언트를 처리하고, 모든 요청과 응답이 Event Loop를 지난다(공식 문서). 모듈 top level 변수는 한 thread 안의 모든 request가 공유하므로 request별 state는 인자나 AsyncLocalStorage로 전달한다([[Closure#캡슐화와 한계|모듈 top level 변수의 공유]]). 재사용되는 thread에 request context를 두는 Java에서도 `remove()`를 빠뜨리면 이전 사용자 context가 다음 요청에 노출될 수 있으므로, 정리는 정상과 예외 경로 모두에서 실행되는 `finally`나 framework lifecycle에 둔다([[Java-ThreadLocal-and-Request-Context#lifecycle이 핵심이다|ThreadLocal의 lifecycle]]). 런타임을 비교할 때는 프로세스 모델과 함께 요청 상태를 어디에 두고 정상, 예외와 치명적 오류의 경로에서 누가 지우는지를 확인한다(이 문서의 제안).

## 점검 질문

- 범위 밖 읽기와 해제 후 사용은 각각 기밀성, 무결성, 가용성과 코드 실행 중 어디까지 이어질 수 있는가?
- Heartbleed를 패치한 뒤에도 키와 인증서를 다시 만들어야 했던 이유는 무엇인가?
- 한 워커가 여러 요청을 처리하는 런타임에서 요청 사이를 나누는 장치는 무엇이고, 그 장치가 빠지면 다음 요청에 무엇이 남는가?
- 웹 워커 계정 권한의 원격 코드 실행과 root 장악을 어떻게 구분해 영향 범위를 정하는가?
- `memory_limit`이나 `pm.max_requests` 조정이 수정이 아니라 완화인 이유는 무엇인가?

## 출처

- [Chained PHP2Shell Exploit Roots 25 Servers — Dream Research](https://dreamgroup.com/blog/chained-php2shell-exploit-roots-25-servers) — 2026-10-29 갱신, 2026-11-02 특정 PAN-OS와 커널 권한 상승, 침해 아티팩트의 범위 대조
- [PHP2Shell: Exploitation Attempts and Remediation Trends — Wiz](https://www.wiz.io/blog/php2shell-exploitation-so-far) — 2026-10-27 직접 관측, OOM 성공과 주소 유출 실패, 배포 구성의 차이 대조
- [PHP2Shell exploitation observed: packet-to-process RCE evidence — GitHub, 0x4D31](https://github.com/0x4D31/honeypot-data/blob/main/reports/php2shell/2026-10-24-confirmed-rce.md) — 허니팟의 요청/메모리/프로세스 연결과 단일 워커 구성 한계
- [Threat Brief: Critical Vulnerabilities in PHP — Palo Alto Networks Unit 42](https://unit42.paloaltonetworks.com/cve-2026-109618-cve-2026-109619/) — 10-29 갱신의 공격 도구/결과 확인과 관리 인터페이스 권고
- [CISA, KEV catalog official GitHub data](https://github.com/cisagov/kev-data/blob/develop/known_exploited_vulnerabilities.json) — catalogVersion 2026.10.30의 두 PHP CVE 등재일 대조
- [Amazon Threat Intelligence identifies PHP2Shell exploitation prior to public disclosure in MadPot — AWS Security Blog](https://aws.amazon.com/blogs/security/amazon-threat-intelligence-identifies-php2shell-exploitation-prior-to-public-disclosure-in-madpot/) — 2026-10-21 게시. 초기 보고의 시도와 성공 여부 한계, 2026-11-03 조사 시작일, 로그 점검 항목, IP 지표의 사용법과 업로드 차단 권고 대조
- [Cloudflare deploys protections against php2shell vulnerability — Cloudflare Blog](https://blog.cloudflare.com/php-vulnerabilities-waf-protection/) — 2026-10-21 게시, 10-23 갱신. 2026-11-03 기본 적용 시각과 요금제, 유료 요금제의 확인 사항, full transaction detection, 패치 권고와 CVE-2026-115560의 미보호 조건 대조
- [Cloudflare, Protect your origin server](https://developers.cloudflare.com/fundamentals/security/protect-your-origin-server/) — 2026-11-03 origin 연결을 잠그는 방법과 각 방법의 한계 대조
- [Informational advisory: Session upload progress — PHP](https://www.php.net/archive/2026.php) — 2026-10-23 항목. 2026-11-03 CVE-2026-115560의 발생 조건과 임시 설정 대조
- [Pre-boot RCE in EDK II PXE driver — TianoCore](https://github.com/tianocore/edk2/security/advisories/GHSA-99cj-7hg9-mp4m) — 2026-11-02 부팅 단계와 네트워크 도달 조건 대조
- [Red Hat, CVE-2026-97631](https://access.redhat.com/security/cve/cve-2026-97631) — 로컬 저장소 부팅과 정상 post-boot 런타임의 노출 제외 설명
- GeekNews, 2026-10-29 09:33/10:10과 10-30 10:40 사용자 제공 발췌 — PHP2Shell 후속 공격과 EDK II 보안 공지의 계기 자료

- [IETF, RFC 6520: Transport Layer Security (TLS) and Datagram Transport Layer Security (DTLS) Heartbeat Extension](https://www.rfc-editor.org/rfc/rfc6520) — 2026-11-02 `payload_length`, 응답 사본과 길이 초과 메시지 폐기 규칙 대조
- [OpenSSL Security Advisory 07 Apr 2014, TLS heartbeat read overrun (CVE-2014-0160) — OpenSSL](https://openssl-library.org/news/secadv/20140407.txt) — 영향 버전, 64k 노출, 1.0.1g와 재컴파일 대안
- [Add heartbeat extension bounds check — GitHub, openssl/openssl](https://github.com/openssl/openssl/commit/96db9023b881d7cd9f379b0c154650d6c108e9a3) — 수정 커밋의 길이 검사
- [NVD, CVE-2014-0160](https://nvd.nist.gov/vuln/detail/CVE-2014-0160) — 2026-11-02 NVD CVE API 기록으로 설명, 버전 범위, CWE-125 매핑과 CVSS v3.1 벡터 대조
- [OpenSSL 'Heartbleed' vulnerability (CVE-2014-0160) — CISA](https://www.cisa.gov/news-events/alerts/2014/04/08/openssl-heartbleed-vulnerability-cve-2014-0160) — 노출 대상과 키 재생성 권고, 2016-10-05 최종 개정판
- [The Heartbleed Bug — heartbleed.com](https://heartbleed.com/) — 독립 발견자 Codenomicon의 안내. 로그 흔적과 heartbeat당 한도 설명
- [MITRE, CWE-125: Out-of-bounds Read](https://cwe.mitre.org/data/definitions/125.html) — CWE 5.0 기준 정의, 결과 표와 Heartbleed 연쇄 사례
- [MITRE, CWE-416: Use After Free](https://cwe.mitre.org/data/definitions/416.html) — CWE 5.0 기준 정의와 결과 표
- [GHSA-w8hw-w9fx-j79w: RCE via OOM corruption (CVE-2026-109618) — GitHub, php/php-src](https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w) — 2026-10-21 공개. 메커니즘, SAPI별 차이, 확인된 영향과 `memory_limit=-1` 완화의 한계
- [GHSA-6wmf-4rv5-p3rp: RCE via stale global state (CVE-2026-109619) — GitHub, php/php-src](https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp) — 2026-10-21 공개. 같은 워커 조건, 확인된 영향과 `pm.max_requests=1` 완화의 한계
- [Security advisory: Critical remote code execution vulnerabilities, update now — PHP](https://www.php.net/archive/2026.php#2026-10-21-5) — 위험 대상 SAPI, mod_php 위험 평가와 설정 완화의 한계
- [PHP2Shell: A tale of two PHP remote vulnerabilities — Calif](https://calif.io/php2shell/) — mod_php와 PHP-FPM의 요청 시작 실패 처리 차이
- [PHP2Shell: AI uncovers critical RCE vulnerabilities affecting 70% of the Internet — Wiz](https://www.wiz.io/blog/php2shell-php-rce) — 2026-10-21 게시. 코드 실행 없는 메모리 노출 시연
- [PHP Manual, FPM Configuration](https://www.php.net/manual/en/install.fpm.configuration.php) — `user`와 `pm.max_requests` 정의
- [sapi/fpm/www.conf.in — GitHub, php/php-src](https://github.com/php/php-src/blob/master/sapi/fpm/www.conf.in) — 2026-11-02 master 기준. 자식 프로세스 사용자 지정 조건과 root 실행 옵션 주석
- [sapi/fpm/php-fpm.8.in — GitHub, php/php-src](https://github.com/php/php-src/blob/master/sapi/fpm/php-fpm.8.in) — 2026-11-02 master 기준. `--allow-to-run-as-root`의 기본 비활성 설명
- [PHP Manual, Description of core php.ini directives](https://www.php.net/manual/en/ini.core.php) — 수정 릴리스 이후 `memory_limit`의 soft limit 동작
- [The Case for Memory Safe Roadmaps — CISA](https://www.cisa.gov/sites/default/files/2023-12/The-Case-for-Memory-Safe-Roadmaps-508c.pdf) — 2023년 12월. 임의 코드 실행과 소프트웨어 실행 계정의 장악
- [Node.js, Don't Block the Event Loop (or the Worker Pool)](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop) — 적은 수의 스레드가 많은 클라이언트를 처리하는 구조
- [PHP보안 세계비상? 놀라지마. 심장출혈 시즌2니까! — YouTube, 널널한 개발자 TV](https://www.youtube.com/watch?v=uZ2G4e81biA) — 2026-10-23 게시. 두 결함의 비교를 다룬 계기 자료이며 제작자는 자료를 AI로 만들었다고 밝혔다. 사실은 위 1차 출처로 대조했고, 웹 서버가 관리자 권한으로 실행됐을 것이라는 추정, 패치 전에는 대책이 없다는 설명과 유출 대 코드 실행의 대비는 1차 출처 기준으로 고쳐 썼다
- [AI에 뚫린 보안, 전세계 69% 웹사이트 해킹 비상, 해킹이 되는 원리와 바이브코딩으로 방어책까지 모두 공개, php2shell — YouTube, 투더제이 TTJ](https://www.youtube.com/watch?v=RnJMBDnAsBM) — 2026-10-24 공개 영상, 앞단 WAF 규칙과 조사 시작일의 계기 자료. 사실은 Cloudflare, AWS와 PHP 원문으로 대조했다. 업로드 폴더의 새 PHP 파일 점검은 AWS의 파일 변경 확인에 포함되는 좁은 예시이고, 낯선 관리자 계정, PHP 비정상 종료와 낯선 외부 접속 점검은 AWS 원문에서 확인하지 못해 옮기지 않았다. 의심 IP를 먼저 차단하라는 제안은 공개 IP 지표를 차단 대신 조사에 쓰라는 AWS 지침에 맞춰 옮기지 않았다

## 관련 문서

- [[C-Pointers-and-Dynamic-Memory#메모리 오류와 도구|C 메모리 오류와 도구]] — 범위 밖 쓰기, 해제 후 사용과 AddressSanitizer
- [[Stack-vs-Heap#스택 오버플로와 버퍼 오버플로|스택과 힙의 버퍼 오버플로]]
- [[Programming-Language-Landscape#메모리 안전성 권고|메모리 안전 언어 권고]]
- [[Dependency-Vulnerability-Scanning#언어 런타임은 버전 관리와 호스팅 책임으로 대응한다|PHP 런타임 패치, 탐지 신호와 외주 운영 점검]]
- [[Coordinated-Vulnerability-Disclosure|조율된 취약점 공개]] — PHP2Shell의 공개 경과
- [[Certificate-Lifecycle-Management|인증서 수명주기 관리]] — 키 유출 뒤 인증서 교체
