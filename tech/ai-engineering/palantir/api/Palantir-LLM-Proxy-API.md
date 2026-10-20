---
tags: [palantir, foundry, aip, api, llm, governance]
status: done
verified_at: 2026-10-20
category: "AI엔지니어링(AIEngineering)"
aliases: ["팔란티어 LLM 프록시 API"]
---

# LLM Proxy API의 provider 호환성과 Foundry 경계

Foundry LLM proxy는 provider SDK의 요청 형식을 유지하면서 Foundry의 인증, 사용량 추적, 제한과 데이터 거버넌스 경계를 거치게 한다. provider의 직접 endpoint와 같은 주소나 같은 자격 증명을 사용하는 것은 아니다.

## Endpoint와 입력 형식

| API | POST 경로 | 대표 입력 | 예제의 출력 접근 |
|---|---|---|---|
| Anthropic Messages | `/api/v2/llm/proxy/anthropic/v1/messages` | model RID, messages와 max_tokens | content의 text block |
| OpenAI Chat Completions | `/api/v2/llm/proxy/openai/v1/chat/completions` | model RID, messages | choices의 message content |
| OpenAI Embeddings | `/api/v2/llm/proxy/openai/v1/embeddings` | embedding model RID와 input | data |
| OpenAI Responses | `/api/v2/llm/proxy/openai/v1/responses` | model RID와 input | output_text 또는 output content |

여기서 `model`은 provider의 일반 model ID 대신 Model Catalog에서 찾은 Foundry language-model RID다. 예제에 표시된 model이 모든 enrollment에 제공되거나 현재 기본값이라는 뜻은 아니다. 실제 사용 가능한 Catalog 항목과 그 기능을 확인한다.

전체 request schema는 각 provider의 API reference를 따른다. 다만 proxy가 provider의 모든 기능을 그대로 제공한다고 해석하면 안 된다. Foundry가 거버넌스 조건과 호환되는 기능을 선별해 활성화한다.

## 인증과 호출 scope

네 경로 모두 OAuth2로 endpoint를 호출하는 third-party application은 operation scope `api:use-language-models-execute`를 요청해야 한다. HTTP request는 Foundry Bearer token과 `Content-Type: application/json`을 전달한다. provider 계정의 API key를 Foundry token 대신 넣는 구조가 아니다.

Python 예제는 `foundry_sdk.v2.language_models.utils`의 token, provider base URL과 HTTP client helper를 사용한다. provider SDK의 api_key 또는 auth_token 인자에는 helper로 받은 Foundry token을 전달한다. 확인일의 helper 호출 예제에는 `preview=True`가 포함된다. 이 예제만으로 production support나 SDK helper의 stable 상태를 확정하지 않는다.

TypeScript 예제는 OSDK `PlatformClient.tokenProvider()`와 `PlatformClient.fetch`를 provider client에 전달한다. OpenAI용 base URL은 proxy의 `/openai/v1`, Anthropic용은 `/anthropic` prefix를 사용한다. provider SDK가 뒤에 붙이는 경로가 다르므로 최종 endpoint 경로와 client의 base URL을 같은 문자열로 취급하지 않는다. 확인일의 TypeScript 예제는 `platformClient.baseUrl` 뒤에 앞쪽 slash 없이 `api/v2/llm/proxy/openai/v1` 또는 `api/v2/llm/proxy/anthropic`을 이어 붙인다. 네 proxy 문서는 `baseUrl`의 끝 slash 형식을 명시하지 않는다. 이 문자열 연결은 `baseUrl`이 `/`로 끝날 때만 올바른 경로가 되므로 사용하는 client에서 최종 요청 URL을 확인한다.

## Attribution과 tracing은 서로 다른 header다

| Header | 의미 | 생략 시 영향 |
|---|---|---|
| `attribution` | 사용량을 귀속할 Project RID들을 쉼표로 연결 | 호출 사용자에게 직접 귀속 |
| `traceParent` | W3C Trace Context traceparent | 플랫폼 내 관측 기능이 동작하지 않음 |
| `traceState` | W3C Trace Context tracestate | 플랫폼 내 관측 기능이 동작하지 않음 |

공식 Python HTTP client helper와 TypeScript PlatformClient fetch는 attribution/tracing을 자동 전파한다. provider SDK만 새로 만들고 일반 HTTP client를 넣으면 같은 전파가 이루어진다고 전제하지 않는다. 계측 header를 빼먹은 요청도 모델 응답을 받을 수 있어 호출 성공과 추적 성공을 별도로 확인한다. 마지막 문장은 명시된 header 생략 효과에서 도출한 점검이다.

