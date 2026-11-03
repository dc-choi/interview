---
tags: [machine-learning, fairness, evaluation, proxy]
status: done
verified_at: 2026-11-03
category: "AI엔지니어링(AIEngineering)"
aliases: ["대리변수와 모델 공정성", "Proxy Discrimination", "Fairness through Unawareness"]
---

# 대리변수와 모델 공정성

민감 속성을 입력에서 빼는 것만으로 집단 간 불리한 결과를 막을 수는 없다. 다른 특성이나 특성의 조합이 그 정보를 대신 나타낼 수 있기 때문이다. 이를 민감 속성의 대리변수(proxy)라고 한다.

## 입력 제외와 결과의 공정성은 다르다

가령 집단 속성을 제거해도 거주 지역이 남아 있고 지역별 집단 분포가 다르면, 지역이 집단 정보를 간접적으로 전달할 수 있다. 이는 가능한 메커니즘의 예시다. 어떤 시스템의 차별 여부는 실제 데이터와 결과로 따로 확인한다.

- **직접 사용 여부:** 민감 속성을 예측 입력에 넣었는지 확인한다.
- **간접 정보:** 남은 특성의 조합이 민감 속성과 관련되는지 확인한다. 열 하나를 삭제해도 중복된 정보 표현이 남을 수 있다.
- **결과의 영향:** 어떤 집단이 기회를 덜 얻거나 더 많은 오류를 겪는지 확인한다. 입력에서 속성을 뺐다는 사실과 별도 질문이다.

상관된 특성을 찾았다고 원인과 피해까지 확정하지 않는다. 입력 데이터, 학습 목표, 판정 기준과 실제 결과를 함께 살펴야 한다. 과거의 선발 결과를 라벨로 쓰는 경우 그 라벨이 측정하려는 능력을 제대로 나타내는지도 점검한다(평가 설계 제안).

## 무엇을 같게 만들 것인지 먼저 정한다

다음은 이진 분류에서 쓰는 서로 다른 기준이다. 바람직한 결과를 양성으로 정의한 경우를 전제로 한다.

| 기준 | 집단 사이에서 비교하는 값 | 해석의 경계 |
|---|---|---|
| Demographic parity | 양성으로 예측한 비율 | 실제 양성 여부로 조건을 나누지 않음 |
| Equal opportunity | 실제 양성 중 양성으로 예측한 비율(TPR) | 실제 음성에서의 오탐률까지 같다는 뜻은 아님 |
| Equalized odds | TPR과 실제 음성에서의 양성 예측 비율(FPR) | Equal opportunity보다 강한 조건 |

Equal opportunity와 Equalized odds는 실제 라벨에 조건을 둔다. 라벨이 과거 판정의 편향을 담고 있으면 기준을 만족해도 그 편향이 남을 수 있어 라벨의 품질을 별도로 점검한다(조건부 정의에서 이끈 해석).

공정성 기준은 하나가 아니고, 기준끼리 동시에 만족되지 않는 경우가 있다. 어떤 피해를 줄일지와 데이터의 의미에 맞게 고르며, 전체 정확도나 지표 하나의 통과를 모든 집단과 상황의 공정성 보장으로 확대하지 않는다. 이 표는 기술적 평가 기준이며 개별 결정의 적법성 판정이 아니다.

## 평가에 적용하는 순서

다음은 위 개념을 작은 평가에 적용하는 점검 제안이다.

1. 예측의 대상과 그 결과가 만드는 기회 또는 오류 비용을 정의한다.
2. 예측 입력과 평가용 집단 정보를 구분한다. 평가가 필요하다는 이유만으로 민감 속성을 새로 수집하지 않고 목적과 접근 범위를 먼저 확인한다.
3. 전체 성능 지표(정확도 등)와 집단별 표본 수, 실제 양성 비율, 양성 예측 비율(선발률), TPR과 FPR을 함께 본다. 작은 집단의 불안정한 비율을 확정적인 격차로 해석하지 않는다.
4. 대리변수 후보 제거, 데이터와 라벨 수정, 판정 기준 조정 전후를 같은 평가 조건에서 비교한다. 한 특성을 삭제한 결과만으로 모든 간접 정보가 사라졌다고 판단하지 않는다. 집단마다 다른 판정 기준을 쓰는 조정은 비교 실험과 실제 적용을 구분하고, 적용 전에 해당 영역의 법적 제한을 검토한다.
5. 남은 격차, 측정하지 못한 집단과 라벨의 한계를 기록한다.

추천시스템에서는 이진 분류의 선발률을 노출 공정성으로 그대로 옮기지 않는다. 사용자와 공급자 중 누구의 어떤 결과를 비교할지 먼저 정하고 [[Recommendation-System-Ranking-Reranking|랭킹과 리랭킹]]의 노출 조건과 연결한다.

## 확인 범위

2026-11-03 Google의 용어집과 연구 설명, Fairlearn의 공정성 개념 문서를 대조했다. 실제 사례의 원인, 모델의 실제 동작과 완화 효과는 검증하지 않았다. 정의와 평가 기준을 정리한 문서이며 실제 데이터의 공정성 평가 결과가 아니다.

## 출처

- [Google for Developers, Machine Learning Glossary: Responsible AI](https://developers.google.com/machine-learning/glossary/responsible-ai) — 대리변수, 입력 제외의 한계와 공정성 기준
- [Equality of Opportunity in Machine Learning — Google Research](https://research.google/blog/equality-of-opportunity-in-machine-learning/) — 특성 조합의 간접 정보와 기회 균등의 의미
- [Fairlearn, Fairness in Machine Learning](https://fairlearn.org/main/user_guide/fairness_in_machine_learning.html) — 피해 중심 평가, 집단별 기준의 조건부 정의(Equalized odds의 FPR 조건 포함)와 적용 맥락
- [인종나이 안 넣었는데 AI가 차별을 배우는 방식 — YouTube, 리얼버프](https://www.youtube.com/watch?v=MsIui_Wa8Ok) — 학습 계기로 사용했다. 영상의 채용 사례와 원인 추정은 검증하지 않아 반영하지 않았다.

## 관련 문서

- [[AI-Hiring-Discrimination-Liability|채용 AI의 차별 책임]]
- [[Evaluation-Driven-Development|평가 주도 개발]]
- [[Recommendation-System-Ranking-Reranking|추천시스템 랭킹과 리랭킹]]
- [[Recommendation-System-Feedback-Data|추천시스템 피드백 데이터]]
