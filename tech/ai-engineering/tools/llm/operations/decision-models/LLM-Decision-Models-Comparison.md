---
tags: [ai, llm, decision-model, benchmark, guardrails]
status: done
verified_at: 2026-10-06
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Decision Models Comparison", "결정 모델 비교", "Jev와 Clef 비교", "Jev", "Clef"]
---

# 결정 모델: 모델 비교, 한계와 운영 체크포인트

Jev, Clef와 Clef-flash의 제공 방식, 가격, 지연과 정확도, 로컬 Laya, 가드레일 비교 평가를 정리하고 결정 모델의 한계와 운영 체크포인트를 둔다. 질문 스키마와 확률, confidence의 의미는 [[LLM-Decision-Models-Mechanics|정의와 동작 원리]]를 따른다. 상위: [[LLM-Decision-Models|결정 모델]].

## 트레이드오프

### Jev와 Clef 비교 (2026-10-06 확인)

| 항목 | Jev | Clef | Clef-flash |
|---|---|---|---|
| 제공 | TypeSafe API, 가중치 공개 안내 없음 | Workers AI, Hugging Face 가중치(Apache 2.0) | Workers AI, Hugging Face 가중치(Apache 2.0) |
| 크기, 기반 모델 | 확인한 공식 문서에 표기 없음 | 27B, Qwen3.8-27B | 9B, Qwen3.5-9B |
| 입력 | 텍스트와 JSON(이미지, 오디오, 비디오 입력 없음) | 텍스트, JSON, 이미지(Workers AI 입력 스키마 기준 요청당 최대 4장) | 텍스트, JSON, 이미지(Workers AI 입력 스키마 기준 요청당 최대 4장) |
| 컨텍스트 | 요청당 64k, `state`와 가장 긴 질문 합계 32k | 65,536 토큰 | 65,536 토큰 |
| 입력 100만 토큰당 | $0.042, 출력 토큰 과금 없음 | $0.24 | $0.09 |
| 지연 중앙값 / p95 (Cloudflare 측정) | 524.1 / 536.0 ms | 209.3 / 238.6 ms | 38.8 / 122.4 ms |

Clef의 모델 설명과 Hugging Face 모델 카드는 비디오도 읽는다고 적지만, Workers AI 입력 스키마에는 비디오 필드가 없다. Workers AI는 Free와 Paid 플랜 모두에 하루 10,000 뉴런을 과금 없이 주고 00:00 UTC에 초기화한다. 이 할당은 계정의 모든 Workers AI 모델 사용이 함께 쓴다. Clef는 입력 100만 토큰당 21,818 뉴런, Clef-flash는 8,182 뉴런이라 할당을 한 모델에만 쓸 때 하루 과금 없는 범위는 계산상 각각 약 46만, 약 122만 입력 토큰이다. 초과분은 Paid 플랜에서 1,000 뉴런당 $0.011이고 Free 플랜은 초과하면 요청이 실패한다. 지연은 Cloudflare가 43개 평가를 돌리며 잰 값으로 하드웨어, 네트워크 포함 여부, 입력 길이가 공개되지 않았고, TypeSafe는 Jev의 end-to-end 응답 시간을 70~500ms로 밝힌다.

- 텍스트만 판단하고 관리형 API의 낮은 입력 단가가 중요하면 Jev, 이미지 판단이나 자체 호스팅, 자체 미세조정이 필요하거나 서비스가 이미 Cloudflare Workers에서 돈다면 Clef 계열이 후보다. Jev는 고객 데이터로 미세조정이나 LoRA 적응을 하지 않는다. Cloudflare는 Clef와 함께 RL 미세조정 서비스를 발표했는데, 발표 기준 처음에는 Cloudflare의 FDE(forward-deployed engineer) 팀과 함께 진행하고 셀프 서비스 플랫폼은 이후 계획이다. 가중치가 Apache 2.0이라 직접 미세조정할 수도 있다.
- 확인한 예시 기준으로 Jev는 `POST https://api.typesafe.ai/v1/systemone`, Clef는 Workers AI의 `@cf/cloudflare/clef` 실행 경로(REST 또는 `env.AI.run`)를 쓴다. 호환은 요청 본문 형식 수준으로 보고, 교체할 때 엔드포인트, 인증, 모델 ID를 바꾼 뒤 응답 필드와 문턱을 다시 검증한다.
- Workers AI의 Clef 계열은 요청당 질문을 1~64개 받고 토큰 한도를 넘는 긴 `state`를 잘라 처리한다. Hugging Face 모델 카드는 모든 질문의 선택지를 함께 채점한다고 설명하므로, Jev에서 기대던 질문 간 독립성이 유지되는지는 질문을 더하거나 뺀 회귀 세트로 확인한다.

