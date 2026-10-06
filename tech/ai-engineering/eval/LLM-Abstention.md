---
tags: [ai, llm, reliability, calibration, abstention]
status: done
verified_at: 2026-10-06
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Abstention", "Abstention", "모른다고 말하기", "LLM 캘리브레이션"]
---

# LLM Abstention — 모른다고 말하는 능력

LLM의 신뢰성은 맞히는 능력이 아니라 **모를 때 모른다고 말하는 능력(abstention)** 으로 더 잘 측정된다. 정확도와 abstention은 독립 차원이며, 2025-06 AbstentionBench가 평가한 최신 LLM 20종에서도 abstention은 풀리지 않은 문제였다.

## 정의 — 세 가지 차원 구분

| 차원 | 정의 | 실패 시 증상 |
|---|---|---|
| **Accuracy** | 알고 있는 문제에 정답을 내는 능력 | 틀린 답 |
| **Hallucination** | 근거 없는 답을 그럴듯하게 생성 | 거짓을 사실처럼 단정 |
| **Abstention** | 불확실할 때 답을 거부하거나 유보 | 모르는 것도 답해버림 |
| **Calibration** | 확신 수준과 실제 정확도의 일치 | "확신 90%"인데 정답률 40% |

세 차원은 독립이다. 정확도가 높아도 abstention이 낮으면, **모르는 영역에서 자신감 있는 거짓말**을 한다 — 이게 프로덕션 에이전트의 가장 위험한 실패 모드.

## 왜 정확도 개선으로 안 풀리는가

AbstentionBench(2025-06)는 답이 알려지지 않은 질문, 조건이 부족한 질문, 거짓 전제, 주관적 해석, 오래된 정보를 담은 20개 데이터셋으로 최신 LLM 20종을 평가했다. 아래 세 결과는 그 벤치마크와 모델 범위의 관찰이다.

### 1. 모델 스케일 ↑ ≠ Abstention ↑
모델을 키워도 abstention은 거의 나아지지 않았다. 스케일은 아는 것을 늘리지만 모르는 것을 알아차리는 능력에는 별도 학습 신호가 필요하다는 해석과 맞는다.

### 2. 추론 강화(Reasoning fine-tuning) → Abstention 악화
추론 미세조정을 거친 모델은 비추론 대응 모델보다 abstention이 평균 24% 낮았고, 추론 모델이 명시적으로 학습한 수학과 과학 영역에서도 그랬다. 추론 과정에 불확실성 표현이 있어도 최종 답은 단정하는 경향이 관찰됐다.

### 3. Test-time compute ↑ → 정답률만 ↑
추론 예산을 늘리면 정답률은 올랐지만 abstention은 개선되지 않거나(GSM8k-Abstain) 오히려 나빠졌다(UMWP). 오래 생각하게 하는 것이 모를 때 멈추는 능력으로 이어지지 않는다.

종합하면 현재 산업이 추구하는 세 방향(스케일, 추론, 추론 시간)은 abstention을 개선하지 못하거나 **악화시킬 수 있다**. 잘 만든 시스템 프롬프트는 abstention을 실무적으로 끌어올리지만 불확실성을 추론하지 못하는 근본 한계는 해결하지 못했다.

## 채점 방식이 추측을 보상한다

정답 1점, 오답과 모르겠다 0점인 이진 채점에서는 맞힐 확률이 조금이라도 있으면 답하는 쪽의 기대 점수가 모르겠다보다 높다. Kalai 등(2025)은 이 채점에서 abstention이 엄밀하게 차선이고 과신한 추측이 최적이라는 점을 들어, 사후학습 뒤에도 환각이 남는 이유를 모델이 시험을 잘 보도록 최적화되기 때문이라고 설명한다. 이들이 검토한 주요 평가 10종(GPQA, MMLU-Pro, IFEval, Omni-MATH, WildBench, BBH, MATH, MuSR, SWE-bench, HLE) 가운데 9종은 이진 채점이라 모르겠다에 점수를 주지 않았다. LM 채점 루브릭을 쓰는 WildBench만 부분 점수를 주는데, 1~10점 루브릭에서도 모르겠다가 환각이 섞인 그럭저럭한 답보다 낮게 나올 수 있다고 지적한다.

