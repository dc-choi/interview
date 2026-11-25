---
tags: [architecture, recommendation-system, cross-domain, sequential-recommendation, generative-retrieval, knowledge-distillation, serving]
status: done
verified_at: 2026-11-26
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Cross-Surface Recommendation", "전 지면 행동 시퀀스 추천", "HSTU", "Semantic ID", "Generative Retrieval", "External Distillation", "ExFM"]
---

# 전 지면 행동 시퀀스와 리트리버 포트폴리오

한 사용자의 관심은 피드, 짧은 영상, 검색, 광고와 쇼핑처럼 여러 지면에 흩어져 드러난다. 지면별 로그로 따로 학습한 모델은 그 사용자의 일부만 본다. 전 지면 행동을 사용자별 시퀀스 하나로 모아 학습하면 이 문제를 줄이지만, 모든 지면을 다루는 큰 모델은 요청마다 실시간으로 부르기 어렵다. 한 대응은 큰 foundation model(FM)과 서빙 가능한 크기의 vertical model(VM)을 나누는 것이다. 아래 발표 사례에서는 VM도 같은 전 지면 데이터를 직접 학습하면서 FM의 지식을 증류로 받는다.

```text
공통 데이터: 지면별 행동 -> 사용자별 단일 시퀀스(아이템, 액션, 시각) + 사용자와 아이템 특징
FM:  전 지면 데이터로 학습, 오프라인 배치 추론 결과(점수)를 적재
VM:  같은 데이터로 학습하는 리트리버 여러 개 + 통합 랭커, 실시간 서빙
증류: FM 점수 -> VM의 보조 학습 신호
```

## 리트리버를 여러 개 두는 이유