## 데이터 거버넌스와 사용량

### 세션 라우팅과 캐시 친화성

2026-10-20 확인 기준, 선택적 `X-Palantir-session-id` header는 Anthropic Messages, OpenAI Chat Completions, OpenAI Responses proxy 문서의 header 표에 같은 설명으로 실려 있다. OpenAI Embeddings proxy 문서의 header 표에는 이 header가 없다. 문서에 없는 경로가 이 header를 지원하거나 같은 라우팅 효과를 낸다고 전제하지 않는다.

이 header는 하나의 멀티턴 대화처럼 같은 논리적 세션에 속한 요청을 묶는 불투명 식별자다. 값은 256자 미만으로 유지하라고 되어 있으며, 256자 이상일 때의 처리는 명시되어 있지 않다. 같은 식별자를 공유하는 요청은 가능하면 같은 모델 제공자 backend로 라우팅되고, 문서는 이것이 세션 전반의 프롬프트 캐시 적중률을 높인다고 설명한다.

이 라우팅 친화성은 best-effort이며 보장되지 않는다. 요청을 계속 처리할 수 있게 하려고 친화성을 포기할 수 있고, 일정 기간 활동이 없으면 친화성이 만료된다. 구체적인 유휴 시간은 명시되어 있지 않다.

따라서 이를 캐시 적중, 고정 backend, 대화 이력 저장이나 세션 지속성의 보장으로 해석하지 않는다. 세션 header는 라우팅용 식별자로만 문서화되어 있으므로 이전 대화를 대신 채워 준다고 전제하지 않는다. Anthropic Messages와 Chat Completions에서는 세션 header와 별개로 API 계약에 맞는 `messages`를 매 요청에 전달한다. Responses 경로의 확인일 예제는 `model`과 `input`을 보내며, provider 측 대화 상태 기능을 proxy에서 쓸 수 있는지는 확인하지 않았다.

공식 Python SDK와 OSDK가 자동으로 설정한다고 명시된 header는 `attribution`, `traceParent`, `traceState`다. 확인일의 세 경로 예제(curl, Python, TypeScript)에는 세션 header를 설정하는 코드가 없다. helper나 PlatformClient를 쓴다고 세션 header까지 붙는다고 전제하지 않으며, 사용하려면 호출 코드에서 직접 지정하고 실제 요청에 포함됐는지 확인한다.

위 내용은 네 proxy 문서의 header 표와 예제를 대조한 것이며 실제 라우팅, backend 선택이나 캐시 적중률을 측정한 결과가 아니다. proxy 응답이 provider의 캐시 사용량 field를 그대로 전달하는지도 확인하지 않았다. 캐시 재사용의 일반 원리와 측정 방법은 [[LLM-Prompt-Caching|프롬프트 캐싱]]에서 다룬다.

### 보존 정책과 provider 기능

proxy는 다른 AIP 사용과 같은 ZDR, georestriction 요구를 적용하며 호환 가능한 provider API 기능을 선택적으로 제공한다. 사용량은 Resource Management에서 확인하고 rate limiting을 적용한다.

provider가 새 field나 tool 기능을 출시한 사실만으로 Foundry proxy에서 즉시 같은 기능을 사용할 수 있다고 판단하지 않는다. 모델 RID의 지원 기능, 거버넌스와 proxy 지원 범위를 함께 확인한다. 지역/보존 정책을 앱의 별도 로그나 외부 후처리에도 자동 전파하는 것으로 확대하지 않는다.

이 문서는 네 proxy 문서의 요청/인증/계측/거버넌스 설명과 코드를 대조한 기록이다. provider 전체 schema, streaming/event별 동작, 오류 mapping과 enrollment별 지원은 이 문서만으로 확정하지 않았다. 모델 호출과 사용량 귀속을 실제로 시험하지 않았다.

## 출처

- [Palantir, Anthropic Messages Proxy](https://www.palantir.com/docs/foundry/api/llm-apis/models/anthropic-messages-proxy)
- [Palantir, OpenAI Chat Completions Proxy](https://www.palantir.com/docs/foundry/api/llm-apis/models/openai-chat-completions-proxy)
- [Palantir, OpenAI Embeddings Proxy](https://www.palantir.com/docs/foundry/api/llm-apis/models/openai-embeddings-proxy)
- [Palantir, OpenAI Responses Proxy](https://www.palantir.com/docs/foundry/api/llm-apis/models/openai-responses-proxy)

## 관련 문서

- [[Palantir-API]]
- [[Palantir-API-Client-Contract]]
- [[Palantir-AIP-Logic-and-Evaluation]]
- [[Palantir-SDK-and-Agent-Tools]]
