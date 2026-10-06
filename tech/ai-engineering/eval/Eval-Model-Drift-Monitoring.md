---
tags: [ai, evaluation, quality, monitoring, llm]
status: done
verified_at: 2026-10-06
category: "AI엔지니어링(AIEngineering)"
aliases: ["Served Model Drift Monitoring", "Model Drift Monitoring", "모델 드리프트 감시", "LLM 품질 저하 감지"]
---

# 서빙 모델 드리프트 감시 (Served Model Drift Monitoring)

내 코드와 프롬프트를 바꾸지 않았는데 같은 모델 이름으로 받는 결과의 정답률, 출력 토큰, 비용이 달라지는 현상을 이 문서에서는 서빙 모델 드리프트라 부른다. 입력 분포가 바뀌는 데이터 드리프트와 달리 같은 입력에 대한 제공자 쪽 응답이 바뀌는 경우다. 한 연구에서는 소수와 합성수를 가리는 같은 문제에서 GPT-4의 정확도가 2023년 3월판 84%, 6월판 51%로 갈렸고, 연구진은 같은 LLM 서비스도 비교적 짧은 기간에 크게 바뀔 수 있어 지속적인 감시가 필요하다고 결론 냈다. 내 변경이 만든 회귀는 [[Eval-Golden-Set-and-Deploy-Gates]]의 배포 관문이, 판정 모델 교체는 [[Eval-LLM-Judge]]가 맡는다. 이 문서는 내가 통제하지 못하는 쪽의 변화를 잡는 감시 설계를 다룬다.

## 같은 이름 아래에서 바뀌는 네 층

같은 모델 이름 아래에서 바뀌는 것은 가중치만이 아니고, 층마다 막는 수단이 다르다.

| 층 | 바뀌는 것 | 확인된 사례 | 스냅샷 고정으로 막히는가 |
|---|---|---|---|
| 1. 가중치와 별칭 | 별칭이 새 스냅샷을 가리키거나 앱에서 쓰는 모델이 갱신된다 | 4.6 이전 세대 Claude의 별칭(`claude-sonnet-4-5`)은 그 minor 버전의 가장 최근 날짜 스냅샷을 가리킨다. OpenAI 모델 페이지에는 스냅샷과 별칭 목록이 있고 GPT-4o 항목에는 날짜 붙은 스냅샷 3개가 올라 있다. ChatGPT의 GPT-4o 업데이트(2025-04-25)는 아첨 문제로 4월 28일부터 되돌려졌다(릴리스 노트 2025-04-29 항목) | API는 스냅샷 ID로 막는다. 앱의 모델 갱신은 ID 고정의 범위 밖이다 |
| 2. 서빙 인프라 | 요청 라우터, 안전 분류기, 샘플링 로직 | Anthropic 문서는 안정적이던 ID에서 예상치 못한 행동 차이가 보이면 인프라 갱신이 가장 유력한 원인이라고 적는다. 2025년 8~9월 Claude의 버그 3건은 짧은 컨텍스트 Sonnet 4 요청을 1M 컨텍스트용 서버로 보낸 라우팅 오류(8월 31일에 Sonnet 4 요청의 최대 16%, 그 기간에 요청한 Claude Code 사용자 약 30%가 한 번 이상 영향, 한 번 잘못 배정되면 후속 요청도 같은 서버로 갈 가능성이 높은 sticky 라우팅), 영어 질문에 태국어나 중국어 문자를 섞어 낸 TPU 설정 오류, exact top-k로 바꿔 해결한 approximate top-k의 XLA:TPU 오컴파일이었다 | 막히지 않는다 |
| 3. 하네스와 제품 기본값 | 기본 추론 effort, 시스템 프롬프트, 컨텍스트 정리 | 2026년 3~4월 Claude Code, Claude Agent SDK, Claude Cowork에 영향을 준 변경 3건(API는 영향 없음). 기본 effort를 high에서 medium으로 낮췄고(3월 4일, 4월 7일 원복), 1시간 넘게 유휴였던 세션의 오래된 thinking을 한 번 정리하려던 변경이 버그로 매 턴 반복됐으며(3월 26일, 4월 10일 수정), 도구 호출 사이 텍스트는 25단어 이하, 최종 응답은 더 자세할 필요가 없는 한 100단어 이하로 제한한 시스템 프롬프트는 배포 전 평가에서는 회귀가 없었지만 사후 ablation에 쓴 더 넓은 평가 가운데 하나에서 Opus 4.6과 4.7 모두 3% 떨어졌다(4월 16일, 4월 20일 원복) | API 직접 호출은 해당 없다. 하네스 경로는 ID 고정으로 막히지 않는다 |
| 4. 내 쪽 변경 | 프롬프트, 도구, 검색 문서, SDK, 파라미터 | 배포 관문이 다루는 대상 | 고정과 무관하다([[Eval-Golden-Set-and-Deploy-Gates]]) |

