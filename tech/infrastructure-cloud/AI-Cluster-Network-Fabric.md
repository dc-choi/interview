---
tags: [infrastructure, network, gpu, distributed-training, rdma, nvlink, infiniband, roce]
status: done
verified_at: 2026-11-19
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["AI Cluster Network Fabric", "AI 학습 클러스터 네트워크", "GPU 백엔드 네트워크"]
---

# AI 학습 클러스터의 네트워크: 스케일업과 스케일아웃

대규모 학습 클러스터의 네트워크는 GPU를 몇 개의 층으로 나눠 잇는다. 가까운 GPU는 전용 상호 연결로 한 덩어리처럼 묶고(스케일업), 그 덩어리 여럿은 서버 사이의 전용 네트워크로 잇는다(스케일아웃). 학습 데이터, 체크포인트와 로그는 또 다른 망이 맡는다. 연산 성능만큼 이 경로들의 대역폭, 혼잡과 배치가 학습 속도를 좌우한다.

## 집단 통신과 가장 느린 경로

데이터 병렬 학습에서 각 GPU는 받은 데이터 조각으로 gradient를 계산하고, step마다 모든 GPU의 값을 합쳐 다시 모두에게 나눠 준다. 이 통신이 AllReduce이며, 여러 GPU가 함께 참여하는 통신을 collective(집단 통신)라 한다. 모델 자체를 여러 GPU에 나눠 담으면 계산 도중에도 중간 결과를 주고받는다.

