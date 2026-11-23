---
tags: [ai, llm, sovereign-ai, on-premise, governance, regulation, inference, open-source]
status: done
verified_at: 2026-11-23
category: "AI엔지니어링(AIEngineering)"
aliases: ["Sovereign AI Platform", "주권형 AI 플랫폼", "소버린 AI", "Sovereign AI", "AI 주권", "온프레미스 AI 플랫폼"]
---

# 주권형 AI 플랫폼: 망분리 다음에 통제할 계층

## 정의

주권형 AI(sovereign AI)는 조직이 AI를 어디서 돌리고 어떤 모델과 가속기를 쓰며 누가 그 자원을 얼마나 썼는지를 스스로 정하고, 그 결정을 근거로 설명할 수 있는 상태다. 데이터를 국내나 사내에 두는 것은 그 일부다. Red Hat 블로그(2026-08-19)는 이를 데이터 주권(민감 정보의 저장과 처리 위치), 모델 주권(배포하고 미세조정할 모델의 선택), 인프라 주권(워크로드의 실행 위치와 하드웨어의 선택)으로 나누고, 플랫폼이 한 벤더의 하드웨어에서만 효율적으로 돌면 데이터와 모델이 독립적이어도 가격, 공급과 기술 로드맵은 그 벤더에 묶인다고 적는다.

국가 전략과 지정학은 [[AI-Infra-Geopolitics|AI 인프라 지정학]], 업무 PC와 협업 도구의 자율성은 [[Sovereign-Workplace-Stack|디지털 자율 업무환경]]이 다룬다. 이 문서는 기업이 자체 AI 플랫폼을 구성하고 운영할 때의 통제 계층을 다룬다.

## 망분리가 통제하는 것과 못 하는 것

