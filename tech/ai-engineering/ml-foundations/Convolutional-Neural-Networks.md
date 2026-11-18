---
tags: [ai, deep-learning, computer-vision, cnn, convolution, pooling, pytorch, keras, learning]
status: done
verified_at: 2026-11-18
category: "AI엔지니어링(AIEngineering)"
aliases: ["합성곱 신경망", "Convolutional Neural Network", "CNN", "이미지 합성곱", "Image Convolution", "풀링", "Pooling", "컴퓨터 비전 기초"]
---

# 합성곱 신경망: 이미지 convolution, pooling과 CNN 구조

컴퓨터 비전은 이미지를 분석하고 이해하는 계산 방법이다. 사진 속 얼굴 식별, 자율주행 차량의 신호등과 주변 차량 인식, 손글씨 숫자 인식이 예다. 합성곱 신경망(convolutional neural network, CNN)은 이미지의 공간 구조를 이용해 특징을 뽑은 뒤 일반 신경망으로 분류한다. 유닛, 역전파와 dropout은 [[Neural-Network-Fundamentals|신경망 기초]]에 있다.

## 이미지는 숫자 격자다

- 이미지는 픽셀 격자이고 픽셀 값은 숫자다. 흑백은 픽셀마다 값 하나(채널 1개), 컬러는 빨강, 초록, 파랑 값 셋(채널 3개)을 쓴다. 값은 흔히 8비트, 곧 0~255 범위다.
- 신경망에 넣기 전에 255로 나눠 0~1 범위로 맞추는 전처리를 흔히 한다.
- 손글씨 숫자 데이터셋 MNIST는 Keras 배포본 기준으로 28×28 흑백 이미지가 학습용 60,000장, 테스트용 10,000장이고 라벨은 0~9, 픽셀 값은 0~255다.

픽셀을 한 줄로 펼쳐 일반 신경망의 입력으로 넣을 수도 있다. 그러면 큰 컬러 이미지는 입력과 가중치 수가 매우 커지고, 이웃한 픽셀이 이루는 선, 곡선, 모양 같은 공간 구조를 신경망이 처음부터 다시 배워야 한다.

## 이미지 convolution과 feature map

이미지 convolution은 작은 가중치 행렬(커널 또는 필터)을 이미지 위에서 미끄러뜨리며, 각 위치에서 겹치는 픽셀 값과 커널 값을 곱해 더한 값 하나를 낸다. 그 값들을 모은 결과가 필터를 적용한 이미지, 곧 feature map이다. 커널을 한 번에 움직이는 칸 수가 stride다.

출력 크기는 입력 길이 `n`, 커널 크기 `k`, stride `s`, 가장자리에 덧붙이는 padding `p`로 정해진다(dilation 1 기준).

`출력 길이 = floor((n + 2p − k) / s) + 1`

4×4 이미지에 3×3 커널을 padding 없이 stride 1로 적용하면 2×2 feature map이 나온다. PyTorch `Conv2d`의 기본값은 stride 1, padding 0이다.

### 경계 검출 커널

가운데가 8이고 둘레 여덟 칸이 −1인 3×3 커널은 가운데 픽셀이 이웃과 얼마나 다른지를 잰다.

| 3×3 영역 | 계산 | 결과 |
|---|---|---|
| 모두 20 | `8 × 20 − 8 × 20` | 0 |
| 윗줄 20, 가운데 줄과 아랫줄 50 | `8 × 50 − (3 × 20 + 5 × 50)` | 90 |

값이 고른 영역은 0이고 밝기가 바뀌는 곳은 큰 값이 나오므로, 이 필터를 이미지 전체에 적용하면 물체 사이의 경계가 드러난다.

- 컬러 이미지에서는 채널마다 커널을 두고 결과를 더한다. PyTorch `Conv2d`의 가중치 모양이 groups가 1일 때 `(출력 채널, 입력 채널, 커널 높이, 커널 너비)`인 것은 필터 하나가 모든 입력 채널에 걸치고, 필터 수만큼 출력 채널(feature map)이 생긴다는 뜻이다. bias는 출력 채널마다 하나다.
- 딥러닝 라이브러리의 convolution 층은 커널을 뒤집지 않고 그대로 겹쳐 곱하는 교차상관(cross-correlation)을 계산한다(PyTorch 문서 기준). 커널을 학습하는 신경망에서는 뒤집은 커널도 또 하나의 커널일 뿐이라 표현력은 같지만, 신호처리 정의로 만든 고정 커널을 옮겨 쓸 때는 방향을 확인한다.

## pooling

pooling은 입력의 영역마다 값 하나를 뽑아 크기를 줄인다.

- max pooling은 영역의 최댓값, average pooling은 평균을 쓴다. 4×4 입력에 겹치지 않는 2×2 max pooling을 적용하면 2×2가 된다.
- 다음 층의 입력과 계산량이 준다.
- 특징이 영역 안에서 한 픽셀 움직여도 같은 최댓값이 나오므로 작은 위치 변화에 덜 민감해진다. 대신 영역 안의 정확한 위치 정보는 잃는다.

