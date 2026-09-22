---
tags: [performance, scalability, waiting-room, redis, polling, websocket, ticketing]
status: index
category: "성능&확장성(Performance&Scalability)"
aliases: ["Virtual Waiting Room Architecture", "가상 대기열 아키텍처", "대규모 예매 대기열"]
---

# 가상 대기열 아키텍처

티켓 예매처럼 특정 시각에 요청이 몰리는 워크로드에서 대기, 입장, 예매를 서로 다른 용량 경계로 분리하는 설계를 세 문서로 나눠 정리한다.

- [[Virtual-Waiting-Room-Architecture-Queue-Registration|문제 정의와 대기 등록]]: 해결해야 할 문제, 3단계 구조, Redis Sorted Set 연산과 MQ의 역할 차이
- [[Virtual-Waiting-Room-Architecture-Admission-Reservation|입장 제어와 예매 처리]]: 입장률과 TTL, 원자적 좌석 선점, 자원 요구량이 다른 요청의 대기 정책
- [[Virtual-Waiting-Room-Architecture-Status-Communication-Operations|대기 상태 통신과 운영]]: Short Polling 응답과 서버 제어 간격, 무상태 Queue API, Polling과 WebSocket 비교, 도입 판단과 운영

## 함께 볼 문서

- [[Traffic-Workload-Patterns|대규모 트래픽 워크로드 패턴]]
