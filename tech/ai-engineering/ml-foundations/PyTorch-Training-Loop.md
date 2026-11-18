---
tags: [ai, deep-learning, pytorch, autograd, optimizer, training-loop, learning]
status: done
verified_at: 2026-11-18
category: "AI엔지니어링(AIEngineering)"
aliases: ["PyTorch 학습 루프", "PyTorch Training Loop", "autograd", "자동 미분", "Automatic Differentiation", "nn.Module", "PyTorch optimizer", "DataLoader"]
---

# PyTorch 학습 루프: autograd, nn.Module과 optimizer

PyTorch 학습 코드는 미니배치마다 예측, 손실 계산, 기울기 계산(`backward`), 파라미터 갱신(`step`), 기울기 비우기(`zero_grad`)의 다섯 줄을 되풀이한다. 각 줄이 무엇을 계산하고 어떤 상태를 바꾸는지 알면 학습이 멈추거나 발산할 때 어느 줄을 먼저 볼지 정할 수 있다. 경사 하강법과 역전파의 개념은 [[Neural-Network-Fundamentals|신경망 기초]], shape 규칙은 [[PyTorch-Tensor-Basics|PyTorch 텐서]]에 있다.

아래는 PyTorch 2.15 문서와 2.14.0 로컬 실행으로 확인한 동작이다.

## 다섯 줄과 바뀌는 상태

`y = 3x + 5`에서 뽑은 표본 36개로 직선을 학습하는 최소 루프다. 2.14.0에서 실행하면 가중치 약 3.0, bias 약 5.0에 도달한다.

```python
import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

torch.manual_seed(0)
x = torch.rand(36, 1)
y = 3 * x + 5
loader = DataLoader(TensorDataset(x, y), batch_size=12, shuffle=True)
model = nn.Linear(1, 1)
loss_fn = nn.MSELoss()
optimizer = torch.optim.SGD(model.parameters(), lr=0.1)

for epoch in range(300):
    for xb, yb in loader:
        pred = model(xb)          # 1. 예측
        loss = loss_fn(pred, yb)  # 2. 손실
        loss.backward()           # 3. 기울기를 .grad에 더한다
        optimizer.step()          # 4. .grad로 파라미터를 고친다
        optimizer.zero_grad()     # 5. 다음 배치를 위해 .grad를 비운다
```

| 줄 | 계산 | 바뀌는 상태 |
|---|---|---|
| `model(xb)` | `forward`를 실행한다. requires_grad인 파라미터가 관여한 연산은 계산과 동시에 그래프로 기록된다 | 새 계산 그래프 |
| `loss_fn(pred, yb)` | 예측과 정답을 스칼라 손실 하나로 줄인다 | 그래프의 끝 |
| `loss.backward()` | 그래프를 거꾸로 따라가며 연쇄 법칙으로 기울기를 구해 leaf의 `.grad`에 더한다 | `.grad` 누적, 그래프 해제 |
| `optimizer.step()` | `.grad`로 파라미터를 고친다 | 파라미터, momentum 같은 optimizer 상태 |
| `optimizer.zero_grad()` | `.grad`를 비운다. 기본은 0이 아니라 `None`으로 만든다 | `.grad` |

`zero_grad`는 다음 `backward` 전에 한 번 실행되면 반복의 처음에 둬도 된다. 공식 튜토리얼도 설명은 zero_grad, backward, step 순서로 하고 코드에서는 위처럼 마지막에 둔다.

## 손으로 계산하는 한 스텝

선형 회귀 `ŷ = w × x + b`를 평균 제곱 오차 `L = mean((ŷ − y)²)`로 학습하면 연쇄 법칙으로 `∂L/∂w = mean(2 × (ŷ − y) × x)`, `∂L/∂b = mean(2 × (ŷ − y))`를 얻는다. `x = [1, 2, 3, 4]`, `y = [8, 11, 14, 17]`에서 `w = 1`, `b = 0`으로 시작하면 다음과 같다.

| 항목 | 값 |
|---|---|
| 예측 `ŷ` | `[1, 2, 3, 4]` |
| 오차 `ŷ − y` | `[−7, −9, −11, −13]` |
| 손실 | `(49 + 81 + 121 + 169) / 4 = 105` |
| `∂L/∂w` | `2 × (−7 − 18 − 33 − 52) / 4 = −55` |
| `∂L/∂b` | `2 × (−7 − 9 − 11 − 13) / 4 = −20` |