리트리버마다 쓰는 정보와 약점이 다르므로 서로의 약점을 메우는 포트폴리오로 둔다. 아래 표의 강점과 약점은 발표 사례의 평가다. 후보 병합의 dedup, quota와 공통 재점수화는 [[Recommendation-System-Candidate-Generation#병합 계층의 계약|병합 계층의 계약]]을 따른다.

| 리트리버 유형 | 쓰는 정보 | 강점 | 약점 |
|---|---|---|---|
| ID 기반 생성형 시퀀스 모델(HSTU 계열) | 아이템 ID와 액션의 순서, 시각 | 소비 방식과 최신성, 순서 패턴 | 학습되지 않은 신규 아이템을 바로 못 찾는다 |
| 텍스트 임베딩 two-tower | 제목, 본문, 캡션의 텍스트 임베딩 | 신규 아이템(cold item) 검색, 빠른 수렴 | 텍스트가 적은 짧은 영상에 약하고 구간 평균은 세밀한 순서를 잃는다 |
| Semantic ID 생성형 검색 | 콘텐츠 임베딩을 양자화한 코드 | 아이템 수에 비례하지 않는 파라미터, 좁혀 가는 탐색 | 인기 편향, 학습과 서빙 단계가 많다 |
| 이종 그래프 임베딩 | 콘텐츠 타입과 작성자 사이의 관계 | 지면과 타입을 넘는 연결, 같은 작성자 콘텐츠 | 소비 순서와 최신성을 직접 반영하지 못한다 |

## 생성형 시퀀스 모델: HSTU

Generative Recommenders 논문은 추천의 retrieval과 ranking을 생성형 모델링 틀의 sequential transduction 과제로 재정의하고, 그 인코더 구조로 HSTU(Hierarchical Sequential Transduction Units)를 제안한다.

- **아이템과 액션을 번갈아 둔다.** 논문은 ranking에서 target-aware cross-attention을 하려고 아이템과 액션을 interleave한 시퀀스를 쓴다. 같은 클립이라도 클릭만 했는지, 끝까지 봤는지, 바로 넘겼는지가 다른 신호가 된다.
- **Softmax 대신 pointwise 집계를 쓴다.** 논문은 pointwise aggregated (normalized) attention에 SiLU 비선형을 쓴다. 목표와 관련된 과거 행동의 개수가 선호 강도를 나타내는 강한 특징인데 softmax 정규화 뒤에는 이를 잡기 어렵다는 이유다.
- **Relative attention bias에 위치와 시간을 넣는다.** 같은 행동이라도 방금 했는지 어제 했는지가 점수에 반영된다.
- **Ranking 추론은 후보를 microbatch로 병렬 처리한다.** 논문의 M-FALCON은 후보 b_m개를 병렬로 다루고 encoder 수준의 KV cache를 재사용한다.

### 다중 관심 슬롯과 슬롯 최댓값

HSTU 출력을 단기, 중기, 장기 범위로 요약하고 관심 라우터로 관심 벡터를 더 만든 뒤, 각 슬롯과 아이템 임베딩의 코사인 유사도 중 최댓값을 점수로 쓰는 변형이 있다(발표 사례). 육아와 여행에 관심이 있는 사용자에게 여행 콘텐츠를 평가할 때 여행 슬롯만으로 높은 점수를 줄 수 있다. max 집계와 관심별 검색의 관계는 [[Recommendation-System-Multi-Interest-Modeling|다중 관심 사용자 표현]]에서 다룬다.

## 텍스트 임베딩 리트리버와 cold item

- **아이템 타워(발표 사례):** 고정한 텍스트 임베딩 모델(음성 기준 Qwen3 계열로 추정, 공개 모델은 Qwen3-Embedding) 출력 위에 MLP만 학습한다. 소비 이력이 있는 warm 아이템은 LightGCN으로 상호작용 정보를 더하고, 상호작용이 없는 신규 아이템은 MLP 투영만으로 같은 공간에 놓는다.
- **LightGCN:** feature transformation과 비선형 활성화를 버리고 이웃 집계만 남기며, 모든 레이어 임베딩의 가중합(균등 1/(K+1))을 최종 임베딩으로 쓴다.
- **사용자 타워:** 최근 이력을 구간별 아이템 벡터 평균으로 요약하고, 자연어로 만든 관심 프로필의 임베딩을 마지막에 더한다(late fusion). 구간별 ANN 결과를 라운드로빈으로 합친다(발표 사례).
- 사전 학습된 의미 임베딩에서 출발하므로 무작위 초기화한 ID 임베딩보다 빨리 수렴한다. 그래서 매 회차 MLP를 처음부터 다시 학습하는 운영이 가능하다(발표 사례).

## Semantic ID 생성형 검색

TIGER(Recommender Systems with Generative Retrieval)는 아이템의 의미 임베딩을 RQ-VAE로 양자화해 길이 m의 codeword 튜플을 Semantic ID로 쓰고, sequence-to-sequence Transformer가 다음 아이템의 Semantic ID를 autoregressive로 생성한다.

- **Residual quantization:** 첫 코드가 표현하고 남은 잔차를 다음 레벨 코드가 표현한다. 레벨마다 자기 코드북이 있다. 앞 코드가 넓은 범주를, 뒤 코드가 세부를 맡는 구조라 beam search로 점수가 높은 경로만 남겨 모든 조합을 탐색하지 않는다.
- **손실:** 재구성 손실과 양자화 손실의 합이다. 양자화 항은 레벨마다 `||sg[r] - e_c||^2 + beta * ||r - sg[e_c]||^2`(논문 beta=0.25)를 더한 값으로, 흔히 codebook 항과 commitment 항으로 부르는 구조다(명칭은 해석). 함께 소비된 아이템의 잠재 벡터를 가깝게 하는 contrastive 손실을 더하는 변형도 있다(발표 사례).
- **충돌:** 서로 다른 아이템이 같은 코드를 받으면 끝에 토큰 하나를 더해 구분한다. 논문 실험은 충돌이 없어도 모든 아이템에 넷째 코드(0)를 준다. 발표 사례는 같은 Semantic ID를 쓰는 아이템 중 하나를 고르는 다른 방식을 쓴다.
- **Invalid ID:** 실제 아이템에 대응하지 않는 ID가 생성될 수 있다. 논문은 세 공개 데이터셋의 top-10에서 약 0.1~1.6%, top-20에서 약 0.3~6%로 보고한다. 서빙에서는 실제 아이템에 없는 조합을 후보에서 뺀다.
- **메모리:** 아이템마다 임베딩을 두지 않고 codeword마다 임베딩을 저장하므로 아이템 수에 선형으로 커지지 않는다. 아이템 의미를 쓰므로 cold-start 추천도 가능하다고 논문은 적는다.
- **약점:** 생성 결과가 인기 아이템에 치우칠 수 있다(발표 사례). 진단과 보정은 [[Recommendation-System-Hubness-Popularity-Debiasing|허브니스와 사용자 무관 점수 성분]]을 본다.

## 이종 그래프 임베딩

클립, 포스트, 카페, 블로그 같은 콘텐츠 타입과 작성자를 노드로, 함께 소비와 작성 관계를 엣지 타입으로 둔 그래프를 학습한다(발표 사례).

- **R-GCN:** 엣지의 타입과 방향에 따라 다른 가중치 행렬(relation-specific transformation)로 이웃 메시지를 집계하고 self-connection을 더한다. relation이 많으면 basis decomposition이나 block-diagonal decomposition으로 파라미터를 줄인다.
- **Graph contrastive learning:** 엣지 dropout으로 두 뷰를 만들고 같은 노드가 두 뷰에서 비슷한 표현을 갖게 해 일부 연결이 빠져도 표현이 흔들리지 않게 한다(발표 사례).
- **서빙:** 콘텐츠와 작성자 사이의 이웃 관계는 사용자마다 달라지지 않으므로 주기적으로 미리 계산하고, 한 타입으로 쏠리지 않게 타입별 quota를 둔다. 사용자가 소비한 콘텐츠를 시드로 이웃을 조회한다(발표 사례).

## 통합 랭커

여러 리트리버의 후보를 한 랭커가 다시 점수화한다. 이 절은 발표 사례의 구성이다. 리트리버와 같은 시퀀스 구조를 쓰되 따로 처음부터 학습해 독립적으로 갱신할 수 있다.

- 리트리버는 이력에서 슬롯을 먼저 만들고 비슷한 아이템을 찾는다. 랭커는 후보마다 이력의 어느 부분에 주목할지 다시 계산하는 target attention을 쓴다. 후보 기반 가중이 질의 벡터 하나의 ANN으로 바뀌지 않는 이유는 [[Recommendation-System-Multi-Interest-Modeling|다중 관심 문서]]의 집계 절과 같다.
- 사용자 이력은 한 번만 인코딩하고 후보끼리 서로 참조하지 않으므로 후보 점수를 병렬로 계산한다.
- 후보를 아이템 ID 임베딩으로 표현하면 랭커에 등록되지 않은 신규 아이템이 같은 미등록 벡터를 받아 같은 사용자에게 같은 점수를 받는다. 발표는 후보의 콘텐츠 임베딩을 함께 쓰는 방향을 검토 중이라고 밝혔다.

## FM 지식 전이: external distillation

ExFM(External Large Foundation Model) 논문은 FM과 VM을 함께 학습하는 co-distillation 대신, FM을 따로 학습하고 그 예측을 VM 학습의 외부 supervision으로 쓰는 external distillation을 제안한다. Co-training은 서빙 모델의 학습 비용을 늘리기 때문이다.

- **비용 분산:** FM 하나가 여러 VM을 맡아 유지 비용을 나눈다. FM 예측은 Data Augmentation Service(DAS)가 VM 학습 데이터를 준비할 때 기록한다.
- **Auxiliary Head:** FM은 여러 VM의 데이터를 합쳐 학습하므로 개별 VM에 편향을 옮길 수 있다(Cross-domain Bias). 한 head가 실제 label과 FM pseudo-label을 함께 받으면 이 편향이 VM에 들어오므로, 서빙 head는 실제 label만, 별도 distillation head는 FM pseudo-label을 학습하게 나눈다. 논문은 gradient scaling, label scaling, loss weighting을 FM 증류 효과를 키우는 기법으로 함께 제안한다.
- **Student Adapter:** FM과 VM의 데이터 시점 차이(Freshness Gap)를 줄이는 장치다. FM 예측을 MLP로 변환해 실제 label로 학습하고, 그 출력을 gradient를 끊어 증류에 쓴다.
- **VM 데이터의 차이:** ExFM에서 FM은 VM들의 데이터를 합쳐 학습하고 각 VM은 자기 서비스나 단계의 데이터로 학습한다. VM도 전 지면 데이터를 직접 학습하는 도입부의 구조는 발표 사례의 설계다.
- **Pseudo-label 설계(발표 사례):** FM 점수 행마다 사용자와 세션, 아이템, 이벤트 시각과 점수 생성 시각, FM 버전을 계약으로 둔다. 학습 시점 직전 30분 안의 FM 세션만 붙여 미래 정보 누수를 막고, FM 버전이 바뀌면 점수 분포가 달라질 수 있으므로 점수값 대신 같은 사용자, 같은 FM 그룹 안의 순서를 label로 쓴다. 보조 head 손실은 그룹 안 FM과 VM 점수의 softmax 분포 사이 KL divergence다.
- **후속 방향:** LoopFM은 스칼라 점수 하나로는 FM의 중간 지식을 다 전달하지 못한다고 보고, FM의 중간 임베딩을 VM의 입력 특징으로 쓰는 방식을 제안한다(Meta 프리프린트).

## 서빙 구조

모델 특성마다 서빙을 다르게 나눈다. 아래는 발표 사례의 구성과 공식 문서의 제약이다.

- **사용자 이력:** 배치 이력은 아이템을 문서로, 사용자 ID를 색인 키로, 상호작용 시각을 정렬 키로 둔 역색인에 두고, 배치에 아직 반영되지 않은 최신 상호작용은 실시간 상호작용 서비스에서 받아 합치며 같은 아이템과 액션을 dedup한다. 이 이력을 여러 VM이 공유한다.
- **CPU와 GPU 분리:** 이력 조회, 시퀀스 조립과 후처리는 추천 서버 CPU에, 긴 시퀀스 인코딩은 GPU 모델 서버에 둔다. 요청 본문이 커지면 압축해 보내고, 모델 서버 안에서도 요청 처리 프로세스와 추론 프로세스를 워커 큐로 분리해 부가 작업이 추론을 밀지 않게 한다.
- **ANN 색인 blue-green 교체:** MLP를 다시 학습하면 모든 아이템 벡터가 바뀌므로 색인도 새로 만든다. 서빙하지 않는 쪽에 새 색인을 만든 뒤 한 번에 전환하면 두 회차의 벡터가 섞이지 않고 문제가 생기면 이전 색인으로 계속 서빙한다. 색인 일반은 [[Vector-Similarity-Search|벡터 유사도 검색과 ANN]]을 본다.
- **Beam search의 KV cache 공유:** 이력 KV cache는 한 번 인코딩해 한 세트만 두고 모든 beam이 읽으며, 생성 중인 코드의 KV cache만 beam마다 둔다.
- **CUDA Graphs:** 작은 커널이 많이 이어지면 CPU가 커널을 하나씩 launch하는 동안 GPU가 쉰다. CUDA Graph는 한 번 정의한 그래프를 반복 launch해 CPU launch 비용을 줄인다. CUDA 수준에서는 토폴로지가 같으면 커널 파라미터와 메모리 주소를 갱신할 수 있지만, PyTorch CUDA Graphs(2.15 문서 기준 beta API)는 replay마다 같은 커널과 인자를 실행해 동적 shape를 금지하고 새 데이터는 캡처 입력 텐서에 복사한다. 발표는 프레임워크와 모델 서버를 밝히지 않았지만, 같은 제약 때문에 자주 나오는 batch 크기별로 최대 후보 수에 맞춰 미리 캡처하고 요청을 가장 가까운 크기로 padding한다. 최대 후보 수가 작으면 초과 요청이 일반 실행으로 빠지고, 크면 모든 요청의 padding과 메모리가 는다.
- **Dynamic batching:** 서버가 요청을 제한된 시간 동안 붙잡아 다른 요청과 묶는다. Triton 문서는 이를 지연을 늘려 처리량을 얻는 트레이드오프로 설명하고, `preferred_batch_size`는 대부분의 모델에 쓰지 말라고 권한다. 지연 목표가 엄격한 지면은 대기 시간을 짧게, 여유가 있는 지면은 지연 기준 안에서 batch를 키워 GPU당 처리량을 높인다.
- **병목 측정이 먼저다:** 요청 시간을 큐 대기, 전처리, 추론, 후처리로 나눠 보면 순수 추론보다 전후 처리와 워커 CPU가 먼저 한계에 닿을 수 있다(발표 사례).

## 발표 사례: 네이버 버티컬 모델

NAVER Engineering Day 10th 발표의 음성 인식 전사 기준이며 슬라이드는 대조하지 않았다. 콘텐츠 지면 수치는 채택된 A/B 테스트를 누적한 결과로 발표되었고, 실험 기간과 신뢰구간은 발표 음성에서 언급되지 않았다.

- 리트리버 4개(HSTU 기반 다중 관심 모델, 텍스트 임베딩 two-tower, Semantic ID 생성 모델, 이종 그래프 모델)와 통합 랭커를 홈피드와 클립 지면에 서빙한다.
- VM 전체로 홈피드 CTR 20% 증가, 클립 탭 CTR 7.3% 증가를 보고했다. 모델마다 강한 지면이 달랐다. HSTU 기반 모델은 홈피드에서 가장 컸지만 현재 콘텐츠 기준 연관 추천 비중이 큰 클립 뷰어에서는 재생 수가 소폭 줄었고, 그래프 모델은 작성자(채널) 관계 덕분에 클립 지면에서 강했다.
- 발표 시점에 진행 중이던, 광고 후보 단계의 기존 리트리버를 VM과 휴리스틱 랭커로 바꾼 실험은 eCPM과 매출을 올렸지만 CTR은 대조군보다 낮았다. 매출 지표와 클릭률 지표가 다르게 움직일 수 있으므로 지면 목표를 함께 본다.
- FM 증류는 통합 랭커에서 오프라인 기준 약 3% 상승으로 보고했다. 온라인 효과는 발표 음성에서 언급되지 않았다.
- 발표가 부른 일부 모델명은 같은 이름의 공개 논문(AlphaRec, PLUM)과 겹치지만, 네이버 모델이 그 논문을 따랐는지는 전사만으로 확인하지 못했다.

## 적용 점검

다음은 위 논문과 사례를 실무에 옮길 때의 점검 제안이다.

- 여러 지면의 행동을 합칠 때 지면마다 label과 액션 의미가 다르므로 액션 토큰 설계와 지면별 평가를 같이 둔다.
- 리트리버를 늘리기 전에 각 리트리버가 메우는 약점(신규 아이템, 순서, 지면 간 연결)을 적고, 병합 후 랭커 재점수화 기준을 정한다.
- 증류 pseudo-label은 FM 버전과 점수 생성 시각을 함께 기록하고, 학습 시점 이후 정보가 붙지 않게 시간 조인한다.
- 지면마다 지연 목표가 다르면 같은 랭커라도 CUDA Graph 크기와 batching 대기 시간을 지면별로 튜닝한다.

## 출처

- [Actions Speak Louder than Words: Trillion-Parameter Sequential Transducers for Generative Recommendations — ICML 2024, Jiaqi Zhai 외](https://arxiv.org/abs/2402.17152)
- [Recommender Systems with Generative Retrieval — NeurIPS 2023, Shashank Rajput 외](https://arxiv.org/abs/2305.05065)
- [External Large Foundation Model: How to Efficiently Serve Trillions of Parameters for Online Ads Recommendation — WWW 2025 Industrial Track, Mingfu Liang 외](https://arxiv.org/abs/2502.17494)
- [LoopFM: Learning frOm HistOrical RePresentations of Foundation Model for Recommendation — arXiv, Hua Zheng 외](https://arxiv.org/abs/2605.29280)
- [Modeling Relational Data with Graph Convolutional Networks — ESWC 2018, Michael Schlichtkrull 외](https://arxiv.org/abs/1703.06103)
- [LightGCN: Simplifying and Powering Graph Convolution Network for Recommendation — SIGIR 2020, Xiangnan He 외](https://arxiv.org/abs/2002.02126)
- [Qwen3 Embedding: Advancing Text Embedding and Reranking Through Foundation Models — arXiv, Yanzhao Zhang 외](https://arxiv.org/abs/2506.05176)
- [NVIDIA, CUDA Programming Guide: CUDA Graphs](https://docs.nvidia.com/cuda/cuda-programming-guide/04-special-topics/cuda-graphs.html)
- [PyTorch, CUDA semantics: CUDA Graphs](https://docs.pytorch.org/docs/stable/notes/cuda.html#cuda-graphs)
- [NVIDIA, Triton Inference Server: Batchers](https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/user_guide/batcher.html)
- [네이버 전 지면의 사용자 행동을 학습하는 추천 모델 개발기 — NAVER D2, NAVER Engineering Day 10th](https://www.youtube.com/watch?v=Cc22uWO8i5c)

## 관련 문서

- [[Recommendation-System-Candidate-Generation|후보 생성]]
- [[Recommendation-System-Multi-Interest-Modeling|다중 관심 사용자 표현]]
- [[Recommendation-System-Shared-Embedding-Space|통합 임베딩 공간과 범용 리트리버]]
- [[Recommendation-System-Ranking-Reranking|랭킹과 재랭킹]]
- [[Recommendation-System-Model-Serving-Platform|추천 모델 서빙 플랫폼]]
- [[Recommendation-System-Hubness-Popularity-Debiasing|허브니스와 사용자 무관 점수 성분]]
