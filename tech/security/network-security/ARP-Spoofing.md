---
tags: [security, network-security, arp, arp-spoofing, mitm, l2, nac, dai, dhcp-snooping, ipv6-nd]
status: done
category: "Security - 네트워크 보안"
aliases: ["ARP Spoofing", "ARP 스푸핑", "ARP Cache Poisoning", "ARP 캐시 오염", "ARP 기반 NAC 차단", "Dynamic ARP Inspection", "DAI"]
verified_at: 2026-09-23
---

# ARP 스푸핑: 인증 없는 주소 해석이 만드는 중간자 공격

ARP 스푸핑(ARP cache poisoning)은 같은 L2 세그먼트에 있는 공격자가 위조한 ARP 메시지로 다른 호스트의 ARP 캐시에 거짓 IP와 MAC 대응을 심어, 그 IP로 가야 할 프레임을 자기에게 오게 만드는 공격이다. ARP의 기본 동작(요청 브로드캐스트, 응답, 캐시)은 [[Network-Layer#ARP — IP를 MAC으로 해석|L3 네트워크 계층의 ARP]]를 전제로 한다.

한 줄 요약: **ARP는 발신자가 그 IP의 주인인지 검증하지 않고 캐시에 반영하므로, 같은 브로드캐스트 도메인의 누구나 트래픽의 L2 다음 홉을 바꿀 수 있다. 방어는 L2에서 대응을 검증하는 축과, 경로를 빼앗겨도 내용이 보호되도록 상위 계층을 암호화하는 축으로 나뉜다.**

## 왜 가능한가: 검증 없는 캐시 갱신

RFC 826의 수신 알고리즘은 ARP 패킷을 받으면 opcode를 보기 전에 발신자의 IP와 MAC 대응부터 처리한다.

- 발신자 IP가 이미 테이블에 있으면 패킷에 담긴 발신자 MAC으로 덮어쓴다. 요청인지 응답인지, 내가 요청한 것인지는 따지지 않는다.
- 테이블에 없으면 자신이 대상 IP일 때만 새로 추가한다.
- 발신자가 그 IP의 정당한 소유자인지 확인하는 인증 절차는 명세에 없다.

OS 구현은 명세를 조정하지만 핵심 약점은 남는다. Linux의 `arp_accept`는 테이블에 없는 장비가 보낸 gratuitous ARP로 새 항목을 만들지 정하고 기본값 0은 만들지 않는다. 그러나 커널 문서가 밝히듯 이미 테이블에 있는 IP라면 이 설정과 관계없이 갱신한다. 피해자는 평소 게이트웨이와 통신하므로 게이트웨이 항목을 이미 갖고 있고, 새 항목 생성 제한만으로는 이 공격을 막지 못한다.

RFC 5227도 보안 고려사항에서 ARP 기반 메커니즘은 ARP의 취약점을 그대로 물려받으며, 악의적인 호스트가 모든 ARP 요청에 자기 MAC으로 응답해 네트워크의 모든 주소를 자기 것이라고 주장하기 쉽다고 적는다.

요청받지 않은 ARP 자체는 정상 기능이기도 하다. RFC 5227의 ARP Announcement는 새 주소를 쓰기 시작한 호스트가 링크의 다른 호스트에 남은 오래된 캐시 항목을 갱신하려고 보내는 브로드캐스트다. 메시지 형태만으로 공격과 정상 동작을 가를 수 없고, 누가 그 IP를 가져도 되는지에 대한 별도 근거가 있어야 판정할 수 있다.

## 공격 흐름: 양방향 위조와 중계

피해자 PC(V), 게이트웨이(G), 공격자(A)가 같은 VLAN에 있다고 하자.

1. A가 V에게 G의 IP를 A의 MAC에 대응시킨 ARP를 보낸다.
2. A가 G에게 V의 IP를 A의 MAC에 대응시킨 ARP를 보낸다.
3. V가 외부로 보내는 프레임과 G가 V에게 돌려보내는 프레임의 목적지 MAC이 모두 A가 된다. IP 헤더의 목적지는 그대로라 V와 G는 IP 수준에서 경로 변화를 알아채지 못한다.
4. A는 받은 패킷을 원래 목적지로 다시 보낸다. 중계하지 않으면 통신이 끊겨 서비스 거부가 되고, 중계하면 통신이 유지된 채 모든 트래픽이 A를 지난다.
5. 캐시 항목은 만료나 재해석으로 정상 대응으로 돌아갈 수 있으므로 A는 위조 ARP를 주기적으로 다시 보낸다.

공격 원리 자체는 **L2 다음 홉 탈취**이고, 탈취한 뒤 중계할지 버릴지 변조할지는 선택이다. 이 구분이 아래 NAC 사례를 이해하는 기준이 된다. ARP는 라우터를 넘지 않으므로 공격 범위도 공격자가 속한 브로드캐스트 도메인으로 제한된다.

## 경로를 차지한 공격자가 할 수 있는 것

경로 위 공격자의 능력은 통신 보호 수준에 따라 달라진다. 중계자 관점의 같은 구분은 [[Proxy-Trust-and-Anonymity#중계자가 볼 수 있는 것과 볼 수 없는 것|중계 경로의 신뢰 모델]]에도 있다.

| 통신 | 가능한 것 | 막히는 것 |
|---|---|---|
| 평문 HTTP, 평문 DNS, Telnet 등 | 내용 열람, 자격증명과 세션 쿠키 탈취, 응답 위조와 변조 | 없음 |
| 인증서를 검증하는 TLS | 목적지 IP, 평문 SNI, 트래픽 양과 타이밍 관찰, 차단과 지연 | 내용 열람과 변조 (위조 인증서는 검증에서 실패) |
| 첫 요청이 HTTP인 HTTPS 사이트 | 첫 HTTP 요청을 가로채 HTTPS 전환을 막는 다운그레이드 시도 | 이미 HSTS를 받았거나 preload된 도메인 |

실질 피해는 평문 프로토콜과 인증서 검증 우회에서 커진다. 사용자가 인증서 경고를 무시하고 진행하거나 단말에 공격자가 통제하는 루트 CA가 설치돼 있으면 TLS도 보호가 되지 않는다([[Public-Key-Cryptography#Man-in-the-Middle(MITM) 공격과 PKI|MITM과 PKI]]). RFC 6797은 HSTS를 아직 받지 않은 호스트에 `http` URI로 처음 접근하는 구간을 bootstrap MITM 취약점으로 설명한다([[Security-Headers#HSTS — HTTPS 강제|HSTS 설정]]). 평문 DNS 응답도 경로 위에서 위조할 수 있으므로 [[DNS#DNS 보안: 응답 검증과 전송 보호|DNS 응답 검증과 전송 보호]]를 함께 본다.

## 같은 원리의 방어 도구: ARP 기반 NAC 차단

NAC(Network Access Control)는 네트워크에 붙은 단말을 식별하고 정책에 맞지 않는 단말의 접근을 제한한다. 일부 NAC는 차단 수단으로 ARP 스푸핑과 같은 원리를 쓴다. Genian NAC 문서의 ARP Enforcement는 차단 대상 단말이 ARP 요청을 보내면 네트워크 센서가 자기 MAC으로 응답하고, 센서로 들어온 패킷을 정책에 따라 버리거나 실제 목적지로 전달하는 방식이다.

공격과 다른 점은 기술이 아니라 권한과 목적이다. 공격자는 가로챈 트래픽을 중계해 들키지 않으려 하고, NAC는 비인가 단말의 트래픽을 버려 연결을 끊는다. L2 다음 홉을 빼앗은 뒤 중계하느냐 버리느냐의 선택이 그대로 드러난다.

같은 문서는 이 방식을 쓰는 이유로 802.1X 포트 인증의 비용을 든다. 지원하지 않는 장비의 교체와 큰 네트워크 구성 변경이 필요하고 포트별 예외 관리가 번거롭다는 것이다. 센서만으로 같은 서브넷 내부까지 통제할 수 있는 대신 다음 트레이드오프가 따른다.

- **세그먼트마다 센서가 필요하다.** ARP는 라우터를 넘지 않으므로 통제할 브로드캐스트 도메인(VLAN)마다 센서가 닿아 있어야 한다.
- **스위치의 L2 보안 기능과 충돌할 수 있다.** DAI가 켜진 untrusted 포트에서는 바인딩과 맞지 않는 센서의 응답이 버려지고, ARP 속도 제한을 넘으면 포트가 error-disabled 상태가 될 수 있다. 함께 쓰려면 센서 포트의 신뢰 설정이나 예외를 설계해야 한다. 이 충돌은 Cisco DAI 문서의 동작에서 도출한 것이므로 실제 연동 방식은 제품 문서로 확인한다.
- **차단 자체가 캐시 오염이다.** 정책 오류나 센서 오동작은 정상 단말의 캐시를 틀리게 만들어 여러 단말의 통신 장애로 번질 수 있다. 장애 분석 중에 ARP 테이블의 MAC이 의도된 차단인지 공격인지 구분하는 부담도 생긴다.
- **정적 ARP로 우회될 수 있다.** 단말이 게이트웨이를 정적 항목으로 고정하면 위조 응답이 먹히지 않는다. Genian 문서도 이 우회를 언급하며 게이트웨이 쪽 응답까지 통제하는 양방향 차단과 에이전트 기반 제어를 보완책으로 둔다.

같은 제품도 802.1X(RADIUS), SNMP로 스위치 포트를 내리는 방식, DHCP 기반 통제를 함께 제공한다. 도입할 때는 차단 방식별로 필요한 인프라와 장애 영향 범위를 비교한다.

## 방어: 검증, 고정, 분리, 암호화

| 계층 | 수단 | 동작 | 한계 |
|---|---|---|---|
| 스위치 | DHCP snooping과 DAI | untrusted 포트로 들어온 ARP의 IP와 MAC 대응을 DHCP snooping 바인딩이나 ARP ACL과 대조해 틀리면 버림 | 관리형 스위치에서 켜고 설계해야 함, 신뢰 설정 오류 시 연결 단절 |
| 호스트 | 정적 ARP 항목 | 게이트웨이처럼 중요한 대응을 고정 | 설정한 호스트의 캐시만 보호, 반대 방향은 별도, 장비 교체 시 수동 갱신 |
| 네트워크 설계 | VLAN 분리 | 공격이 가능한 브로드캐스트 도메인 자체를 줄임 | 같은 VLAN 안에서는 여전히 유효 |
| 상위 계층 | TLS, HSTS, 암호화 DNS, VPN | 경로를 빼앗겨도 내용 열람과 변조를 막음 | 메타데이터 노출과 차단은 막지 못함 |

DAI는 L2 스위치가 알아서 막아 주는 기능이 아니다. Cisco Catalyst 9300 IOS XE 17.18.x 문서 기준으로 다음과 같이 동작한다.

- 모든 VLAN에서 기본 비활성이고 모든 인터페이스는 기본 untrusted다.
- 검증 근거로 DHCP snooping 바인딩 데이터베이스를 쓰므로 DHCP snooping을 먼저 켜야 한다. 고정 IP 장비는 ARP ACL로 대응을 등록한다.
- trusted 인터페이스로 들어온 ARP는 검사 없이 통과한다. 신뢰해야 할 포트를 untrusted로 두면 연결이 끊길 수 있다.
- untrusted 인터페이스의 기본 속도 제한은 15pps이고 넘으면 포트를 error-disabled로 만든다.
- ingress 기능이며 egress는 검사하지 않는다.

## 탐지 신호

- **ARP 테이블 변화**: 게이트웨이 IP의 MAC이 바뀌었거나 서로 다른 IP가 같은 MAC을 가리키는지 `ip neigh`(Linux)나 `arp -a`로 확인한다. 프록시 ARP, 한 인터페이스에 여러 IP를 둔 장비, 장비나 NIC 교체처럼 정상 사유도 있으므로 변경 이력과 함께 판단한다.
- **패킷 캡처**: Wireshark는 같은 IP가 이전 프레임과 다른 MAC으로 관측되면 `arp.duplicate-address-detected`, 과도한 ARP에는 `arp.packet-storm-detected`를 표시한다. 캡처 지점이 공격 구간을 볼 수 있는지는 [[Packet-Capture-and-Wireshark#무엇이 보이는가: 캡처 위치|캡처 위치]]로 먼저 정한다.
- **스위치 기록**: DAI를 쓰면 드롭 통계와 로그, error-disabled 전환이 직접 근거가 된다.
- **증상**: 특정 단말만 간헐적으로 끊기거나 느려지고 인증서 경고가 늘어날 수 있다. 장애를 회선 문제로만 보지 말고 ARP 테이블과 캡처로 L2 경로를 확인한다.

## 환경별 위협 모델

- **공용 Wi-Fi, 카페, PC방, 게스트망**: 신뢰할 수 없는 사용자가 같은 L2를 공유하므로 이 공격을 위협 모델에 넣는다. 사용자 쪽에서는 TLS와 HSTS, 인증서 경고를 무시하지 않는 습관, 필요하면 VPN으로 대응한다. 로컬 네트워크라는 이유로 안전하다고 가정하지 않는다.
- **사내 유선망**: 관리형 스위치의 DHCP snooping과 DAI, VLAN 분리, 802.1X와 NAC가 통제 수단이다. 내부망이라도 DB 연결과 내부 API를 평문으로 두지 않아야 경로 탈취가 곧 데이터 유출로 이어지지 않는다.
- **클라우드 VPC**: AWS의 2016년 보관 보안 백서는 EC2 인스턴스가 자기 것이 아닌 출발지 IP나 MAC으로 트래픽을 보낼 수 없고 ARP cache poisoning이 EC2와 VPC 안에서 동작하지 않는다고 설명한다. 보관 문서이며 이 문서 작성 시점에 현재 공식 문서의 같은 서술은 확인하지 못했으므로 설계 근거로 쓸 때는 다시 확인한다. 백서도 민감한 트래픽은 암호화하라고 권한다.
- **컨테이너 호스트**: Docker 기본 bridge 네트워크는 같은 bridge의 컨테이너끼리 제한 없이 통신하게 하고, Docker 기본 capability에는 RAW와 PACKET 소켓을 쓰는 `NET_RAW`가 포함된다. 침해된 컨테이너가 같은 bridge에 위조 ARP를 보낼 조건이 갖춰지는 셈이므로, 필요 없으면 `--cap-drop=NET_RAW`로 제거하되 이미지의 진단 도구가 이 권한에 의존하는지 먼저 확인한다. Kubernetes Pod Security Standards의 Restricted 프로필은 모든 capability의 drop(`ALL`)을 요구하고 `NET_BIND_SERVICE`만 다시 추가하도록 허용한다. 파드끼리 L2를 공유하는지는 CNI 구성에 따라 다르므로 클러스터에서 확인한다. bridge의 패킷 경로는 [[Docker-Bridge-Networking#같은 bridge의 container 간 통신|같은 bridge의 container 간 통신]].

## IPv6: 같은 문제, 다른 프로토콜

IPv6는 ARP 대신 Neighbor Discovery(ND)로 이웃의 링크 계층 주소를 해석한다. RFC 4861은 ND도 ARP 스푸핑처럼 거짓 정보를 담은 메시지 공격에 노출된다고 명시한다. Hop Limit 255 검사는 링크 밖에서 보낸 ND 메시지를 걸러 주지만 같은 링크의 공격자를 막는 장치는 아니다. 표준 해법인 SEND(RFC 3971)에 대해 RFC 6105는 배포가 간단하지 않다고 평가하고, L2 장비에서 위조 Router Advertisement를 거르는 RA Guard를 가벼운 대안이자 보완책으로 제시한다. IPv6가 켜진 네트워크에서는 ARP만 점검하지 말고 ND와 RA도 같은 기준으로 본다.

## 운영 체크포인트

- 같은 VLAN에 누가 붙을 수 있는지부터 확인한다. 신뢰할 수 없는 단말이 섞이는 구간이면 L2 검증이나 분리가 필요하다.
- 관리형 스위치에서 DHCP snooping과 DAI를 켤 때 업링크와 DHCP 서버 방향 포트의 trust, 고정 IP 장비의 ARP ACL, 속도 제한 값을 함께 설계한다.
- NAC를 도입하면 차단 방식이 ARP 기반인지, 스위치의 L2 보안 기능과 충돌하지 않는지, 802.1X나 스위치 포트 제어로 대체할 수 있는지 비교한다.
- 서비스 간 통신은 내부망이어도 TLS를 기본으로 두어 L2 경로 탈취가 내용 노출로 이어지지 않게 한다.
- 컨테이너 워크로드에는 필요 없는 `NET_RAW`를 부여하지 않는다.
- 간헐적 통신 장애는 ARP 테이블 변화와 캡처로 L2 경로를 확인한 뒤 회선이나 애플리케이션 원인으로 좁힌다.

## 면접 체크포인트

- ARP가 스푸핑에 취약한 이유 (인증 없음, 요청과 응답 모두 기존 항목을 갱신, 요청하지 않은 메시지도 반영)
- 양방향 위조 뒤 중계 여부가 MITM과 서비스 거부를 가르는 이유, 공격 범위가 브로드캐스트 도메인으로 제한되는 이유
- 경로를 빼앗긴 상태에서 TLS가 막는 것과 못 막는 것, HSTS의 bootstrap MITM 한계
- DAI가 DHCP snooping 바인딩에 의존하는 이유, 기본 비활성과 trust 설계, 속도 제한과 error-disabled
- ARP 기반 NAC가 공격과 같은 원리를 쓰는 이유와 운영 리스크, 802.1X와의 비용 차이
- IPv6 ND의 같은 취약점과 SEND, RA Guard

## 출처

제공된 메모를 바탕으로 정리했으며 영상 본문과 자막은 직접 확인하지 못했다. 보완한 기술 설명은 아래 공식 자료와 대조했다.

- [ARP Spoofing 공격과 NAC(△)의 원리 — 널널한 개발자 TV](https://www.youtube.com/watch?v=3cOusjVRIig&list=PLXvgR_grOs1BkUIxKsLEUdefyMWMA0_U-&index=8)
- [IETF, RFC 826: An Ethernet Address Resolution Protocol](https://www.rfc-editor.org/rfc/rfc826.html)
- [IETF, RFC 5227: IPv4 Address Conflict Detection](https://www.rfc-editor.org/rfc/rfc5227.html)
- [IETF, RFC 4861: Neighbor Discovery for IP version 6 (IPv6)](https://www.rfc-editor.org/rfc/rfc4861.html)
- [IETF, RFC 6105: IPv6 Router Advertisement Guard](https://www.rfc-editor.org/rfc/rfc6105.html)
- [IETF, RFC 6797: HTTP Strict Transport Security (HSTS)](https://www.rfc-editor.org/rfc/rfc6797.html#section-14.6)
- [Linux Kernel Documentation, IP Sysctl](https://docs.kernel.org/networking/ip-sysctl.html)
- [Cisco, Catalyst 9300 Security Configuration Guide, IOS XE 17.18.x: Configuring Dynamic ARP Inspection](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-18/configuration_guide/sec/b_1718_sec_9300_cg/configuring_dynamic_arp_inspection.html)
- [Genians, Genian NAC Documentation: Policy Enforcement Methods](https://docs.genians.com/release/en/controlling/enforcement-methods.html)
- [Wireshark, Display Filter Reference: Address Resolution Protocol](https://www.wireshark.org/docs/dfref/a/arp.html)
- [Docker, Docker Engine: Running containers](https://docs.docker.com/engine/containers/run/)
- [Docker, Bridge network driver](https://docs.docker.com/engine/network/drivers/bridge/)
- [Kubernetes, Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Overview of AWS Security: Network Security (August 2016, archived) — AWS](https://d1.awsstatic.com/whitepapers/Security/Networking_Security_Whitepaper.pdf)

## 관련 문서

- [[Network-Layer|L3 네트워크 계층 (ARP 기본 동작)]]
- [[Physical-DataLink-Layer|물리와 데이터링크 계층 (MAC, 스위치 학습과 플러딩)]]
- [[Unicast-Broadcast-Multicast|유니캐스트, 브로드캐스트, 멀티캐스트 (ARP 브로드캐스트)]]
- [[Proxy-Trust-and-Anonymity|중계 경로의 신뢰 모델 (경로 위 중계자가 보는 범위)]]
- [[Public-Key-Cryptography|공개키 암호 (MITM과 PKI)]]
- [[HTTPS-TLS|HTTPS와 TLS Handshake]]
- [[Security-Headers|HTTP 보안 헤더 (HSTS)]]
- [[DNS|DNS (응답 검증과 전송 보호)]]
- [[Packet-Capture-and-Wireshark|패킷 캡처와 Wireshark]]
- [[Docker-Bridge-Networking|Docker Bridge Networking]]
- [[Inline-vs-Out-of-Path|인라인과 아웃오브패스 배치]]
- [[네트워크보안(NetworkSecurity)|네트워크 보안 인덱스]]
