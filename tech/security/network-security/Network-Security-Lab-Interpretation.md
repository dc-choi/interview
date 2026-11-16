---
tags: [security, network-security, wireshark, vulnerability-assessment, wifi]
status: done
verified_at: 2026-11-16
category: "Security - 네트워크 보안"
aliases: ["Network Security Lab Interpretation", "네트워크 보안 시연 해석", "WPA2 PSK 오프라인 추측", "Evil Twin 신뢰 경계", "Wi-Fi Enhanced Open", "OWE"]
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

## IEEE 802.11i, WPA와 WPA2는 만든 주체가 다르다

무선 시연 결과를 읽기 전에 보안 모드의 이름이 무엇을 가리키는지 정리한다. IEEE 802.11i는 IEEE가 2004년 6월 승인한 802.11의 여섯 번째 개정(Amendment 6: MAC Security Enhancements)이고, WPA와 WPA2는 Wi-Fi Alliance의 상호운용성 인증 프로그램이다. 802.11i는 현재 Superseded 상태라 802.11 본 규격에서 확인한다.

**WEP의 문제는 키 길이가 아니라 구조였다.** WEP는 RC4 스트림 암호에 24비트 IV를 붙여 키 스트림을 만들고 IV를 평문으로 보낸다. IV 공간이 1,700만 개 미만이라 바쁜 망에서는 몇 시간 안에 소진되고, 같은 IV를 쓴 두 메시지 중 하나의 평문을 알면 다른 메시지도 쉽게 알아낼 수 있다. 무결성 값은 암호화한 CRC-32라 비트 반전 공격을 막지 못하고, 재전송 방지 장치가 없으며, 모든 단말이 같은 키를 공유하는데 키 관리 표준도 없었다. 키를 길게 늘려도 이 결함은 남는다.

**사례: WEP 매장망이 결제 시스템 침입의 진입 경로로 지목됐다.** 캐나다 연방 개인정보보호위원회(OPC)와 앨버타 주 정보개인정보보호위원회의 2007년 9월 25일 공동 조사 보고서에서 TJX는 침입자가 미국 매장 두 곳의 무선 LAN으로 처음 들어온 것으로 보았다. 북미 매장은 WEP를 쓰고 있었고, 첫 침입(2005년 7월) 뒤인 2005년 10월 WPA 전환을 시작해 2007년 1월 중순에 마쳤다. 접근은 2005년 7월부터 2007년 1월 중순까지 간헐적으로 이어졌고, 2006년 12월 18일 의심 소프트웨어가 발견되면서 드러났다. 영향은 여러 나라의 결제 카드 약 4,500만 장으로 추정됐다. 보고서는 WEP가 비교적 쉽게 무력화된다고 보고, 약한 암호 때문에 침입자가 결제 처리 서버에 접근했을 수 있다고 판단했다. 그리고 약한 암호를 합리적 기간 안에 전환하지 못한 점과 전환 중 카드 데이터를 별도 서버로 분리한 정황이 없다는 점을 보호조치 위반의 근거로 들었다. 2008년 미국 FTC는 complaint에서 무선 접근 제한 미흡, 개인정보의 평문 저장과 전송, 강한 비밀번호를 요구하지 않은 점, 카드 승인 컴퓨터를 방화벽 등으로 격리해 컴퓨터와 인터넷 사이의 접근을 제한하지 않은 점을 문제로 제기했고 TJX는 동의 명령으로 합의했다. 무선 구간이 뚫리더라도 그것은 시작일 뿐이며, 망 분리와 저장 데이터 보호가 없으면 피해가 결제 시스템까지 이어질 수 있다. 오래된 암호를 교체하는 동안에는 위험한 구간을 따로 격리하는 보완 통제를 둔다.

**802.11i가 정의한 것** — RSNA(Robust Security Network Association)만 허용하는 RSN, 데이터 보호 프로토콜 TKIP와 CCMP, 인증을 위한 IEEE 802.1X 사용, 키 관리 절차인 4-Way Handshake와 Group Key Handshake다.

