---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Python transform의 generic chat completion 계약

LanguageModelInput이 model RID를 고르고 request가 messages/generation parameter를 전달한다. GenericChatCompletionRequest 자체에는 model/provider field가 없다. registered model은 full registered-model RID를 쓰며 model 등록이 실제 endpoint routing을 정한다.

## Request와 response

GenericChatCompletionRequest는 ordered text messages와 optional temperature/stop_sequences/max_tokens를 받는다. SYSTEM은 첫 메시지에만 쓰고 다음은 USER, 이후 USER/ASSISTANT를 번갈아 둔다. history가 필요하면 이전 turn을 request에 포함한다.

공통 default/범위는 없으며 선택 model이 지원하는 optional parameter만 추가한다. Python stop_sequences/max_tokens는 serialized stopSequences/maxTokens이고 request max_tokens는 output token 한도다.

response.completion이 답이며 token_usage의 prompt_tokens/completion_tokens를 확인한다. response.token_usage.max_tokens는 input+output context window이므로 request의 output limit과 뜻이 다르다. 이 request는 image/tool call/structured-output schema를 정의하지 않는다.

## 비슷한 이름의 API

OpenAiGptChatLanguageModel은 GptChatCompletionRequest/Response, GenericChatCompletionLanguageModel은 GenericChatCompletionRequest/Response를 쓴다. GenericCompletionLanguageModel.create_completion과 GenericEmbeddingModel.create_embeddings도 별도 request/response다. OpenAI-style choices를 generic response에 그대로 적용하지 않는다.

lightweight transform.using와 Spark transform 양쪽에서 model input을 쓸 수 있다. model 접근권한, role ordering, optionalparameter 지원과 returned completion을 먼저 확인한다. 공통 API가 provider별 동작/실패의 동일성을 보장하지 않는다.

## 출처

- [Palantir, language-models-generic-chat-completion](https://www.palantir.com/docs/foundry/integrate-models/language-models-generic-chat-completion)
- [Palantir, language-models-transforms-inputs](https://www.palantir.com/docs/foundry/integrate-models/language-models-transforms-inputs)

## 관련 문서

- [[Palantir-Registered-Models-and-Provider-Proxies]]
- [[Palantir-Model-Catalog-Lifecycle]]