동기식 학습은 모든 참여자가 통신을 마쳐야 다음 step으로 넘어간다. 그래서 고장 나지 않았지만 느린 GPU나 혼잡한 링크 하나가 나머지 GPU를 기다리게 만든다. Llama 3 논문은 이런 straggler 하나가 수천 개 GPU를 느리게 할 수 있고, 겉으로는 정상 동작하지만 느린 통신으로 보이는 경우가 많다고 적는다. 따라서 이 네트워크는 최고 속도보다 어느 경로로 가도 고르게 빠른지가 중요하다. straggler 진단과 장애 재개는 [[GPU-Server-Infrastructure#멈추지 않고 느려진 노드도 학습을 지연시킨다|GPU 서버 인프라]]에서 다룬다.

## 스케일업: 랙 안의 NVLink 도메인

서버 한 대 안의 GPU 8개는 NVLink로 직접 연결되는 구성이 흔하다. GB200 NVL72는 이 도메인을 랙 단위로 넓힌다. 랙에 Grace CPU 36개와 Blackwell GPU 72개를 담고 GPU 72개를 하나의 NVLink 도메인으로 묶는다. NVIDIA는 이를 하나의 거대한 GPU처럼 동작한다고 설명한다. 이 문서의 해석으로는 이는 통신 도메인의 설명이며 72개의 메모리가 한 GPU의 로컬 메모리처럼 같은 속도로 접근된다는 뜻은 아니다.

| 항목 | GB200 NVL72 공식 사양(2026-11-19 확인) |
| --- | --- |
| 구성 | Grace CPU 36개, Blackwell GPU 72개, 액체 냉각 랙 |
| GPU 사이 대역폭 | 5세대 NVLink, GPU당 1.8 TB/s(DGX SuperPOD 문서 기준 B200 GPU마다 NVL5 링크 18개의 합계) |
| NVLink 도메인 전체 | 130 TB/s |

병렬화 방식의 배치도 이 층 구조를 따른다. Llama 3 논문은 병렬화 차원을 TP(tensor), CP(context), PP(pipeline), DP(data) 순서로 두어 TP를 가장 안쪽, DP를 가장 바깥쪽에 배치하고, 가장 안쪽 차원이 가장 높은 대역폭과 낮은 지연을 요구하므로 대개 같은 서버 안에 둔다고 적는다. NVLink의 GB/s 수치와 NIC의 Gb/s 수치를 비교할 때는 단위를 맞추고, 각 수치가 단방향인지 양방향 합계인지 사양에서 확인한다.

스케일업은 NVIDIA 전용 개념이 아니다. UALink Consortium은 가속기 사이의 load, store와 atomic 연산을 위한 개방형 스케일업 규격을 2025년 4월 처음 공개했다. 이 UALink 200G 1.0 규격은 한 AI pod에 최대 1,024개 가속기 연결을 지원한다고 설명하며, 2026-11-19 확인한 규격 페이지에는 2.0 계열 후속 규격도 올라 있다. 규격 공개는 제품 출하나 상호 운용 검증과 다르므로 도입 판단에서는 실제 제품 지원을 따로 확인한다.

## 스케일아웃: 백엔드 네트워크와 RDMA

서버와 랙 사이에서 GPU끼리 결과를 주고받는 전용 망을 백엔드 네트워크라 한다. 핵심 기술은 RDMA로, 상대 서버의 CPU 개입과 중간 복사 없이 메모리에서 메모리로 데이터를 옮겨 지연을 줄인다. 구현은 크게 둘이다.

- **InfiniBand**: HPC에서 오래 써 온 전용 상호 연결이다.
- **RoCE(RDMA over Converged Ethernet)**: 이더넷 위에서 RDMA를 쓰게 하는 방식이다.

둘 중 하나만 정답이라고 보지 않는다. Meta는 2024년 24,576 GPU 규모 클러스터 두 개를 하나는 RoCE, 하나는 NVIDIA Quantum2 InfiniBand로 구성했고(둘 다 400 Gbps endpoint), 두 클러스터 모두 대형 생성형 AI 학습에 썼다고 밝혔다. Llama 3 405B는 RoCE 클러스터에서, 더 작은 Llama 3 모델들은 InfiniBand 클러스터에서 학습했으며 두 망을 같은 수준의 성능이 나오도록 조정했다고 논문에 적혀 있다. 이 사례는 조정 작업을 전제로 한 결과이며 기본 설정의 이더넷이 같은 성능을 낸다는 근거가 아니다.

이더넷을 AI와 HPC에 맞게 다듬는 표준 작업도 있다. Ultra Ethernet Consortium은 2025-06-11 Specification 1.0을 공개했다. NIC, 스위치, 광학과 케이블까지 네트워크 스택 전 계층을 다루고 여러 벤더 장비의 통합을 목표로 하는 이더넷 기반 통신 스택이다. 2026-11-19 확인한 UEC 홈페이지는 현행 배포본을 UE Specification 1.1로 표시한다(1.1의 변경 내용은 확인하지 않았다).

## 망을 짜는 방식: 레일, 리프와 스파인

GPU 서버에는 보통 GPU마다 백엔드용 NIC를 하나씩 짝지어 단다. 여러 서버에서 같은 번호의 NIC끼리 같은 리프 스위치로 모으는 구성을 레일(rail)이라 부른다. NVIDIA DGX SuperPOD GB200 참조 아키텍처는 각 compute 랙을 rail-aligned로 두어, 같은 Scalable Unit 안에서 같은 레일의 트래픽은 다른 compute tray까지 한 hop이고 다른 랙이나 다른 레일로 가는 트래픽은 스파인 층을 거친다고 설명한다. 같은 문서의 SLG 설계는 레일마다 compute 랙당 leaf 1대를 두므로, 한 hop 범위를 SU 전체로 넓혀 읽지 않고 실제 leaf 배치로 확인한다.

리프(leaf) 위에 스파인(spine)을 두는 Clos 구조에서 리프로 들어오는 링크만큼 위로 올라가는 링크를 두면 모든 GPU가 동시에 보내도 총 대역폭이 부족하지 않은 non-blocking 구조가 된다. DGX SuperPOD 문서는 SU마다 fully non-blocking fat tree를 구성한다고 적는다. 반대로 매우 큰 클러스터는 최상위 층을 의도적으로 oversubscription으로 두기도 한다(Meta 사례). Llama 3 405B를 학습한 RoCE 클러스터는 3,072 GPU pod 안은 full bisection bandwidth였지만 pod 사이를 잇는 aggregation 층은 논문 표기로 1:7 oversubscription이었다. 그래서 non-blocking이라는 표현은 어느 범위까지인지 확인한다. 비율은 출처마다 표기 방향이 다르므로(아래 DGX SuperPOD의 5:3은 NVIDIA의 blocking factor 표기) 각 출처의 표기를 그대로 옮긴다.

oversubscription이 있는 망에서는 작업 배치가 성능을 바꾼다. Llama 3 논문은 스케줄러가 네트워크 토폴로지를 알고 pod 사이 통신을 줄이도록 배치했다고 적는다. Meta의 RoCE 운영 글도 AI Zone 사이 연결이 설계상 oversubscription이며, 스케줄러가 AI Zone 사이 트래픽을 줄이도록 배치한다고 적는다.

### 부하 분산과 혼잡

학습 트래픽은 소수의 큰 흐름(fat flow)이라 흐름 해시로 경로를 나누는 ECMP만으로는 고르게 분산되지 않는다. 경로를 고정하는 방식에도 함정이 있다. Meta는 목적지에 따라 경로를 고정하던 path pinning 단계에서, 랙의 일부 호스트만 한 작업에 배정되는 분할 배치가 생기자 특정 랙 스위치(RTSW)의 uplink에 트래픽이 몰려 학습 성능이 최대 30% 넘게 떨어졌다고 밝혔다. uplink 대역폭을 2배로 늘린 조치는 비용이 큰 단기 완화였고, 이후 QP scaling과 Enhanced-ECMP로 라우팅을 바꿨다.

Llama 3 논문 기준으로 collective 라이브러리가 두 GPU 사이에 흐름을 1개 대신 16개 만들고 Enhanced-ECMP로 이를 여러 경로에 나눴으며, 스파인에는 일시적 혼잡을 흡수할 deep-buffer 스위치를 두었다. 이 클러스터는 DCQCN 같은 전통적 혼잡 제어 없이 운영했지만, Meta 운영 글은 400G 구간에서 PFC 흐름 제어와 collective 라이브러리의 수신 측 유입 제어를 둔 채 DCQCN을 쓰지 않았다고 밝힌다. 흐름 제어가 전혀 없었다는 뜻이 아니며, 특정 규모와 구성의 사례이므로 일반 원칙으로 옮기지 않는다.

## 백엔드와 프런트엔드 망을 나눈다

| 망 | 맡는 일 |
| --- | --- |
| 스케일업(NVLink 등) | 랙이나 서버 안 GPU 사이의 최고 대역폭 통신 |
| 백엔드(compute fabric) | 서버 사이 GPU의 collective 통신, pod나 AI Zone, SU 같은 범위 안에서 RDMA NIC를 non-blocking으로 연결 |
| 프런트엔드와 스토리지 | 데이터 적재, 체크포인트 저장, 로그 |
| 관리망 | in-band와 out-of-band 관리 |

Meta는 프런트엔드 망이 데이터 적재, 체크포인트와 로깅을, 학습 전용 백엔드 망이 학습 통신을 맡도록 분리했다. 용어 사용은 출처마다 다르다. Meta의 RoCE 운영 글은 랙 안 GPU를 잇는 이더넷 leaf(RTSW) 구간을 scale-up, 스파인(CTSW) 구간을 scale-out이라 불러 이 문서의 NVLink 기준 구분과 다르다. DGX SuperPOD GB200 참조 아키텍처는 NVLink, compute, storage, in-band 관리와 out-of-band 관리의 다섯 논리 망을 네 개의 물리 망에 싣는다. 그 문서에서 compute 망은 SU 단위 non-blocking이지만 노드 쪽 storage 망은 5:3 blocking이다. 체크포인트 저장 시간은 백엔드 대역폭이 아니라 스토리지 경로에서 확인한다.

랙 안 가까운 구간은 구리 케이블을 쓰지만 거리가 먼 스위치 구간은 광 모듈을 쓰는 경우가 많다. Meta의 AI Zone도 랙 스위치와 스파인을 single-mode fiber와 400G pluggable transceiver로 잇는다. 전기와 광 변환 위치를 옮기는 CPO는 [[Optical-Interconnect-and-CPO|광통신과 CPO]], 케이블과 커넥터는 [[Data-Center-Fiber-Cabling-and-Testing|데이터센터 광케이블]], 고밀도 랙의 액체 냉각은 [[Data-Center-Cooling|데이터센터 냉각]]에서 다룬다.

## 도입과 임대 검토 질문

다음은 위 구조에서 도출한 검토 제안이다.

- 몇 개의 GPU가 하나의 스케일업 도메인으로 묶이는가?
- 스케일업 도메인 밖으로 GPU 하나당 얼마의 백엔드 대역폭이 나가며, 그 수치는 단방향인가 양방향인가?
- 백엔드 망은 어느 범위까지 non-blocking이고, 그 위 층의 oversubscription 비율은 얼마인가?
- 작업 스케줄러가 토폴로지를 고려해 배치하는가, 랙을 쪼개 배치할 수 있는가?
- 체크포인트와 데이터 적재는 어느 망을 쓰고, 그 망의 blocking 비율은 얼마인가?
- 클라우드 임대라면 인스턴스 사양에 NVLink, 백엔드 네트워크와 일반 네트워크 대역폭이 따로 적혀 있는가?

GPU 클라우드의 조달과 비용 구조는 [[GPU-Cloud-Compute-Sourcing|GPU 클라우드와 AI 연산 조달]]에서 이어진다. 이 문서는 공개 사양과 운영 사례를 대조한 것이며 실제 클러스터의 대역폭 측정이나 학습 성능 시험은 하지 않았다.

## 출처

- [The Llama 3 Herd of Models — Meta, Llama Team](https://arxiv.org/html/2407.21783v3) — 3.3.1절 클러스터 구성과 부하 분산, 3.3.2절 병렬화 순서, 3.3.4절 straggler
- [Building Meta's GenAI Infrastructure — Engineering at Meta](https://engineering.fb.com/2024/03/12/data-center-engineering/building-metas-genai-infrastructure/)
- [RoCE networks for distributed AI training at scale — Engineering at Meta](https://engineering.fb.com/2024/08/05/data-center-engineering/roce-network-distributed-ai-training-at-scale/)
- [NVIDIA, GB200 NVL72](https://www.nvidia.com/en-us/data-center/gb200-nvl72/)
- [NVIDIA DGX SuperPOD Reference Architecture (GB200), Network Fabrics](https://docs.nvidia.com/dgx-superpod/reference-architecture-scalable-infrastructure-gb200/latest/network-fabrics.html)
- [Ultra Ethernet Consortium (UEC) Launches Specification 1.0 — Ultra Ethernet Consortium](https://ultraethernet.org/ultra-ethernet-consortium-uec-launches-specification-1-0-transforming-ethernet-for-ai-and-hpc-at-scale/)
- [Ultra Ethernet Consortium](https://ultraethernet.org/) — 2026-11-19 현행 배포본 1.1 표시
- [About UALink — UALink Consortium](https://ualinkconsortium.org/about-ualink/)
- [UALink Consortium, Specifications](https://ualinkconsortium.org/specification/) — 200G 1.0의 1,024 가속기 지원과 2.0 계열 후속 규격
- [YouTube, 동국시스템즈 IT 채널, GPU 수만 장을 잇는 법, AI 데이터센터 네트워크 (IT 인프라 기초 9-3)](https://www.youtube.com/watch?v=jcY2kfGaU8w) — 2026-11-13 업로드, 계기 자료. 1차 출처로 확인하지 못한 수치(타사 72 GPU 랙, GPU당 NIC 대역폭과 배수, 광 모듈과 CPO의 포트당 전력, 랙 전력 배수)는 옮기지 않았다

## 관련 문서

- [[GPU-Server-Infrastructure|GPU 서버 인프라]]
- [[Optical-Interconnect-and-CPO|광통신과 CPO]]
- [[Data-Center-Fiber-Cabling-and-Testing|데이터센터 광케이블 구성과 인증 시험]]
- [[Data-Center-Cooling|데이터센터 냉각과 PUE]]
- [[GPU-Cloud-Compute-Sourcing|GPU 클라우드와 AI 연산 조달]]
- [[EC2-Compute#HPC의 통신 경로와 EFA 적용 조건|HPC 통신 경로와 EFA]]
- [[Switch-Hierarchy-and-Uplink|스위치 계층과 uplink]]
- [[인프라&클라우드(Infrastructure&Cloud)|인프라와 클라우드 인덱스]]