### 정확도 비교 (Cloudflare 측정, 2026-10-01 발표)

| 평가 (지표) | Clef | Clef-flash | Jev |
|---|---|---|---|
| BFCL (case exact) | 98.47 | 98.76 | 95.75 |
| BANKING77 (macro-F1) | 94.20 | 90.93 | 79.74 |
| CLINC150+OOS (macro-F1) | 97.43 | 66.77 | 89.27 |
| When2Call (accuracy) | 72.37 | 65.58 | 80.97 |
| BRIGHT (nDCG@10) | 45.91 | 39.26 | 47.52 |

Cloudflare가 Jev Decision Index의 평가 가운데 10개를 골라 직접 잰 결과에서 다섯 개를 옮겼다. 도구 호출 형식(BFCL)과 BANKING77 의도 분류에서는 Clef 계열이 앞선다. CLINC150+OOS는 Clef가 앞서지만, 범위 밖(out-of-scope) 질의 탐지를 포함한 이 평가에서 Clef-flash는 Jev보다도 크게 낮다. 도구를 부를지, 되물을지, 답할 수 없다고 할지를 고르는 When2Call과 추론이 필요한 검색인 BRIGHT에서는 Jev가 앞선다. 표에 옮기지 않은 ToolRet, API-Bank, Home appliances, Amazon ESCI, PhishNChips에서는 Clef와 Clef-flash가 모두 Jev보다 높았고, Cloudflare는 TypeSafe 자체 워크플로 평가 네 영역 중 세 영역에서 Clef가 Jev를 앞섰다고 밝히며, 같은 표에서 Clef-flash는 한 영역만 앞서고 한 영역은 동률이다. 한쪽 벤더가 고른 평가와 조건이므로 채택은 자기 과업의 라벨 데이터로 정한다.

### 로컬 결정 모델: Laya

2026-10-06에 확인한 Laya 저장소는 입력과 질문을 한 번의 forward pass로 채점하는 비자기회귀 결정 엔진을 제공한다. `choice`, `score`, `noul` 형태의 결정을 내고 영어, 다국어와 특정 워크플로에 맞춘 체크포인트를 구분한다. 첫 사용에는 가중치 다운로드가 필요하므로 로컬 추론과 최초 설치의 네트워크 요구를 나눠 본다.

- **학습 전후를 구분한다:** 제작자가 공개한 typed-decisions 평가(네 워크플로, 2,000개 결정)에서 기본 영어 체크포인트 정확도는 0.362, 해당 과업에 미세조정한 체크포인트는 0.766이다. 제작자 평가이며 다른 언어와 업무에서의 우위를 보장하지 않는다.
- **실행 계층과 모델을 구분한다:** `laya-mlx`는 Apple Silicon용 독립 MLX 포트다. 추론과 가중치 변환을 제공하고 학습은 상위 Laya 프로젝트가 맡는다. 체크포인트와 정밀도가 다르면 확률도 달라질 수 있다.
- **언어와 비용을 다시 잰다:** 다국어 체크포인트가 있다는 사실만으로 한국어 업무 정확도가 충분하다고 판단하지 않는다. 같은 라벨 표본에서 정확도, 양성 재현율, 보정과 전체 지연을 비교한다. 로컬 실행도 하드웨어, 전력, 운영과 재학습 비용이 있으므로 API 청구액이 없다는 이유만으로 총비용을 0으로 잡지 않는다.

게임 데모의 처리 속도는 입력 표현, 모델, 장비와 네트워크 조건에 의존한다. 특정 데모의 속도 배수를 문서 분류나 고객 문의 판정의 정확도 우위로 바꾸지 않는다.

### 가드레일 비교 평가 (Red Hat, 2026-10-02 게시)

Red Hat AI Safety 팀은 NeMo Guardrails 서버 뒤에 사전학습 분류기, zero-shot 분류기, LLM 판정기와 결정 모델을 두고 영어 데이터로 프롬프트 인젝션(PI)과 콘텐츠 안전(CS) 차단 판정을 비교했다. 평가팀은 가드레일에 작은 예측 모델을 쓰자고 주장해 왔다고 밝히며, 사전학습 분류기로 RedHatAI 배포본을 썼다. TypeSafe와는 독립된 평가지만 한쪽 관점의 평가로 읽는다. 아래는 9개 방식 중 5개의 본문 표 정확도와 중앙 지연이다.

