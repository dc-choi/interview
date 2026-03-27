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
| **Revenue** | 돈을 내는가? | 유료 전환율, ARPU |
| **Referral** | 다른 사람에게 알리는가? | 추천 전환율, NPS |

## North Star Metric (NSM)

제품의 핵심 가치를 하나의 지표로 압축한 것. 모든 팀의 활동이 이 지표를 올리는 방향으로 정렬되어야 한다.

**좋은 NSM의 조건:**
- 고객에게 전달되는 가치를 반영
- 수익과 상관관계가 높음
- 팀이 영향을 줄 수 있음

**회사 유형별 예시:**
- 마켓플레이스: 주간 거래 건수 (에어비앤비)
- SaaS: 주간 활성 팀 수 (Slack)
- 미디어: 총 시청 시간 (YouTube)
- 피트니스 앱: 완료된 운동 수

## Leading vs Lagging 지표

| 구분 | Leading (선행) | Lagging (후행) |
|---|---|---|
| 시점 | 미래를 예측 | 과거를 측정 |
| 용도 | 조기 개입 | 성과 평가 |
| 예시 | 온보딩 완료율 | 월 매출 |

**원칙:** Leading 지표를 움직이면 Lagging 지표가 따라온다.

## Vanity vs Actionable 지표

- **Vanity:** 보기엔 좋지만 의사결정에 쓸 수 없음 (총 가입자 수, 페이지뷰)
- **Actionable:** 행동을 바꾸는 근거가 됨 (전환율, 리텐션율, 코호트별 활성도)

## 코호트 분석

같은 시기에 가입한 사용자 그룹의 행동을 시간축으로 추적한다. 리텐션 커브가 수평으로 안정되면(flattening) 제품이 PMF에 가까워지고 있다는 신호이다.

## 현장 적용: school-manage

- **NSM:** "월간 활성 모임 중, 주간 출석 기록 1회 이상을 지속 수행한 비율"
- **AARRR 적용:** Acquisition(채널별 유입) → Activation(첫 주 학생 등록+출석) → Retention(WAU) → Revenue(미검증) → Referral(사제 네트워크)
- **데이터 소스 분리:** DB 기반(핵심 운영 지표) + GA4(획득/이탈 분석)
- **코호트 분석:** 2월 중순 0% → 2월 하순 15% → 3월 36% (제품 개선 효과 검증)

## 면접 포인트

Q. 어떤 지표를 추적하고 왜 그 지표를 선택했는가?
- AARRR 프레임워크로 퍼널 전체를 구조화
- NSM: "활성 모임의 주간 출석 지속 비율" — 제품 핵심 가치와 직결
- Leading 지표(온보딩 완료율)로 Lagging(WAU)을 예측하여 조기 개입

## 관련 문서
- [[PMF-Funnel|PMF 검증 & 전환 퍼널]]
- [[Data-Driven-Decision|데이터 기반 의사결정]]