- 기울기의 반대 방향으로 학습률만큼 옮긴다. 학습률 0.01이면 `w = 1 − 0.01 × (−55) = 1.55`, `b = 0 − 0.01 × (−20) = 0.2`이고 손실은 약 73.61로 준다.
- 학습률이 크면 바닥을 지나친다. 같은 시작점에서 한 스텝 뒤 손실은 학습률 0.1이면 48.375로 줄지만 0.2면 563.5로 커진다.
- `∂L/∂w`에는 오차마다 `x`가 곱해지므로 이 예시처럼 입력이 1보다 크고 오차의 부호가 같으면 `w`의 기울기가 `b`보다 커진다. 학습률 하나를 같이 쓰면 `w`는 빨리, `b`는 느리게 움직인다. 이 예시에서 손실이 0.001 아래로 내려가기까지 학습률 0.1의 경사 하강법은 원래 `x`로 129스텝, 평균 0과 표준편차 1로 표준화한 `x`로 27스텝이 걸렸다. 입력 스케일을 맞추거나 아래의 momentum과 Adam을 쓰는 이유다.

## autograd

- `requires_grad=True`인 텐서가 관여한 연산은 실행과 동시에 방향 그래프로 기록되고, 결과 텐서의 `grad_fn`이 그 그래프의 입구다. 위 손실은 곱셈, 덧셈, 뺄셈, 제곱, 평균 노드를 거친다(2.14.0의 노드 이름은 `MulBackward0`부터 `MeanBackward0`까지).
- 그래프의 leaf는 사용자가 만든 텐서(모듈의 파라미터 등)다. `backward()`는 requires_grad인 leaf의 `.grad`에만 기울기를 채우고 중간 결과의 `.grad`는 남기지 않는다. 위 예시에서 `w.grad`는 −55, `b.grad`는 −20으로 손 계산과 같다.
- `backward()`는 `.grad`를 덮어쓰지 않고 더한다. 손실을 다시 계산해 한 번 더 backward하면 `w.grad`는 −110이 된다. `zero_grad`를 빠뜨리면 오류 없이 기울기가 쌓여(이 예시의 세 스텝에서 −55, −100.75, −129.545) 갱신 폭이 커진다.
- 그래프는 backward가 끝나면 해제되므로 같은 그래프로 backward를 다시 하려면 `retain_graph=True`가 필요하다. 없으면 저장된 중간값이 이미 해제됐다는 오류가 난다. 그래프는 반복마다 새로 만들어지므로 반복마다 다른 Python 분기를 타도 된다.
- 갱신은 기록하지 않는다. 기록 모드에서 `w -= lr * w.grad`처럼 leaf를 제자리에서 고치면 `a leaf Variable that requires grad is being used in an in-place operation` 오류가 나므로 `with torch.no_grad():` 안에서 고친다. `w = w - lr * w.grad`로 바꿔 쓰면 오류는 없지만 `w`가 그래프의 중간 결과가 되어 다음 backward에서 `.grad`를 받지 못한다. optimizer의 `step()`은 기본적으로 no-grad 상태에서 실행된다.
- 추론은 `torch.no_grad()`나 `torch.inference_mode()` 안에서 한다. 기록하지 않아 메모리를 아끼며, inference mode는 더 빠른 대신 그 안에서 만든 텐서를 나중에 기록되는 계산에 쓸 수 없다.

## nn.Module, nn.Parameter와 nn.Linear

```python
class Line(nn.Module):
    def __init__(self):
        super().__init__()
        self.w = nn.Parameter(torch.tensor(1.0))  # 속성에 할당하면 등록된다
        self.b = nn.Parameter(torch.tensor(0.0))

    def forward(self, x):
        return self.w * x + self.b
```

