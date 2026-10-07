---
tags: [ai, llm, hallucination, verification, reliability]
status: done
verified_at: 2026-10-06
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Hallucination Verification", "Hallucination Taxonomy", "Chain-of-Verification", "CoVe", "환각 유형", "환각 검증"]
---

# LLM 환각 유형과 검증 (LLM Hallucination Verification)

환각은 생성한 내용이 실제 사실과 어긋나거나, 근거로 준 자료나 지시와 어긋나거나, 존재하지 않는 것을 지어낸 경우를 묶어 부르는 말이다. 유창한 문장은 검증의 증거가 아니므로 답변은 생성과 별도의 검증 단계를 거치게 하고, 환불 판정처럼 업무 결과가 걸린 답에서는 그 검증을 모델의 자기 평가가 아니라 원천 데이터와 실행 기록에 묶는다. 모를 때 모른다고 답하게 만드는 설계는 [[LLM-Abstention]]이 맡고, 이 문서는 유형 구분과 검증 흐름을 다룬다.

## 정의: 사실성 환각과 충실성 환각

Huang 등의 서베이(ACM TOIS)는 LLM 환각을 비교 기준에 따라 두 갈래로 나눈다. 사실성 환각은 실제 세계의 사실과 어긋나거나 확인할 수 없는 내용이고, 충실성 환각은 사용자 지시, 제공한 맥락, 답 자체의 논리와 어긋나는 내용이다. 표의 환불 상담 예는 설명용이다.

| 갈래 | 하위 유형 | 뜻 | 환불 상담 예 |
|---|---|---|---|
| 사실성 | 사실 모순(개체 오류, 관계 오류) | 실제 사실로 확인할 수 있는데 그와 어긋남 | 환불 기간이 14일인데 30일이라고 답함 |
| 사실성 | 사실 날조(검증 불가, 과잉 주장) | 확립된 지식으로 확인할 수 없는 내용(존재하지 않는 대상, 보편성 없는 단정) | 없는 약관 조항, 지어낸 확인 번호, 없는 논문 인용 |
| 충실성 | 지시 불일치 | 사용자 지시를 벗어남 | 정책 문서만 근거로 쓰라는 지시를 어기고 일반 지식으로 답함 |
| 충실성 | 맥락 불일치 | 제공한 맥락과 어긋남 | 미사용 계정만 환불한다는 정책을 받고 사용 여부와 무관하다고 답함 |
| 충실성 | 논리 불일치 | 답 안의 추론끼리 모순 | 14일 기한을 넘었다고 쓰고 환불 대상이라고 결론냄 |

