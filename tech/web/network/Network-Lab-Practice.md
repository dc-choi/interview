---
tags: [web, network, packet-tracer, troubleshooting, lab]
status: done
verified_at: 2026-11-01
category: "Web - 네트워크"
aliases: ["Network Lab Practice", "네트워크 실습", "Packet Tracer 실습"]
---

# 네트워크 실습: 구축, 관찰과 장애 진단

네트워크 실습은 연결을 만든 뒤 패킷이 지나가는 경로를 설명하고, 설정 하나를 바꿨을 때의 실패를 관찰하는 과정이다. 케이블이 연결됐는지, IP로 왕복하는지, 이름을 해석하는지, 애플리케이션이 응답하는지를 나눠 확인한다.

목표를 작게 정하고, 예상한 동작과 실제 결과의 차이를 기록한다. 막힌 지점에서 매뉴얼을 찾고 수정한 뒤 같은 검사를 다시 한다. 이 방식은 학습 활동의 설계 예시이며 강의나 교재보다 모든 사람에게 효과적이라는 검증 결과는 아니다.

## 시뮬레이터와 실제 네트워크를 구분한다

Cisco Packet Tracer는 네트워크 장비와 프로토콜을 단순화해 모델링하는 학습 도구다. 토폴로지 구성과 패킷 흐름 확인에 유용하지만 실제 장비의 모든 기능, 타이밍과 성능을 재현하지는 않는다. Simulation 모드에서는 이벤트를 한 단계씩 진행하며 PDU와 장비 상태를 살펴볼 수 있다. 숨긴 프로토콜 이벤트와 실제로 발생하지 않은 이벤트도 구분한다.

장비 모델에 따라 인터페이스 이름과 지원 명령이 다르므로 먼저 현재 장비를 확인한다. 아래는 IPv4 이더넷 실습 예시다. 실제 서비스 운영망에 적용하는 설정 템플릿이 아니며, Packet Tracer의 설치와 계정 조건은 공식 안내를 따른다.

## 최소 구성: 라우터 하나로 두 서브넷 연결

구성은 `PC A — 스위치 A — 라우터 — 스위치 B — PC B`다. 두 스위치는 각각 별도의 L2 구간이며 PC와 라우터를 이더넷으로 연결한다. 초기 실습은 DHCP 없이 정적 주소를 사용한다.

| 대상 | IPv4 주소/프리픽스 | 기본 게이트웨이 |
| --- | --- | --- |
| PC A | `192.168.10.10/24` | `192.168.10.1` |
| 라우터의 A쪽 인터페이스 | `192.168.10.1/24` | 이 실습에서는 불필요 |
| 라우터의 B쪽 인터페이스 | `192.168.20.1/24` | 이 실습에서는 불필요 |
| PC B | `192.168.20.10/24` | `192.168.20.1` |

`/24`의 마스크는 `255.255.255.0`이다. `.1`을 게이트웨이로 쓰는 것은 여기서 정한 관례이며 필수 규칙이 아니다. 네트워크 주소와 브로드캐스트 주소도 프리픽스와 함께 계산한다([[IPv4-Subnetting]]). 두 스위치는 기본 L2 전달만 하므로 관리용 IP를 설정하지 않아도 이 구성의 프레임을 전달할 수 있다.

아래는 라우터의 두 인터페이스가 `GigabitEthernet0/0`, `GigabitEthernet0/1`인 경우다. 먼저 `show ip interface brief`로 이름을 확인하고, 다른 모델이면 해당 이름으로 바꾼다.

```text
enable
show ip interface brief
configure terminal
interface GigabitEthernet0/0
ip address 192.168.10.1 255.255.255.0
no shutdown
exit
interface GigabitEthernet0/1
ip address 192.168.20.1 255.255.255.0
no shutdown
end
show ip interface brief
show ip route
copy running-config startup-config
```

인터페이스에 주소를 설정하고 연결이 정상 동작하면 해당 직접 연결 경로가 라우팅 테이블에 나타난다. 이 구성은 두 네트워크가 라우터에 직접 붙어 있으므로 별도의 정적 경로나 NAT가 필요하지 않다. `no shutdown`은 관리상 비활성을 해제하며, 케이블과 상대 장비까지 정상임을 보장하지는 않는다. 저장 명령은 현재 설정을 시작 설정에 복사한다.

