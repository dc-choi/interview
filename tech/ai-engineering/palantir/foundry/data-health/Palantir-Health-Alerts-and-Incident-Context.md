---
tags: [palantir, data-health, incident, notifications]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Health alert와 사고 조사"]
---

# Health alert와 사고 조사

Check 실행, 실패 상태와 구독자의 notification은 별도 상태다. 개별 check는 all failures/critical only/nothing을 고를 수 있고 email은 사용자 notification preference를 따른다. Critical threshold는 Moderate보다 느슨하게 두어 심각한 상태를 구분한다. Notifications 문서의 항상 발송 설명을 nothing/snooze 설정을 무시하는 보장으로 해석하지 않는다.

Pause/snooze는 모든 watcher/subscriber의 alert를 일시 중단한다. Delete는 check configuration과 schedule을 제거하므로 나중에 보려면 다시 만들어야 한다. 자동 issue 생성과 회복 후 auto-close를 설정할 수 있으나 incident 전체가 해결되었는지는 관련 data와 workflow를 대조한다.

## Check groups는 이행 중인 기존 기능이다

2026-10-16 문서 기준 check group은 sunset이며 기존 saved group은 편집 가능하지만 새 group 생성은 막혀 있다. 같은 페이지 아래의 Create Group 절차는 과거 UI 설명으로 보존하며 신규 구축 경로로 제안하지 않는다. Scope 기반 coverage가 필요하면 Monitoring views로 migration한다.

Check group은 검사 실행 시점을 바꾸지 않는다. Group schedule은 aggregate email digest의 빈도이며 group Watch는 개별 check Watch를 켜지 않는다. Only when failing과 빈도를 지정해 pipeline alert noise를 줄일 수 있다. 동적 resource 추가 coverage와 기존 group의 고정 목록을 구분한다.

## 조사 UI가 보여주는 맥락

Failure spotlight는 같은 check type/resource/source 등으로 cluster를 만들어 root cause 후보를 보여준다. Build, snoozed together, related grouping과 hidden snoozed/finished duration filters를 확인한다. Snooze는 failure 해소가 아니며 이유/이력과 hidden filter가 현재 표시를 바꾼다.

복수 선택 toolbar는 선택된 모든 check/resource에 적용한다. Comments는 선택 target resource를 참조하고 group View 접근자에게 보인다. Issues는 해당 resource의 open issue, Schedules는 영향을 주는 하나 이상의 schedule, Source는 실패 원인의 source와 commit history를 보여준다. Source commit은 check가 붙은 target보다 upstream에서 실제 실패한 dataset의 것이 될 수 있다.

## Build failure는 최초 실패부터 찾는다

최근 성공 이후 logic/schema/volume/upstream 변화와 cluster 부하를 비교한다. Waiting for resources는 compute queue일 수 있고, upstream failure로 schedule이 canceled된 waiting dependencies는 첫 실패 job부터 해결한다. ErrorInstanceID만으로 infrastructure 원인으로 확정하지 않는다. Full trace의 Caused by/UserCodeError 등을 읽고 재현 시각/timezone과 조사 내용을 Support에 제공한다.

Skew join은 key별 row-count product와 task spill/긴 tail을 확인한다. Salted join은 큰 쪽에 0..N-1을 배정하고 작은 쪽을 같은 범위로 복제해 partition 부하를 나누는 방식이다. Off-by-one은 row 손실을 만들고 불필요한 salting은 비용을 늘리므로 무조건 빠른 최적화로 적용하지 않는다.

Shrinkwrap은 referenced path와 dataset RID/current path의 mapping이다. Move/trash/merge 변경과 transforms-shrinkwrap.yml을 대조한다. 재생성 전 실제 dataset/ownership을 확인한다. Output Editor 권한과 repository sourceProvenance를 확인하고 dataset job spec 소유권 이전은 양쪽 repo의 중복 output을 정리하는 계획으로 수행한다. 단순 check 실패를 해결하려고 임의 job spec을 삭제하지 않는다.

CI timeout 안내의 refresh-dependencies 예제는 긴 dash 표기와 repository별 configuration을 확인한다. 재시도/upgrade가 원인을 증명하는 것은 아니며 같은 실패가 재현되는지 비교한다.

## 출처

- [Palantir, Notifications and issues](https://www.palantir.com/docs/foundry/data-health/notifications)
- [Palantir, Watching checks](https://www.palantir.com/docs/foundry/data-health/watching-checks)
- [Palantir, Check groups (Sunset)](https://www.palantir.com/docs/foundry/data-health/check-groups-overview)
- [Palantir, Builds and checks FAQ](https://www.palantir.com/docs/foundry/data-health/builds-checks-faq)

## 관련 문서

- [[Palantir-Health-Check-Evaluation-and-Freshness|상태 해석]]
- [[Palantir-Health-Check-Content-and-Schema|내용 검사]]
