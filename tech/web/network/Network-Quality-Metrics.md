---
tags: [web, network, qos, qoe, latency, jitter, packet-loss, diffserv, intserv, aqm]
status: done
verified_at: 2026-11-15
category: "Web - 네트워크"
aliases: ["Network Quality Metrics", "네트워크 품질 지표", "대역폭, 지연, 지터, 패킷 손실", "QoE", "체감 품질", "망 성능과 QoS, QoE"]
---

# 네트워크 품질 지표: 용량, 지연, 지연 변동, 패킷 손실

## 정의

네트워크 경로의 전달 품질을 처음 나눠 볼 때 흔히 쓰는 묶음은 네 가지다. 얼마나 많이 보낼 수 있는가(용량), 얼마나 늦게 도착하는가(지연), 도착 시간이 얼마나 흔들리는가(지연 변동, 흔히 지터), 얼마나 도착하지 않는가(손실)다. 네 지표는 서로 독립적이지 않지만 원인과 대응이 달라서 따로 측정한다. IETF IPPM의 지표는 이보다 많아서 패킷 순서 바뀜과 중복 같은 지표도 따로 정의한다.

IETF IPPM 작업 그룹의 RFC는 각 지표를 측정 가능한 형태로 정의한다. 아래 정의는 그 RFC 기준이며 일상 용어와 다를 수 있다. 표의 체감 증상은 이해를 돕는 예시이며 RFC가 정의한 대응 관계가 아니다.

## 네 지표

| 지표 | 정의(RFC 기준) | 체감 증상의 예 |
| --- | --- | --- |
| 용량(capacity) | 혼잡이 없을 때 IP 계층에서 일정 구간 동안 정상 수신할 수 있는 최대 비트 수를 구간 길이로 나눈 값. 경로 용량은 경로에서 가장 작은 링크의 용량이다(RFC 5136) | 스트리밍 화질이 낮아지거나 대용량 전송이 느리다 |
| 단방향 지연(one-way delay) | 송신 측이 패킷의 첫 비트를 보낸 시각부터 수신 측이 마지막 비트를 받은 시각까지의 시간. 대기 시간 Tmax 안에 받지 못하면 값이 정의되지 않는다(RFC 7679) | 실시간 게임의 조작 반응이 늦다 |
| 지연 변동(delay variation) | 같은 흐름의 패킷 사이에서 단방향 지연이 달라지는 정도. 기준을 무엇으로 잡느냐에 따라 IPDV와 PDV로 나뉜다(RFC 5481) | 음성과 영상이 끊기거나 어긋난다 |
| 패킷 손실(packet loss) | 대기 시간 Tmax 안에 수신 측이 받지 못한 패킷. 단방향 지연이 정의되지 않은 경우와 정확히 같다(RFC 7680) | 음성이 씹히거나 화면이 깨진다 |

### 대역폭과 용량, 처리량은 다른 값이다

- RFC 5136은 bandwidth라는 말이 여러 뜻으로 쓰인다고 보고, 그보다 덜 중의적인 capacity를 적절한 용어로 쓴다.
- 물리 링크의 명목 용량은 IP 계층 용량의 상한일 뿐이다. 헤더와 링크 계층 오버헤드가 있으므로 IP 계층 용량은 그보다 작다.
- 가용 용량은 용량에서 다른 트래픽이 쓰고 있는 몫을 뺀 값(용량 × (1 - 사용률))이고, 경로의 가용 용량은 링크별 가용 용량 중 최솟값이다.
- 애플리케이션이 실제로 얻는 처리량은 TCP 혼잡 제어, 재전송과 헤더를 거친 결과다. RFC 5136은 전송 계층의 Bulk Transfer Capacity가 자신의 용량 정의와 대응하지 않는다고 명시한다. 회선 속도나 속도 측정값을 경로 용량과 같은 값으로 읽지 않는다. 측정 방법의 차이는 [[EC2-Network-Access|EC2 인스턴스 간 처리량 측정]]의 단일 연결과 병렬 연결 비교에서도 드러난다.

### 손실과 지연은 대기 시간 Tmax로 갈린다

