---
tags: [observability, logging, sampling, cost, tracing, head-tail-sampling]
status: done
verified_at: 2026-10-14
category: "관측가능성(Observability)"
aliases: ["Log Sampling", "로그 샘플링", "trace sampling", "head/tail sampling"]
---

# 로그 / 트레이스 샘플링 (Sampling)

샘플링은 로그나 추적의 일부를 선택해 수집, 전송과 저장 비용을 조절하는 방법이다. 에러와 느린 요청처럼 진단 가치가 높은 데이터를 우선할 수 있지만, 정책 설정만으로 누락 없는 보존이 보장되지는 않는다. 데이터량이 적거나 원문 보존이 필요한 경우에는 전량 보존도 비교한다. [[Long-Term-Retention]]

## 왜 필요한가

- 초당 수만 요청 × 요청당 수 KB 로그 = 일 테라바이트 → 적재/인덱싱/검색 비용 폭증. [[Log-Pipeline]]
- 정상 요청은 표본으로 분석할 수 있는지, 드문 오류와 감사 기록은 어느 범위까지 보존해야 하는지 먼저 구분한다.

## Head vs Tail 샘플링 (추적)

| 방식 | 결정 시점 | 장점 | 약점 |
|---|---|---|---|
| **Head-based** | trace 전체를 보기 전에 결정, 확률 방식이 대표적 | 가볍고 분산 친화적 | 나중에 발생할 에러와 지연으로 선택하기 어려움 |
| **Tail-based** | trace의 전체 또는 대부분 span을 모아 결정 | 에러/느린 trace를 골라 남김 | 상태 유지와 버퍼 자원, 운영 복잡도 필요 |

핵심: head는 싸지만 무엇이 중요할지 모르고, tail은 **결과를 보고 중요한 것만** 남긴다. [[OpenTelemetry]] Collector가 tail sampling을 지원한다.

## 실전 정책 — 가치 기반

- 정책 예: 수집기에 도달한 에러 trace는 전량 선택하고, 성공 trace는 1~10%를 선택한다. 비율은 트래픽과 진단 요구에 맞춰 조정한다.
- 정책 예: 느린 요청은 우선 보존하고 빠른 정상 요청은 샘플링한다. 지연 기준은 서비스별로 정한다.
- **신규 배포/특정 사용자/디버그 헤더**가 붙으면 동적으로 샘플률↑(dynamic sampling).
- 요청 단위 일관성: 같은 trace의 span이 일관된 선택을 따르게 한다. 부분 trace도 단서가 될 수 있지만 빠진 구간을 정상으로 해석하지 않는다.

## 전량 수집과 보존 보장을 구분한다

Head 단계에서 버린 trace를 뒤의 tail sampler가 복원할 수는 없다. 에러를 전량 선택하는 tail 정책은 그 단계에 도달한 데이터를 대상으로 한다. 수집기 과부하와 전달 실패까지 해결하는 보장은 아니다. 메모리, 큐와 전송 실패를 함께 확인한다.

전량 수집 기능도 애플리케이션 계측과 전달 설정을 전제로 한다. 예를 들어 Splunk APM의 full-fidelity tracing은 서비스가 보낸 trace를 샘플링 없이 받는 기능이며, Istio 연동 안내도 trace 전송과 sampling 설정을 별도로 요구한다. 제품 도입만으로 계측하지 않은 구간이나 상류에서 버린 trace가 생기지는 않는다.

다음은 이 구분에서 도출한 도입 점검 기준이다. 계측 범위, 상류 샘플링, 수집기 누락, 저장소의 보존 기간과 검색 가능 범위를 나누어 확인한다. 비용도 저장량 절감만 보지 않고 수집기의 계산 자원과 운영 비용을 합쳐 비교한다. 이 기준은 특정 제품의 장애 원인 분석 성공률을 보장하지 않는다.

## 로그 레벨 vs 샘플링

레벨 필터(DEBUG 끄기)는 거친 도구다. 샘플링은 **같은 레벨 안에서 양을 조절**한다. 둘을 함께 쓴다 — 평시 INFO 샘플 + 에러 전량, 장애 시 DEBUG 동적 상향.

## 흔한 함정

- 균일 확률 샘플 → 드문 에러가 통째로 버려짐(에러 편향 필요)
- trace를 span 단위로 샘플 → 끊긴 trace로 추적 불가
- 샘플률을 코드 하드코딩 → 장애 시 못 올림(동적 제어 필요)
- 샘플링 사실을 잊고 메트릭처럼 절대량 집계 → 수치 왜곡(샘플은 메트릭 아님, [[Logs-vs-Metrics]])
- 청구서 보고 나서야 100% 적재 중인 걸 발견

## 면접 체크포인트

- 샘플링이 필요한 이유(비용/카디널리티)와 가치 기반 선택
- head vs tail 샘플링의 트레이드오프, tail이 에러/지연을 잡는 이유
- 에러 우선 보존 정책이 상류에서 버린 trace를 복구하지 못하는 이유
- trace 단위 일관성과 부분 trace의 해석 한계
- 정량 집계는 샘플 로그가 아니라 메트릭으로 해야 하는 이유

## 출처

- [OpenTelemetry — Sampling (head/tail)](https://opentelemetry.io/docs/concepts/sampling/)
- [Honeycomb — Dynamic sampling guide](https://docs.honeycomb.io/manage-data-volume/sample/)
- [Splunk — Learn what you can do with Splunk APM](https://help.splunk.com/en/splunk-observability-cloud/monitor-application-performance/set-up-splunk-apm/learn-what-you-can-do-with-splunk-apm)
- [Splunk — Send traces from Istio to Splunk Observability Cloud](https://help.splunk.com/en/splunk-observability-cloud/manage-data/instrument-back-end-services/instrument-back-end-applications-to-send-spans-to-splunk-apm/send-spans-from-the-istio-service-mesh)

## 관련 문서

- [[OpenTelemetry|OpenTelemetry (head/tail 샘플링)]]
- [[Log-Pipeline|로그 파이프라인 (적재 비용)]]
- [[Long-Term-Retention|장기 보존]]
- [[Logs-vs-Metrics|로그 vs 메트릭 (집계는 메트릭으로)]]
- [[Structured-Logging|구조화 로깅]]