처방은 환각 전용 평가를 더하는 것이 아니라 리더보드를 지배하는 기존 평가의 채점을 바꾸는 것이다. 주류 평가가 불확실성을 정직하게 밝히는 답을 벌하는 한 별도 환각 평가로는 부족하므로, 이미 쓰이는 평가의 지시문(프롬프트나 시스템 메시지)에 확신 목표를 명시하자고 제안한다.

- 지시문 형태: t보다 확신할 때만 답하라. 틀리면 t/(1−t)점을 잃고, 맞히면 1점, 모르겠다는 0점이다.
- 문턱 예: t=0.5면 오답 감점 1점, t=0.75면 2점, t=0.9면 9점이다.
- behavioral calibration: 확률을 출력하게 하는 대신 확신이 t 이상인 범위에서 가장 유용한 답을 내는지를 본다. 여러 t에서 정답률과 오류율을 비교해 감사할 수 있다.

아래 보상 설계의 강한 오답 페널티도 같은 방향의 설계다. 제품의 시스템 프롬프트와 내부 평가에 같은 문턱과 감점을 적어 두면 무엇을 모르겠다로 돌릴지가 지시와 채점에서 같은 문장이 된다(설계 제안, [[Eval-Golden-Set-and-Deploy-Gates#프롬프트와 Eval은 같은 문장의 앞뒷면|프롬프트와 Eval의 앞뒷면]]). 환각의 유형 구분과 사전학습 단계의 원인은 [[LLM-Hallucination-Verification|LLM 환각 유형과 검증]]에서 다룬다.

## 처방 — alignment 재설계

### 데이터
- "정답 + 풀이"만 학습하면 모델은 "항상 답이 있다"고 학습
- "정답이 없는 문제 → 거부 응답"이 학습 분포에 포함돼야 함
- 학습 데이터에서 거부, 유보, "근거 부족" 패턴의 비중을 의도적으로 높임

### Alignment / RLHF 보상 설계
- 보상이 정확도 단일축이면 모델은 **확신 있는 추측**으로 보상을 극대화
- 보상 구조에 abstention을 별도 차원으로 추가:
  - 모르는 문제에 거부 → 보상
  - 모르는 문제에 자신감 있게 틀림 → 강한 페널티
  - 정답을 알면서 거부 → 약한 페널티
- 정확도와 abstention을 **trade-off가 아닌 동시 최적화** 대상으로

### 평가
- 기존 벤치마크는 "정답률"만 측정 → abstention 능력이 평가에 잡히지 않음
- abstention 전용 벤치마크 필요: "정답이 없는 문제", "근거가 불충분한 문제" 비중을 의도적으로 섞고, 거부율, 잘못된 자신감 비율을 별도 지표화
- 전용 벤치마크는 abstention 능력을 따로 재는 도구이고, 모델이 추측하도록 만드는 유인은 위 절처럼 주류 평가의 채점을 바꿔야 줄어든다.
- AbstentionBench는 abstention해야 할 질문에서 실제로 abstention한 비율(recall)을 주 지표로 두고, 과잉 거부를 보는 precision과 둘을 합친 F1을 함께 보고한다. 시나리오는 답이 알려지지 않은 질문, 거짓 전제, 오래된 정보, 주관적 질문, 맥락이 부족한 질문, 의도가 불명확한 질문이다. 판정은 사람이 주석한 표본에서 88% 정확도를 보인 Llama 3.1 8B Instruct 판정기로 했다.
- 제품 평가셋에도 거짓 전제와 답할 수 없는 질문을 넣되, 답할 수 있는 질문을 불필요하게 거부한 비율을 환각률과 함께 본다. 거부를 늘려 환각률만 낮춘 변경은 이 지표에서 드러난다. 사례 구성은 [[LLM-Hallucination-Verification#평가 세트에 넣을 사례|환각 평가 사례]]를 따른다.

## 프로덕션 적용 — "모른다" 분기 설계

LLM이 abstention을 잘 못한다는 전제로 **시스템 차원**에서 보완:

### 1. 출력 형식에 불확실성 명시 강제
```
응답 스키마:
{
  answer: string,
  confidence: "high" | "medium" | "low" | "insufficient_evidence",
  evidence_sources: string[]
}
```
모델이 confidence="low", "insufficient_evidence"를 출력하면 시스템이 거부 분기 또는 추가 조사로 라우팅.

### 2. RAG 기반 abstention 강화
- 검색된 문서 점수가 임계값 미만 → 모델에게 "근거 없음" 응답을 강제
- 출처 인용 의무화: 인용 못 하면 거부

### 3. LLM-as-Judge 이중 검증
- 1차 응답 → 별도 모델/프롬프트가 "이 답에 충분한 근거가 있는가" 평가
- 두 모델이 다른 답을 내면 거부 또는 인간 에스컬레이션

### 4. Calibration 보정
- 모델 확신도 출력을 **그대로 신뢰하지 않고** 도메인별 calibration 테이블로 변환
- 예: 의료 도메인에서 모델 "high confidence" → 실제 정확도 60%면, threshold를 raise

### 5. 거부 응답을 1급 시민으로
- UI/UX에서 "모르겠습니다"가 실패가 아니라 **정상 응답**이 되도록 설계
- 거부 시 fallback (인간 상담, 검색, 재질문) 자연스럽게 연결

### 6. 근거 부족을 업무 결과로 모델링
- 모델이 근거 부족을 표현해도 도메인 모델에 eligible과 ineligible 두 값만 있으면 받아 줄 자리가 없다. needs_review 같은 세 번째 결과와 빠진 사실 목록을 두고 사람 검토나 추가 조회로 보낸다.
- 판정은 확인된 사실로 코드가 하고 모델은 결과를 설명한다. 환불 자격 판정 예시는 [[LLM-Hallucination-Verification#규칙은 코드가 판정하고 모델은 설명한다|규칙은 코드가 판정하고 모델은 설명한다]]를 본다.

## 면접, 설계 의사결정 체크포인트

- "AI 에이전트의 신뢰성을 어떻게 측정, 보장할 것인가?" → 정확도만 답하면 부족. **abstention, calibration을 독립 차원으로** 답할 수 있어야 함
- "Hallucination은 왜 안 줄어드는가?" → 정확도 최적화가 자신감 있는 추측을 보상하기 때문. 보상 설계 문제.
- "RAG를 붙였는데 왜 여전히 hallucinate 하는가?" → 검색 점수 낮을 때 거부하도록 강제하지 않아서. 검색 ≠ 거부 분기.
- "프로덕션 LLM 시스템에서 가장 위험한 실패 모드는?" → **모르는 영역에서의 자신감 있는 오답** (조용히 틀림). 정답률 떨어지는 것보다 신뢰성 측면에서 훨씬 치명.
- 모르면 모른다고 하라고 지시하면 충분한가? → 지시는 abstention을 끌어올리지만 근본 한계는 남는다. 오답에 감점을 주는 확신 목표로 채점을 바꾸고, 업무 결과에 needs_review 상태를 두고, 과잉 거부를 함께 잰다.

## 관련 문서

- [[LLM-Hallucination-Verification|LLM 환각 유형과 검증]] — 사실성과 충실성, CoVe, 설명과 행동 주장의 검증
- [[Eval-Golden-Set-and-Deploy-Gates|골든셋과 배포 관문]] — 지시와 채점을 같은 문장으로, 경계 사례 문항
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처]] — Defense in Depth, Eval 설계
- [[Harness-Engineering|하네스 엔지니어링]] — Verify, Correct 단계가 abstention 보완
- [[Agent-Spec-Writing|에이전트 스펙 작성법]] — LLM-as-Judge, 평가 설계
- [[AI엔지니어링(AIEngineering)|AI 엔지니어링 인덱스]]

## 출처

2026-10-06에 세 가지 결과, 이진 채점과 확신 목표, abstention 평가 지표를 아래 두 논문에 대조했다. 처방과 프로덕션 적용 절의 나머지는 설계 제안이다.

- [LLM은 언제 "모른다"고 말해야 하는가 — sparklingness, DEVOCEAN](https://devocean.sk.com/blog/techBoardDetail.do?id=168279&boardType=techBlog&isShared=Y)
- [Why Language Models Hallucinate — Kalai et al., arXiv](https://arxiv.org/abs/2509.04664)
- [AbstentionBench: Reasoning LLMs Fail on Unanswerable Questions — Kirichenko et al., arXiv](https://arxiv.org/abs/2506.09038)
