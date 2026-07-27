---
tags: [observability, sre, alerting, incident-response]
status: index
category: "관측가능성(Observability)"
aliases: ["Observability Reliability", "관측성 신뢰성", "관측 신호 기반 알림과 장애 대응"]
---

# 관측성 신뢰성 (reliability 인덱스)

관측 신호를 목표(SLO)와 알림으로 바꾸고, 알림에서 장애 대응까지 잇는 문서를 모은다. 신뢰성 목표 정의, 알림 설계와 코드화, 런북, 배포 가시성이 한 축이다.

## 문서
- [x] [[SLI-SLO|SLI / SLO / Error budget (9의 의미, burn rate, 버짓 정책)]]
- [x] [[Alert-Fatigue|Alert fatigue 방지 (actionable, 증상 기반, burn rate, 그룹핑)]]
- [x] [[Alert-as-Code|Alert as Code (Terraform+YAML SSOT, proxy 계층 표준화, grouped alert, custom action 권한, deadman switch)]]
- [x] [[Incident-Runbook|Incident runbook (절차서, 알람 연결, 완화 우선)]]
- [x] [[Deploy-Observability|배포 가시성 (APM 스팬 태그 공통 신호, 멀티 플랫폼 통합 탐지, 장애 스레드 자동 첨부)]]

## 관련 문서
- [[관측가능성(Observability)|카테고리 인덱스]]
- [[안정성엔지니어링(Reliability)|안정성엔지니어링 카테고리]]
- [[Prometheus|Prometheus (Alertmanager 라우팅)]]
- [[RED-USE-Method|RED / USE method (증상 기반 알림의 근거)]]
