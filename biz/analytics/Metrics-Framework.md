---
tags: [business, metrics, analytics]
status: done
category: "비즈니스&제품(Business&Product)"
aliases: ["Metrics Framework", "지표 설계", "AARRR", "North Star Metric"]
---

# 지표 설계 & North Star Metric

## AARRR (Pirate Metrics)

Dave McClure(500 Startups)가 제안한 스타트업 성장 지표 프레임워크이다.

| 단계 | 질문 | 예시 지표 |
|---|---|---|
| **Acquisition** | 사용자가 어떻게 오는가? | 채널별 유입, 가입 수 |
| **Activation** | 핵심 가치를 경험했는가? | 온보딩 완료율, Aha moment 도달 |
| **Retention** | 다시 오는가? | DAU/MAU, 주간 리텐션 |
| **Referral** | 다른 사람에게 알리는가? | 초대 전환율, 바이럴 계수 |
| **Revenue** | 돈을 내는가? | 유료 전환율, ARPU |

## North Star Metric (NSM)

제품이 전달하는 핵심 가치를 하나의 공통 지표로 압축한 것이다. 모든 업무가 이 지표를 직접 올려야 하는 것은 아니며, 수익성, 품질과 위험을 보는 보호 지표 및 팀별 책임 지표와 함께 사용한다.

**좋은 NSM의 조건:**
- 고객에게 전달되는 가치를 반영
- 수익과 상관관계가 높음
- 팀이 영향을 줄 수 있음

**제품 유형별 후보 예시:**
- 마켓플레이스: 주간 완료 거래 건수
- SaaS: 주간 활성 팀 수
- 미디어: 유효 시청 시간
- 피트니스 앱: 완료된 운동 수

## Leading vs Lagging 지표

| 구분 | Leading (선행) | Lagging (후행) |
|---|---|---|
| 시점 | 후행 성과보다 먼저 관찰되는 후보 신호 | 이미 발생한 성과를 측정 |
| 용도 | 조기 개입 가설 설정 | 성과 평가 |
| 예시 | 온보딩 완료율 | 월 매출 |

**원칙:** 선행 지표의 변화는 후행 지표를 움직일 수 있다는 가설일 뿐, 인과를 보장하지 않는다. 기능이 선행 지표를 올렸더라도 재배분, 계절성이나 계측 오류일 수 있다.

선행 지표를 의사결정에 쓰려면 다음을 확인한다.

1. 선행 지표가 어떤 사용자 행동을 거쳐 후행 성과로 이어지는지 인과 가설을 적는다.
2. 같은 코호트의 후행 지표와 가드레일 지표를 함께 본다.
3. 가능하면 대조군이 있는 실험으로 증분 효과를 검증하고, 불가능하면 관찰 연구의 한계를 명시한다.

## Vanity vs Actionable 지표

- **Vanity:** 분모, 코호트, 관찰 기간이나 다음 결정 없이 제시돼 행동을 바꾸기 어려운 지표. 총 가입자 수와 페이지뷰도 이런 맥락에서는 허수지표가 될 수 있다
- **Actionable:** 정의, 비교 기준과 다음 결정이 연결된 지표. 전환율, 리텐션율과 코호트별 활성도도 계측 계약과 비교 기준이 있어야 한다

### 허수지표의 메커니즘: 재배분 vs 증분

부분 지표의 상승은 전체의 증가(증분)일 수도, 기존 트래픽의 이동(재배분)일 수도 있다 — 신규 영역의 클릭이 늘어도 전체가 그대로면 발전이 아니라 유지다.

| 기능 | 허수지표 | 봐야 할 지표 |
|---|---|---|
| 화면 리뉴얼 | 신규 영역의 노출 수, 클릭 수 | 화면 전체 클릭 변동률, 탐색자의 전환율 |
| 신규 탭, 구좌 | 신규 탭의 유입과 클릭 | 전체 클릭 증감 — 증분 없으면 재배분일 뿐 |
| 신규 쿠폰 | 발행 횟수, 소진율 | 증분 거래액 — 어차피 일어났을 거래에 낀 할인 제외 |

오픈 직후의 상승(오픈빨)과 출시 기념 프로모션 효과는 기능 자체의 성과와 분리해서 측정해야 한다. 쿠폰의 ROAS도 같은 원리 — 이미 일어날 거래에 얹힌 할인은 성과가 아니라 비용이므로 증분 거래액을 별도로 추적한다.

허수지표가 생기는 흔한 원인은 측정 기술보다 출발점에 있다. 비즈니스 목표와 인과 가설 없이 기능 요청이 먼저 오고, 그 기능을 정당화할 지표를 나중에 찾으면 다음 결정을 만들기 어렵다.

## 코호트 분석

같은 시기에 가입한 사용자 그룹의 행동을 시간축으로 추적한다. 리텐션 커브가 수평으로 안정되면(flattening) 반복 가치와 유지 가설을 검토할 신호가 될 수 있지만, 단독으로 PMF를 판정하지는 않는다.

## 현장 적용: school-manage

- **운영 스냅숏:** 2026-07-15 기준 MAO(월간 활성 조직), 누적 본당, 모임 레코드는 서로 다른 지표로 관리했으며 구체적 수치는 공개하지 않는다. 활성 목표는 프로젝트 재개 결정 뒤에만 다시 검토한다.
- **AARRR 적용:** Acquisition → Activation(첫 단체, 학생, 출석을 같은 코호트로 연결) → Retention → Referral → Revenue. 현재 Activation 전환율은 계측 미완료로 미측정
- **데이터 소스 분리:** DB는 운영 지표, GA4는 사용자 행동 신호로 사용하며 서로 다른 분모를 섞지 않음
- **과거 코호트 수치:** 현재 코호트 정의로 재현되지 않는 스냅숏은 제품 개선 증거로 사용하지 않음

## 면접 포인트

Q. 어떤 지표를 추적하고 왜 그 지표를 선택했는가?
- AARRR 프레임워크로 퍼널 전체를 구조화
- MAO, 누적 본당과 사용자 MAU처럼 단위가 다른 지표를 분리
- 온보딩 전환은 같은 코호트 계측을 완성한 뒤에만 계산

## 출처
- [Startup Metrics for Pirates — SlideShare, Dave McClure](https://www.slideshare.net/slideshow/startup-metrics-for-pirates-long-version/89026)
- [허수지표가 되기 쉬운 KPI — 도그냥 (Brunch)](https://brunch.co.kr/@windydog/754)
- [A Dirty Dozen: Twelve Common Metric Interpretation Pitfalls in Online Controlled Experiments — Microsoft Research](https://www.microsoft.com/en-us/research/publication/a-dirty-dozen-twelve-common-metric-interpretation-pitfalls-in-online-controlled-experiments/)

## 관련 문서
- [[PMF-Funnel|PMF 검증 & 전환 퍼널]]
- [[Data-Driven-Decision|데이터 기반 의사결정]]
- [[Commerce-Pricing|커머스 가격 도메인]] — 쿠폰의 비용 효과 측정
