---
tags: [observability, metrics]
status: index
category: "관측가능성(Observability)"
aliases: ["metrics", "메트릭"]
---

# 메트릭 (metrics 인덱스)

메트릭 수집(Prometheus), 측정 방법론(RED/USE), 카디널리티와 장기 보존, 측정 레이어 함정까지 메트릭 축 문서를 모은다.

## 문서
- [x] [[Prometheus|Prometheus (pull 모델, PromQL, Alertmanager, TSDB 한계)]]
- [x] [[Thanos|Thanos (장기 보존, 글로벌 뷰/HA, 다운샘플링)]]
- [x] [[Cardinality|카디널리티 관리 (라벨 폭발, 신호별 자리, route 템플릿화)]]
- [x] [[Long-Term-Retention|장기 보존 (hot/warm/cold, 다운샘플링, 보존 기준)]]
- [x] [[RED-USE-Method|RED / USE method (서비스 vs 자원, Saturation, 증상 vs 원인)]]
- [x] [[Metric-Layer-Mismatch|메트릭 측정 레이어의 함정 (CloudWatch vs node_exporter, iowait, 두 레이어 교차 알람)]]

## 관련 문서
- [[관측가능성(Observability)|카테고리 인덱스]]
- [[CloudWatch|AWS CloudWatch]]
- [[Logs-vs-Metrics|로그 vs 메트릭]]
