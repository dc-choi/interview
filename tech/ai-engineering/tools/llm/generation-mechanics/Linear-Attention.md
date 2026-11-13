---
tags: [ai, llm, attention, linear-attention, inference]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Linear Attention", "선형 어텐션"]
---

# 선형 어텐션

선형 어텐션은 특징 맵과 행렬곱의 결합법칙으로 길이 N의 제곱에 비례하는 어텐션 계산을 줄인다. 여기서는 2020년 Linear Transformer의 커널 기반 구성을 중심으로 다루고, 공개 모델의 하이브리드 층 배치를 사례로 붙인다.

## 계산 순서를 바꾸는 조건

일반적인 softmax 어텐션은 `softmax(QKᵀ / √d)V`다. softmax가 가운데 있으므로 이를 그대로 `Q(KᵀV)`로 바꿀 수 없다.

대신 유사도를 `φ(q)ᵀφ(k)`로 정의한다. φ는 공집합 기호가 아니라 특징 맵이다. 길이가 N, 특징 차원이 C, Value 차원이 M이면 중간 행렬은 N×N 대신 C×M이다.

$$
S=\sum_{j=1}^{N}\phi(k_j)v_j^T,\qquad z=\sum_{j=1}^{N}\phi(k_j)
$$

$$
y_i=\frac{\phi(q_i)^T S}{\phi(q_i)^T z}
$$

S와 z를 재사용하므로 **정규화 분모도 N×N 행렬 없이 계산**한다. 특징 맵 계산을 제외한 비용은 O(NCM)이며 C와 M이 고정일 때 N에 선형이다.

## 양수 가중치와 인과 마스크

- 유사도는 음수가 아니어야 하며 정규화 분모는 양수여야 한다. 원 논문의 `φ(x)=elu(x)+1`은 실수 연산에서 양수 특징을 만든다. 실제 구현은 반올림과 underflow에 따른 수치 안정성을 별도로 다룬다.
- 자기회귀 생성에서는 전체 합 대신 현재 위치까지 누적한다. `Sᵢ=Sᵢ₋₁+φ(kᵢ)vᵢᵀ`, `zᵢ=zᵢ₋₁+φ(kᵢ)`로 갱신해 미래 토큰을 제외한다.
- 고정 차원에서 이 추론 상태의 크기는 길이에 무관하다. 모델 전체 메모리나 학습 중 모든 활성값까지 상수라는 뜻은 아니다.

## 적용 한계

`elu+1` 구성은 softmax와 같은 출력을 보장하는 재배치가 아니라 유사도 함수를 바꾸는 설계다. 지수 커널의 정확한 특징 표현은 무한 차원이므로 유한 차원에서 같은 계산이라고 볼 수 없다. 효율성과 태스크 품질은 따로 평가한다.

### 고정 크기 기억에서 간섭이 생기는 이유

어텐션의 분모 정규화와 특징 맵을 잠시 뺀 교육용 외적 기억을 생각하면, 저장 공간과 회상 정확도의 차이를 볼 수 있다. 열벡터 키 `kᵢ`의 차원을 d, 값 `vᵢ`의 차원을 m으로 두면 기억 행렬은 `W=Σᵢ vᵢkᵢᵀ`이며 크기는 m×d다. 위의 S와 전치 방향이 다르다. 단위 길이 키 `kⱼ`로 읽으면 다음처럼 분리된다.

$$
Wk_j=v_j+\sum_{i\ne j}v_i(k_i^T k_j)
$$

첫 항은 목표 값이고 나머지는 다른 키와의 내적으로 섞이는 간섭이다. 키들이 서로 직교하면 간섭은 0이다. d차원에서 서로 직교하는 비영벡터는 최대 d개지만, 이를 실제 모델이 d개 토큰까지만 기억한다는 한도로 읽지 않는다. 회상 오류는 키 분포, 값의 관계와 갱신 규칙에도 달려 있다.

softmax 읽기는 질의와 각 키의 유사도 점수를 비선형 가중치로 바꾼다. 유일한 최대 점수가 정답 키에 있을 때 역온도를 높이면 그 항목에 집중하지만, 잘못된 키의 점수가 가장 크면 오답에도 더 집중한다. 고정 행렬에 합쳐 저장하는 비용과 각 키/값을 유지하는 비용을 함께 비교해야 한다.