- `nn.Parameter`는 requires_grad가 기본으로 켜진 텐서이고, 모듈 속성에 할당하면 자동 등록되어 `parameters()`에 나온다. 일반 텐서 속성은 등록되지 않는다.
- `parameters()`는 하위 모듈의 파라미터까지 돌려주므로 optimizer에 그대로 넘긴다. `nn.Linear(1, 4)`, `nn.ReLU()`, `nn.Linear(4, 1)`을 이은 모델의 파라미터 수는 `(1 × 4 + 4) + (4 × 1 + 1) = 13`이다.
- 계산은 `forward`에 정의하고 호출은 `model(x)`로 한다. `model.forward(x)`를 직접 부르면 등록된 hook이 실행되지 않는다.
- `model.train()`과 `model.eval()`은 dropout, batch normalization처럼 학습과 추론의 동작이 다른 층을 전환한다. 기록을 끄는 `no_grad`와는 별개라 추론에서는 둘 다 쓴다.
- `nn.Linear(in_features, out_features)`는 `y = x Aᵀ + b`를 계산한다. 입력 `(*, in_features)`의 마지막 축을 특징으로 읽어 `(*, out_features)`를 낸다. 가중치는 `(out_features, in_features)`, bias는 `(out_features,)`이고 둘 다 `k = 1 / in_features`일 때 `U(−√k, √k)`로 초기화된다.
- 특징이 하나인 표본 N개를 `(N,)`로 넣으면 표본 하나에 특징 N개로 읽혀 `nn.Linear(1, 1)`이 shape 오류를 낸다(2.14.0에서 4개면 `mat1 and mat2 shapes cannot be multiplied (1x4 and 1x1)`). `x[:, None]`이나 `x.unsqueeze(1)`로 `(N, 1)`을 만들고 정답도 `(N, 1)`로 맞춘다.

## optimizer