| 방법 | PI 정확도 | PI 지연(ms) | CS 정확도 | CS 지연(ms) |
|---|---|---|---|---|
| 사전학습 분류기(PI: DeBERTa 약 2억, CS: Granite Guardian HAP 1.25억) | 89.01% | 54.1 | 80.27% | 33.2 |
| Qwen3.6-35B-A3B-FP8 판정기 | 89.31% | 312.5 | 85.47% | 307.6 |
| DiffusionGemma | 87.72% | 561.7 | 85.53% | 499.3 |
| Jev 1.13.0 | 86.35% | 348.1 | 86.20% | 360.4 |
| Laya(영어, 약 4.2억) | 85.44% | 119.3 | 57.87% | 118.0 |

- **측정 조건이 섞여 있다.** 사전학습 분류기와 Laya는 MacBook Pro M1 CPU에서, LLM 판정기와 DiffusionGemma는 미국 GPU 클러스터에서, Jev는 TypeSafe API로 돌렸고 평가 기계는 영국에 있었다. 저자들은 원격 방식 전체에 약 56ms 이상의 네트워크 지연이 붙는다고 추정했으며, 역시 미국 서버를 원격 호출한 Qwen 판정기도 Jev보다 중앙 지연이 짧았다(글은 TypeSafe 서버가 미국 데이터센터에서 돈다고만 적었고 세부 리전과 하드웨어는 밝히지 않았다).
- **저자들은 결정 모델이 LLM 판정기보다 빠르거나 싸거나 품질이 높은 답을 낸다는 결과를 찾지 못했다고 결론 내리며, 작은 크기가 분명한 장점인 Laya는 한계를 프롬프트로 보완할 수 있다는 전제에서 예외로 두었다.** 또 Jev 같은 결정 모델은 LLM 판정기, 사전학습 모델과 오픈소스 결정 모델보다 속도나 정확도에서 일관되게 앞서지 않았다고 본다. 비용은 따로 측정하지 않았고 반복 실행, 신뢰구간과 표본 수를 보고하지 않았다. 본문 표와 부록 표의 일부 값도 어긋난다. 특히 사전학습 분류기의 PI 중앙 지연은 본문 54.1ms, 부록 80.4ms이며 위 표는 본문 기준이다.
- **Laya에 맞춘 질문 문구는 Jev로 옮겨지지 않았다.** Laya용으로 고친 noul 질문 8개는 Laya의 CS 정확도를 75.20%로 올렸지만 중앙 지연도 289.4ms로 늘렸고, 같은 질문을 쓴 Jev는 82.53%로 3.67pp 낮아졌다. 모델을 바꿀 때는 엔드포인트뿐 아니라 질문과 문턱도 다시 검증한다.
- **최상위 방식도 인젝션 일부를 통과시켰다.** 부록 기준 PI 차단 재현율은 Qwen 판정기 0.8427, 사전학습 분류기 0.8307, Jev 0.7787이다. 저자들은 학습 데이터가 풍부하고 위험 정의가 분명한 과제에서는 사전학습 분류기가 여전히 효과적이고, 분류기가 없거나 부족한 과제에서는 zero-shot 방식이 LLM 판정기의 대안이 된다고 본다. CS에서는 HAP 분류기가 Jev보다 약 6pp 낮았다.

## 한계

