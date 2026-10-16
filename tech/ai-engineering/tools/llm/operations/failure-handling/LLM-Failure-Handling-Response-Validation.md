---
tags: [ai, llm, reliability, structured-output, streaming]
status: done
verified_at: 2026-10-06
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Failure Handling Response Validation", "LLM 응답 검증", "stop_reason 처리", "구조화 출력의 한계"]
---

# LLM 실패 처리: 200 응답 검증, 입력 크기와 스트리밍

HTTP 200 안에서 일어나는 잘림, 거절과 형식 위반을 `stop_reason`과 출력 검증으로 거르고, 보내기 전 크기 계산과 끊긴 스트림의 복구를 다룬다. 상위: [[LLM-Failure-Handling|LLM 실패 처리]].

## 200 응답은 stop_reason부터 확인한다

| `stop_reason` | 의미 | 처리 |
|---|---|---|
| `end_turn` | 자연스럽게 끝남 | 출력 검증으로 넘긴다. 도구 결과 직후 2~3토큰짜리 빈 응답이면 그대로 재시도하지 않고 새 user 메시지로 이어 쓰기를 요청한다. 도구 결과 바로 뒤에 텍스트 블록을 붙이지 않는 것이 예방책이다 |
| `max_tokens` | `max_tokens`에서 잘림 | 상한을 올리거나 이어 쓰기를 요청한다. 잘린 `tool_use`는 더 큰 `max_tokens`로 다시 요청한다 |
| `model_context_window_exceeded` | 입력과 출력이 컨텍스트 창을 채움 | 잘린 응답으로 다룬다. `max_tokens`를 올려도 같은 지점에서 멈추므로 입력을 줄이거나 작업을 나누거나 더 큰 창의 모델로 보낸다 |
| `refusal` | 안전 분류기의 거절, HTTP 200 | `stop_details.category`를 읽는다. `reasoning_extraction`은 JSON 출력이나 도구 입력의 추론 필드 같은 프롬프트 원인이라 폴백하지 않고 프롬프트를 고치며, 나머지는 다른 모델로 폴백한다([[Claude-Fable-5-Mythos-5\|거절과 폴백]]) |
| `pause_turn` | 서버 도구 루프가 반복 한도(기본 10회)에 닿음 | 응답을 그대로 다시 보내 이어 간다 |
| `tool_use` | 도구 호출 | 실행하고 `tool_result`로 돌려준다 |
| `stop_sequence` | 지정한 정지 시퀀스 출력 | 호출 목적에 맞게 처리한다 |

OpenAI도 Structured Outputs의 거절을 스키마를 따르지 않는 별도 `refusal`로 표시하고, Responses API는 `max_output_tokens`에 닿으면 `status`를 `incomplete`로, `incomplete_details.reason`을 `max_output_tokens`로 돌려준다. 거절은 200으로 오므로 오류율이나 5xx에 기댄 모니터링에 잡히지 않는다. 거절, 잘림, 폴백 처리 건수를 별도 이벤트와 지표로 남긴다.

## 구조화 출력은 형식만 보장한다

- Anthropic의 JSON 출력(`output_config.format`의 `type: "json_schema"`)과 strict tool use(`strict: true`)는 제약 디코딩으로 스키마에 맞는 출력을 낸다. OpenAI도 JSON mode는 유효한 JSON까지, Structured Outputs는 스키마 준수까지 보장한다고 구분한다.
- 예외가 있다. 거절은 스키마보다 우선하고 `max_tokens` 잘림은 불완전한 JSON을 남긴다. 문자열 `enum`과 `const`의 대소문자는 보장되지 않고 오류나 특별한 `stop_reason` 없이 끝나므로 대소문자를 무시하고 비교하며 대소문자만 다른 값을 두지 않는다.
- `minimum`, `maximum`, `minLength`, `maxLength` 같은 제약은 지원하지 않는다. SDK 헬퍼는 이를 빼고 필드 설명에 옮겨 보내며, 응답을 검증하는 헬퍼일 때만 원래 제약으로 검사한다. 애플리케이션의 스키마 검증은 남겨 둔다([[Runtime-Validation-Libraries|런타임 검증 라이브러리]]).
- 명시 한도(요청당 strict 도구 20개, 선택 매개변수 합계 24개, 유니온 타입 매개변수 16개)를 지켜도 합친 스키마가 너무 복잡하면 400 `Schema is too complex for compilation`이 난다. 새 스키마의 첫 요청은 문법 컴파일로 지연이 늘고 컴파일 결과는 마지막 사용 뒤 24시간 캐시된다.
- 스키마에 맞아도 값은 틀릴 수 있다. 업무 규칙은 코드로, 근거가 필요한 사실은 원천 데이터 대조나 판정 모델로, 오류 비용이 큰 결과는 사람 검토로 확인한다([[LLM-Abstention]], [[Eval-LLM-Judge|LLM 판정기]]).

```ts
// Message는 @anthropic-ai/sdk 타입이고 Invoice, InvoiceSchema(Zod), parseJsonOrNull, firstText, findRuleViolations는 애플리케이션이 정의한다.
type Outcome =
  | { kind: 'ok'; invoice: Invoice }
  | { kind: 'fallback' | 'fix-prompt' | 'retry-larger' | 'shrink-input' | 'repair' | 'human-review'; reason: string };

/** 도구 없는 추출 호출의 응답을 거른다. repair는 검증 오류를 붙여 한 번만 다시 요청한다. */
const classify = (response: Message): Outcome => {
  const { stop_reason: stopReason, stop_details: stopDetails } = response;
  if (stopReason === 'refusal') {
    return stopDetails?.category === 'reasoning_extraction'
      ? { kind: 'fix-prompt', reason: 'reasoning_extraction' }
      : { kind: 'fallback', reason: stopReason };
  }
  if (stopReason === 'max_tokens') return { kind: 'retry-larger', reason: stopReason };
  if (stopReason === 'model_context_window_exceeded') return { kind: 'shrink-input', reason: stopReason };
  const parsed = InvoiceSchema.safeParse(parseJsonOrNull(firstText(response)));
  if (!parsed.success) return { kind: 'repair', reason: parsed.error.message };
  const violations = findRuleViolations(parsed.data); // 합계 불일치, 기간 밖 날짜, 없는 거래처 ID
  return violations.length === 0
    ? { kind: 'ok', invoice: parsed.data }
    : { kind: 'human-review', reason: violations.join(', ') };
};
```