Anthropic은 수요, 시간대, 서버 부하 때문에 모델 품질을 낮추지 않으며 보고된 문제는 인프라 버그 때문이었다고 밝혔고(2025-09), 2026-04에도 모델을 의도적으로 저하시키지 않으며 API와 추론 계층은 영향을 받지 않았다고 밝혔다. 그러면서도 두 사후 분석 모두 실제 품질 저하를 인정한다. 의도와 상관없이 사용자가 받는 품질은 바뀔 수 있고, 그 변화는 측정해야만 보인다. 그래서 API 경로의 1층은 고정으로 막고, 2층과 3층, 앱 경로의 모델 갱신은 감시로 잡고, 4층은 배포 관문으로 거른다.

## 고정이 막는 것과 못 막는 것

- Anthropic 문서 기준(2026-10-06 확인)으로 모델 ID는 고정된 버전을 가리키고, ID가 유지되는 동안 기반 모델은 바뀌지 않는다. 이 보장은 ID에만 있고 4.6 이전 세대의 편의 별칭에는 없다. 4.6 세대부터는 날짜 없는 ID(예: `claude-sonnet-4-6`)가 별칭이 아니라 그 자체로 스냅샷이며, 기존 ID의 가중치나 구성은 갱신하지 않고 새 버전은 새 ID로 나온다.
- 같은 문서는 ID와 가중치가 같아도 서빙 인프라가 바뀌어 관찰되는 행동에 작은 차이가 생길 수 있다고 밝힌다. 하네스와 앱 경로의 기본값 변경도 ID 고정의 범위 밖이다.
- OpenAI 모델 문서는 스냅샷으로 특정 버전을 고정하면 성능과 행동을 일정하게 유지할 수 있다고 설명한다. GPT-6 Astra 페이지의 스냅샷 목록에는 `gpt-6-astra` 하나뿐이고, 이 ID가 나중에 다른 스냅샷을 가리키지 않는다는 명시 문구는 모델 페이지에서 찾지 못했다(2026-10-06 확인). 고정됐다고 단정하지 말고 응답의 `model` 값을 기록해 대조한다.
- Chat Completions 응답의 `system_fingerprint`(선택 필드)는 모델이 돌아가는 백엔드 구성을 나타내며 `seed`와 함께 결정성에 영향을 줄 수 있는 백엔드 변경 시점을 파악하는 데 쓰도록 설명돼 있지만, API 레퍼런스는 `system_fingerprint`와 `seed`를 모두 Deprecated로 표시한다(2026-10-06 확인). `seed`는 결정성도 보장하지 않는다. 값이 오는 동안은 응답의 `model`(실제로 쓰인 모델)과 함께 호출 로그에 남겨 품질 변화 시점과 대조하되, 빠질 수 있는 필드라 감시의 주 신호로 삼지 않는다.
- 고정해도 은퇴 일정에 따른 교체는 남는다([[Eval-LLM-Judge#판정기도 바뀌고 닳는다|판정기 교체]]). Claude Code를 CI에서 돌릴 때 모델 버전을 고정해야 하는 이유는 [[Claude-Code-Operations]]를 본다.

고정은 API 경로에서 1층을 떼어 내 원인 범위를 줄이는 장치다. 남는 2층과 3층은 감시로 잡는다.

## 감시 설계의 뼈대와 공개 보드 사례(NerfBench, 2026-10-04 기준)

NerfBench(Nerf Bench)는 BridgeMind가 만든 BridgeBench의 일부로, 모델을 처음 잰 세션을 100%로 동결하고 같은 비공개 과제를 반복 실행해 기준 대비 힘(power)을 공개하는 보드다. 아래는 2026-10-04 방법론 기준의 설계 선택과 이를 내 서비스로 옮길 때의 대응이다.

| 설계 요소 | NerfBench의 선택 | 내 서비스로 옮길 때 |
|---|---|---|
| 고정 과제 | 자동 채점 50과제(코드 33, 정답 17), 8범주(Bug fixing, Code reasoning, Code writing, Algorithms, Strings, Testing, Security, SQL). 코드는 테스트를 모두 통과해야, 정답은 형식을 정규화한 뒤 기대값과 정확히 일치해야 통과한다 | 운영 실패로 만든 골든셋 가운데 자동 채점되는 문항을 정기 실행용 카나리 세트로 떼어 낸다([[Eval-Golden-Set-and-Deploy-Gates]]) |
| 동결 기준점 | 첫 세션을 기준으로 동결해 100%로 둔다 | 직전 회차만 보면 표류가 쌓이므로 고정 기준과 최근 회차를 함께 본다([[Load-Test-Automation]]) |
| 지표 | 정답률 60%, 출력 토큰 20%, 비용 20%를 기준 대비 비율로 합산한다. 같은 일을 끝내는 데 토큰이나 비용이 더 들면 답이 같아 보여도 힘을 잃은 것으로 본다. 출력 토큰만 세고(출력으로 보고된 추론 토큰 포함) 입력 토큰은 뺀다 | 정답률 게이트와 효율 지표(과제당 출력 토큰, 비용, 지연)를 따로 둔다([[AI-Coding-Agent-Usage-Telemetry]]) |
| 반복 | 과제마다 3회, 세션당 150회 시도한다. 세션 점수는 매번 다르고, 시도의 70%를 통과하는 모델이면 우연만으로 power가 95% 확률로 위아래 약 9포인트까지 움직인다 | 반복 실행으로 회차 간 흔들림 폭부터 잰다([[LLM-Eval-Strategy]]) |
| 판정 | 90~110%는 정상 변동이다. 대역을 벗어난 세션은 직전 세션도 완료와 채점을 마쳤고 같은 기준과 설정이라 비교 가능하며 같은 쪽으로 벗어났을 때만 확정해, 운 나쁜 한 세션으로 빨간불이 켜지지 않게 한다 | 연속 확인 규칙으로 오탐을 줄이고, 대역 폭은 실제로 잰 흔들림에서 정한다(실패 체크가 정한 횟수에 이르러야 되돌리는 [[Canary]] 판정과 같은 결) |
| 빈도 | 모델마다 주 3회 이상 | 호출 비용과 탐지 지연을 맞바꾼다 |
| 측정 경로 | 라우팅, 시스템 지시, 추론 설정, 출력 한도 변화까지 포함해 실제로 제공되는 그대로의 모델을 잰다. 같은 모델도 접근 경로마다 별도 시계열로 추적한다. OpenRouter는 기본 라우팅에 upstream 제공자와 temperature를 지정하지 않고 반환된 model ID와 request ID를 저장하며, Claude Code는 도구와 로컬 설정 없이, Codex는 도구를 끄고 빈 작업 디렉터리에서 돌린다(Codex는 비용을 보고하지 않아 정답률 75%, 토큰 25%로 채점한다). 각 시도는 도구와 저장소 없이 한 번의 응답으로 답한다 | 내 실제 경로(모델 ID, effort, 시스템 프롬프트, 도구 구성)로 재야 내 품질을 대변한다([[Harness-Component-Evaluation]]) |
| 과제 비공개 | 공개 벤치마크는 연구소가 점수에 맞춰 최적화(benchmax)할 수 있어 과제, 테스트, 답을 비공개로 둔다 | 공개 점수 대신 오염되지 않은 내 세트를 쓴다 |

### 합성 점수가 가리는 것

정답률은 오늘 값을 기준값으로 나누고, 토큰과 비용은 기준값을 오늘 값으로 나눠 더 많이 쓸수록 비율이 1 아래로 내려간다. NerfBench 설명에 쓰인 계산 예시로, 기준이 정답률 0.9, 출력 10,000토큰, 0.10달러이고 오늘이 0.72, 14,000토큰, 0.13달러라면 비율은 0.8, 0.714, 0.769이고 power는 0.6×0.8 + 0.2×0.714 + 0.2×0.769 ≈ 77.7%로 90%에 못 미쳐 lost power다.

같은 공식에 값을 바꿔 넣으면 반대 방향도 나온다. 정답률이 0.9에서 0.81로 10% 떨어져도 토큰이 같고 단가가 절반이면 0.6×0.9 + 0.2×1.0 + 0.2×2.0 = 114%로 gained power가 된다. 같은 공식으로 계산한 예시이며, 비율은 0에서 2 사이로 자르므로 비용 비율 2는 상한값이다. NerfBench 방법론도 모델이 많이 싸지면 정답률이 떨어지는 동안에도 power가 오를 수 있다고 밝히고, 세션 점검에서 그런 세션을 모두 검토 대상으로 표시한다. 내 카나리 세트에서는 정답률을 합성 점수에 섞지 않고 별도 게이트로 둔다.

## 공개 추적 보드를 읽는 법

- 2026-10-04까지의 측정 기준으로 NerfBench가 추적하는 4개 모델(Claude Opus 5.5 96.5%, GPT-6 Astra 98.0%, Claude Sonnet 5.5 100.9%, GPT-6.1 Sol 106.7%)은 모두 정상 변동 안에 있다. 기준보다 몇 % 낮다는 사실만으로 저하라고 읽지 않는다.
- Opus 5.5는 10월 1일 103.8%에서 10월 2일 94.2%로 하루 만에 9.6%포인트 움직였지만 둘 다 정상 변동이다. 대역은 직전 값이 아니라 동결 기준 대비 90~110%라서, 대역 안에 머무는 변화는 크기와 상관없이 정상 변동으로 판정된다(예: 106.7%인 모델은 16.7포인트 넘게 떨어져야 대역을 벗어난다).
- GPT-6 Astra는 9월 3일 첫 측정 뒤 다음 측정이 9월 27일이다. 방법론(2026-10-04)의 주 3회 이상 기준과 달리 그 전 기록에는 이런 공백이 있고, 측정이 드문 구간의 변화는 보이지 않는다.
- 보드는 그 보드의 과제와 경로를 잰다. 하락이 보여도 원인이 가중치, 인프라, 하네스, 가격 가운데 어디인지는 가르지 못한다. 가격 변경도 power에 반영된다(비용을 보고하는 경로에 한해).
- 체감 보고도 제공자의 평가도 놓칠 수 있다. 2026년 3~4월 사례에서는 초기 보고를 사용자 피드백의 정상 변동과 구분하기 어려웠고 내부 사용과 평가도 처음에는 문제를 재현하지 못했다. 2025년 8~9월 사례에서는 돌린 평가가 보고된 저하를 잡지 못했다.
- 제공자가 내놓은 대응은 실제 프로덕션 시스템에서 평가를 지속 실행하기, 시스템 프롬프트를 바꿀 때마다 모델별 평가와 ablation, soak 기간과 점진 배포, 직원의 공개 빌드 사용이다. OpenAI의 2025년 4월 사례도 행동을 보는 오프라인 평가와 A/B 테스트가 좋아 보여도 행동 회귀가 배포될 수 있음을 보여 준다. 제공자의 검증과 내 감시는 별개다.

## 운영 체크포인트

- API를 스냅샷 ID로 고정했는가. 4.6 이전 세대 Claude 별칭처럼 가리키는 대상이 바뀌는 이름이 운영 경로에 남아 있지 않은가. 스냅샷 목록에 날짜 없는 ID 하나뿐인 모델은 응답의 `model` 값을 기록해 대조하는가.
- 호출 로그에 응답의 `model`, Chat Completions의 `system_fingerprint`(Deprecated 필드라 있을 때만), 요청 effort, 시스템 프롬프트 해시, SDK와 하네스 CLI 버전을 남기는가.
- 자동 채점 카나리 세트를 실제 경로로 정기 실행하고, 정답률, 과제당 출력 토큰, 비용, 지연을 고정 기준과 최근 회차 양쪽에 비교하는가. 정답률은 별도 게이트인가.
- 출력 언어 불일치, 스키마 위반, 거절과 잘림 비율 같은 값싼 결정론 검사를 함께 보는가. 2025년 TPU 설정 오류는 영어 질문에 태국어나 중국어 문자가 섞이는 형태로 나타났다([[LLM-Failure-Handling]]).
- 경보를 연속 회차 확인으로 걸고, 대역 폭을 실제로 잰 흔들림에서 정했는가.
- 폴백 모델과 판정 모델도 같은 카나리 세트를 도는가([[LLM-Failure-Handling#폴백과 기능 저하|폴백 경로 eval]], [[Eval-LLM-Judge]]).
- 공개 추적 보드는 방향 신호로만 쓰고 결정은 내 세트로 내리는가.

경보가 울리면 원인 층을 다음 순서로 좁힌다.

1. 내 변경 diff(프롬프트, 도구, 검색 인덱스, SDK, 파라미터)를 본다.
2. 하네스와 CLI 버전, 기본값 변경을 본다.
3. 제공자 공지와 상태 페이지를 본다.
4. 같은 문항을 고정 ID로 API에 직접 보내 하네스 층과 그 아래 층(모델과 서빙 인프라)을 분리한다.

## 트레이드오프

| 선택 | 얻는 것 | 잃는 것 |
|---|---|---|
| 실행 빈도를 높인다 | 탐지 지연이 줄어든다 | 호출 비용과 속도 한도를 소모한다 |
| 대역을 좁힌다 | 작은 회귀까지 잡는다 | 오탐이 늘어 반복 횟수와 문항 수를 늘려야 한다 |
| 정답률, 토큰, 비용을 합성 점수 하나로 본다 | 한 숫자로 추이를 본다 | 가격 인하가 정답률 하락을 가린다 |
| 문항을 비공개로 둔다 | 오염과 게이밍을 막는다 | 외부에서 재현하고 검증할 수 없다 |
| 앱(하네스) 경로로 잰다 | 사용자가 실제로 받는 품질을 잰다 | 원인 분리가 어렵고 버전 고정 수단이 제한적이다 |
| API 고정 ID로 잰다 | 원인 분리가 쉽다 | 하네스와 제품 기본값 변화를 놓친다 |

## 면접 체크포인트

- 모델 ID를 고정했는데도 품질이 바뀔 수 있는 이유(서빙 인프라, 하네스, 은퇴)
- 정답률 외에 토큰과 비용을 보는 이유와, 합성 점수가 정답률 하락을 가리는 경우
- 직전 회차와만 비교할 때 생기는 표류와 동결 기준점
- 한 번의 하락을 회귀로 판정하지 않는 규칙(반복, 대역, 연속 확인)과 대역 폭의 근거
- 공개 벤치마크와 추적 보드가 내 서비스 품질을 대변하지 못하는 이유
- 경보가 울렸을 때 원인 층을 좁히는 순서

## 출처

- [How Nerf Bench Detects When AI Models Get Nerfed — BridgeBench](https://www.bridgebench.ai/blog/how-nerf-bench-works)
- [The Methodology of NerfBench — BridgeBench](https://www.bridgebench.ai/blog/the-methodology-of-nerfbench)
- [Nerf Bench — BridgeBench](https://www.bridgebench.ai/nerf-bench)
- [A postmortem of three recent issues — Anthropic Engineering](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues)
- [An update on recent Claude Code quality reports — Anthropic Engineering](https://www.anthropic.com/engineering/april-23-postmortem)
- [Anthropic, Model IDs and versioning](https://platform.claude.com/docs/en/about-claude/models/model-ids-and-versions)
- [OpenAI, GPT-4o](https://developers.openai.com/api/docs/models/gpt-4o)
- [OpenAI, GPT-6 Astra](https://developers.openai.com/api/docs/models/gpt-6-astra)
- [OpenAI, Chat Completions API reference](https://developers.openai.com/api/docs/api-reference/chat)
- [OpenAI, Create chat completion](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)
- [OpenAI Help Center, Model Release Notes](https://help.openai.com/en/articles/9624314-model-release-notes)
- [Expanding on what we missed with sycophancy — OpenAI](https://openai.com/index/expanding-on-sycophancy/)
- [How is ChatGPT's behavior changing over time? — arXiv, Lingjiao Chen 외](https://arxiv.org/abs/2307.09009)

## 관련 문서

- [[Eval-Golden-Set-and-Deploy-Gates|골든셋과 배포 관문 (내 변경의 회귀, 베이스라인과 표류)]]
- [[Eval-LLM-Judge|LLM 판정기 (판정 모델 교체와 스냅샷 은퇴)]]
- [[LLM-Eval-Strategy|LLM 평가 전략 (성능 비고정성과 반복 측정)]]
- [[LLM-Failure-Handling|LLM 실패 처리 (200 응답 안의 의미적 실패 지표, 폴백 경로 eval)]]
- [[Load-Test-Automation|부하 테스트 자동화 (고정 베이스라인과 롤링 기준의 표류)]]
- [[Canary|Canary 배포 (동시 baseline 비교와 판정 기준)]]
- [[AI-Coding-Agent-Usage-Telemetry|AI 코딩 에이전트 사용량 관측 (토큰과 비용 기록)]]
- [[Harness-Component-Evaluation|하네스 구성요소 평가 (같은 모델도 하네스에 따라 성공률과 비용이 달라짐)]]
- [[Claude-Code-Operations|Claude Code 운영 (CI의 모델 버전 고정)]]
- [[Evaluation-Driven-Development|평가 주도 개발 (Lv.4 배포 후 감시, 회귀를 자산으로 남기는 루프)]]
