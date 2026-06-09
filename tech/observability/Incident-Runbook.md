---
tags: [observability, runbook, incident, on-call, sre, operations]
status: done
category: "관측가능성(Observability)"
aliases: ["Incident Runbook", "Incident runbook", "런북", "Runbook", "대응 절차서"]
---

# Incident Runbook

런북은 **특정 알람/장애가 떴을 때 무엇을 어떤 순서로 확인하고 조치하는지** 적은 절차서다. 새벽 3시에 깬 당직자가 머리로 떠올리지 않고 **따라가기만 하면 되게** 만들어 MTTR을 줄이고, 대응을 사람에 의존하지 않게 한다. [[RCA-Postmortem]]

## 왜 필요한가

- **MTTR 단축**: 진단 경로를 미리 정해두면 헤매는 시간이 준다. [[Incident-Detection-Logging]]
- **속인성 제거**: 특정 시니어만 아는 지식을 문서로 옮겨 누구나 1차 대응 가능.
- **스트레스 하 일관성**: 압박 상황에서 빠지기 쉬운 단계를 강제.

## 무엇을 담나

- **트리거**: 어떤 알람/증상에서 이 런북을 펴는가.
- **영향/긴급도**: 사용자 영향과 에스컬레이션 기준.
- **진단 단계**: 무엇을 어떤 대시보드/쿼리로 확인하는지(순서대로). 대시보드/로그 링크 직접 첨부.
- **완화 조치**: 롤백, 스케일업, 기능 플래그 off, 트래픽 차단 등 **되돌리기 쉬운 것부터**.
- **에스컬레이션**: 안 풀리면 누구를 언제 부르는가.
- **검증**: 조치 후 정상 복귀를 어떻게 확인하는가.

## 알람과 묶는다

런북은 **알람에서 한 번에 닿아야** 가치가 있다. 알람 메시지에 런북 URL을 박아 [[Alert-Fatigue|받는 즉시 행동]]으로 잇는다. 런북 없는 알람은 "받았는데 뭘 하지"가 된다.

## 완화 우선, 진단은 나중

장애 대응의 기본 순서는 **먼저 출혈을 멈추고(완화), 원인 분석은 복구 후**다. 런북도 이 순서를 따른다 — 롤백/플래그 off 같은 빠른 완화를 앞에 두고, 근본 원인은 [[RCA-Postmortem|포스트모템]]으로 넘긴다.

## 살아있게 유지하기

- **장애 때마다 갱신**: 포스트모템 액션 아이템으로 런북을 보강.
- **드릴/게임데이**: 주기적으로 실제로 돌려봐 낡은 절차를 걸러낸다. 안 돌려본 런북은 [[DR-Strategy|DR 드릴]]처럼 정작 필요할 때 틀어진다.
- **코드 근처에 보관**: 위키 깊숙이 두지 말고 알람/저장소에서 바로 닿게.

## 흔한 함정

- 런북이 오래돼 명령어/대시보드 링크가 깨짐 → 더 헷갈림
- 완화보다 원인 분석을 먼저 시켜 출혈이 길어짐
- 알람에 런북이 연결 안 됨 → 존재해도 안 펴봄
- 너무 추상적("상황을 확인한다") → 따라갈 수 없음
- 자동화 가능한 절차를 계속 수동 런북으로 → 자동 완화로 승격 가능

## 면접 체크포인트

- 런북이 MTTR/속인성/일관성에 기여하는 방식
- 담아야 할 항목(트리거, 진단 순서, 완화, 에스컬레이션, 검증)
- 알람-런북 연결의 중요성([[Alert-Fatigue]])
- 완화 우선, 원인 분석은 복구 후라는 순서
- 드릴/포스트모템으로 런북을 살아있게 유지하는 법

## 출처

- [Google SRE Book — Being On-Call / Emergency Response](https://sre.google/sre-book/being-on-call/)
- [PagerDuty — Runbook documentation](https://www.pagerduty.com/resources/learn/what-is-a-runbook/)

## 관련 문서

- [[RCA-Postmortem|RCA / Postmortem (런북 보강)]]
- [[Alert-Fatigue|Alert fatigue (알람-런북 연결)]]
- [[Incident-Detection-Logging|장애 감지와 로깅]]
- [[DR-Strategy|DR 전략 (드릴)]]
- [[SLI-SLO|SLI/SLO]]
