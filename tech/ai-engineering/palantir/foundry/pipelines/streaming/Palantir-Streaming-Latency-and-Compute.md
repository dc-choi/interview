---
tags: [palantir, streaming, latency, compute]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry streaming latency와 compute"]
---

# Streaming latency와 compute

Streaming은 지속 실행하는 분산 worker를 통해 낮은 지연을 얻는다. Batch job보다 상시 microservice에 가까운 가용성, 상태 복구와 유지보수 계획이 필요하다. 수분 지연을 허용하면 incremental/micro-batch의 총비용과 먼저 비교한다.

## Hot stream과 archive를 구분한다

Ontology, Pipeline Builder, Quiver와 Dataset Preview 등 stream-native 경로는 live data를 읽을 수 있다. 다른 도구는 archival batch dataset을 읽을 수 있어 화면에 같은 stream을 선택해도 지연이 다르다. Pipeline Builder의 input preview도 cold storage view여서 최근 record가 늦게 보일 수 있다.

튜토리얼의 personal token은 단기 시험용이며 production ingestion은 OAuth workflow로 구성한다. Streaming cluster 초기 시작은 약 1분이 걸릴 수 있다. Save는 실행 로직 배포가 아니다. Deploy 전 validation이 실패하면 resource/configuration 문제를 고치고 저장한 뒤 다시 deploy해야 한다.

개별 row는 1MB 제한이 있다. 일반 비교표의 transactional/atomic/branching/security 지원을 임의 크기 record나 모든 consumer의 동시 관측 보장으로 확대하지 않는다. Streaming은 Java/Pipeline Builder 경로를 지원하며 해당 언어 비교에서 Python streaming transform은 미지원이다.

## End-to-end 지연을 단계별로 측정한다

표준 예시의 ingestion 1~2초, exactly-once transform 약 5초와 backing-store sync 약 5초를 합친 15초 미만은 보장 SLA가 아니다. At-least-once 모드는 각 처리 단계의 coordination을 줄일 수 있지만 중복 허용을 업무 로직이 감당해야 한다.

Source 생성 주기, 네트워크 경계, repository/Builder graph 사이의 stage 수, state window와 destination write가 실제 지연을 결정한다. 같은 graph/repository의 transform은 함께 배치해 최적화할 수 있으나 여러 pipeline 사이에는 추가 경계가 생긴다. 30초 aggregation window는 그 자체로 지연을 더한다.

Total lag와 throughput을 함께 보고 partition/compute를 조정한다. High throughput은 한 batch의 record를 늘려 latency와 교환한다. 외부 destination의 backpressure는 처리 cluster만 키워 해결되지 않을 수 있다. 압축은 많은 반복 string에 유리하지만 작은 stream에서는 압축 대기가 지연을 늘릴 수 있다.

## Live compute는 입력이 없어도 사용한다

Streaming은 static allocation이며 실행 기간의 wall-clock에 대해 vCPU/memory/parallelism 사용량이 발생한다. Peak traffic에 맞춘 profile은 한가한 시간에도 같은 allocation을 유지한다. Profile 변경에는 restart가 필요하다. Stop하기 전까지 계속 사용량이 누적된다.

해당 usage guide의 compute-second 식은 다음과 같다. Enterprise 계약은 rate를 별도로 확인한다.

```text
job_manager = max(vCPU, GiB / 7.5) * streaming_rate * duration_seconds
task_managers = max(vCPU, GiB / 7.5) * streaming_rate
                * duration_seconds * (parallel_task_managers + 1)
live_total = job_manager + task_managers
archive = max(vCPU, GiB / 7.5) * archive_duration_seconds
```

기본 `streaming_rate`는 0.5로 안내하지만 금액이나 모든 계약의 환산율로 고정하지 않는다. `parallelism+1`을 포함한 guide의 식과 실제 usage breakdown을 대조한다. Live 사용량은 checkpoint dataset에 귀속되며 Resource Management의 streaming 항목에서 본다.

Archive는 hot storage를 영속 저장소로 옮기는 별도 batch compute다. 가이드는 active stream에서 10분마다, 1vCPU/4GiB의 작은 driver로 실행하며 새 데이터가 없으면 archive compute가 없다고 설명한다. 이는 live compute가 0이라는 뜻이 아니다. Archive별 사용량은 Builds에서 확인한다.

최소 profile로 시작하되 예상 최대 유입을 처리할 capacity와 recovery 여유를 확보한다. Idle 비용을 줄이기 위해 무조건 축소하면 backlog가 쌓여 업무 latency가 악화될 수 있다. Stream stop/restart가 상태와 downstream freshness에 미치는 영향도 함께 계획한다.

## 출처

- [Palantir, Streaming pipelines](https://www.palantir.com/docs/foundry/building-pipelines/streaming-overview)
- [Palantir, Comparison of streaming and batch](https://www.palantir.com/docs/foundry/building-pipelines/stream-vs-batch)
- [Palantir, Streaming performance considerations](https://www.palantir.com/docs/foundry/building-pipelines/streaming-performance-considerations)
- [Palantir, Streaming compute usage](https://www.palantir.com/docs/foundry/building-pipelines/streaming-compute-usage)
- [Palantir, Create a streaming pipeline](https://www.palantir.com/docs/foundry/building-pipelines/create-stream-pipeline-pb)

## 관련 문서

- [[Palantir-Streaming-Keys-and-CDC|Ordering과 current view]]
- [[Palantir-Streaming-State-and-Watermarks|State와 watermark]]
- [[Palantir-Pipeline-Engine-and-Authoring|Engine 선택]]