- `torch.optim.SGD(params, lr)`의 `step()`은 `p ← p − lr × p.grad`다. 위 손 계산과 같은 결과(`w` 1.55, `b` 0.2)를 낸다. 2.15의 `lr` 기본값은 1e-3이지만 문제마다 정할 값이라 명시한다.
- 이름의 stochastic은 데이터에서 온다. optimizer는 받은 기울기로 갱신만 하므로, 같은 `torch.optim.SGD`도 무작위로 고른 표본 하나의 기울기를 넘기면 확률적, 미니배치면 미니배치, 전체 데이터면 배치 경사 하강법이 된다([[Neural-Network-Fundamentals#경사 하강법과 배치 크기|배치 크기의 절충]]).
- momentum은 최근 기울기를 누적한 속도 `v`로 움직여, 같은 방향의 작은 기울기가 쌓이면 걸음이 커진다. PyTorch는 `v ← μ × v + g`, `p ← p − lr × v`로 구현하며, 문서는 이것이 `v ← μ × v + lr × g`, `p ← p − v`를 쓰는 Sutskever 등의 형태와 다르다고 밝힌다. 다른 프레임워크의 설정을 옮길 때 확인한다.
- Adam(`torch.optim.Adam`, 기본 `lr=1e-3`, `betas=(0.9, 0.999)`)은 기울기의 이동 평균 `m`과 제곱의 이동 평균 `v`를 두고, 초기 편향을 보정한 `m̂`, `v̂`로 `p ← p − lr × m̂ / (√v̂ + ε)`를 계산한다. 원소마다 기울기 크기로 나누므로 기울기가 작은 파라미터도 비슷한 걸음으로 움직인다. 위 예시에서 Adam(학습률 0.01)의 첫 스텝은 기울기가 −55인 `w`와 −20인 `b`를 똑같이 0.01씩 옮긴다.
- optimizer를 바꾸는 것은 생성 줄 하나이고 루프는 그대로다. 어느 쪽이 나은지는 각자의 학습률을 맞춘 뒤 같은 조건으로 비교한다. 학습 도중 optimizer 코드를 바꾸는 접근은 [[Agent-in-the-Loop-Optimizer|학습 중 옵티마이저를 고치는 에이전트]]에 있다.
- `zero_grad()`의 기본값 `set_to_none=True`는 `.grad`를 `None`으로 만든다. 메모리를 덜 쓰고, 기울기를 받지 못한 파라미터는 갱신을 건너뛴다. 0으로 채우면 기울기 0으로 갱신이 실행되어 momentum이나 weight decay가 있으면 파라미터가 움직인다.

## 미니배치와 DataLoader

- `TensorDataset(x, y)`는 첫 축을 기준으로 i번째 표본 `(x[i], y[i])`를 묶는다. 텐서들의 첫 축 길이가 같아야 한다.
- `DataLoader(dataset, batch_size=12, shuffle=True)`는 epoch마다 순서를 섞어 12개씩 내준다. 기본값은 `batch_size=1`이고 섞지 않는다. 표본 36개면 epoch당 배치 3개, 곧 갱신 3번이라 위 루프의 300 epoch는 갱신 900번이다.
- 표본 수가 배치 크기로 나누어떨어지지 않으면 마지막 배치가 작아지고, `drop_last=True`면 그 배치를 버린다.

## 저장과 불러오기

- 학습 결과는 파라미터와 버퍼를 이름별로 담은 사전인 `state_dict()`로 저장한다. `torch.save(model.state_dict(), path)`로 쓰고, 같은 구조의 모델을 만든 뒤 `model.load_state_dict(torch.load(path, weights_only=True))`로 읽는다. `load_state_dict`는 경로가 아니라 사전을 받는다.
- `state_dict()`는 복사본이 아니라 현재 파라미터의 참조를 담는다. 검증 손실이 가장 좋던 시점을 보관하려면 `copy.deepcopy(model.state_dict())`로 복사하거나 바로 파일로 써야 이후 학습에 덮이지 않는다.
- 학습을 이어 하려면 optimizer의 `state_dict()`(momentum이나 Adam의 이동 평균)도 함께 저장한다. 추론 전에는 `model.eval()`을 부른다.
- 남이 만든 파일을 불러올 때의 위험은 [[AI-Infrastructure-Language-Layers#모델 파일을 받을 때의 안전|모델 파일을 받을 때의 안전]]을 따른다.

## 손실과 활성 함수 고르기

| 과업 | 마지막 출력 | 손실 | 주의 |
|---|---|---|---|
| 회귀 | 값 그대로 | `nn.MSELoss`, `nn.L1Loss`, `nn.HuberLoss` | 기본 `reduction='mean'`. 이상치 민감도는 [[Supervised-Learning-Models#손실 함수|손실 함수]] |
| 다중 분류 | 클래스별 logit(정규화 전 점수) | `nn.CrossEntropyLoss` | 안에서 log-softmax를 적용하므로 softmax를 먼저 씌우지 않는다. 정답은 클래스 번호나 클래스별 확률 |
| 이진 분류 | logit 하나 | `nn.BCEWithLogitsLoss` | sigmoid와 BCE를 한 층으로 합쳐 수치적으로 더 안정적이다 |

- 오차가 `[0.5, 10]`이면 평균 손실은 MSE 50.125, L1 5.25, Huber(δ = 1) 4.8125다. 큰 오차 하나가 MSE를 지배한다.
- sigmoid 출력에 `nn.BCELoss`를 쓰면 float32에서 확신하고 틀린 표본의 기울기가 사라질 수 있다. 2.14.0에서 logit 20, 정답 0일 때 logit에 대한 기울기는 `BCELoss`가 0, `BCEWithLogitsLoss`가 1이었다.
- 선형 층 사이에 활성 함수가 없으면 층을 쌓아도 하나의 선형 변환이다. `nn.ReLU`, `nn.GELU`, `nn.Sigmoid`, `nn.Tanh`, `nn.Softmax(dim)`의 정의는 [[Neural-Network-Fundamentals#유닛과 활성 함수|활성 함수]]에 있다.

## 이해 확인

1. 위 예시의 두 번째 스텝(`w = 1.55`, `b = 0.2`)에서 기울기를 손으로 구하고 autograd 결과와 대조한다.
2. `optimizer.zero_grad()`를 지우면 기울기와 갱신 폭이 어떻게 변하는지, 오류가 나지 않는 이유와 함께 설명한다.
3. `no_grad` 없이 `w -= lr * w.grad`를 실행할 때와 `w = w - lr * w.grad`를 실행할 때 각각 무엇이 잘못되는지 설명한다.
4. 특징 하나짜리 표본 N개를 `nn.Linear(1, 1)`에 넣을 때 필요한 입력 shape과, 정답이 `(N,)`일 때 MSE가 틀리는 이유를 설명한다.
5. SGD를 Adam으로 바꿀 때 고칠 줄과, 기울기가 작은 파라미터의 움직임이 어떻게 달라지는지 설명한다.
6. 3클래스 분류 모델의 마지막 층에 softmax를 두고 `CrossEntropyLoss`로 학습하면 무엇이 문제인지 설명한다.

## 출처

- [YouTube, Zachary Huang, Give me 31 minutes, I will make PyTorch click forever](https://www.youtube.com/watch?v=K1ksiPHfgVs) — 2026-10-13 공개. 2026-11-18 로컬 음성 인식 전사로 다섯 줄 학습 루프, 손 계산 경사 하강법, 기울기 누적과 no_grad, nn.Module, optimizer, DataLoader와 손실 선택 부분을 확인했다. 화면의 코드와 예제 데이터는 전사에 없어 옮기지 않았고, 예시와 코드는 아래 문서와 PyTorch 2.14.0 로컬 실행으로 새로 만들었다.
- [PyTorch, Autograd mechanics](https://docs.pytorch.org/docs/2.15/notes/autograd.html) — 2.15 문서. 그래프 기록과 `grad_fn`, leaf와 `.grad`, 반복마다 새로 만드는 그래프, no-grad와 inference mode, in-place 연산의 제약.
- [PyTorch, torch.Tensor.backward](https://docs.pytorch.org/docs/2.15/generated/torch.Tensor.backward.html), [torch.optim.Optimizer.zero_grad](https://docs.pytorch.org/docs/2.15/generated/torch.optim.Optimizer.zero_grad.html) — 2.15 문서. leaf에 기울기를 누적한다는 경고와 `retain_graph`, `set_to_none` 기본값과 None과 0의 갱신 차이.
- [PyTorch, torch.optim.SGD](https://docs.pytorch.org/docs/2.15/generated/torch.optim.SGD.html), [torch.optim.Adam](https://docs.pytorch.org/docs/2.15/generated/torch.optim.Adam.html) — 2.15 문서. 갱신식과 기본값, momentum 구현과 Sutskever 형태의 차이, `step()`의 no-grad 실행.
- [PyTorch, torch.nn.Module](https://docs.pytorch.org/docs/2.15/generated/torch.nn.Module.html), [torch.nn.parameter.Parameter](https://docs.pytorch.org/docs/2.15/generated/torch.nn.parameter.Parameter.html), [torch.nn.Linear](https://docs.pytorch.org/docs/2.15/generated/torch.nn.Linear.html) — 2.15 문서. 인스턴스 호출과 hook, `parameters()`의 하위 모듈 포함, `state_dict`의 참조, `eval()`, Parameter 등록 조건, Linear의 계산식, shape과 초기화.
- [PyTorch, torch.utils.data](https://docs.pytorch.org/docs/2.15/data.html) — 2.15 문서. `TensorDataset`과 `DataLoader`의 기본값, `drop_last`.
- [PyTorch, torch.nn.CrossEntropyLoss](https://docs.pytorch.org/docs/2.15/generated/torch.nn.CrossEntropyLoss.html), [torch.nn.BCEWithLogitsLoss](https://docs.pytorch.org/docs/2.15/generated/torch.nn.BCEWithLogitsLoss.html), [torch.nn.HuberLoss](https://docs.pytorch.org/docs/2.15/generated/torch.nn.HuberLoss.html) — 2.15 문서. logit 입력과 정답 형식, sigmoid 결합의 수치 안정성, Huber 정의와 `delta` 기본값.
- [PyTorch Tutorials, Optimizing Model Parameters](https://docs.pytorch.org/tutorials/beginner/basics/optimization_tutorial.html) — 2026-07-31 갱신본. 학습 루프의 세 단계와 기울기 누적 설명.
- [PyTorch Tutorials, Saving and Loading Models](https://docs.pytorch.org/tutorials/beginner/saving_loading_models.html) — `state_dict` 저장 권장, `load_state_dict`가 사전을 받는 점, `eval()` 호출, `deepcopy` 주의, optimizer 상태를 포함한 checkpoint.

## 관련 문서

- [[ml-foundations|머신러닝 기초]]
- [[PyTorch-Tensor-Basics|PyTorch 텐서]]
- [[Neural-Network-Fundamentals|신경망 기초]]
- [[Supervised-Learning-Models|지도학습 기본 모델과 손실 함수]]
- [[Deep-Learning-Foundations-and-Practice|딥러닝 기초와 실습]]
- [[LLM-Generation-Mechanics-Training|LLM 학습 원리]]
- [[Agent-in-the-Loop-Optimizer|학습 중 옵티마이저를 고치는 에이전트]]
- [[PyTorch-Version-Upgrade-and-Rollback|PyTorch 버전 업그레이드와 롤백]]
