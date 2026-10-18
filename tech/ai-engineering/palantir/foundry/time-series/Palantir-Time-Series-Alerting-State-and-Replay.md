---
tags: [palantir, foundry, time-series]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry 시계열 alerting의 상태, 지연과 재평가"]
---

# Foundry 시계열 alerting의 상태, 지연과 재평가

Time-series alerting은 Quiver search 논리를 여러 객체에 적용하고 발견한 기간을 Alert object로 기록한다. 탐색 분석과 자동 평가의 지원 연산/범위가 달라 같은 그림이 같은 alert 결과를 보장하지 않는다.

## Job과 automation의 단위

Alert object type은 하나의 evaluation job에 대응하며 여러 automation이 같은 job을 공유할 수 있다. Batch는 Spark, streaming은 Flink이며 dataset/stream의 각 row가 alert update를 나타낸다. Job-level 설정은 같은 output type을 쓰는 모든 automation에 영향을 주고 monitor-level 설정은 해당 automation만 바꾼다.

Batch는 새 input transaction에 따라 incremental 계산하며, stream 입력이면 archive를 읽어 약 10분의 추가 지연이 있다. Streaming은 stream-backed input만 지원하고 ingest 후 초 단위 지연을 목표로 하지만 stateful logic은 warm-up이 필요하다. 예를 들어 12시간 rolling window는 그만큼의 관측이 필요할 수 있다.

Alert output의 batch/streaming 유형은 생성 뒤 바꿀 수 없다. Effect evaluation frequency와 실제 data evaluation job schedule은 다른 설정이다. Effects를 생략해 Alert object만 생성할 수도 있다.

## Quiver 검색에서 바뀌는 계약

| 설정 | Automation에서의 처리 |
|---|---|
| Multi formula search | 저장 불가 |
| 여러 condition entry | 저장 불가. 한 condition 안에서 AND/OR 표현 필요 |
| Defined search time range | 무시 |
| Maximum duration | 무시 |
| Minimum duration | batch는 무시, streaming은 지원 |

Single root object 관점이어야 하며 해당 root의 TSP와 linked sensor를 사용한다. Preview object는 화면 예시일 뿐 실제 평가 scope를 정하지 않는다. 기본 scope는 root type의 전체 객체이며 scope filter를 따로 저장한다. 일반 property의 template 참조는 time-series formula의 직접 `@` 참조 조건을 확인한다.

Derived series와 alerting의 지원 card 목록도 다르다. 예를 들어 Segment statistics는 streaming alert에 미지원이고 Derived series에 가능한 Integral/DSP/Cumulative를 alerting 전체에 자동 확대하지 않는다.

## History와 논리 변경

Evaluation job 최초 실행은 전체 series를 시도하고 이후 새 데이터만 평가한다. 기존 job에 새 automation을 붙이거나 scope를 넓혀도 과거 데이터를 다시 계산하지 않는다. 일반 FAQ는 이미 실행된 job의 과거 데이터 강제 재평가를 지원하지 않으며 Palantir Support에 문의하라고 설명한다.

