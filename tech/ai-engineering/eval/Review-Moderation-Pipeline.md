---
tags: [ai, llm, moderation, evaluation, human-in-the-loop]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["리뷰 검수 자동화", "Review Moderation Pipeline"]
---

# 리뷰 검수 자동화와 품질 평가

리뷰 검수는 콘텐츠가 서비스 정책을 위반하는지 분류하고, 공개 또는 재검토로 연결하는 과정이다. 모델의 분류 정확도와 실제 공개 결정, 사람에게 남는 검수량을 함께 평가한다.

## 정책과 판정 수단을 나눈다

정책마다 필요한 입력과 판정 수단이 다르다. 구조화된 값으로 확인할 수 있는 조건, 텍스트와 이미지의 패턴, 상품 맥락과 예외 해석을 구분한다.

| 판정 수단 | 적합한 입력과 역할 | 확인할 한계 |
|---|---|---|
| 메타데이터 규칙 | 구매 여부 등 구조화된 사실 확인 | 입력 데이터의 정합성과 갱신 시점 |
| 분류 모델 | 이미지나 텍스트의 위반 후보 탐지 | 임계값에 따른 오탐과 누락 |
| LLM 프롬프트 | 정책, 예외와 상품 정보를 함께 해석 | 모호한 정책, 출력 형식 오류와 일관성 |

모델이 위반 후보를 고르면 사람이 재검토하는 흐름을 구성할 수 있다. 자동 공개, 재검토와 최종 차단은 서로 다른 상태다. 모델의 판정을 곧바로 최종 차단으로 취급하지 않는다. [검수 설계 패턴](https://aws.amazon.com/blogs/machine-learning/content-moderation-design-patterns-with-aws-managed-ai-services/)

단계별 검수는 앞 단계 결과에 따라 뒤의 검사를 생략하는 방식이다. 호출 횟수만 보지 않고 단계별 토큰, 다음 단계로 넘어가는 비율과 누락을 함께 비교한다. 다음은 설계 점검 제안이다. 여러 정책을 모두 기록해야 하는 요구라면 첫 위반에서 중단하는 최적화가 맞지 않을 수 있다.

## 정밀도와 재현율은 분모가 다르다

위반 콘텐츠를 양성으로 정의한다. TP는 실제 위반을 탐지한 건수, FP는 정상 콘텐츠를 위반으로 판정한 건수, FN은 놓친 위반 건수다.

- **정밀도** = TP / (TP + FP): 위반으로 판정한 것 중 실제 위반 비율
- **재현율** = TP / (TP + FN): 실제 위반 중 찾아낸 비율

정밀도가 낮으면 정상 리뷰가 검수 대기열에 많이 들어간다. 재현율이 낮으면 위반 리뷰가 통과한다. 정책별 지표와 전체 시스템 지표를 나눠 보면 특정 정책의 실패가 평균에 가려지는 것을 줄일 수 있다. [검수 평가 지표](https://aws.amazon.com/blogs/machine-learning/metrics-for-evaluating-content-moderation-in-amazon-rekognition-and-other-content-moderation-services/)

평가셋에는 사람이 정책에 따라 판정한 정상과 위반 사례가 모두 필요하다. 모델이 걸러낸 콘텐츠만 검토하면 통과한 콘텐츠의 위반 누락을 알 수 없다. 아래는 이 한계에서 도출한 운영 점검 기준이다.

1. 자동 통과 사례도 표본 검사해 누락을 찾는다.
2. 모호한 사례와 검수자 간 불일치는 정책 정의부터 확인한다.
3. 정책과 프롬프트를 바꿀 때 같은 평가셋으로 회귀를 비교한다.
4. 재검토 비율, 검수 대기시간과 실제 처리 가능한 물량을 함께 본다.

재검토로 보내는 비율은 전체 유입 중 대기열로 전달한 비율이다. 정밀도나 재현율 자체를 사람 검수 비율로 해석하지 않는다. 평가셋과 운영 데이터의 위반 비율이 다르면 같은 모델이어도 대기열 규모가 달라질 수 있다.

## 결과 반영과 비용의 점검

리뷰 수정과 비동기 검수를 함께 운영할 때는 판정 대상 본문과 현재 본문이 같은지 확인해야 한다. 다음은 운영 설계 제안이며 특정 서비스의 자동 보장 기능이 아니다.

- 리뷰 버전과 정책 버전을 판정 결과에 연결한다.
- 오래된 버전의 검수 결과가 최신 리뷰를 공개하도록 만들지 않는다.
- 형식 오류, 타임아웃과 판정 불가를 정상 통과와 구분한다.
- 비용은 모델 호출뿐 아니라 재시도, 이미지 전처리와 사람의 재검토까지 합쳐 비교한다.

고객 사례의 절감률과 정확도를 그대로 목표값으로 옮기지 않는다. 자기 서비스의 정책, 위반 비율과 검수 인력 조건에서 평가한다.

## 출처

- [생성형 AI 기반 리뷰 검수 자동화 및 맞춤형 체형 상품 추천 — Amazon Web Services Korea](https://www.youtube.com/watch?v=6kpME4adnYQ) — 2025년 발표의 리뷰 검수 설계와 평가 부분
- [Content moderation design patterns with AWS managed AI services — AWS Artificial Intelligence Blog](https://aws.amazon.com/blogs/machine-learning/content-moderation-design-patterns-with-aws-managed-ai-services/)
- [Metrics for evaluating content moderation in Amazon Rekognition and other content moderation services — AWS Artificial Intelligence Blog](https://aws.amazon.com/blogs/machine-learning/metrics-for-evaluating-content-moderation-in-amazon-rekognition-and-other-content-moderation-services/)

## 관련 문서

- [[Eval-Golden-Set-and-Deploy-Gates|골든셋과 배포 관문]]
- [[Eval-LLM-Judge|LLM 판정기와 사람 라벨]]
- [[Aspect-Based-Sentiment-Analysis|리뷰 속성별 감성 분석]]
