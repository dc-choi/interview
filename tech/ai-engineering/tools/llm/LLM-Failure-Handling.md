---
tags: [ai, llm, reliability, error-handling, retry, fallback]
status: done
verified_at: 2026-10-06
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Failure Handling", "LLM Error Handling", "LLM 오류 처리", "LLM 실패 처리", "의미적 실패", "Semantic Failure"]
---

# LLM 애플리케이션의 실패 처리 (LLM Failure Handling)

## 정의

LLM 애플리케이션의 실패 처리는 모델 호출 경로(입력 준비, 모델 API, 스트리밍, 출력 검증, 도구 실행)에서 생기는 실패를 지속성과 범위로 나눠 재시도, 입력 축소, 다른 모델이나 경로로의 전환, 사람 이관 중 하나로 보내는 설계다. 일반 외부 API 연동과는 두 가지가 다르다.

- 기술적 실패(연결, 타임아웃, 한도, 인증)는 오류 응답으로 드러나지만 의미적 실패(잘림, 거절, 형식 위반, 근거 없는 내용, 잘못된 도구 인자)는 HTTP 200 안에서 일어난다. 상태 코드만 보는 오류 처리는 앞의 것만 잡는다.
- 같은 상태 코드가 다른 조치를 요구한다. 429는 기다리면 풀리는 속도 한도일 수도, 재시도로는 풀리지 않는 지출 한도일 수도 있다.

타임아웃 측정 범위, 벌크헤드, 서킷 브레이커 상태 전이는 [[External-Service-Resilience|외부 서비스 장애 대응]], 백오프와 지터 공식과 재시도 예산은 [[Retry-Backoff-Jitter|재시도, 지수 백오프와 지터]], 멱등 키의 서버 동작은 [[Idempotency|멱등성]]을 따른다. 이 문서는 LLM 호출에서 달라지는 판단만 다루며 제공자 동작은 2026-10-06 Anthropic, OpenAI 공식 문서 기준이다.

## 동작 원리: 지속성과 범위로 나눈다

지속성에 따라 기본 대응이 정해진다.

| 분류 | 신호 | 기본 대응 |
|---|---|---|
| 일시 | 연결 오류, 타임아웃, 속도 한도, 과부하(Anthropic 529, OpenAI 503), 5xx | 상한을 둔 재시도와 `retry-after` 준수, 이어서 전환 |
| 영구 | 인증과 권한(401, 403), 잘못된 요청(400), 결제와 지출 한도, 컨텍스트 초과 | 재시도하지 않고 고칠 수 있는 사람에게 알린다. 컨텍스트 초과는 입력 축소나 더 큰 창의 모델로 푼다 |
| 의미 | 200 응답의 잘림, 거절, 스키마 위반, 근거 없는 사실, 잘못된 도구 인자 | 검증 뒤 수정 요청, 입력 축소, 사람 검토 |

범위에 따라 다른 모델로 바꿔서 풀리는지가 정해진다.

| 범위 | 예 | 통하는 대응 |
|---|---|---|
| 요청 | 형식이 잘못된 요청, 조직 정책이 내용 때문에 막은 요청 | 요청을 고친다. 다른 모델로 보내도 대개 결과가 같다(prefill, 강제 `tool_choice`처럼 모델마다 지원이 다른 기능의 400은 예외) |
| 모델 | 모델별 용량 부족, 모델별 속도 한도, 그 모델 안전 분류기의 거절(`reasoning_extraction` 제외) | 다른 모델로 전환 |
| 계정 | 키 만료나 폐기, 결제 문제, 지출 한도 | 운영자 조치. 같은 키와 계정으로는 모델을 바꿔도 실패한다 |
| 제공자 | 제공자 전체 장애, 네트워크 경로 | 다른 제공자나 장애 영역이 분리된 다른 호스팅 경로 |

Anthropic은 속도 한도를 모델별로 따로 적용하고(Fable 5.1과 Fable 5처럼 일부 계열은 합산), Claude Code 문서는 용량이 모델별로 관리되므로 529가 이어지면 다른 모델로 바꿔 계속하라고 안내한다. 반대로 Claude Code는 조직 정책 검사가 거부한 요청을 같은 모델이나 폴백 모델로 다시 보내지 않는다. 거부 원인이 모델이 아니라 요청 내용이기 때문이다.

