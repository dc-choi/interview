---
tags: [gpu, cloud, neocloud, ai-infrastructure, training, inference, export-control]
status: done
verified_at: 2026-11-19
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["GPU Cloud Compute Sourcing", "GPU 클라우드와 AI 연산 조달", "Neocloud", "네오클라우드", "NVIDIA Cloud Partner"]
---

# GPU 클라우드와 AI 연산 조달

AI 연산은 GPU를 사서 직접 운영하거나, 범용 클라우드나 GPU 전문 클라우드에서 빌려 쓴다. 빌리는 경우에도 판단 대상은 GPU의 시간당 가격 하나가 아니다. 필요한 시점에 확보할 수 있는 용량, 클러스터의 연결 성능, 작업 전체의 비용, 공급자를 하나에 묶을지와 학습과 추론을 어디서 돌릴지를 함께 정한다.

## 왜 GPU 하나가 아니라 클러스터인가

- 작은 모델은 GPU 한 장이나 노트북에서도 추론할 수 있다. 큰 모델의 학습은 수천 개의 가속기가 한 작업을 나눠 몇 주 이상 계산하는 경우가 많다.
- 분산 학습에서는 각 GPU가 계산 일부를 맡고 중간 결과를 계속 주고받는다. 통신이 느리면 먼저 끝난 GPU가 기다리므로 GPU 수를 늘려도 작업 시간이 비례해 줄지 않는다.
- 그래서 대규모 학습 용량은 GPU, 고속 네트워크, 스토리지, 전력, 냉각과 운영 인력을 묶은 시스템이다. 칩을 살 돈이 있어도 데이터센터를 짓고 운영하는 일은 별도의 큰 사업이다. 서버 안의 통신 경로와 사용률 해석은 [[GPU-Server-Infrastructure|GPU 서버 인프라]], 시설은 [[Data-Center-Power-Distribution|데이터센터 전력]]과 [[Data-Center-Cooling|데이터센터 냉각]]에서 다룬다.

## 세 역할: 플랫폼 공급자, 클라우드 사업자, 고객

| 역할 | 하는 일 | 예 |
|---|---|---|
| 가속기와 플랫폼 공급자 | GPU와 연결 기술, 참조 설계를 공급한다 | NVIDIA |
| 클라우드 사업자 | 장비를 데이터센터에 넣고 연산 용량을 판다 | AWS, Azure, Google Cloud 같은 범용 클라우드, GPU 전문 클라우드 |
| 고객 | 용량을 빌려 모델을 학습하거나 서비스한다 | 모델을 만드는 AI 연구소, 모델 API로 제품을 만드는 회사 |

- **GPU 전문 클라우드(흔히 네오클라우드):** 데이터베이스, 큐, 스토리지 등 서비스 전반을 파는 범용 클라우드와 달리 대규모 GPU 클러스터와 그 운영에 집중한다. 개별 GPU 서버를 빌려 주는 형태부터 고속 네트워크로 묶은 수천 개 GPU를 장기 계약으로 공급하는 형태까지 있다. 범용 클라우드도 대규모 GPU 클러스터를 제공하므로 둘의 차이는 가능 여부보다 확보 가능한 수량, 납기, 클러스터 구성과 가격 조건에서 난다.
- **NVIDIA Cloud Partner(NCP):** NVIDIA Partner Network의 일부로, NVIDIA 가속 컴퓨팅 플랫폼을 쓰는 AI 클라우드 사업자 프로그램이다. NVIDIA는 NCP 참조 설계로 구축한 Reference Platform NCP를 따로 표시하며, 2026-11-19 확인한 파트너 페이지에는 Crusoe, Lambda, Nebius 등이 Reference Platform NCP로 올라 있다. 전체 파트너 목록은 별도 마켓플레이스 페이지에 있어 여기서는 확인하지 않았다.
- **모델 개발과 모델 사용의 구분:** 모델을 연구하고 학습하는 AI 연구소와, 그 모델의 API를 호출해 고객 지원 챗봇을 만드는 회사는 필요한 연산의 규모와 형태가 다르다. 후자는 대개 학습 클러스터가 아니라 API 요금과 추론 지연을 관리한다.

## 연산을 고르는 기준

- **용량과 납기:** 다음 달 학습을 시작해야 하는데 한 공급자가 필요한 수량의 일부만 줄 수 있다면, 큰 연결 클러스터를 먼저 줄 수 있는 공급자가 시간당 단가 차이보다 중요해질 수 있다. 출시 일정이 걸린 학습에서는 장비를 기다리는 비용이 크다.
- **클러스터 성능:** 같은 GPU라도 네트워크 구성과 지연이 다르면 같은 학습을 끝내는 시간이 달라진다. 수천 대를 몇 주 쓰는 작업에서는 이 차이가 총비용을 바꾼다.
- **작업 전체 비용:** GPU 전문 클라우드가 범용 클라우드보다 자동으로 싸지 않다. 실제 작업의 완료 시간, 스토리지와 네트워크 비용, 장비 사용률을 함께 비교한다. 전용 장기 계약은 단가가 유리할 수 있지만 쓰지 않는 시간에도 비용을 낸다.
- **공급자 분산:** 공급이 빠듯할 때 여러 공급자와 계약해 두면 선택지가 늘어난다. 다만 하나의 대형 학습 작업은 밀결합 클러스터가 필요해 여러 회사의 클라우드에 자동으로 나눠 돌리지 않는다. 분산은 학습 실행, 모델 버전과 추론 서비스 단위로 나누는 것으로 이해한다.

