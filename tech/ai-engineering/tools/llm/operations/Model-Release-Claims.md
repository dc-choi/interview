---
tags: [ai, llm, model-selection, benchmark, open-weights, license]
status: done
verified_at: 2026-10-27
category: "AI엔지니어링(AIEngineering)"
aliases: ["Model Release Claims", "모델 발표 수치 읽기", "벤더 벤치마크 읽기", "Vendor Benchmark Reading", "자체 보고 벤치마크"]
---

# 모델 발표 수치 읽기

모델 발표문은 점수, 비용 절감률, 속도, 파라미터 수, 필요 메모리, 라이선스와 제공 상태를 한 번에 내놓는다. 이 숫자들은 누가 쟀는지, 무엇과 비교했는지, 어떤 설정과 날짜에서 나왔는지가 다르면 서로 비교할 수 없다. 이 문서는 발표 수치를 모델 선택의 근거로 쓰기 전에 붙여 둘 조건을 정리하고, 2026-10-27에 공식 발표, 모델 카드, 공식 문서와 Artificial Analysis 페이지로 대조한 2026년 10월 출시 사례로 설명한다. 벤치마크 점수의 일반 조건과 비용 추세는 [[AI-Capability-and-Cost-Trends|AI 능력과 비용 추세 읽기]], 티어와 라우팅은 [[LLM-Model-Tiers|LLM 모델 티어 선택]]이 다룬다.

## 누가 쟀는지 먼저 표시한다

| 측정 주체 | 알 수 있는 것 | 따로 확인할 것 |
|---|---|---|
| 공급사 자체 보고 | 공급사가 강조하는 과제와 설정 | 비교 대상의 세대, 하네스, 추론 강도, 실행 횟수 |
| 공급사가 만든 벤치마크 | 겨냥한 업무 유형 | 과제 구성과 출제자, 채점 방식, 학습 환경과의 독립성 |
| 고객, 파트너 보고 | 특정 업무의 체감 효과 | 표본 크기, 비교 기준, 사례 선정 |
| 제3자 지수 | 같은 방법론 안의 모델 간 비교 | 지수 버전, 측정 날짜, 엔드포인트와 단가 기준 |
| 자기 업무 평가 | 채택 판단 | 골든셋, 비용 한도, 반복 측정 |

## 자체 보고 점수는 비교 대상, 채점자와 독립성을 본다