## 상태 코드보다 오류 본문을 본다

| 상황 | Anthropic | OpenAI | 대응 |
|---|---|---|---|
| 속도 한도 | 429 `rate_limit_error`, `retry-after` 헤더 | 429 Rate limit reached | `retry-after`만큼 기다리고 동시성을 줄인다 |
| 급격한 사용량 증가 | 429 (acceleration limit) | 429 Slow down | 트래픽을 점진적으로 올린다 |
| 지출 한도(OpenAI는 크레딧 소진 포함) | 티어 월 지출 상한은 429 `rate_limit_error`, `retry-after` 없음, Messages API에서는 `error.details.error_code`가 `enforced_spend_limit_reached`. 직접 정한 지출 한도는 400(Claude Code 워크스페이스는 `retry-after`가 붙은 429일 수 있음) | 429 Credit balance exhausted, spend limit reached, usage limit reached | 재시도를 멈추고 한도를 조정한다 |
| 과부하 | 529 `overloaded_error` | 503 Model temporarily overloaded | 백오프 재시도, 다른 모델 |
| 서버 오류, 처리 시간 초과 | 500 `api_error`, 504 `timeout_error` | 500 | 제한된 재시도, 긴 요청은 스트리밍 |
| 인증, 권한, 결제 | 401, 403, 402 `billing_error` | 401, 403 | 재시도 없이 알린다 |
| 요청 크기 | 413 `request_too_large` (Messages API 32MB) | - | 입력을 줄인다 |

- Anthropic은 티어 월 지출 상한 429가 SDK 자동 재시도를 포함한 모든 재시도에서 접근이 재개될 때까지 실패한다고 밝히고, OpenAI도 결제, 지출, 쿼터 오류는 재시도로 접근이 돌아오지 않는다고 밝힌다. 상태 코드가 같아도 본문의 오류 코드와 `retry-after` 유무로 나눈다.
- Anthropic 오류 본문은 `error.type`, `error.message`와 `request_id`를 담고 type 값은 앞으로 늘어날 수 있다. SDK의 타입별 예외를 구체적인 것부터 잡고 메시지 문자열을 매칭하지 않으며, 모르는 type은 기본 분기로 보낸다.
- 모든 응답의 `request-id` 헤더(Python, TypeScript SDK는 `_request_id`)를 로그에 남겨 추적과 지원 문의에 쓴다([[Correlation-ID]]).

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

## 재시도: SDK가 이미 하고 있다