### 공개된 조달 사례 (2026-11-19 대조)

아래는 발표 시점별 일부 사례이며 전체 약정 목록이 아니다. 이후에도 확대 발표가 이어지므로 최신 약정은 각 회사의 발표로 다시 확인한다.

- **Anthropic:** 2025-10-23 발표에서 Google TPU, Amazon Trainium, NVIDIA GPU의 세 칩 플랫폼을 쓰는 분산 전략을 밝히고, 최대 100만 개 TPU를 포함해 Google Cloud 사용을 확대해 2026년에 1GW를 크게 넘는 용량을 가동할 계획이라고 했다. 같은 발표에서 Amazon을 주된 학습 파트너이자 클라우드 사업자로, 여러 미국 데이터센터에 걸친 Project Rainier 클러스터 작업을 계속한다고 했다. 2025-11-18 발표에서는 300억 달러의 Azure 연산 용량 구매 약정과 최대 1GW의 추가 용량 계약을 밝혔고, Anthropic의 연산 약정은 초기에 NVIDIA Grace Blackwell과 Vera Rubin 시스템으로 최대 1GW라고 했다. 이 1GW와 Azure 추가 1GW의 관계는 발표문에 없으므로 합산하지 않는다. 2026-04-10에는 CoreWeave가 Claude 모델의 개발과 배포를 지원하는 Anthropic과의 다년 계약을 발표했으며, 금액과 기간은 밝히지 않았다.
- **OpenAI와 CoreWeave:** 2025-03-10 CoreWeave는 OpenAI의 모델 학습과 서비스에 전용 연산 용량을 공급하는 최초 계약을 발표했다. 당시 계약 가치는 최대 119억 달러이고, OpenAI는 3억 5천만 달러 규모의 CoreWeave 주식을 받아 투자자가 된다. 발표문에는 계약 기간이 없다. 이후 2025-05(최대 40억 달러)와 2025-09-25(최대 65억 달러) 확대로, 회사 발표 기준 누적 계약 가치는 최대 약 224억 달러가 됐다.
- 이 사례들은 AI 연구소가 범용 클라우드, 여러 회사의 가속기와 GPU 전문 클라우드를 함께 쓰는 형태가 있음을 보여 줄 뿐, 실제 작업 배분이나 계약 이행 상황을 보여 주지 않는다. 발표 수치는 구매 약정액, 상한(최대) 또는 기대치이며 집행액이 아니다. 항목별 성격은 위 문장의 표현(약정, 최대, 넘는)을 따른다. 계약 구조가 기업 재무에 주는 영향은 [[AI-Infrastructure-Capital-Cycle|AI 인프라 투자와 자본 순환]]에서 다룬다.

## 학습과 추론은 배치 기준이 다르다

| 구분 | 무엇을 하나 | 배치에서 중요한 것 |
|---|---|---|
| 학습 | 데이터로 모델의 가중치를 조정한다 | 많은 가속기를 한 곳의 밀결합 클러스터에 모으는 것. 사용자 근처일 필요는 없다 |
| 추론 | 학습된 모델로 요청에 답한다 | 응답 시간, 고객이 있는 지역, 전력과 냉각, 운영비 |

- 추론 서버가 사용자와 가까우면 네트워크 왕복 시간이 줄어든다. 그러나 생성 모델은 정적 파일을 내려 주는 CDN과 달리 요청마다 큰 계산을 하므로, 생성 시간이 길수록 왕복 단축의 효과는 상대적으로 작아진다.
- 큰 모델을 모든 리전에 상시 띄워 두면 비용이 크다. 그래서 추론 위치는 지연 목표와 비용, 전력 확보 가능성을 함께 놓고 정한다. 데이터 보관 위치와 규제가 걸린 경우의 운영 주권은 [[SaaS-Regional-Data-Isolation|SaaS 리전별 데이터 격리]]의 논의와 연결된다.

## 원격 접근과 수출 통제

