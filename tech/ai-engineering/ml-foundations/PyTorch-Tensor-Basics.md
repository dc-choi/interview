---
tags: [ai, deep-learning, pytorch, tensor, broadcasting, learning]
status: done
verified_at: 2026-11-18
category: "AI엔지니어링(AIEngineering)"
aliases: ["PyTorch 텐서", "PyTorch Tensor Basics", "텐서", "Tensor", "텐서 shape과 dim", "브로드캐스팅", "Broadcasting"]
---

# PyTorch 텐서: shape, dim과 기본 연산

텐서(tensor)는 숫자를 하나 이상의 축으로 늘어놓은 격자다. 축이 하나면 벡터, 둘이면 표(행렬)이고 셋 이상도 된다. 각 축을 차원(dim)이라 하며 0부터 센다. `shape`은 축마다 원소가 몇 개인지를 나열한다. 모델의 입력, 가중치, 예측과 손실이 모두 텐서라서 shape과 dim을 잘못 읽으면 오류가 나거나, 오류 없이 엉뚱한 값을 계산한다. 텐서로 모델을 학습하는 절차는 [[PyTorch-Training-Loop|PyTorch 학습 루프]]에 있다.

아래는 PyTorch 2.15 문서와 2.14.0 로컬 실행으로 확인한 동작이다. 예시의 `sales`는 매장 3곳의 12개월 매출을 담은 실수 텐서로 shape이 `(3, 12)`다. dim 0은 매장 3개를, dim 1은 달 12개를 따라간다.

## 만들기

| 함수 | 결과 | 주의 |
|---|---|---|
| `torch.tensor(rows)` | 중첩 리스트를 같은 모양의 텐서로 바꾼다 | dtype은 데이터에서 추론한다. 정수 리스트는 `int64`, 실수 리스트는 기본 실수 dtype(`float32`)이 된다 |
| `torch.zeros(2, 3)`, `torch.ones(2, 3)` | shape `(2, 3)`을 0이나 1로 채운다 | 인자가 곧 shape이다 |
| `torch.full((2, 3), 7.0)` | shape을 튜플 하나로 받아 값을 채운다 | dtype은 채울 값에서 추론한다 |
| `torch.eye(3)` | 대각선이 1이고 나머지가 0인 2차원 텐서 | |
| `torch.rand(2, 3)` | `[0, 1)` 균등분포 난수 | |
| `torch.randn(2, 3)` | 평균 0, 분산 1인 정규분포 난수 | |
| `torch.arange(12)` | 0부터 11까지 | Python `range`처럼 끝 값은 빠진다. 인자가 모두 정수면 `int64`다 |

`mean`은 실수나 복소수 텐서에만 동작한다. `torch.arange(12).mean()`은 dtype 오류를 내므로 `torch.arange(12.0)`이나 `.float()`로 실수 텐서를 만든다.

## 고르기

- 정수 인덱스는 그 축을 없앤다. `sales[0]`은 첫 매장의 12개월로 shape이 `(12,)`다.
- 대괄호 안의 쉼표가 축을 나누고, `:` 하나는 그 축 전체다. `sales[:, 6]`은 모든 매장의 일곱 번째 달로 `(3,)`이다.
- 슬라이스는 축을 남긴다. `sales[:, :3]`은 `(3, 3)`, `sales[0:1]`은 `(1, 12)`다.
- 비교 연산은 같은 shape의 bool 텐서(마스크)를 낸다. `sales[sales > 30]`은 조건을 만족하는 원소만 모은 1차원 텐서다.
- `torch.where(cond, a, b)`는 칸마다 조건이 참이면 `a`, 거짓이면 `b`를 고른다. 세 인자는 broadcast 가능해야 하고 `a`, `b`에는 스칼라도 된다. 상한만 자를 때는 `sales.clamp(max=30.0)`이 같은 결과를 낸다.
- `gather(dim, index)`는 `index`가 가리키는 칸을 골라 `index`와 같은 shape으로 낸다. 입력과 `index`는 차원 수가 같아야 하고 서로 broadcast되지 않는다.

정수와 슬라이스로 고르는 기본 인덱싱은 원본과 저장 공간을 공유하는 view를, bool 마스크나 정수 텐서로 고르는 고급 인덱싱은 복사본을 돌려준다(NumPy와 같은 규칙). 그래서 슬라이스 결과를 고치면 원본도 바뀌고, 마스크로 꺼낸 결과를 고쳐도 원본은 그대로다. `sales[sales > 30] = 30.0`처럼 인덱스에 대입하면 두 방식 모두 원본을 바꾼다.

