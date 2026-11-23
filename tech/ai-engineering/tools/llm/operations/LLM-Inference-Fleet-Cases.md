---
tags: [ai, llm, inference, serving, gpu, npu, heterogeneous-accelerators, case-study]
status: done
verified_at: 2026-11-23
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Inference Fleet Cases", "추론 플릿 운영 사례", "삼성SDS 추론 플랫폼 사례", "llm-d 3사 혼합 풀 실험", "GPU 이상 유형 분류"]
---

# LLM 추론 플릿 운영 사례: 발표 수치와 측정 조건

[[LLM-Inference-Fleet-Efficiency|LLM 추론 플릿 효율]]의 수단을 실제 플릿에 적용했다고 밝힌 두 사례를 모은다. 하나는 클라우드 사업자가 이종 GPU와 NPU 풀에서 다섯 수단을 함께 운영한 발표이고, 다른 하나는 세 벤더의 가속기를 한 풀로 묶어 라우팅 정책만 바꿔 비교한 llm-d 실험이다. 수단의 원리와 공개 구현은 원문서에 두고, 여기서는 회사가 밝힌 구성과 수치, 그 수치가 나온 조건을 적는다.

## 발표 수치를 읽는 기준

- **함께 켠 수단:** 같은 날 여러 수단을 켜면 전후 차이를 수단별로 나눌 수 없다.
- **비교 지점:** 기준선이 포화를 넘어 처리량이 떨어진 부하 지점의 차이는 최고치끼리의 차이보다 크다. 어느 지점의 값인지 확인한다.
- **풀과 모델:** 여러 풀과 모델의 결과에서 가장 큰 값만 한 줄로 모으면 서로 다른 조건의 값이 섞인다.
- **부하 구성:** 접두사 재사용이 높은 부하는 캐시 친화 라우팅에 유리하다. 자기 서비스의 재사용 비율로 다시 잰다.
- **절감의 기준:** 같은 처리량에 필요한 GPU가 줄었는지, 같은 GPU에서 처리량이 늘었는지 구분한다.

## 사례 1: 삼성SDS SCP 추론 서비스

2026년 9월 발표 기준이다. 회사가 밝힌 구성과 운영 수치이며 측정 조건과 원자료는 공개되지 않았다. 세션 브리프와 발표 자료의 수치는 서로 일치한다.

### 서비스 구성

- **계층:** 관리형 추론(서버리스와 GPU 전용 방식, 트래픽을 제어하는 AI 게이트웨이, Kubernetes 클러스터의 서빙 엔진)과 관리형 학습(관리형 작업과 Spot 학습, DeepSpeed와 PyTorch, 체크포인트와 작업 failover)을 두고, 그 아래에 GPU와 NPU VM, GPU bare-metal, InfiniBand 기반 네트워크와 병렬 분산 스토리지를 둔다. 서빙과 학습 클러스터 사이를 혼합 워크로드 스케줄링이 잇는다.
- **서비스:** 2026년 7월 토큰 종량제 추론 서비스를 출시했다고 밝혔다. 호출 주체로 사내 AI 플랫폼, 코딩 에이전트와 OpenRouter를 그렸다. 2026년 8월 기준 제공 모델은 범용 LLM(GLM-5.2, Qwen3.6-27B, Gemma-4-31B-it, gpt-oss-120b 등), 안전 분류(Llama-Guard-4-12B), 임베딩과 리랭커(Qwen3-VL-Embedding-8B, Qwen3-VL-Reranker-8B)로, 생성 모델과 분류, 검색용 모델을 한 서비스에 함께 둔다.

### 라우팅의 단계

- **입장:** AI 게이트웨이가 계정과 토큰을 검증하고, 계정별 TPM과 RPM을 제한하고, 동시 사용자를 제한하며 넘친 요청을 대기열에 둔다. 라우팅 점수는 이 단계를 통과한 요청에 매긴다.
- **점수:** 세션, KV 캐시 사용량, 엔진 대기열과 처리 중인 요청 수, 장비 종류를 점수로 바꿔 합산하고 최고점 풀로 보낸다.
- **풀:** B300은 대규모 입력과 연산 집약 요청, H100은 일반 추론, NPU는 경량의 비용 효율 요청을 맡고, 수요에 따라 인스턴스 수를 조절한다. 그림의 범례는 요청을 지연 민감, 긴 문맥과 KV 캐시, 경량과 배치로 나눈다. round robin과 비교한 그림에는 A100, H100, B300이 함께 있다.

### KV 캐시 계층

