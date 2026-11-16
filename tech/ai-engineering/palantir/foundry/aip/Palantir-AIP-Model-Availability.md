---
tags: [palantir, model, geography, audio, availability]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["AIP 모델 가용성과 지리 제한"]
---

# AIP 모델의 가용성과 환경 조건

Supported model 목록에 있다고 모든 enrollment/product에 쓸 수 있는 것은 아니다. Model integration, provider 약관 승인, AIP builder 허용, geography/USG impact level, 추가 engineering review와 frontend 통합을 함께 만족해야 한다. Experimental은 provider 자체 또는 AIP integration의 상태이며 production 사용을 전제하지 않는다.

## Model, provider와 environment를 하나의 조합으로 본다

같은 model도 OpenAI/Azure/Bedrock/Vertex 등 backend별 geography와 tier limit이 다르다. Commercial region과 USG IL2/IL4/IL5를 같은 열로 해석하지 않는다. Geo-restriction은 사용자 위치가 아닌 enrollment routing 조건이다.

가용성 표의 check는 해당 provider/environment 지원, 빈칸은 그 georestricted option이 없음을 뜻한다. 모든 regional 칸이 비어 있어도 non-georestricted commercial 환경에서는 사용할 수 있다. **Palantir-hosted의 KR은 표에 완전히 표현되지 않으므로 빈 KR 칸으로 한국 미지원을 확정하지 않는다.** 실제 enrollment는 지원 경로로 확인한다.

예를 들어 global inference만 쓰는 backend는 geo-restricted enrollment에서 적합하지 않을 수 있다. Provider 추가로 capacity가 늘 수 있어도 data routing/약관 조건을 먼저 유지해야 한다. Deprecation 일정과 replacement는 Model Catalog/Upgrade Assistant의 현재 계약을 확인한다.

Model Selector의 cost/speed/class는 비교 지표이고 availability는 enrollment TPM/RPM capacity의 상대적 크기를 뜻한다. 지역별 제공 여부와 같은 단어로 해석하지 않는다. Similar model은 비슷한 속성을 가진 후보이며 현재 업무의 동일 품질을 보장하지 않는다. 과거 announcement의 model별 context/가격 표는 당시 비교이고 현재 비용은 최신 rate table로 확인한다. ([March 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-03))

### 같은 impact level에서도 환경 유형을 확인한다

2026-11-03 확인 기준, Amazon Bedrock을 통한 Gemma 4 26B A4B와 Gemma 4 31B의 IL4 지원은 FedRAMP High 아래의 Defense Industrial Base(DIB) enrollment로 제한된다. 이 제공 경로는 Department of Defense(DoD) IL4와 IL5 enrollment에서는 사용할 수 없다. 따라서 IL4 열의 체크만 보지 않고 DIB 같은 한정 표기와 표 앞의 설명을 함께 읽는다. 다른 provider 경로에도 같은 제한이 있다고 확대하지 않는다.

### 같은 모델도 provider 경로마다 기능이 다를 수 있다

2026-11-16 확인 기준, Amazon Bedrock을 통한 Grok 4.6(Experimental)은 IL2, IL4, IL5 enrollment에 AWS GovCloud를 사용한다. 이 경로는 텍스트와 이미지 입력, tool calling, streaming과 설정 가능한 reasoning을 지원하지만 JSON-schema structured output은 지원하지 않는다고 명시돼 있다. 같은 모델 이름이 xAI 직접 경로에도 있다는 이유로 structured output 같은 기능이 모든 경로에서 같다고 가정하지 않는다. 확인 순서 3단계의 기능 확인은 모델 단위가 아니라 실제로 쓸 provider 행 단위로 한다.

같은 날 global inference나 미국 내 inference를 쓰는 경로의 enrollment 조건도 행별로 달랐다. Azure의 GPT-6.1 Terra(Experimental)는 global inference를 써서 non-georestricted commercial enrollment가 필요하다. Fireworks의 DeepSeek V4.1 Flash (1017)(Experimental)는 미국 내 inference만 쓰고 non-georestricted enrollment가 필요하다. Bedrock의 Kimi K3.1 Pro - Highspeed(Experimental)는 US-georestricted commercial enrollment에서는 US inference를, non-georestricted commercial enrollment에서는 global inference를 쓴다. 이는 확인일의 표 앞 설명이며 이후 확대나 축소는 현재 문서로 다시 확인한다.