한국레드햇 발표(2026년 9월)는 국내 기업 대부분이 망분리로 데이터의 위치와 외부 경로를 이미 통제한다고 전제하고, 망분리는 네트워크 경계의 통제이며 AI 스택의 통제는 별개라고 구분했다. 국내 규제의 망분리 요구는 금융과 이용자 수가 일일평균 100만명 이상인 개인정보처리자처럼 대상과 범위가 정해져 있다. 공공은 2026-05-01 개정 국가 사이버보안 기본지침이 내부망과 인터넷망 분리 조항을 삭제하고 N2SF 절을 새로 둬 등급별 통제로 바뀌었다([[Network-Separation#국내 규제가 요구하는 범위|국내 규제 범위]], 링크 문서 기준). 이 전제는 해당 조직과 업무 등급을 기준으로 읽는다.

| 망분리로 이미 통제하는 것 | 망분리로 통제되지 않는 것 |
|---|---|
| 데이터가 저장되는 물리적 위치 | 모델의 출처와 학습 데이터 |
| 외부 네트워크 접근 차단 | 가속기와 모델의 벤더 종속 |
| 반입, 반출 절차와 승인 | 모델 업데이트와 동작 변경 |
| 시스템 접근 계정 관리 | GPU 사용 주체와 사용량 |

오른쪽 열은 폐쇄망 안에서도 그대로 남는다. 반입한 모델이 무엇으로 학습됐는지, 새 판이 동작을 어떻게 바꿨는지, 특정 가속기 없이 서비스를 이어 갈 수 있는지는 경계를 닫아도 답이 나오지 않는다(해석). 망분리 방식과 국내 규제 범위는 [[Network-Separation|망분리]]를 따른다.

## 규제 요구를 세 질문으로 묶는다

발표 자료는 여러 규제의 요구가 세 질문으로 모인다고 정리했다. 조문 연결은 발표 자료의 것이고, 각 조문의 대조 상태를 함께 적는다.

1. **실행 환경을 통제하는가:** 데이터와 워크로드를 어디서 처리할지 조직이 정하는가.
   - 전자금융감독규정 제15조 제1항 제5호는 전산실 정보처리시스템과 그 시스템에 직접 접속하는 단말기를 외부통신망에서 물리적으로 분리하게 한다([[Network-Separation#국내 규제가 요구하는 범위|국내 규제 범위]], 2026-09-23 대조). 위치와 경계의 통제라 이 질문에만 답한다(해석).
   - 개인정보 보호법 제28조의8은 국외 이전에 조회를 포함하고 허용 근거와 보호조치를 요구한다([[Privacy-Operations-for-Small-Business#외주업체와 클라우드에 맡겨도 되는가|국외 이전]], 링크 문서의 2026-09-11 시행본 기준 대조).
   - GDPR은 EEA 밖으로의 개인정보 이전을 제5장의 조건에 따라서만 허용하며, 기본 경로는 적정성 결정과 적절한 보호조치다(EDPB 안내, 2026-11-23 대조).
   - 저장 위치와 별개로 공급자를 관할하는 나라의 제출 명령이 미칠 수 있다([[SaaS-Regional-Data-Isolation#데이터 위치와 미국 CLOUD Act의 제출 명령|CLOUD Act의 제출 명령]]).
2. **모델과 처리를 증명하는가:** 어떤 모델을 무엇으로 학습해 어떻게 썼는지 근거로 설명하는가.
   - AI 기본법 제34조는 고영향 AI 사업자에게 위험관리, 설명 방안, 이용자 보호, 사람의 관리와 감독, 조치 문서의 작성과 보관을 요구한다([[AI-Basic-Act-Scope-and-Obligations#고영향 AI 해당 여부를 먼저 검토한다|고영향 AI 책무]], 2026-10-20 대조).
   - EU AI Act 제11조는 고위험 AI의 기술문서를 시장 출시나 서비스 개시(put into service) 전에 작성해 최신으로 유지하게 하고, 제12조는 시스템 수명 동안 이벤트 로그를 자동으로 기록할 수 있게 하라고 요구한다(AI Act Service Desk, 2026-11-23 대조). 고위험 의무의 적용 시점 연기는 [[Agent-Ready-Data#추적 — agentic lineage|에이전트용 데이터 준비]]를 따른다.
3. **공급 리스크에서 연속성을 지키는가:** 특정 벤더나 하드웨어에 서비스 연속성이 묶이지 않는가.
   - EU의 DORA는 금융기관의 ICT 제3자 위험 관리를 한 축으로 둔다(EIOPA 안내, 2026-11-23 확인). 발표 자료가 든 제28~30조(제3자 관리)와 제29조(집중 위험 평가)의 조문은 EUR-Lex 원문을 이 환경에서 받지 못해 대조하지 못했다.

세 질문은 서로 다른 규제에서 나왔지만 같은 플랫폼에서 함께 답해야 한다. 실행 위치를 국내로 옮겨도 모델 증명과 공급 연속성은 따로 남는다.

## 세 계층의 독립성

| 계층 | 묶이면 생기는 위험 | 독립성을 주는 수단 | 확인할 것 |
|---|---|---|---|
| 가속기 | 공급 집중, 수출 통제, 긴 납기와 가격 상승 | 하드웨어를 추상화한 추론 엔진, 이종 풀을 한 엔드포인트로 묶는 라우팅 | 모델별로 실제 지원되는 엔진 판과 양자화, 풀별 품질 |
| 모델 | 블랙박스 동작, 불명확한 학습 데이터와 라이선스, 판 교체에 따른 동작 변경 | 가중치를 보유한 공개 모델, 개방 범위와 라이선스의 명시 | 공개된 구성요소, 라이선스 조건, 도메인 평가 |
| 운영 환경 | 클라우드 집중, 역외 관할, 독점 스택으로 인한 이전 불가 | 온프레미스, 소버린 클라우드와 퍼블릭에서 같은 플랫폼 | 같은 정책과 이미지로 옮겨지는지, 로컬에서 운영할 수 있는지 |

- **가속기:** vLLM은 NVIDIA CUDA, AMD ROCm, Intel XPU를 본체에서 지원하고, 그 밖의 가속기는 본 저장소 밖의 하드웨어 플러그인으로 붙는다(2026-11-23 설치 문서 기준). llm-d는 2026-03-12 CNCF Sandbox로 승인됐고, 2026년 10월의 1.0을 NVIDIA, AMD, Intel GPU와 Google TPU에서 vLLM과 SGLang으로 검증했다고 밝힌다. 엔진이 장비를 지원하는 것과 특정 모델이 그 장비에서 같은 품질로 도는 것은 다르다. 이종 풀의 품질과 비교 단위는 [[LLM-Inference-Fleet-Efficiency#이종 가속기 풀|이종 가속기 풀]], 세 벤더를 한 풀로 묶은 실험은 [[LLM-Inference-Fleet-Cases#사례 2: llm-d의 3사 혼합 풀 실험|llm-d 3사 혼합 풀 실험]]을 따른다.
- **모델:** 가중치를 가져야 학습 데이터, 동작과 비용을 설명할 바탕이 생긴다. 다만 공개 모델의 개방 범위는 제각각이다. MOF(Model Openness Framework)는 모델을 완전성과 개방성으로 매기는 3단계 등급 체계이며, 등급마다 공개해야 할 코드, 데이터와 문서 구성요소와 그 라이선스를 정한다. Linux Foundation과 PyTorch Foundation이 2025년 내놓은 OpenMDW(현재 1.1)는 가중치, 데이터, 문서와 소프트웨어를 한 묶음으로 다루는 허용형 라이선스이고, 어떤 구성요소를 공개할지는 강제하지 않는다. 가중치가 공개돼도 학습 데이터는 비공개일 수 있으므로 등급과 라이선스를 따로 본다.
- **운영 환경:** 같은 플랫폼을 각 위치에서 같은 방식으로 운영해야 옮길 수 있다. 관리 콘솔, 정책, 이미지와 모델 레지스트리 중 하나라도 외부 서비스에 기대면 그 부분이 이전과 단절의 경계가 된다(해석). 데이터 위치와 운영 주권의 차이는 [[SaaS-Regional-Data-Isolation#데이터 위치와 운영 주권의 경계|운영 주권의 경계]]를 따른다.

## GPU 사용을 보이게 한다

GPU를 직접 사 놓고도 누가 얼마나 쓰는지 모르면 통제를 증명할 수 없다. 발표 자료는 먼저 도입한 기업이 겪는 문제로 사용 기록이 남지 않는 활용률 블랙박스, 팀별로 흩어져 노는 자원, 할당이 늦어지면 외부 API로 우회하는 섀도 IT, 격리와 쿼터가 없어 민감 워크로드를 함께 올리지 못하는 상황을 들었다. 증상마다 푸는 계층은 [[K8s-GPU-Sharing-and-Quota#할당 계층이 없을 때 드러나는 증상|Kubernetes GPU 공유와 팀별 할당]]에 정리했다. 외부 API 우회는 할당 속도의 문제이기도 하므로, 사내 모델을 팀에 서비스로 여는 방식(Models-as-a-Service)과 [[LLM-Gateway|LLM 게이트웨이]]의 키와 예산 통제를 함께 둔다(운영 제안).

## 모델을 소프트웨어 공급망으로 다룬다

폐쇄망 안으로 들이는 모델과 이미지는 서명, 패키징, 자재명세서와 검증 게이트를 거쳐야 두 번째 질문에 답할 수 있다. 미러 영역의 검증, 반입 주기, 모델 검증 단계와 클러스터의 서명 검증은 [[Air-Gapped-AI-Delivery|폐쇄망 AI 플랫폼의 이미지와 모델 반입]]이 다룬다.

## 에이전트 계층을 올리는 순서

발표 자료가 제시한 일반적인 순서다. 이미 RAG를 쓰고 있으면 3단계부터 시작한다.

1. **모델 서빙:** 사내 플랫폼에 모델을 배포하고 팀이 서비스로 호출하게 연다.
2. **사내 지식 연결:** 문서를 구조화해 벡터 저장소와 검색에 잇는다([[Document-Parsing-Context|문서 파싱과 컨텍스트]], [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링]]).
3. **도구 연결:** MCP 서버를 게이트웨이 뒤에 두어 인증과 감사를 한곳에서 한다([[MCP-Gateway-Architecture|MCP 게이트웨이]]).
4. **에이전트 조립과 운영:** 프레임워크로 에이전트를 조립하고 가드레일과 평가를 붙인다.

아래 계층이 위 계층의 통제점이 된다. 모델 서빙에서 사용량이, 게이트웨이에서 도구 호출의 신원과 기록이 잡혀야 에이전트 단계의 감사가 가능하다(해석). Red Hat은 2025-10-14 Red Hat AI 3 발표에서 OpenShift AI 3.0의 llm-d 일반 제공(GA), 자체 MaaS 제공 기능, Llama Stack 기반의 통합 API 계층과 MCP 채택을 밝혔다. 판별 지원 수준은 해당 판의 릴리스 노트로 확인한다(docs.redhat.com을 이 환경에서 받지 못해 대조하지 못함).

## 사례: 한국레드햇이 든 운영 사례

2026년 9월 발표 기준이며 측정 수치가 없는 인용이다. Phoenix Technologies(고보안 환경과 클라우드 사이의 배포 전환), 스위스 연방 행정부 BIT(자체 데이터센터의 민감 정부 데이터 처리), 스페인 카스티야라만차 지방정부(행정 프로세스의 AI 활용), 이름을 밝히지 않은 북미 대형 금융사(GPU 가속 컨테이너 플랫폼으로 재현성과 통제력을 확보하고 신용 평가, 계약 협상 같은 핵심 업무의 운영 효율을 높였다는 주장)를 규제 산업과 공공 부문의 운영 사례로 들었다. 이기종 가속기 실험의 수치는 [[LLM-Inference-Fleet-Cases#사례 2: llm-d의 3사 혼합 풀 실험|3사 혼합 풀 실험]]에서 측정 조건과 함께 다룬다.

## 점검 질문

- 망분리 밖에 남는 네 영역(모델 출처, 벤더 종속, 모델 변경, GPU 사용량)을 각각 누가 어떤 기록으로 관리하는가?
- 규제 세 질문 가운데 우리 플랫폼이 답하지 못하는 것은 무엇인가?
- 주력 가속기를 쓸 수 없게 되면 어떤 모델을 어느 풀에서 어떤 품질로 이어 서비스할 수 있는가?
- 공개 모델의 공개 구성요소와 라이선스 조건을 기록했는가?
- 플랫폼의 관리 기능 가운데 외부 서비스에 기대는 것은 무엇인가?

## 출처

- [Sovereign AI 환경에서 완성하는 엔터프라이즈 Agentic AI 구축 및 운영 전략 — 삼성SDS REAL Summit 2026 발표 자료, 한국레드햇](https://image.samsungsds.com/kr/real/2026/assets/uploads/sessionPDF/Track%206-6%20Sovereign%20AI%20%ED%99%98%EA%B2%BD%EC%97%90%EC%84%9C%20%EC%99%84%EC%84%B1%ED%95%98%EB%8A%94%20%EC%97%94%ED%84%B0%ED%94%84%EB%9D%BC%EC%9D%B4%EC%A6%88%20Agentic%20AI%20%EA%B5%AC%EC%B6%95%20%EB%B0%8F%20%EC%9A%B4%EC%98%81%20%EC%A0%84%EB%9E%B5_%ED%95%9C%EC%9E%AC%EA%B2%BD%20fn.pdf) — 2026년 9월 발표. 망분리와 스택 통제의 구분, 규제 세 질문과 조문 연결, 세 계층, GPU 가시성 문제, 에이전트 구축 순서와 운영 사례
- [Scaling agentic AI: How llm-d enables infrastructure sovereignty — Red Hat Blog](https://www.redhat.com/en/blog/scaling-agentic-ai-how-llm-d-enables-infrastructure-sovereignty) — 2026-08-19 게시. 2026-11-23 세 가지 주권 구분과 하드웨어 종속 논지 대조
- [Red Hat Brings Distributed AI Inference to Production AI Workloads with Red Hat AI 3 — Red Hat](https://www.redhat.com/en/about/press-releases/red-hat-brings-distributed-ai-inference-production-ai-workloads-red-hat-ai-3) — 2025-10-14 보도자료. 2026-11-23 OpenShift AI 3.0의 llm-d GA, MaaS, Llama Stack 기반 API와 MCP 대조
- [vLLM, Installation](https://docs.vllm.ai/en/latest/getting_started/installation/) — 2026-11-23 본체 지원 하드웨어와 하드웨어 플러그인 대조
- [llm-d — llm-d](https://github.com/llm-d/llm-d) — 2026-11-23 README의 CNCF Sandbox, 창립 조직과 1.0 검증 가속기 대조
- [CNCF, llm-d](https://www.cncf.io/projects/llm-d/) — 2026-11-23 Sandbox 승인일 대조
- [The Model Openness Framework — arXiv](https://arxiv.org/abs/2403.13784) — 2024-10-18 v6. 2026-11-23 3단계 등급과 구성요소 기준 대조
- [OpenMDW — Linux Foundation](https://openmdw.ai/) — 2026-11-23 현재 판(1.1), 허용형 범위와 공개 구성요소 비강제 대조
- [EDPB, International data transfers](https://www.edpb.europa.eu/sme-data-protection-guide/international-data-transfers_en) — 2026-11-23 제5장 조건과 이전 경로 대조
- [AI Act Service Desk, Article 11: Technical documentation](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-11) — 2026-11-23 제1항 대조
- [AI Act Service Desk, Article 12: Record-keeping](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-12) — 2026-11-23 제1항 대조
- [EIOPA, Digital Operational Resilience Act (DORA)](https://www.eiopa.europa.eu/digital-operational-resilience-act-dora_en) — 2026-11-23 ICT 제3자 위험 관리 축 확인. 조문 번호는 미대조

## 관련 문서

- [[Air-Gapped-AI-Delivery|폐쇄망 AI 플랫폼의 이미지와 모델 반입]] — 미러 영역, 서명과 모델 검증 게이트
- [[LLM-Inference-Fleet-Efficiency|LLM 추론 플릿 효율]] — 이종 가속기 풀과 라우팅
- [[LLM-Inference-Fleet-Cases|LLM 추론 플릿 운영 사례]] — 3사 혼합 풀 실험의 측정 조건
- [[K8s-GPU-Sharing-and-Quota|Kubernetes GPU 공유와 팀별 할당]] — GPU 사용의 가시성과 할당
- [[Network-Separation|망분리]] — 경계 통제와 국내 규제 범위
- [[SaaS-Regional-Data-Isolation|SaaS 리전별 데이터 격리]] — 운영 주권과 CLOUD Act
- [[AI-Basic-Act-Scope-and-Obligations|AI 기본법의 적용 범위와 사업자 의무]]
- [[AI-Infra-Geopolitics|AI 인프라 지정학]] — 국가 단위의 주권 논의
- [[Sovereign-Workplace-Stack|디지털 자율 업무환경]] — 업무환경 쪽의 디지털 자율성
- [[Local-Inference-Deployment-Cases|로컬 AI 추론의 배포 사례]]