- 클라우드에서는 연산을 쓰는 사람과 물리 GPU가 다른 나라에 있을 수 있다. 칩을 사지 않고 제3국 데이터센터의 GPU 서버에 작업을 보내 결과만 받으면 칩은 국경을 넘지 않는다.
- 따라서 칩의 선적지를 통제하는 일과, 그 칩의 연산을 누가 원격으로 쓰는지 통제하는 일은 다른 문제다. 2026-11-11 업로드된 영상의 설명(아래 규칙 발표 이전 기준)은 원격 GPU 사용이 일괄적으로 불법은 아니며 칩, 이용자, 서비스와 용도에 따라 판단이 갈린다는 것이었다. 이 설명은 아래 규칙 이후의 법적 지위로 쓰지 않는다.
- 미국 상무부 산업안보국(BIS)은 2026-11-16 원격 접근을 다루는 임시 최종 규칙(IFR)을 발표했다. 보도자료는 대상을 첨단 초지능(SI) 칩과 서버로 표현하고, 보도자료가 연결한 연방 관보 공개 열람 문서(FR Doc 2026-23529)의 제목은 Addressing Remote Access to Advanced Semiconductors다. 발표문은 기존 제한이 제3국 데이터센터를 이용한 원격 컴퓨팅으로 우회되지 않게 하고, 원격 접근에 대한 보호를 물리적 선적 통제와 맞추는 것을 목적으로 든다. 관보 게재본의 본문, 적용 대상 칩, 시행일과 의견 수렴 기간은 이 문서에서 확인하지 않았으므로 실제 의무는 규칙 원문으로 판단한다.
- 칩 수출 통제가 AI 규제 논쟁에서 갖는 위치는 [[AI-Frontier-Regulation-Debate|프런티어 AI 규제 논쟁]]에서 다룬다.

## 확인 질문

- 필요한 것이 학습 클러스터인가, 추론 용량인가, 모델 API인가?
- 비교한 비용이 GPU 시간당 단가인가, 같은 작업을 끝내는 데 드는 전체 비용인가?
- 필요한 수량을 언제까지 한 클러스터로 받을 수 있는가? 공급자를 바꾸거나 나눌 때 학습 작업의 단위는 무엇인가?
- 추론 위치를 정할 때 네트워크 왕복과 생성 시간 중 어느 쪽이 응답 시간을 지배하는가?
- 고객, 데이터센터와 칩이 서로 다른 나라에 있을 때 적용되는 수출 통제와 이용자 확인 의무를 원문으로 확인했는가?

## 출처

- [How China Is Getting NVIDIA GPUs Despite the Ban: The Megaspeed Files — ByteMonk (YouTube)](https://www.youtube.com/watch?v=icK1JRoEb2E) — 2026-11-11 업로드, 음성 인식 전사문 기준. GPU 클러스터, GPU 전문 클라우드, 학습과 추론의 배치, 원격 접근의 설명 구조
- [NVIDIA, NVIDIA Cloud Partners](https://www.nvidia.com/en-us/data-center/gpu-cloud-computing/partners/) — NCP의 정의, 참조 설계와 Reference Platform NCP 목록, 2026-11-19 확인
- [CoreWeave Announces Agreement with OpenAI to Deliver AI Infrastructure — CoreWeave](https://investors.coreweave.com/news/news-details/2025/CoreWeave-Announces-Agreement-with-OpenAI-to-Deliver-AI-Infrastructure/default.aspx) — 2025-03-10 발표, 최초 계약 가치와 지분 발행, 2026-11-19 대조
- [CoreWeave Expands Agreement with OpenAI by up to $6.5B — CoreWeave](https://investors.coreweave.com/news/news-details/2025/CoreWeave-Expands-Agreement-with-OpenAI-by-up-to-6-5B/) — 2025-09-25 발표, 5월과 9월 확대분과 누적 계약 가치, 2026-11-19 대조
- [CoreWeave Announces Multi-Year Agreement With Anthropic — CoreWeave](https://investors.coreweave.com/news/news-details/2026/CoreWeave-Announces-Multi-Year-Agreement-With-Anthropic/default.aspx) — 2026-04-10 발표, 계약 목적과 금액 및 기간 비공개, 2026-11-19 대조
- [Expanding our use of Google Cloud TPUs and Services — Anthropic](https://www.anthropic.com/news/expanding-our-use-of-google-cloud-tpus-and-services) — 2025-10-23 발표, 세 칩 플랫폼과 TPU 확대, 2026-11-19 대조
- [Microsoft, NVIDIA, and Anthropic announce strategic partnerships — Anthropic](https://www.anthropic.com/news/microsoft-nvidia-anthropic-announce-strategic-partnerships) — 2025-11-18 발표, Azure 연산 구매 약정과 NVIDIA 용량, 2026-11-19 대조
- [BIS Issues Rule Addressing Remote Access to American Super Intelligence Technology — Bureau of Industry and Security](https://www.bis.gov/press-release/bis-issues-rule-addressing-remote-access-american-super-intelligence-technology) — 2026-11-16 보도자료의 날짜, 대상 표현과 목적 대조. 규칙 본문은 확인하지 않음

## 관련 문서

- [[GPU-Server-Infrastructure|GPU 서버 인프라]]
- [[GPU-Inference-Hardware|추론용 GPU 선택]]
- [[Data-Center-Power-Distribution|데이터센터 전력 공급과 이중화]]
- [[Data-Center-Cooling|데이터센터 냉각과 PUE]]
- [[AI-Infrastructure-Capital-Cycle|AI 인프라 투자와 자본 순환]]
- [[AI-Frontier-Regulation-Debate|프런티어 AI 규제 논쟁]]