- **4-Way Handshake**: 양쪽이 같은 PMK(pairwise master key)를 가졌는지 확인하고, 임시 키의 설치를 동기화하며, 선택한 암호 스위트를 확정한다. PMK는 미리 설정한 PSK이거나 802.1X의 EAP 인증 결과로 분배된 값이다.
- **키 계층**: 단말과 AP 사이 유니캐스트를 보호하는 쌍별 키 계층(PTK)과 멀티캐스트, 브로드캐스트를 보호하는 그룹 키 계층(GTK)을 나눈다.
- **보호 범위**: RSN은 링크 계층 보호다. 단말과 AP 사이의 무선 구간만 지키며 웹 서버까지의 종단 간 보호는 TLS나 IPsec이 맡는다. AP와 인증 서버 사이의 유선 구간 보호도 규격 범위 밖이고, 관리 프레임 보호는 이후 802.11w(PMF)가 더했다.

| 이름 | 성격 | 핵심 |
| --- | --- | --- |
| WPA (2003) | 802.11i 완성 전에 나온 부분집합 인증 | 802.1X/EAP, 4-Way Handshake, TKIP. AES-CCMP는 요구하지 않음 |
| WPA2 (2004년 9월) | 승인된 802.11i 전체에 대한 인증 | AES 기반 CCMP. 2006년 3월부터 Wi-Fi CERTIFIED 제품에 의무 |
| Personal / Enterprise | 두 인증의 등급 | Personal은 PSK, Enterprise는 인증 서버를 둔 EAP 인증 |

WPA를 IEEE 워킹그룹이 만든 표준으로, AES 도입을 WPA의 특징으로 설명하면 틀린다. 현재 Wi-Fi Alliance는 WPA3를 Wi-Fi CERTIFIED 기기의 필수 요건으로 두고 PMF 사용을 요구한다. 위 역사와 구조의 근거인 NIST SP 800-97(2007)은 2025년 12월 31일 기술적으로 오래됐다는 이유로 철회됐으므로 현재 구성 권고로 쓰지 않는다.

**TKIP는 WEP 장비를 살리려는 과도기 설계였다.** TKIP는 WEP만 지원하던 기존 장비를 펌웨어나 드라이버 업그레이드로 전환할 수 있게 설계돼 RC4 스트림 암호와 CRC-32 ICV를 그대로 남겼다. 그 위에 세 장치를 더했다. 세션 키와 IV를 섞어 패킷마다 다른 RC4 키를 만드는 키 혼합 함수, 약한 CRC-32 대신 무결성을 맡는 64비트 MIC인 Michael, 순서가 뒤처진 패킷을 버려 단순 재전송을 막는 시퀀스 카운터(TSC)다. ICV가 맞는데 MIC 검증이 실패하면 공격으로 보고 MIC failure report를 보내며, 60초 안에 실패가 반복되면 통신을 끊고 60초의 대기 뒤 키를 다시 협상한다.

