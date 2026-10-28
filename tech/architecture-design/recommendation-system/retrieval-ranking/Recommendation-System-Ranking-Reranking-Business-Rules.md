---
tags: [architecture, recommendation-system, reranking, business-rules, experimentation]
status: done
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Recommendation Business Rule Reranking", "추천 비즈니스 규칙 후처리", "Twiddler"]
---

# 추천 비즈니스 규칙 후처리

랭커가 효용을 추정한 뒤 surface별 노출 규칙을 결정적 후처리로 적용하는 계층이다. 규칙 모듈을 Twiddler라고 부르기도 한다. 하나의 목적함수로 표현하기 어려운 요구를 랭커 밖에서 처리하지만, 규칙이 바꾼 노출이 다시 학습과 실험 데이터가 되므로 랭커와 독립된 부품으로 다룰 수 없다. 상위 문서는 [[Recommendation-System-Ranking-Reranking|랭킹과 재랭킹]]이다.

## 어떤 요구를 규칙으로 두는가

- **규칙 계층:** 랭커 점수를 다시 매기지 않고 정해진 절차로 목록을 고치는 결정적 후처리다. 상위 N개 중 일정 비율 이상을 최신 콘텐츠로 채우는 quota나 같은 작성자, 판매자의 연속 노출 금지처럼 규칙을 거친 목록에서 제약이 성립하게 만드는 규칙과, 시즌 콘텐츠의 기간 한정 승격이나 이미 반응했거나 여러 번 노출된 아이템의 하향처럼 순서를 정해진 방식으로 바꾸는 규칙이 있다. 선택 확률을 남기지 않지만 파라미터는 A/B로 조정할 수 있다.
- **Soft objective:** 다양성, novelty와 탐색 승격처럼 정확도와 맞바꾸는 정도를 weight로 조절하며 실험하는 목표다.
- **Eligibility:** 재소비 허용이나 기간이 끝난 시즌 콘텐츠의 제외처럼 노출 자격 자체를 바꾸는 조건은 [[Recommendation-System-Eligibility-Availability|surface eligibility]]가 맡는다.

