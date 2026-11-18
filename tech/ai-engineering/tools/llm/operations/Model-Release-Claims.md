---
tags: [ai, llm, model-selection, benchmark, open-weights, license]
status: done
verified_at: 2026-11-18
category: "AI엔지니어링(AIEngineering)"
aliases: ["Model Release Claims", "모델 발표 수치 읽기", "벤더 벤치마크 읽기", "Vendor Benchmark Reading", "자체 보고 벤치마크", "Muse Ember", "Qwen4-Max", "MAI Code 2", "Work360"]
---

# 모델 발표 수치 읽기

모델 발표문은 점수, 비용 절감률, 속도, 파라미터 수, 필요 메모리, 라이선스와 제공 상태를 한 번에 내놓는다. 이 숫자들은 누가 쟀는지, 무엇과 비교했는지, 어떤 설정과 날짜에서 나왔는지가 다르면 서로 비교할 수 없다. 이 문서는 발표 수치를 모델 선택의 근거로 쓰기 전에 붙여 둘 조건을 정리하고, 2026-10-27에 공식 발표, 모델 카드, 공식 문서와 Artificial Analysis 페이지로 대조한 2026년 10월 출시 사례로 설명하고, 2026년 11월 사례(Claude Fable 5.2, Muse Ember, Edge0-145B, Gemini 4 Hydrogen)는 2026-11-16에 같은 방식으로 대조했다. 2026-11-16~17 발표(Qwen4-Max, GPT-6.2 Astra와 Sol, MAI Code 2)는 2026-11-18에 공식 발표, 모델 문서, 가격표와 개발자 커뮤니티 공지로 대조했다. 벤치마크 점수의 일반 조건과 비용 추세는 [[AI-Capability-and-Cost-Trends|AI 능력과 비용 추세 읽기]], 티어와 라우팅은 [[LLM-Model-Tiers|LLM 모델 티어 선택]]이 다룬다.

## 누가 쟀는지 먼저 표시한다

| 측정 주체 | 알 수 있는 것 | 따로 확인할 것 |
|---|---|---|
| 공급사 자체 보고 | 공급사가 강조하는 과제와 설정 | 비교 대상의 세대, 하네스, 추론 강도, 실행 횟수 |
| 공급사가 만든 벤치마크 | 겨냥한 업무 유형 | 과제 구성과 출제자, 채점 방식, 학습 환경과의 독립성 |
| 고객, 파트너 보고 | 특정 업무의 체감 효과 | 표본 크기, 비교 기준, 사례 선정 |
| 사용자 시연 영상 | 그런 결과가 한 번은 나왔다는 가능성 | 프롬프트 원문, 사람이 고친 범위, 시도 횟수, 토큰과 비용, 실제 실행 범위 |
| 제3자 지수 | 같은 방법론 안의 모델 간 비교 | 지수 버전, 측정 날짜, 엔드포인트와 단가 기준 |
| 자기 업무 평가 | 채택 판단 | 골든셋, 비용 한도, 반복 측정 |

## 자체 보고 점수는 비교 대상, 채점자와 독립성을 본다