Beck과 Tews의 2008년 11월 논문(ACM WiSec 2009 게재)은 약한 PSK에 대한 사전 공격을 빼면 저자들이 아는 한 WPA에 대한 첫 실용 공격을 보였다. 조건은 TKIP 사용, 공격자가 주소 대부분을 아는 IPv4 대역(예: 192.168.0.X), 긴 재키 주기(예: 3600초), 여러 트래픽 채널을 두는 IEEE 802.11e QoS 지원, 연결된 단말이다. QoS가 없는 망에서도 단말 연결을 끊어 비슷한 공격이 가능해 보인다고 적었지만 이 변형은 구현하지 않았다. 공격자는 길이로 식별되는 암호화된 ARP 패킷을 골라, 원래 패킷보다 TSC가 낮은 다른 QoS 채널에서 WEP의 chopchop 기법을 변형해 한 바이트씩 추측한다. 틀린 추측은 조용히 버려지고 맞은 추측만 MIC failure report를 일으키므로 60초 이상 간격을 두며 진행하면 12분 남짓에 마지막 12바이트(MIC와 ICV)를 복호화한다. Michael은 일방향 함수가 아니어서 평문과 MIC로 AP에서 단말 방향의 MIC 키를 되돌려 계산할 수 있고, 이 키와 키 스트림으로 TSC가 아직 낮은 채널마다 사용자 지정 패킷을 보낸다(트래픽이 채널 0에만 몰린 일반 망에서 7개). 암호화 키나 PSK를 알아내는 완전한 키 복구 공격은 아니고 한 방향의 MIC 키와 키 스트림만 얻지만 강한 비밀번호의 WPA도 TKIP라면 패킷 복호화와 주입이 가능함을 보였다. 논문이 제시한 대응은 120초 이하의 짧은 재키 주기, 단말의 MIC failure report 전송 비활성화였고, 가장 좋은 해법은 TKIP를 끄고 CCMP만 쓰는 망이었다.

Wi-Fi Alliance는 2015년 3월 16일 시행 기술 노트에서 TKIP가 WEP와 같은 암호를 써 비슷한 공격에 취약하다고 보고, 관리자에게 AP를 WPA2 only로 구성하라고 권고했다. 레거시 단말 때문에 TKIP가 필요하면 방화벽으로 분리하거나 다른 망과 독립된 망에 두라고 했다. 이 노트 기준으로 인증 기기는 기본 설정 화면에서 TKIP-only 옵션을 제공할 수 없었고 보조 인터페이스에서만 둘 수 있었으며, WPA/WPA2 mixed mode는 허용됐지만 권장되지 않았다. 이후 인증 규칙의 변경은 이 문서에서 확인하지 않았다. 공유기 설정에서 TKIP나 WPA/WPA2 mixed가 보이면 그 망에 TKIP 경로가 남아 있는지부터 확인한다.

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

Wi-Fi Alliance 블로그는 WPA3-Personal이 forward secrecy를 포함해, 나중에 비밀번호를 알아낸 사람도 이전 세션이나 다른 사용자의 트래픽을 복호화하지 못한다고 설명한다.

## WPA3-Enterprise 192-bit 모드와 Wi-Fi Enhanced Open은 따로 확인한다

작성일이 표기되지 않은 같은 Wi-Fi Alliance 블로그 기준으로, WPA3-Enterprise의 192-bit 모드는 정부, 금융처럼 민감한 망을 위한 선택 모드다. 같은 글은 이 모드가 각 암호 구성요소의 설정을 지정해 정해진 수준 아래로 구성할 수 없게 하고, 망의 모든 클라이언트가 같은 192-bit 모드로 동작해야 한다고 적는다. 현재 Security 페이지는 WPA3-Enterprise를 민감한 데이터 망을 위한 더 높은 등급의 보안 프로토콜로만 설명한다. WPA3-Enterprise라는 이름만으로 192-bit 모드가 켜졌다고 보지 않으며, 지원하지 않는 기기는 그 망에 붙지 못하는 운영 비용도 함께 본다. 이 모드의 개별 cipher와 해시 구성은 WPA3 Specification으로 대조할 후속 확인 대상이며 이 문서에서는 1차 출처로 대조하지 않았다.

