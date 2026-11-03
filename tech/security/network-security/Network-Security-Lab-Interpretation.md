---
tags: [security, network-security, wireshark, vulnerability-assessment, wifi]
status: done
verified_at: 2026-11-01
category: "Security - 네트워크 보안"
aliases: ["Network Security Lab Interpretation", "네트워크 보안 시연 해석", "WPA2 PSK 오프라인 추측", "Evil Twin 신뢰 경계"]
---

# 네트워크 보안 시연을 해석하는 기준

보안 시연은 관측한 패킷, 사전 설정, 취약 조건과 획득한 권한을 구분해서 읽는다. 패킷이 보인다는 것, 비밀번호를 추측했다는 것, 셸을 얻었다는 것은 서로 다른 결과다. 허가된 대상과 격리된 실습망에서 확인한 결과를 다른 네트워크의 위험으로 그대로 확대하지 않는다.

## 패킷 관찰과 평문 노출을 구분한다

HTTP Basic 인증은 사용자 ID와 비밀번호를 `사용자:비밀번호` 형태로 결합하고 Base64로 인코딩해 전달한다. Base64에는 복호화 비밀키가 없으므로 표현을 되돌리는 데 키가 필요하지 않다. RFC 7617은 TLS 같은 외부 보호 없이 Basic 인증을 민감한 정보 보호에 사용하지 않도록 한다.

Wireshark에서 자격증명이 보이는 HTTP 시연은 TLS 암호가 풀렸다는 증거가 아니다. 비밀번호를 POST 본문이나 JSON으로 옮겨도 그 자체로 기밀성이 생기지 않는다. 전송 경로의 암호화와 자격증명이 들어 있는 위치를 별개로 확인한다([[Auth-Method-Selection|인증 방식 선택]]).

| 관측 조건 | 해석할 수 있는 범위 |
| --- | --- |
| 캡처 위치에서 평문 HTTP를 볼 수 있음 | 요청 헤더와 본문, 그 안의 자격증명이나 세션 값이 노출될 수 있음 |
| 인증서를 검증하는 HTTPS | 연결 정보와 암호화된 레코드는 보일 수 있지만 캡처만으로 본문을 읽었다고 볼 수 없음 |
| Wireshark에 적절한 세션 비밀이 제공됨 | 해당 연결을 복호화할 수 있는 별도 조건이 추가됨 |
| 기기가 신뢰하는 인증서로 동작하는 TLS 검사 프록시 | 기기와 프록시, 프록시와 서버 사이에서 TLS가 각각 종료됨 |

VPN은 터널에 포함된 트래픽을 기기와 VPN 종단 사이에서 보호한다. VPN을 통해 보낸 HTTP는 VPN 서버에서 터널을 벗어난 뒤에도 웹사이트까지 자동으로 암호화되는 것이 아니다. 실제 라우팅과 터널 범위도 확인하며, VPN 사용을 HTTPS의 대체로 보지 않는다([[Proxy-Trust-and-Anonymity|중계 경로의 신뢰 모델]]).

TLS 검사 여부는 기기의 신뢰 저장소, 프록시 설정과 인증서 검증을 함께 본다. 회사 소유 기기에서만 가능하다거나 잠금 아이콘만 있으면 검사 여부와 안전성을 알 수 있다고 가정하지 않는다. TLS와 캡처 복호화의 구체적인 조건은 [[HTTPS-TLS|HTTPS와 TLS]], [[Packet-Capture-and-Wireshark|패킷 캡처와 Wireshark]]에 있다.

## 탐색 결과는 취약점의 단서다

Kioptrix Level 1은 취약점 평가와 악용 기법을 학습하도록 만든 VM 과제다. 이를 이용한 시연은 소유하거나 명시적으로 허가받은 VM을 외부 대상과 분리한 망에 두었다는 전제로 읽는다. 이미 취약하도록 만든 이미지에서 성공한 공격을 현대 시스템의 일반적인 난이도로 해석하지 않는다.

| 단계 | 확인하는 것 | 아직 확정하지 못한 것 |
| --- | --- | --- |
| 주소, 경로와 범위 확인 | 자신의 인터페이스, 대상까지의 경로와 허가된 범위 | 범위 안의 모든 주소에 실제 장비가 있거나 접근된다는 사실 |
| 호스트 발견(host discovery) | 탐색 요청에 응답하는 호스트의 단서 | 응답이 없으면 장비가 없다는 결론 |
| 포트 탐색 | 해당 위치와 탐색 방식에서 관측한 포트 상태 | 열린 포트가 곧 취약하거나, 필터된 포트에 서비스가 없다는 결론 |
| 서비스와 버전 탐지 | 응답으로 추정한 프로토콜, 프로그램과 버전 | 포트 번호만으로 서비스 확정, 패치 적용 상태와 취약점 악용 가능성 |
| 취약 조건 대조 | 보안 권고의 영향 버전, 설정, 인증과 접근 조건 | 버전 문자열만으로 실제 침해 가능성 확정 |

