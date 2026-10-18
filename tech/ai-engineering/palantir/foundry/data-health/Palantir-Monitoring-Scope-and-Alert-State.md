---
tags: [palantir, monitoring-views, alerts, scope]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Monitoring scope와 alert 상태"]
---

# Monitoring scope와 alert 상태

Monitoring view는 같은 사용자 집단이 관심을 갖는 monitoring rule과 기존 health check의 집합이다. Metric/resource/scope/threshold/severity와 subscriber를 분리해 구성한다. Detailed content/schema/expectation 검사는 health check와 함께 쓰며 모든 check가 monitoring rule로 대체된 것은 아니다.

## Dynamic scope의 확장 경계

Single은 선택 resource에 고정한다. Folder는 해당 folder 안만 포함하며 subfolder를 재귀 포함하지 않는다. Project는 선택 Project들에서 같은 type을 추적하고 resource 추가/제거에 따라 자동 바뀐다. Function/action은 Workflow Lineage/Workshop/OSDK application의 사용 resource scope도 지원한다.

Agent/object/link/schedule/automation의 Project scope, dataset/stream의 Folder/Project scope와 live deployment/time-series/geotemporal의 Single scope는 서로 다르다. Ontology Project scope는 project-based permissions migration이 먼저 필요하다. Scope가 동적이라는 말이 지원하지 않는 resource type까지 포함한다는 의미는 아니다.

Rule 설정에는 target Viewer, alert 수신에는 target와 monitoring view 양쪽 Viewer가 필요하다. 권한자가 사용자를 subscription에 더해도 새 subscriber가 view/resource를 못 읽으면 알림이 오지 않는다. View는 잠재 subscriber가 접근 가능한 filesystem 위치에 저장한다.

## Severity와 composite rule

Low/Medium/High는 대응 우선순위와 notification channel routing을 나타낸다. Composite는 모든 condition을 AND로 판단하며 각 조건이 도달한 severity 중 공통 최저 등급으로 발동한다. 실패율이 High여도 minimum run count가 Medium만 넘으면 High alert로 해석하지 않는다.

Existing health check 추가 dialog는 이미 존재하는 check를 연결할 뿐 새 check를 만들지 않는다. Dataset Health 또는 Lineage bulk create를 사용해 검사 자체를 준비한다. Check group migration은 checks/subscriptions/digest 동작을 유지하며 group과 view는 1:1 연결이다. 여러 group을 하나의 existing view에 순차 연결하는 기능으로 가정하지 않는다.

## Snooze와 coverage 해석

Fired alert를 duration/reason과 함께 snooze하고 unsnooze/만료로 알림을 복구할 수 있다. Monitor alert는 re-fire해도 snooze가 유지되며 health check alert와 다르다. 전체 monitor rule snooze는 scope의 모든 target에 적용하고 기존 target-level snooze를 새 rule-level snooze로 대체한다. Failure resolution과 snooze를 같은 상태로 보고하지 않는다.

Workflow Lineage Monitoring status는 접근 가능한 view에서 firing한 monitor 중 최고 severity로 색칠한다. No monitors configured는 coverage gap, Not applicable은 monitoring target 불가다. 처음 평가되지 않은 rule은 healthy로 간주하므로 새 녹색 node가 검사를 통과했다는 증거는 아니다. 다른 사용자가 보는 view에 alert가 더 있을 수 있으며 AIP Logic은 backing function의 상태를 따른다.

## 출처

- [Palantir, Monitoring views](https://www.palantir.com/docs/foundry/monitoring-views)
- [Palantir, Core concepts](https://www.palantir.com/docs/foundry/monitoring-views/core-concepts)
- [Palantir, Monitoring FAQ](https://www.palantir.com/docs/foundry/monitoring-views/monitoring-faq)
- [Palantir, Check groups (Sunset)](https://www.palantir.com/docs/foundry/monitoring-views/check-groups)

## 관련 문서

- [[Palantir-Monitoring-Rule-Signals-and-Windows|평가 signal과 window]]
- [[Palantir-Monitoring-Delivery-and-Diagnostics|수신과 진단]]
