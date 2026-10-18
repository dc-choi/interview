---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Direct deployment의 scaling, 타입과 자동 갱신

direct deployment는 model branch마다 하나의 live endpoint를 제공하고 REST 또는 model Function으로 소비한다. 새 model version이 같은 branch에 publish되면 endpoint를 자동 upgrade한다. 문서의 no downtime 안내는 실제 자신이 구성한 runtime의 가용성 시험을 대신하지 않는다.

## Scaling과 버전

compute module 기반으로 min/max replica를 정하고0부터 scale할 수 있다.75% capacity에서 max까지 replica를 추가하고30분 live request가 없으면 scale down한다. schedule override는 현재1개이며 요일/time range/timezone의 min/max를 정한다. 밖에서는 default 설정을 쓴다.

일반 model publication은 새 Function version도 만들지만 Marketplace installed-output 재학습은 deployment만 갱신하고 Function을 publish하지 않는다. API변경 시 새 Function version과 consumer update가 필요하다.

## 입력과 지원

numeric int에3.6을 주면3으로 truncate하고 date/timestamp를 cast한다. timestamp는 ISO8601 string이며 required field를 강제한다. adapter 일반 API의 live casting 설명과 비교표의 objective live no casting 안내가 일치하지 않으므로 배포 종류별 실제 request/response를 확인한다.

direct는 v2 endpoint만, objective는 v1/v2를 제공한다. direct는 external/Spark adapter,objective inference history/pre-release review/automatic objective evaluation을 지원하지 않는다. 별도 ModelInput evaluation을 작성할 수 없다는 뜻으로 확대하지 않는다.

같은 문서 비교표의 Marketplace No는 본문과 최신 marketplace-models의 default-branch package 지원과 충돌한다. 현재 detailed packaging 조건을 우선 대조하고 표만으로 전체 미지원이라 단정하지 않는다.

## 진단

Logs에서 stream/filter/download와 run history를, Metrics에서 scaling/job/container/replica를 본다. Run with Flamegraph는 Python call별 시간을 보여 주지만 container model과 error-return request에는 제공되지 않는다. direct run history와 objective의 별도 inference-history dataset을 구분한다.

Monitoring view의 Live deployment Single scope는 heartbeat,replica provisioning,queue,CPU,OOM restart,responsiveness 등의7rules를 제공한다. Workflow Lineage에서 Function dependency/API/query/health를 확인하되 자동 upgrade가 모든 consumer signature 호환성을 보장하지 않는다.

## 출처

- [Palantir, create-a-model-deployment](https://www.palantir.com/docs/foundry/manage-models/create-a-model-deployment)

## 관련 문서

- [[Palantir-Model-Marketplace-Packaging]]
- [[Palantir-Model-Functions-Versioning]]
- [[Palantir-Model-Deployment-Branching]]
