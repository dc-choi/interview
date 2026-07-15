---
tags: [observability, logging, sampling, cost, tracing, head-tail-sampling]
status: done
category: "관측가능성(Observability)"
aliases: ["Log Sampling", "로그 샘플링", "trace sampling", "head/tail sampling"]
---

# 로그 / 트레이스 샘플링 (Sampling)

고트래픽에서 **모든 로그와 추적을 100% 저장하면 비용과 카디널리티가 감당이 안 된다**. 샘플링은 일부만 남기되 **진단 가치가 높은 것(에러, 느린 요청)은 빠짐없이** 남기는 기술이다. 무작정 깎는 게 아니라 가치 기준으로 고른다. [[Long-Term-Retention]]

## 왜 필요한가

- 초당 수만 요청 × 요청당 수 KB 로그 = 일 테라바이트 → 적재/인덱싱/검색 비용 폭증. [[Log-Pipeline]]
- 정상 요청 로그는 대부분 같은 내용이라 **희소 표본으로 충분**하고, 비정상만 전부 필요하다.

## Head vs Tail 샘플링 (추적)

| 방식 | 결정 시점 | 장점 | 약점 |
|---|---|---|---|
| **Head-based** | 요청 **시작 때** 확률로 결정 | 가볍고 분산 친화적 | 시작 때라 그 요청이 에러/느릴지 아직 모름 |
| **Tail-based** | 요청 **완료 후** 전체를 보고 결정 | 에러/느린 trace를 골라 남김 | 모든 span을 잠시 버퍼링 → 메모리/복잡도↑ |

핵심: head는 싸지만 무엇이 중요할지 모르고, tail은 **결과를 보고 중요한 것만** 남긴다. [[OpenTelemetry]] Collector가 tail sampling을 지원한다.

## 실전 정책 — 가치 기반

- **에러는 100% 보존**, 성공은 1~10% 샘플(에러 편향 샘플링).
- **느린 요청(P99 초과)은 100%**, 빠른 정상은 샘플.
- **신규 배포/특정 사용자/디버그 헤더**가 붙으면 동적으로 샘플률↑(dynamic sampling).
- 요청 단위 일관성: 한 trace는 전부 남기거나 전부 버린다(부분 trace는 무의미).

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
- 에러 100% + 성공 샘플의 에러 편향 정책
- trace 단위 일관성(부분 trace 금지)
- 정량 집계는 샘플 로그가 아니라 메트릭으로 해야 하는 이유

## 출처

- [OpenTelemetry — Sampling (head/tail)](https://opentelemetry.io/docs/concepts/sampling/)
- [Honeycomb — Dynamic sampling guide](https://docs.honeycomb.io/manage-data-volume/sample/)

## 관련 문서

- [[OpenTelemetry|OpenTelemetry (head/tail 샘플링)]]
- [[Log-Pipeline|로그 파이프라인 (적재 비용)]]
- [[Long-Term-Retention|장기 보존]]
- [[Logs-vs-Metrics|로그 vs 메트릭 (집계는 메트릭으로)]]
- [[Structured-Logging|구조화 로깅]]
