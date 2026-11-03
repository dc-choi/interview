---
tags: [ai, forecasting, routing, evaluation, traffic]
status: done
verified_at: 2026-11-04
category: "AI엔지니어링(AIEngineering)"
aliases: ["경로 선택과 통행시간 예측 평가", "Route Travel Time Prediction", "ETA 예측"]
---

# 경로 선택과 통행시간 예측 평가

내비게이션의 품질에는 경로를 찾는 계산, 그 경로의 통행시간 예측과 실제 주행 결과가 함께 들어간다. 계산을 빨리 끝내는 것과 도착시간을 정확히 맞히는 것은 서로 다른 평가 대상이다.

## 계산 속도와 예측 오차를 나눈다

[[Contraction-Hierarchies|CCH]]는 그래프 전처리, 가중치 반영과 질의를 나누어 변하는 비용으로 최단 경로를 빠르게 찾는 기법이다. 입력 비용이 실제 통행시간과 맞는지까지 보장하는 예측 모델은 아니다. 따라서 경로 질의 지연이 줄었다는 결과를 도착시간 오차 감소로 해석하지 않는다.

다음은 평가를 나누기 위한 설계 제안이다.

| 평가 대상 | 확인할 값 | 다른 평가를 대신하지 못하는 이유 |
|---|---|---|
| 경로 계산 | 같은 도로망과 비용에서 질의 시간, 복원 경로의 비용 | 입력 비용 자체가 틀릴 수 있다 |
| 통행시간 예측 | 예측 시점, 예상 시간과 실제 소요시간의 차이 | 시간이 정확해도 다른 경로가 더 나을 수 있다 |
| 경로 선택 결과 | 비교 가능한 조건에서 실제 이동시간과 선택 목적 | 한 번의 주행만으로 앱 전체 우열을 정할 수 없다 |

출발 때의 ETA와 주행 중 갱신한 ETA를 따로 기록한다. 도착 직전 갱신값만 평가하면 출발 결정을 돕던 최초 예측의 오차를 가릴 수 있다. 평균 오차 외에 크게 늦어지는 사례와 도로 유형별 오차를 확인한다.

## 현재 관측과 미래 통행시간을 구분한다

실시간 교통정보는 현재 도로 상태를 설명하지만 운전자가 나중에 진입할 때의 상태와 같지 않을 수 있다. Google DeepMind의 2020년 공개 사례는 실시간 관측과 과거 교통 패턴을 결합해 미래 통행시간을 예측한다. 이는 당시 설계 사례이며 현재 모든 내비게이션의 구현을 설명하지 않는다.

그 사례의 GNN은 도로 구간을 노드로, 연속되거나 교차로에서 연결된 구간 사이를 엣지로 표현한다. 인접 구간을 묶은 Supersegment를 이용해 연결 관계를 학습하고 회전, 합류와 정체의 영향을 다룬다. 경로 탐색용 그래프의 교차로 노드와 예측 모델의 도로 구간 노드를 같은 표현으로 혼동하지 않는다.

운영 적용 제안: 모델 비교에서는 예측 시점에 알 수 있었던 입력만 사용하고, 도로와 시간대별 관측 범위를 확인한다. 전체 표본 수가 많다는 사실만으로 특정 구간의 최신 정보가 충분하다고 판단하지 않는다. 시간 분할과 미래 정보 누출은 [[Time-Series-Forecast-Evaluation|시계열 예측 평가]]에서 다룬다.

## 추천을 따른 차량이 환경을 바꿀 수 있다

내비게이션 추천을 따른 차량의 이동은 이후 교통 상황의 입력이 된다. 따라서 관측된 빠른 경로와 많은 차량이 안내를 따른 뒤의 경로를 같은 조건으로 보지 않는다.

2026년 Nature Communications 연구는 피렌체, 밀라노와 로마의 차량 GPS 기록 및 내비게이션 추천 경로를 이용한 시뮬레이션에서 이용 비율과 경로 다양성의 관계를 비교했다. 높은 이용 비율에서 경로 집중이 나타났지만, 이 결과를 특정 국내 앱의 장애 원인이나 모든 도로의 지연 보장으로 옮기지 않는다. 연구는 비동적 설정의 결과이며 서비스와 사용자가 계속 적응하는 피드백 전체를 재현한 것은 아니다.

평가 제안: 개별 이용자의 ETA 오차와 함께 추천 경로의 집중도, 채택 비율과 재탐색 조건도 기록한다. 한 경로의 예측 개선이 전체 도로망의 정체 감소를 보장하는지는 별도 실험으로 확인한다.

## 출처

- [Customizable Contraction Hierarchies — Julian Dibbelt, Ben Strasser, Dorothea Wagner](https://arxiv.org/abs/1402.0402)
- [Traffic prediction with advanced Graph Neural Networks — Google DeepMind](https://deepmind.google/blog/traffic-prediction-with-advanced-graph-neural-networks/) — 2020년 공개 구현 사례
- [The traffic concentration effects of urban navigation services — Nature Communications](https://www.nature.com/articles/s41467-026-75254-8) — 2026년 세 도시 시뮬레이션과 비동적 설정의 한계

## 관련 문서

- [[Contraction-Hierarchies|축약 계층과 도로망 최단 경로]]
- [[Time-Series-Forecast-Evaluation|시계열 예측 평가]]
- [[Model-Feedback-Loop-and-Validation|모델 피드백 루프와 검증]]
