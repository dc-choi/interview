---
tags: [observability, datadog, aws, agent, incident-response]
status: done
verified_at: 2026-10-07
category: "관측가능성(Observability)"
aliases: ["AWS DevOps Agent Datadog", "Datadog 알림과 AI 장애 조사"]
---

# Datadog 알림과 AWS DevOps Agent의 조사 연결

연동에는 두 경로가 있다. Datadog webhook은 조사를 시작하고, Datadog의 remote MCP 연결은 조사 중 관측 데이터를 조회한다. 조회 성공만으로 알림 전달까지 검증됐다고 판단하지 않는다.

## 등록과 활성화

Datadog site에 맞는 MCP endpoint를 등록하고 OAuth로 승인한 뒤, 사용할 Agent Space에서 별도로 활성화한다. 등록 하나는 Datadog 조직 하나에 연결된다. 여러 조직을 연결하려면 각각 등록한다.

Webhook은 HTTP POST, JSON 본문과 `Authorization: Bearer <token>`을 사용한다. 자격증명은 생성 시 한 번만 표시된다. 회전하면 URL은 유지되지만 이전 자격증명은 무효가 되므로 발신 설정도 갱신해야 한다.

## 알림 매핑에서 놓치기 쉬운 경계

2026-10-07 공식 문서의 Datadog monitor 템플릿 기준이다.

| 항목 | 적용 기준 |
|---|---|
| 사건 식별 | `incidentId`에 `datadog-$ALERT_CYCLE_KEY`를 써서 같은 알림 주기의 재통지를 묶는다 |
| 우선순위 | Datadog의 `P1`~`P5`를 그대로 보내지 않고 허용값으로 매핑한다 |
| 발생 조건 | monitor 메시지의 `is_alert` 조건 안에 webhook mention을 둔다 |
| 설명 | `$TEXT_ONLY_MSG`에 조사에 필요한 증상과 대상 정보를 담는다 |

`priority`의 허용값은 `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `MINIMAL`이다. `action`은 `created`, `updated`, `closed`, `resolved` 중 하나이며 Datadog 템플릿은 `created`를 사용한다. `Triggered`나 `Recovered`를 직접 대입하지 않는다.

Webhook의 `data`는 수신돼도 조사 맥락에는 포함되지 않는다. 에이전트에 도달하는 것은 `title`, `description`, `priority`와 incident reference다. 태그나 쿼리를 `data`에만 넣고 조사자가 읽는다고 가정하지 않는다.

## 전달과 조사 생성을 따로 확인한다

잘못된 우선순위를 보냈을 때 HTTP 200이어도 조사가 시작되지 않을 수 있다. 응답 본문의 검증 오류와 Agent Space의 조사 생성 여부를 함께 확인한다. 같은 알림 주기의 시험은 사건 식별자가 중복될 수 있다.

운영 점검에서는 MCP 조회, webhook 전달, 조사 생성, 근거의 적합성과 실제 복구를 따로 확인한다. 이는 점검 제안이며 실제 계정 연동이나 장애 복구를 시험한 결과는 아니다.

## 출처

- [AWS DevOps Agent, Connecting DataDog](https://docs.aws.amazon.com/devopsagent/latest/userguide/connecting-telemetry-sources-connecting-datadog.html)
- [AWS DevOps Agent, Invoking DevOps Agent through Webhook](https://docs.aws.amazon.com/devopsagent/latest/userguide/configuring-integrations-and-knowledge-invoking-devops-agent-through-webhook.html)

## 관련 문서

- [[DevOps-Agent-Grafana|Grafana 연동의 조사 경계]]
- [[Datadog-Operations|Datadog 운영 지도]]
- [[MCP-Incident-Investigation|MCP 기반 장애 조사와 변경 권한]]