Experimental 표기도 모델 이름만이 아니라 provider별 제공 행에서 확인한다. 실험 모델은 변경되거나 수동 이전이 필요할 수 있고, 접근에 별도 확인이 요구될 수 있다. 운영 도입 전에는 실제 앱의 통합 상태와 이전 절차를 확인한다. 이는 가용성 문서를 적용하는 점검 제안이며 실제 enrollment에서 호출한 결과는 아니다.

## Text, embedding과 audio는 다른 기능이다

Text LLM은 generation/tool/reasoning 등 capability를, embedding model은 문서/query에 같은 model을 쓰는 계약과 dimension/input limit을 확인한다. 전체 model 명단과 version별 숫자를 vault에 복제하기보다 official availability/rate 표를 대상 시점에 함께 대조한다.

Audio는 realtime speech-to-speech와 transcription으로 나뉜다. Realtime은 bidirectional WebSocket과 voice activity/turn-taking/streaming output을 제공한다. Static HTTP는 한정된 audio payload를 받아 transcription을 반환한다. Live audio를 static model로 chunking하는 방법은 비용을 예측하기 쉽지만 app이 chunking/latency를 관리해야 한다.

확인일의 speech-to-speech 표는 GPT Realtime 1.5(OpenAI Direct/Azure)와 2.0(OpenAI Direct)을 다룬다. 2026-11-16 확인일의 표에는 Gemini 3.8 Live(Experimental, `gemini-3.8-live`)가 Google Vertex (USG) 경로로 있다. 이 모델은 inference에 US multi-region(`us`) endpoint를 쓰며 지원 환경으로 IL2, FedRAMP High 아래의 DIB IL4, DoD IL4와 IL5 enrollment가 나열돼 있다. Commercial 지역 열에는 표시가 없지만 앞 절의 표 해석대로 이것만으로 commercial 미지원을 확정하지 않으며, commercial 제공도 문서에 명시돼 있지 않으므로 사용 가능하다고 가정하지도 않는다. **Gemini 3.8 Live는 Gemini Live protocol을 쓰고 voice-enabled OSDK tutorial은 OpenAI realtime protocol을 쓴다.** 따라서 tutorial의 client 코드를 모델만 바꿔 Gemini Live에 그대로 쓸 수 있다고 가정하지 않는다. Transcription은 Whisper 1, GPT-4o Transcribe/Mini/Diarize의 realtime/static, Palantir-hosted Whisper Large V3의 static-only를 구분한다. Speaker diarization이 필요하면 해당 모델을 선택하되 실제 availability와 결과 품질을 시험한다. 모델명에 Whisper가 있다는 이유만으로 모든 backend에서 같은 streaming을 제공한다고 가정하지 않는다.

음성 기록에는 app 사용자 외에 통화 상대나 주변 사람의 음성도 들어갈 수 있다. 기록/전사 목적, 통지와 필요한 동의 절차는 배포 환경에서 구성한다. Model 지원만으로 이 workflow 조건이 충족되는 것은 아니다.

## 확인 순서

1. 실제 enrollment의 AIP, organization와 model family 상태를 확인한다.
2. Model/provider별 geography와 impact level을 맞춘다.
3. 사용할 앱의 native tool, structured output, reasoning과 modality 지원을 확인한다.
4. Experimental/deprecation과 tier/user/project limits를 확인한다.
5. 대표 입력과 실패/거부 조건으로 품질, 비용과 지연을 비교한다.

이 순서는 제품 계약을 적용하는 설계 절차다. 본문은 source table 전체를 읽고 조건을 합성한 기록이며 개별 customer 설정이나 모든 모델의 직접 호출을 시험한 결과는 아니다.

## 출처

- [Palantir, Supported LLMs](https://www.palantir.com/docs/foundry/aip/supported-llms) — 2026-11-03 모델 가용성 전제, provider별 Experimental 표기와 Gemma 4의 DIB/DoD 제한을 추가 대조했다. 기존 전체 모델 및 Model Selector 설명의 재검증일로 확대하지 않아 frontmatter 날짜는 유지했다. 2026-11-16 Gemini 3.8 Live의 protocol과 USG 경로, Bedrock Grok 4.6의 structured output 미지원, 행별 inference 조건을 추가 대조했고 같은 이유로 날짜는 유지했다.
- [Palantir, March 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-03)

## 관련 문서

- [[Palantir-AIP-Enablement-and-Responsible-Use|활성화와 data access]]
- [[Palantir-LLM-Capacity-and-Cost|TPM/RPM과 compute 비용]]
- [[Palantir-Registered-Models-and-Provider-Proxies|등록 모델과 proxy]]
