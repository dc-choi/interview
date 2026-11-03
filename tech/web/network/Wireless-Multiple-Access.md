---
tags: [network, wireless, ofdma, mimo, link-adaptation]
status: done
verified_at: 2026-11-04
category: "Web - 네트워크"
aliases: ["Wireless Multiple Access", "무선 다중접속과 공간 다중화"]
---

# 무선 다중접속과 공간 다중화

여러 단말이 같은 무선망을 사용할 때는 주파수와 전송 시간을 나누고, 공간적으로 구분되는 신호를 함께 사용한다. OFDMA, MIMO와 링크 적응은 서로 다른 자원을 조절하는 기술이며, 이름만으로 동시 사용자 수나 끊김 없는 서비스를 보장하지 않는다.

## OFDMA는 주파수 자원을 사용자에게 배분한다

OFDM은 여러 부반송파를 사용하는 전송 방식이고, OFDMA는 부반송파 묶음을 여러 사용자에게 배분하는 다중접속 방식이다. Wi-Fi 6의 802.11ax에서는 이 묶음을 RU(Resource Unit)라고 하며, AP가 상향과 하향 전송에서 단말별 자원을 배분한다. 이는 802.11ax의 설명이며 이동통신의 자원 블록 규격과 같은 크기나 절차라는 뜻은 아니다.

한 단말이 채널을 사용하는 시간을 늘리는 것 외에 같은 전송 기회 안에서 주파수 몫을 다르게 배정할 수 있다. 다만 단말 밀도와 이웃 AP의 채널 사용이 늘면 경합과 간섭이 생기므로, OFDMA 지원을 무제한 동시 처리로 해석하지 않는다.

## MIMO에서는 다중화, 빔포밍과 다이버시티를 구분한다

MIMO는 송수신에 여러 안테나를 사용하는 구조다. 그 구조를 어떤 방식으로 쓰는지에 따라 얻는 효과가 다르다.

| 기법 | 하는 일 | 주로 개선하는 대상 |
|---|---|---|
| 공간 다중화 | 같은 시간과 주파수 자원에서 서로 다른 데이터 스트림을 보냄 | 수신기가 스트림을 구분할 수 있을 때 전송 용량 |
| 빔포밍 | 여러 안테나의 신호를 조합해 목표 수신 방향에 에너지를 집중 | 신호 품질과 링크 성능 |
| 공간 다이버시티 | 같은 정보에 부호화나 시간 차이를 적용해 여러 안테나 경로로 전달 | 수신 신뢰성 |

서로 다른 스트림을 한 사용자에게 보내는 SU-MIMO와 여러 사용자에게 나누는 MU-MIMO도 구분한다. 빔포밍을 적용했다는 사실만으로 독립 스트림 수가 늘었다고 판단하지 않는다. 안테나 수, 단말 능력과 채널 조건을 함께 확인한다.

## 링크 적응은 채널 상태에 맞게 전송 조건을 바꾼다

AMC(Adaptive Modulation and Coding)는 변조뿐 아니라 부호화율도 조절한다. MCS(Modulation and Coding Scheme)를 지나치게 공격적으로 고르면 오류와 재전송이 늘 수 있으므로, 채널 품질과 오류율 피드백을 함께 본다. 이동, 간섭과 피드백 오차 때문에 이전 관측이 다음 전송 상태와 같다고 보장할 수 없다.

HARQ(Hybrid Automatic Repeat Request)는 재전송과 오류 정정을 결합한다. 수신 측은 이전 수신 정보를 버리지 않고 재전송 정보와 결합해 복호를 시도할 수 있다. MathWorks의 DL-SCH decoder는 이를 위해 HARQ process마다 soft buffer를 유지한다. 이 동작을 TCP 재전송과 같은 계층의 기능으로 취급하지 않는다.

## 운영에서 확인할 것

다음은 위 원리를 적용한 측정 제안이다.

- 연결된 단말 수와 동시에 데이터를 보내는 단말 수를 나눈다.
- 단일 단말의 최고 속도와 혼잡 시 단말별 처리량, 지연과 재전송률을 따로 측정한다.
- 무선 구간이 좋아져도 AP 업링크나 서버가 병목인지 확인한다.
- OFDMA 배분, 공간 스트림과 MCS 변경을 구분해 어떤 조건에서 개선됐는지 기록한다.

검증 범위는 OFDMA, MIMO와 링크 적응의 역할 구분이다. 특정 장비의 성능이나 6G 지원 범위를 시험하지 않았다. 전력 제어의 구체적 정책과 안테나 이득의 정량값은 이 문서에서 확정하지 않는다.

## 출처

- [IEEE 802.11ax: The Sixth Generation of Wi-Fi White Paper — Cisco](https://www.cisco.com/c/en/us/products/collateral/wireless/white-paper-c11-740788.html)
- [MathWorks, MIMO Techniques](https://www.mathworks.com/help/comm/ug/multiple-input-multiple-output-mimo.html)
- [AI-Native Link Adaptation for Spectral Gains — Ericsson](https://www.ericsson.com/en/blog/2026/10/ai-native-link-adaptation-for-spectral-gains) — MCS 선택과 채널 피드백의 한계만 대조. AI 적용 성과 수치는 사용하지 않음
- [MathWorks, resetSoftBuffer](https://www.mathworks.com/help/5g/ref/nrdlschdecoder.resetsoftbuffer.html)

## 관련 문서

- [[WiFi-Sensing|Wi-Fi 센싱]]
- [[LAN-vs-WAN|LAN과 WAN]]
- [[TCP|TCP]]
