---
tags: [ai, llm, attention, linear-attention, inference]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Linear Attention", "선형 어텐션"]
---

# 선형 어텐션

선형 어텐션은 특징 맵과 행렬곱의 결합법칙으로 길이 N의 제곱에 비례하는 어텐션 계산을 줄인다. 여기서는 2020년 Linear Transformer의 커널 기반 구성을 다룬다.

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

## 이해 점검

1. 분모의 정규화가 제곱 복잡도로 돌아가지 않는 이유는 무엇인가?
2. 특징 차원을 늘리면 길이에 선형이어도 실제 비용이 커지는 이유는 무엇인가?

## 출처

- [Transformers are RNNs: Fast Autoregressive Transformers with Linear Attention — PMLR, Katharopoulos et al.](https://proceedings.mlr.press/v119/katharopoulos20a/katharopoulos20a.pdf) — 3.2~3.4절

## 관련 문서

- [[LLM-Generation-Mechanics-Decoding|Q, K, V와 추론]]
- [[LLM-Inference-Bottlenecks|LLM 추론 병목]]
