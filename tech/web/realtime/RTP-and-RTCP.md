---
tags: [web, realtime, network, rtp, rtcp, webrtc, voip]
status: done
verified_at: 2026-11-15
category: "Web - 실시간"
aliases: ["RTP", "RTCP", "Real-time Transport Protocol", "실시간 전송 프로토콜"]
---

# RTP와 RTCP

RTP(Real-time Transport Protocol)는 오디오와 비디오처럼 실시간성이 필요한 데이터를 종단 간에 실어 나르는 패킷 형식과 규칙이다. 짝이 되는 RTCP(RTP Control Protocol)는 데이터를 싣지 않고 수신 품질과 참가자 정보를 주고받는다. 기준 규격은 RFC 3550이며 화상회의와 VoIP 같은 실시간 미디어 전송에 쓰인다. WebRTC는 RTP를 미디어 전송 프로토콜로 반드시 구현하도록 정한다(RFC 8834).

## Mental model

- RTP는 미디어 조각에 순서 번호, 타임스탬프와 출처 식별자를 붙인 봉투다. 언제 재생할지와 어느 스트림인지를 수신자가 복원할 수 있게 한다.
- RTP 자체는 전달을 보장하지 않는다. RFC 3550은 RTP가 적시 전달이나 서비스 품질을 보장하는 메커니즘이 없고 하위 계층에 의존하며, 전달 보장이나 순서 뒤바뀜 방지도 하지 않는다고 명시한다.
- RFC 3550은 응용이 UDP의 다중화와 체크섬을 쓰려고 보통 RTP를 UDP 위에서 돌린다고 설명한다. 일반적인 설계 이유를 더하면, 실시간 미디어는 늦게 온 조각의 가치가 낮아 재전송을 기다리는 TCP보다 손실을 감수하고 다음 조각을 재생하는 편이 통화 품질에 유리하다. 다른 전송 계층 위에서도 RTP를 쓸 수 있다.
- 손실 감지, 재정렬과 재생 시점 조정은 수신 측 jitter buffer와 코덱이 맡는다. RTP는 그 판단에 필요한 정보를 줄 뿐이다.

## 고정 헤더

모든 RTP 패킷에는 12바이트 고정 헤더가 있고, CSRC 목록은 mixer가 넣었을 때만 붙는다.

| 필드 | 크기 | 역할 |
| --- | --- | --- |
| V (version) | 2비트 | 버전, 현재 2 |
| P (padding) | 1비트 | 끝에 패딩 바이트가 있는지 |
| X (extension) | 1비트 | 헤더 확장이 뒤따르는지 |
| CC (CSRC count) | 4비트 | 뒤에 붙은 CSRC 개수(0~15) |
| M (marker) | 1비트 | 프로파일이 정하는 표시(예: 프레임 경계) |
| PT (payload type) | 7비트 | 페이로드 형식, 코덱 식별 |
| sequence number | 16비트 | 패킷마다 1 증가, 손실 감지와 순서 복원 |
| timestamp | 32비트 | 첫 바이트의 샘플링 시점 |
| SSRC | 32비트 | 동기화 출처 식별자 |
| CSRC 목록 | 32비트씩 0~15개 | 기여 출처 식별자 |

- 순서 번호와 타임스탬프의 초기값은 무작위(예측 불가)로 두라고 규격이 권고한다. 암호화된 스트림에 대한 known-plaintext 공격을 어렵게 하려는 목적이다.
- 타임스탬프는 벽시계 시간이 아니라 미디어 클록의 눈금이다. 클록 속도는 페이로드 형식이나 프로파일이 정하거나 SDP 같은 신호로 동적으로 정한다. 예를 들어 RTP 클록 속도가 8000Hz인 오디오(PCMU)를 20ms씩 담으면 패킷마다 160씩 증가한다(정의에서 도출한 계산). 클록 속도가 실제 샘플링 속도와 다른 형식도 있다(G.722는 16000Hz 샘플링, 8000Hz RTP 클록). 패킷 간격과 재생 간격은 계산할 수 있지만, 서로 다른 스트림의 타임스탬프를 바로 비교할 수는 없다.
- 순서 번호는 전송 순서를, 타임스탬프는 샘플링 시점을 나타내며 수신자는 이로부터 재생 시점을 정한다. 비디오 한 프레임을 여러 패킷으로 나누면 순서 번호는 패킷마다 다르고 타임스탬프는 같다.

## SSRC와 CSRC

- SSRC(synchronization source)는 무작위로 고른 32비트 값으로, 네트워크 주소에 의존하지 않고 한 RTP 세션 안에서 스트림의 출처를 구분한다. 충돌하면 규격의 충돌 해결 절차로 다시 고른다.
- 여러 참가자의 오디오를 섞는 mixer는 섞은 결과를 자기 SSRC로 내보내고, 섞인 원래 출처들의 SSRC를 CSRC(contributing source) 목록에 넣는다. 수신자는 이 목록으로 지금 말하는 사람을 표시할 수 있다. 목록은 최대 15개라 그 이상은 담지 못한다.
- mixer는 타이밍을 다시 만들기 때문에, 수신자는 mixer를 거친 원래 스트림끼리의 미디어 간 동기화를 할 수 없다.

