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

## 공개 모델의 하이브리드 층 배치

최근 공개 모델은 모든 층을 선형 어텐션으로 채우지 않고 일부 층에 전체 어텐션을 남기는 하이브리드 구성을 쓴다. 다음은 2026-10-27 모델 카드 대조 기준의 사례다.

- **층 비율**: Raon-1 mini preview(크래프톤, 2026-10-21 공개)는 25개 층 가운데 18개를 선형 어텐션인 Raon Delta Attention(RDA), 7개를 전체 어텐션(Gated MLA)으로 둔다. 위치 인코딩을 쓰지 않는(NoPE) 구성이며 문맥은 262,144토큰까지 받는다.
- **갱신 규칙은 계열마다 다르다**: 모델 카드는 RDA를 Kimi Delta Attention의 지우기(erase) 게이트와 쓰기(write) 게이트를 분리한 변형으로 설명한다. 상태를 지우고 다시 쓰는 게이트형 갱신은 위의 단순 누적(`Sᵢ=Sᵢ₋₁+φ(kᵢ)vᵢᵀ`)과 다른 규칙이므로, 선형 어텐션이라는 이름만으로 같은 식이라고 보지 않는다.
- **KV 캐시는 전체 어텐션 층에만 남는다**: Raon-1 mini preview의 KV 캐시는 MLA 층 7개에만 있어 BF16에서 토큰당 약 8KiB다. 선형 어텐션 층은 길이와 무관한 크기의 상태를 갖는다. 긴 문맥의 메모리 예산은 전체 어텐션 층의 수와 그 층의 KV 형식으로 계산한다([[LLM-Inference-Bottlenecks|LLM 추론 병목]]).
- **같은 방향의 다른 구성**: GLM-5.3-Flash 모델 카드는 sparse attention과 linear attention을 결합한 하이브리드 어텐션을 GLM 계열에서 처음 적용했다고 적는다. 층 배치 비율은 이 문서에서 확인하지 않았다.

하이브리드 구성의 품질과 속도는 모델 전체의 결과이며, 선형 어텐션 층 비율만으로 긴 문맥 정확도를 예측하지 않는다. 공급사 평가표를 읽는 조건은 [[Model-Release-Claims|모델 발표 수치 읽기]]를 따른다.

## 이해 점검

1. 분모의 정규화가 제곱 복잡도로 돌아가지 않는 이유는 무엇인가?
2. 특징 차원을 늘리면 길이에 선형이어도 실제 비용이 커지는 이유는 무엇인가?
3. 하이브리드 모델에서 긴 문맥의 KV 캐시 크기를 정하는 층은 어느 쪽인가?

## 출처

- [Transformers are RNNs: Fast Autoregressive Transformers with Linear Attention — PMLR, Katharopoulos et al.](https://proceedings.mlr.press/v119/katharopoulos20a/katharopoulos20a.pdf) — 3.2~3.4절
- [KRAFTON/Raon-1-mini-preview — Hugging Face, KRAFTON](https://huggingface.co/KRAFTON/Raon-1-mini-preview) — 2026-10-27 층 구성, RDA 설명, KV 캐시 크기와 문맥 길이 확인
- [zai-org/GLM-5.3-Flash — Hugging Face, Z.ai](https://huggingface.co/zai-org/GLM-5.3-Flash) — 2026-10-27 하이브리드 어텐션 설명 확인
- [크래프톤, 자체 개발 30B급 고효율 LLM 'Raon-1 mini' 프리뷰 공개 — GeekNews](https://news.hada.io/topic?id=35752) — 학습 계기, 구조는 모델 카드로 대조

## 관련 문서

- [[LLM-Generation-Mechanics-Decoding|Q, K, V와 추론]]
- [[LLM-Inference-Bottlenecks|LLM 추론 병목]]
- [[Diffusion-Language-Models|확산 언어 모델]] — 생성 비용을 줄이는 다른 방향
- [[Model-Release-Claims|모델 발표 수치 읽기]] — 전체와 활성 파라미터, 공급사 평가표