학습 실험 제안: 직교 키와 서로 비슷한 키에서 위 식의 회상 오차를 비교하고, N과 d, 값 차원, 난수 시드와 역온도를 기록한다. 이 식은 간섭 설명용이며 게이트형 선형 어텐션의 품질이나 Transformer 전체의 성능 상한을 증명하지 않는다. 여기서는 영상의 수치 실험을 재현하지 않았다.

## 공개 모델의 하이브리드 층 배치

최근 공개 모델은 모든 층을 선형 어텐션으로 채우지 않고 일부 층에 전체 어텐션을 남기는 하이브리드 구성을 쓴다. 다음은 2026-10-27 모델 카드 대조 기준의 사례다.

- **층 비율**: Raon-1 mini preview(크래프톤, 2026-10-21 공개)는 25개 층 가운데 18개를 선형 어텐션인 Raon Delta Attention(RDA), 7개를 전체 어텐션(Gated MLA)으로 둔다. 위치 인코딩을 쓰지 않는(NoPE) 구성이며 문맥은 262,144토큰까지 받는다.
- **갱신 규칙은 계열마다 다르다**: 모델 카드는 RDA를 Kimi Delta Attention의 지우기(erase) 게이트와 쓰기(write) 게이트를 분리한 변형으로 설명한다. 상태를 지우고 다시 쓰는 게이트형 갱신은 위의 단순 누적(`Sᵢ=Sᵢ₋₁+φ(kᵢ)vᵢᵀ`)과 다른 규칙이므로, 선형 어텐션이라는 이름만으로 같은 식이라고 보지 않는다.
- **KV 캐시는 전체 어텐션 층에만 남는다**: Raon-1 mini preview의 KV 캐시는 MLA 층 7개에만 있어 BF16에서 토큰당 약 8KiB다. 선형 어텐션 층은 길이와 무관한 크기의 상태를 갖는다. 긴 문맥의 메모리 예산은 전체 어텐션 층의 수와 그 층의 KV 형식으로 계산한다([[LLM-Inference-Bottlenecks|LLM 추론 병목]]).
- **같은 방향의 다른 구성**: GLM-5.3-Flash 모델 카드는 sparse attention과 linear attention을 결합한 하이브리드 어텐션을 GLM 계열에서 처음 적용했다고 적는다. 층 배치 비율은 이 문서에서 확인하지 않았다.

하이브리드 구성의 품질과 속도는 모델 전체의 결과이며, 선형 어텐션 층 비율만으로 긴 문맥 정확도를 예측하지 않는다. 공급사 평가표를 읽는 조건은 [[Model-Release-Claims|모델 발표 수치 읽기]]를 따른다.

## 어텐션 없이 고정 이웃만 섞는 시도: Grassmann flow

선형 어텐션은 모든 위치의 정보를 고정 크기 상태로 모으는 쪽이다. 반대로 각 위치가 정해진 거리의 이웃 몇 개만 보게 해 길이에 선형인 비용을 얻는 시도도 있다. arXiv 2512.19428(Zhang Chong 단독 저자, 2025-12-22 v1, "Attention Is Not What You Need: Grassmann Flows as an Attention-Free Alternative for Sequence Modeling")이 그 예이며, 2026-11-13에 v1 본문을 대조했다.