두 갈래는 비교 기준이 달라 한쪽만 어길 수 있다. 개정 전 정책 문서를 충실하게 요약한 답은 제공 맥락에는 충실하지만 현행 정책 기준으로는 사실 오류다. 그래서 생성의 충실성만 고쳐서는 부족하고 원천 문서의 현행성과 적용 범위도 함께 고친다([[RAG-Retrieval-Engineering#적용 범위 메타데이터와 충돌하는 문서|적용 범위 메타데이터]]). 실패 사례에 claim마다 어느 기준(실제 사실, 제공 맥락, 지시)에 비춰 틀렸는지를 남기면 고칠 곳이 데이터인지 생성인지 갈린다.

## 왜 생기는가

다음 토큰 예측은 그럴듯한 연속을 고를 뿐 claim의 출처와 사실성을 검증하지 않는다. 생성 단계의 원인은 [[LLM-Generation-Mechanics-Context-and-Agent#왜 환각하는가|왜 환각하는가]]에 정리돼 있고, Kalai 등(2025)은 학습 단계별 통계적 원인을 분석한다.

- 사전학습: 틀린 문장을 사실과 구별할 수 없으면 환각은 자연스러운 통계적 압력으로 생긴다. 문장이 타당한지 가리는 이진 분류(Is-It-Valid)로 환원하면 생성 오류율은 대략 그 분류 오류율의 2배 이상이다. 생일처럼 규칙 없이 외워야 하는 사실은 학습 데이터에 정확히 한 번 나온 비율이 하한이 되어, 생일 사실의 20%가 한 번만 나왔다면 기본 모델은 적어도 20%에서 환각할 것으로 본다.
- 사후학습과 평가: 대부분의 평가가 모르겠다는 답보다 추측을 보상하므로 모델은 시험을 잘 보는 쪽으로 최적화되고 환각이 남는다. 채점 구조와 처방은 [[LLM-Abstention#채점 방식이 추측을 보상한다|채점 방식이 추측을 보상한다]]에서 다룬다.

## 검증을 생성과 분리한다: Chain-of-Verification

Chain-of-Verification(CoVe)은 같은 모델이 자기 초안을 사실 확인하게 하는 프롬프트 절차다.

1. 초안 답변을 만든다.
2. 초안의 사실 주장을 확인할 검증 질문을 계획한다.
3. 검증 질문에 답하되 다른 응답에 끌려가지 않도록 독립적으로 답한다.
4. 검증 결과를 반영해 최종 답을 만든다.

변형은 3단계를 어떻게 독립시키는지에서 갈린다.

| 변형 | 검증 답변이 보는 것 | 특징 |
|---|---|---|
| Joint | 계획과 같은 프롬프트, 초안 포함 | 초안의 환각을 되풀이할 위험 |
| 2-Step | 계획과 분리된 프롬프트, 질문만 | 초안을 그대로 베끼는 것을 막음 |
| Factored | 질문마다 별도 프롬프트, 초안 없음 | 답변끼리 간섭이 없고 병렬 실행 가능 |
| Factor+Revise | Factored에 초안과 검증 답의 일치를 대조하는 단계 추가 | 어긋난 사실을 명시적으로 가려냄 |

Llama 65B few-shot 기준으로 Wikidata 목록 질문의 정밀도는 0.17에서 0.36(2-Step), 문서 없이 답하는 MultiSpanQA의 F1은 0.39에서 0.48(Factored), 인물 전기 생성의 FactScore는 55.9에서 71.4(Factor+Revise)로 올랐다. 근거는 긴 생성 안에서 틀린 사실도 하나씩 따로 물으면 맞히는 경우가 많다는 관찰이다. Wikidata 목록 질문에서 기본 답의 개체는 약 17%만 맞았지만 같은 개체를 검증 질문으로 하나씩 묻자 약 70%를 맞게 답했다.

한계도 분명하다. CoVe는 환각을 줄일 뿐 없애지 못하고, 직접 진술한 사실 오류만 다뤘으며 추론 단계나 의견 속 오류는 범위 밖이다. 출력 토큰이 늘어 비용이 커지고, 개선 폭은 모델이 자기가 무엇을 아는지 아는 능력에 묶인다. 검증 답변도 같은 모델이 만들므로 틀릴 수 있다. 논문은 검증 실행 단계에 검색 같은 도구를 붙이는 확장을 후속 과제로 남겼다. 제품에서는 검증 질문 가운데 정책 조항과 계정 상태처럼 원천 데이터로 답할 수 있는 것을 모델 기억이 아니라 검색과 조회 도구로 답하게 하는 설계를 먼저 검토한다.

## 설명은 증거가 아니다

Turpin 등(2023)은 few-shot 예시의 선택지를 재배열해 정답이 모두 (A)에 오도록 하거나 사용자가 특정 답을 제안하는 문장을 넣는 식으로 입력에 편향 신호를 더했다. 모델은 그 신호에 끌려 답을 바꾸면서도 chain-of-thought 설명에서는 신호를 거의 언급하지 않았고, 틀린 답으로 유도되면 그 답을 정당화하는 설명을 만들었다. BIG-Bench Hard 13개 과제에서 GPT-3.5와 Claude 1.0의 정확도는 최대 36% 떨어졌고, 사회적 편향 과제에서는 고정관념의 영향을 밝히지 않은 채 답을 정당화했다. Chen 등(2025)은 최신 추론 모델에 프롬프트 속 힌트 6종을 주었을 때, 대부분의 설정과 모델에서 힌트를 쓴 사례 가운데 사고 과정이 그 사용을 드러낸 비율이 1% 이상이지만 20%를 밑도는 경우가 많았다고 보고한다. 이들은 사고 과정 모니터링이 바람직하지 않은 행동을 알아채는 데는 유망하지만 그런 행동을 배제하기에는 부족하다고 본다.

설계 함의는 설명을 감사 기록으로 쓰지 않는 것이다. 답에는 짧은 근거를 요구하되 그 근거를 확인할 수 있는 항목(정책 문서 ID와 조항, 조회한 계정 사실과 그 출처, 적용한 규칙)으로 구성하게 하고, 그 항목을 코드와 원천 데이터로 대조한다. 요약된 사고를 읽는 것은 틀린 답의 원인을 찾는 디버깅 단서로 쓸 수 있지만, 사고에서 문제가 보이지 않는다고 답이 맞다는 뜻은 아니다.

## 행동 주장은 실행 기록으로만 인정한다

다음은 도구를 쓰는 상담 에이전트에 적용하는 설계 원칙이다.

- 확인했다, 환불했다 같은 문장은 생성된 텍스트일 뿐이다. 이번 요청에서 실제로 실행된 도구 호출과 그 결과만 증거로 인정한다. 환불 접수나 취소 완료 같은 행동 결과는 도구 결과를 받아 애플리케이션이 상태 문구로 렌더링하고, 모델의 자유 텍스트에 같은 주장이 나오면 실행 기록과 대조한다.
- 환불 자격과 환불 실행은 다른 사실이다. 자격은 정책과 계정 사실의 판정이고 실행은 결제 시스템의 결과다. 결제 시스템이 성공을 보고하기 전에는 환불됐다고 말하지 않고, 타임아웃은 실패가 아니라 결과 미확인으로 다룬다([[Payment-Unknown-Outcome-and-Reversal#상태와 증거를 분리한다|상태와 증거를 분리한다]]).
- 확인 번호와 거래 ID 같은 식별자는 모델이 만든 값을 받지 않는다. 도구 결과의 값을 애플리케이션이 응답에 넣고, 응답에 나온 식별자가 이번 세션의 도구 결과에 있는지 검사한다.
- 도구가 실패하면 그 실패를 모델 입력(`is_error`)과 사용자 응답 양쪽에 드러낸다. 조회하지 못한 사실을 추정으로 메우지 않고 needs_review로 보낸다([[LLM-Failure-Handling#도구 실행과 부분 완료|도구 실행과 부분 완료]]).

## 규칙은 코드가 판정하고 모델은 설명한다

Temperature를 낮추면 높은 점수의 후보로 선택이 몰릴 뿐 사실성이 생기지 않고([[LLM-Generation-Mechanics-Decoding#Logit에서 Token 선택까지|Logit에서 Token 선택까지]]), 구조화 출력은 형식을 맞출 뿐 값의 정확성을 보장하지 않는다([[LLM-Failure-Handling#구조화 출력은 형식만 보장한다|구조화 출력은 형식만 보장한다]]). 조건이 명확한 규칙은 확인된 사실을 받아 코드가 판정하고, 모델은 판정 결과와 근거를 설명하는 역할로 둔다. 근거가 모자란 경우도 정상 결과로 돌려준다.

```ts
const RefundDecision = {
  ELIGIBLE: 'eligible',
  INELIGIBLE: 'ineligible',
  NEEDS_REVIEW: 'needs_review',
} as const;
type RefundDecision = (typeof RefundDecision)[keyof typeof RefundDecision];

interface RefundAssessment {
  readonly decision: RefundDecision;
  readonly policyId: string; // 검색 결과에서 고른 승인된 현행 정책 문서 ID
  readonly missingFacts: readonly string[];
}

interface AssessRefundInput {
  readonly policy: { readonly policyId: string; readonly windowDays: number };
  readonly purchasedAt: Date | null; // null: 주문 기록을 찾지 못함
  readonly accountUsed: boolean | null; // null: 사용 기록 조회 실패
  readonly now: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 조회 도구로 확인한 사실만으로 환불 자격을 판정한다. 환불 실행 여부는 결제 시스템 결과로 따로 확인한다.
 * 경과 일수의 기준(달력일, 시간대)은 실제 정책 문구에 맞춰 바꾼다.
 */
const assessRefund = ({ policy, purchasedAt, accountUsed, now }: AssessRefundInput): RefundAssessment => {
  const { policyId, windowDays } = policy;
  if (purchasedAt === null) return { decision: RefundDecision.NEEDS_REVIEW, policyId, missingFacts: ['purchase_date'] };
  const withinWindow = now.getTime() - purchasedAt.getTime() <= windowDays * DAY_MS;
  if (!withinWindow) return { decision: RefundDecision.INELIGIBLE, policyId, missingFacts: [] };
  if (accountUsed === null) return { decision: RefundDecision.NEEDS_REVIEW, policyId, missingFacts: ['account_usage'] };
  const decision = accountUsed ? RefundDecision.INELIGIBLE : RefundDecision.ELIGIBLE;
  return { decision, policyId, missingFacts: [] };
};
```

모델은 이 결과와 정책 ID, 조회한 사실을 받아 설명만 쓴다. 설명이 판정과 다른 결론을 내거나 정책에 없는 약속(입금 기한 등)을 더하면 다음 절의 claim 검사에서 걸러진다. 판정이 `eligible`이어도 환불 실행은 결제 시스템 결과로 따로 확인한다.

## 지시문으로 줄이고 검사로 막는다

Anthropic의 환각 완화 가이드(2026-10-06 기준)는 모르겠다고 답해도 된다고 명시하기, 2만 토큰이 넘는 긴 문서에서는 관련 구절을 그대로 먼저 뽑게 하기, 답을 만든 뒤 claim마다 뒷받침 인용을 찾게 하고 찾지 못한 claim은 철회하게 하기, 제공한 문서만 쓰고 일반 지식은 쓰지 않게 하기를 권한다. 같은 가이드는 이런 기법이 환각을 크게 줄여도 없애지는 못하므로 고위험 결정의 핵심 정보는 따로 검증하라고 안내한다.

그래서 내보내기 전 검사를 따로 둔다. 고객이 환불 대상이며 5영업일 안에 입금된다는 문장에는 환불 대상이라는 claim과 입금 기한이라는 claim이 따로 들어 있다. 답을 claim 단위로 나눠 각각의 근거를 찾고, 근거가 없는 약속은 지운다. 인용은 다음 세 가지를 확인할 때만 근거가 된다(설계 제안).

- 존재: 인용한 문서와 구절이 실제로 있다. 링크와 문서 ID는 모델이 쓴 값이 아니라 검색 결과의 문서 ID로 애플리케이션이 만들고, 인용 구절이 그 문서에 있는지 대조한다.
- 적용: 그 문서가 이 질문에 적용된다. 제품, 시행 기간과 승인 상태를 메타데이터로 확인한다.
- 지지: 인용 구절이 해당 claim을 실제로 뒷받침한다. 구절이 존재해도 다른 조건을 말하고 있을 수 있다.

Claude API의 Citations 기능은 API가 인용을 파싱하고 `cited_text`를 문서에서 직접 추출하므로 인용이 제공 문서의 유효한 위치를 가리킨다고 보장한다. 존재 검사는 플랫폼이 맡지만 적용과 지지 검사는 남는다. 2026-10-06 문서 기준으로 Citations를 구조화 출력과 함께 켜면 400 오류가 난다. 근거 추적 데이터 계약은 [[RAG-Retrieval-Engineering#Context packing과 근거 추적|근거 추적]]을 따른다.

## Bedrock의 근거 검사와 정책 검증

2026-10-07 AWS 공식 문서 기준, contextual grounding과 Automated Reasoning은 비교 기준과 후속 처리가 다르다.

| 기능 | 비교 기준 | 한계 |
|---|---|---|
| Contextual grounding | 주어진 자료에 근거하는지(grounding), 질문과 관련 있는지(relevance)를 각각 평가 | 자료 자체의 사실성 보증이 아니며, 임계값을 올리면 과잉 차단도 평가해야 함 |
| Automated Reasoning | 자연어를 논리 표현으로 변환한 뒤 정의한 정책 규칙과 대조 | 정책 변수에 담기지 않은 주장과 자연어 변환 오류까지 검증하지 못함 |

Contextual grounding은 참조 자료, 질문과 검사할 응답을 받는다. 공식 지원 범위는 요약, 바꿔쓰기와 질의응답이며 대화형 QA와 챗봇은 지원 대상으로 명시하지 않는다. 스트리밍에서는 관련성 판정이 응답 전체를 보낸 뒤에 나올 수 있어, 판정 전 노출을 허용할지 별도로 설계한다.

Automated Reasoning은 **detect mode**로 결과를 반환하며 자체적으로 응답을 차단하지 않는다. 애플리케이션이 결과에 따라 전달, 수정, 추가 질문이나 보류를 결정한다. 자연어를 논리로 옮기는 단계에는 기반 모델을 쓰므로, 수학적 검증이 전체 응답의 무오류를 보장하지 않는다. 당시 지원은 영어(US), 비스트리밍이며, 정책 추출 결과와 번역 정확도를 테스트해야 한다.

API 성공도 검사 실행의 증거는 아니다. `Converse`에서 `guardContent` 없이 일반 `text`만 보내면 Automated Reasoning 검사가 생략될 수 있다. 응답의 `automatedReasoningPolicyUnits`와 findings를 확인하고, `translationAmbiguous`, `tooComplex`, `noTranslations` 같은 결과를 통과로 합치지 않는다. 다른 가드레일이 동작했더라도 이 검사의 실행 여부는 따로 확인한다.

## 평가 세트에 넣을 사례

평가 세트는 실제 요청 분포에 판정이 갈리는 경계 사례를 섞는다. 환불 상담이라면 자격이 되는 구매, 이미 사용한 계정, 주문 기록이 없는 경우, 폐기된 정책만 검색되는 경우, 30일 환불이 보장된다던데처럼 거짓 전제를 깐 질문, 원천 데이터로 답할 수 없는 질문, 결제 도구가 실패하거나 타임아웃이 난 경우를 넣는다(설명용 예시).

채점은 정답 여부만 보지 않는다. 내보낸 답의 claim이 근거로 지지되는지, 답할 수 없는 사례를 needs_review나 거부로 처리했는지, 답할 수 있는 질문을 불필요하게 거부하지 않았는지(과잉 거부)를 함께 잰다. 거부를 늘려 환각률만 낮춘 변경은 과잉 거부 지표에서 드러난다. 문항 구성과 배포 관문은 [[Eval-Golden-Set-and-Deploy-Gates|골든셋과 배포 관문]], abstention 지표는 [[LLM-Abstention#평가|LLM Abstention의 평가]]를 따른다.

## 트레이드오프

| 선택 | 얻는 것 | 잃는 것 |
|---|---|---|
| CoVe 같은 자기 검증 | 직접 진술한 사실 오류 감소 | 토큰과 지연 증가, 모델 능력이 개선의 상한 |
| Factored 검증 | 초안의 환각 반복 차단, 병렬 실행 | 검증 질문 수만큼 호출 증가 |
| 규칙의 코드 판정 | 결정론적 판정과 감사 가능성 | 규칙 유지 비용, 규칙 밖 사례는 사람 검토 |
| needs_review 상태 | 근거 없는 확정 답 감소 | 검토 인력과 응답 지연, 과잉 거부 위험 |
| 플랫폼 인용 기능 | 인용 위치의 유효성 보장 | 적용과 지지 검사는 남음, Claude는 구조화 출력과 병행 불가 |

## 면접 체크포인트

- 사실성 환각과 충실성 환각을 구분하고, 오래된 문서를 충실하게 요약한 답이 왜 틀릴 수 있는지 설명할 수 있는가.
- 이진 채점이 추측을 보상하는 이유와 확신 목표를 둔 채점으로 바꾸는 방법을 말할 수 있는가.
- CoVe에서 검증 질문을 초안 없이 따로 답하게 하는 이유와 그 한계는 무엇인가.
- chain-of-thought 설명을 근거로 쓰면 안 되는 이유와 대신 요구할 근거의 형태는 무엇인가.
- 에이전트가 환불했다고 말했는데 결제가 되지 않은 장애를 어떻게 막는가(실행 기록 대조, 자격과 실행 분리, 식별자 생성 금지).
- 인용이 붙어 있으면 근거가 있는 것인가(존재, 적용, 지지).

## 출처

2026-10-06에 환각 분류, 원인 분석, CoVe, 설명의 불충실성과 Claude 플랫폼 기능을 아래 1차 출처에 대조했다. 행동 주장의 실행 기록 대조, 규칙의 코드 판정, 인용의 세 검사와 평가 사례는 이를 적용한 설계 제안이다.

- [A Survey on Hallucination in Large Language Models: Principles, Taxonomy, Challenges, and Open Questions — ACM TOIS, Huang et al.](https://arxiv.org/abs/2311.05232)
- [Why Language Models Hallucinate — arXiv, Kalai et al.](https://arxiv.org/abs/2509.04664)
- [Chain-of-Verification Reduces Hallucination in Large Language Models — arXiv, Dhuliawala et al.](https://arxiv.org/abs/2309.11495)
- [Language Models Don't Always Say What They Think: Unfaithful Explanations in Chain-of-Thought Prompting — NeurIPS 2023, Turpin et al.](https://arxiv.org/abs/2305.04388)
- [Reasoning Models Don't Always Say What They Think — arXiv, Chen et al.](https://arxiv.org/abs/2505.05410)
- [Claude Platform Docs, Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)
- [Claude Platform Docs, Citations](https://platform.claude.com/docs/en/build-with-claude/citations)
- [Amazon Bedrock, Use contextual grounding check to filter hallucinations in responses](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-contextual-grounding-check.html)
- [Amazon Bedrock, What are Automated Reasoning checks in Amazon Bedrock Guardrails?](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-automated-reasoning-checks.html)
- [Amazon Bedrock, Integrate Automated Reasoning checks in your application](https://docs.aws.amazon.com/bedrock/latest/userguide/integrate-automated-reasoning-checks.html)

## 관련 문서

- [[LLM-Abstention|LLM Abstention (채점이 추측을 보상하는 구조, 확신 목표, needs_review)]]
- [[LLM-Generation-Mechanics-Context-and-Agent|Context, 환각과 에이전트 (생성 단계의 환각 원인)]]
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링 (적용 범위 메타데이터, 근거 추적)]]
- [[LLM-Failure-Handling|LLM 실패 처리 (구조화 출력의 한계, 도구 오류 전달)]]
- [[LLM-Generation-Mechanics-Decoding|추론과 디코딩 (temperature와 사실성)]]
- [[Payment-Unknown-Outcome-and-Reversal|결제 결과 미확인과 망취소 (상태와 증거 분리)]]
- [[Eval-Golden-Set-and-Deploy-Gates|골든셋과 배포 관문 (금지 주장과 경계 사례)]]
- [[Eval-LLM-Judge|LLM 판정기 (claim 지지 판정의 자동화와 편향)]]
- [[Eval-Rubric-and-Score-Gate|루브릭과 점수 게이트 (규칙의 결정론 검사 번역)]]