아주 늦게 도착한 패킷을 지연으로 볼지 손실로 볼지는 측정자가 정한 대기 시간 Tmax가 정한다. 두 RFC 모두 Tmax(또는 큰 지연과 손실을 구분한 방법)를 보고하라고 요구한다(MUST). 같은 경로라도 두 기준 사이에 도착하는 패킷이 있으면 Tmax에 따라 손실률이 달라질 수 있으므로, 손실률을 비교할 때는 Tmax와 측정 구간을 함께 맞춘다.

실시간 미디어에서는 재생 시점을 넘겨 도착한 패킷도 쓸 수 없으므로 애플리케이션 입장에서는 손실과 같다. 이것은 애플리케이션 관점의 해석이며, 네트워크 측정에서 정의한 손실과는 구분한다.

### 지연 변동: IPDV와 PDV

RFC 5481은 지터라는 말이 패킷 전달 성능보다 넓은 뜻으로 쓰여 지연 변동(delay variation)을 더 정확한 용어로 쓴다.

| 형태 | 계산 | 쓰임 |
| --- | --- | --- |
| IPDV(Inter-Packet Delay Variation) | 직전 패킷과의 지연 차이, D(i) - D(i-1) | 연속 패킷 간 변화를 본다. 부호가 있고 평균은 보통 0이다. 지연이 측정 중 서서히 변하거나 시계 주파수 오차가 있으면 0이 아니다 |
| PDV(Packet Delay Variation) | 측정 구간의 최소 지연과의 차이, D(i) - D(min) | 지연 분포 자체를 원점으로 옮긴 형태다. 디지터 버퍼의 크기를 정하는 데 쓴다 |

RFC 5481은 디지터 버퍼가 예상되는 지연 변동을 담을 만큼 커야 하며 그렇지 않으면 손실이 생긴다고 설명하고, PDV의 범위(최대 - 최소)나 99.9 백분위가 필요한 버퍼 크기와 밀접하다고 본다. 버퍼를 키우면 끊김은 줄지만 그만큼 재생 지연이 늘어나는 트레이드오프가 있다.

RTP 수신 보고의 interarrival jitter(RFC 3550 6.4.1)는 또 다른 값이다. 송신 타임스탬프 간격과 도착 시각 간격의 차이 D를 패킷마다 구하고 `J(i) = J(i-1) + (|D(i-1,i)| - J(i-1)) / 16`으로 지수 평활한 평균 편차다. 단위는 RTP 타임스탬프 단위다. 따라서 초로 바꾸려면 미디어 클록 속도(Hz)로 나누고, 밀리초는 여기에 1000을 곱한다(예: 8000Hz에서 80단위는 10ms). 이 환산은 정의에서 도출한 계산이다. 서로 다른 도구가 보고하는 지터 수치는 정의부터 확인한 뒤 비교한다.

## 왕복 지연과 ping

`ping`이 보여 주는 값은 왕복 지연(RTT)이며 단방향 지연이 아니다. 왕복에는 상대 호스트의 응답 처리 시간이 섞이고, 가는 경로와 오는 경로가 다를 수 있다. 단방향 지연은 양 끝의 시계 동기 오차가 측정값에 그대로 더해지므로 시계 동기 상태를 함께 기록한다. ICMP 응답 해석의 한계는 [[ICMP]]에서 다룬다.

## QoS: 중요한 트래픽을 먼저 보낸다

용량이 부족한 구간에서 모든 트래픽을 똑같이 다루면 대용량 전송이 큐를 채워 음성과 화상회의 패킷의 지연과 지연 변동, 손실을 함께 키운다. DiffServ는 IP 헤더의 DSCP 값으로 트래픽을 분류하고, 각 장비가 클래스마다 다른 전달 처리(PHB)를 적용하게 한다.

RFC 4594의 권장 구성 예는 다음과 같다.

