---
tags: [palantir, foundry, release-history, "2026"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2026 상반기 모델 배포와 container 실행의 제약

2026년 2~6월 공식 출시 기록을 10월 16일 스냅샷에서 대조했다. 아래 지원/제약은 발표 당시 범위이며 현재 정본, 설치 버전과 enrollment 설정을 별도로 확인한다.

## Model Studio와 pipeline inference

- Model Studio는 2월 9일 주 GA로 발표됐다. forecasting/regression/classification, optional parameter와 experiment/lineage를 제공하며 full Marketplace, 직접 time-series input와 더 많은 task는 당시 계획이었다.
- 3월 daily/multi-day Timestamp 학습 모델이 Date 대신 Timestamp를 반환하고 inference timezone을 보존하도록 수정됐다. 시간 단위/type 변경은 후속 pipeline schema와 비교한다.
- 2월부터 새 model Function은 Ontology-bound가 기본이다. 기존 Space-bound model Function을 TS2/Python에서 쓰려면 Ontology binding으로 migration해야 한다.
- 2월 sidecar ModelInput을 사용하는 model asset의 Marketplace packaging, install 때 모델 version을 선택하는 경로가 추가됐다. 모델을 bundle하는 것과 install input으로 해석하는 것은 다른 배포 전략이다.
- 4월 Pipeline Builder Trained Model inference는 **Spark batch, warm pool off, 정확히 tabular input/output 하나씩**이었다. streaming/lightweight/time-series/preview와 다른 입력은 당시 미지원 또는 향후 범위였다.
- model version은 build branch의 최신 published version을 찾고 없으면 configured fallback branch, fallback 미설정이면 master를 사용했다. 이 자동 선택을 검증한 고정 version 실행과 혼동하지 않는다.
- inference는 Spark executor 옆의 별도 sidecar CPU/memory/GPU를 설정한다. 6월 startup timeout 기본은 10분이며 바꿀 수 있게 됐다.
- direct live deployment는 6월 요일/시간대/timezone별 min/max replica override를 제공하고 그 시간 밖에는 기본 scaling을 적용했다.

## Compute Modules

2월 GA는 언어와 무관한 container code를 Function/API, ingestion와 legacy integration에 연결하고 horizontal scaling, update, Foundry API와 REST/WebSocket/SSE, Marketplace 배포를 소개했다. 자동 연결/무중단이라는 공지 표현을 모든 workload의 재시도/상태 보존 계약으로 확장하지 않는다.

3월 replica history는 최근 7일의 metric/log/lifespan/termination reason을 제공했다. 6월 Running tasks per replica는 30초 구간의 **peak** task 수이며 concurrency threshold에 도달하면 추가 작업이 queue로 간다. 평균 utilization과 다르므로 replica 수와 concurrency 설정을 함께 읽는다.

## 출처

- [2026 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes)
- [February 12, 2026, Model Studio, our no-code model training tool, is now generally available — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#634fbb0b-f3ba-431a-9e71-208bb759e6a2)
- [April 2, 2026, Introducing Models in Pipeline Builder: No-Code Model Inference — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#2ddd0807-a978-466e-b7a0-a0f822fb00ee)
- [February 5, 2026, Deploy containers with compute modules — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#1021aa61-3ff2-4ce7-8d4c-77c87efe1c5e)
- [June 25, 2026, Schedule overrides for replica scaling in live deployments — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#d30ca534-449e-4164-9603-ee5d6672cbc5)

## 관련 문서

- [[Palantir-2026-H1-Platform-Evolution]]
- [[Palantir-Model-Engineering]]
