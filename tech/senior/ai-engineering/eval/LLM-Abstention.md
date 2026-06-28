---
tags: [senior, ai, llm, reliability, calibration, abstention]
status: done
category: "Senior - AI 엔지니어링"
aliases: ["LLM Abstention", "Abstention", "모른다고 말하기", "LLM 캘리브레이션"]
---

# LLM Abstention — 모른다고 말하는 능력

LLM의 신뢰성은 "맞히는 능력"이 아니라 **"모를 때 모른다고 말하는 능력(abstention)"** 으로 더 잘 측정된다. 정확도와 abstention은 독립 차원이며, 현재 SOTA 모델들도 abstention에서는 심각하게 미흡하다.

## 정의 — 세 가지 차원 구분

| 차원 | 정의 | 실패 시 증상 |
|---|---|---|
| **Accuracy** | 알고 있는 문제에 정답을 내는 능력 | 틀린 답 |
| **Hallucination** | 근거 없는 답을 그럴듯하게 생성 | 거짓을 사실처럼 단정 |
| **Abstention** | 불확실할 때 답을 거부하거나 유보 | 모르는 것도 답해버림 |
| **Calibration** | 확신 수준과 실제 정확도의 일치 | "확신 90%"인데 정답률 40% |

세 차원은 독립이다. 정확도가 높아도 abstention이 낮으면, **모르는 영역에서 자신감 있는 거짓말**을 한다 — 이게 프로덕션 에이전트의 가장 위험한 실패 모드.

## 왜 정확도 개선으로 안 풀리는가

세 가지 반직관적 발견:

### 1. 모델 스케일 ↑ ≠ Abstention ↑
파라미터, 데이터, 연산을 키워도 abstention 성능은 거의 개선되지 않는다. 스케일은 "아는 것"을 늘리지만 "모르는 것을 인지하는 능력"은 별도 학습 신호가 필요하다.

### 2. 추론 강화(Reasoning fine-tuning) → Abstention 악화
체인 오브 쏘트, 추론 RL 등으로 reasoning을 강화하면 abstention이 **오히려 떨어진다**. 추론 과정이 길어질수록 모델은 자신의 추론 결과를 신뢰하게 되고, 잘못된 전제에서도 단정적 결론을 만든다.

### 3. Test-time compute ↑ → 확신만 ↑
"길게 생각하기"를 강제하면 정답률보다 **확신도**가 더 빠르게 오른다. 불확실한 문제에서도 "분명히 A"라는 톤이 강해진다 — calibration이 깨진다.

종합하면, 현재 산업이 추구하는 세 방향(스케일, 추론, 추론시간) **모두가 abstention 문제를 악화시킬 수 있다**.

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

## 면접, 설계 의사결정 체크포인트

- "AI 에이전트의 신뢰성을 어떻게 측정, 보장할 것인가?" → 정확도만 답하면 부족. **abstention, calibration을 독립 차원으로** 답할 수 있어야 함
- "Hallucination은 왜 안 줄어드는가?" → 정확도 최적화가 자신감 있는 추측을 보상하기 때문. 보상 설계 문제.
- "RAG를 붙였는데 왜 여전히 hallucinate 하는가?" → 검색 점수 낮을 때 거부하도록 강제하지 않아서. 검색 ≠ 거부 분기.
- "프로덕션 LLM 시스템에서 가장 위험한 실패 모드는?" → **모르는 영역에서의 자신감 있는 오답** (조용히 틀림). 정답률 떨어지는 것보다 신뢰성 측면에서 훨씬 치명.

## 관련 문서

- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처]] — Defense in Depth, Eval 설계
- [[Harness-Engineering|하네스 엔지니어링]] — Verify, Correct 단계가 abstention 보완
- [[Agent-Spec-Writing|에이전트 스펙 작성법]] — LLM-as-Judge, 평가 설계
- [[AI엔지니어링(AIEngineering)|AI 엔지니어링 인덱스]]

## 출처

- [LLM은 언제 "모른다"고 말해야 하는가 — sparklingness, DEVOCEAN](https://devocean.sk.com/blog/techBoardDetail.do?id=168279&boardType=techBlog&isShared=Y)
