---
tags: [ai, evaluation, contrail, randomized-trial]
status: done
verified_at: 2026-11-04
category: "AI엔지니어링(AIEngineering)"
aliases: ["Contrail Avoidance Model Evaluation", "비행운 회피 모델의 현장 평가"]
---

# 비행운 회피 모델의 현장 평가

예측 모델의 현장 효과는 예측 정확도, 실행 여부와 실행 후 관측을 나누어 평가한다. 비행운 회피는 기상과 비행 정보를 이용해 회피 경로를 계획하고, 실제 운항 뒤 위성 자료로 결과를 확인하는 사례다.

## 배정된 집단과 실제 실행한 집단

2026년 공개된 항공사 주도 무작위 대조 연구의 분석 집단과 비행운 발생률 감소는 다음과 같다. 비교 대상은 대조군 1,172편이다.

| 분석 집단 | 항공편 수 | 대조군 대비 발생률 감소 |
|---|---:|---:|
| 회피 대상으로 배정된 집단(intent-to-treat) | 1,232 | 11.6% |
| 계획대로 회피한 집단(per-protocol) | 112 | 62.0% |

62.0%를 모든 항공편의 효과로 확대하지 않는다. 실제 실행한 부분집단에는 실행 가능 조건에 따른 선택 차이가 섞일 수 있다.

## 관측 지표와 추정 지표

비행운 발생률 감소와 비행운의 온난화 영향 감소는 다른 지표다. Cathay Pacific의 2026-09-06 발표는 80편 이상이 회피 경로를 따랐고 Google이 비행운의 온난화 영향을 약 40% 줄인 것으로 추정했다고 설명한다. 항공기 전체 CO₂ 배출량의 40% 감소로 읽지 않는다.

모델로 계산한 반사실 결과와 대조군 관측을 구분한다. 서로 다른 지표의 감소율로 성능 순위를 정하지 않는다.

## 연료 효과에도 집단과 보정 조건을 붙인다

위 무작위 연구의 항공기 종류 보정 후 연료 사용량 차이는 실제 회피 집단에서 +0.02%였고, 95% 신뢰구간은 -1.17%~+1.16%였다. 차이를 검출하지 못했다는 결과를 연료 영향이 없다는 증명으로 바꾸지 않는다.

배정 집단 전체에서는 -0.55%(p=0.044)로 달랐다. 연구진은 남은 교란 가능성과 작은 차이를 지적한다. 모든 분석 집단에서 유의한 차이가 없었다고 요약하지 않는다. 기종 보정 전후 결과도 섞지 않는다.

## 적용과 검증 범위

적용 제안: 예측 제공, 실제 실행과 추가 비용을 따로 집계하고 실행 불가능 조건도 보존한다.

2026-11-04 원문을 부분 대조했다. 분석은 재실행하지 않았으며 다른 노선의 효과는 미확인이다.

## 출처

- [Efficacy of Scalable Airline-led Contrail Avoidance — Google Research, Contrails.org, American Airlines, Flightkeys 연구진](https://arxiv.org/html/2603.06909v1) — 분석 집단, 비행운 발생률과 Table 3의 기종 보정 연료 비교.
- [Cathay Pacific and Google Partner to Research and Trial AI-Powered Contrail Avoidance — Cathay Pacific](https://news.cathaypacific.com/cathay-pacific-and-google-partner-to-research-and-trial-ai-powered-contrail-avoidance-53tnzj) — 별도 시험의 온난화 영향 추정과 운항 적용.

## 관련 문서

- [[Route-Travel-Time-Prediction|경로 선택과 통행시간 예측 평가]]
- [[Model-Feedback-Loop-and-Validation|모델 피드백 루프와 검증]]
