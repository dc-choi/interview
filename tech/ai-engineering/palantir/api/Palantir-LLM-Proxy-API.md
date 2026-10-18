---
tags: [palantir, foundry, aip, api, llm, governance]
status: done
verified_at: 2026-10-16
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

네 경로 모두 OAuth2 operation scope `api:use-language-models-execute`를 요구한다. HTTP request는 Foundry Bearer token과 `Content-Type: application/json`을 전달한다. provider 계정의 API key를 Foundry token 대신 넣는 구조가 아니다.

Python 예제는 `foundry_sdk.v2.language_models.utils`의 token, provider base URL과 HTTP client helper를 사용한다. provider SDK의 api_key 또는 auth_token 인자에는 helper로 받은 Foundry token을 전달한다. 확인일의 helper 호출 예제에는 `preview=True`가 포함된다. 이 예제만으로 production support나 SDK helper의 stable 상태를 확정하지 않는다.

TypeScript 예제는 OSDK `PlatformClient.tokenProvider()`와 `PlatformClient.fetch`를 provider client에 전달한다. OpenAI용 base URL은 proxy의 `/openai/v1`, Anthropic용은 `/anthropic` prefix를 사용한다. provider SDK가 뒤에 붙이는 경로가 다르므로 최종 endpoint 경로와 client의 base URL을 같은 문자열로 취급하지 않는다.

## Attribution과 tracing은 서로 다른 header다

| Header | 의미 | 생략 시 영향 |
|---|---|---|
| `attribution` | 사용량을 귀속할 Project RID들을 쉼표로 연결 | 호출 사용자에게 직접 귀속 |
| `traceParent` | W3C Trace Context traceparent | 플랫폼 내 관측 기능이 동작하지 않음 |
| `traceState` | W3C Trace Context tracestate | 플랫폼 내 관측 기능이 동작하지 않음 |

공식 Python HTTP client helper와 TypeScript PlatformClient fetch는 attribution/tracing을 자동 전파한다. provider SDK만 새로 만들고 일반 HTTP client를 넣으면 같은 전파가 이루어진다고 전제하지 않는다. 계측 header를 빼먹은 요청도 모델 응답을 받을 수 있어 호출 성공과 추적 성공을 별도로 확인한다. 마지막 문장은 명시된 header 생략 효과에서 도출한 점검이다.

## 데이터 거버넌스와 사용량

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
