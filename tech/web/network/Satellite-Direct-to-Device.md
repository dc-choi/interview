---
tags: [network, satellite, ntn, lte]
status: done
verified_at: 2026-10-23
category: "Web - 네트워크"
aliases: ["위성 직접 연결", "Satellite Direct-to-Device", "D2D와 NTN"]
---

# 위성 직접 연결: 기존 LTE 방식과 NTN의 차이

Direct-to-Device(D2D)는 휴대 단말이 위성과 직접 통신하는 연결 방식이다. 지상 기지국이 닿지 않는 구역의 연결을 보완하지만, 연결 가능한 면적만으로 처리량과 실내 품질을 판단할 수는 없다.

## 두 가지 무선 접속 방식

| 구분 | 기존 LTE 단말 활용 | 3GPP NTN 지원 단말 활용 |
|---|---|---|
| 출발점 | 지상 LTE 무선 인터페이스를 위성 연결에 활용 | 비지상 환경에 맞춘 표준 기능 사용 |
| 단말 | 기존 단말 생태계를 활용할 수 있다 | 해당 NTN 기능을 지원하는 칩셋과 단말이 필요하다 |
| 지연과 도플러 | 단말을 바꾸지 않기 위해 네트워크 쪽 보상이 중요하다 | NR-NTN에서는 단말도 위치와 위성 궤도 정보를 이용해 보상에 참여한다 |

3GPP Release 17에는 NR-NTN과 IoT-NTN이 포함된다. 따라서 위성 이동통신을 6G에서 처음 등장할 기능으로 설명하지 않는다. 기존 LTE 호환 서비스와 NTN 표준 기능 지원도 같은 의미가 아니다.

## 궤도 변화와 간섭을 처리해야 한다

LEO 위성은 빠르게 움직여 전파 지연과 도플러 변화가 커진다. 기존 LTE 단말을 쓰는 방식은 빔의 기준점에 맞춰 보상하더라도 단말 위치에 따라 오차가 남을 수 있다. 지상 이동통신 대역을 함께 쓰면 인접 지상망과의 간섭 조정도 필요하다.

## 서비스 조건은 사업자별로 확인한다

2026-10-23 확인한 필리핀 Globe Starlink 안내는 지상 신호가 없는 야외에서 하늘이 보이는 환경을 전제로 한다. 지원 단말과 소프트웨어, SIM과 이용 상품 조건도 있다. 안내된 용도는 문자, 메시징과 지도 같은 기본 연결이며 영상 스트리밍, 대용량 다운로드와 게임은 지원 대상이 아니다.

이 사례의 제한을 모든 위성 서비스에 일반화하지 않는다. 다음 질문으로 실제 사용 조건을 확인한다.

- 사용 국가와 통신사의 서비스가 해당 단말을 지원하는가?
- 야외 연결과 실내 연결 중 무엇이 보장되는가?
- 문자, 지도, 음성, 영상 중 필요한 기능을 제공하는가?
- 지상망이 복구될 때 전환 방식과 잠깐의 끊김을 어떻게 처리하는가?

Globe는 지상 신호가 다시 잡히면 지상망으로 복귀한다고 안내한다. 이 동작만으로 모든 사업자의 끊김 없는 전환이나 같은 성능을 보장한다고 해석하지 않는다.

## 출처

- [Satellite direct-to-device communication: two approaches for 3GPP global connectivity — Ericsson](https://www.ericsson.com/en/reports-and-papers/ericsson-technology-review/articles/satellite-direct-to-device-communication)
- [Globe, Starlink Satellite-to-Mobile Service FAQs](https://www.globe.com.ph/help/starlink-satellite-to-mobile-service)

## 관련 문서

- [[LAN-vs-WAN|LAN과 WAN의 연결 범위]]
- [[TCP-Congestion-Control|TCP 혼잡 제어]]