## 집계와 dim 규칙

`mean`, `sum`, `max`, `argmax`에 넘긴 dim은 집계되어 사라진다.

| 호출 | 결과 shape | 뜻 |
|---|---|---|
| `sales.mean(dim=0)` | `(12,)` | 매장 축이 사라져 달별 평균이 남는다 |
| `sales.mean(dim=1)` | `(3,)` | 달 축이 사라져 매장별 평균이 남는다 |
| `sales.mean(dim=1, keepdim=True)` | `(3, 1)` | 사라질 축을 크기 1로 남긴다 |
| `sales.max(dim=1)` | `values`, `indices` 모두 `(3,)` | 매장별 최댓값과 그 달의 위치 |
| `sales.max()` | `()` | dim이 없으면 전체에서 값 하나 |
| `sales.topk(3, dim=1)` | `(3, 3)` | 축을 없애지 않고 길이를 3으로 줄인다 |

- `max(dim)`과 `topk`는 값(`values`)과 위치(`indices`)를 담은 namedtuple을 돌려준다. `argmax(dim)`은 위치만 낸다.
- `keepdim=True`는 집계 결과를 원본과 다시 연산할 때 쓴다. `sales - sales.mean(dim=1, keepdim=True)`는 `(3, 12)`와 `(3, 1)`의 연산이라 매장마다 자기 평균을 뺀다.
- `topk`는 기본으로 큰 값부터 정렬해 돌려준다. 같은 값끼리의 위치 순서는 호출마다 같다는 보장이 없다.

## 모양 바꾸기

| 연산 | 동작 | 주의 |
|---|---|---|
| `reshape(3, 4, 3)` | 원소 순서를 유지한 채 축을 다시 나눈다 | 가능하면 view, 아니면 복사본이다. 어느 쪽인지에 기대지 않는다 |
| `view(...)` | 같은 데이터를 다른 shape으로 읽는다 | stride가 맞지 않으면(전치한 텐서 등) 오류가 난다. 그때는 `reshape`를 쓴다 |
| `flatten()` | 1차원으로 편다 | 원소 순서는 그대로라 첫 매장의 12개월 다음에 둘째 매장이 온다 |
| `.T`, `transpose(0, 1)` | 두 축을 바꾼다 | `.T`는 2차원에만 쓴다. 다른 차원에서는 deprecated 경고가 나며, 행렬 묶음의 전치는 `mT`를 쓴다 |
| `permute(2, 0, 1)` | 축 순서를 바꾼다 | 데이터를 옮기지 않는 view다 |
| `unsqueeze(1)`, `x[:, None]` | 지정한 위치에 크기 1인 축을 넣는다 | `(N,)`을 `(N, 1)`로 만든다 |
| `squeeze(1)` | 크기 1인 축을 뺀다 | dim을 주면 그 축만 뺀다 |

`sales.reshape(3, 4, 3)`은 매장, 분기, 분기 안의 달로 나눈 텐서이고, 이어서 `.mean(dim=2)`를 하면 매장별 분기 평균 `(3, 4)`가 남는다.

## 붙이기

- `torch.stack([a, b], dim=1)`은 새 축을 만들어 쌓는다. 길이 36인 1차원 텐서 둘이면 `(36, 2)`, 곧 행마다 (입력, 정답) 쌍이 된다. 모든 텐서의 shape이 같아야 한다.
- `torch.cat([a, b])`는 기존 축을 따라 잇는다. 같은 두 텐서면 `(72,)`다. 잇는 축 말고는 shape이 같아야 한다.

## 곱셈과 broadcasting

- `*`는 같은 위치의 원소끼리 곱한다. `@`는 행렬곱(`torch.matmul`)이라 `(2, 3) @ (3, 2)`는 `(2, 2)`다.
- 두 shape을 뒤쪽 축부터 맞춰 보며 축마다 크기가 같거나, 한쪽이 1이거나, 한쪽에 그 축이 없으면 broadcast할 수 있다. 결과 크기는 축마다 큰 쪽을 따르고, 데이터를 복사하지 않고 늘린 것처럼 계산한다.
- 가중치 `w`와 bias `b`가 원소 하나짜리 텐서이면 `w * x + b`는 `x`의 원소 N개 모두에 같은 `w`와 `b`를 적용해 예측 N개를 낸다.
- `sales - sales[:, 0]`은 `(3, 12)`와 `(3,)`의 마지막 축이 12와 3으로 달라 오류가 난다. `sales[:, 0:1]`로 `(3, 1)`을 만들면 매장마다 첫 달 값을 뺀다.

