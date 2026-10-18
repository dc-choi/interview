---
tags: [palantir, aip, tracing, logs, metrics]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Ontology와 AIP 관측"]
---

# Ontology와 AIP의 실행 추적과 로그 검색

Workflow Lineage는 resource별 metrics, execution history, trace와 logs를 연결한다. AIP enablement 없이도 해당 Ontology 관측 기능을 사용할 수 있다. Metrics 조회, run 목록과 로그 내용 열람의 권한이 같지는 않다. Export/보존 정책은 [[Palantir-Logs-and-Usage-Governance]]에 둔다.

## 관측 단위와 시간창을 맞춘다

Resource metrics는 최근 30일 success/failure와 p95 duration을 제공하고 기본 Viewer가 필요하다. Run history는 기본 Editor가 필요하며 function/action/automation 최근 30일을 완료 timestamp순으로 본다. Caller와 call chain 첫 source executor를 구별하고 status/time/user/version/failure/caller 필터는 AND로 합친다.

Action metrics의 연결 문서에는 7일 history 설명도 남아 있어 전용 run-history 문서의 30일과 차이가 있다. 실제 화면의 retention을 확인하며 모든 표면에 같은 기간을 확정하지 않는다. Pipeline Builder sidecar UDF의 execution history는 지원하지 않는다.

Failure-rate graph color는 Action/function/Logic에만 적용한다. Automation은 아직 이 color mode용 metrics를 내지 않아 실행했어도 No runs로 보인다. No runs는 무실행과 미지원 둘 다 포함하며 No permission은 별도다. Default 창은 최근 4시간, 최대 1일이고 visible tab에서 약 1분마다 갱신한다. 일반 metrics의 30일 보존을 color mode 창으로 확대하지 않는다.

2025년 Workflow Lineage AIP usage는 attempted/successful/rate-limited를 구분하고 enrollment 전체 model 요청과 graph에 표시된 요청도 나눴다. Logic node의 token usage는 Logic debugger 실행만 의미하므로 production caller의 비용과 중복 집계하지 않는다. Model node와 calling Workshop/automation/OSDK node의 attribution을 함께 본다. ([March 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-03))

2025년 4월 Resource Management usage view는 model별 분당 TPM/RPM과 project/enrollment threshold, total의 80%인 batch line을 구분했다. 당시 2주 data와 6시간 미만 zoom의 project/resource segmentation은 capacity 진단용 시간창이었다. 같은 앱의 compute billing 집계나 모든 trace의 30일 보존과 동일시하지 않는다. ([April 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-04))

## Trace에서 실제 긴 경로를 찾는다

Ontology Manager의 near-real-time success/failure와 p95 chart는 2025년 12월 기존 최대 하루 지연 집계를 개선한 표면이다. Chart 갱신, alert rolling window와 run-history retention을 같은 시간 계약으로 해석하지 않는다. 당시 공지도 7일 history를 썼으므로 현재 전용 문서의 30일과 도입 시점을 구분한다.

Trace는 요청부터 응답까지 서비스 계층과 span duration을 보여준다. Function parameters, LLM prompt/response/token과 error를 볼 수 있다. `foundryTraceId`는 telemetry 조회 식별자이고 `x-b3-traceid`는 log tags의 best-effort 분산 추적 ID다. 외부 OSDK app log 등에는 후자가 없을 수 있다.

긴 span, 반복 호출, 병렬화 가능한 독립 작업과 모델 지연을 구분한다. Batch/parallel 전략을 고를 때 결과 품질, rate limit과 외부 효과의 순서도 검토한다. Trace상 빠른 실행이 업무 결과의 정확성을 증명하지는 않는다.

## Cloud global search와 단일 source 검색은 범위가 다르다

Non-cloud의 single-source search는 해당 source executor에서 시작한 실행만 찾는다. 중간 function node를 골랐는데 비어 있으면 Recently executed by의 상위 executor를 따라간다.

Cloud global search는 function/Logic/Action/chatbot/model deployment/language model을 producing resource로 검색해 다른 source executor에서 호출한 로그도 찾는다. Automation을 고르면 그 automation에서 시작한 실행을 찾는다. Language model은 지원 source executor가 호출한 경우만 나타난다.

여러 node에서 기본 Across selected resources는 producing resource 또는 source executor 중 하나가 선택된 로그를 포함하고 graph에 표시되지 않은 call chain도 들어올 수 있다. Within selected call chain은 두 endpoint가 모두 선택된 chain으로 제한한다. 아무 node도 고르지 않으면 graph의 지원 자원을 모두 검색한다.

검색은 Message/Content 전체의 case-sensitive text와 `*` wildcard를 사용한다. 필터는 AND이며 기본 최근 하루, global 최대 선택 창은 30일이다. Single-source는 enrollment retention을 따른다. 페이지 크기는 single-source 100, global 25다. **Live stream이 아니므로 검색 시작 후 생성된 로그는 reload/filter 변경이 필요하다.**

## Log 접근은 source executor 기준으로 확인한다

타인 trace/service log/search에는 source executor의 execution-history operation(기본 Editor), log-access enablement와 모든 설정 marking이 필요하다. Resource를 옮겼다면 current/attributed project를 함께 적용할 수 있다. 자신의 최근 24시간 예외에도 execution-history operation은 필요하며 CBAC에는 이 예외가 없다. Run 목록이 보인다는 사실만으로 log content가 열리는 것은 아니다.

