---
tags: [observability, grafana, aws, agent, incident-response]
status: done
verified_at: 2026-10-07
category: "관측가능성(Observability)"
aliases: ["AWS DevOps Agent Grafana", "Grafana 알림과 AI 장애 조사"]
---

# Grafana 알림과 AWS DevOps Agent의 조사 경계

알림이 조사를 시작하는 경로와 조사 중 추가 자료를 읽는 경로를 분리한다. Grafana의 webhook contact point는 장애 이벤트를 전달하고, 등록한 Grafana 연동은 조사에 필요한 메트릭, 대시보드와 알림 데이터를 조회하는 데 쓰인다.

## 연결과 권한

현재 AWS 문서는 Grafana 9.0 이상, HTTPS 접근과 읽기 권한이 있는 service account token을 요구한다. Grafana 인스턴스를 AWS 계정에 등록한 뒤 필요한 Agent Space에 연결한다. 비공개 endpoint는 private connectivity를 별도로 구성한다.

**Grafana 연동의 도구는 읽기 전용이며 쓰기 도구는 활성화할 수 없다.** 조사 결과가 나왔다고 대시보드, 알림이나 실제 서비스가 수정됐다고 해석하지 않는다.

## 전달 성공과 조사 맥락을 구분한다

Webhook payload의 `data`는 수신되지만 조사 맥락에는 포함되지 않는다. 에이전트에 전달되는 것은 `title`, `description`, `priority`와 incident reference다. AWS의 Grafana 템플릿은 `summary` annotation을 `description`으로 매핑하므로 조사에 필요한 증상과 대상 정보를 여기에 담는다. 라벨을 `data.metadata`에 넣는 것만으로 에이전트가 이를 읽는다고 가정하지 않는다.

Webhook 인증은 연동 종류에 맞춘다. Bearer token과 HMAC은 다른 방식이며, HMAC은 timestamp와 payload에 대한 서명을 검증한다. 비밀 값은 문서와 알림 본문에 넣지 않는다.

## 운영 확인

다음은 전달과 조회 경계를 확인하기 위한 점검 제안이다.

1. 테스트 알림의 HTTP 성공, 조사 생성과 조사에 전달된 설명을 각각 확인한다.
2. 실제 firing과 resolved 이벤트가 같은 장애를 가리키는지 확인한다.
3. 조회 권한 부족과 네트워크 실패를 실제 서비스 장애와 구분한다.
4. 제안된 원인은 원래 메트릭과 로그로 대조하고, 복구는 변경 결과와 서비스 회복 지표로 확인한다.

문서 대조 범위는 self-managed Grafana 연동이다. 다른 Grafana 배포 형태의 알림 기능과 현재 서비스 지원 범위는 별도로 확인한다. 실제 계정에 연결하거나 webhook을 전송한 검증은 수행하지 않았다.

## 출처

- [AWS DevOps Agent, Connecting Grafana](https://docs.aws.amazon.com/devopsagent/latest/userguide/connecting-telemetry-sources-connecting-grafana.html)
- [AWS DevOps Agent, Invoking DevOps Agent through Webhook](https://docs.aws.amazon.com/devopsagent/latest/userguide/configuring-integrations-and-knowledge-invoking-devops-agent-through-webhook.html)

## 관련 문서

- [[Grafana-Alerting|Grafana 알림 평가와 전달]]
- [[Incident-Runbook|장애 대응 런북]]
- [[Observability-Reliability|관측성 신뢰성]]