Nmap의 호스트 발견은 ICMP ping에만 한정되지 않으며 로컬 Ethernet에서는 ARP를 사용할 수 있다. 포트 상태도 관측 위치와 필터링에 따라 달라진다. 서비스 탐지는 응답과 탐지 데이터베이스를 대조하는 과정이라 모든 서비스의 정확한 버전을 알아낸다고 보장하지 않는다.

배포판은 기존 버전에 보안 수정만 백포트할 수 있다. Debian Security FAQ는 상류 버전 번호만 보지 말고 정확한 패키지 버전과 보안 권고, 변경 이력을 대조하도록 설명한다. 탐색 결과를 실제 패키지 정보, 설정과 노출 경로로 보완하는 절차는 [[Dependency-Vulnerability-Scanning|의존성 취약점 스캐닝]]과 연결한다.

## 셸 획득과 관리자 권한은 별도 결과다

원격 셸은 네트워크를 통해 명령과 출력을 주고받을 수 있는 상태이며 곧바로 root 권한을 뜻하지 않는다. 침해된 프로세스의 사용자, 부여된 권한과 격리 범위를 따로 확인한다. 낮은 권한의 셸도 접근 가능한 파일과 서비스에 피해를 줄 수 있다.

첫 코드 실행과 이후 로컬 권한 상승은 서로 다른 취약 조건을 필요로 할 수 있다. 방어에서도 서비스 수정과 커널 수정, 불필요한 노출 제거, 접근 범위 제한과 최소 권한을 나눠 본다. 최신 패치 하나로 모든 침해가 불가능해진다는 결론으로 바꾸지 않는다.

반환 연결을 새로 만드는 reverse shell과 이미 연결된 소켓을 사용하는 셸도 구분해야 한다. 시연의 명칭만으로 연결 방향을 확정하지 않고 패킷이나 코드를 확인한다. 특정 익스플로잇의 메모리 조작 방식과 커널 권한 상승 원인은 아래의 확인 후보로 남긴다.

## WPA2-Personal 시연은 후보 검색의 조건을 본다

WPA2-Personal의 PSK 방식에서는 무선 비밀번호 자체를 핸드셰이크에 그대로 보내지 않는다. 관찰자는 필요한 핸드셰이크 자료를 확보하면 후보 비밀번호로 키와 무결성 검증 값을 계산해 오프라인으로 대조할 수 있다. 이는 캡처가 곧 비밀번호라는 뜻이나 AES 암호를 직접 풀었다는 뜻이 아니다.

- **사전 공격**: 사용한 후보 목록에 올바른 비밀번호가 있어야 찾을 수 있다. 찾지 못한 결과만으로 비밀번호의 강도를 증명하지도 못한다.
- **부분 정보**: 14글자 중 10글자를 미리 알고 나머지를 찾는 시연은 전체 14글자를 모르는 조건과 다르다. 글자 종류, 후보 생성 방식과 사전 정보가 탐색 공간을 바꾼다.
- **캡처와 주입**: 자연스럽게 발생하는 연결의 핸드셰이크를 기다리는 수동 캡처에는 패킷 주입(injection)이 필수는 아니다. 필요한 채널에서 프레임을 관측할 어댑터와 드라이버 지원은 확인한다.
- **연결 방해와 재접속**: 강제로 연결을 끊는 프레임 전송은 수동 캡처와 다른 능동 동작이다. 재접속이나 캡처 성공을 보장하지 않는다.

비밀번호 방어는 길이 하나로 판정하지 않는다. 충분히 길고 예측하기 어려운 비밀번호와 실제 보안 모드, 기기 지원과 업데이트를 함께 본다. 예전 도구 문서의 초당 추측 속도나 절대로 깨지지 않는다는 표현은 현재 성능의 기준으로 사용하지 않는다.

## WPA3-Personal은 캡처 금지가 아니라 인증 방식의 변화다

WPA3-Personal의 SAE(Simultaneous Authentication of Equals)는 WPA2-Personal의 PSK 인증과 다른 암호학적 교환을 사용해 수동 캡처를 이용한 오프라인 사전 공격에 저항하도록 설계됐다. SAE 뒤에도 4-way handshake로 키를 설치하므로 핸드셰이크 자체가 사라지거나 캡처를 막는다는 뜻은 아니다.

WPA3-Personal only 모드와 WPA2/WPA3 transition 모드도 구분한다. HPE Aruba 문서는 전자를 PMF 필수, 후자를 WPA2-PSK 클라이언트를 함께 허용하는 모드로 설명한다. 혼합 모드에서는 WPA2 경로의 위험과 실제 협상된 모드를 따로 확인한다.

PMF(Protected Management Frames)는 연결 후 위조된 연결 해제와 인증 해제 같은 관리 프레임으로부터 보호하는 기능이다. 모든 무선 공격이나 전파 방해를 차단하는 기능은 아니다. 지원, 협상 상태와 구현 업데이트가 별도 점검 대상이다.