L1 GPU 메모리(hot, 즉시 접근), L2 호스트 RAM(warm, 빠른 복원), L3 호스트 디스크(cold, 용량 확장), L4 원격 저장소(노드 간 재사용)의 4단계다. 반복 문맥의 출처로 멀티턴 대화의 누적 이력, RAG의 대용량 문서, 에이전트의 시스템 프롬프트와 Skill을 들었다.

### 발표 수치

- **라우팅과 오프로딩:** 그래프 기준 2026-07-29 두 수단을 함께 적용한 뒤 KV 캐시 적중률 평균이 68.8%에서 86.2%로 올랐다(그래프는 5월 7일부터 발표 시점까지). 최대 토큰 생산량은 68억에서 110억으로(+61.8%, 집계 기간 미표기) 늘고 GPU 자원이 16.7% 줄었다(기준 미표기). 회사도 두 수단을 같은 날 적용했고 라우팅이 KV 캐시 사용량을 점수에 넣어 맞물리므로 효과를 나눠 산정하기 어렵다고 밝혔다.
- **동적 메모리 공유:** 두 모델을 올린 비교(모델, GPU와 부하 미공개)에서 GPU 메모리 활용률이 정적 관리의 상한 50%에서 동적 관리 70%대 중반까지 올랐다(시간축 눈금 없음). LLM 2는 초당 요청 8.4에서 13.7, 평균 TTFT 1.43초에서 0.1초가 됐고, LLM 1은 두 방식 모두 초당 5건, 0.05초였다(모델 이름은 발표의 표기). 요청이 몰린 모델이 남는 KV 공간을 쓰고 다른 모델은 그대로 유지된 그림이다(해석).
- **혼합 스케줄링:** 06:00~22:00은 서빙 우선, 22:00~06:00은 유휴 GPU를 학습에 빌려준다. 리샤딩으로 바뀐 GPU 형상에 체크포인트를 맞추고, 학습과 체크포인트 저장을 병렬로 돌리며, 자동 체크포인트와 복원으로 학습을 잇는다고 했다. 그래프의 세로축(요청량)에 눈금이 없고 전후 비교 수치도 없다.
- **장애 대응:** 진단 도구와 커널 모니터링을 상시 돌려 이상을 찾고, 노드를 격리한 뒤 정상 노드에 작업을 다시 배치한다. GPU 오류와 원인 분석 시간을 분 단위로 줄였다고 했으나 전후 수치는 없다.

### GPU 이상 유형 분류

회사가 공개한 17가지 유형이다. 탐지와 조치는 회사 표의 요약이다.

| 분류 | 유형 | 탐지 신호 | 조치 |
|---|---|---|---|
| 하드웨어(9) | GPU 일반, GPU 내부 시스템 프로세서, HBM, SRAM, 과열, CPU, 시스템 메모리, 전원 공급, PCIe | `nvidia-smi` 출력의 XID와 오류 로그, 메모리 시험과 체크섬 오류 로그, 온도 센서, `dmesg`와 `lspci`, BMC나 IPMI의 전원 로그 | 드라이버 재설치와 GPU 재시작, 펌웨어 갱신, 메모리나 GPU 교체, 냉각 점검, 슬롯 재장착과 BIOS 갱신 |
| 드라이버(1) | NCCL | NCCL 로그 분석 | 네트워크 구성 점검, NCCL 판 갱신 |
| 클러스터(4) | NVLink, 네트워크, 디스크, InfiniBand | `nvidia-smi nvlink`의 연결 상태, 지연과 손실률과 인터페이스 오류, `smartctl`과 `df`, `ibstat`과 `ibdiagnet`의 포트와 링크 상태 | 케이블 점검과 NVLink 포트 초기화, 네트워크 장비 점검과 드라이버 갱신, 디스크 교체와 파일시스템 점검, HCA 드라이버 갱신 |
| 소프트웨어(3) | GPU 설정 경고, 탐지기 내부 오류, 타임아웃 | `nvidia-smi` 설정 상태, 탐지기(GPU Scanner) 자체의 오류, 작업 수행 시간 기록 | 설정 변경(`nvidia-smi -pm 1`), 탐지기 코드 수정, 타임아웃 조정과 병목 분석 |