| 서비스 클래스 | 권장 PHB | 요구 특성 |
| --- | --- | --- |
| Telephony(음성) | EF(Expedited Forwarding, DSCP 46) | 일정 속도이며 지연 변동이 매우 작아야 한다. 손실, 지연, 지터 허용이 모두 매우 낮다 |
| Multimedia Conferencing(화상회의) | AF41, AF42, AF43 | 지연이 매우 작아야 하며 부호화 속도를 바꿀 수 있다(rate adaptive) |

RFC 4594는 정보성 문서이며 구성 지침이다. 이후 RFC 5865가 수락 제어를 거친 음성용 Admitted Telephony 클래스(VOICE-ADMIT, DSCP 44)를 EF와 나란히 더했고, RFC 8622가 저우선 데이터 클래스를 LE PHB로 바꿨다. 위 표의 두 행은 그대로다. 망 사업자와 조직마다 DSCP 매핑과 신뢰 경계가 다르므로, 표시한 DSCP가 다른 망에서도 같은 처리를 받는다고 가정하지 않는다. QoS는 용량을 늘리는 기술이 아니라 혼잡할 때 무엇을 먼저 보내고 무엇을 버릴지 정하는 기술이다.

### 보장 모델: IntServ와 DiffServ

| 모델 | 방식 | 확장성 |
| --- | --- | --- |
| IntServ(RFC 1633) | 흐름마다 자원을 예약한다. 라우터는 packet scheduler, classifier, admission control과 예약 설정 프로토콜을 갖추고 흐름별 상태를 유지한다. 예약 설정은 RSVP(RFC 2205)가 맡으며, 수신 측이 예약을 시작하고 주기적 갱신이 없으면 상태가 만료되는 soft state다 | 노드의 상태가 동시 예약 수에 비례해 늘어 큰 망에서 부담이 된다(RFC 2475, RFC 2998) |
| DiffServ(RFC 2475, RFC 2474) | 복잡한 분류와 조절(측정, 표시, shaping, 폐기)은 경계 노드나 호스트에만 두면 되고, 안쪽 노드는 DSCP별 PHB를 적용하며 재표시 같은 제한된 조절을 할 수 있다(더 복잡한 조절을 하는 안쪽 노드는 경계 노드에 준한다). DS 필드는 IPv4 TOS 옥텟과 IPv6 Traffic Class 옥텟을 대체하며 그중 6비트가 DSCP다 | 코어에 흐름별 상태가 없어 확장된다 |

RFC 2998은 IntServ를 종단 간으로 적용하면서 중간의 DiffServ 영역을 IntServ 라우터 사이의 가상 링크로 다루는 연동 틀을 정의한다. 기준 구성은 가운데에 DiffServ 영역, 양쪽에 IntServ 영역을 두지만 어느 영역을 DiffServ로 둘지는 망 관리자가 정한다.

MPLS(RFC 3031)는 진입 라우터가 패킷의 FEC를 한 번 정하고 이후 라우터는 헤더를 다시 분석하지 않고 레이블로만 전달한다. RFC 3031이 드는 이점은 헤더를 충분한 속도로 분석하지 못하는 스위치도 전달할 수 있다는 점, 진입점 정보로 FEC를 정하는 점과 source routing 없는 명시 경로다. 레이블 전달이 그 자체로 더 빠르다고 단정하지 않는다. DiffServ와 결합할 때는(RFC 3270) EXP 필드(RFC 5462 이후 TC 필드)로 PHB를 고르는 E-LSP나, 레이블 값으로 PSC(PHB Scheduling Class)를 정하고 EXP로 폐기 우선순위를 싣는 L-LSP를 쓴다.

### 혼잡 지점의 수단