- **닫힌 선택지**: 선택지 밖 입력도 어떤 선택지로든 확률이 배분된다. 해당 없음 선택지나 관련성을 묻는 `noul`을 따로 둔다. 입력에 답의 근거가 없는 질문(미래 성과 예측 등)에도 확률은 나온다.
- **Jev 1.13의 알려진 약점**: 의도가 아니라 쓴 질문 그대로 답한다. 범위 단어, 부정, 암묵적 조건을 글자 그대로 읽고 적지 않은 조건은 추론하지 않으며, 이중 부정과 복잡한 간접 지시에서는 덜 안정적이다. 세기, 산술, 날짜 비교에 약하고, 결정과 무관한 내용이 많은 `state`에서 정확도가 떨어진다. Choice 선택지 순서가 답에 영향을 주고 앞쪽 선택지로 기우는 경우가 관찰됐다.
- **프롬프트 인젝션**: Jev 1.13은 `state`를 기본적으로 적대적으로 다루지 않으며, 모델을 조종하려고 쓴 내용이 답을 움직일 수 있다. 판정 대상을 공격자가 쓰는 모더레이션 경로에서는 단일 판정만으로 되돌릴 수 없는 행동을 실행하지 않는다([[LLM-Application-Security#LLM01 프롬프트 인젝션|프롬프트 인젝션]]).
- **언어**: Jev 문서는 영어가 주 학습 언어이고 CJK를 포함한 다른 언어는 같은 수준이 아니라며, 비영어 워크로드는 자기 콘텐츠로 먼저 시험하라고 안내한다. Clef의 언어별 성능은 확인한 공식 자료에 없다.

## 운영 체크포인트

- 결정이 입력만으로 판정 가능하고 선택지가 닫혀 있는가. 아니면 생성형 LLM이나 사람에게 둔다.
- 넓은 질문을 원자적인 질문으로 쪼갰는가. 넓은 질문은 여러 판단을 한 답 뒤에 숨기므로 좁은 답을 받아 가중 합산은 코드에서 한다.
- 행동별 문턱을 오판 비용으로 정하고, 라벨 데이터에서 confidence 구간별 정확도를 그려 확인했는가. 확신이 낮은 사례는 사람이나 더 비싼 추론 모델로 넘기고 그 결과를 라벨로 회수한다.
- 라벨 없이 다른 LLM과의 일치율만 봤다면 그것은 정확도가 아니라 일치율이다. 사람 라벨 표본으로 확인한다([[Eval-LLM-Judge|LLM 판정기]], [[Eval-Golden-Set-and-Deploy-Gates|골든셋]]).
- 모델 버전을 고정했는가. `jev-latest`는 최신 안정 릴리스(2026-10-06 기준 `jev-1.13.0`)를 가리키는 별칭이라 버전이 바뀌면 문턱을 다시 검증한다.
- 선택지 순서를 섞어도 답이 유지되는지, 인젝션 문장을 넣은 회귀 샘플에서 판정이 버티는지 확인했는가.
- `state`에서 결정에 필요 없는 필드를 코드로 걸러 보내는가. 입력 토큰이 비용과 정확도를 함께 좌우한다.

## 출처

- [Introducing Clef: our open-source decision models, and new RL fine-tuning platform — Cloudflare Blog](https://blog.cloudflare.com/clef-decision-models/)
- [Laya — GitHub, NandhaKishorM](https://github.com/NandhaKishorM/laya) — 로컬 결정 엔진, 체크포인트와 과업별 미세조정 평가
- [laya-mlx — GitHub, mizorewww](https://github.com/mizorewww/laya-mlx) — 독립 MLX 포트와 정밀도, 언어별 체크포인트의 한계
- [Introducing System One Models & Jev — TypeSafe](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- [Benchmarking AI decision models against traditional guardrails — Red Hat Developer, Rob Geada, Mac Misiura, Shelton Cyril](https://developers.redhat.com/articles/2026/10/02/benchmarking-ai-decision-models-against-traditional-guardrails) — 2026-10-05 갱신본 기준 PI와 CS 정확도, 지연과 정책 재작성 실험
- [Cloudflare Workers AI, clef](https://developers.cloudflare.com/workers-ai/models/clef/)
- [Cloudflare Workers AI, clef-flash](https://developers.cloudflare.com/workers-ai/models/clef-flash/)
- [Cloudflare Workers AI, Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Hugging Face, Cloudflare/clef](https://huggingface.co/Cloudflare/clef)
- [TypeSafe Docs, API reference](https://docs.typesafe.ai/api)
- [TypeSafe Docs, Models](https://docs.typesafe.ai/models)
- [TypeSafe Docs, Primitives](https://docs.typesafe.ai/primitives)
- [TypeSafe Docs, Confidence](https://docs.typesafe.ai/confidence)
- [TypeSafe Docs, AI primer](https://docs.typesafe.ai/introduction/machine-learning-primer)
- [TypeSafe Docs, How to build with TypeSafe](https://docs.typesafe.ai/concepts/how-to-build-with-system-one)
- [TypeSafe Docs, Confidence-gated routing](https://docs.typesafe.ai/patterns/confidence-routing)
- [TypeSafe Docs, Jev 1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13)
- [When2Call: When (not) to Call Tools — arXiv](https://arxiv.org/pdf/2504.18851)
- [BRIGHT: A Realistic and Challenging Benchmark for Reasoning-Intensive Retrieval — arXiv](https://arxiv.org/pdf/2407.12883)
- [An Evaluation Dataset for Intent Classification and Out-of-Scope Prediction — arXiv](https://arxiv.org/abs/1909.02027v1)

## 관련 문서

- [[LLM-Decision-Models|결정 모델 (묶음 인덱스)]]
- [[LLM-Decision-Models-Mechanics|정의와 동작 원리]]
- [[LLM-Decision-Models-Use-Cases|활용 예시]]
- [[LLM-Model-Tiers|LLM 모델 티어 선택, 라우팅]] — 확신이 낮은 요청만 상위 티어로 넘기는 에스컬레이션
- [[Eval-LLM-Judge|LLM 판정기]] — 다른 모델과의 일치율과 사람 라벨 교정
- [[Eval-Golden-Set-and-Deploy-Gates|골든셋과 배포 관문]] — 라벨 세트와 회귀 관문
- [[LLM-Application-Security|LLM 애플리케이션 보안]] — 프롬프트 인젝션과 가드 모델 우회
