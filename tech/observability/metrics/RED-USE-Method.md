---
tags: [observability, metrics, red-method, use-method, monitoring, sre]
status: done
verified_at: 2026-10-15
category: "관측가능성(Observability)"
aliases: ["RED USE Method", "RED / USE method", "RED 메서드", "USE 메서드", "RED USE"]
---

# RED / USE Method

서비스 요청에는 RED, 자원에는 USE를 적용해 조사할 지표를 고른다. 두 방법은 성능 조사의 출발점이며 모든 문제를 설명하는 완결된 진단법은 아니다. [[Logs-vs-Metrics]]

## RED — 요청 기반 서비스 관점

사용자 대면 서비스(API, 마이크로서비스)는 **요청의 건강**을 본다.

- **Rate** — 초당 요청 수(처리량). 트래픽이 어떻게 흐르는지.
- **Errors** — 실패한 요청의 비율/수. 5xx, 타임아웃, 비즈니스 실패.
- **Duration** — 요청 처리 시간 분포. 평균이 아니라 **P95/P99**로 본다(꼬리 지연). [[Application-Performance-Monitoring]]

이 셋은 곧 사용자 경험이라 **SLI로 바로 연결**된다. 가용성 SLI = 1 − Errors, 지연 SLI = Duration 임계 이하 비율. [[SLI-SLO]]

## USE — 자원 기반 인프라 관점

CPU, 메모리, 디스크, 네트워크, 커넥션 풀 같은 **자원**은 다르게 본다.

- **Utilization** — 자원이 일하는 시간 비율 또는 전체 용량 중 사용 중인 비율. CPU 실행 시간과 메모리 점유량처럼 자원에 따라 정의가 다르다.
- **Saturation** — 자원이 처리하지 못한 추가 작업의 정도. 대기열 길이나 대기 시간으로 관측할 수 있다.
- **Errors** — 자원 수준 에러(패킷 드롭, 디스크 오류, 풀 고갈로 인한 거절).

긴 구간의 평균 이용률이 낮아도 짧은 부하 급증과 대기는 숨을 수 있다. 이용률과 포화에 오류, 요청 지연을 함께 대조하며 특정 이용률 하나를 정상 기준으로 삼지 않는다. [[Connection-Pool]]

### GPU 이용률과 유효한 작업량

2026-10-15 NVIDIA 문서 대조 기준. `nvidia-smi`의 GPU utilization은 표본 구간 중 하나 이상의 커널이 실행된 시간 비율이다. GPU의 모든 연산 자원이 효율적으로 쓰였다는 비율이 아니다. Memory utilization은 전역 장치 메모리를 읽거나 쓴 시간 비율이며, 할당된 메모리 용량과도 다르다.

따라서 GPU utilization 100%만으로 학습 처리량이 최적이라고 판단하지 않는다. 메모리를 할당했다는 사실만으로 이 지표가 100%가 된다고 설명해서도 안 된다. USE의 saturation 역시 유효 연산량 자체가 아니라 처리하지 못한 추가 작업을 뜻한다.

학습 작업을 조사할 때는 다음처럼 적용할 수 있다(운영 제안).

- 같은 모델, 배치와 입력 길이 조건에서 step 시간이나 처리 토큰 수를 GPU 지표와 함께 비교한다.
- GPU, 네트워크와 저장소를 각각 살피고, 대기와 오류를 측정하지 못했다면 0이 아니라 미확인으로 남긴다.
- 온도나 전력에 따른 클록 제한과 지원되는 오류 지표를 함께 본다. 높은 이용률과 낮은 처리량이 공존해도 원인을 커널 코드 하나로 단정하지 않는다.

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
- USE를 시스템 전체의 지표 세 개로 축소함 → 자원마다 세 관점을 확인하고 불필요한 경보는 별도로 줄인다. [[Alert-Fatigue|알람 피로]]
- 측정 레이어 혼동 → 같은 자원이 다른 값([[Metric-Layer-Mismatch]])

## 면접 체크포인트

- RED(Rate/Errors/Duration)와 USE(Utilization/Saturation/Errors)의 대상 차이
- 평균 이용률이 낮아도 포화가 생길 수 있는 이유와 집계 구간의 함정
- RED가 SLI로 바로 이어지는 구조(가용성/지연)
- RED=증상, USE=원인으로 층을 이뤄 파고드는 디버깅 흐름
- Duration을 P95/P99로 봐야 하는 이유

## 출처

- [The RED Method: How to Instrument Your Services — Grafana Labs, Tom Wilkie](https://grafana.com/blog/the-red-method-how-to-instrument-your-services/)
- [Brendan Gregg — The USE Method](https://www.brendangregg.com/usemethod.html)
- [NVIDIA, NVIDIA System Management Interface](https://docs.nvidia.com/deploy/nvidia-smi/index.html)

## 관련 문서

- [[Application-Performance-Monitoring|APM (P95/P99, RED/USE 적용)]]
- [[SLI-SLO|SLI/SLO (RED로 SLI 고르기)]]
- [[Logs-vs-Metrics|로그 vs 메트릭 vs 추적]]
- [[Metric-Layer-Mismatch|메트릭 측정 레이어의 함정]]
- [[Ops-Level-Indicator|운영 레벨 지표]]
- [[Monitoring-Graph-Reading|모니터링 그래프 해석 (수집한 신호를 읽는 법)]]