- **스케줄링:** FIFO, 우선순위 큐, WFQ, DRR 같은 스케줄러가 어느 큐에서 다음 패킷을 보낼지 정해 클래스별 지연과 대역폭 몫을 나눈다.
- **능동 큐 관리(AQM):** 큐가 찬 뒤에야 버리는 tail drop은 큐를 오래 가득 찬 상태로 두고 소수 흐름이 큐를 독점하게 한다(RFC 7567). RED는 평균 큐 길이로 혼잡의 시작을 감지해 그 값에 따른 확률로 도착 패킷을 버리거나 표시한다. RFC 7567(RFC 2309 대체)은 AQM 배치를 강하게 권하고 ECN 표시 지원을 권하지만, RED를 포함한 특정 알고리즘을 기본으로 권하지 않는다. 같은 RFC는 RED가 매개변수 조정이 어려워 기본으로 켜지지 않았다고 설명한다.
- **트래픽 컨디셔닝(traffic conditioning):** RFC 2475에서 classifier가 헤더(DSCP만 보는 BA, 주소, 포트, 프로토콜 등 여러 필드를 보는 MF)로 패킷을 골라 traffic conditioner로 보내면, meter가 traffic profile에 비춰 in-profile과 out-of-profile을 판정하고, marker가 DSCP를 붙이거나 바꾸며(re-mark), shaper나 dropper가 흐름을 profile에 맞춘다. Conditioner의 네 요소(meter, marker, shaper, dropper)를 모두 둘 필요는 없고 보통 DS 경계 노드에 둔다. 컨디셔닝은 TCA에 정한 profile을 경계에서 집행하는 것이라, meter가 속도와 버스트로 판정하는 한 그 노드가 혼잡하지 않아도 적용된다(정의에서 나온 해석). Out-of-profile 패킷은 shaping, policing, 새 codepoint로 re-mark(전달 성능이 더 낮은 behavior aggregate로 보낼 수 있다), 그대로 전달하면서 accounting 절차를 일으키는 처리를 할 수 있다.
- **Shaping과 policing:** shaping은 패킷을 지연시켜 profile에 맞추며 보통 유한 버퍼를 쓰므로 버퍼가 차면 폐기도 생긴다. Policing은 dropper가 profile을 넘는 패킷을 폐기하는 처리이고, 버퍼가 0(또는 몇 개)인 shaper로 볼 수 있다. Shaping은 손실을 줄이는 대신 지연과 지연 변동을 더하고 policing은 지연을 더하지 않는 대신 초과분을 잃는다는 차이는 정의에서 나온 해석이다. RFC 4594(정보성)는 신뢰할 수 없는 출처의 Telephony 흐름을 DiffServ 망 진입점에서 단일 속도 토큰 버킷 policer로 policing하라고 권한다.
- **측정과 표시(metering, marking):** 토큰 버킷은 정해진 속도로 토큰을 채우고 버킷 깊이만큼의 버스트를 허용한다. srTCM(RFC 2697)은 같은 속도 CIR을 공유하는 두 버킷(깊이 CBS, EBS)으로 패킷을 CBS 안이면 green, EBS 안이면 yellow, 그 밖이면 red로 표시하며, AF PHB에서는 이 색을 폐기 우선순위로 쓸 수 있다.

## 망 성능, QoS, QoE

품질을 말할 때 망 성능, QoS, QoE 세 용어를 구분해 쓴다. E.800에서 망 성능은 QoS의 구성 요소이고, QoE는 P.10/G.100이 따로 정의한다. 위의 네 지표는 대부분 망 성능에 속한다.

| 용어 | ITU-T 정의와 범위 | 측정 대상의 예 |
| --- | --- | --- |
| 망 성능(NP, network performance) | E.800 3.2절이 망 관련 용어로 묶은 성능이다. 종단 간 IP 망 성능은 단방향 종단 간 IP 서비스에 대해 측정한다(3.2.18, Y.1540 인용) | 비트 오류율, 지연, 연결 수립 실패 확률. VoIP의 전송 성능은 지연, 지터와 패킷 손실로 나타낸다(3.2.12) |
| QoS(quality of service) | 통신 서비스가 사용자의 명시적, 암묵적 요구를 충족하는 능력에 관한 특성의 총체(E.800 2.2, P.10/G.100 6.212). 망 성능과 망 외 성능을 함께 포함한다(E.800 1.2) | 망 성능에 더해 개통 시간, 수리 시간, 요금 범위, 불만 처리 시간 |
| QoE(quality of experience) | 애플리케이션이나 서비스 사용자가 느끼는 기쁨이나 짜증의 정도(P.10/G.100 6.209). 연구가 진행 중이라 바뀔 수 있는 작업 정의다 | 측정이나 추정 결과(스칼라 값, 다차원 표현이나 언어 서술)와 그때 포함한 영향 요인(6.211). E.800은 고객이 경험한 QoS(QoSE)를 의견 점수로 나타낼 수 있다고 본다(2.6) |

