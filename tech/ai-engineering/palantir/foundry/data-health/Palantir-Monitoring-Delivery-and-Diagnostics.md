---
tags: [palantir, alerts, observability, diagnostics]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Monitoring 전달과 진단"]
---

# Monitoring 전달과 진단

Monitoring rule 발동, subscriber 권한과 external delivery는 별도 단계다. External integration은 지정 severity와 정확히 일치한 alert만 받는다. Medium을 설정하면 High까지 자동 포함하는 최소 등급 filter가 아니다. 다른 설명의 meet-or-exceed 문구를 개별 external routing 계약에 덮어쓰지 않는다.

## 외부 channel의 설정과 공개 범위

PagerDuty는 Events V2 integration key와 severity를 mapping한다. 한 view의 여러 severity를 같은 key에 연결할 수 있으며 일반적으로 별도 service user/egress 설정이 필요 없다. 2024년 2월 v1.860.0 이전 monitoring view는 legacy health-check PagerDuty 알림을 수동 enable해야 할 수 있다. Check severity Low/Moderate/Critical은 LOW/MEDIUM/HIGH로 mapping한다.

Slack은 Data Connection Slack source의 bot token과 channels:join/read, chat:write를 사용한다. Private channel은 groups:read와 app invitation이 필요하다. 이는 실제 메시지를 발송했다는 기록이 아니라 연동 계약이다.

Slack의 friendly resource name은 resource의 모든 security/organization Marking이 source exportable 목록에 있을 때만 보이고 하나라도 빠지면 RID를 보낸다. ISO와 unmark 권한을 가진 사용자가 export scope를 정한다. 이름 변경된 notification format을 machine parser가 소비한다면 schema 변화를 검토한다. RID 표시를 permission 실패 또는 resource 미존재로 단정하지 않는다.

Webhook은 Data Connection의 string Message parameter에 notification content를 채운다. Content는 현재 custom할 수 없고 severity별 integration을 구성한다. Webhook request 성공과 외부 도구가 실제 alert를 처리한 결과도 구분한다.

## Alert debug의 지원 범위

Debug page는 현재 function/action의 single-condition rule만 지원한다. Composite와 다른 resource는 Troubleshoot alerts로 돌아간다. Current value/threshold 옆 evaluation 시각, window와 status transition을 확인하고 최대 최근 30일 alert history를 본다.

Rule SOP와 service template의 read-only default SOP가 최대 두 개 Notepad link로 보일 수 있다. Metric chart와 Workflow Lineage/Ontology Manager/source repository 링크로 내려가며 repository가 알려져 있지 않으면 해당 링크가 없을 수 있다.

Function/action run history navigation은 duration p95면 threshold 초과, failure count면 Failed와 firing 당시 window, user-facing failure면 해당 reason을 prefilter한다. 기본 filter가 전체 실행을 보여 주는 것이 아니므로 필요하면 범위를 확장한다. Automation은 Workflow Lineage, dataset/schedule/object type은 Data Lineage로 연결한다.

## 관측 도구마다 보존 창이 다르다

Platform observability는 monitor/debug/trace/analyze를 나눈다. Functions/actions/AIP Logic metric은 30일, Workflow Lineage execution history는 7일이며 source executor의 호출 chain을 기준으로 log search할 수 있다. Trace의 input/output/error는 실제 열람 권한과 기록 조건을 확인한다. 긴 보존이 필요하면 지원 enrollment의 organization telemetry export stream을 별도 관리한다.

Observability dashboard는 같은 signal을 Workshop Observability Chart로 배치한 custom view다. Chart마다 한 resource를 고르고 공통 timestamp variable로 범위를 묶을 수 있다. Chart가 없는 resource는 coverage에 포함되지 않으며 dashboard를 만들었다고 builtin trace/history 기능을 대체하지 않는다. 예정된 추가 widget은 현행 기능으로 표시하지 않는다.

## 출처

- [Palantir, Sending alerts to external systems](https://www.palantir.com/docs/foundry/monitoring-views/external-systems)
- [Palantir, Alert debug page](https://www.palantir.com/docs/foundry/monitoring-views/alert-debug-page)
- [Palantir, Monitoring views](https://www.palantir.com/docs/foundry/monitoring-views/overview)
- [Palantir, Observability](https://www.palantir.com/docs/foundry/observability)
- [Palantir, Observability dashboards](https://www.palantir.com/docs/foundry/observability/dashboards)
- [Palantir, Data Health](https://www.palantir.com/docs/foundry/observability/data-health)

## 관련 문서

- [[Palantir-Monitoring-Scope-and-Alert-State|수신 권한과 alert 상태]]
- [[Palantir-AIP-Observability|AIP 관측]]
- [[Palantir-Logs-and-Usage-Governance|Telemetry export와 운영]]