PC A에서 `ping 192.168.20.10`, PC B에서 `ping 192.168.10.10`을 수행하는 것이 연결 확인 목표다. 이 문서 작성 과정에서는 명령과 원리를 공식 자료에 대조했으며 실습을 실행하지 않았다.

## 패킷 한 번의 왕복을 설명한다

이 구성에서 NAT, 터널과 별도 정책은 사용하지 않는다. 필요한 ARP 캐시가 비어 있다고 가정한다.

1. PC A는 라우팅 테이블로 목적지 `192.168.20.10`의 다음 홉을 선택한다. 직접 연결 경로에 없고 더 구체적인 경로도 없으므로 기본 게이트웨이를 사용한다.
2. PC A가 ARP로 묻는 주소는 원격 PC B가 아니라 **같은 링크의 게이트웨이 `192.168.10.1`**이다. ARP 요청은 A쪽 L2 구간에 브로드캐스트된다.
3. A가 만드는 이더넷 프레임의 목적지 MAC은 라우터 A쪽 MAC이고, 그 안의 IP 패킷 목적지는 PC B다. 스위치는 출발지 MAC을 학습하고 프레임을 전달한다.
4. 라우터는 목적지 IP에 맞는 B쪽 직접 연결 경로를 고른다. B의 MAC이 필요하면 B쪽 링크에서 별도로 ARP를 수행한다. A쪽 ARP 브로드캐스트를 반대편으로 전달하는 것이 아니다.
5. 라우터는 B쪽 링크에 맞는 새 프레임으로 IP 패킷을 전달한다. 이 경로에서는 출발지와 목적지 IP가 유지되지만 TTL은 감소한다.
6. PC B의 Echo Reply도 자신의 경로와 게이트웨이를 사용해 돌아온다. 요청이 도착했어도 반환 경로가 없거나 응답이 차단되면 왕복 검사는 실패한다.

같은 서브넷의 직접 연결 목적지라면 게이트웨이 대신 목적지 MAC을 해석한다. 주소 해석은 [[Network-Layer]], 프레임 재구성은 [[Network-Encapsulation]], 호스트의 경로 선택은 [[Routing-Table-and-Interface-Selection]]에 연결한다.

## 실패를 한 변수씩 만든다

먼저 정상 설정을 저장하고 한 항목만 바꾼다. 증상, 가설, 확인한 상태와 복구 결과를 기록한다.

| 바꿀 항목/증상 | 확인할 근거 | 해석 |
| --- | --- | --- |
| PC의 기본 게이트웨이 제거 | PC의 주소와 경로, ARP 대상 | 이 구성에서 원격 서브넷으로 보낼 경로가 사라진다 |
| B를 `192.168.10.11/24`로 잘못 설정 | A가 보내는 ARP와 B쪽 수신 여부 | 서로 다른 L2 구간을 같은 직접 연결망으로 오인하게 된다 |
| 라우터 인터페이스 비활성화 | `show ip interface brief`, `show ip route` | 관리 상태와 링크 상태, 연결 경로를 나눠 본다 |
| 링크는 정상인데 ping 실패 | 양쪽 경로, 주소/마스크, ARP, ICMP 필터 | 링크 상태만으로 IP 왕복을 증명하지 않는다 |
| IP 연결은 되지만 이름으로 접속 실패 | DNS 질의/응답과 resolver 설정 | 이름 해석과 라우팅을 분리한다 |
| ping 성공, 웹 접속 실패 | 서비스 수신 주소/포트와 방화벽, HTTP 응답 | ICMP 왕복은 TCP와 애플리케이션의 정상 동작을 보장하지 않는다 |

첫 시도의 지연이 ARP 처리 등과 관련될 수는 있지만, 모든 최초 실패를 ARP 탓으로 단정하지 않는다. Simulation 이벤트나 캡처에서 실제 순서를 확인한다.

## 다음 실습으로 확장할 개념