기록한 원천 데이터나 resource marking은 자동 전파되지 않는다. 관리자가 log access용 marking을 직접 정한다. 무표식 log는 role/log policy를 만족한 누구나 볼 수 있으므로 prompt/object input의 최대 민감도를 고려한다.

Log는 INFO(정상 흐름), WARN(복구 가능 문제), ERROR(정상 수행 실패), DEBUG/TRACE(세부 진단)를 구분하고 식별자/개수/재시도 맥락을 담는다. Credential이나 전체 API payload를 그대로 남기지 않는다. TSv1 console과 TSv2 OpenTelemetry logging의 작성 방식 차이도 확인한다.

Monitoring view의 project scope는 자원이 들어오면 자동 감시하고 나가면 감시를 멈춘다. 2026년 2월 Ontology type/many-to-many link/Action/function 적용에는 project-based permission migration이 선행됐다. Folder 이동은 role뿐 아니라 monitoring coverage도 바꿀 수 있다.

Workflow Lineage의 multi-Ontology graph는 외부 Ontology node를 표시하지만 현재 선택 Ontology 밖 Action의 bulk update는 제한된다. Presentation frame도 layout/color/zoom의 저장 상태이며 데이터나 execution trace의 불변 snapshot이라는 뜻은 아니다.

Autopilot은 automation/Logic/Action graph, object path와 live execution, Kanban을 결합한다. 2026년 3월 beta에서 project-scoped mode는 workbench 사용자에게 실행 event/dependency를 공유해 권한 범위를 넓혔고 object history 추적에는 edit-history enablement가 필요했다. 보이지 않는 과거 path를 현재 설정만 켜서 모두 복원할 수 있다고 추정하지 않는다. 수동 state 정의와 실제 Action transition도 구분한다.

2026년 4월 project Viewer용 AIP usage는 최대 2주/분 단위로 model/resource, batch/interactive와 token/request를 나눴다. Current capacity overlay와 당시의 historical usage를 구분하고 rate-limit hit를 단순 소비량과 별도로 본다. Project manage 권한의 일반 usage tab과 AIP tab은 다른 진입/데이터 범위다.

Workflow Lineage의 bulk model replacement는 2026년 5월 Logic과 Palantir 제공 모델을 대상으로 했다. 전 워크플로에 걸친 교체라도 다른 resource type까지 자동 갱신하는 계약은 아니며 candidate model의 대표 suite와 호출별 usage/latency를 검증한다.

Autopilot의 2026년 6월 Automation events는 batch 실행 단위 아래 trigger object, effect/fallback과 success/failure/fallback outcome을 연결했다. Object execution tab의 이름 변경과 묶음 단위를 구분하고 한 batch 성공을 모든 downstream 외부 효과의 성공으로 압축하지 않는다. 실패/성공 사례의 trace와 같은 객체의 전체 history를 대조한다.

Observability Chart는 Action/function 성공/실패 count와 p95, Compute Module replica CPU/memory의 일부 metric을 공유 timestamp variable로 묶는다. 2026년 7월 widget는 active run이 없으면 empty, 최대 30일 보존이었다. Chart에서 time range를 고르면 연결된 다른 chart도 갱신하지만 Data Health의 threshold alert를 대신하지 않는다.

Workflow Lineage의 function-backed automation bulk upgrade도 all-or-nothing과 compatible-only partial을 나눈다. 결과 summary로 실제 변경/실패 대상을 확인한다. Permission debug의 user별 Action visibility/submission criteria와 matching policy highlight는 진단 범위이며 다른 input/object 상태의 모든 실행까지 검증하지 않는다.

Object timeline은 Action edit를 실행/agent/human/resource에 귀속하고 token, first-to-last runtime과 human waiting, agentic coverage를 조사한다. 2026년 8월 Object Explorer 진입에는 edit history가 필요했다. Runtime은 개별 작업 CPU 시간의 합이 아니고 높은 agentic coverage도 업무 결과 품질을 뜻하지 않는다. Timeline diamond와 execution trace를 함께 확인한다.

## 출처

- [Palantir, Ontology and AIP observability](https://www.palantir.com/docs/foundry/aip-observability/overview)
- [Palantir, Metrics](https://www.palantir.com/docs/foundry/aip-observability/metrics)
- [Palantir, Run history](https://www.palantir.com/docs/foundry/aip-observability/run-history)
- [Palantir, Trace views](https://www.palantir.com/docs/foundry/aip-observability/trace-view)
- [Palantir, Service logs and debugging](https://www.palantir.com/docs/foundry/aip-observability/service-logs-and-debugging)
- [Palantir, Log search](https://www.palantir.com/docs/foundry/aip-observability/log-search)
- [Palantir, Log permissions](https://www.palantir.com/docs/foundry/aip-observability/log-permissioning)
- [Palantir, Performance monitoring and optimization](https://www.palantir.com/docs/foundry/aip-observability/performance-monitoring-and-optimization)
- [Palantir, March 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-03)
- [Palantir, April 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-04)
- [Palantir, October 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-10)
- [Palantir, November 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-11)
- [Palantir, December 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-12)
- [Palantir, February 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-02)
- [Palantir, March 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-03)
- [Palantir, April 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-04)
- [Palantir, May 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-05)
- [Palantir, June 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-06)
- [Palantir, July 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-07)
- [Palantir, August 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-08)

## 관련 문서

- [[Palantir-Logs-and-Usage-Governance|Export와 로그 보호]]
- [[Palantir-AIP-Evaluation-Suites|평가 결과와 반복 편차]]
- [[Palantir-Action-Observability-and-Recovery|Action의 결정 기록]]