비밀번호 없는 공공 Wi-Fi의 암호화는 WPA3가 아니라 Wi-Fi Enhanced Open이다. Wi-Fi Alliance는 WPA3, Wi-Fi Enhanced Open과 PMF를 별개의 보안 기술로 나열하고, Enhanced Open을 인증 없는 데이터 암호화로 설명한다. RFC 9672는 RFC 8110을 Wi-Fi Enhanced Open으로도 불린다고 적는다. 바탕인 OWE(Opportunistic Wireless Encryption, RFC 8110, 2017년 3월 Informational)는 공개 PSK 대신 Diffie-Hellman 교환 결과를 4-way handshake에 넣어, 공유 비밀번호를 아는 관찰자가 핸드셰이크를 보고 다른 사용자의 트래픽 키를 계산하는 수동 도청을 막는다. 다만 RFC 8110은 OWE가 인증을 제공하지 않고 무선 구간만 보호하며 종단 간 보안이 아니라고 적고, AP를 가장한 능동 공격에는 취약하다고 적는다. 그래서 Enhanced Open 망에서도 Evil Twin 판단은 아래 절의 조건을 그대로 따르고, 실제 인증이 있는 대안을 쓸 수 있으면 OWE를 쓰지 않는다. RFC는 OWE 망에 자물쇠 아이콘을 표시하지 않아야 한다고 권고하므로, 사용자 화면에서 일반 Open 망과 구별되지 않을 수 있다. RFC 9672는 OWE 프로토콜의 이후 작업을 IEEE 802.11 워킹그룹으로 넘긴다고 밝히며 RFC 8110을 갱신했다. 프로토콜 자체를 개정한 문서로 읽지 않는다.

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
- [IEEE SA, IEEE 802.11i-2004](https://standards.ieee.org/ieee/802.11i/3127/) — 승인일, Superseded 상태, TKIP/CCMP와 4-Way Handshake, Group Key Handshake의 범위.
- [NIST, SP 800-97: Establishing Wireless Robust Security Networks: A Guide to IEEE 802.11i](https://csrc.nist.gov/pubs/sp/800/97/final) — 3.2~3.3절(WEP 결함, RSN, 4-Way Handshake), 4.1~4.2절(링크 계층 보호, 키 계층), 7.2~7.3절(WPA와 WPA2 인증). 2025-12-31 철회 문서라 역사와 구조 설명에만 썼다.
- [Wi-Fi Alliance, Security](https://www.wi-fi.org/discover-wi-fi/security) — WPA3 필수와 PMF 요구. 2026-11-16 WPA3, Wi-Fi Enhanced Open과 PMF를 별개 기술로 나열한 구성과 Enhanced Open의 인증 없는 암호화 설명을 추가 대조.
- [What's new in Wi-Fi security? — Wi-Fi Alliance](https://www.wi-fi.org/beacon/the-beacon/whats-new-in-wi-fi-security) — 본문에 작성일 표기 없음. 2026-11-16 WPA3-Personal의 오프라인 사전 공격 저항과 forward secrecy, WPA3-Enterprise 192-bit 모드의 선택 여부와 클라이언트 요건 확인.
- [RFC Editor, RFC 8110: Opportunistic Wireless Encryption](https://www.rfc-editor.org/rfc/rfc8110) — 2절(공개 PSK 도청 문제), 6절(자물쇠 아이콘), 7절(인증 없음, 무선 구간 한정, AP 가장 공격).
- [RFC Editor, RFC 9672: Transferring Opportunistic Wireless Encryption to the IEEE 802.11 Working Group](https://www.rfc-editor.org/rfc/rfc9672) — 초록(RFC 8110 갱신, 이후 작업의 IEEE 802.11 이관)과 서론(Wi-Fi Enhanced Open 명칭).
- [#NW 0034 - 와이파이 해킹 걱정 끝! WPA3 보안의 비밀 90초 완벽 정리 — 길리랩](https://www.youtube.com/watch?v=UZQG6TUV07g) — 음성 전사 기반. 개방형 망 암호화를 WPA3의 기능으로 설명한 부분은 위 1차 출처로 Wi-Fi Enhanced Open으로 바로잡았고, 192-bit 모드의 개별 암호 구성은 1차 출처로 대조하지 못해 쓰지 않았다.
- [#NW 0030 - 당신의 와이파이는 어떻게 해킹을 막을까? IEEE 802.11i 90초 완벽 정리 — 길리랩](https://www.youtube.com/watch?v=Qg1A1eprjAQ) — 음성 전사 기반. WPA를 IEEE 워킹그룹의 결과물로 설명한 부분은 위 1차 출처로 바로잡았다.
- [IEEE SA, IEEE 802.11w-2009](https://standards.ieee.org/ieee/802.11w/3736/) — 관리 프레임 보호(Protected Management Frames) 개정.
- [PIPEDA Report of Findings #2007-389: TJX Companies Inc. / Winners Merchant International L.P. — Office of the Privacy Commissioner of Canada, Office of the Information and Privacy Commissioner of Alberta](https://www.priv.gc.ca/en/opc-actions-and-decisions/investigations/investigations-into-businesses/2007/tjx_rep_070925/) — 1절(영향 카드 수), 11~25절(발견일, 무선 LAN 진입 추정, 침입 기간, WEP 사용), 80~93절(WEP 판단, WPA 전환 기간, 데이터 분리 미흡, 보호조치 위반 결론).
- [Agency Announces Settlement of Separate Actions Against Retailer TJX, and Data Brokers Reed Elsevier and Seisint for Failing to Provide Adequate Security for Consumers' Data — FTC](https://www.ftc.gov/news-events/news/press-releases/2008/03/agency-announces-settlement-separate-actions-against-retailer-tjx-data-brokers-reed-elsevier-seisint) — 2008-03-27 complaint 요약(무선 접근 제한, 평문 저장과 전송, 비밀번호, 방화벽 등 접근 제한).
- [FTC, In the Matter of The TJX Companies, Inc., Complaint (Docket C-4227)](https://www.ftc.gov/sites/default/files/documents/cases/2008/08/080801tjxcomplaint.pdf) — 8항(보안 미흡 주장의 세부).
- [#NW 0031 - 10분 만에 뚫리는 와이파이? WEP 보안의 흑역사 90초 완벽 정리 — 길리랩](https://www.youtube.com/watch?v=P4-1xYZEh7o) — 음성 전사 기반. 크랙 소요 시간과 표준 폐기 연도는 1차 출처로 확인하지 못해 쓰지 않았고, TJX 사례는 위 조사 보고서로 대조했다.
- [Practical attacks against WEP and WPA — Martin Beck, Erik Tews](https://dl.aircrack-ng.org/breakingwepandwpa.pdf) — 2008-11-08 판, 초록과 1절(첫 실용 공격이라는 저자 주장), 6절(완전한 키 복구 공격이 아님), 5절(TKIP 구조, 공격 조건, chopchop 변형, MIC 키 복구, 7개 패킷 주입)과 5.1절(대응). ACM WiSec 2009 게재본은 [DOI 10.1145/1514274.1514286](https://doi.org/10.1145/1514274.1514286).
- [Wi-Fi Alliance, Technical Note: Removal of TKIP from Wi-Fi Devices](https://www.wi-fi.org/system/files/Wi-Fi_Alliance_Technical_Note_TKIP_v1.0.pdf) — v1.0, 2015-03-16 시행. 권고 1~3과 인증 영향 절.
- [#NW 0032 - WPA1 총정리: 2003년 와이파이를 구한 응급처치, 그리고 치명적 약점 — 길리랩](https://www.youtube.com/watch?v=1uVb4y_dgJ0) — 음성 전사 기반. 공격 결과와 TKIP 퇴출 조건은 위 논문과 기술 노트로 대조했다.

## 관련 문서

- [[Packet-Capture-and-Wireshark|패킷 캡처와 Wireshark]] — 캡처 위치와 TLS 복호화 조건
- [[ARP-Spoofing|ARP 스푸핑]] — L2 경로 탈취와 방어
- [[Public-WiFi-Trust-Boundaries|공공 Wi-Fi의 신뢰 경계]] — 통신, 서비스와 기기 권한 구분
- [[Dependency-Vulnerability-Scanning|의존성 취약점 스캐닝]] — 백포트와 영향 조건 판정
- [[네트워크보안(NetworkSecurity)|네트워크 보안 인덱스]]
