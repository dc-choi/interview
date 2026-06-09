---
tags: [observability, thanos, prometheus, long-term-storage, ha, metrics]
status: done
category: "관측가능성(Observability)"
aliases: ["Thanos", "타노스", "Prometheus 장기 보존", "global query"]
---

# Thanos

Prometheus의 두 약점, **장기 보존이 없고 단일 노드라 글로벌 뷰/HA가 없는 것**을 객체 스토리지 기반으로 메우는 시스템. 여러 Prometheus를 묶어 한 화면에서 보고, 오래된 데이터를 S3 같은 싼 저장소로 내린다. [[Prometheus]]

## 풀려는 문제

- **장기 보존**: 로컬 TSDB는 보통 수주만 보관. 분기/연 단위 추세를 못 본다.
- **글로벌 뷰**: 클러스터/리전마다 Prometheus가 따로라 통합 질의가 안 됨.
- **고가용성**: Prometheus를 이중화하면 같은 데이터가 둘 → 중복 제거 필요.

## 구성 요소

| 컴포넌트 | 역할 |
|---|---|
| **Sidecar** | 각 Prometheus 옆에 붙어 TSDB 블록을 **객체 스토리지(S3 등)로 업로드**하고, 실시간 질의를 중계 |
| **Store Gateway** | 객체 스토리지의 과거 블록을 질의 가능하게 노출 |
| **Querier** | 모든 Sidecar/Store에 부채살(fan-out) 질의 후 **중복 제거하고 병합** — 단일 PromQL 진입점 |
| **Compactor** | 블록을 압축하고 **다운샘플링**(5m, 1h 해상도 생성)으로 장기 질의를 가속/축소 |
| **Ruler** | 저장된 데이터에 대한 recording/alerting rule 평가 |

## 핵심 아이디어 두 가지

- **객체 스토리지 + 다운샘플링**: 원본은 S3에 두고, 오래된 구간은 해상도를 낮춰 보관. 1년 추세를 볼 때 초 단위가 필요 없으니 **싸고 빠르게** 본다. [[Long-Term-Retention]]
- **Querier 중복 제거**: HA로 띄운 Prometheus 쌍이 만든 중복 시계열을 질의 시점에 합쳐, 이중화하면서 그래프는 끊기지 않게.

대안: Grafana **Mimir**, **Cortex**, VictoriaMetrics도 같은 문제(장기 보존, 수평 확장)를 다른 방식으로 푼다. Prometheus `remote-write`로 이들에 직접 보내는 구성도 흔하다.

## 흔한 함정

- 다운샘플링을 안 켜서 장기 질의가 느리고 비쌈
- Compactor를 다중 인스턴스로 띄워 블록 충돌 → 단일 실행 보장 필요
- 객체 스토리지 요청 수 폭증으로 비용/지연 → 캐시(Store Gateway index cache) 필요
- 카디널리티 문제는 그대로 — Thanos가 [[Cardinality|폭발]]을 막아주지 않음
- HA 중복 제거 라벨(replica label)을 잘못 잡아 그래프 끊김

## 면접 체크포인트

- Prometheus의 한계(보존/글로벌/HA)와 Thanos가 각각 푸는 방식
- Sidecar/Store/Querier/Compactor의 역할 분담
- 객체 스토리지 + 다운샘플링이 장기 보존을 싸게 만드는 원리
- Querier 중복 제거로 HA를 달성하는 법
- Mimir/Cortex/VictoriaMetrics와 같은 문제 영역

## 출처

- [Thanos — Overview & Components](https://thanos.io/tip/thanos/getting-started.md/)
- [Thanos — Compactor & Downsampling](https://thanos.io/tip/components/compact.md/)

## 관련 문서

- [[Prometheus|Prometheus (로컬 TSDB 한계)]]
- [[Long-Term-Retention|장기 보존 (다운샘플링, hot/warm/cold)]]
- [[Cardinality|카디널리티 관리]]
- [[CloudWatch|CloudWatch (매니지드 장기 보존 대안)]]
