---
tags: [ai, decision-model, calibration, robustness]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Decision Model Calibration Cases", "Microsoft-Decision-1", "Qwen 의사결정 모델", "Jev 1.14"]
---

# 결정 모델의 보정, 표현 안정성과 버전 변경

결정 모델의 출력 형식, 정답률, 확률 보정과 표현 안정성은 서로 다른 속성이다. 허용된 선택지만 반환해도 틀릴 수 있고, 같은 뜻의 질문을 바꾸면 답이 달라질 수 있다.

## 선택지 토큰을 제한해도 확률 보정은 남는다

작은 언어 모델로 결정 모델의 기본 형태를 실험하려면 다음 토큰의 logit 가운데 선택지 토큰만 남기고 softmax를 취한다. 이 방식은 긴 문장을 생성하지 않고 한 번의 입력 처리로 선택지를 채점한다. 선택지 표기가 토크나이저에서 기대한 토큰으로 표현되는지 먼저 확인한다.

2026-10-10 공개된 Qwen3-1.7B 실험은 CommonsenseQA 홀드아웃 1,221개에서 59.38%, 간단한 미세조정 뒤 62.41% 정확도를 보고한다. 원본 평가의 최고 신뢰도 구간은 평균 98.55%를 부여했지만 실제 정답률은 70.09%였다. 정확한 형식과 높은 softmax 점수를 정답 보장으로 읽을 수 없는 사례다.

온도 보정은 logit을 양의 온도로 나눠 확률 분포를 조정한다. 선택지 순위가 유지되는 조건에서 정확도를 높이는 방법과는 구분한다. 보정에 쓰는 표본과 최종 검증 표본을 나누고 자기 업무의 분포에서 다시 확인한다. 위 수치는 제작자 실험을 대조했으며 재학습과 재현은 수행하지 않았다.

## Microsoft-Decision-1의 평가 경계

2026-10-16 공식 발표 대조 기준, Qwen3.5-9B를 후학습해 고정 선택지를 한 번에 채점하는 모델이다. 분류, 라우팅, 우선순위, 검증과 에이전트 흐름 제어에 사용하고 예/아니요, 객관식, 평점과 루브릭 판정을 지원한다.

Microsoft는 학습에서 가린 36개 평가에서 비교 모델 중 가장 높은 정확도와 낮은 지연을 보고한다. 제공 GeekNews 발췌의 세부 수치는 147,137문항, 평균 83.5%다. 이번에 추출한 공식 본문은 약 15만 문항이라는 범위를 확인해 주지만 세부 표 수치는 직접 대조하지 못했다. 83.5%를 독립 검증한 수치로 사용하지 않는다.

도입 시에는 같은 질문의 순서, 키와 선택지 설명을 바꾸는 안정성 시험, 신뢰도 구간별 정확도, 검토로 넘길 비율과 오류 비용을 함께 측정한다. 벤더의 평균 순위가 특정 업무의 최선 모델을 정하지 않는다.

## Jev 1.14와 실험 기능을 구분한다

2026-10-16 TypeSafe 공식 발표와 Models 문서를 대조했다.

- 2026-10-14 공개 모델은 `jev-1.14.0`이며 `jev-preview`가 가리킨다. 확인일의 `jev-latest`는 `jev-1.13.0`이다. 별칭의 향후 이동 계획을 이미 적용된 상태로 기록하지 않는다.
- 발표는 전반적인 작은 개선과 다국어 향상 기대를 설명한다. 모든 언어의 실무 정확도 개선을 보장하는 결과는 아니다.
- 이미지 입력은 danger-zone 플래그로 사용하며 1.13에서도 활성화할 수 있다. `state`, `instructions`, `criteria`에 조합할 수 있다.
- 새 `box` 타입은 단일 바운딩 박스를 반환하며 발표 기준 1.14에서 제공한다.
- 긴 문맥은 기본적으로 꺼져 있다. `TypeSafe-Danger-Zone-Long-Context: true`를 넣으면 요청과 질문별 한도가 모두 262k로 늘어난다. 공식 문서는 기본 범위보다 느리고 덜 정확할 수 있다고 안내한다.

이미지, 박스와 긴 문맥은 실험 기능이며 벤더도 당시 프로덕션 사용을 보증하지 않았다. 모델 ID와 플래그를 고정하고 기존 과업의 회귀를 확인한 뒤 사용한다. API를 실제 호출하거나 품질을 재현하지 않았다.

## 트롤리 문제는 의식보다 표현 민감도 시험에 가깝다

같은 상황의 문장 순서, 인물 명칭과 선택지를 바꾸는 쌍 비교는 판정의 안정성을 검사하는 방법이다. 자기 서버를 고르는 응답만으로 실제 자기보존 의도나 시스템 접근 능력을 추론하지 않는다.

