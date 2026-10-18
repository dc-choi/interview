---
tags: [palantir, foundry, release-history, "2025"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2025 사용량, 실행 이력과 자원 진단의 관측 범위

2025년 공식 release note의 변경 이력을 정리한다. 2026년 현재 지원/요금/수명주기 보장이 아니며, 실제 적용 전 해당 버전의 정본 문서와 enrollment 설정을 확인한다.

## 신호가 무엇을 측정하는가

- 1월 Project는 vCPU와 선택적 vGPU queue를 따로 지정하고 하나의 priority branch에 독립 queue를 줄 수 있었다. GPU가 필요 없는 workload의 queue를 enrollment default와 구분한다.
- 3월 Trashed resources는 최근 30일 비용을 보여주고 restore/permanent delete를 지원했다. 현재 살아 있는 resource 비용만으로 소비를 설명하지 않는다.
- 4월 Compute Modules의 scaling load threshold와 delay, 8월 replica/container CPU/memory dashboard는 응답성과 idle 비용을 조정하는 수단이었다.
- 6월 resource availability warning에는 UTC day 이후 24시간 tolerance가 있었다. invoice dimension, resource filter와 chart/table selection은 view 조건이며 실제 과금 정의를 바꾸지 않는다.
- 7월 Resource Limits 명칭은 read-only Quotas로 바뀌었다. quota 화면과 실제 allocation 변경 권한을 구분한다.
- 10월 shared warm pool은 XS VM, 최대 3 jobs/VM과 30분 이하 작업 권장이 붙었다. 실제 사용 profile과 요청 resource specification은 다를 수 있다.
- 11월 V100 queue는 신규/수정 선택 제한과 경고가 추가됐다. 기존 workload의 실제 실행 상태와 새 queue 선택 정책을 구분한다.
- 12월 Spark job billing unit usage는 권한 없음/비Spark/6개월 초과 등의 이유로 표시되지 않을 수 있었다. 표시 없음은 비용 0의 증거가 아니다.

## Log와 monitor

- 8월 unified live/archive log viewer는 자동 5초 polling, 비활성 tab 정지, Tabular/JSON/Raw와 paging/catch-up/autoscroll을 제공했다. 표시 방식과 log 보존 기간을 동일시하지 않는다.
- 10월 Action/Function P95와 failure-count monitor는 rolling window와 notification을 설정했다. Foundry/PagerDuty/Slack/webhook 경로를 구분하고 threshold가 어떤 호출 집합을 포함하는지 확인한다.
- 11월 6일 공지의 최근 7일간 execution history는 caller/time/duration/outcome과 span을 보여줬다. TS1 console/IO/Ontology load와 TS2 OTEL/custom/outbound, Action edit/webhook, LLM prompt/response/token 등의 log 유형이 달랐다.
- Org administrator의 project-selected streaming dataset export는 Internal format/OTLP를 제공했다. LLM prompt/response 등 민감 로그 설정에는 ISO/enrollment admin 등 별도 관리 권한을 확인한다.
- 11월 Marketplace monitoring view는 checks와 target input을 package하며 install 후 target scope 재설정, subscription과 locked 상태를 구분했다.

## Streaming과 scheduler

3월 stream checkpoint table, 5월 lag/throughput/stage/history, 6월 utilization moderate 80/critical 120 표시와 branch-specific monitor, 10월 outage dashboard가 추가됐다. scheduler Started by는 충족 trigger를 설명한다. 단일 UI의 healthy 표시를 source 갱신, delivery와 downstream indexing 완료로 확장하지 않는다.

## 출처

- [November 6, 2025, Ontology and AIP Observability — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#46b9df7d-b0c8-450a-a65a-e90e2c1692f9)

- [2025 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes/2025)
- [October 24, 2025, Ontology and AIP Observability: Monitoring is now enabled for functions and actions — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#6353e7ea-30aa-4a6f-8648-1f2d87de44a3)
- [December 9, 2025, Monitor action and function metrics in near real-time in Ontology Manager — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#48365329-4812-4981-9060-4a5cf9d6263d)
- [November 18, 2025, Monitoring views are now compatible with Marketplace — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#79e427fd-76bd-4030-97f3-ab4cfb5c0b74)
- [January 16, 2025, Benefit from granular control over Project resource queue assignments with the Resource Management application — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#aa8a455b-4e64-4a0c-bf99-6e9af1c765fc)

## 관련 문서

- [[Palantir-2025-Platform-Evolution]]
