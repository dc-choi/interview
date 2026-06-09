---
tags: [reliability, sre, postmortem, rca, incident, blameless]
status: done
category: "안정성엔지니어링(Reliability)"
aliases: ["RCA Postmortem", "근본 원인 분석", "Root Cause Analysis", "포스트모템", "Blameless Postmortem", "RCA / Postmortem 문화"]
---

# RCA / Postmortem 문화

장애를 **개인의 실수가 아니라 시스템의 결함이 드러난 사건**으로 보고, 같은 일이 다시 일어나지 않게 학습으로 전환하는 절차다. 복구가 불을 끄는 일이라면([[Incident-Recovery-Prevention]]), 포스트모템은 **왜 불이 났는지 구조를 고치는 일**이다. 안 적으면 같은 장애가 분기마다 반복된다.

## Blameless — 비난하지 않는 이유

사람을 탓하면 다음 장애 때 **사실이 숨겨진다**. 누가 무엇을 눌렀나가 아니라, 왜 그 행동이 그 순간 합리적으로 보였고 시스템이 그걸 왜 못 막았나를 본다.

- 잘못된 배포 한 번으로 전체가 죽었다 → 사람을 자르는 게 아니라 **카나리, 헬스체크, 자동 롤백이 없던 것**이 결함이다.
- 비난 문화는 정보 은폐를 부르고, 은폐는 재발을 부른다. 심리적 안전이 곧 안정성 투자다.

## 포스트모템 구성 요소

| 항목 | 내용 |
|---|---|
| **요약** | 무슨 일이, 얼마나, 누구에게 |
| **영향 범위** | 영향받은 사용자/요청 수, 매출, SLO/에러 버짓 소모 |
| **타임라인** | 발생 → 탐지 → 완화 → 복구의 시각별 기록 |
| **근본 원인** | 기여 요인들을 인과로 정리 |
| **무엇이 잘 됐나** | 빠른 탐지, 좋은 런북 등 강화할 점 |
| **액션 아이템** | 재발 방지 과제 (오너, 기한, 추적) |

## RCA 기법 — 근본 원인은 보통 하나가 아니다

- **5 Whys**: 왜를 반복해 표면 증상에서 구조적 원인까지 내려간다. 단, "왜"가 사람을 향하면 멈추고 시스템으로 돌린다.
- **기여 요인(contributing factors)**: 대형 장애는 단일 원인 신화가 아니라 여러 결함이 겹친 결과다(스위스 치즈 모델). "근본 원인 1개"로 닫지 말고 막을 수 있었던 모든 지점을 적는다.
- **반사실 점검**: 어느 방어선이 하나라도 작동했으면 막혔을까를 짚어 액션을 도출한다.

## 액션 아이템이 핵심 — 없으면 그냥 의식

포스트모템의 가치는 문서가 아니라 **실행된 재발 방지**에 있다.

- 각 액션은 **오너, 기한, 추적 가능한 티켓**을 갖는다(SMART).
- "더 조심하자"는 액션이 아니다 — 알람 추가, 가드 추가, 자동화 같은 **시스템 변경**이어야 한다.
- 우선순위는 에러 버짓 소모와 재발 가능성으로 매긴다. [[SLI-SLO|에러 버짓]] 소진 장애는 즉시 처리.

## 지표

- **MTTD**(탐지까지) — 관측성/알람 품질. [[Incident-Detection-Logging]]
- **MTTR**(복구까지) — 런북/자동화 성숙도. [[Incident-Runbook]]
- **MTBF**(장애 간 간격), **재발률** — 액션 아이템이 실제로 먹히는지의 증거

## 흔한 함정

- 사람을 탓함 → 다음 장애에 정보 은폐
- 근본 원인을 1개로 닫음 → 다른 기여 요인 방치
- 액션 아이템에 오너/기한이 없음 → 영원히 안 함
- 큰 장애만 포스트모템 → 작은 반복 장애의 누적 비용을 놓침
- 포스트모템을 적고 어디에도 공유 안 함 → 조직 학습 안 됨

## 면접 체크포인트

- blameless가 안정성 투자인 이유 (은폐 → 재발 고리 차단)
- 단일 근본 원인 신화 비판, 기여 요인과 스위스 치즈 모델
- 액션 아이템의 조건(오너/기한/시스템 변경)과 "의식이 된 포스트모템"
- MTTD/MTTR/MTBF가 각각 어느 역량을 비추는지
- [[Incident-Recovery-Prevention|복구/등급]]과 포스트모템(학습)의 역할 분리

## 출처

- [Google SRE Book — Postmortem Culture: Learning from Failure](https://sre.google/sre-book/postmortem-culture/)
- [Atlassian — Incident postmortem / blameless RCA](https://www.atlassian.com/incident-management/postmortem)

## 관련 문서

- [[Incident-Recovery-Prevention|장애 복구와 재발 방지 (P1~P4, 사전 예방)]]
- [[Incident-Runbook|Incident runbook (대응 절차서)]]
- [[Incident-Detection-Logging|장애 감지와 로깅]]
- [[SLI-SLO|SLI/SLO/에러 버짓]]
- [[Alert-Fatigue|Alert fatigue 방지]]
