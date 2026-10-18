---
tags: [palantir, foundry, release-history, "2025"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2025 Machinery, derived series와 자동화 관찰

2025년 공식 release note의 변경 이력을 정리한다. 2026년 현재 지원/요금/수명주기 보장이 아니며, 실제 적용 전 해당 버전의 정본 문서와 enrollment 설정을 확인한다.

## 계산되는 series와 저장되는 데이터

- 3월 Time Series Catalog GA는 sync, time-series object type와 derived series의 시작 화면을 통합했다. sync는 seriesId/time/value를 저장하고 object property는 해당 seriesId를 참조한다.
- 3월 single derived series는 여러 object를 입력으로 삼고 templated series는 object별 동일 logic을 재사용했다. derived 값은 요청 시 계산하므로 별도 materialized 데이터 저장과 다르다.
- 새 생성 UI는 derived series가 지원하는 연산만 보여줬다. Quiver에서 임의로 만든 분석이 모두 derived series로 저장되는 것은 아니다. automatic Ontology saving은 별도 요건이 있다.
- Workshop Derived Series widget은 logic 편집을 단순화하고 고급 설정은 Catalog 경로에 남겼다.
- 3월 Automate time-series condition을 직접 만들 수 있게 돼 Quiver 초기 구성이 필수가 아니게 됐다.

## Process의 상태와 실제 이벤트

- 2월 Machinery 베타는 administrator enablement가 필요했다. 상태/Action/automation graph와 value type/submission criteria를 연결하고 Logic Function을 transition에 사용할 수 있었다.
- Machinery Express는 Workshop app의 시작점을 생성하거나 기존 app에 Process Overview widget을 추가했다. UI bootstrap이 운영 승인과 monitoring 정책을 완성하는 것은 아니다.
- 5월 13일 공지 description은 6월 GA 예정이라 적지만 장문은 이미 6월인 것처럼 서술한다. 6월 5일 GA 공지를 별도로 두고 5월 문장을 날짜 확정 근거로 쓰지 않는다.
- GA 설명은 subprocess/parallel/mining external event log, state 제외와 transition frequency, performance metric, 사람 개입을 통합했다.
- 11월 widget은 여러 process와 root→linked child derivation, historical/current count/duration, custom metric, zoom/path frequency/duration distribution을 확대했다.
- nonconforming object는 기본 제외되지만 선택해 표시하고 해당 표시 범위의 metric을 볼 수 있었다. 시각화의 제외 조건과 업무 규칙 위반 기록을 구분한다.

## Automate와 실행 이력

6월 automation telemetry는 project-scoped 실행에만 제공됐다. 9월/10월 flame graph, sequence/batch/parallelism과 log는 병목 위치를 드러냈다. Scheduler Started by는 충족된 trigger를 설명하고 streaming health/lag/throughput와 branch-specific monitor는 입력 신선도를 확인한다. Process definition, condition 충족, 실제 Action 성공과 downstream data 갱신을 순차로 확인한다.

## 출처

- [2025 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes/2025)
- [June 5, 2025, Announcing Machinery, for building, automating, and optimizing processes [GA] — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#39ac8642-a198-4ec2-a689-6f489e3302c0)
- [May 13, 2025, Announcing Machinery, for building and optimizing your processes in a comprehensive view [GA] — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#82bc68f6-5e82-444b-b1b3-c1dafecbb470)
- [March 13, 2025, Discover time series capabilities in the Time Series Catalog application [GA] — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#b38a82a0-93da-4390-aa81-f1e1fc1e4474)
- [February 27, 2025, Announcing Machinery, for building and optimizing your processes in a comprehensive view [Beta] — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#3a013212-d461-43c7-9e0e-ab6b247c97aa)

## 관련 문서

- [[Palantir-2025-Platform-Evolution]]