| 개념 | 관찰할 것 | 오해를 피할 기준 |
| --- | --- | --- |
| DHCP | 신규 임대의 Discover, Offer, Request, ACK와 받은 설정 | ACK는 서버가 보내는 메시지다. 갱신 때는 같은 4단계를 전부 반복하지 않을 수 있다. [[Application-Layer-Protocols]] |
| DNS | 로컬 캐시와 재귀 resolver, 위임 응답과 권한 서버 | 캐시가 없을 때 재귀 resolver가 루트, TLD, 권한 서버의 안내를 따라간다. 루트가 대신 TLD에 물어 최종 답을 가져오는 구조로 설명하지 않는다. [[DNS]] |
| TCP/UDP | TCP 연결 설정과 스트림, UDP 데이터그램 | UDP 자체는 전달/순서를 보장하지 않지만 상위 프로토콜이 재전송을 구현할 수 있다. UDP라서 파일 전송이 반드시 손상되는 것은 아니다. [[Transport-Layer]] |
| 포트 | 수신 소켓과 연결의 로컬/원격 주소, 포트 | 임시 출발지 포트 사용과 인터넷에서 접속 가능한 서비스 노출은 다르다. [[Transport-Layer-Sockets]] |
| NAT/NAPT(PAT) | 변환 전후 주소/포트와 반환 매핑 | NAPT는 NAT의 한 유형이다. TCP/UDP의 흐름 매핑을 패킷마다 임의의 새 포트를 붙이는 것으로 이해하지 않는다. [[IPv4-NAT-and-Traversal]] |
| 패킷 캡처 | 캡처 위치, 프로토콜별 필드, 요청과 응답 | Packet Tracer 이벤트는 시뮬레이션이고 Wireshark 캡처는 해당 지점에서 관찰한 패킷이다. [[Packet-Capture-and-Wireshark]] |
| 보안 | 평문/암호화, 서비스 노출, 인증과 권한 | 연결 성공과 안전성은 별개다. 시연 조건과 방어를 [[Network-Security-Lab-Interpretation]]에서 구분한다 |

## 열 단계 실습 후보

다음은 10일 구성의 입문 영상에서 가져와 완료 조건으로 바꾼 예시다. 하루에 하나씩 끝내야 한다는 일정이나 사용자가 채택한 학습 진도가 아니다. 배경지식과 가용 시간에 맞춰 나누며 완료 여부는 직접 설명하고 재현한 근거로 판단한다.

| 단계 | 활동 | 남길 결과 |
| --- | --- | --- |
| 1 | 자기 실습 장치의 인터페이스, MAC, IP/프리픽스, 게이트웨이, DNS 확인 | 각 값의 역할을 자기 말로 설명 |
| 2 | ARP와 ping 관찰 | 동일 서브넷과 원격 서브넷의 ARP 대상 차이 |
| 3 | Packet Tracer 장애 과제 하나 해결 | 최초 증상, 원인과 복구 근거 |
| 4 | Wireshark로 자기 트래픽이나 공개 샘플 읽기 | 패킷의 주소, 프로토콜과 요청/응답 연결 |
| 5 | traceroute의 홉과 응답 누락 해석, 별도로 WPA2 실습 캡처 분석 | 경로 관찰과 무선 인증의 차이. TCP 3-way와 WPA2 4-way handshake를 혼동하지 않음 |
| 6 | 로컬 웹페이지 제공 | 수신 주소/포트와 접근 범위 확인 |
| 7 | SearXNG나 4get 같은 메타 검색 서비스의 격리된 자체 호스팅 검토 | 설치 문서, 의존 서비스와 네트워크 경로. 실제 설치와 공개 운영은 별도 과제 |
| 8 | 허가된 격리망에서 MITM 또는 Evil Twin 시연의 조건 분석 | 공격 전제, 암호화가 보호하는 것과 방어 수단 |
| 9 | 의도적으로 취약한 VM의 서비스와 버전 조사 | 도달 가능성, 취약 조건과 패치 근거를 구분한 기록 |
| 10 | 기록을 보지 않고 초기 구성과 실패 원인 설명 | 부족한 개념과 다음 확인 항목 |

취약 VM은 실습용 장치 사이에서만 통신하게 격리하고 실제 계정이나 업무 데이터를 넣지 않는다. 위 단계는 학습 후보이며 서비스 공개, 무선 연결 방해나 취약점 실행을 수행했다는 뜻이 아니다.

## 실습 자료와 확인 수준

