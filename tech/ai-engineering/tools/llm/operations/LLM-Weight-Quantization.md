---
tags: [ai, llm, quantization, local-llm, inference, evaluation]
status: done
verified_at: 2026-11-25
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Weight Quantization", "가중치 양자화", "GGUF 양자화", "Bits per Weight", "Ternary Weights", "삼진 가중치", "NariQ", "Ternary Bonsai", "Unsloth Desktop"]
---

# LLM 가중치 양자화: 비트 수, 보정 데이터와 품질 평가

가중치 양자화는 학습이 끝난 모델의 가중치를 16비트보다 적은 비트로 저장해 파일 크기, 메모리와 디코드 때 읽는 바이트를 줄이는 대신 정확도를 일부 잃는 선택이다. 같은 비트 수라도 어떤 방식으로, 어떤 데이터에 맞춰 줄였는지에 따라 과제마다 잃는 정도가 다르다. 메모리 예산의 구성(가중치, KV 캐시, 활성값)은 [[LLM-Inference-Bottlenecks#로컬 추론의 용량과 지연을 따로 계산한다|로컬 추론의 용량 계산]]이 다루고, 이 문서는 양자화 방식, 보정 데이터, 품질을 재는 조건과 런타임 지원을 다룬다. 2026-11-25에 Qwen3.8-27B를 줄인 두 사례(NariQ 논문과 모델 카드, PrismML의 Ternary Bonsai 2.5 27B 모델 카드와 백서)와 Unsloth 공식 문서를 대조한 기준이며, 점수와 속도는 모두 공급자 측정이다.

## 비트 수는 파일 기준으로 다시 센다

- **bpw**: 가중치 하나에 드는 평균 비트(bits per weight)다. 그룹마다 두는 스케일, 고정밀로 남긴 텐서와 메타데이터까지 넣으면 형식 이름의 숫자와 달라진다. PrismML은 파일 크기를 언어 모델 파라미터 26.9B로 나눠 bpw를 정의했고, 그 기준으로 이름에 2가 붙은 기존 IQ2 계열 GGUF는 2.27~2.75bpw였다.
- **같은 모델의 크기 폭(Qwen3.8-27B)**: BF16 53.8GB, Unsloth UD-Q4_K_XL 약 18GB(입문 가이드 표기), NariQ 3.0bpw 10.12GB, 2.5bpw 8.44GB, 2.0bpw 6.75GB, Ternary Bonsai 2.5 5.93GB(1.76bpw)다. 이미지 입력용 비전 투영기는 별도 파일이다(NariQ의 BF16 투영기 0.93GB).
- **삼진 가중치**: 가중치를 {-1, 0, +1} 가운데 하나로 두고 128개마다 FP16 스케일 하나를 공유한다(ternary g128). 삼진 값의 정보량 log2(3) ≈ 1.585비트에 스케일 몫 16/128 = 0.125비트를 더하면 약 1.71비트이고, 파일 기준 1.76bpw는 저장 방식과 나머지 텐서를 포함한 값이다(이 문서의 계산).
- **회전과 부호화**: 두 사례 모두 Hadamard 회전으로 가중치 분포를 고른 뒤 양자화한다. Bonsai는 블록 단위 Hadamard 회전을 가중치에 미리 접어 두고 런타임이 활성값에 맞는 변환을 건다. NariQ는 무작위 Hadamard 블록으로 회전한 행렬을 QTIP 방식의 트렐리스 부호로 양자화하고, 코드북을 트렐리스 상태에서 계산해 행렬 곱 안에서 복호한다.

## 메모리는 파일 크기보다 크다: 문맥 길이를 먼저 정한다

- **문맥이 메모리를 정한다**: NariQ 3.0bpw 파일은 10.12GB지만 KV 캐시와 활성값을 BF16으로 두므로 최대 문맥 262K에서는 약 30GB(2.5bpw 28GB, 2.0bpw 27GB)가 든다. 24GB GPU에는 문맥이 약 135K(3.0bpw), 160K(2.5bpw), 184K(2.0bpw)까지 들어간다고 모델 카드가 안내한다.
- **입문 설정 사례(2026-11-22)**: GPU 판매 업체 GPU Partner의 Windows 입문 가이드는 Unsloth Desktop에서 VRAM에 맞는 양자화 모델을 내려받고 문맥 크기를 정한 뒤 집 안 기기와 공유하는 순서를 안내한다. RTX 5090(32GB)에서 Qwen3.8-27B를 128K 문맥으로 쓰는 예로 계산기 수치(16비트 61.0GB, 8비트 36.7GB, 4비트 24.9GB, 2비트 18.9GB)를 보이고, 들어가는 가장 큰 모델 대신 4비트 UD-Q4_K_XL을 골라 문맥에 메모리를 남겼다.
- **가이드의 VRAM 구간별 권장**: 8~12GB에 9B~12B급 Q4와 문맥 8K~16K, 16GB에 14B급 모델과 MoE 모델(토큰마다 일부 전문가만 계산하므로 나머지를 시스템 RAM에 둘 수 있다) Q4~Q5와 16K~32K, 24GB에 27B~31B급 Q4와 16K~32K, 32GB 이상에 UD-Q4_K_XL이나 Q6_K와 64K~128K 이상이다. 하드웨어를 파는 쪽의 권장이므로 자기 문맥 길이와 속도로 다시 잰다.
- **가이드의 수치도 발표와 대조한다**: 같은 가이드는 Inkling 2 Mini를 활성 5.4B MoE로 적지만, 이는 반복 층의 재통과까지 센 값이고 발표의 활성 파라미터는 3.4B다([[Model-Release-Claims#파라미터 수는 무엇을 셌는지 확인한다|파라미터 수의 기준]]).

실행기마다 기본 문맥 길이가 따로 정해져 있으므로([[LLM-Wiki-Knowledge-Compilation#로컬 모델로 위키를 만들 때|Ollama의 VRAM별 기본값]]) 실제 적용값을 확인한다.

## 보정 데이터는 쓸 과제와 맞춘다

사후 양자화(PTQ)는 모델을 다시 학습하지 않고, 보정 데이터에서 잰 오차가 작아지도록 비트 배치와 반올림을 정한다. 보정과 평가가 짧은 텍스트에 머물면 긴 작업에서 생기는 손실이 드러나지 않는다.

- **드러난 차이**: NariQ 논문은 기존 저비트 방법 다수가 짧은 웹 텍스트로 보정하고 perplexity와 짧은 벤치마크로 평가한다고 지적한다. Qwen3.8-27B의 3bpw 이하 공개 양자화는 AIME에서 BF16과 비슷했지만, Unsloth가 자기 하네스로 공개한 DeepSWE 결과에서는 BF16이 푼 과제의 최대 72%만 풀었다(UD-Q2_K_XL 72%, GSQ-RCO IQ3_XXS 63%, UD-IQ2_S 54%).
- **NariQ의 보정**: 오픈소스 소프트웨어 과제를 푼 BF16 모델 자신의 에이전트 세션 기록을 보정 데이터로 썼다. 저장소 단위로 보정, 개발, 예비 세트를 나누고 DeepSWE와 겹치는 저장소는 뺐다. 손실은 모델이 쓴 토큰에서만 세지만 도구 출력까지 포함한 앞 문맥은 두 모델이 모두 본다. 스케일 조정에는 코딩 기록과 일반 프롬프트(수학, 과학, 대화, 코드, 긴 문서)에 대한 BF16 응답을 70:30으로 섞었다. 2.0bpw에서 코딩 기록만 쓰면 AIME가 77.3%, 일반 데이터를 섞으면 86.0%였다.
- **비트 배치**: 모듈마다 기울기로 추정한 손실 증가를 보고 비트 폭을 고르는 배낭 문제로 풀었다(전역 최적은 보장하지 않는다). 1비트 추정이 맞지 않아 선형 층은 모두 2비트 이상으로 두었고, 출력 층은 예측 확률 순으로 16개 띠로 나눠 따로 배정했다.
- **아직 없는 비교**: 같은 방법에서 보정 데이터만 웹 텍스트와 에이전트 기록으로 바꾼 직접 비교는 논문에 없다. 72%는 다른 방법, 다른 하네스의 결과와 비교한 차이다. 같은 GSQ-RCO IQ3_XXS를 PrismML은 자기 하네스에서 DeepSWE 27.0, FP16 30.1(점수 비 약 90%)로 적어, Unsloth 하네스의 63%(BF16이 푼 과제 가운데 푼 비율)와 지표도 하네스도 다르다. 저비트 양자화의 손실 폭은 한 하네스의 값으로 일반화하지 않는다.

## 형식과 학습 결과를 나눠 읽는다

Ternary Bonsai 2 27B와 2.5 27B는 형식(ternary g128, 5.93GB)이 같은데 에이전트 점수가 크게 다르다. 형식이 아니라 가중치를 만든 과정이 바뀐 것이고, 공개 자료(모델 카드와 두 백서)는 그 과정이 양자화를 고려한 학습인지 사후 양자화인지 설명하지 않는다(이 문서의 해석).

| 평가(PrismML 측정) | FP16 원본 | Bonsai 2 | Bonsai 2.5 |
|---|---|---|---|
| 에이전트 코딩 평균(Terminal-Bench 2.1, SWE-bench Verified, DeepSWE) | 60.5 | 37.9 | 54.2 |
| DeepSWE | 30.1 | 0.0 | 27.0 |
| 도구 호출 평균(τ2, τ3, BFCL v3, v4, AppWorld) | 77.7 | 67.0 | 77.2 |
| AppWorld | 93.2 | 51.2 | 90.5 |
| LiveCodeBench v6 | 87.6 | 83.8 | 83.0 |

- **다른 점수가 예고하지 않는 실패**: Bonsai 2.5보다 1.4배 큰 GSQ-RCO IQ2_XS(2.5bpw)는 τ2-Bench 79.5로 원본(80.6)에 가까웠지만 AppWorld는 46.5였다. 약 다섯 과제 중 하나에서 모든 API 호출을 추측한 긴 스크립트를 쓰고 출력을 보기 전에 완료를 선언했다. 압축 손실은 능력마다 다르게 나타나므로 장기 에이전트 과제를 따로 잰다([[Task-Specific-Small-Models#압축은 능력마다 다르게 깨진다|압축은 능력마다 다르게 깨진다]]).
- **과한 사고와 반복 루프의 감소**: 발표 글이 2.5의 개선점으로 내세우지만 백서에는 이를 잰 수치가 없다.
- **같은 백서 안의 다른 값**: 일반 능력 다섯 범주 평균을 요약 문장은 82.3 대 84.4로, 표는 82.12 대 84.32로 적는다.

## 같은 하네스로 잰 원본과만 비교한다

같은 Qwen3.8-27B 원본도 하네스와 설정이 다르면 점수가 크게 달랐다.

| 원본 점수 | NariQ 모델 카드(Claude Code CLI 2.1.309, 사고 켬, effort max, 세 차례) | PrismML 백서(mini-SWE-agent 또는 Terminus-2, xhigh, 한 번 시도) |
|---|---|---|
| DeepSWE v1.1 | 39.8 | 30.1 |
| Terminal-Bench 2.1 | 62.6 | 70.8 |

- **비교 규칙(적용 제안)**: 양자화 손실은 같은 하네스로 잰 원본 대비로만 읽고, 두 공급자의 양자화 모델 점수(NariQ 3.0bpw DeepSWE 41.0, Bonsai 2.5 27.0)를 서로 비교하지 않는다.
- **차이가 잡음보다 큰가**: NariQ 논문은 원본 대비 과제별 짝 차이와 표준 오차를 낸다. DeepSWE 부분 점수(과제의 새 테스트 통과 비율 평균)에서 3.0bpw +1.9(표준 오차 3.2), 2.5bpw +1.5(3.6), 2.0bpw −7.3(3.3), Terminal-Bench에서 3.0bpw +1.2(3.5), 2.5bpw −2.4(3.2), 2.0bpw −10.2(3.5)였다. 3비트가 원본보다 1~2점 높다는 것은 개선이 아니라 차이를 가를 수 없다는 뜻이고, 2.0bpw의 하락은 오차보다 크다. 논문은 DeepSWE를 과제당 한 번 시도로, 모델 카드는 세 차례 실행으로 적어 같은 비교의 수치가 자료마다 다르다(논문의 완전 해결 과제 수는 113개 중 원본 44, 3.0bpw 47, 2.0bpw 33).
- **짧은 과제는 덜 깨진다**: 모델 카드에서 2.0bpw는 DeepSWE 28.6(원본 39.8)과 AIME 86.0(97.7)으로 크게 떨어졌지만 다국어 수학 MGSM은 90.6(94.0)으로 하락이 작았다.

## 런타임 지원과 기본값을 먼저 확인한다

- **새 텐서 형식은 포크가 필요하다**: NariQ 파일은 저자들의 llama.cpp 포크로만 읽고, 2026-11-25 기준 기본 llama.cpp, Ollama와 LM Studio는 읽지 못한다. 포크는 SM120 세대에 맞춰져 Ampere, Ada, Hopper와 Apple M 시리즈에서는 같은 크기의 일반 GGUF보다 느리고, Ampere 이전 GPU는 CPU로 넘어가며 Intel GPU는 지원하지 않는다. AMD GPU(Linux ROCm)와 Apple M 시리즈(Metal)는 실험적 지원이고 GeForce 카드는 시험하지 않았다고 적는다(2026-11-25 모델 카드 기준, 시험한 GPU는 RTX PRO 6000, H100, L4, A10).
- **조용히 깨지는 조합**: Bonsai의 PTQ1_0과 PQ2_0 묶음은 PrismML 포크가 필요하고(PTQ1_0은 upstream 검토 중), Q2_0 묶음은 기본 llama.cpp b11556 이상에서 돈다. 그보다 오래된 기본 빌드는 Q2_0을 경고 없이 읽고 의미 없는 출력을 낸다. 런타임 빌드 번호를 기록하고 첫 실행 뒤 출력을 확인한다.
- **샘플링 기본값**: llama.cpp의 기본 `min_p`는 0.05라 권장값 0을 쓰려면 명시해야 한다. Bonsai는 추론 강도 `low`를 지원하지 않아 골라도 `xhigh`에 가깝게 동작한다. 지원 값은 `xhigh`(기본)와 `medium`이다.
- **속도는 측정 조건을 붙인다**: NariQ는 RTX PRO 6000, 문맥 4K에서 3.0bpw 88.9, 2.0bpw 111.7토큰/초를, Bonsai는 RTX 4090에서 MTP 초안 헤드를 끄면 111, 켜면 204토큰/초를 적는다(같은 표의 값, PrismML 포크가 필요한 PTQ1_0 파일 기준). 합성 토큰으로 잰 일반 디코딩 표의 112와는 측정 방식이 달라 카드도 서로 견주지 말라고 적는다. 장비, 문맥과 런타임이 달라 서로 비교하지 않는다.

## 집 안 공유 서버의 노출 범위

입문 가이드는 원격 비밀번호를 정하고 LAN 접근을 켜 주소를 공유하면 가족이 같은 네트워크의 브라우저로 쓸 수 있고, 그동안 호스트 PC가 켜져 있어야 한다고 안내한다. Unsloth 공식 문서(2026-11-25 확인)는 다음 조건을 더한다.

- LAN 연결은 암호화하지 않은 HTTP라 같은 네트워크 구간의 누구나 내용을 읽을 수 있고, 네트워크의 모든 기기가 서버를 본다. 관리하지 않는 네트워크에서는 HTTPS인 원격 접근(Cloudflare 터널)을 권한다.
- 웹 검색, Python과 터미널 실행 도구가 기본으로 켜져 있고 호스트 사용자 권한으로 돈다. 서버를 노출할 때는 `--disable-tools`를 주고 API 키를 지키라고 안내한다.
- 모든 인터페이스에 바인딩하면 포트가 인터넷에서 닿는지 외부 서비스(ifconfig.me, check-host.net)로 검사한다.

적용하면(운영 제안) 가족 공유라도 도구 실행을 끄고, 공유기에 그 포트의 포워딩이 없는지 확인한다. 대화 기록은 호스트에 남으므로 누가 무엇을 볼 수 있는지 먼저 정한다.

## 점검 체크포인트

- 파일 크기가 아니라 목표 문맥 길이를 포함한 최대 메모리로 비트 수를 골랐는가.
- 자기 업무와 가까운 긴 과제에서, 같은 하네스로 원본과 양자화본을 반복 실행해 차이와 표준 오차를 함께 봤는가.
- 짧은 벤치마크가 유지돼도 장기 에이전트 과제와 도구 사용을 따로 쟀는가.
- 런타임 빌드, 포크 여부, 샘플링 기본값과 추론 강도를 결과와 함께 기록했는가.
- 라이선스(NariQ는 원본을 따르는 Apache-2.0, Bonsai 2.5는 Apache 2.0)와 비전 투영기 같은 부속 파일을 확인했는가.

## 출처

- [NariQ: Sub-3-Bit Quantization for Long-Horizon Agentic Tasks — arXiv, Doyeob Kim](https://arxiv.org/abs/2611.26157) — v1 2026-11-19 제출. 2026-11-25 초록과 HTML 본문의 트렐리스 부호화, 보정 데이터 구성과 70:30 혼합, 비트 배치, 기존 양자화의 DeepSWE 비율, 짝 차이와 표준 오차, 한계 대조
- [nari-labs/Qwen3.8-27B-NariQ-GGUF — Hugging Face, Nari Labs](https://huggingface.co/nari-labs/Qwen3.8-27B-NariQ-GGUF) — 2026-11-20 공개. 2026-11-25 파일 크기, 평가표와 평가 조건, 문맥별 메모리, 런타임 제약과 속도 확인
- [prism-ml/Ternary-Bonsai-2.5-27B-GGUF — Hugging Face, PrismML](https://huggingface.co/prism-ml/Ternary-Bonsai-2.5-27B-GGUF) — 2026-11-25 삼진 g128 형식과 회전, 묶음별 런타임 조건, 샘플링 권장값, 추론 강도 제한, 속도 확인
- [Ternary Bonsai 2.5 27B whitepaper — PrismML](https://github.com/PrismML-Eng/Bonsai-demo/blob/main/bonsai-2-5-27b-whitepaper.pdf) — 2026-11 게시. 2026-11-25 Table 2~4의 도구 호출, 에이전트 코딩, 일반 능력 점수, bpw 정의, 부록 A의 평가 조건과 한계 대조
- [Ternary Bonsai 2 27B whitepaper — PrismML](https://github.com/PrismML-Eng/Bonsai-demo/blob/main/bonsai-2-27b-whitepaper.pdf) — 2026-11-25 학습 과정 설명이 없음을 확인
- [Introducing Ternary Bonsai 2.5 27B — PrismML](https://prismml.com/news/bonsai-2-5-27b) — 2026-11-24 발표. 개선 항목과 벤치마크 표 확인
- [Unsloth, LAN access](https://unsloth.ai/docs/basics/lan) — 2026-11-25 LAN 활성화, 암호화 없는 HTTP, 기본 도구와 `--disable-tools`, 포트 노출 검사 확인
- [A beginner's guide to Local AI with Inkling, Qwen, and Unsloth — GPU Partner, Jerry James](https://www.gpupartner.com/blog/beginners-guide-local-ai-inkling-qwen-unsloth) — 2026-11-22 게시. 설치 순서, VRAM 구간별 권장과 128K 메모리 계산, LAN 공유 절차 확인. 하드웨어 판매사의 글이다
- [Inkling, Qwen, Unsloth로 시작하는 로컬 AI 입문 가이드 — GeekNews](https://news.hada.io/topic?id=37670) — 학습 계기
- [NariQ: BF16 수준의 Qwen3.8-27B를 10GB 파일에 담다 — GeekNews](https://news.hada.io/topic?id=37749) — 학습 계기
- [Ternary Bonsai 2.5 27B - 5.9GB 크기를 유지하며 에이전트 코딩을 강화한 로컬 AI 모델 — GeekNews](https://news.hada.io/topic?id=37796) — 학습 계기

## 관련 문서

- [[LLM-Operations|LLM 선택, 서빙과 운영]]
- [[LLM-Inference-Bottlenecks|LLM 추론 병목]] — 가중치 하한, KV 캐시와 오프로딩
- [[Local-Inference-Deployment-Cases#Saluki: 양자화 크기와 도구 호출 평가를 나누어 읽는다|Saluki의 양자화 크기와 도구 호출 평가]] — 같은 원본의 2비트 계열 사례
- [[Local-AI-Hardware-Lifecycle|로컬 AI 장비의 수명]] — 장비 구매와 모델 크기의 기한
- [[Task-Specific-Small-Models|작은 특화 모델]] — 압축 뒤 따로 깨지는 능력
- [[Model-Release-Claims|모델 발표 수치 읽기]] — 측정 주체와 비교 조건
- [[LLM-Generation-Mechanics-Training#LoRA와 QLoRA: 바꾸는 파라미터와 저장 정밀도|LoRA와 QLoRA]] — 저장 정밀도와 연산 정밀도