## RTCP의 역할

- 수신 품질 피드백: 수신자 보고(RR)와 송신자 보고(SR)에 손실률, 누적 손실, 최고 순서 번호와 interarrival jitter를 담는다. 송신자는 이를 보고 비트레이트를 조절할 수 있다. jitter 계산식은 [[Network-Quality-Metrics|네트워크 품질 지표]]에 정리했다.
- 영구 식별자: SSRC는 충돌이나 재시작으로 바뀔 수 있으므로 CNAME으로 같은 참가자의 여러 스트림(예: 오디오와 비디오)을 묶는다.
- 미디어 간 동기화(lip sync): SR은 같은 순간의 NTP 형식 벽시계 시간과 RTP 타임스탬프를 함께 보낸다. 수신자는 오디오와 비디오 각각의 대응 관계로 두 스트림의 재생 시점을 맞춘다. 이 방법은 두 송신 측의 NTP 시각이 같은 기준으로 맞춰져 있을 때 쓸 수 있으며, 벽시계가 없는 송신자는 NTP 타임스탬프를 0으로 둘 수 있다.
- 전송량 제한: 참가자 수가 늘어도 RTCP가 대역폭을 잠식하지 않도록 보고 간격을 늘린다. 규격은 RTCP 대역폭을 세션 대역폭의 5%로 두고, 그 가운데 1/4을 송신자에게 배정하도록 권고한다. 송신자가 참가자의 1/4보다 많으면 송신자는 전체 RTCP 대역폭에서 자기 비율만큼을 쓴다.

## 포트와 다중화

- RFC 3550은 RTP에 짝수 포트, RTCP에 바로 다음 홀수 포트를 쓰도록 권고한다. RFC 3550의 기본 모델에서는 오디오와 비디오를 별도의 RTP 세션(별도 포트 쌍)으로 보낸다.
- RFC 5761은 유니캐스트에서 미리 신호(SDP의 `a=rtcp-mux`)로 합의하고 RTCP 패킷 유형과 겹치지 않는 payload type을 쓰면 RTP와 RTCP를 한 UDP 포트로 다중화할 수 있게 했다. Any Source Multicast에서는 다중화하지 않아야 한다(SHOULD NOT). 이 다중화는 한 RTP 세션의 데이터와 제어 패킷을 합치는 것이다.
- WebRTC 구현은 매체 종류와 관계없이 모든 RTP 스트림을 한 RTP 세션과 한 전송 흐름으로 보내는 방식도 지원해야 한다(RFC 8834). 따라서 매체별 별도 세션을 현재 구현의 기본값으로 단정하지 않는다.

## 운영과 면접 체크포인트

- RTP를 쓴다고 품질이 보장되지 않는다. 손실과 지연은 RTCP 보고로 관측하고, 대응은 jitter buffer 크기, 코덱의 손실 은닉, 비트레이트 조절이 맡는다.
- 통화 품질 문제를 볼 때 손실률, jitter, 왕복 지연을 RTCP 보고나 WebRTC 통계에서 구분해 확인한다. 순서 번호의 공백은 손실이나 재정렬을, 타임스탬프 대비 도착 시각의 흔들림은 jitter를 뜻한다.
- 중간 장비의 종류에 따라 식별자의 의미가 다르다. mixer는 자기 SSRC와 CSRC 목록을 내보내고, 선택 전달 장비(SFU)는 출처별 스트림을 그대로 전달하며 수신자마다 SSRC를 바꿔 쓸 수 있고 출처 표시에 CSRC 대신 다른 수단을 쓴다(RFC 7667). 수신 측에서 화자 표시와 동기화를 설계할 때 중간 장비의 역할을 먼저 확인한다.
- 면접 질문 예: RTP가 TCP가 아니라 UDP 위에서 주로 쓰이는 이유, 순서 번호와 타임스탬프가 따로 있는 이유, RTCP 없이 RTP만 쓰면 잃는 것.

## 출처

- [RFC 3550, RTP: A Transport Protocol for Real-Time Applications](https://www.rfc-editor.org/rfc/rfc3550)
- [RFC 5761, Multiplexing RTP Data and Control Packets on a Single Port](https://www.rfc-editor.org/rfc/rfc5761)
- [RFC 3551, RTP Profile for Audio and Video Conferences with Minimal Control](https://www.rfc-editor.org/rfc/rfc3551)
- [RFC 7667, RTP Topologies](https://www.rfc-editor.org/rfc/rfc7667)
- [RFC 8834, Media Transport and Use of RTP in WebRTC](https://www.rfc-editor.org/rfc/rfc8834)

## 관련 문서

- [[Realtime-Communication-Comparison|실시간 통신 기술 비교]]
- [[Network-Quality-Metrics|네트워크 품질 지표]]
- [[IPv4-NAT-and-Traversal|IPv4 NAT와 traversal]]