2026-10-16 제공 GeekNews 「의사결정 AI Jev, 트롤리 문제를 만나다」 발췌는 14개 모델 비교, 48개 질문 중 Jev의 서버 선택 16개, 질문 순서만 바꾼 2,620쌍 중 선택 변경 370쌍과 반복 실행 간 차이를 주장한다. 해당 실험의 원문 URL, 데이터와 전체 프롬프트는 이번에 확인하지 못했다. 수치는 미검증 사례로 보존하며 실제 위험 확률로 환산하지 않는다.

후속 확인에서는 선택지 토큰과 순서, 시스템 지침, 모델 버전, 반복 수, 샘플링 및 서버 표현의 의미를 대조한다. 정확도와 선택 일관성도 따로 측정한다.

## AnyJev: 편향 제거와 확률 보정은 다르다

2026-10-23 공식 저장소의 Levels 문서, 변경 기록과 `Question`, `Decider` 소스 대조 기준이다. `Decider`는 공개 가중치 언어 모델의 다음 토큰 분포에서 선택지 라벨의 확률을 읽는다. 문장을 생성한 뒤 파싱하는 방식과 구분한다.

- `raw`는 선택지 라벨에 한정한 softmax를 사용한다. 위치 편향이나 라벨 선호를 교정하지 않는다.
- 기본 `L0`에서 순서가 고정되지 않은 질문은 K개 선택지를 K번 순환 배치한다. 모든 K! 순열을 실행한다는 뜻이 아니다. 적용 가능한 라벨 사전분포로 보정한 결과를 기본 설정에서는 log 공간에서 결합한다.
- `Question.score`는 `ordered=True`로 만들어지므로 `Decider._perms`가 원래 순서 하나만 반환한다. 기본 5구간 score도 5번 순환하지 않는다. 구간의 순서를 유지하는 것과 확률을 보정하는 것은 별개의 처리다.
- 기본 batch prior는 배치의 응답에서 라벨 선호를 추정한다. 실제 정답이 한 선택지에 몰린 배치에서는 이 가정이 맞지 않아 정확도가 떨어질 수 있다. `content_free`는 별도의 내용 없는 입력으로 추정하고, `none`은 이 교정을 끈다.
- L0는 정답 라벨에 맞춘 confidence 보정을 하지 않는다. 선택지 순서에 덜 민감하다는 사실을 90% 확률의 실제 정답률이 90%라는 증거로 쓰지 않는다.

순서 미고정 질문의 전체 순환은 K개 배치를 채점한다. 회전 수 제한과 적응형 조기 종료를 사용하면 채점 수가 달라지며, 공유 prefix 재사용 여부도 실제 연산 비용에 영향을 준다. 질문 유형, 선택지 수, 회전 예산과 prior 방식이 다른 실행의 속도를 같은 조건으로 비교하지 않는다. 운영 평가에서는 정답률, 순서 변경 시 답이 바뀐 비율, 확신 구간별 정답률과 처리 지연을 따로 확인한다(평가 제안).

**버전 경계**: 공식 변경 기록은 0.3.0(2026-10-06)에서 라벨 학습 단계 L1/L2를 제거했다고 명시한다. 해당 기능을 쓰는 코드는 `anyjev==0.2.0`에 고정하도록 안내한다. 과거 소개의 상위 보정 단계를 현재 기본 기능으로 안내하지 않는다. 이 대조는 문서 수준이며 모델 실행, 영상의 500개 헤드라인 실험과 성능 순위는 재현하지 않았다.

## 출처

- [Build your own decision model — Nish Tahir](https://nishtahir.com/build-your-own-decision-model/)
- [Introducing Microsoft-Decision-1, our model for fast decision-making — Microsoft](https://commandline.microsoft.com/microsoft-decision-1-model-foundry/)
- [Jev: For the builders AND dreamers — TypeSafe AI](https://typesafe.ai/blog/jev-1-14)
- [TypeSafe Docs, Models](https://docs.typesafe.ai/models)
- 사용자 제공 GeekNews 발췌: 2026-10-11 Microsoft-Decision-1, 2026-10-12 Qwen 결정 모델, 2026-10-15 Jev 1.14.0, 2026-10-16 Jev와 트롤리 문제. 트롤리 실험 원문은 후속 확인 대상이다.

- [AnyJev — Nokia Applied Research](https://github.com/nokia-applied-research/AnyJev)
- [AnyJev, Levels and routes](https://github.com/nokia-applied-research/AnyJev/blob/main/docs/levels.md)
- [AnyJev Changelog — Nokia Applied Research](https://github.com/nokia-applied-research/AnyJev/blob/main/CHANGELOG.md)
- [AnyJev Question 소스 — Nokia Applied Research](https://github.com/nokia-applied-research/AnyJev/blob/main/anyjev/question.py)
- [AnyJev Decider 소스 — Nokia Applied Research](https://github.com/nokia-applied-research/AnyJev/blob/main/anyjev/decider.py)

## 관련 문서

- [[LLM-Decision-Models-Mechanics|결정 모델 동작 원리]]
- [[LLM-Decision-Models-Comparison|결정 모델 비교와 한계]]
- [[LLM-Abstention|보류와 사람 검토]]
- [[Eval-Model-Drift-Monitoring|서빙 모델 변경 감시]]
