---
tags: [ai, machine-learning, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["머신러닝 기초", "Machine Learning Foundations"]
---

# 머신러닝 기초

지도학습, 비지도 학습, 신경망, 컴퓨터 비전과 자연어 처리의 기본 알고리즘과 이를 PyTorch로 구현하는 기초를 다룬다. 상위: [[AI엔지니어링(AIEngineering)|AI 엔지니어링]].

## 목차
- [x] [[Supervised-Learning-Models|지도학습 기본 모델과 손실 함수]] — 분류와 회귀, k-NN과 탐색 구조, 선형 분류기와 perceptron 학습 규칙, logistic 함수, SVM의 최대 마진과 C, 0-1, L1, L2, Huber 손실, 과적합과 정규화
- [x] [[K-Means-Clustering|비지도 학습과 k-means 군집화]] — 할당과 재중심 반복, inertia와 지역 최솟값, k-means++와 n_init, 군집 모양과 거리의 가정
- [x] [[Neural-Network-Fundamentals|신경망 기초]] — 유닛과 활성 함수, 배치, 확률적, 미니배치 경사 하강법, 은닉층과 역전파, dropout, 순환 신경망의 입출력 형태
- [x] [[Convolutional-Neural-Networks|합성곱 신경망]] — 픽셀 격자, convolution과 출력 크기, 경계 검출 커널, 교차상관, pooling, CNN 층 구성과 가중치 공유
- [x] [[Natural-Language-Processing-Foundations|자연어 처리 기초]] — 구문과 의미, 문맥 자유 문법, n-gram과 토큰화, bag-of-words와 Naive Bayes 평활, one-hot과 word2vec, 인코더-디코더에서 Transformer까지의 개요
- [x] [[PyTorch-Tensor-Basics|PyTorch 텐서]] — shape과 dim, 생성 함수와 dtype, 인덱싱과 마스크의 view와 복사, 집계에서 사라지는 dim, reshape와 view, stack과 cat, broadcasting과 오류 없는 shape 버그
- [x] [[PyTorch-Training-Loop|PyTorch 학습 루프]] — 다섯 줄이 바꾸는 상태, 손 계산 경사 하강법과 autograd 대조, 기울기 누적과 no_grad, nn.Module과 nn.Linear의 입력 shape, SGD, momentum과 Adam, DataLoader, state_dict 저장, 과업별 손실

## 함께 볼 문서
- [[Supervised-Learning-Validation-and-Metrics|지도학습 검증과 평가 지표]] — 학습, 검증, 테스트 분할, K-fold와 누수 방지, 분류와 회귀 지표
- [[Deep-Learning-Foundations-and-Practice|딥러닝 기초와 실습]] — Transformer 계보, 파괴적 망각, Keras 학습과 평가
- [[Reinforcement-Learning-from-Experience#MDP와 Q-learning|MDP와 Q-learning]] — 상태, 행동, 전이와 보상, Q 갱신식, ε-greedy와 함수 근사