## 보내기 전에 크기를 잰다

- 컨텍스트 창에는 시스템 프롬프트, 메시지(도구 결과, 이미지, 문서 포함), 도구 정의와 이번 출력(사고 포함)이 모두 들어간다. 캐시된 프롬프트도 창을 차지하며, 캐시는 창 점유가 아니라 비용과 대부분 모델의 ITPM 계산을 바꾼다.
- 입력만으로 창을 넘으면 모든 Claude 모델이 400 `prompt is too long`을 돌려준다. 입력과 `max_tokens`의 합만 넘으면 Claude 4.5 이후 모델은 요청을 받아 창 한계에서 `model_context_window_exceeded`로 멈춘다. 이전 모델은 기본으로 400 검증 오류를 돌려주고, `model-context-window-exceeded-2025-08-26` 베타 헤더를 보내면 같은 동작을 고를 수 있다.
- 토큰 계산 API(`POST /v1/messages/count_tokens`)는 추정치를 준다. 무료지만 메시지 생성과 별개인 분당 요청 한도가 있다. Claude 4.7 이후 모델의 토크나이저는 같은 텍스트를 이전 모델보다 약 30% 많은 토큰으로 세므로 폴백 대상 모델로 다시 센다. 서버 도구(advisor 도구 제외)와 MCP 커넥터가 든 요청에는 토큰 계산 API가 `invalid_request_error`를 돌려주므로 응답의 `usage`로 사후 확인하고, `url`이나 `file` 소스의 이미지와 문서는 base64로 바꿔 센다.
- 넘칠 때 줄이는 순서를 미리 정한다. 오래된 대화 요약, 오래된 도구 결과 삭제, 검색 문서 수 축소, 작업 분할 순이고 Anthropic은 서버 측 compaction(베타, Claude 4.6 이후)과 context editing도 제공한다. 토큰이 늘수록 정확도와 회상이 떨어지므로 창을 채우는 것 자체를 목표로 두지 않는다([[Context-Engineering]], [[Agent-Context-Budget]]).
- 바이트와 개수 한도는 따로 있다. Messages API 요청은 32MB를 넘으면 413이고, 1M 창 모델은 요청당 이미지나 PDF 페이지 600개(200k 창 모델은 100개)까지 받는다.

## 스트리밍과 긴 요청

- SSE 스트림은 200을 받은 뒤에도 오류 이벤트(예: 비스트리밍이면 529에 해당하는 `overloaded_error`)가 올 수 있다. 상태 코드 기반 처리를 타지 않으므로 스트림 소비 코드에서 따로 처리한다. 거절도 일부 출력 뒤 스트림 중간에 올 수 있으므로 받은 부분을 불완전한 출력으로 보고 버린다.
- 끊긴 스트림은 받은 부분을 저장하고 이어 쓰기 요청으로 복구한다. Claude 4.6 이후는 부분 응답을 담은 user 메시지로 이어서 쓰라고 지시하고, 4.5 이전은 부분 응답을 assistant 메시지 앞부분으로 넣는다. `tool_use`와 사고 블록은 부분 복구가 안 되므로 가장 최근 텍스트 블록부터 다시 받는다. 이미 사용자에게 보여 준 앞부분과 다시 생성한 결과가 달라질 수 있으니 이어 쓸지 화면을 교체할지 정해 둔다.
- 10분 넘게 걸릴 수 있는 요청은 스트리밍이나 Message Batches API로 보낸다. 일부 네트워크는 유휴 연결을 끊고, Anthropic SDK는 약 10분을 넘길 것으로 예상되는 비스트리밍 요청에 오류를 낸다.

## 출처

- [Claude Platform Docs, Errors](https://platform.claude.com/docs/en/api/errors)
- [Claude Platform Docs, Rate limits](https://platform.claude.com/docs/en/api/rate-limits)
- [Claude Platform Docs, Stop reasons and fallback](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons)
- [Claude Platform Docs, Refusals and fallback](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback)
- [Claude Platform Docs, Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Claude Platform Docs, Context windows](https://platform.claude.com/docs/en/build-with-claude/context-windows)
- [Claude Platform Docs, Token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting)
- [Claude Platform Docs, Streaming messages](https://platform.claude.com/docs/en/build-with-claude/streaming)
- [Claude Platform Docs, Handle tool calls](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)
- [Claude Platform Docs, Python SDK](https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/python)
- [Claude Platform Docs, TypeScript SDK](https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript)
- [OpenAI API Docs, Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)

## 관련 문서

- [[LLM-Failure-Handling|LLM 실패 처리 (묶음 인덱스)]]
- [[LLM-Failure-Handling-Classification|실패 분류와 오류 응답]]
- [[LLM-Failure-Handling-Recovery|재시도, 폴백과 부분 완료]]
- [[Claude-Fable-5-Mythos-5|Claude Fable 5, Mythos 5]] — 거절 응답, 폴백 3종과 폴백 크레딧
- [[External-Collection-Pipeline-Reliability|외부 수집 파이프라인 신뢰성]] — 200인데 스키마가 깨지는 실패의 분류