- **QoS의 두 쓰임**: E.800의 QoS는 망 외 성능까지 담은 사용자 지향 개념이다. 네트워크 공학에서는 위 QoS 절의 DiffServ처럼 트래픽을 차등 처리하는 기술을 QoS라고 부르는 일이 많고, 지터와 손실 같은 기술 지표를 QoS 지표라고 부르기도 한다. E.800 기준으로 이 지표들은 망 성능에 속하므로 대화에서 어느 뜻인지 먼저 맞춘다.
- **E.800의 네 관점**: 고객의 QoS 요구(QoSR), 제공자가 계획해 제시한 QoS(QoSO), 제공자가 실제로 달성한 QoS(QoSD), 고객이 경험했다고 믿는 QoS(QoSE)로 나눈다. QoSE는 전달된 QoS와 사용자 인식에 영향을 주는 심리 요인에 좌우되며, 종단 간 시스템이 영향을 주는 정량 요소와 기대, 주변 조건, 심리 요인, 애플리케이션 맥락이 영향을 주는 정성 요소가 있다(E.800 1.2, 2.6). E.800은 QoSE를 이해하는 것이 제공자의 수익과 자원 최적화에 가장 중요하다고 본다.
- **QoE 영향 요인과 평가**: 애플리케이션이나 서비스의 유형과 특성, 사용 맥락, 사용자의 기대와 그 충족, 문화적 배경, 사회경제적 요인, 심리 특성과 감정 상태 등이 있고 연구에 따라 더 늘 수 있다(6.210). QoE 평가는 결과와 함께 어떤 영향 요인을 포함했는지 기술해야 한다(6.211).
- **적용(설계 판단)**: 망 성능 지표가 좋다고 QoE도 좋다고 결론 내리지 않는다. 평균 손실률이 낮아도 사용자가 몰입한 순간의 재생 멈춤은 평균에 묻힐 수 있으므로 재생 시작 지연, 버퍼링, 화질 전환 같은 애플리케이션 이벤트를 따로 모은다. 스트리밍의 이벤트 수집은 [[Video-Streaming-System-Design|주문형 비디오 스트리밍 설계]]에서 다룬다.

QoE 정의는 P.10/G.100 2017년판 기준이다. 2019, 2024 개정의 요약은 새 정의와 참고문헌 추가만 밝히며, 개정 본문이 이 정의를 바꿨는지는 확인하지 않았다.

## 진단 체크포인트

- 증상을 지표로 옮긴다(경험적 출발점이며 RFC 정의는 아니다): 화질 저하는 가용 용량, 반응 지연은 지연, 음성 끊김은 지연 변동과 손실부터 의심한다. 다만 한 원인이 여러 지표로 나타난다. 혼잡한 큐는 지연, 지연 변동과 손실을 함께 올린다.
- 평균만 보지 않는다. 지연과 지연 변동은 분포의 높은 백분위가 체감 품질을 좌우한다.
- 지터나 손실률 수치는 정의(IPDV, PDV, RTP interarrival jitter), Tmax와 측정 구간을 확인한 뒤 비교한다.
- 능동 probe로 경로를 측정하는 방법은 [[Network-Synthetic-Monitoring|네트워크 합성 모니터링]], TCP의 손실 복구와 혼잡 제어는 [[TCP]], 실시간 통신 방식별 특성은 [[Realtime-Communication-Comparison|실시간 통신 비교]]를 참고한다.

## 출처