## ARP MITM과 Evil Twin은 다른 경계를 건드린다

[[ARP-Spoofing|ARP 스푸핑]]은 로컬망의 IP와 MAC 대응을 속여 트래픽의 다음 홉을 바꾸는 공격이다. 중계 경로를 얻는 것과 TLS를 복호화하는 것은 별개다. 평문 HTTP를 읽은 시연을 HTTPS 본문 노출로 확대하지 않는다. 원리, DAI와 DHCP snooping의 방어 조건은 기존 문서를 따른다.

Evil Twin은 정상망처럼 보이는 무선 AP로 접속을 유도하는 방식이다. SSID가 같거나 화면에 하나의 네트워크처럼 보인다는 사실만으로 WPA2/WPA3의 인증이 우회되지는 않는다. 저장된 보안 프로필, 키나 인증서 검증, 실제 연결 조건을 확인한다.

가짜 AP에 연결된 뒤에도 유효한 HTTPS 본문을 읽으려면 별도의 복호화나 신뢰 훼손 조건이 필요하다. 가짜 captive portal에 사용자가 직접 비밀번호를 입력하는 피싱과 암호화된 웹 세션을 해독하는 공격을 구분한다. 접속 직후 열린 페이지의 주소와 인증서, 요구하는 정보의 목적을 확인한다([[Public-WiFi-Trust-Boundaries|공공 Wi-Fi의 신뢰 경계]]).

## 시연에서 추가 확인할 것

- 허가된 대상, 격리 구조, 사전 인증, 사전 지식과 공격 전후 권한을 기록한다.
- 결과를 패킷, 서버 설정과 실제 실행 상태로 대조한다. 영상의 성공 장면만으로 재현 완료를 보고하지 않는다.
- Kioptrix 시연의 익스플로잇 식별자, 대상 패키지와 설정, 셸의 연결 방향, 메모리 손상과 커널 권한 상승의 세부 원인은 코드와 화면을 추가 대조할 확인 후보다. 음성 전사만으로 확정하지 않았다.

## 출처

- [POV: You Learn Networking For Fun — dzuma](https://www.youtube.com/watch?v=sFck88rcl4s&t=1981s) — 33:01~1:01:28과 설명란. 음성 전사 기반이며 공격을 실행하거나 시연을 재현하지 않았다. Wi-Fi 비밀번호의 10글자를 미리 제공했다는 설명은 시연 조건으로 기록했다.
- [RFC Editor, RFC 7617: The 'Basic' HTTP Authentication Scheme](https://www.rfc-editor.org/rfc/rfc7617)
- [Wireshark, Wiki: TLS](https://wiki.wireshark.org/TLS)
- [RFC Editor, RFC 4301: Security Architecture for the Internet Protocol](https://www.rfc-editor.org/rfc/rfc4301) — 터널과 보안 게이트웨이 종단의 보호 범위.
- [Cloudflare, Use TLS inspection](https://developers.cloudflare.com/learning-paths/secure-internet-traffic/build-http-policies/tls-inspection/) — 검사 프록시와 기기가 신뢰하는 루트 인증서의 조건.
- [Nmap, Host Discovery](https://nmap.org/book/man-host-discovery.html)
- [Nmap, Port Scanning Basics](https://nmap.org/book/man-port-scanning-basics.html)
- [Nmap, Service and Version Detection](https://nmap.org/book/man-version-detection.html)
- [Debian, Debian security FAQ](https://www.debian.org/security/faq#version)
- [Kioptrix: Level 1 (#1) — VulnHub](https://www.vulnhub.com/entry/kioptrix-level-1-1,22/)
- [Aircrack-ng, Tutorial: How to Crack WPA/WPA2](https://www.aircrack-ng.org/doku.php?id=cracking_wpa) — PSK 대상, 후보 목록과 수동 캡처의 조건을 확인했다. 2010년 문서의 성능 수치와 절대적 안전 표현은 채택하지 않았다.
- [HPE Aruba Networking, WPA3-Personal](https://arubanetworking.hpe.com/techdocs/aos/wifi-design-deploy/security/modes/wpa3-personal/)
- [HPE Aruba Networking, Protected management frames](https://arubanetworking.hpe.com/techdocs/aos/wifi-design-deploy/security/features/pmf/)
- [MITRE ATT&CK, Adversary-in-the-Middle: Evil Twin](https://attack.mitre.org/techniques/T1557/004/)

## 관련 문서

- [[Packet-Capture-and-Wireshark|패킷 캡처와 Wireshark]] — 캡처 위치와 TLS 복호화 조건
- [[ARP-Spoofing|ARP 스푸핑]] — L2 경로 탈취와 방어
- [[Public-WiFi-Trust-Boundaries|공공 Wi-Fi의 신뢰 경계]] — 통신, 서비스와 기기 권한 구분
- [[Dependency-Vulnerability-Scanning|의존성 취약점 스캐닝]] — 백포트와 영향 조건 판정
- [[네트워크보안(NetworkSecurity)|네트워크 보안 인덱스]]
