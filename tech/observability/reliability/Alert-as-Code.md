---
tags: [observability, alerting, iac, terraform, sre, incident-response]
status: done
category: "관측가능성(Observability)"
aliases: ["Alert as Code", "알림 표준화", "Alert 시스템 IaC", "알림 코드화"]
---

# Alert as Code — 알림 시스템 표준화와 IaC 운영

알림이 도구별(모니터링 대시보드, 클라우드 알람, 개별 Lambda, 온콜 도구)로 흩어져 만들어지면 메시지 포맷이 제각각이고, 누가 어떤 알림을 책임지는지 불명확하며, 장애 대응(MTTD, MTTA, MTTR)이 늦어진다. 해법은 **알림 정의를 코드로 옮겨 단일 레포에서 IaC로 관리**하는 것 — 단일 진실 공급원(SSOT), PR 리뷰, 버전 추적, 조직 컨벤션 강제가 한 번에 따라온다.

## 알림을 코드로 정의하기

- **Terraform 모듈 + YAML 정의**: 알림 하나가 파일 하나. datasource, query, threshold, condition, 메시지, Runbook 링크, 대시보드 링크까지 선언적으로
- **디렉터리 구조가 곧 분류 체계**: `{대분류}/{소분류}/{심각도}/{이름}.yml` (예: infrastructure/network/warning/high-latency-alert.yml) — 위치만 봐도 소유와 심각도가 드러난다
- **CODEOWNERS로 책임 구조 명시**: 디렉터리별 소유 팀이 PR 리뷰로 강제됨
- **진입장벽 낮추기**: 문법 단순화, 예시 제공, LLM 보조로 알림 작성 비용을 낮춰야 코드화가 정착된다

## Proxy 계층 — 메시지 표준화의 관문

평가 엔진(Grafana)이 Slack, 온콜 도구로 직접 쏘지 않고 **중간 proxy(Lambda)를 경유**시킨다.

- 모든 알림이 한 관문을 지나므로 **메시지 포맷(Block Kit 카드)이 강제로 통일**된다
- 스레드 추적 상태를 저장(DynamoDB)해 **grouped alert** 구현: 같은 알림의 상태 변화(새 대상 추가, 해결된 대상)를 Slack 스레드 하나에서 배치로 추적 — 알림 폭주 대신 스레드 업데이트
- 반복 패턴(큐 적체, Pod OOM, ALB 에러, Lambda 실패)은 **Template과 Matrix**로 공통화해 변수만 바꿔 다중 생성

## Custom Action — 알림에서 바로 조치

알림 카드에 조치 버튼(shell 명령 실행)을 붙여 인지에서 조치까지의 거리를 줄인다. 단, 실행 권한이 핵심:

- label 값 치환에 shell quoting 적용 (인젝션 방지)
- 위험 작업은 confirm dialog로 보호
- **IAM session tag 기반 AssumeRole 권한 검증** — 버튼을 누른 사람이 그 조치 권한이 있는지 확인. 알림 채널이 곧 실행 채널이 되면 권한 통제가 보안 경계가 된다 ([[Deployment-Automation-ChatOps|ChatOps]]와 같은 축)

## 감시자를 감시하기 — 이중화

모니터링 시스템 자체가 죽으면 알림 부재가 정상으로 보인다.

- 1차: 평가 엔진 기반 메트릭 알림
- 2차: **deadman switch** — heartbeat가 끊기면(알림 시스템이 침묵하면) 별도 경로(CloudWatch)로 경보. 신호의 부재를 신호로 만든다

## 성과와 남는 과제

- 사례 (AB180 Airbridge DevOps, 2026): 알림 정의 단일 레포 통합, Runbook 97개 작성 유지, MTTA/MTTR 데이터 추적 시작
- 남는 과제가 시사하는 것: **수집한 지표를 근거로 알림을 가지치기하는 단계**가 코드화 다음의 숙제 — 코드화는 관리를 가능하게 할 뿐, 알림 품질([[Alert-Fatigue|actionable 원칙]])은 별도 작업이다. IaC provider의 API 제약(rule group 등)도 도구 선택 변수

## 체크포인트

- 알림이 몇 개의 도구에서 각각 만들어지고 있는가, 전체 목록을 한곳에서 볼 수 있는가
- Alert as Code가 가져오는 것 네 가지 — SSOT, PR 리뷰, 버전 추적, 컨벤션 강제
- proxy 계층을 두는 이유 (포맷 통일, grouped alert, 상태 추적)
- 알림에서 바로 실행하는 버튼의 권한 통제 (session tag, confirm, quoting)
- deadman switch가 필요한 이유 — 알림 시스템의 침묵은 기본적으로 감지되지 않는다
- 코드화 이후의 숙제 — 지표 기반 알림 가지치기

## 출처

- [Alert 시스템을 표준화하고 IaC로 운영하기 — AB180 엔지니어링 블로그](https://engineering.ab180.co/stories/standardizing-alert-system-with-iac)

## 관련 문서

- [[Alert-Fatigue|Alert fatigue 방지 (actionable, 증상 기반)]]
- [[Incident-Runbook|Incident runbook (알람 연결)]]
- [[Deploy-Observability|배포 가시성 (장애 스레드 자동 첨부)]]
- [[IaC|IaC (Infrastructure as Code)]]
- [[Deployment-Automation-ChatOps|배포 자동화, ChatOps]]
- [[SLI-SLO|SLI / SLO (MTTD, MTTA, MTTR 개선 목표)]]
