---
tags: [ai, evaluation, human-evaluation, crowdsourcing, data-quality]
status: done
verified_at: 2026-11-01
category: "AI엔지니어링(AIEngineering)"
aliases: ["Crowdsourced Human Evaluation", "크라우드소싱 사람 평가"]
---

# 크라우드소싱 사람 평가

사람 평가는 생성 결과의 자연스러움, 선호와 과업 적합성을 판단하는 방법이다. 평가자를 많이 모집하거나 높은 이력을 가진 사람을 고르는 것과, 실제 응답의 품질을 확인하는 것은 별개다. 사람의 판단도 오류가 있으므로 평가 기준과 응답 검수를 함께 설계한다.

## 자격과 응답 품질을 분리한다

평가에 필요한 언어 능력과 도메인 지식은 해당 과업의 요구사항으로 정의한다. 플랫폼의 활동 이력이나 거주 지역을 그 능력의 직접 증거로 대신하지 않는다.

과거 Mechanical Turk의 `Masters`는 수천 건의 작업에서 높은 수행 성과를 보인 작업자에게 부여한 자격이었다. 공식 개발 가이드의 API Version 2013-11-15판(2014년 저작권 표기)은 이 자격과 위치 기반 자격을 구분한다. 따라서 `Masters`를 특정 음악, 의료 또는 언어 분야의 전문가 인증으로, 위치 조건을 해당 언어의 모국어 능력 보장으로 해석하지 않는다. 이는 당시 자격 정의에서 도출한 적용 경계이며 현재 이용 가능한 기능의 안내가 아니다.

2021년 공개된 연구(자료 수집 2019-12, 2020-02)에서는 Masters, 승인율 98% 이상, 승인 작업 1,000개 이상 조건을 갖춘 미국 참가자 564명을 조사했다. 가상 기술 제품 설명을 읽고 설문에 답하게 한 뒤 논리, 정직성, 시간의 세 주의력 검사를 적용했으며, 126명(22.3%)이 적어도 하나를 통과하지 못했다. 논리와 정직성 검사는 두 문항 모두에 최고 동의(strongly agree)를 고르지 않으면 실패로 봤고, 실패의 다수(94명)는 자기보고형 정직성 검사에서 나왔다. 저자들도 검사가 과민했을 수 있다고 보며, 두 개 이상 실패를 기준으로 하면 4.61%(26명)로 낮아진다고 밝혔다. 이는 해당 실험의 관측값이다. 모든 크라우드소싱 작업의 오류율이나 음성 평가의 허위 응답률로 일반화하지 않는다.

따라서 높은 자격 기준을 응답 검수의 대체재로 두지 않는다. 같은 번호의 반복 선택만으로 허위 응답을 확정하기보다, 명확한 검사 문항과 응답 맥락을 함께 확인하는 것이 적용 제안이다.

## 평가 설계에 적용하기

아래는 응답 품질 연구와 자격의 한계를 적용한 점검안이며, 특정 플랫폼의 기능 보장이나 실제 실험 결과가 아니다.

1. **평가 대상을 나눈다.** 음질, 자연스러움, 내용 정확도와 화자 유사도를 한 점수에 섞지 않는다.
2. **기준을 사전에 고정한다.** 점수별 설명과 예시, 제외 조건을 정하고 소규모 예비 평가로 문항이 이해되는지 확인한다.
3. **자격과 주의력을 따로 확인한다.** 과업에 맞는 선별 과제와 이해 확인 문항을 사용한다. 원하는 모델에 유리한 응답만 남기는 사후 선별은 피한다.
4. **판단과 집계를 추적한다.** 모집 수, 제외 수와 이유, 최종 평가자 수, 평가한 샘플 수를 구분해 남긴다. 평균값만으로 모집과 제외 과정의 품질을 설명하지 않는다.
5. **운영 비용을 포함한다.** 모집 보수뿐 아니라 예비 평가, 응답 검수와 재모집에 필요한 시간도 계산한다.

## 과거 플랫폼 사례를 현재 도입안으로 읽지 않는다

2026-10-30 확인한 공식 FAQ에 따르면 **Amazon Mechanical Turk는 2026-09-30 종료됐다.** SageMaker Ground Truth와 Amazon Augmented AI에서도 Mechanical Turk worker type으로 새 라벨링 작업이나 사람 검토 워크플로를 만들 수 없게 됐다. 이 worker type의 종료를 두 서비스 전체가 종료됐다는 뜻으로 확대하지 않는다. 다만 2026-11-01 확인한 AWS 문서 기준 두 서비스 모두 신규 고객을 받지 않으며 기존 고객만 계속 쓸 수 있다. 두 서비스 모두 새 기능을 추가할 계획이 없다고 밝힌다.

보존된 개발 문서는 당시의 평가 설계를 이해하는 자료다. 이를 현재 신규 작업 생성 안내로 사용하지 않는다. 다른 플랫폼이나 비공개 평가 인력을 고를 때는 현재 이용 가능성, 표본 적합성, 데이터 공개 범위와 품질 검수 수단을 다시 확인한다. 이 문서는 대체 서비스의 도입이나 성능을 검증한 결과가 아니다.

## 출처

- [Amazon Mechanical Turk, Closure FAQs](https://www.mturk.com/help) — 서비스 종료와 Ground Truth/Augmented AI의 worker type 영향
- [AWS, Amazon SageMaker Ground Truth](https://docs.aws.amazon.com/sagemaker/latest/dg/sms.html) — 신규 고객 중단, 기존 고객의 계속 사용과 새 기능 계획 없음
- [AWS, Using Amazon Augmented AI for Human Review](https://docs.aws.amazon.com/sagemaker/latest/dg/a2i-use-augmented-ai-a2i-human-review-loops.html) — 신규 고객 중단, 기존 고객의 계속 사용과 새 기능 계획 없음
- [Amazon Mechanical Turk, Developer Guide](https://s3.amazonaws.com/awsdocs/MechTurk/latest/amt-dg.pdf#page=38) — API Version 2013-11-15판(2014년 저작권 표기), 본문 34쪽의 System and Master Qualifications. 종료 전 자격 정의로만 참조
- [The Hidden Cost of Using Amazon Mechanical Turk for Research — arXiv, Antonios Saravanos 외](https://arxiv.org/abs/2101.04459) — 2021년 공개 논문의 표본(자료 수집 2019-12, 2020-02), 선별 조건, 주의력 검사 기준과 결과

## 관련 문서

- [[Eval-Rubric-and-Score-Gate|루브릭과 점수 게이트]]
- [[Eval-LLM-Judge|LLM 판정기와 사람 라벨 교정]]
- [[Korean-TTS-Training-and-Evaluation|한국어 TTS 학습과 평가]]