오류가 나지 않는 broadcasting이 더 위험하다. 예측이 `(N, 1)`이고 정답이 `(N,)`이면 `pred - y`는 `(N, N)`이 되어 모든 예측과 모든 정답의 차를 계산한다. `nn.MSELoss`는 이때 크기가 다르다는 경고만 내고 손실을 그대로 계산하므로, 손실을 구하기 전에 두 shape을 맞춘다.

## 이해 확인

1. `(3, 12)` 텐서 `x`에서 `x.max(dim=0).values`, `x.max(dim=1).values`, `x.max()`, `x.topk(3, dim=1).values`의 shape과 뜻을 말한다.
2. `x[:, 0]`과 `x[:, 0:1]`의 shape 차이를 말하고, 둘을 `x`에서 뺄 때 결과가 다른 이유를 broadcasting 규칙으로 설명한다.
3. 전치한 텐서에 `view(-1)`은 실패하고 `reshape(-1)`은 동작하는 이유를 설명한다.
4. 슬라이스로 꺼낸 값을 고치면 원본이 바뀌고 마스크로 꺼낸 값을 고치면 바뀌지 않는 이유를 설명한다.
5. 예측 `(N, 1)`과 정답 `(N,)`으로 평균 제곱 오차를 구하면 어떤 값이 계산되는지 설명한다.

## 출처

- [YouTube, Zachary Huang, Give me 31 minutes, I will make PyTorch click forever](https://www.youtube.com/watch?v=K1ksiPHfgVs) — 2026-10-13 공개. 2026-11-18 로컬 음성 인식 전사로 텐서 생성, 인덱싱과 마스크, 집계의 dim 규칙, 모양 변환과 결합 부분을 확인했다. 화면의 코드와 예제 데이터는 전사에 없어 옮기지 않았고, 예시는 아래 문서와 PyTorch 2.14.0 로컬 실행으로 새로 만들었다.
- [PyTorch, Broadcasting semantics](https://docs.pytorch.org/docs/2.15/notes/broadcasting.html) — 2.15 문서. broadcast 가능 조건과 결과 크기.
- [PyTorch, Tensor Views](https://docs.pytorch.org/docs/2.15/tensor_view.html) — 2.15 문서. view 연산 목록, 기본 인덱싱은 view이고 고급 인덱싱은 복사라는 규칙, `reshape`와 `flatten`의 view 여부.
- [PyTorch, torch.Tensor](https://docs.pytorch.org/docs/2.15/tensors.html), [torch.Tensor.view](https://docs.pytorch.org/docs/2.15/generated/torch.Tensor.view.html), [torch.reshape](https://docs.pytorch.org/docs/2.15/generated/torch.reshape.html) — 2.15 문서. `Tensor.T`의 정의와 2차원 외 사용의 deprecated 경고, view 가능 조건.
- [PyTorch, torch.mean](https://docs.pytorch.org/docs/2.15/generated/torch.mean.html), [torch.max](https://docs.pytorch.org/docs/2.15/generated/torch.max.html), [torch.topk](https://docs.pytorch.org/docs/2.15/generated/torch.topk.html) — 2.15 문서. 실수 입력 조건, `keepdim` 기본값, (values, indices) 반환과 동률의 순서.
- [PyTorch, torch.stack](https://docs.pytorch.org/docs/2.15/generated/torch.stack.html), [torch.cat](https://docs.pytorch.org/docs/2.15/generated/torch.cat.html), [torch.where](https://docs.pytorch.org/docs/2.15/generated/torch.where.html), [torch.gather](https://docs.pytorch.org/docs/2.15/generated/torch.gather.html) — 2.15 문서. 새 축과 기존 축의 결합, 조건 선택의 broadcast 조건, gather의 차원 조건.
- [PyTorch, torch.tensor](https://docs.pytorch.org/docs/2.15/generated/torch.tensor.html), [torch.arange](https://docs.pytorch.org/docs/2.15/generated/torch.arange.html), [torch.full](https://docs.pytorch.org/docs/2.15/generated/torch.full.html), [torch.rand](https://docs.pytorch.org/docs/2.15/generated/torch.rand.html), [torch.randn](https://docs.pytorch.org/docs/2.15/generated/torch.randn.html) — 2.15 문서. 생성 함수의 값 범위와 dtype 추론.

## 관련 문서

- [[ml-foundations|머신러닝 기초]]
- [[PyTorch-Training-Loop|PyTorch 학습 루프]]
- [[Neural-Network-Fundamentals|신경망 기초]]
- [[Convolutional-Neural-Networks|합성곱 신경망]]