- **비교 대상의 세대**: DeepSeek-V4.1-Flash-1017 모델 카드 표는 직전 판 V4.1-Flash와 K3, GLM-5.3, GPT-5.6 Sol, Opus 5를 함께 싣는다. 11개 행 가운데 Opus 5가 6개, 이 모델이 4개(DeepSWE v1.1, Automation-Bench v1.0.6, Agents' Last Exam, Apex Bench v1.1), GPT-5.6 Sol이 1개에서 가장 높고, 직전 판이 가장 높은 행은 없다. Terminal-Bench 4.0은 Claude Code 하네스, DeepSWE v1.1은 Mini-SWE-V2 하네스로 쟀다고 밝힌다. 발표 시점의 Anthropic과 OpenAI 현행 모델은 Opus 5.5와 GPT-6 계열이므로 표의 비교 대상은 직전 세대다.
- **헤드라인과 전체 차트**: Ultramarine 1 Flash 공식 페이지는 Fable급 지식 업무 성능과 Fable보다 60배 싼 비용을 앞세우고, 본문은 내부 벤치마크 PI Knowledge Work에서 과업당 $0.13로 Claude Fable 5(max, $8.19)와 GPT-5.6 Sol(max, $2.09)을 앞선다고 적는다(59.3, 57.8, 55.1). 같은 차트에서 발표 시점의 현행 모델인 Claude Fable 5.1 65.5, GPT-6 Astra 64.2, Claude Opus 5.5 61.9(모두 max)는 더 높고, 저가 티어인 GPT-6 Luna(max)는 58.3을 과업당 $0.11에 낸다. 차트의 GPT-6 Sol(max)도 61.4로 더 높지만, OpenAI API 변경 이력 기준 이 모델은 2026-09-22 출시판이고 차트에는 2026-09-29 나온 후속 GPT-6.1 Sol이 없다. 헤드라인의 비교 대상만 보지 않고 전체 표에서 현행 모델과 같은 가격대 모델의 위치를 보며, 차트에 실린 모델이 발표 시점의 최신판인지도 공급사 변경 이력으로 확인한다.
- **LLM 채점자**: PI Knowledge Work는 과제별 이진 기준 루브릭을 GPT-5.6 Terra가 채점하고, Excel, PowerPoint, Word 산출물은 텍스트로 파싱해 판정기에 넣는다. Raon-1 mini preview 모델 카드는 모든 평가의 판정 모델을 gpt-5.6-luna로 적고, Voxtral 3의 TTS 내부 평가(숫자와 고유명사 중심의 영어 프롬프트 300개, 드문 단어의 발음 제어 300문장, 11개 언어 377개 프롬프트, 표현력 영어 237개)는 gemini-3.8-flash가 판정했다. 판정기의 편향과 사람 라벨 교정 여부도 점수의 조건이다([[Eval-LLM-Judge|LLM 판정기]]).
- **자체 벤치마크와 학습 분포**: Paper Instruments는 GLM-5.3 Flash를 88개 환경 유형과 과제별 루브릭으로 강화학습한 뒤, 같은 회사의 Feather 하네스와 내부 벤치마크로 평가했다. 기술 보고서는 학습 과제와 평가 과제를 어떻게 분리했는지 설명하지 않는다. 발표가 제시한 PI Knowledge Work와 Artificial Analysis 지수의 상관(24개 실행, r = 0.81)은 벤치마크가 일반 능력과 같은 방향으로 움직인다는 근거일 뿐, 특정 모델의 점수가 학습 분포와 겹치지 않았다는 근거는 아니다(이 문서의 판단). 같은 기반 모델의 전문 영역 후학습 비교는 [[Agent-Model-Capability-Contracts#Ultramarine 1 Flash: 같은 기반 모델의 업무 산출물 후학습|에이전트 모델의 능력 계약]]에 둔다.
- **모든 항목의 우세가 아니다**: Raon-1 mini preview 표에서 GPQA Diamond 84.3과 IFBench 84.2는 비교 MoE 모델(Qwen3.6-35B-A3B, Gemma 4 26B-A4B)보다 높지만 MMLU Pro 76.5(Qwen3.6-35B-A3B 85.9), BFCL v4 Overall 59.8, Terminal-Bench Lite 47.0은 낮다. 한국어 챗봇 평가는 공개하지 않은 내부 평가다. 음성 모델 발표도 마찬가지로, Voxtral 3의 화자 분리 비교(AMI, Switchboard, AISHELL-4의 cpWER 거시 평균에서 Voxtral Small Transcribe 3 18.4%, Scribe v2 23.0%, Gemini 3.5 Transcribe 38.4%)는 Mistral이 직접 낸 차트이며 누가 평가를 실행했는지는 밝히지 않는다.

## 비용 절감률은 단가, 토큰 수, 과업당 비용으로 나눈다

- **기준선이 없는 절감률**: MiniMax M3.1 Flash 발표(2026-10-19)는 에이전트 작업의 전체 사용 비용이 직전 모델보다 70% 낮다고만 적고 계산 방법을 밝히지 않는다. Artificial Analysis(2026-10-27, Intelligence Index v4.3.2)에서 M3.1 Flash의 단가는 100만 토큰당 입력 $0.15, 출력 $0.60으로 MiniMax-M3($0.30, $1.20)의 절반이지만, 지수 평가에서 생성한 토큰은 1억 8천만으로 M3의 1억 2천만보다 1.5배 많다. 과업당 비용은 $0.22로 M3의 $0.51보다 약 57% 낮고, 지수는 43으로 M3의 29보다 높다. 단가 인하율, 토큰 증가와 과업당 비용을 함께 봐야 하는 이유다([[AI-Capability-and-Cost-Trends#모델 비교에서 속도와 비용의 측정 단위를 분리한다|단가와 과업당 비용]]).
- **단가와 출력 토큰만으로는 과업당 비용이 재현되지 않는다**: 위 사례에서 출력 단가 절반과 출력 토큰 1.5배를 곱하면 약 0.75배인데 과업당 비용은 약 0.43배다. Artificial Analysis는 Intelligence Index v4.1부터 비용 지표에 캐시 적중률과 캐시 단가를 반영하고, 평가의 토큰 수에 모델별로 실측한 평소 캐시 적중률을 결합한다. 캐시 할인율은 M3.1 Flash 90%, M3 80%여서 캐시 입력 단가가 4배 차이 나고($0.015 대 $0.06, M3 값은 할인율로 계산), 캐시 적중, 입력, 출력을 7:2:1로 섞은 혼합 단가도 $0.10 대 $0.22로 과업당 비용 비율에 가깝다(이 문서의 계산). 모델별 입력 토큰 수와 적중률은 확인하지 못해 차이를 정확히 분해하지 않았다. 과업당 비용을 비교할 때는 입력 토큰과 캐시 조건까지 같은 기준인지 본다.
- **과업당 비용 배율**: Ultramarine 1 Flash의 Fable 대비 60배 저렴하다는 주장은 자체 벤치마크의 과업당 비용($0.13, Fable 5 $8.19)에서 나온다. API 단가(입력 $0.15, 캐시 입력 $0.03, 출력 $0.50)는 기반 모델 GLM-5.3 Flash와 같고, 6개 벤치마크에서 출력 토큰이 기반 모델보다 6.5% 적다고 보고한다.
- **할인 기한**: Mercury 3는 정가의 50% 출시 할인가를 내걸었지만 종료일을 밝히지 않는다([[Diffusion-Language-Models#사례: Mercury 계열의 공개 범위|Mercury 3 호출 조건]]). Gemini 4 Argon은 가격표에 할인가의 적용 기한을 적는다([[Gemini-4-Argon#정식 제공 뒤 확인한 모델 ID와 가격 기한|Gemini 4 Argon]]). 예산에는 기한 뒤의 단가를 넣는다.

## 속도와 지연은 측정 위치와 날짜를 붙인다

- **측정 조건이 없는 속도**: Mercury 3의 1,068 tok/s에는 NVIDIA GPU라는 표현 외에 GPU 종류, 개수, 배치와 측정 주체가 없다. MiniMax M3.1 Flash 발표의 일상 사용에서 200 tok/s 이상까지 나온다는 주장과 중앙값(P50) 170 tok/s 이상도 측정 조건이 없고, 2026-10-27 Artificial Analysis는 MiniMax API에서 121.4 tok/s(첫 토큰 1.07초)를 보였다.
- **같은 엔드포인트도 날짜마다 다르다**: DeepSeek-V4.1-Flash-1017(2026-10-17 출시)의 DeepSeek API 출력 속도는 2026-10-27 Artificial Analysis 페이지에서 169.0 tok/s(첫 토큰 1.19초)였다. 출시 직후 GeekNews 요약은 같은 페이지의 값을 224.7 tok/s로 인용했지만 확인 시각을 밝히지 않았고, 이 문서는 Artificial Analysis 자료에서 그 값을 다시 찾지 못했으므로 대조하지 못한 2차 인용으로 둔다. Artificial Analysis의 표시값은 하루 8번 잰 값의 최근 72시간 중앙값이라 측정 창이 움직이면 같은 엔드포인트의 값도 바뀌므로, 수치에 측정일을 붙인다. DeepSeek API는 피크 시간 단가가 할인 시간의 두 배인데([[LLM-Model-Tiers#호출 시각별 단가와 최신판을 따라가는 이름|호출 시각별 단가]]), 이 페이지의 단가 $0.30, $1.20은 피크 단가와 같고 페이지는 어느 시간대 기준인지 밝히지 않는다. 같은 페이지는 지수 45(Max 설정), 과업당 비용 $0.26, 지수 평가 생성 토큰 2억 1천만(비교 중앙값 1억 4천만)을 보인다.
- **측정 위치가 다른 지연**: FLUX 3 Image Klein 발표의 API 지연 비교(중앙값, 1MP, 대기열 포함 텍스트-이미지 4.54초)는 자사 모델을 BFL 서버에서, 경쟁 모델을 클라이언트에서 폴링과 네트워크 시간을 포함해 쟀다고 적는다. 측정 위치가 다른 지연은 같은 표에 있어도 직접 비교하지 않는다.
- **에이전트 지연 주장**: Voxtral 3 발표는 실시간 전사가 500ms 미만이고 음성 에이전트 턴이 단계마다 앞 단계를 기다리지 않아 1초 안에 끝난다고 적지만 측정 방법은 없다. 음성 파이프라인은 [[Realtime-Voice-Architecture|실시간 음성 에이전트]]처럼 단계별 지연을 자기 환경에서 잰다.

## 파라미터 수는 무엇을 셌는지 확인한다

- **전체와 활성**: MoE는 토큰마다 일부 전문가만 계산한다. Raon-1 mini preview는 전체 28.8B 가운데 토큰당 4.3B(라우팅 전문가 128개 중 6개와 공유 전문가 1개)를, GLM-5.3-Flash는 320B 가운데 18B를 활성화한다. 활성 파라미터는 토큰당 연산을 줄일 뿐 전체 가중치의 저장과 적재는 남는다([[Local-Inference-Deployment-Cases#MoE가 줄이는 것과 남기는 것|MoE가 줄이는 것과 남기는 것]]).
- **단계마다 다른 활성 수와 집계 차이**: DeepSeek-V4.1-Flash 기술 보고서는 백본 552B, 토큰당 활성 파라미터를 디코드 16B, 프리필 8B로 적는다. Hugging Face의 safetensors 표시는 763B(BF16, F32, F8_E4M3, I8 텐서)이며, 차이의 구성은 이 문서에서 확인하지 못했다. Artificial Analysis는 552B, 16B로 표시한다.
- **빠진 구성요소**: FLUX 3 Image Klein의 5.6B는 이미지 생성기만 센 값이고 텍스트 인코더를 제외한다. 모델 카드는 텍스트 인코더로 Qwen3-VL-4B-Instruct(Apache-2.0)를 함께 두고, 9B 프롬프트 업샘플러를 별도 모델로 제공하며 업샘플러나 그에 준하는 LLM 없이 쓰지 말라고 안내한다. 발표가 비교한 다른 모델의 파라미터도 각 공급사 발표값이며 텍스트 인코더를 뺀 값이다.

## 필요 메모리는 실행기와 정밀도를 붙여 읽는다

FLUX 3 Image Klein 발표는 생성기 가중치를 BF16 11.2GB, FP8 5.6GB로 적고, INT8 빌드는 ComfyUI나 Diffusers로 VRAM 8GB인 GeForce RTX GPU에서도 돈다고 밝힌다. 같은 모델의 카드는 기준 코드로 B200, 1024×1024, 업샘플러를 끈 조건의 최대 GPU 메모리를 BF16 31GB, FP8 26GB, NVFP4 25GB로 적고, 업샘플러가 80GB GPU에서 약 28GB를 더한다고 적는다. 카드는 양자화 패키지의 파일 크기가 전체 GPU 메모리 사용량을 뜻하지 않는다고 경고하며 INT8 변형은 나열하지 않는다. 8GB 실행은 특정 실행기와 양자화 경로의 결과로 읽고, 자기 해상도, 배치와 실행기로 다시 잰다(적용 제안). Raon-1 mini preview 모델 카드의 NVFP4 체크포인트를 RTX 5090(32GB) 한 장에서 추론할 수 있다는 안내도 공급사 설명이다. 메모리 예산의 구성은 [[LLM-Inference-Bottlenecks|LLM 추론 병목]]을 따른다.

## 라이선스와 제공 상태는 발표 문구와 따로 확인한다

| 모델 | 가중치 | 조건 (2026-10-27 확인) |
|---|---|---|
| DeepSeek-V4.1-Flash-1017 | 공개 | 저장소와 가중치 MIT |
| Raon-1 mini preview | 공개 | 가중치와 설정 Apache 2.0. 학습 데이터, 학습 방법과 호스팅 API는 대상이 아니다. 정식판 전에 사양과 결과가 바뀔 수 있다고 안내 |
| FLUX 3 Image Klein | 공개, 동의 후 접근 | FLUX Kommunity License. 연 환산 총매출 500만 달러 미만 이용자의 상업적 출력 생성 허용, 상업적 미세조정과 배포까지 일괄 허용하지 않음, 출력을 비슷한 기능의 다른 AI 모델 개선에 쓰는 것을 제한 |
| Timestral 1.0 | 공개 | Modified MIT. 직전 달 연결 월매출 2천만 달러 초과 조직은 권리 없음, 파생물에도 적용([[Time-Series-Foundation-Models|시계열 파운데이션 모델]]) |
| MiniMax M3.1 Flash | 미공개 | 발표는 가중치를 나중에 공개한다고만 적고 라이선스를 밝히지 않음. 직전 MiniMax-M3는 MiniMax Community License의 공개 가중치(Artificial Analysis 표시) |
| Ultramarine 1 Flash | 미공개 | 공식 페이지가 가중치를 곧 공개한다고 표시, 라이선스 미표기. 기반 GLM-5.3-Flash는 MIT |
| Mercury 3 | 미표기 | API 제공. 가중치 공개 여부를 밝히지 않음 |
| Voxtral 3 | 미표기 | Mistral API(EU, 미국, 글로벌 엔드포인트). 전체 스택의 온프레미스 배치는 문의. 문서 변경 이력은 2026-10-20 Public Preview로 표시 |

- 가중치를 받을 수 있다는 사실만으로 상업적 사용, 파생물 배포와 출력 활용 범위를 판단하지 않는다([[Open-Source-License-Review#오픈 웨이트 모델과 Open Source AI는 다르다|오픈 웨이트와 Open Source AI]]). 매출 기준 조항은 누구의 매출(이용자, 고용주, 계열사)을 어떤 기간으로 세는지 원문으로 확인한다(적용 제안).
- 제공 상태는 연구 프리뷰, 비공개 프리뷰, 공개 프리뷰, GA로 나뉘고 같은 모델도 판매 경로마다 다르다([[LLM-Market-Landscape#모델 공급사와 판매 채널의 분리|판매 채널의 분리]]).

## 채택 전에 기록할 것

1. 수치마다 측정 주체, 측정일, 설정(추론 강도, 하네스, 실행 횟수)과 비교 대상의 세대를 적는다.
2. 자기 업무 표본으로 같은 하네스와 비용 한도에서 다시 잰다([[LLM-Eval-Strategy|LLM 평가 전략]]).
3. 과업당 비용은 단가와 실제 토큰 수로 계산하고, 할인 기한과 시간대 단가를 넣는다.
4. 속도와 메모리는 자기 리전, 동시성, 실행기와 정밀도로 측정한다.
5. 라이선스 원문의 매출 기준, 파생물 적용과 출력 활용 제한을 확인한다.

## 출처

- [DeepSeek-V4.1-Flash-1017 — Hugging Face, DeepSeek](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017) — 비교표, 하네스 표기, 라이선스, safetensors 표시
- [DeepSeek-V4.1-Flash: Pushing the Limits of KV Cache Compression — arXiv, DeepSeek-AI](https://arxiv.org/abs/2609.19969) — 백본과 활성 파라미터
- [DeepSeek V4.1 Flash 1017 (Max) Intelligence, Performance & Price Analysis — Artificial Analysis](https://artificialanalysis.ai/models/deepseek-v4-1-flash-1017) — 2026-10-27 열람
- [MiniMax M3.1 Flash — MiniMax](https://www.minimax.io/blog/minimax-m31f) — 2026-10-19, 비용과 속도 주장, 가격과 캐시 입력 단가, 가중치 공개 계획
- [MiniMax-M3.1-Flash Intelligence, Performance & Price Analysis — Artificial Analysis](https://artificialanalysis.ai/models/minimax-m3-1-flash) — 2026-10-27 열람, 캐시 할인율과 혼합 단가 포함
- [MiniMax-M3 Intelligence, Performance & Price Analysis — Artificial Analysis](https://artificialanalysis.ai/models/minimax-m3) — 2026-10-27 열람, 캐시 할인율과 혼합 단가 포함
- [Intelligence Benchmarking — Artificial Analysis](https://artificialanalysis.ai/methodology/intelligence-benchmarking) — 2026-10-27 열람, 토큰 수와 실측 캐시 적중률을 결합한 비용 산정, v4.1의 캐시 단가 반영
- [Language Model API Performance Benchmarking — Artificial Analysis](https://artificialanalysis.ai/methodology/performance-benchmarking) — 2026-10-27 열람, 하루 8번 측정과 최근 72시간 중앙값 표시
- [Ultramarine — Paper Instruments](https://www.paperinstruments.com/ultramarine) — 차트, 가격, 가중치 공개 표시
- [Ultramarine 1 Flash technical report — Paper Instruments](https://www.paperinstruments.com/blog/ultramarine) — 2026-10-14, 학습 환경, 판정 모델, 한계
- [Changelog — OpenAI API](https://developers.openai.com/api/docs/changelog) — 2026-10-27 열람, GPT-6 Sol(2026-09-22)과 GPT-6.1 Sol(2026-09-29) 출시 항목
- [KRAFTON/Raon-1-mini-preview — Hugging Face, KRAFTON](https://huggingface.co/KRAFTON/Raon-1-mini-preview) — 구조, 평가표와 판정 모델, 양자화, 라이선스
- [zai-org/GLM-5.3-Flash — Hugging Face, Z.ai](https://huggingface.co/zai-org/GLM-5.3-Flash) — 전체와 활성 파라미터, MIT
- [FLUX 3 Image Klein — Black Forest Labs](https://bfl.ai/blog/flux-3-image-klein) — 2026-10-15, 메모리, 지연 측정 위치, 평가, 라이선스 요약
- [black-forest-labs/flux-3-image-klein — Hugging Face](https://huggingface.co/black-forest-labs/flux-3-image-klein) — 기준 코드 최대 메모리, 텍스트 인코더, 프롬프트 업샘플러, 라이선스 조건
- [Voxtral 3 — Mistral AI](https://mistral.ai/news/voxtral-3) — 모델별 가격, 지연 주장, 내부 평가와 판정 모델
- [Changelog — Mistral Docs](https://docs.mistral.ai/getting-started/changelog) — 2026-10-20 Voxtral 3 Public Preview
- 사용자 제공 GeekNews 알림(2026-10-16~10-27): FLUX 3 Image Klein, Ultramarine 1 Flash, DeepSeek-V4.1-Flash-1017과 Artificial Analysis 측정, MiniMax M3.1 Flash, Voxtral 3, Raon-1 mini. 학습 계기이며 수치는 위 공식 자료와 제3자 지수 페이지로 대조했다. 출시 직후 속도 인용값(224.7 tok/s)만 [DeepSeek V4.1 Flash 1017 - AAII 45점, 초당 약 225토큰 출력 — GeekNews](https://news.hada.io/topic?id=35633)의 요약에서 가져왔고, 측정 시각이 없어 Artificial Analysis 자료로 대조하지 못했다.

## 관련 문서

- [[AI-Capability-and-Cost-Trends|AI 능력과 비용 추세 읽기]] — 벤치마크 점수의 조건과 비용 추세
- [[LLM-Model-Tiers|LLM 모델 티어 선택]] — 티어, 라우팅과 시간대 단가
- [[Eval-LLM-Judge|LLM 판정기]] — 판정기의 편향과 교정
- [[Diffusion-Language-Models|확산 언어 모델]] — 병렬 생성의 속도 주장
- [[Time-Series-Foundation-Models|시계열 파운데이션 모델]] — 분위수 출력과 공급사 벤치마크
- [[Agent-Model-Capability-Contracts|에이전트 모델의 능력 계약]] — 전문 영역 후학습과 산출물 평가
- [[Local-Inference-Deployment-Cases|로컬 추론의 배포 사례]] — 메모리 예산과 MoE
- [[LLM-Operations|LLM 선택, 서빙과 운영]]