- Anthropic과 OpenAI의 Python, TypeScript SDK는 연결 오류, 408, 409, 429, 500 이상을 짧은 지수 백오프로 기본 2회 재시도하고, 기본 10분 타임아웃에 걸린 요청도 2회 재시도한다. Anthropic SDK는 `retry-after`가 있으면 따른다.
- 애플리케이션이나 큐 소비자가 그 위에서 다시 재시도하면 시도 횟수가 곱해진다. 한 계층만 재시도 예산을 갖게 하고 나머지는 재시도 횟수를 0으로 끈다([[Retry-Backoff-Jitter#재시도 규율 — 언제, 어디서, 몇 번|단일 계층 재시도]]).
- SDK는 서버가 `x-should-retry`로 재시도하지 말라고 알리지 않으면 429를 재시도하므로 지출 상한 429도 다시 보낼 수 있다. 예외 타입이 속도 한도와 같으니 `error.details.error_code`로 구분하고, 첫 응답에서 멈추려면 SDK 재시도를 끄고(`max_retries=0`) 재시도를 맡은 한 계층이 이 코드를 먼저 본다.
- 기본 10분 타임아웃은 대화형 화면이 기다릴 수 있는 시간보다 길다. 경로마다 전체 deadline을 정하고 긴 생성은 스트리밍으로 받는다([[External-Service-Resilience#1. Timeout (타임아웃)|타임아웃 측정 범위]]).
- OpenAI는 실패한 요청도 분당 한도를 소모한다고 밝힌다. 즉시 반복 재전송은 회복을 늦춘다.

## 폴백과 기능 저하

- 폴백 대상은 같은 제공자의 다른 모델, 다른 클라우드의 같은 모델, 다른 제공자, 캐시나 미리 만든 응답, 사람 이관 가운데 위 범위 표의 실패 범위에 맞춰 고른다.
- 작업마다 폴백이 포기해도 되는 것(개인화, 문체)과 지켜야 하는 것(원천 데이터 대조, 실시간 정합성)을 정하고 허용 폴백 목록을 둔다([[Failure-Evolution-Under-Load#Degradation 사다리 — 폴백에도 지켜야 할 것이 있다|Degradation 사다리]]).
- 같은 계정과 키를 쓰는 폴백은 계정 범위 실패와 제공자 장애를 함께 맞는다. 합산 한도로 묶인 모델(OpenAI 문서의 shared limit 계열 포함)로 바꾸면 속도 한도도 같이 맞는다.
- Anthropic 서버 측 `fallbacks`(Claude API 베타, Message Batches와 Bedrock, Google Cloud, Microsoft Foundry 미지원)는 안전 분류기 거절에만 동작한다. 요청한 모델의 속도 한도, 과부하, 서버 오류는 그대로 돌아오므로 가용성 폴백은 직접 만든다. 폴백 모델이 한도에 걸리거나 과부하면 폴백 없이 거절이 돌아오고 실행된 시도는 모두 각 모델의 한도를 소모하므로, 폴백 모델의 한도를 예상 물량에 맞춘다.
- 폴백 모델은 같은 요청에 다르게 반응한다. 같은 제공자 안에서도 창이 1M인 모델과 200k인 모델(예: Haiku 4.5)이 섞여 있고 토크나이저, 구조화 출력 지원 여부, `tool_choice` 강제 지원(Opus 5.5, Sonnet 5.5, Fable 5.1은 `any`와 `tool`에 400), assistant prefill 지원(Claude 4.6 이후 400)이 다르다. 폴백 경로도 같은 eval로 합격선을 확인한다([[LLM-Model-Tiers|모델 티어와 폴백]], [[LLM-Eval-Strategy]]).
- 평소에 쓰이지 않는 폴백 경로는 잠복 결함을 품기 쉬우므로([[External-Service-Resilience#Fallback|폴백의 잠복 결함]]) 실트래픽 일부를 폴백 모델에도 계속 보내고 그 결과를 eval에 넣는다.

### Bedrock의 리전 간 추론과 애플리케이션 복구

2026-10-09 AWS 문서 기준, cross-Region inference는 inference profile이 정한 대상 리전의 연산 자원으로 추론 요청을 라우팅한다. 모델 용량과 일시적인 가용성 문제에 대응하는 기능이며, 호출하는 애플리케이션의 게이트웨이나 함수 계층 장애까지 복구하지 않는다. 애플리케이션의 진입점과 상태 저장소 복구는 별도로 설계한다.

- **처리 위치:** Geographic profile은 지정된 지리적 범위 안에서, Global profile은 지원되는 전 세계 상용 리전에서 처리한다. 입력과 출력이 호출 리전 밖으로 이동할 수 있으므로 허용된 처리 위치와 맞는 profile을 고른다.
- **권한 실패:** Geographic profile은 profile 자체, 호출 리전의 모델과 모든 대상 리전의 모델에 대한 권한이 필요하다. SCP가 대상 리전을 막는다면 해당 리전을 허용하거나 특정 inference profile에 맞는 예외가 필요하다. 차단된 리전만 자동으로 제외한다고 가정하지 않는다.
- **관측:** 호출 리전의 CloudTrail에서 `additionalEventData.inferenceRegion`으로 실제 처리 리전을 확인한다. 요청이 성공했다는 사실과 애플리케이션 전체의 리전 장애 복구 검증은 구분한다.

## 서킷 브레이커, 한도, 동시성

- 용량과 속도 한도가 모델별이므로 서킷 브레이커와 동시성 한도도 제공자가 아니라 모델과 호스팅 경로 단위로 둔다([[External-Service-Resilience#3. Circuit Breaker (서킷 브레이커)|서킷 브레이커]]).
- 가용성 브레이커는 기술적 실패만 센다. 거절률, 잘림률, 스키마 위반률은 별도 지표와 경보로 보고, 갑자기 오르면 모델이나 프롬프트 변경의 회귀를 먼저 의심한다.
- Anthropic은 조직 단위로 모델별 RPM, ITPM, OTPM을 토큰 버킷으로 연속 보충하며, 60 RPM이 초당 1회로 집행될 수 있어 짧은 버스트도 429를 받을 수 있다. 대부분 모델에서 캐시 읽기 토큰은 ITPM에 들어가지 않고 OTPM은 실제 생성 토큰만 세어 `max_tokens` 설정과 무관하다. OpenAI는 `max_tokens`와 문자 수 기반 추정치 중 큰 값으로 한도를 계산하므로, 같은 `max_tokens`라도 제공자마다 한도 소모가 다르다.
- 응답 헤더(`anthropic-ratelimit-*`, OpenAI `x-ratelimit-*`)의 남은 양으로 동시성을 조절하고 대화형 요청을 배치 작업보다 먼저 처리하는 우선순위 큐를 둔다. 급하지 않은 대량 작업은 별도 한도를 쓰는 Message Batches API로 보낸다([[Cache-vs-Queue]], [[Backpressure]]).
- 요청당 토큰, 문서 크기, 검색 결과 수, 도구 호출 수와 워크플로 전체 시간에도 상한을 둔다([[Agent-Loop-Engineering]]).

## 도구 실행과 부분 완료

- 도구가 실패하면 예외로 루프를 깨지 않고 `tool_result`에 `is_error: true`와 무엇이 잘못됐고 다음에 무엇을 할지 적은 메시지(예: `Rate limit exceeded. Retry after 60 seconds.`)를 돌려준다. 필수 인자가 빠졌다는 오류를 받으면 Claude는 2~3회 고쳐 다시 시도한 뒤 사과하며, strict tool use는 입력을 스키마에 맞춘다([[Agent-From-Scratch|도구 호출 루프]]).
- 결제처럼 부수효과가 있는 도구는 실행에 성공한 뒤 확인 전에 워크플로가 실패할 수 있다. 이때 단계를 처음부터 다시 돌리면 같은 효과가 두 번 난다.
- 멱등 키를 `tool_use.id`로 만들지 않는다. 이 id는 그 블록의 고유 식별자라 모델 호출을 다시 하면 새 값이 나온다. 주문 ID와 동작처럼 업무에서 나온 값이나 실행 전에 저장한 단계 ID로 키를 만들고 실행 상태를 함께 기록한다.
- 외부 API의 멱등 키 보존 기간과 비교 규칙을 확인한다. Stripe API v1은 실행이 시작된 첫 요청의 상태 코드와 본문을 저장해 500까지 같은 결과로 돌려주지만, 24시간이 지난 키는 정리될 수 있고 정리된 키는 새 요청으로 처리된다. 같은 키에 다른 파라미터를 보내면 오류이므로, 모델이 인자를 다시 생성해 값이 하나라도 달라지면 같은 키로도 재생되지 않고 오류가 난다. 인자도 실행 전에 저장하고, 에이전트가 보존 기간보다 늦게 재개되면 키만으로 중복을 막지 못하므로 재개 전에 상대 시스템과 대사한다. API 버전별 차이는 [[Idempotency-Key|멱등성 키]], 재개 전 상태 조회는 [[Payment-Reconciliation-Worker]]를 따른다([[Payment-Unknown-Outcome-and-Reversal|결제 결과 미확인]], [[Durable-Workflow|지속 실행 워크플로]]).
- 도구 결과는 외부 내용을 담으므로 그 안의 지시를 따르지 않는다([[LLM-Application-Security|LLM 애플리케이션 보안]]).

## 트레이드오프

| 선택 | 얻는 것 | 잃는 것 |
|---|---|---|
| 재시도 횟수 증가 | 일시 실패 흡수 | 지연, 한도 소모, 과부하 악화 |
| 같은 제공자 안의 모델 전환 | 구현이 단순하고 모델 범위 실패를 피함 | 계정과 제공자 범위 실패는 그대로 |
| 다른 제공자로 전환 | 제공자 장애 회피 | 프롬프트와 eval 이중 관리, 공통 기능으로 제한, 데이터 처리 계약 추가 |
| 캐시와 정적 응답 | 주 경로 장애 중에도 캐시가 적중하는 범위에서 응답 | 신선도와 개인화 손실, 폴백 경로 자체의 실패 |
| 의미 검증 강화 | 조용한 오답 감소 | 판정 모델과 사람 검토의 비용, 지연 |

## 운영 체크포인트

- 오류 분류가 상태 코드, 오류 type과 본문 코드, `retry-after` 유무를 함께 보는가. 모르는 type의 기본 분기가 있고 `request-id`를 로그에 남기는가.
- 모든 응답에서 `stop_reason`(OpenAI는 `status`, `incomplete_details`, `refusal`)을 분기하는가.
- 거절, 잘림, 스키마 위반, 폴백 사용, 재시도 비율을 5xx와 별도로 보고 경보하는가.
- SDK, 애플리케이션, 큐 소비자 중 한 계층만 재시도 예산을 갖는가.
- 대상 모델 기준으로 토큰을 센 뒤 보내고, 넘칠 때 줄이는 순서가 코드에 있는가.
- 폴백 모델이 같은 eval, 컨텍스트 창, 기능과 한도를 만족하고 평소에도 트래픽을 받는가.
- 부수효과 도구가 업무 식별자 기반 멱등 키와 실행 기록을 갖는가.

## 출처

- [Amazon Bedrock User Guide, Route model inference requests across AWS Regions with cross-Region inference](https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html)
- [Amazon Bedrock User Guide, Geographic cross-Region inference](https://docs.aws.amazon.com/bedrock/latest/userguide/geographic-cross-region-inference.html)
- [AI agent exposure and integration on AWS — AWS Marketplace](https://aws.amazon.com/marketplace/build-learn/ai-agent-learning-series/agent-exposure-and-integration) — 2026-10-09 리전 간 추론의 범위와 애플리케이션 계층 장애의 구분을 대조했다. 기존 제공자별 오류 계약 전체를 재검증한 기록은 아니다.
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
- [Claude Code Docs, Error reference](https://code.claude.com/docs/en/errors)
- [OpenAI API Docs, Error codes](https://developers.openai.com/api/docs/guides/error-codes)
- [OpenAI API Docs, Rate limits](https://developers.openai.com/api/docs/guides/rate-limits)
- [OpenAI API Docs, Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [openai-python — GitHub, openai](https://github.com/openai/openai-python)
- [openai-node — GitHub, openai](https://github.com/openai/openai-node)
- [Stripe API Reference, Idempotent requests](https://docs.stripe.com/api/idempotent_requests)

## 관련 문서

- [[External-Service-Resilience|외부 서비스 장애 대응]] — 타임아웃, 벌크헤드, 서킷 브레이커, 폴백의 범용 패턴
- [[Retry-Backoff-Jitter|재시도, 지수 백오프와 지터]] — 백오프 공식, 단일 계층 재시도, 재시도 예산
- [[Idempotency|멱등성]] — 멱등 키의 서버 동작
- [[LLM-Model-Tiers|LLM 모델 티어 선택, 라우팅]] — 에스컬레이션과 하위 티어 폴백
- [[Claude-Fable-5-Mythos-5|Claude Fable 5, Mythos 5]] — 거절 응답, 폴백 3종과 폴백 크레딧
- [[LLM-Eval-Strategy|LLM Eval 전략]] — 재시도와 워커 교체 같은 복구 정책의 별도 평가
- [[External-Collection-Pipeline-Reliability|외부 수집 파이프라인 신뢰성]] — 200인데 스키마가 깨지는 실패의 분류
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처]] — 루프 가드레일과 사후 사용량 제한