2026-08-03 streaming automation replay 개선 공지는 기존 output을 reset하거나 유지하는 선택을 설명한다. 해당 [배포 화면](https://www.palantir.com/docs/resources/foundry/announcements/release-notes/2026-09-14-11-25-08-2026-09-09-15-05-16-replay_ui_change.png)에서 유지 모드는 replay한 alert를 output dataset에 append하며 중복 가능성을 경고한다. 같은 설정 칸의 경고는 이 상태의 replay를 취소할 수 없다고도 알리고, 화면은 완료 전 새 alert가 생성되지 않으며 같은 output object type을 쓰는 모든 automation이 함께 replay된다고 표시한다. 화면은 유지 모드(Clear outputs on replay 꺼짐)만 보여 주므로 reset 모드의 취소 가능 여부와 경고는 확인하지 않았다. 일반 FAQ의 미지원 설명과 이 시점의 streaming UI 사이에는 차이가 남는다. 이를 batch 지원이나 모든 deployment의 self-service 지원으로 확대하지 않고 실제 지원을 확인한다. (2026-10-18 릴리스 본문과 화면 대조)

Logic 변경도 historical alert를 재계산하지 않는다. Ongoing alert는 end timestamp가 비어 있으며 새 logic이 normal이면 resolve, 계속 alert 상태이면 열린 상태를 유지한다. 같은 object history에 서로 다른 logic version이 기여할 수 있다.

Batch tail-only 계산은 interpolation/stateful operation에서 Quiver와 차이가 생길 수 있다. Streaming의 같은 window 안 duplicate timestamp는 비결정적으로 resolve되어 Quiver와 차이가 날 수 있다. 동일 source/수식이라는 이유로 동등성을 주장하지 않는다.

## 지연 허용과 복구 조건

Streaming allowed lateness는 default 5초이며 이 buffer 뒤 point를 평가하므로 minimum alert latency에 기여한다. 큰 값은 지연을 늘리고 작은 값은 legitimate late event를 더 버릴 수 있다. 너무 과거/미래의 out-of-order point도 제거된다.

Custom recovery condition은 trigger와 recovery를 비대칭으로 만들어 threshold 부근 flapping을 줄인다. Ontology polling interval은 linked series/property 참조의 변경 반영 속도와 query 비용을 절충한다. Excluded sync 변경은 restart와 여러 분의 job downtime을 만들 수 있어 다른 monitor 영향도 확인한다.

## 운영과 권한

Alert를 업무에 연결할 때는 대상 자산, 진단 분석, 처리 상태와 후속 개입을 함께 추적한다. 2023년 에너지 분야 데모는 온도 이상 Alert에서 유정과 Quiver 분석으로 이동하고, 처리 결과를 규칙 검토에 연결하는 예를 보여준다. 화면의 데이터는 가상 사례로 명시돼 있다. 데모의 규칙 편집과 제안 검토 화면은 Foundry Rules의 Rules App(Rule Editor와 Proposal Reviewer)이며, [2024년 12월 릴리스](https://www.palantir.com/docs/foundry/announcements/release-notes/2024/#95d8e23a-ebf2-4e31-bf57-d34469fe82f5)에서 batch 방식으로 GA되고 2026년 2월 streaming 조건이 추가된 이 문서의 alerting automation 화면이 아니다. [[Palantir-Rules-Time-Series-and-Custom-Pipelines|시계열 Foundry Rules]]는 sunset 단계이고 FAQ는 Foundry Rules가 매번 전체 time series를 대상으로 실행된다고 설명하므로, logic 변경 뒤 과거 Alert를 재계산하지 않는 위의 automation 동작을 이 데모에 옮기지 않는다. 이 흐름을 실제 펌프 정지나 자동 모델 학습의 검증 결과로 보지 않는다. [시계열 데이터에서 업무 행동으로](https://www.youtube.com/watch?v=fMiaepe7zOU&t=63s) (01:03–01:48; 2026-10-18 전사와 화면 대조)

Batch lookback은 underlying rolling window 등의 최대 범위 이상을 검토하되 클수록 지연이 늘며 최대 50 transaction까지만 돌아본다는 제한이 있다. First-run read limit은 최초 job 실행에만 적용된다. Job timeout 기본은 1시간이다. Fail job on any failure를 켜면 한 automation 실패로 공유 job 전체가 실패할 수 있다.

Alerting output type과 automation은 같은 Project에 저장해야 하고 output type에 필요한 alert ID/root key/start/end/generation/version type class를 갖춰야 한다. Stream은 cause/template 관련 필드도 필요하다. Type edit permission과 실제 job health/history 성공을 확인한다.

이 기능은 정상적으로 들어오는 sensor 데이터의 이상 탐지용이며 pipeline 데이터 양/품질의 건강 검사를 대신하지 않는다. 입력 ingest, job 상태와 automation evaluation history를 함께 본다. 이 문서는 alert를 생성/발송하거나 replay를 실행하지 않았다.

## 출처

- [Palantir Time series, alerting-additional-configurations](https://www.palantir.com/docs/foundry/time-series/alerting-additional-configurations)
- [Palantir Time series, alerting-common-questions](https://www.palantir.com/docs/foundry/time-series/alerting-common-questions)
- [Palantir Time series, alerting-overview](https://www.palantir.com/docs/foundry/time-series/alerting-overview)
- [Palantir Time series, alerting-setup](https://www.palantir.com/docs/foundry/time-series/alerting-setup)
- [Palantir Foundry Rules, timeseries-concepts](https://www.palantir.com/docs/foundry/foundry-rules/timeseries-concepts)
- [December 10, 2024, Introducing time series alert automations [GA] — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2024/#95d8e23a-ebf2-4e31-bf57-d34469fe82f5)
- [August 3, 2026, Updated replay experience for time series streaming automations — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2026/#69ceef0975060e35b09a8f3c518ef7799691467c3af8fdbc24769e9b3e5fd4c9)

## 관련 문서

- [[Palantir-Time-Series]]
- [[Palantir-Quiver-Time-Series-Interpolation-and-Aggregation]]
- [[Palantir-Time-Series-Identity-Schema-and-Sync|Foundry 시계열 identity, schema와 sync]]
- [[Palantir-Time-Series-Indexing-Performance-and-Usage|Foundry 시계열 색인, hydration과 사용량]]
- [[Palantir-Time-Series-Derived-Series-and-Access|Foundry derived series, 버전과 접근 권한]]
- [[Palantir-Time-Series-Functions-and-Calculation-Semantics|Foundry 시계열 함수와 계산 의미]]