- [RFC 5136, Defining Network Capacity](https://www.rfc-editor.org/rfc/rfc5136)
- [RFC 7679, A One-Way Delay Metric for IP Performance Metrics (IPPM)](https://www.rfc-editor.org/rfc/rfc7679)
- [RFC 7680, A One-Way Loss Metric for IP Performance Metrics (IPPM)](https://www.rfc-editor.org/rfc/rfc7680)
- [RFC 5481, Packet Delay Variation Applicability Statement](https://www.rfc-editor.org/rfc/rfc5481)
- [RFC 3550, RTP: A Transport Protocol for Real-Time Applications](https://www.rfc-editor.org/rfc/rfc3550)
- [RFC 4594, Configuration Guidelines for DiffServ Service Classes](https://www.rfc-editor.org/rfc/rfc4594)
- [RFC 5865, A Differentiated Services Code Point (DSCP) for Capacity-Admitted Traffic](https://www.rfc-editor.org/rfc/rfc5865)
- [RFC 8622, A Lower-Effort Per-Hop Behavior (LE PHB) for Differentiated Services](https://www.rfc-editor.org/rfc/rfc8622)
- [RFC 1633, Integrated Services in the Internet Architecture: an Overview](https://www.rfc-editor.org/rfc/rfc1633)
- [RFC 2205, Resource ReSerVation Protocol (RSVP) -- Version 1 Functional Specification](https://www.rfc-editor.org/rfc/rfc2205)
- [RFC 2475, An Architecture for Differentiated Services](https://www.rfc-editor.org/rfc/rfc2475)
- [RFC 2474, Definition of the Differentiated Services Field (DS Field) in the IPv4 and IPv6 Headers](https://www.rfc-editor.org/rfc/rfc2474)
- [RFC 2998, A Framework for Integrated Services Operation over Diffserv Networks](https://www.rfc-editor.org/rfc/rfc2998)
- [RFC 3031, Multiprotocol Label Switching Architecture](https://www.rfc-editor.org/rfc/rfc3031)
- [RFC 3270, Multi-Protocol Label Switching (MPLS) Support of Differentiated Services](https://www.rfc-editor.org/rfc/rfc3270)
- [RFC 5462, Multiprotocol Label Switching (MPLS) Label Stack Entry: "EXP" Field Renamed to "Traffic Class" Field](https://www.rfc-editor.org/rfc/rfc5462)
- [RFC 7567, IETF Recommendations Regarding Active Queue Management](https://www.rfc-editor.org/rfc/rfc7567)
- [RFC 2697, A Single Rate Three Color Marker](https://www.rfc-editor.org/rfc/rfc2697)
- [ITU-T E.800, Definitions of terms related to quality of service](https://www.itu.int/rec/T-REC-E.800-200809-I/en) — 09/2008. 1.2절, 2.2절, 2.6절, 3.2절
- [ITU-T P.10/G.100, Vocabulary for performance, quality of service and quality of experience](https://www.itu.int/rec/T-REC-P.10-201711-I/en) — 11/2017. 6.209~6.212
- [Random Early Detection Gateways for Congestion Avoidance — IEEE/ACM Transactions on Networking, Sally Floyd, Van Jacobson](http://www.icir.org/floyd/abstracts.html)
- [#NW 0022 - 영상통화가 끊기지 않는 비결? 90초 QoS 완전정리! — 길리랩 - 실전 구현 랩](https://www.youtube.com/watch?v=4B-yV6ZNCoo)
- [#NW 0025 - 같은 인터넷인데 왜 끊길까? 90초 QoE 완전정리 (NP, QoS, QoE) — 길리랩 - 실전 구현 랩](https://www.youtube.com/watch?v=89j32Df7jAw)
- [#NW 0010 - 영상통화가 끊기는 진짜 이유! 네트워크 품질 4대 지표 90초 완전정리 — 길리랩 - 실전 구현 랩](https://www.youtube.com/watch?v=PSICrXrp1OY)

## 관련 문서

- [[네트워크(Network)|네트워크 인덱스]]
- [[Network-Synthetic-Monitoring|네트워크 합성 모니터링]]
- [[Retry-Backoff-Jitter|재시도, 백오프와 지터]] — 재시도 간격의 무작위화를 뜻하는 다른 의미의 지터
- [[Latency-Optimization|지연 최적화]]
- [[Video-Streaming-System-Design|주문형 비디오 스트리밍 설계]] — 재생 이벤트로 체감 품질을 집계하는 경로
