---
tags: [observability, metrics, red-method, use-method, monitoring, sre]
status: done
category: "관측가능성(Observability)"
aliases: ["RED USE Method", "RED / USE method", "RED 메서드", "USE 메서드", "RED USE"]
---

# RED / USE Method

"무엇을 모니터링할 것인가"에 대한 두 가지 표준 답. 메트릭을 무작정 늘리는 대신 **서비스는 RED, 자원은 USE** 세 가지씩만 봐도 대부분의 문제를 잡는다. 메트릭 선택의 프레임이다. [[Logs-vs-Metrics]]

## RED — 요청 기반 서비스 관점

사용자 대면 서비스(API, 마이크로서비스)는 **요청의 건강**을 본다.

- **Rate** — 초당 요청 수(처리량). 트래픽이 어떻게 흐르는지.
- **Errors** — 실패한 요청의 비율/수. 5xx, 타임아웃, 비즈니스 실패.
- **Duration** — 요청 처리 시간 분포. 평균이 아니라 **P95/P99**로 본다(꼬리 지연). [[Application-Performance-Monitoring]]

이 셋은 곧 사용자 경험이라 **SLI로 바로 연결**된다. 가용성 SLI = 1 − Errors, 지연 SLI = Duration 임계 이하 비율. [[SLI-SLO]]

## USE — 자원 기반 인프라 관점

CPU, 메모리, 디스크, 네트워크, 커넥션 풀 같은 **자원**은 다르게 본다.

- **Utilization** — 자원이 일하는 시간 비율(예: CPU 70%).
- **Saturation** — 자원이 처리 못 해 **대기 중인 정도**(런큐 길이, 디스크 큐, 커넥션 풀 대기). 보통 포화가 이용률보다 먼저 아프다.
- **Errors** — 자원 수준 에러(패킷 드롭, 디스크 오류, 풀 고갈로 인한 거절).

핵심 통찰: **이용률 80%여도 포화가 0이면 건강**하고, 이용률 50%여도 포화가 쌓이면 병목이다. 평균 이용률만 보면 큐가 차는 걸 놓친다. [[Connection-Pool]]

## 언제 무엇을 쓰나

| 대상 | 메서드 | 예 |
|---|---|---|
| 요청 처리 서비스 | RED | API 서버, gRPC, 웹 |
| 자원/인프라 | USE | CPU, 메모리, 디스크, 큐, 커넥션 풀 |

둘은 배타적이지 않고 **층을 이룬다**. RED로 "사용자가 느리다"를 감지하고, USE로 "어느 자원이 포화라서"를 파고든다. RED는 증상, USE는 원인 쪽에 가깝다.

## 흔한 함정

- Duration을 평균으로만 봄 → 꼬리 지연(P99)이 평균에 묻힘
- 이용률만 보고 포화를 안 봄 → 큐가 차는 병목을 놓침
- 자원에 RED를, 서비스에 USE를 억지 적용 → 엉뚱한 지표
- 메트릭을 세 가지로 줄이지 않고 수백 개 대시보드 → [[Alert-Fatigue|알람 피로]]
- 측정 레이어 혼동 → 같은 자원이 다른 값([[Metric-Layer-Mismatch]])

## 면접 체크포인트

- RED(Rate/Errors/Duration)와 USE(Utilization/Saturation/Errors)의 대상 차이
- Saturation이 Utilization보다 먼저 아픈 이유, 평균 이용률의 함정
- RED가 SLI로 바로 이어지는 구조(가용성/지연)
- RED=증상, USE=원인으로 층을 이뤄 파고드는 디버깅 흐름
- Duration을 P95/P99로 봐야 하는 이유

## 출처

- [Tom Wilkie — The RED Method](https://www.weave.works/blog/the-red-method-key-metrics-for-microservices-architecture/)
- [Brendan Gregg — The USE Method](https://www.brendangregg.com/usemethod.html)

## 관련 문서

- [[Application-Performance-Monitoring|APM (P95/P99, RED/USE 적용)]]
- [[SLI-SLO|SLI/SLO (RED로 SLI 고르기)]]
- [[Logs-vs-Metrics|로그 vs 메트릭 vs 추적]]
- [[Metric-Layer-Mismatch|메트릭 측정 레이어의 함정]]
- [[Ops-Level-Indicator|운영 레벨 지표]]