- **비교 대상의 세대**: DeepSeek-V4.1-Flash-1017 모델 카드 표는 직전 판 V4.1-Flash와 K3, GLM-5.3, GPT-5.6 Sol, Opus 5를 함께 싣는다. 11개 행 가운데 Opus 5가 6개, 이 모델이 4개(DeepSWE v1.1, Automation-Bench v1.0.6, Agents' Last Exam, Apex Bench v1.1), GPT-5.6 Sol이 1개에서 가장 높고, 직전 판이 가장 높은 행은 없다. Terminal-Bench 4.0은 Claude Code 하네스, DeepSWE v1.1은 Mini-SWE-V2 하네스로 쟀다고 밝힌다. 발표 시점의 Anthropic과 OpenAI 현행 모델은 Opus 5.5와 GPT-6 계열이므로 표의 비교 대상은 직전 세대다.
- **헤드라인과 전체 차트**: Ultramarine 1 Flash 공식 페이지는 Fable급 지식 업무 성능과 Fable보다 60배 싼 비용을 앞세우고, 본문은 내부 벤치마크 PI Knowledge Work에서 과업당 $0.13로 Claude Fable 5(max, $8.19)와 GPT-5.6 Sol(max, $2.09)을 앞선다고 적는다(59.3, 57.8, 55.1). 같은 차트에서 발표 시점의 현행 모델인 Claude Fable 5.1 65.5, GPT-6 Astra 64.2, Claude Opus 5.5 61.9(모두 max)는 더 높고, 저가 티어인 GPT-6 Luna(max)는 58.3을 과업당 $0.11에 낸다. 차트의 GPT-6 Sol(max)도 61.4로 더 높지만, OpenAI API 변경 이력 기준 이 모델은 2026-09-22 출시판이고 차트에는 2026-09-29 나온 후속 GPT-6.1 Sol이 없다. 헤드라인의 비교 대상만 보지 않고 전체 표에서 현행 모델과 같은 가격대 모델의 위치를 보며, 차트에 실린 모델이 발표 시점의 최신판인지도 공급사 변경 이력으로 확인한다.
- **LLM 채점자**: PI Knowledge Work는 과제별 이진 기준 루브릭을 GPT-5.6 Terra가 채점하고, Excel, PowerPoint, Word 산출물은 텍스트로 파싱해 판정기에 넣는다. Raon-1 mini preview 모델 카드는 모든 평가의 판정 모델을 gpt-5.6-luna로 적고, Voxtral 3의 TTS 내부 평가(숫자와 고유명사 중심의 영어 프롬프트 300개, 드문 단어의 발음 제어 300문장, 11개 언어 377개 프롬프트, 표현력 영어 237개)는 gemini-3.8-flash가 판정했다. 판정기의 편향과 사람 라벨 교정 여부도 점수의 조건이다([[Eval-LLM-Judge|LLM 판정기]]).
- **자체 벤치마크와 학습 분포**: Paper Instruments는 GLM-5.3 Flash를 88개 환경 유형과 과제별 루브릭으로 강화학습한 뒤, 같은 회사의 Feather 하네스와 내부 벤치마크로 평가했다. 기술 보고서는 학습 과제와 평가 과제를 어떻게 분리했는지 설명하지 않는다. 발표가 제시한 PI Knowledge Work와 Artificial Analysis 지수의 상관(24개 실행, r = 0.81)은 벤치마크가 일반 능력과 같은 방향으로 움직인다는 근거일 뿐, 특정 모델의 점수가 학습 분포와 겹치지 않았다는 근거는 아니다(이 문서의 판단). 같은 기반 모델의 전문 영역 후학습 비교는 [[Agent-Model-Capability-Contracts#Ultramarine 1 Flash: 같은 기반 모델의 업무 산출물 후학습|에이전트 모델의 능력 계약]]에 둔다.
- **모든 항목의 우세가 아니다**: Raon-1 mini preview 표에서 GPQA Diamond 84.3과 IFBench 84.2는 비교 MoE 모델(Qwen3.6-35B-A3B, Gemma 4 26B-A4B)보다 높지만 MMLU Pro 76.5(Qwen3.6-35B-A3B 85.9), BFCL v4 Overall 59.8, Terminal-Bench Lite 47.0은 낮다. 한국어 챗봇 평가는 공개하지 않은 내부 평가다. 음성 모델 발표도 마찬가지로, Voxtral 3의 화자 분리 비교(AMI, Switchboard, AISHELL-4의 cpWER 거시 평균에서 Voxtral Small Transcribe 3 18.4%, Scribe v2 23.0%, Gemini 3.5 Transcribe 38.4%)는 Mistral이 직접 낸 차트이며 누가 평가를 실행했는지는 밝히지 않는다.
- **모델마다 다른 하네스와 내부 합성 지표**: Muse Ember 발표(2026-11-09, Meta)는 Terminal-Bench 4.0을 모델마다 공개된 최고 하네스로 쟀다고 각주에 적는다(Ember는 mini-swe-agent, Claude Haiku 5.5는 Claude Code, GPT-6 Luna는 Codex). 하네스가 다르면 모델의 차이와 하네스의 차이가 한 점수에 섞인다. 같은 표의 Personal Superintelligence Index는 Meta가 여덟 개 평가를 묶은 내부 합성 지표이고, OSWorld 2.1은 부분 점수를 앞세우며 이진 채점(Ember 33.8, Haiku 5.5 27.8)을 따로 싣는다. Artificial Analysis가 잰 FrontierCode 2.0-AA에서는 Ember(27.2)가 Haiku 5.5(34.9)보다 낮다.
- **상대 백분율과 섞인 측정 주체**: Microsoft AI의 MAI Code 2 발표(2026-11-17)는 네 코딩 벤치마크(DeepSWE 1.1, Terminal Bench 2.1, SWE-Atlas, FrontierCode v1.1) 평균으로 GPT-6.1 Sol 성능의 98%를 비용 40%에, Claude Opus 5.5의 96%를 비용 5%에 낸다고 적는다. 각주에 따르면 모든 모델을 max 추론으로 돌렸고, 세 벤치마크는 Microsoft 내부 평가 플랫폼(MSBench)에서 서브에이전트 없는 GitHub Copilot CLI로 쟀으며, FrontierCode 점수와 비용은 Artificial Analysis 값이고, MAI Code 2의 비용은 50% 프로모션 가격으로 계산했다. 세 벤치마크에서 하네스를 하나로 맞춘 점은 위의 모델별 최고 하네스 비교와 다르지만, 측정 주체가 섞였고 네 벤치마크 평균의 백분율은 벤치마크별 차이를 가린다. 발표 글에는 정가, 프로모션 종료일과 컨텍스트 크기가 없고, 기초 과학 연구와 아주 긴 에이전트 작업에는 아직 맞추지 않았다고 적는다. Code 2 Flash는 세 벤치마크에서 GPT-6 Luna와 Claude Haiku 5.5에 견줄 성능을 각각 비용 65%와 20%에 낸다고 적고, 벤치마크별 통과율과 과업당 비용은 차트에만 있어 대조하지 못했다.
- **직전 모델과만 비교한 자체 벤치마크**: Alibaba의 Qwen4-Max 보도자료(2026-11-16)는 721개 전문 분야의 어려운 업무 과제로 만든 자체 벤치마크 Work360에서 Qwen3.8-Max를 전반적으로 앞서고, High 추론에서 토큰을 35% 덜 쓰며 과업당 평균 비용을 약 60% 줄였다고 적는다. 비교 대상이 자기 직전 모델뿐이라 다른 공급사 모델 대비 위치는 이 벤치마크로 알 수 없고, 함께 이름을 든 Agents' Last Exam, Vals Index, JobBench와 Chartography는 보도자료에 점수가 없다. 점수 47.74에서 52.69, 과업당 비용 $4.43에서 $1.67(62% 감소)은 공식 블로그 차트를 옮긴 2차 자료와 GeekNews 요약에만 있고, 공식 블로그 본문은 열지 못했다.

## 비용 절감률은 단가, 토큰 수, 과업당 비용으로 나눈다

- **기준선이 없는 절감률**: MiniMax M3.1 Flash 발표(2026-10-19)는 에이전트 작업의 전체 사용 비용이 직전 모델보다 70% 낮다고만 적고 계산 방법을 밝히지 않는다. Artificial Analysis(2026-10-27, Intelligence Index v4.3.2)에서 M3.1 Flash의 단가는 100만 토큰당 입력 $0.15, 출력 $0.60으로 MiniMax-M3($0.30, $1.20)의 절반이지만, 지수 평가에서 생성한 토큰은 1억 8천만으로 M3의 1억 2천만보다 1.5배 많다. 과업당 비용은 $0.22로 M3의 $0.51보다 약 57% 낮고, 지수는 43으로 M3의 29보다 높다. 단가 인하율, 토큰 증가와 과업당 비용을 함께 봐야 하는 이유다([[AI-Capability-and-Cost-Trends#모델 비교에서 속도와 비용의 측정 단위를 분리한다|단가와 과업당 비용]]).
- **단가와 출력 토큰만으로는 과업당 비용이 재현되지 않는다**: 위 사례에서 출력 단가 절반과 출력 토큰 1.5배를 곱하면 약 0.75배인데 과업당 비용은 약 0.43배다. Artificial Analysis는 Intelligence Index v4.1부터 비용 지표에 캐시 적중률과 캐시 단가를 반영하고, 평가의 토큰 수에 모델별로 실측한 평소 캐시 적중률을 결합한다. 캐시 할인율은 M3.1 Flash 90%, M3 80%여서 캐시 입력 단가가 4배 차이 나고($0.015 대 $0.06, M3 값은 할인율로 계산), 캐시 적중, 입력, 출력을 7:2:1로 섞은 혼합 단가도 $0.10 대 $0.22로 과업당 비용 비율에 가깝다(이 문서의 계산). 모델별 입력 토큰 수와 적중률은 확인하지 못해 차이를 정확히 분해하지 않았다. 과업당 비용을 비교할 때는 입력 토큰과 캐시 조건까지 같은 기준인지 본다.
- **과업당 비용 배율**: Ultramarine 1 Flash의 Fable 대비 60배 저렴하다는 주장은 자체 벤치마크의 과업당 비용($0.13, Fable 5 $8.19)에서 나온다. API 단가(입력 $0.15, 캐시 입력 $0.03, 출력 $0.50)는 기반 모델 GLM-5.3 Flash와 같고, 6개 벤치마크에서 출력 토큰이 기반 모델보다 6.5% 적다고 보고한다.
- **할인 기한**: Mercury 3는 정가의 50% 출시 할인가를 내걸었지만 종료일을 밝히지 않는다([[Diffusion-Language-Models#사례: Mercury 계열의 공개 범위|Mercury 3 호출 조건]]). Gemini 4 Argon은 가격표에 할인가의 적용 기한을 적는다([[Gemini-4-Argon#정식 제공 뒤 확인한 모델 ID와 가격 기한|Gemini 4 Argon]]). 예산에는 기한 뒤의 단가를 넣는다.
- **출시 특별가와 제3자 지수의 단가 기준**: Gemini 4 Carbon 발표(2026-10-28)는 Argon과 같은 출시 특별가(100만 토큰당 입력 $2, 출력 $10, 캐시 입력은 입력 단가의 95% 할인)를 적고, 각주에서 특별가 기간이 끝나면 입력 $4, 출력 $20이 적용된다고 밝히지만 종료일은 적지 않는다. 같은 시점의 Argon은 Google 가격표에 특별가를 2026-11-30까지로 적는다. Artificial Analysis의 Carbon 페이지(2026-11-09 열람, Intelligence Index v5.0.1, High 설정)는 Google API 기준 단가를 $4, $20으로 표시하고 지수 과업당 비용 $7.76을 보인다. 이 단가는 Google 발표의 특별가 종료 뒤 단가와 같은 값이다(이 문서의 대조). 공급사 특별가와 제3자 지수의 과업당 비용은 서로 다른 단가로 계산된 값이므로, 비교할 때 어느 단가를 넣었는지 먼저 맞춘다. 같은 날 Carbon은 Gemini Developer API 가격표에 없었고 일반 개발자에게 열리지도 않았으므로(아래 절) 발표 단가가 곧 호출 가능한 단가라는 뜻도 아니다.
- **단가를 내려도 과업당 비용은 오를 수 있다**: Claude Fable 5.2(2026-11-09)는 5.1보다 단가를 20% 내렸지만(100만 토큰당 입력 $10, 출력 $50에서 $8, $40), 2026-11-16 Artificial Analysis(Intelligence Index v5.0.1, Max 설정)에서 지수 평가의 출력 토큰은 1억 6,300만에서 2억 7,500만으로 늘었고 과업당 비용은 $12.99에서 $26.54로 약 2배가 됐다. 지수는 49에서 65로 올랐다. 출력 단가와 출력 토큰만 곱한 배율은 약 1.35배라서, 같은 산정 방식이라면 입력과 캐시 쪽 비용이 2배 넘게 늘어야 차이가 설명된다(이 문서의 계산이며 입력 토큰 수는 페이지에서 확인하지 못했다).
- **같은 점수를 낮은 추론 강도로 맞춘 비교**: Anthropic 발표는 초기 시험에서 FrontierCode 2.0의 Fable 5.2 High(45.3%)가 Opus 5.5의 최고 점수(45.5%, Max)와 비슷하면서 과업당 비용은 약 절반이었고, Perplexity의 WANDR에서는 Medium으로 약 40%, HLE에서는 Low로 10분의 1 미만의 비용에 Opus 5.5의 최고 점수와 맞췄다고 적는다. 누가 쟀는지는 밝히지 않는다. 같은 모델도 추론 강도에 따라 토큰이 크게 달라서, 2026-11-16 Artificial Analysis에서 Fable 5.2는 High 62점에 출력 토큰 8,530만, Max 65점에 2억 7,500만을 썼고 Gemini 4 Hydrogen은 High 51점에 1억 1천만, Xhigh 54점에 3억 400만을 썼다. 두 모델 모두 마지막 3점에 출력 토큰이 약 3배 들었다(이 문서의 대조). 헤드라인의 비교가 어느 추론 강도끼리인지와 자기 과업의 합격선에 필요한 강도를 함께 본다.
- **비교 쌍의 추론 강도와 헤드라인 문장의 범위**: OpenAI의 GPT-6.2 공지(2026-11-17, 개발자 커뮤니티 게시본으로 대조)는 Agents' Last Exam에서 xhigh로 돌린 GPT-6.2 Astra가 max로 돌린 GPT-6 Astra보다 5.2점 높고 과업당 비용은 절반 미만이라고 적는다. 과업당 비용이 3분의 1 미만이라는 표현은 전문 업무와 과학 연구 평가 전반에 대한 별도 문장이므로 Agents' Last Exam 한 벤치마크의 비율로 옮기지 않는다. 같은 공지는 FrontierCode 2.0에서 GPT-6.2 Sol이 Astra에 거의 맞먹으면서 비용은 약 5분의 1이라고 적고 점수는 차트로만 낸다. 가격표의 두 모델 단가는 100만 토큰당 입력 $8과 $2, 출력 $40과 $10(입력 272K 이하)으로 4배 차이다.
- **추론 강도 이름은 공급사마다 단계가 다르다**: Qwen4-Max API(2026-11-18 Model Studio 문서)는 low, high, xhigh 세 단계이고 기본값은 high다. OpenAI 호환 호출의 `minimal`, `medium`, `max`는 각각 low, high, xhigh로 바꿔 받는다. 비교표에 max라고 적혀 있어도 모델마다 실제 단계 수와 기본값이 다르므로, 같은 이름을 같은 계산량으로 읽지 않는다.
- **한 차트 안에서 단가 기준이 엇갈린다**: Muse Ember 발표의 지능 대비 비용 차트는 캡션에 Ember 비용이 제안 가격(proposed pricing) 기준 추정이라고 적고, 차트 하단에는 Ember 비용이 정가(list pricing) 기준이라고 적는다. 같은 글이 밝힌 단가는 100만 토큰당 입력 $0.10, 캐시 입력 $0.004, 출력 $0.50이고 프롬프트가 20만 토큰을 넘으면 각각 $0.30, $0.012, $1.50이다. 차트의 과업당 비용을 비교에 쓰기 전에 어느 단가로 계산했는지와 긴 프롬프트 구간이 반영됐는지 확인한다.

## 속도와 지연은 측정 위치와 날짜를 붙인다

- **측정 조건이 없는 속도**: Mercury 3의 1,068 tok/s에는 NVIDIA GPU라는 표현 외에 GPU 종류, 개수, 배치와 측정 주체가 없다. MiniMax M3.1 Flash 발표의 일상 사용에서 200 tok/s 이상까지 나온다는 주장과 중앙값(P50) 170 tok/s 이상도 측정 조건이 없고, 2026-10-27 Artificial Analysis는 MiniMax API에서 121.4 tok/s(첫 토큰 1.07초)를 보였다.
- **같은 엔드포인트도 날짜마다 다르다**: DeepSeek-V4.1-Flash-1017(2026-10-17 출시)의 DeepSeek API 출력 속도는 2026-10-27 Artificial Analysis 페이지에서 169.0 tok/s(첫 토큰 1.19초)였다. 출시 직후 GeekNews 요약은 같은 페이지의 값을 224.7 tok/s로 인용했지만 확인 시각을 밝히지 않았고, 이 문서는 Artificial Analysis 자료에서 그 값을 다시 찾지 못했으므로 대조하지 못한 2차 인용으로 둔다. Artificial Analysis의 표시값은 하루 8번 잰 값의 최근 72시간 중앙값이라 측정 창이 움직이면 같은 엔드포인트의 값도 바뀌므로, 수치에 측정일을 붙인다. DeepSeek API는 피크 시간 단가가 할인 시간의 두 배인데([[LLM-Model-Tiers#호출 시각별 단가와 최신판을 따라가는 이름|호출 시각별 단가]]), 이 페이지의 단가 $0.30, $1.20은 피크 단가와 같고 페이지는 어느 시간대 기준인지 밝히지 않는다. 같은 페이지는 지수 45(Max 설정), 과업당 비용 $0.26, 지수 평가 생성 토큰 2억 1천만(비교 중앙값 1억 4천만)을 보인다. Claude Fable 5.2(Max)도 출시 직후 GeekNews 요약이 옮긴 첫 답변 토큰 231.55초, 초당 103토큰, 과업당 추정 44.1분이 2026-11-16 페이지에서는 238.16초, 109토큰, 41.8분이었고, 지수 65점과 과업당 비용 $26.54는 그대로였다. 속도와 지연은 측정 창에 따라 움직이고 지수와 과업당 비용은 평가 실행에 묶인 값으로 읽는다(이 문서의 해석).
- **측정 위치가 다른 지연**: FLUX 3 Image Klein 발표의 API 지연 비교(중앙값, 1MP, 대기열 포함 텍스트-이미지 4.54초)는 자사 모델을 BFL 서버에서, 경쟁 모델을 클라이언트에서 폴링과 네트워크 시간을 포함해 쟀다고 적는다. 측정 위치가 다른 지연은 같은 표에 있어도 직접 비교하지 않는다.
- **에이전트 지연 주장**: Voxtral 3 발표는 실시간 전사가 500ms 미만이고 음성 에이전트 턴이 단계마다 앞 단계를 기다리지 않아 1초 안에 끝난다고 적지만 측정 방법은 없다. 음성 파이프라인은 [[Realtime-Voice-Architecture|실시간 음성 에이전트]]처럼 단계별 지연을 자기 환경에서 잰다.

## 파라미터 수는 무엇을 셌는지 확인한다

- **전체와 활성**: MoE는 토큰마다 일부 전문가만 계산한다. Raon-1 mini preview는 전체 28.8B 가운데 토큰당 4.3B(라우팅 전문가 128개 중 6개와 공유 전문가 1개)를, GLM-5.3-Flash는 320B 가운데 18B를 활성화한다. 활성 파라미터는 토큰당 연산을 줄일 뿐 전체 가중치의 저장과 적재는 남는다([[Local-Inference-Deployment-Cases#MoE가 줄이는 것과 남기는 것|MoE가 줄이는 것과 남기는 것]]).
- **단계마다 다른 활성 수와 집계 차이**: DeepSeek-V4.1-Flash 기술 보고서는 백본 552B, 토큰당 활성 파라미터를 디코드 16B, 프리필 8B로 적는다. Hugging Face의 safetensors 표시는 763B(BF16, F32, F8_E4M3, I8 텐서)이며, 차이의 구성은 이 문서에서 확인하지 못했다. Artificial Analysis는 552B, 16B로 표시한다.
- **빠진 구성요소**: FLUX 3 Image Klein의 5.6B는 이미지 생성기만 센 값이고 텍스트 인코더를 제외한다. 모델 카드는 텍스트 인코더로 Qwen3-VL-4B-Instruct(Apache-2.0)를 함께 두고, 9B 프롬프트 업샘플러를 별도 모델로 제공하며 업샘플러나 그에 준하는 LLM 없이 쓰지 말라고 안내한다. 발표가 비교한 다른 모델의 파라미터도 각 공급사 발표값이며 텍스트 인코더를 뺀 값이다.

## 필요 메모리는 실행기와 정밀도를 붙여 읽는다

FLUX 3 Image Klein 발표는 생성기 가중치를 BF16 11.2GB, FP8 5.6GB로 적고, INT8 빌드는 ComfyUI나 Diffusers로 VRAM 8GB인 GeForce RTX GPU에서도 돈다고 밝힌다. 같은 모델의 카드는 기준 코드로 B200, 1024×1024, 업샘플러를 끈 조건의 최대 GPU 메모리를 BF16 31GB, FP8 26GB, NVFP4 25GB로 적고, 업샘플러가 80GB GPU에서 약 28GB를 더한다고 적는다. 카드는 양자화 패키지의 파일 크기가 전체 GPU 메모리 사용량을 뜻하지 않는다고 경고하며 INT8 변형은 나열하지 않는다. 8GB 실행은 특정 실행기와 양자화 경로의 결과로 읽고, 자기 해상도, 배치와 실행기로 다시 잰다(적용 제안). Raon-1 mini preview 모델 카드의 NVFP4 체크포인트를 RTX 5090(32GB) 한 장에서 추론할 수 있다는 안내도 공급사 설명이다. Edge0-145B 발표(2026-11-12)는 노트북 최대 메모리를 29GB로 적고 같은 글의 다른 문단은 28GB로 적으며, 시스템 메모리의 전문가 라이브러리 약 40GB와 SSD의 어휘 데이터 약 48GB를 따로 둔다. 모델 카드는 VRAM 24GB인 RTX 5090 D에서 상주 설정을 켠 NVFP4 빌드가 VRAM 23.25GiB와 호스트 RAM 38.27GiB를 쓴 측정을 싣는다. 헤드라인의 메모리 값 하나로 장비를 고르지 않는다([[Local-Inference-Deployment-Cases#Edge0-145B: 전문가와 임베딩을 RAM과 SSD에 나눠 둔다|Edge0-145B의 메모리 계층]]). 메모리 예산의 구성은 [[LLM-Inference-Bottlenecks|LLM 추론 병목]]을 따른다.

## 라이선스와 제공 상태는 발표 문구와 따로 확인한다

| 모델 | 가중치 | 조건 (2026-10-27 확인) |
|---|---|---|
| DeepSeek-V4.1-Flash-1017 | 공개 | 저장소와 가중치 MIT |
| Raon-1 mini preview | 공개 | 가중치와 설정 Apache 2.0. 학습 데이터, 학습 방법과 호스팅 API는 대상이 아니다. 정식판 전에 사양과 결과가 바뀔 수 있다고 안내 |
| FLUX 3 Image Klein | 공개, 동의 후 접근 | FLUX Kommunity License. 연 환산 총매출 500만 달러 미만 이용자의 상업적 출력 생성 허용, 상업적 미세조정과 배포까지 일괄 허용하지 않음, 출력을 비슷한 기능의 다른 AI 모델 개선에 쓰는 것을 제한 |
| Timestral 1.0 | 공개 | Modified MIT. 직전 달 연결 월매출 2천만 달러 초과 조직은 권리 없음, 파생물에도 적용([[Time-Series-Foundation-Models\|시계열 파운데이션 모델]]) |
| MiniMax M3.1 Flash | 미공개 | 발표는 가중치를 나중에 공개한다고만 적고 라이선스를 밝히지 않음. 직전 MiniMax-M3는 MiniMax Community License의 공개 가중치(Artificial Analysis 표시) |
| Ultramarine 1 Flash | 미공개 | 공식 페이지가 가중치를 곧 공개한다고 표시, 라이선스 미표기. 기반 GLM-5.3-Flash는 MIT |
| Mercury 3 | 미표기 | API 제공. 가중치 공개 여부를 밝히지 않음 |
| Voxtral 3 | 미표기 | Mistral API(EU, 미국, 글로벌 엔드포인트). 전체 스택의 온프레미스 배치는 문의. 문서 변경 이력은 2026-10-20 Public Preview로 표시 |
| Edge0-145B | 공개(NVFP4, Q3_K) | 2026-11-16 확인. 발표 글은 오픈소스로 공개한다고만 적고, 모델 카드는 Edge0 Community Model License 1.0을 표시한다. 개인 사용, 연구, 수정, 비상업적 공유, 내부 사용과 생성 결과의 상업적 사용은 허용하지만 모델 판매, 상업적 번들과 상업 모델 서비스 운영은 별도 서면 라이선스가 필요하다. Qwen3.8-Flash-Next를 다시 만든 모델이라 Qwen 유래 부분은 Qwen Community License 1.0을 따르며 두 조건을 함께 지켜야 하고, Edge0의 허락이 Qwen의 별도 허가와 표기 요구를 대신하지 않는다 |
| Muse Ember | 미표기 | 2026-11-16 확인. Muse Code, Meta Model API, Google Cloud와 Oracle Cloud 제공. 발표는 가중치 공개를 언급하지 않음 |
| Qwen4-Max | 미표기 | 2026-11-18 확인. QwenCloud의 Token Plan과 API, QwenWork와 QwenStudio 제공. 보도자료는 Max의 가중치를 언급하지 않고 작은 Qwen4 공개 가중치 모델을 곧 낸다고만 적는다(날짜와 라이선스 없음). 단가는 1M 이하 한 구간이며 싱가포르 100만 토큰당 입력 $1.5, 출력 $4.5, 베이징 등 다른 리전 $1.413, $4.24 |
| MAI Code 2, Code 2 Flash | 미표기 | 2026-11-18 확인. 두 모델 모두 GitHub Copilot, Code 2 Flash는 Microsoft Foundry의 제한 접근 프리뷰. 발표 글에 API 정가와 가중치 공개 언급 없음 |

- 가중치를 받을 수 있다는 사실만으로 상업적 사용, 파생물 배포와 출력 활용 범위를 판단하지 않는다([[Open-Source-License-Review#오픈 웨이트 모델과 Open Source AI는 다르다|오픈 웨이트와 Open Source AI]]). 매출 기준 조항은 누구의 매출(이용자, 고용주, 계열사)을 어떤 기간으로 세는지 원문으로 확인한다(적용 제안).
- 제공 상태는 연구 프리뷰, 비공개 프리뷰, 공개 프리뷰, GA로 나뉘고 같은 모델도 판매 경로마다 다르다([[LLM-Market-Landscape#모델 공급사와 판매 채널의 분리|판매 채널의 분리]]).

## 최신 순위와 공개 범위를 같은 날짜로 맞춘다

2026-11-02에 대조한 두 발표는 평가와 제공 상태를 따로 기록해야 하는 사례다.

| 사례 | 확인한 발표 내용 | 해석의 경계 |
|---|---|---|
| Gemini 4 Carbon, 2026-10-28 Google 발표 | AAII v5 59, WebDev Arena 1,768(+89), 보안 탐지 SEC-bench Pro 88.2%, 악용 검증 ExploitGym 54.8%, 패치 CWE-bench 71.0% | 보안 수치는 가드레일을 제거한 평가 조건이다. 실제 제품의 허용 범위나 무오류를 뜻하지 않음 |
| Mistral Large 4 가중치 공개 발표 | Coding Agent Index 48%, GLM-5.3 대비 과업당 토큰 47% 감소. Terminal-Bench 4.0 41%, 프리뷰 대비 13%p 상승과 출력 토큰 30% 감소 | **Coding Agent Index**를 Intelligence Index와 혼동하지 않음. 추론 모드와 하네스가 같은지 확인 |

Google 발표는 Carbon의 지수를 v5.0 59점 1위로 적고 추론 설정을 밝히지 않지만, 2026-11-09 열람한 Artificial Analysis 페이지는 Intelligence Index v5.0.1에서 Gemini 4 Carbon (High) 60점을 보인다. 차이가 버전 변경, 설정이나 재측정 가운데 어디서 왔는지는 두 자료로 알 수 없다. 같은 이름의 지수도 세부 버전과 설정에 따라 값이 다를 수 있으므로 점수를 인용할 때 지수 버전, 추론 설정과 열람일을 함께 붙인다. Google은 Carbon을 일부 사이버 방어자에 먼저 열고 Fairwind Program으로 신뢰 파트너에 단계적으로 넓힌다고 밝혔고, 개발자, 기업과 일반 사용자 제공 날짜는 밝히지 않았으므로 발표를 일반 공개 API의 즉시 사용 가능 상태로 바꾸지 않는다. 2026-11-10에는 Carbon이 GA가 되며 유료 Gemini API 개발자 전체에 열렸고, 가격표에도 Argon과 같은 특별가와 2026-11-30 기한이 올라갔다([[Gemini-4-Argon#Gemini 4 계열의 Carbon과 Hydrogen|Gemini 4 계열]]). 발표에서 GA까지 약 2주가 걸렸으므로 발표일과 호출 가능일을 따로 기록한다. 내부 며칠짜리 작업 사례와 fabrication 감소도 공급자 관측이며 외부 업무의 성공 보장이 아니다. 제공된 10월 30일 알림의 코딩 에이전트 59점, 지식 54점, 정답률 58%와 환각률 11%는 해당 날짜의 평가 원표를 추가 대조할 후보로 보존한다.

Mistral은 Low, Medium, High 추론 모드를 안내한다. 공개 라이선스는 Mistral Ecosystem Open-Weight이며 Model-as-a-Service 사업자의 상업 이용에는 별도 라이선스 조건이 있다. 단순 MIT나 무제한 상업 이용으로 줄여 적지 않는다.

## 채택 전에 기록할 것

후보는 프롬프트나 미세조정으로 바꿀 수 없는 조건(라이선스, 데이터를 외부로 보낼 수 있는지, 배포 위치와 장비에 맞는 크기, 학습 데이터의 공개 범위, 미세조정이나 로그 확률 접근 같은 통제 수준)으로 먼저 거른다. 정확도, 유해성, 사실 일관성처럼 적응 기법으로 움직일 수 있는 속성은 남은 후보를 자기 과업으로 잴 때 보고, 발표 수치는 그 사이에서 후보를 좁히는 데만 쓴다. 채택한 뒤에는 [[Eval-Model-Drift-Monitoring|서빙 모델 드리프트 감시]]로 이어 간다(적용 제안).

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

- [Gemini 4 Carbon: our next frontier model — Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-carbon/) — 2026-11-02 발표의 점수, 평가 조건과 단계적 제공 범위 부분 대조. 2026-11-09 출시 특별가, 정가 각주와 Fairwind Program 대조.
- [Gemini 4 Carbon Intelligence, Performance & Price Analysis — Artificial Analysis](https://artificialanalysis.ai/models/gemini-4-carbon) — 2026-11-09 열람, Intelligence Index v5.0.1 (High) 점수, Google API 기준 단가와 과업당 비용
- [Google AI Studio, Gemini Developer API pricing](https://aistudio.google.com/docs/pricing) — 2026-11-09 열람, Gemini 4 Argon 특별가의 2026-11-30 기한
- [Mistral Large 4 (Le Chonk) is now open weight — Mistral](https://mistral.ai/news/mistral-large-4-oss/) — 2026-11-02 코딩 지수와 효율, 추론 모드와 라이선스 조건 부분 대조.
- [Introducing Claude Fable 5.2 and Claude Mythos 5.2 — Anthropic](https://www.anthropic.com/claude-fable-and-mythos-5-2) — 2026-11-09, 추론 강도를 낮춘 비용 비교(FrontierCode 2.0, WANDR, HLE)의 주장과 측정 주체 표기 대조
- [Pricing — Anthropic](https://platform.claude.com/docs/en/about-claude/pricing) — 2026-11-16 Fable 5.2와 5.1의 단가 대조
- [Claude Fable 5.2 (Max, Default Fallback) Intelligence, Performance & Price Analysis — Artificial Analysis](https://artificialanalysis.ai/models/claude-fable-5-2) — 2026-11-16 열람, 추론 강도별 지수와 출력 토큰, 과업당 비용, 속도와 지연
- [Claude Fable 5.1 (Max, Default Fallback) Intelligence, Performance & Price Analysis — Artificial Analysis](https://artificialanalysis.ai/models/claude-fable-5-1) — 2026-11-16 열람, 지수, 출력 토큰과 과업당 비용
- [Gemini 4 Hydrogen Intelligence, Performance & Price Analysis — Artificial Analysis](https://artificialanalysis.ai/models/gemini-4-hydrogen) — 2026-11-16 열람, 사고 수준별 지수와 출력 토큰
- [Introducing Our Smallest, Most Efficient Model: Muse Ember — Meta AI Research](https://research.meta.ai/blog/muse-ember) — 2026-11-09, 단가와 긴 프롬프트 구간, 평가표와 각주의 하네스, 비용 차트의 단가 기준 문구 대조
- [Introducing Edge0-145B: Frontier AI Capabilities on Your Own Computer — Edge0](https://edge0.ai/blog/introducing-edge0-145b-frontier-ai-capabilities-on-your-own-computer) — 2026-11-12, 메모리 표기와 공개 문구 대조
- [Edge0/Edge0-145B-NVFP4 — Hugging Face, Edge0](https://huggingface.co/Edge0/Edge0-145B-NVFP4) — 2026-11-16 라이선스와 메모리 측정 조건 대조
- [Claude Fable 5.2, Artificial Analysis 지능 지수에서 역대 최고인 65점 기록 — GeekNews](https://news.hada.io/topic?id=36910) — 학습 계기. 출시 직후 속도와 지연 값은 이 요약에서 가져왔다
- [Muse Ember - Meta의 가장 작고 효율적인 모델 — GeekNews](https://news.hada.io/topic?id=36903) — 학습 계기
- [Edge0-145B - 개인 컴퓨터에서 실행하는 1,450억 매개변수 AI 모델 — GeekNews](https://news.hada.io/topic?id=37100) — 학습 계기
- [Introducing GPT-6.2 Astra and Sol — OpenAI](https://openai.com/index/introducing-gpt-6-2-astra-sol/) — 2026-11-17 발표 원문. 2026-11-18 자동 열람이 HTTP 403으로 막혀 본문과 차트를 대조하지 못했다
- [GPT-6.2 Astra and Sol are now available — OpenAI Developer Community](https://community.openai.com/t/gpt-6-2-astra-and-sol-are-now-available/1417531) — 2026-11-17 공지 게시본. 2026-11-18 Agents' Last Exam 비교의 추론 강도와 비용 문구, FrontierCode 2.0 문장, 단가 대조
- [OpenAI API Docs, Pricing](https://developers.openai.com/api/docs/pricing) — 2026-11-18 GPT-6.2 Astra와 Sol 단가
- [Alibaba Unveils Qwen4-Max: New AI Teammate for Work, Creativity, and Discovery — Alibaba Cloud](https://www.alibabacloud.com/press-room/alibaba-unveils-qwen4-max) — 2026-11-16 보도자료. 2026-11-18 구조, Work360 정의, 토큰과 비용 문구, 이름만 든 벤치마크, 제공 경로와 공개 가중치 계획 대조
- [Alibaba Cloud Model Studio, Qwen4-Max](https://www.alibabacloud.com/help/en/model-studio/qwen4-max) — 2026-11-18 리전별 단가, 입력과 출력 한도, 추론 강도 단계와 대응표
- [Qwen4-Max: Features, Benchmarks, Pricing, and Access — DataCamp](https://www.datacamp.com/blog/qwen4-max) — 공식 블로그 차트의 Work360 점수와 과업당 비용을 옮긴 2차 자료
- [MAI Code 2 and Code 2 Flash: Everyday coding at scalable prices — Microsoft AI](https://microsoft.ai/news/introducing-mai-code-2-and-mai-code-2-flash/) — 2026-11-17. 2026-11-18 벤치마크 구성, 각주의 측정 조건과 프로모션 가격, 제공 경로 대조
- 사용자 제공 GeekNews 알림(2026-11-17~18): Qwen4-Max, GPT-6.2 Astra와 Sol, MAI Code 2와 Code 2 Flash. 학습 계기이며 게시물 번호는 확인하지 못했다. Code 2 Flash의 벤치마크별 통과율(61.0%, GPT-6 Luna 55.1%, Claude Haiku 5.5 53.9%)과 과업당 비용 $0.052, FrontierCode 2.0에서 두 모델을 최대 설정으로 잰 0.5점 이내 차이는 이 요약에만 있고 원문 본문으로 대조하지 못했다
- [YouTube, Marina Wyss, AI Engineering in 76 Minutes (Complete Course/Speedrun!)](https://www.youtube.com/watch?v=JV3pL1_mn2M) — 2025-04-01 업로드. Chip Huyen의 책 AI Engineering(O'Reilly Media, 2025)을 요약한 강의로, 바꿀 수 없는 조건과 적응으로 바뀌는 속성을 나눠 후보를 거르는 순서의 계기다

## 관련 문서

- [[Agent-Model-Capability-Contracts|에이전트 모델 능력 계약]] — Kimi K3.1 Pro의 라이선스 조건, Inkling 2 Small의 공개 일정, Hy4의 API 선제공 사례
- [[AI-Capability-and-Cost-Trends|AI 능력과 비용 추세 읽기]] — 벤치마크 점수의 조건과 비용 추세
- [[LLM-Model-Tiers|LLM 모델 티어 선택]] — 티어, 라우팅과 시간대 단가
- [[Eval-LLM-Judge|LLM 판정기]] — 판정기의 편향과 교정
- [[Diffusion-Language-Models|확산 언어 모델]] — 병렬 생성의 속도 주장
- [[Time-Series-Foundation-Models|시계열 파운데이션 모델]] — 분위수 출력과 공급사 벤치마크
- [[Agent-Model-Capability-Contracts|에이전트 모델의 능력 계약]] — 전문 영역 후학습과 산출물 평가
- [[Local-Inference-Deployment-Cases|로컬 추론의 배포 사례]] — 메모리 예산과 MoE, Edge0-145B의 RAM과 SSD 계층
- [[Claude-Fable-5-Mythos-5|Claude Fable 5, Mythos 5]] — 5.2의 단가, 요금제 포함 범위와 사용자 사례
- [[Gemini-4-Argon|Gemini 4 Argon]] — Carbon GA, Hydrogen의 단가와 사고 수준, Orchestrator 수치의 판 표기
- [[LLM-Operations|LLM 선택, 서빙과 운영]]
