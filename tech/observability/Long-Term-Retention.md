---
tags: [observability, retention, downsampling, storage-tiering, cost, logs, metrics]
status: done
category: "관측가능성(Observability)"
aliases: ["Long-Term Retention", "Long-term retention", "장기 보존", "보존 정책", "downsampling"]
---

# 장기 보존 (Long-Term Retention)

관측 데이터(메트릭, 로그, 추적)를 **얼마나 오래, 어떤 해상도로, 어디에** 보관할지의 정책. 전부 풀 해상도로 영구 보관하면 비용이 통제 불능이 되고, 너무 짧게 지우면 추세 분석/감사/사후 조사가 불가능해진다. **보존은 곧 비용과 가치의 트레이드오프**다. [[AWS-Cost-Optimization|FinOps]] 영역과 직접 맞닿는다.

## 데이터 가치는 시간에 따라 떨어진다

방금 발생한 데이터는 초 단위 해상도로 디버깅에 쓰지만, 6개월 전 데이터는 **추세선**이면 충분하다. 그래서 신선도에 따라 해상도와 저장 등급을 차등한다.

| 구간 | 해상도 | 저장 등급 | 용도 |
|---|---|---|---|
| **Hot** (최근 수일~수주) | 원본(초/분) | 빠른 디스크/SSD | 실시간 디버깅, 알람 |
| **Warm** (수주~수개월) | 다운샘플(5m/1h) | 객체 스토리지 | 추세, 용량 계획 |
| **Cold** (수개월~수년) | 집계/아카이브 | Glacier 등 아카이브 | 감사, 규정 준수 |

## 다운샘플링 — 해상도를 낮춰 보관

장기 질의에는 초 단위가 불필요하다. 5분/1시간 단위로 미리 집계(min/max/avg/count)해 두면 **저장량과 질의 비용이 급감**하면서 추세는 그대로 보인다. [[Thanos]]의 Compactor가 이를 자동화한다.

## 로그 보존 — 등급화 + 인덱싱 분리

- CloudWatch Logs 무한 보존은 안티패턴 → **30일 핫 + S3 아카이브**로 분리. [[Log-Pipeline]]
- S3로 내린 로그는 **Athena**로 필요할 때만 질의(저장은 싸고, 조회는 종량). [[AWS-Cost-Optimization]]
- 자주 검색하는 구간만 OpenSearch/ES에 인덱싱, 나머지는 S3 원본 보관 → 인덱싱 비용 절감.

## 보존 기간을 정하는 기준

- **규정/감사**: 개인정보, 금융 로그는 법정 보관 기간이 하한.
- **디버깅 창**: 보통 며칠~몇 주면 대부분의 사후 조사를 커버.
- **용량 계획**: 분기/연 추세는 다운샘플로 길게.
- **비용 상한**: 위 요구를 만족하는 최소 보존으로 수렴.

## 흔한 함정

- 전 데이터 풀 해상도 영구 보관 → 비용 폭발
- 다운샘플 없이 장기 질의 → 느리고 비쌈([[Thanos]] 미사용)
- 규정 보관 기간을 모른 채 일괄 삭제 → 컴플라이언스 위반
- 핫/콜드 분리 없이 비싼 인덱싱 스토어에 전부 적재
- 보존 정책을 코드/IaC가 아니라 수동 관리 → 드리프트

## 면접 체크포인트

- 데이터 가치의 시간 감쇠와 hot/warm/cold 등급화
- 다운샘플링이 추세를 유지하며 비용을 줄이는 원리
- 로그 핫(짧게) + S3 아카이브 + Athena 종량 질의 패턴
- 보존 기간을 정하는 기준(규정/디버깅/용량/비용)
- 메트릭 보존과 [[Cardinality|카디널리티]]가 함께 비용을 키우는 점

## 출처

- [Grafana Mimir — Configuring downsampling & retention](https://grafana.com/docs/mimir/latest/manage/run-production-environment/configuring-out-of-order-samples-ingestion/)
- [AWS — CloudWatch Logs retention & S3 export](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/Working-with-log-groups-and-streams.html)

## 관련 문서

- [[Thanos|Thanos (다운샘플링, 객체 스토리지)]]
- [[Log-Pipeline|로그 파이프라인 (S3 아카이브)]]
- [[Storage-Tiering|스토리지 티어링 (S3 클래스, Glacier)]]
- [[AWS-Cost-Optimization|AWS 비용 최적화 (로그 보존 절감)]]
- [[Cardinality|카디널리티 관리]]