## CNN의 구성

1. 입력 이미지에 여러 필터로 convolution을 적용해 feature map 여러 장을 만든다. 필터 값은 사람이 정하지 않고, 손실을 줄이도록 역전파로 다른 가중치와 함께 학습한다.
2. pooling으로 feature map을 줄인다.
3. 필요하면 convolution과 pooling을 반복한다. 앞 단계는 경계, 곡선, 모양 같은 낮은 수준의 특징을, 뒤 단계는 그 조합인 더 높은 수준의 특징(얼굴의 눈, 숫자를 이루는 곡선 배치)을 찾는다.
4. 결과를 한 줄로 펼쳐(flatten) 은닉층이 있는 일반 신경망에 넣고, 출력층에서 분류한다. 범주가 여럿이면 softmax를 쓴다.

MNIST를 분류하는 작은 구성으로 크기와 파라미터 수를 계산하면 다음과 같다. convolution은 padding 0, stride 1, pooling은 겹치지 않는 2×2를 가정했다.

| 층 | 출력 모양 | 학습 파라미터 수 |
|---|---|---|
| 입력 | 28×28×1 | 0 |
| 3×3 필터 32개 convolution | 26×26×32 | (3×3×1 + 1) × 32 = 320 |
| 2×2 max pooling | 13×13×32 | 0 |
| flatten | 5,408 | 0 |
| 은닉층 128유닛(학습 중 dropout 0.5) | 128 | (5,408 + 1) × 128 = 692,352 |
| 출력층 10유닛(softmax) | 10 | (128 + 1) × 10 = 1,290 |

convolution 층의 파라미터 수는 입력 이미지 크기와 무관하게 필터 크기, 입력 채널 수와 필터 수로 정해진다. 같은 필터를 모든 위치에 다시 쓰기 때문이다(가중치 공유). 반면 펼친 뒤의 완전 연결층은 입력 크기에 비례해 파라미터가 늘어, 이 구성에서도 파라미터 대부분이 은닉층에 있다.

CNN 없이 픽셀을 펼친 일반 신경망으로도 손글씨 숫자를 분류할 수 있다. CNN은 이웃 픽셀의 국소 구조와, 같은 특징을 위치와 상관없이 같은 필터로 찾는 성질을 구조에 넣는 선택이다. 이미지를 패치로 나눠 Transformer에 넣는 ViT 같은 다른 선택은 [[Deep-Learning-Foundations-and-Practice#번역 구조에서 범용 설계도까지|Transformer의 비텍스트 확장]]에 있다.

## 이해 확인

1. 32×32×3 이미지에 5×5 필터 16개를 padding 2, stride 1로 적용한 출력 모양과 convolution 층의 파라미터 수를 계산한다.
2. 경계 검출 커널을 값이 모두 같은 영역과 가로 경계가 있는 영역에 적용한 결과가 다른 이유를 설명한다.
3. 위 MNIST 구성에서 파라미터가 가장 많은 층을 찾고, convolution 층의 파라미터 수가 이미지 크기와 무관한 이유를 설명한다.
4. max pooling이 작은 이동에 강해지는 대신 잃는 정보가 무엇인지 설명한다.

## 출처

- [YouTube, Harvard CS50's Artificial Intelligence with Python, Neural Networks](https://www.youtube.com/watch?v=5NgNicANyqM&t=35819s) — freeCodeCamp.org 채널, 2023-08-10 공개. 2026-11-18 9:56:59부터의 컴퓨터 비전, convolution, pooling과 CNN 부분을 사람이 단 영어 자막으로 대조했다. 화면의 이미지와 데모 정확도 수치는 옮기지 않았다.
- [Harvard, CS50's Introduction to Artificial Intelligence with Python, Lecture 5 Neural Networks Notes](https://cs50.harvard.edu/ai/2020/notes/5/) — 이전 판으로 표시된 공식 노트. 2026-11-18 convolution과 pooling의 정의, 경계 검출 커널 값, CNN 단계와 MNIST 예제의 층 구성(3×3 필터 32개, 2×2 max pooling, 128유닛과 dropout 0.5, 10유닛 softmax)을 대조했다. 위 표의 출력 모양과 파라미터 수는 이 구성으로 직접 계산한 값이다.
- [PyTorch, torch.nn.Conv2d](https://docs.pytorch.org/docs/2.15/generated/torch.nn.Conv2d.html) — 2.15 문서. 교차상관 연산, 출력 크기 식, stride와 padding 기본값, 가중치와 bias 모양.
- [Keras, MNIST digits classification dataset](https://keras.io/api/datasets/mnist/) — 2026-11-18 학습과 테스트 표본 수, 이미지 크기, 라벨과 픽셀 범위 대조.

## 관련 문서

- [[ml-foundations|머신러닝 기초]]
- [[Neural-Network-Fundamentals|신경망 기초]]
- [[Deep-Learning-Foundations-and-Practice|딥러닝 기초와 실습]]
- [[Multimodal-Image-Search|멀티모달 이미지 검색]]
- [[Synthetic-Vision-Data-Evaluation|합성 비전 데이터 평가]]