- [Packet Tracer Practice Labs — PPechmann](https://github.com/PPechmann/Packet-Tracer-Practice-Labs): 입문용 구성/해결 파일과 저장소 설명을 확인했다. 각 실습 파일은 실행하지 않았다.
- [CCNA Packet Tracer Troubleshooting Labs — Witty Networks](https://wittynetworks.net/courses/ccna-packet-tracer-troubleshooting-labs/): 고장 난 토폴로지와 목표를 제공하는 과제 설명을 확인했다. 사이트는 난도순 배열이 아니라고 밝히며, 과정 접근에는 로그인 안내가 있다. 전 과제를 실행하지 않았다.
- [Aircrack-ng 테스트 자료](https://github.com/aircrack-ng/aircrack-ng/tree/master/test): 무선 인증 캡처 학습 후보. 공식 README와 테스트 파일에서 샘플을 확인했으며 모든 캡처를 분석하지 않았다.
- [Kioptrix Level 1 — VulnHub](https://www.vulnhub.com/entry/kioptrix-level-1-1,22/): 의도적으로 취약한 VM 과제의 설명과 배포 페이지를 확인했다. VM 다운로드와 취약점 재현은 하지 않았다.

## 출처

- [YouTube, dzuma, POV: You Learn Networking For Fun](https://www.youtube.com/watch?v=sFck88rcl4s) — 2026-10-24 공개, 2026-11-01 전체 음성 전사 확인. 05:14~33:01의 구성과 개념, 1:01:28 이후의 실습 후보를 정리했다. 보안 구간은 관련 문서로 분리했다. 화면의 개별 명령을 전수 대조하거나 실습을 재현하지 않았다.
- [Cisco Packet Tracer Help, Introduction](https://tutorials.ptnetacad.net/help/default/intro.htm) — 시뮬레이션의 모델링 한계.
- [Cisco Packet Tracer Help, Simulation Mode](https://tutorials.ptnetacad.net/help/default/mode_simulation.htm) — 이벤트 진행, PDU 확인과 표시 필터.
- [Cisco, Cisco IOS CLI for Initial Configuration](https://www.cisco.com/c/en/us/td/docs/routers/access/1900/software/configuration/guide/Software_Configuration/appendixAcli.html) — 1900/2900/3900 계열의 인터페이스 설정, 상태 확인과 설정 저장. 모든 모델의 지원 보장은 아님.
- [IETF, RFC 826: An Ethernet Address Resolution Protocol](https://www.rfc-editor.org/rfc/rfc826) — 로컬 링크의 프로토콜 주소와 하드웨어 주소 대응.
- [IETF, RFC 1918: Address Allocation for Private Internets](https://www.rfc-editor.org/rfc/rfc1918.txt) — 사설 주소 범위.
- [IETF, RFC 2131: Dynamic Host Configuration Protocol](https://www.rfc-editor.org/rfc/rfc2131) — 임대와 메시지 교환.
- [IETF, RFC 1034: Domain Names, Concepts and Facilities](https://www.rfc-editor.org/rfc/rfc1034.txt) — 재귀 질의와 referral.
- [IETF, RFC 768: User Datagram Protocol](https://www.rfc-editor.org/rfc/rfc768.txt) — UDP의 전달 보장 범위.
- [IETF, RFC 2663: IP Network Address Translator Terminology and Considerations](https://www.rfc-editor.org/rfc/rfc2663.txt) — Basic NAT와 NAPT의 관계.

교육제도의 기원, 특정 학습 방식의 보편적 우월성, 로그인 화면 우회와 개인정보 판매에 대한 발언은 검증하지 않았다. 일반적인 사실이나 설치 절차로 채택하지 않으며 별도 확인이 필요한 주장으로 남긴다. 자기 호스팅 후보의 최신 설치법과 원본에서 연결한 별도 보안 영상의 본문도 후속 확인 대상이다. 마지막 채널 안내의 반복/환각 의심 표시는 학습 본문에 반영하지 않았다.

## 관련 문서

- [[네트워크(Network)|네트워크 인덱스]]
- [[Network-Layer|IP 주소, 라우팅과 ARP]]
- [[Network-Encapsulation|네트워크 데이터 흐름과 캡슐화]]
- [[IPv4-Subnetting|IPv4 서브넷팅과 주소 관리]]
- [[Packet-Capture-and-Wireshark|패킷 캡처와 Wireshark]]
- [[Network-Security-Lab-Interpretation|네트워크 보안 실습의 전제와 해석]]