- **구성**: self-attention 블록을 Causal Grassmann mixing 블록으로 바꾸고 L×L 어텐션 행렬과 softmax 가중치를 만들지 않는다. 은닉 상태(실험값 d=256)를 r=32차원으로 줄인 뒤, 위치 t를 오프셋 Δ(예: 1, 2, 4, 8, 12, 16)만큼 떨어진 위치와 짝짓는다. 두 벡터가 펼치는 2차원 부분공간을 Grassmann 다양체 Gr(2, r)의 점으로 보고 Plücker 좌표 C(r, 2)개(r=32면 496개)로 표현해 다시 d차원으로 투영하고 오프셋별로 평균낸다. 시그모이드 게이트가 원래 표현과 이 기하 특징의 비율을 정한다.
- **비용 주장**: r과 오프셋 수를 고정하면 층 비용이 O(Ld²)로 길이 L에 선형이라고 적는다. 다만 저자의 구현은 길이 256 이하에서 Transformer보다 느렸고 전용 커널이 없다고 밝힌다.
- **결과 규모**: Wikitext-2에서 약 13M 파라미터 6층 모델의 검증 perplexity는 275.7로 같은 크기급 Transformer(12.59M)의 248.4보다 약 11% 높았고, 12층 약 18M 모델은 261.1 대 235.2였다. 고정한 DistilBERT 위에 분류 head만 바꾼 SNLI에서는 테스트 정확도 0.8538로 Transformer head 0.8511보다 근소하게 높았고 저자도 차이가 작다고 적는다. 본문은 격차를 10~15%로 서술하고 6층 Transformer 값을 241.0~253.6으로 적지만, 표 1에는 248.4와 253.6만 있고 241.0은 없다.
- **인과성 의문**: 논문은 위치 t를 오른쪽(미래) 위치와만 짝짓는다고 쓰면서 이를 왼쪽에서 오른쪽으로의 언어 모델링과 일관된다고 설명한다. 식대로라면 위치 t의 표현이 t+1 이후 토큰 상태를 받으며, 출력 이동이나 마스킹 서술은 찾지 못했다. 다음 토큰 예측에서 정답 정보가 섞일 수 있는 구성으로 읽히므로(해석) 위 perplexity를 그대로 비교하기 어렵다. 논문은 코드 저장소를 링크하지 않아 구현으로 확인할 수 없다.
- **읽는 법**: 1,300만~1,800만 파라미터의 소규모 실험이고 저자도 최신 언어 모델과 경쟁할 결과가 아니라고 밝힌다. 어텐션 대체 가능성의 증거가 아니라 계산을 분석 가능한 기하 대상에 올린다는 아이디어의 초기 시도로 둔다. 독립 재현 결과는 공개 코드와 함께 다시 확인한다(이번에 확인하지 않음).

## 이해 점검

1. 분모의 정규화가 제곱 복잡도로 돌아가지 않는 이유는 무엇인가?
2. 특징 차원을 늘리면 길이에 선형이어도 실제 비용이 커지는 이유는 무엇인가?
3. 하이브리드 모델에서 긴 문맥의 KV 캐시 크기를 정하는 층은 어느 쪽인가?
4. 고정 이웃만 섞는 층이 인과 언어 모델에서 미래 위치를 참조하면 학습 지표에 어떤 문제가 생기는가?

## 출처

- [You could have invented transformers from memory — Alex Wang](https://alexwang.ai/posts/associative-memory/) — 2026-11-04 외적 기억의 회상 분해와 선택적 읽기 대조. 용량 수치를 실제 모델의 한도로 옮기지 않았다.
- [Transformers are RNNs: Fast Autoregressive Transformers with Linear Attention — PMLR, Katharopoulos et al.](https://proceedings.mlr.press/v119/katharopoulos20a/katharopoulos20a.pdf) — 3.2~3.4절
- [KRAFTON/Raon-1-mini-preview — Hugging Face, KRAFTON](https://huggingface.co/KRAFTON/Raon-1-mini-preview) — 2026-10-27 층 구성, RDA 설명, KV 캐시 크기와 문맥 길이 확인
- [zai-org/GLM-5.3-Flash — Hugging Face, Z.ai](https://huggingface.co/zai-org/GLM-5.3-Flash) — 2026-10-27 하이브리드 어텐션 설명 확인
- [Attention Is Not What You Need: Grassmann Flows as an Attention-Free Alternative for Sequence Modeling — arXiv, Zhang Chong](https://arxiv.org/abs/2512.19428) — 2026-11-13 v1 본문 대조, 3.2절 구성, 복잡도, Wikitext-2와 SNLI 결과, 한계
- [크래프톤, 자체 개발 30B급 고효율 LLM 'Raon-1 mini' 프리뷰 공개 — GeekNews](https://news.hada.io/topic?id=35752) — 학습 계기, 구조는 모델 카드로 대조

## 관련 문서

- [[LLM-Generation-Mechanics-Decoding|Q, K, V와 추론]]
- [[LLM-Inference-Bottlenecks|LLM 추론 병목]]
- [[Diffusion-Language-Models|확산 언어 모델]] — 생성 비용을 줄이는 다른 방향
- [[Model-Release-Claims|모델 발표 수치 읽기]] — 전체와 활성 파라미터, 공급사 평가표