- **XID는 출발점이다:** NVIDIA 문서는 XID를 드라이버가 운영체제의 커널 로그나 이벤트 로그에 남기는 오류 보고로 정의한다. 하드웨어, NVIDIA 소프트웨어, 사용자 애플리케이션 문제 어느 것이든 가리킬 수 있고, 많은 문제가 원인이 여럿일 수 있어 값만으로 각 문제를 이해하는 것이 항상 가능하지는 않다고 적는다(2026-11-23 문서 기준). 회사 표는 XID를 `nvidia-smi` 출력에서 확인한다고 적었지만, 이 정의에서 XID가 찍히는 곳은 커널 로그나 이벤트 로그다. 같은 시각의 다른 신호와 묶어 판단한다.
- **persistence mode:** 표의 조치 `nvidia-smi -pm 1`은 persistence mode를 켜는 명령이다. NVIDIA 문서는 드라이버 319부터 Persistence Daemon(`nvidia-persistenced`)이 돌고 있으면 `nvidia-smi`가 데몬을 통해 설정하고 없으면 커널 드라이버의 레거시 persistence mode로 설정한다고 설명하며, 레거시 방식은 수명 말기에 가까워 데몬으로 대체될 예정이라고 적는다. 발표 자료는 데몬 사용 여부를 밝히지 않았다. 노드 이미지에서 데몬을 띄우도록 표준화하는 편이 이 방침과 맞는다(운영 제안).
- **탐지기 자신도 대상이다:** 분류에 탐지기의 내부 오류와 타임아웃이 들어 있다. 탐지기가 멈추면 이상이 없는 것처럼 보이므로 탐지기의 생존과 지연을 따로 감시한다(해석). 격리와 재배포 절차는 [[LLM-Inference-Fleet-Efficiency#5. GPU 장애 탐지, 격리와 재배포|GPU 장애 탐지, 격리와 재배포]]를 따른다.

### NPU 도입 경과와 다음 구성

- **경과:** FuriosaAI의 RNGD로 2025년 2월 엔드포인트 시험을 시작해 2025년 10월 서버를 설치하고, 2026년 2월 인프라 시험을 마친 뒤 운영 시험을 거쳐 2026년 7월 NPU 클라우드 서비스를 출시했다고 밝혔다. 국내 CSP 최초라는 표현은 회사 발표다.
- **다음 구성(계획 그림):** RNGD 서버 8대와 PCIe 스위치 2대를 한 랙에 묶은 구성과, FuriosaLLM과 FuriosaTorch가 NIXL과 CCL(쪽에 풀이 없음) 위에 놓이고 llm-d, Mooncake, LMCache가 NIXL에 이어지는 소프트웨어 구성을 그렸다. NIXL은 추론 프레임워크의 점대점 통신을 가속하면서 CPU와 GPU 메모리, 파일, 블록, 객체 저장소를 플러그인 구조로 추상화하는 NVIDIA 라이브러리다(2026-11-23 README 기준). KV 캐시 도구가 장비와 무관한 전송 계층을 거쳐 붙어야 이종 풀에서 같은 캐시 계층을 쓸 수 있다(해석).
- **시연 화면:** EXAONE-4.0-32B-FP8를 128개 배치로 생성하는 시연 그림은 처리량 값이 모두 0으로 찍힌 영상 첫 화면이라 성능 수치로 쓸 수 없다.

### 수요 인용

2026년 2월 에이전트 토큰이 사람 토큰을 넘었다는 내용은 [[LLM-Inference-Fleet-Efficiency#에이전트 부하에서 커지는 이유|OpenRouter 자료]]와 맞고, METR 인용(최근 약 12시간, 3~4개월마다 2배)은 [[AI-Capability-and-Cost-Trends#5. 긴 소프트웨어 과제 수행 능력의 추세|대조된 시간 지평 수치]]와 같은 범위다. 에이전트 요청 1건당 약 15배 토큰(OpenRouter 인용), 월간 토큰 수요가 2024년 3분기 65조에서 2025년 3분기 1,300조 이상으로 늘었다는 수치(Google, OpenAI와 업계 자료 인용), 2030년까지 새 데이터센터 100GW 이상 중 약 70%가 추론용이라는 전망(McKinsey 인용)은 1차 자료와 대조하지 못한 발표 인용이다.

## 사례 2: llm-d의 3사 혼합 풀 실험

2026-06-09 llm-d 블로그 기준이다. IBM Research, Red Hat과 인도의 소버린 클라우드 사업자 NxtGen이 함께 한 실험이며, 벤더 비교가 아니라 같은 vLLM Pod 위에서 라우팅 정책만 바꾼 비교다.

- **구성:** 한 OpenShift AI 클러스터에 벤더 A(2노드 각 2장, 4장), B(1노드 8장), C(1노드 8장)의 가속기 풀을 두고 100G RoCE로 연결했다. 벤더 이름은 익명 처리했고, 복제본마다 카드 1장(TP=1)을 썼다.
- **모델과 라우팅:** granite-4.1-8b(8B dense)와 sarvam-30b(30B MoE)를 올렸다. llm-d v0.7.0의 접두사 캐시 인식 라우팅을 granite에는 토크나이저 기반 정밀 점수기로, sarvam에는 원문 바이트 해시 기반 근사 점수기로 썼다. 기준선은 같은 Pod에 대한 Kubernetes round robin이다.
- **부하:** 모든 요청이 같은 긴 시스템 프롬프트를 공유하는 합성 부하(입력 약 7.2K, 출력 1K 토큰)다. 블로그는 접두사가 데워지면 적중률이 100%에 가까워지는 유리한 조건이며 접두사가 다양하면 이득이 달라진다고 적는다.

| 풀 | 모델 | 처리량(llm-d 대 round robin) | TTFT 단축 |
|---|---|---|---|
| A(4장) | granite | +25~36% | 최대 16배 |
| A(4장) | sarvam | 2배 | 22배 |
| B(8장) | granite | +79% | 최대 21배 |
| B(8장) | sarvam | 200 QPS에서 +83%(최고치끼리 +65%) | 낮은 부하에서 최대 5배 |
| C(8장) | granite | 포화 부하에서 +34% | 약 18배 |
| A+B(12 Pod) | granite | +85%(19.4K 대 10~11K 출력 토큰/초) | 3.4~5.6배 |
| A+B(12 Pod) | sarvam | 200 QPS에서 약 3배 | 2.85~4.54배 |
| A+B+C(20 Pod) | granite | 85 QPS에서 +91% | 5.4배(6.8초 대 36.4초) |

- **+91%의 조건:** 3사 풀의 최고 처리량은 llm-d 14.2K, round robin 9.6K 출력 토큰/초다. round robin은 25 QPS에서 포화한 뒤 85 QPS에서 7.5K로 떨어졌고, +91%는 그 85 QPS 지점의 비교다. 최고치끼리는 약 +48%다(이 문서의 계산).
- **상한의 원인:** 85 QPS에서 실험을 멈춘 이유는 풀 포화가 아니라 복제본 하나인 EPP가 CPU 한계에 닿았기 때문이다. EPP 작업량은 Pod 수와 QPS의 곱에 비례하므로 풀이 클수록 라우터 자체의 용량을 먼저 확인한다.
- **빠진 조합:** sarvam-30b는 모델 통합이 고정한 vLLM 판과 C 벤더 이미지의 판이 달라 C 풀에서 돌리지 못했다. 이종 풀에서는 모델과 엔진 판의 호환이 풀마다 갈린다([[LLM-Inference-Fleet-Efficiency#이종 가속기 풀|이종 가속기 풀]]).
- **요약 수치:** IBM Research 글(2026-06-23)은 이 실험을 3~5배 빠르게, 최대 두 배의 사용자에게 서비스할 수 있는 결과로 요약하고, sarvam-30b를 동시 사용자 1,000명에게 제공할 때 GPU 시간당 3달러 가정으로 연간 최대 525만 달러를 아낄 수 있다는 연구진의 계산을 싣는다.
- **발표 자료의 인용:** 한국레드햇 발표 자료(2026년 9월)는 이 실험을 처리량 +91%, TTFT 5.4~22배, 서로 다른 가속기 풀 3개로 요약했다. +91%와 5.4배는 3사 풀의 85 QPS 지점이고 22배는 A 풀의 sarvam 결과라, 서로 다른 풀과 모델의 값이 한 줄에 모였다.

## 점검 질문

- 발표된 처리량 차이가 같은 부하 지점의 비교인가, 최고치끼리의 비교인가?
- 기준선이 포화를 넘어 무너진 구간의 값인가?
- 부하의 접두사 재사용 비율이 우리 서비스와 비슷한가?
- 여러 수단을 함께 켠 전후 비교인가, 하나씩 켠 비교인가?
- 라우터와 탐지기 자체의 용량과 생존을 감시하는가?

## 출처

- [Tokenomics at Scale: Agentic AI 시대, 토큰 생산성을 높이는 5가지 인프라 전략 — 삼성SDS REAL Summit 2026 발표 자료, 삼성SDS, FuriosaAI](https://image.samsungsds.com/kr/real/2026/assets/uploads/sessionPDF/AX%EC%A0%84%EB%9E%B5_1-4_Tokenomics%20at%20Scale_Agentic%20AI%20%EC%8B%9C%EB%8C%80%20%ED%86%A0%ED%81%B0%20%EC%83%9D%EC%82%B0%EC%84%B1%EC%9D%84%20%EB%86%92%EC%9D%B4%EB%8A%94%205%EA%B0%80%EC%A7%80%20%EC%9D%B8%ED%94%84%EB%9D%BC%20%EC%A0%84%EB%9E%B5_%EC%9D%B4%EC%A3%BC%ED%8F%89%EC%83%81%EB%AC%B4_%EB%B0%B0%ED%8F%AC%EB%B3%B8.pdf) — 2026년 9월 발표. 서비스 구성, 라우팅 단계, KV 캐시 계층, 그래프 수치, 이상 유형 17종, NPU 도입 경과와 다음 구성
- [Tokenomics at Scale: Agentic AI 시대, 토큰 생산성을 높이는 5가지 인프라 전략 — 삼성SDS REAL Summit 2026 세션 브리프](https://image.samsungsds.com/resource/kr/pdf/Session%20Brief_Tokenomics%20at%20Scale_Agentic%20AI%EC%8B%9C%EB%8C%80_%ED%86%A0%ED%81%B0%20%EC%83%9D%EC%82%B0%EC%84%B1%EC%9D%84%20%EB%86%92%EC%9D%B4%EB%8A%94%205%EA%B0%80%EC%A7%80%20%EC%9D%B8%ED%94%84%EB%9D%BC%20%EC%A0%84%EB%9E%B5.pdf) — 2026년 9월 발행. 사례 수치를 발표 자료와 대조
- [Sovereign AI 환경에서 완성하는 엔터프라이즈 Agentic AI 구축 및 운영 전략 — 삼성SDS REAL Summit 2026 발표 자료, 한국레드햇](https://image.samsungsds.com/kr/real/2026/assets/uploads/sessionPDF/Track%206-6%20Sovereign%20AI%20%ED%99%98%EA%B2%BD%EC%97%90%EC%84%9C%20%EC%99%84%EC%84%B1%ED%95%98%EB%8A%94%20%EC%97%94%ED%84%B0%ED%94%84%EB%9D%BC%EC%9D%B4%EC%A6%88%20Agentic%20AI%20%EA%B5%AC%EC%B6%95%20%EB%B0%8F%20%EC%9A%B4%EC%98%81%20%EC%A0%84%EB%9E%B5_%ED%95%9C%EC%9E%AC%EA%B2%BD%20fn.pdf) — 2026년 9월 발표. NxtGen 실험의 요약 인용
- [Heterogeneous inference serving across three GPU vendors with llm-d — llm-d](https://llm-d.ai/blog/heterogeneous-inference-3-vendor-sovereign-cluster) — 2026-06-09 게시. 2026-11-23 구성, 부하, 결과 표, EPP 상한과 빠진 조합 대조
- [Running AI on mixed hardware for speed and affordability — IBM Research](https://research.ibm.com/blog/fast-inference-mixed-gpus) — 2026-06-23 게시. 2026-11-23 요약 수치와 비용 계산 대조
- [NVIDIA, XID Errors: Introduction](https://docs.nvidia.com/deploy/xid-errors/introduction.html) — 2026-11-23 XID 정의와 해석 한계 대조
- [NVIDIA, Driver Persistence: Persistence Mode (Legacy)](https://docs.nvidia.com/deploy/driver-persistence/persistence-mode-legacy.html) — 2026-11-23 레거시 방식의 대체 예정과 설정 명령 대조
- [NVIDIA, Driver Persistence: Persistence Daemon](https://docs.nvidia.com/deploy/driver-persistence/persistence-daemon.html) — 2026-11-23 데몬 경유 설정과 레거시 방식의 폐기 방침 대조
- [NVIDIA Inference Xfer Library (NIXL) — ai-dynamo](https://github.com/ai-dynamo/nixl) — 2026-11-23 README의 정의와 플러그인 구조 대조

## 관련 문서

- [[LLM-Inference-Fleet-Efficiency|LLM 추론 플릿 효율]] — 수단의 원리와 공개 구현
- [[Model-Release-Claims|모델 발표 수치 읽기]] — 측정 주체와 비교 조건
- [[Sovereign-AI-Platform|주권형 AI 플랫폼]] — 이종 가속기를 쓰는 이유와 통제 계층
- [[GPU-Server-Infrastructure|GPU 서버 인프라]] — 노드 장애, 느려진 노드와 작업 재개
- [[GPU-Inference-Hardware#GPU 밖의 추론 가속기|GPU 밖의 추론 가속기]] — NPU와 TPU를 읽는 기준
- [[K8s-GPU-Sharing-and-Quota|Kubernetes GPU 공유와 팀별 할당]] — 대여와 회수, 큐
