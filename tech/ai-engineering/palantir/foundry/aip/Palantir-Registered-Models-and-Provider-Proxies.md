---
tags: [palantir, aip, byom, model, proxy]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["AIP registered models와 BYOM"]
---

# AIP registered model과 provider proxy의 계약

Registered model(BYOM)은 외부 모델/계정 또는 Compute Module 서버를 AIP의 model selector와 usage/limit 관리에 연결한다. 2026년 3월 구현이 기존 function-interface 방식을 대체하는 권장 경로다. Legal/compliance, 자체 fine-tuned/unique model과 self-host 필요를 먼저 확인하며 실제 모델 서버를 시험한 기록은 아니다.

## REST source 등록은 source 접근을 사용자에게 넘기지 않는다

Enrollment Administrator이면서 source Owner/Editor인 사용자가 등록/수정/삭제한다. REST source에 endpoint/auth/port와 egress를 구성하고 exports, exports without markings validations를 켠다. Source의 export 허용과 모델의 marking 정책을 함께 검토한다.

Source RID, provider/model/API path, endpoint별 reasoning/structured output/tool calling capability, required enrollment/user limits와 enablement 범위를 등록한다. 이 capability를 켜야 AI FDE/Analyst가 모델을 사용할 수 있으므로 실제 서버의 지원과 다르게 선언하지 않는다.

**등록 뒤 source permission은 최종 사용자 접근과 분리된다.** 사용자는 source 권한 없이 Control Panel model enablement만으로 사용할 수 있다. Model 공유를 source 자격 증명과 외부 계정 권한의 위임으로 검토한다. Model-specific mandatory marking policy도 중앙 정책과 교집합이 아니라 완전 대체한다.

## Compute Module은 호환 API와 상시 replica가 필요하다

Self-host server(vLLM/Ollama 등) 또는 proxy/federation container가 supported provider API를 제공해야 한다. Docker image에 `application.port`를 붙여 Artifacts로 publish하고 minimum replica를 적어도 1로 둔다. 이후 Model ID와 capability/limit/access를 등록한다.

Self-host는 자체 GPU, on-prem/air-gapped와 sovereignty에 맞는 선택이다. Proxy는 PII redaction, prompt 변환, API remapping과 provider routing을 수행할 수 있다. 이 경우 source egress/secrets를 붙이고 runtime `SOURCE_CREDENTIALS`를 사용한다. Container proxy를 둔 사실만으로 redaction과 외부 반출 정책이 검증된 것은 아니다.

## Provider-compatible endpoint는 모든 provider 기능을 그대로 제공하지 않는다

| API 계열 | Foundry endpoint suffix |
|---|---|
| Anthropic Messages | `/api/v2/llm/proxy/anthropic/v1/messages` |
| OpenAI Chat/Responses/Embeddings | `/api/v2/llm/proxy/openai/v1/chat/completions`, `/responses`, `/embeddings` |
| xAI Chat/Responses(beta) | `/api/v2/llm/proxy/xai/v1/chat/completions`, `/responses` |
| Google Generate/Stream(beta) | `/api/v2/llm/proxy/google/v1/models/{model}:generateContent`, `:streamGenerateContent?alt=sse` |

표의 `/responses`와 `/embeddings`는 같은 provider의 `/v1` 아래 경로다. Bearer Foundry token을 사용하므로 Anthropic처럼 기본 인증 header가 다른 SDK는 bearer로 구성한다. Google stream은 SSE만 지원한다. AIP/builder permission과 enabled provider/model이 필요하고 ZDR/georestriction과 맞는 provider feature만 선택적으로 활성화한다. Beta의 모든 field 지원을 가정하지 않는다.

## 지원 표면과 비용은 구분한다

Registered model은 AI FDE/Analyst, Chatbot Studio, Logic, 이를 통한 Workshop과 TS functions에 사용할 수 있다. AIP Assist/code assist와 Pipeline Builder Generate/Explain은 지원하지 않는다. Overview의 넓은 Pipeline Builder 언급을 모든 native assistant 기능으로 확대하지 않고 실제 LLM node/등록 경로를 확인한다.

Enrollment/user rate limit은 필수이며 project default는 enrollment의 70%로 구성할 수 있다. Externally hosted model provider의 비용은 직접 청구되고 registered model의 추가 platform fee는 없다고 명시돼 있지만 Compute Module의 자체 compute나 다른 workload 비용까지 없다는 뜻은 아니다. Registered-model 외부 비용은 Resource Management 비용에 나타나지 않는다.

## Legacy function interface는 TSv1 전용이다

`@ChatCompletion` function interface와 source/webhook으로 completion/tokenUsage를 반환하는 방식은 legacy, TSv1만 지원하며 TSv2 equivalent가 없다. 새 통합은 registered model을 우선하고 legacy 사용 전 지원 요청을 따른다.

Legacy webhook은 Read API여야 일반 ChatCompletion function에서 호출할 수 있다. Write API는 OntologyEditFunction 전용이다. Legacy Pipeline Builder BYOM은 webhook 대신 direct source egress를 사용하고 ExternalSystems provenance를 선언한다. 범용 fetch 예제의 parameter/response mapping은 실제 provider 계약으로 다시 확인한다.

Legacy rate-limit 전달은 ChatCompletionError와 `LanguageModel:RateLimitExceeded`, `retryAfterMillis`를 반환한다. Logic/Pipeline Builder는 exponential backoff+jitter로 retry할 수 있다. 모든 외부 오류를 generic success나 빈 completion으로 바꾸면 이 경로를 잃을 수 있다.

## 출처

- [Palantir, Bring your own model](https://www.palantir.com/docs/foundry/aip/bring-your-own-model)
- [Palantir, Models backed by REST API sources](https://www.palantir.com/docs/foundry/aip/rest-api-backed-models)
- [Palantir, Models backed by compute modules](https://www.palantir.com/docs/foundry/aip/compute-module-backed-models)
- [Palantir, Self-host models](https://www.palantir.com/docs/foundry/aip/self-host-models)
- [Palantir, Build a proxy or federation layer](https://www.palantir.com/docs/foundry/aip/build-a-proxy-or-federation-layer)
- [Palantir, LLM-provider compatible APIs](https://www.palantir.com/docs/foundry/aip/llm-provider-compatible-apis)
- [Palantir, Register an LLM using function interfaces, Legacy](https://www.palantir.com/docs/foundry/aip/chat-completion-function-interface-quickstart)
- [Palantir, Use your registered LLM, Legacy](https://www.palantir.com/docs/foundry/aip/use-registered-llm)

## 관련 문서

- [[Palantir-Data-and-Model-Integration|모델 adapter와 외부 계정 권한]]
- [[Palantir-AIP-Logic-and-Evaluation|모델 접근 policy]]
- [[Palantir-Network-Egress-and-Private-Connectivity|Network와 source 통제]]