같은 요구도 여러 방식으로 만들 수 있다. 반복 노출 억제는 랭커 특징, soft objective, 하향 규칙이나 페이지의 피로도 penalty가 될 수 있다. 짧은 기간의 상호작용은 랭커 점수를 크게 바꾸기 어렵고 랭커보다 연산이 가벼운 규칙은 실시간 행동을 바로 반영할 수 있다. 실시간 반영이나 설명 가능한 보장이 필요하면 규칙, 정확도와의 교환을 연속적으로 조절해야 하면 soft objective, 노출 자체를 허용하지 않으면 eligibility로 둔다. 같은 아이템이 랭커의 반복 노출 특징, eligibility, 하향 규칙과 [[Recommendation-System-Page-Level-Optimization#Cross-row 중복과 피로도|페이지 피로도 penalty]]에 동시에 걸려 여러 번 감점되지 않도록 책임을 나눈다.

랭커 결과를 최대한 보존하려면 규칙상 같은 조건에 놓인 아이템 사이에서는 랭커 순서를 유지한다(안정 정렬). 규칙은 조건이 다른 아이템 사이의 상대 위치만 바꾼다.

## 대표 규칙과 파라미터

- **하향(downrank):** 사용자가 이미 클릭했거나 여러 번 반복 노출된 아이템의 순위를 일정 이상 낮춰 더 다양한 아이템을 보여 준다. 행동 로그를 볼 기간, 행동별 하향 기준과 하향 정도를 파라미터로 둔다. 노출 횟수는 API 응답이 아니라 실제 viewable impression으로 세고 판정 기준인 `impressionPolicyVersion`을 함께 남긴다([[Recommendation-System-Page-Level-Optimization#Viewport와 scroll attribution|viewport 기준]]).
- **간격(interval):** 미리 입력한 카테고리, 작성자 같은 메타 정보로 유사 아이템을 판단하고 그 사이에 최소 간격을 둔다. 최소 간격은 파라미터로 두되, 설정이 잘못 들어와도 사용자가 일정 거리를 스크롤하는 동안 유사 아이템이 다시 나오지 않도록 코드 안에 하한을 둘 수 있다.
- **최근 행동 조회:** 하향 규칙은 요청마다 사용자의 최근 행동을 읽는다. 앱 로그 stream에서 사용자와 아이템 사이의 행동만 걸러 Redis Sorted Set에 넣고 행동 시각을 score로 두면 원하는 기간만 범위 조회할 수 있다. Sorted Set의 member는 유일하므로 member에 event ID나 행동 시각을 넣어 반복 행동이 한 member로 합쳐지지 않게 하고, 하향에 필요한 최대 기간 밖의 score 범위는 주기적으로 잘라낸다. 이 저장소도 보유 기간과 [[Recommendation-System-Serving-Operations#삭제 전파|삭제 전파]] 대상에 넣는다.

파라미터를 코드 밖 설정으로 빼면 정책 변화에 코드 배포 없이 대응하고 A/B로 값을 탐색할 수 있다. 실험으로 찾은 값도 데이터와 사용자 행동이 바뀌면 낡으므로 주기적인 재탐색이 필요하다.

규칙 수가 늘면 최종 순서의 원인을 추적하기 어려워진다. 규칙마다 owner, 목적 지표, 만료일, 적용 빈도와 순위 변화량을 관리하고 효과가 확인되지 않는 규칙은 지운다. 시즌 승격에는 종료 시각을 둔다.

## 추적과 학습 데이터

- **결정 기록:** 노출 로그에는 노출된 아이템만 남으므로 규칙이 화면 밖으로 밀어낸 아이템의 흔적이 없다. 규칙 계층에 들어온 모든 후보에 대해 적용된 규칙 ID와 version, 평가 순서와 규칙별 순위 변화를 [[Recommendation-System-Feedback-Data#Ranking과 Slate|slate 기록]]에 남기고 impression과는 `servedSlateId`로 잇는다.
- **규칙 충돌과 실패:** 최신 비율 quota와 인접 노출 금지처럼 규칙끼리 부딪칠 수 있다. 우선순위, 모두 만족할 수 없을 때의 완화 순서와 underfill 처리를 설정에 고정한다. 규칙을 차례로 적용하면 뒤 규칙이 앞 규칙의 보장을 깰 수 있으므로(예: 하향 뒤 인접 노출 재발) 최종 slate에서 모든 규칙을 다시 검사하고 위반을 constraint violation 지표로 센다. 행동 저장소 timeout이나 reranker timeout 때 규칙을 건너뛸지 마지막 값으로 적용할지 미리 정하고 `degradationMode`를 기록한다([[Recommendation-System-Serving-Operations#Fallback ladder|fallback]]).
- **편향:** 화면 밖으로 밀린 아이템은 [[Recommendation-System-Feedback-Data#Exposure bias|exposure bias]], 화면 안에서 위치가 바뀐 아이템은 [[Recommendation-System-Feedback-Data#Position bias|position bias]]를 만든다. 기법은 편향 종류에 맞춘다.
  - Position bias: 실제 노출 위치를 학습 전용 특징으로 두고 서빙 때는 모든 후보에 같은 기본값을 준다. 위치 특징은 다른 특징과 교차하지 않고 더하는 항으로 둔다(Rules of ML 규칙 #36).
  - Exposure bias: 밀려난 아이템은 노출되지 않아 반응 label이 없으므로 특징이나 가중치로 복원할 수 없다. [[Recommendation-System-Ranking-Reranking#Exploration과 Exploitation|탐색]]이나 무작위화로 노출 확률을 기록한 데이터를 모은다.
  - 규칙을 끈 소규모 holdout은 규칙이 만든 왜곡이 없는 비교 데이터를 주지만, 랭커가 만든 노출과 위치 편향은 그대로 남고 해당 사용자는 반복 노출을 겪는다.
  - 규칙 영향 행의 가중치를 낮추는 것은 학습 분포를 바꾸는 휴리스틱이지 편향 교정이 아니다.
- **OPE:** 규칙이 금지한 slate는 logging 확률이 0이므로 규칙 없는 정책이 그 slate에 주는 확률 mass는 [[Recommendation-System-Off-Policy-Evaluation|OPE]]로 식별되지 않는다. 탐색을 쓰면 결정적 규칙을 sampling 전에 적용해 logging policy의 일부로 기록하거나 규칙과 sampler를 합친 composite 확률을 계산한다. 둘 다 아니면 sampling 뒤 규칙이 바꾼 slate는 `propensityStatus=INVALIDATED`로 OPE에서 제외한다([[Recommendation-System-Feedback-Data#Propensity와 Off-policy 데이터|propensity 계약]]).

## 배포와 실험

규칙 조합, 파라미터와 version은 [[Recommendation-System-Serving-Operations#Serving Bundle 계약|serving bundle]]의 reranker policy로 manifest에 고정하고, 실험 variant는 서로 다른 `bundleId`를 가리키게 한다. 랭커 서버의 인프라 배포는 모델별로 나눌 수 있지만([[Recommendation-System-Model-Serving-Platform|모델 서빙 플랫폼]]), 요청이 쓰는 랭커 version과 규칙 version의 조합은 bundle이 고정한다. 다만 모델 alias를 제자리에서 옮기는 rolling 구간에는 두 랭커 version이 함께 응답하므로, 실제로 응답한 랭커 version은 요청별로 기록한 값으로 읽는다.

규칙의 증분 효과를 A/B로 볼 때는 간섭을 확인한다. 두 variant의 로그를 합쳐 한 랭커를 다시 학습하면 처리 효과가 대조군으로 샌다. 작성자나 판매자 단위 규칙은 공급자 행동이 노출에 반응하거나 재고와 학습 데이터를 공유하거나 공급자 단위 지표를 볼 때 군 사이에 간섭할 수 있다. 학습 corpus를 variant별로 격리하거나 공급자 cluster, switchback 설계를 검토한다([[Recommendation-System-Online-Experimentation-Statistics#Novelty, carryover와 interference|interference]]).

## 사례

오늘의집 추천 시스템은 랭킹 뒤 규칙 모듈을 Twiddler라고 부르고, 같은 조건의 콘텐츠 사이에서는 랭커 결과를 우선한다는 원칙을 뒀다. 짧은 기간의 상호작용을 빠르게 반영하려고 클릭과 반복 노출을 기준으로 한 하향 규칙과 카테고리, 작성자 기준의 간격 규칙을 두고 파라미터를 A/B로 탐색했다. 최근 행동은 Kafka로 받은 앱 로그에서 사용자와 콘텐츠 사이의 행동만 걸러 Redis Sorted Set에 행동 시각을 score로 저장해 조회했다. Twiddler가 많아지면 추적이 어렵고, 랭커가 Twiddler를 거친 결과로 학습하면 exposure bias가 생길 수 있다는 점도 함께 지적했다(2024-03, 2024-07 게시 기준).

## 체크포인트

- 이 요구를 규칙, soft objective, eligibility 중 무엇으로 만들고 그 이유는 무엇인가
- 규칙을 차례로 적용한 최종 slate가 모든 규칙을 지키고, 규칙을 건너뛰는 fallback이 정해져 있는가
- 규칙이 밀어낸 아이템까지 결정 기록에 남는가
- 규칙이 바꾼 위치가 다음 랭커 학습에 어떻게 들어가는가
- 규칙 실험이 공유 학습 데이터나 공급자 노출로 오염되지 않는가

## 출처

- [개인화 추천 시스템 1, Multi-Stage Recommender System — 오늘의집](https://www.bucketplace.com/post/2024-03-26-%EA%B0%9C%EC%9D%B8%ED%99%94-%EC%B6%94%EC%B2%9C-%EC%8B%9C%EC%8A%A4%ED%85%9C-1-multi-stage-recommender-system/)
- [개인화 추천 시스템 2, Personalized Content Ranking — 오늘의집](https://www.bucketplace.com/post/2024-07-10-%EA%B0%9C%EC%9D%B8%ED%99%94-%EC%B6%94%EC%B2%9C-%EC%8B%9C%EC%8A%A4%ED%85%9C-2-personalized-content-ranking/)
- [Rules of Machine Learning — Google for Developers](https://developers.google.com/machine-learning/guides/rules-of-ml) — 규칙 #36의 위치 특징 처리
- [Redis, Sorted sets](https://redis.io/docs/latest/develop/data-types/sorted-sets/) — 2026-10-27 member 유일성과 score 범위 삭제 확인

## 관련 문서

- [[Recommendation-System-Ranking-Reranking|추천 랭킹과 재랭킹]]
- [[Recommendation-System-Feedback-Data|추천 피드백 데이터]]
- [[Recommendation-System-Page-Level-Optimization|페이지 단위 추천]]
- [[Recommendation-System-Online-Experimentation-Statistics|온라인 실험 통계]]
