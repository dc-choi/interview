---
tags: [ai, llm, inference, serving, gpu, kv-cache, scheduling, reliability]
status: done
verified_at: 2026-11-23
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Inference Fleet Efficiency", "추론 플릿 효율", "GPU당 토큰 생산성", "Tokens per GPU", "KV Cache Offloading", "KV 캐시 계층 오프로딩", "GPU Loaning and Reclaim", "추론과 학습 혼합 스케줄링"]
---

# LLM 추론 플릿 효율: GPU당 토큰을 늘리는 운영 계층

직접 서빙하는 추론 플랫폼의 토큰당 원가는 확보한 GPU 수보다 GPU가 지연 목표(SLO)를 지키며 실제로 토큰을 만든 시간과 양에 달려 있다. 엔진 하나 안의 배칭, KV 캐시와 양자화는 [[LLM-Inference-Bottlenecks|LLM 추론 병목]]이, 엔진과 서비스의 책임 경계는 [[LLM-Inference-Serving-Engines|추론 서빙 엔진의 기능 경계]]가 다룬다. 이 문서는 그 위의 플릿 계층, 곧 여러 엔진, 모델, GPU와 작업 사이에서 생기는 낭비를 줄이는 수단을 다룬다.

## 낭비와 대응 수단

| 낭비 | 수단 | 늘어나는 것 | 주된 대가 |
|---|---|---|---|
| 일부 엔진에 몰린 대기와 노는 엔진 | 요청 상태 기반 라우팅 | 같은 GPU 수의 처리량과 TTFT | 상태 수집 지연, 점수 조정 |
| 같은 문맥의 반복 프리필 | KV 캐시 계층 오프로딩 | 캐시 적중과 프리필 절감 | 전송 시간, 호스트 메모리와 저장 공간, 캐시 키 관리 |
| 모델별로 고정해 비어 있는 KV 메모리 | 다중 모델의 동적 KV 메모리 공유 | 한 GPU의 메모리 활용률 | 모델 간 간섭, 회수 정책 |
| 피크에 맞춰 확보해 비수기에 노는 GPU | 추론과 학습의 혼합 스케줄링 | 하루 전체의 GPU 활용률 | 회수 지연, 학습 진행 손실 |
| 장애 노드가 멈춘 시간 | 장애 탐지, 격리와 재배포 | 생산에 쓰이는 GPU 시간 | 오탐에 따른 용량 손실, 여유 용량 |

앞의 세 수단은 같은 GPU 시간에 더 많은 토큰을 만들고, 뒤의 두 수단은 놀거나 멈춘 GPU 시간을 줄인다. 수단끼리 맞물린다. 라우터가 캐시 위치를 점수에 넣으면 적중률이 오르고, 여러 엔진이 원격 캐시 계층을 함께 쓰면 캐시가 없는 엔진으로 보내도 적중할 수 있어 라우팅이 부하 분산에 더 무게를 둘 수 있다(해석). 같은 이유로 둘을 함께 적용하면 효과를 나눠 재기 어렵다.

## 에이전트 부하에서 커지는 이유

에이전트는 시스템 프롬프트, 도구 정의, 작업 지침, 누적 대화와 검색 문서를 호출마다 다시 보낸다. 같은 접두사의 프리필이 반복되고, 세션이 길수록 KV 캐시가 커진다.

OpenRouter는 API 키를 매달 도구 호출 비율, 입출력 비율, 요청당 턴 수, 캐시 적중률 등 일곱 신호의 가중 점수로 에이전트(0.50 이상), 혼합, 사람(0.25 미만)으로 나눈다. 이 분류로 2026-02-06 에이전트 토큰이 처음 사람 토큰을 넘었고, 2026년 10월에는 에이전트 키가 토큰의 76%(1년 전 8%)를 썼다. 9월에는 에이전트 토큰의 90% 가까이가 캐시된 프롬프트 토큰이었다. 한 플랫폼을 거친 사용량이고 분류 신호에 캐시 적중률이 들어 있으므로 시장 전체의 비율로 옮기지 않는다. 과제 길이의 추세는 [[AI-Capability-and-Cost-Trends#5. 긴 소프트웨어 과제 수행 능력의 추세|긴 과제 수행 능력의 추세]]를 따른다.

## 1. 요청 상태 기반 라우팅

**낭비:** round robin은 요청 크기와 엔진 상태를 보지 않는다. 긴 입력이 몰린 엔진에는 대기열이 쌓이고 다른 엔진은 논다.

**동작:** 라우터가 엔진마다 대기열 길이, 처리 중인 요청 수, KV 캐시 사용률과 요청 접두사의 캐시 보유 여부를 점수로 바꿔 가장 높은 엔진이나 풀로 보낸다. 세대가 다른 GPU가 섞이면 긴 입력과 연산 집약 요청을 최신 GPU로 보내는 식으로 장비 특성도 점수에 넣는다. 자동 확장은 복제본 수를, 라우팅은 복제본 사이의 분배를 맡는다.

**공개 구현:** llm-d Router(2026-11-23 main 문서 기준)는 Envoy 같은 프록시와 Endpoint Picker(EPP)를 짝지어 KV 캐시 위치, 현재 부하와 요청 우선순위로 엔드포인트를 고른다.

- 기본 포화 감지기 `utilization-detector`는 지표가 없거나 200ms보다 오래된 엔드포인트, KV 전송 중인 요청을 뺀 대기열이 5 이상인 엔드포인트, KV 캐시 사용률이 0.8 이상인 엔드포인트를 후보에서 뺀다. 모두 빠지게 되면 전부 남긴다.
- `prefix-cache-scorer`의 입력은 기본으로 `approx-prefix-cache-producer`가 만들고, 설정으로 `precise-prefix-cache-producer`를 고를 수 있다. 이름상 근사와 정밀로 나뉘며 문서가 두 producer의 동작을 설명하지는 않는다. 점수기 가중치는 생략하면 1.0이고, 최고점이 같으면 기본 `max-score-picker`가 round robin으로 돌린다.

NVIDIA Dynamo의 KV-aware routing, 과부하 거절과 Planner의 역할 구분은 [[LLM-Inference-Bottlenecks#라우팅, 과부하 거절과 확장을 따로 설계한다|라우팅, 과부하 거절과 확장]]에 있다.

**한계:**

- 캐시 친화와 부하 분산이 충돌한다. 같은 접두사를 한 엔진에 모으면 적중률은 오르지만 그 엔진이 과열된다. 접두사 점수만 쓰지 않고 포화 필터나 부하 점수를 함께 둔다.
- 점수는 지난 지표로 매긴다. 수집 주기보다 빨리 몰리는 요청은 같은 엔진으로 쏠릴 수 있으므로 지표의 나이 상한을 둔다(위 200ms 기본값이 예).
- 이종 풀에서는 같은 모델도 장비마다 엔진 설정, 정밀도와 커널이 달라 같은 요청의 출력이 달라질 수 있다. 풀마다 품질을 따로 평가한다([[LLM-Inference-Serving-Engines#결정적 출력은 배치 불변성에서 출발한다|배치 불변성]]).
- 확장으로 새로 뜬 복제본은 캐시가 비어 있고, 축소하면 그 캐시를 잃는다. 확장과 축소 직후의 적중률 변화를 측정에 넣는다.

## 2. KV 캐시 계층 오프로딩

**낭비:** 반복되는 문맥을 매번 처음부터 프리필한다. GPU 메모리에 둘 수 있는 캐시가 작아 재사용 전에 밀려난다.

**동작:** 완성된 KV 블록을 GPU 메모리에서 호스트 메모리, 로컬 SSD, 노드 밖 원격 저장소로 내려 보관하고, 같은 접두사의 요청이 오면 GPU로 다시 올린다. 원격 계층은 다른 엔진과 노드의 요청도 같은 캐시를 읽게 한다. 접두사 해시와 적중 원리는 [[LLM-Prompt-Caching#동작 원리 — prefix matching|프롬프트 캐싱]]과 같다.

**공개 구현(2026-11-23 각 공식 문서와 README 기준):**

- vLLM의 OffloadingConnector는 완성된 KV 블록을 고정(pinned) 호스트 메모리로 복사해 prefix cache를 넓히고, 파일시스템, 객체 저장소와 P2P 보조 계층을 더할 수 있다. 하위 계층의 적중은 필요할 때 GPU로 올리고, 전송은 DMA(`cudaMemcpyAsync`)로 모델 연산과 비동기로 겹친다. 보조 계층은 여러 노드에 걸친 엔진에서 아직 지원하지 않는다(latest 개발자 미리보기 문서 기준이며 릴리스 버전의 지원 범위는 따로 확인한다).
- LMCache는 엔진과 분리된 daemon으로 KV 캐시를 관리해 엔진이 죽어도 캐시가 남는다. CPU RAM, 로컬 SSD, Redis/Valkey, Mooncake 등의 저장 계층을 두고 요청, 세션과 엔진 인스턴스 사이에서 재사용하며, 접두사가 아닌 위치의 블록도 일부 토큰을 다시 계산하는 CacheBlend로 재사용한다. vLLM 문서는 여러 vLLM 인스턴스가 함께 쓰는 `lmcache server` 연동을 안내한다.
- Mooncake는 Kimi의 서빙 플랫폼으로, 프리필과 디코드 클러스터를 나누고 GPU 클러스터에서 덜 쓰이던 CPU, DRAM, SSD를 KV 캐시 풀로 쓴다. Transfer Engine이 데이터 이동을, Mooncake Store가 분산 KV 저장을 맡고, vLLM의 MooncakeStoreConnector는 Mooncake의 분산 저장소를 공유 KV 캐시 풀로 써서 CPU와 디스크 오프로딩, 인스턴스 간 재사용을 지원한다(vLLM latest 문서 기준).

**한계:**

- 블록이 완성되는 즉시 내려 쓰는 방식에서는 하위 계층이 상위 계층보다 커야 적중이 는다. vLLM 문서는 오프로딩이 즉시 일어나므로 GPU KV 캐시 합보다 작은 CPU 계층은 GPU에 있는 내용을 복제할 뿐 적중을 늘리지 않는다며, CPU 단일 계층을 그보다 크게 잡으라고 한다.
- 하위 계층에서 읽는 시간이 다시 계산하는 프리필 시간보다 짧은 구간에서만 이득이다. 문맥 길이별로 두 시간을 재서 계층별 사용 기준을 정한다(운영 제안).
- 캐시 키가 정확해야 한다. vLLM은 블록 해시에 앞 블록 해시, 블록 토큰과 LoRA ID, 멀티모달 입력 해시를 넣고, 요청의 `cache_salt`를 첫 블록 해시에 넣어 같은 salt의 요청만 재사용하게 한다. 지연 차이로 캐시된 내용을 추론하는 타이밍 공격을 막는 장치다. 가중치, 정밀도나 KV 양자화 설정이 바뀌면 같은 토큰의 KV도 달라지므로 공유 계층은 모델 판별로 나눈다(해석).
- 페이지 재사용과 전송 중 해제가 요청 간 노출로 번진 사례는 [[LLM-Inference-Serving-Engines#단계 분리에서는 KV 페이지 소유권이 요청 격리의 경계다|KV 페이지 소유권]]을 따른다.
- 적중률은 토큰 비율이다. GPU 절감은 적중으로 아낀 프리필 시간과 늘어난 전송 시간을 함께 재서 환산하고, 비용 비중과 적중률의 차이는 [[LLM-Prompt-Caching#단가 변경은 워크로드의 토큰 구성으로 환산한다|토큰 구성 환산]]과 같은 방식으로 본다.

## 3. 다중 모델의 동적 KV 메모리 공유

**낭비:** 한 GPU에 여러 모델을 올리고 모델별 KV 공간을 미리 고정하면, 요청이 한 모델에 몰릴 때 다른 모델의 빈 공간을 쓰지 못하고 그 메모리는 논다.

**동작:** 가중치는 모델마다 고정으로 두고 KV 캐시만 공유 풀에서 수요에 따라 나눈다. 한 모델의 남는 공간을 요청이 많은 모델이 쓴다.

**공개 구현:** kvcached(2026-11-23 README 기준)는 KV 캐시의 GPU 가상 주소와 물리 메모리 할당을 분리한다. 엔진은 처음에 가상 메모리만 예약하고 캐시를 실제로 쓸 때 물리 GPU 메모리를 붙이므로, 부하에 맞춰 KV 메모리를 할당하고 회수한다. 유휴 모델의 sleep mode와 프런트엔드 라우터도 둔다. SGLang 0.5.11 이상(0.5.20까지 시험), vLLM 0.17.0 이상(0.30.0까지 시험)에 붙으며, 최소 판은 PyTorch 요구사항에서 정해진다고 밝힌다. A100 80GB 한 장에 Llama-3.1-8B 세 개를 올린 간헐적 피크 부하에서 TTFT가 2~28배 줄었다는 수치는 프로젝트 자체 측정이다.

**한계:**

- 메모리만 나눌 뿐 연산 유닛과 메모리 대역폭은 계속 경쟁한다. 바쁜 모델의 배치가 커지면 옆 모델의 토큰 간 지연이 늘 수 있으므로 모델별 지연을 따로 잰다(운영 제안).
- 모든 모델의 피크가 겹치면 나눌 여유가 없다. 메모리를 돌려줘야 하는 모델은 캐시를 비우거나 요청을 밀어내야 하므로 우선순위와 모델별 최소 보장량을 정한다(운영 제안).
- 한 GPU의 하드웨어 장애나 재설정은 함께 올린 모델을 모두 멈춘다. 메모리 격리와 장애 격리 수준은 [[K8s-GPU-Sharing-and-Quota#GPU 분할 요청과 실제 격리|GPU 분할 모드와 격리]]로 비교한다.

## 4. 추론과 학습의 혼합 스케줄링

**낭비:** 업무용 추론 수요는 낮에 몰리고 심야에 주는 경우가 많다. 피크에 맞춰 확보한 GPU는 비수기에 논다.

**동작:** 업무 시간에는 서빙에 GPU를 우선 배정하고, 비수기에는 남는 GPU를 대기 중인 학습이나 배치 작업에 빌려준다(loaning). 수요가 다시 오르면 돌려받는다(reclaim). 서빙이 우선이므로 빌린 GPU에서 도는 학습은 언제든 회수될 수 있는 선점 가능 작업이다. Kubernetes에서는 큐별 보장량, 초과 몫과 회수 정책으로 이 관계를 표현한다([[K8s-GPU-Sharing-and-Quota#KAI Scheduler의 큐와 공정 분배|KAI Scheduler의 큐와 회수]]).

회수로 끊기는 학습은 체크포인트로 잇는다. PyTorch 2.15의 DCP는 여러 rank에서 병렬로 저장하고 읽으며, `async_save`는 state_dict를 먼저 CPU 메모리로 옮긴 뒤 별도 스레드에서 저장하므로 저장하는 동안 학습을 이어 갈 수 있다(문서는 `async_save`를 실험 기능으로 표기한다). load-time resharding으로 한 클러스터 토폴로지에서 저장한 체크포인트를 다른 토폴로지에서 읽으므로, 회수 뒤 GPU 수가 바뀌어도 이어 갈 바탕이 된다. 재시작 절차는 [[GPU-Server-Infrastructure#장기 분산 학습의 노드 장애와 작업 재개|노드 장애와 작업 재개]]와 같다.

**한계:**

- 회수가 수요 증가보다 빨라야 한다. 학습 정지, 체크포인트 마무리, GPU 메모리 정리, 추론 엔진 기동, 가중치 적재와 워밍업을 합한 시간을 재고, 하루 패턴이 뚜렷하면 수요가 오르기 전에 예약 회수한다(운영 제안).
- 마지막 체크포인트 이후의 진행분은 잃는다. 저장 주기를 회수 빈도와 저장 비용에 맞춰 정한다.
- 서빙 클러스터의 네트워크와 저장소가 분산 학습의 collective 통신과 데이터 읽기를 감당하는지 확인한다([[AI-Cluster-Network-Fabric|AI 학습 클러스터의 네트워크]]). 클러스터마다 PyTorch 판이 다르면 DCP 형식 호환도 본다([[PyTorch-Version-Upgrade-and-Rollback|PyTorch 버전 업그레이드와 롤백]]).
- GPU 수가 바뀔 때 전역 배치 크기와 학습률을 어떻게 다룰지는 학습 쪽에서 미리 정한다(운영 점검).
- 이 수단은 토큰 처리량이 아니라 하루 전체의 GPU 활용률을 올린다. 효과는 학습이 실제로 쓴 GPU 시간과 서빙 SLO 위반 여부로 잰다.

## 5. GPU 장애 탐지, 격리와 재배포

**낭비:** 토큰은 GPU가 돌 때만 나온다. 장애 노드가 멈춘 시간과 원인을 찾는 시간만큼 생산이 끊긴다.

**동작:** 진단 도구와 커널 로그를 상시 돌려 GPU 메모리 오류, 과열, 장비 간 통신과 설정 오류를 찾고, 이상 노드를 격리한 뒤 그 노드의 모델 복제본을 정상 노드에 다시 띄운다. 학습은 동기식 작업 전체가 멈춰 체크포인트에서 재개하지만, 추론 복제본은 서로 독립이라 남은 복제본이 요청을 받는 동안 빠진 복제본만 다시 띄우면 된다. 대신 장애 노드에서 처리 중이던 요청과 그 노드에만 있던 KV 캐시는 잃는다. 엔진과 분리된 캐시 daemon은 엔진 재시작에는 남지만 노드를 잃으면 그 노드의 로컬 계층도 함께 사라진다(해석).

격리 순서(운영 제안):

1. 라우팅 후보에서 먼저 뺀다. readiness 실패는 Pod를 Service endpoint에서 빼지만 컨테이너를 재시작하지 않는다([[K8s-Configuration-Storage-and-Probes#세 probe의 계약|probe 계약]]).
2. 새 작업이 배치되지 않게 막는다. Kubernetes 문서 기준 `NoSchedule` taint는 새 Pod 배치만 막고 실행 중인 Pod를 남기며, `NoExecute`는 견디지 못하는 Pod를 즉시 내보낸다. 이상 노드의 복제본을 옮길지에 따라 둘을 구분한다.
3. 대체 복제본을 띄운다. 노드 확보, 이미지, 가중치 적재와 워밍업 시간이 들므로 여유 용량 없이는 즉시 회복되지 않는다.

**한계:**

- 오탐은 멀쩡한 용량을 뺀다. 이상 유형별로 즉시 격리할지 관찰할지 기준을 나눈다(운영 제안).
- 멈추지 않고 느려진 GPU는 오류 없이 꼬리 지연만 늘린다. 복제본별 TTFT와 토큰 간 지연 분포로 찾는다([[GPU-Server-Infrastructure#멈추지 않고 느려진 노드도 학습을 지연시킨다|느려진 노드]]).
- 여유 GPU를 상시 비워 두면 그 자체가 낭비이므로, 학습에 빌려준 GPU를 장애 대체 용량으로 회수하는 구성이 4번과 5번을 잇는다(해석).

## 이종 가속기 풀

요청마다 필요한 연산량이 다르므로 모든 요청을 가장 비싼 GPU에서 처리할 필요는 없다. 긴 입력과 연산 집약 요청은 최신 GPU로, 일반 요청은 이전 세대 GPU로, 연산량이 적은 요청은 단가가 낮은 NPU 같은 전용 가속기로 보내 같은 예산으로 더 많은 토큰을 만든다. 분배는 1번 라우팅이 맡는다.

- **모델 지원:** 가속기마다 컴파일러와 런타임이 지원하는 모델과 판이 다르다. 라우터는 모델별로 갈 수 있는 풀만 후보로 둔다.
- **품질:** 장비와 커널이 다르면 수치가 달라 같은 요청의 출력이 달라질 수 있다. 풀마다 같은 평가 세트로 합격선을 확인한다.
- **운영:** 드라이버, 지표와 장애 유형이 장비마다 달라 5번의 탐지 규칙을 장비별로 둔다.
- **비교 단위:** TOPS가 아니라 같은 모델, 입력 길이와 동시성에서 SLO를 만족한 토큰당 비용으로 비교한다([[GPU-Inference-Hardware#GPU 밖의 추론 가속기|GPU 밖의 추론 가속기]]).
- **실험 사례:** 세 벤더의 가속기를 한 풀로 묶고 라우팅 정책만 바꾼 비교와 풀마다 갈린 엔진 판 호환은 [[LLM-Inference-Fleet-Cases#사례 2: llm-d의 3사 혼합 풀 실험|llm-d 3사 혼합 풀 실험]]에 있다.

## 효과를 재는 법

- **기준 지표:** GPU 시간당 SLO를 만족한 토큰([[Load-Shedding|부하 차단]]의 요청 단위 goodput을 토큰 단위로 옮긴 지표)을 입력과 출력으로 나눠 본다. 최대 처리 용량과 실제 생산량을 구분한다.
- **하나씩 켠다:** 여러 수단을 같은 날 켜면 효과를 나눌 수 없다. 일부 풀에만 적용하거나 단계적으로 켜고 대조군을 남긴다.
- **작업 구성을 통제한다:** OpenRouter 자료의 캐시 적중률 중앙값은 2026년 6월 76.1%에서 10월 90% 이상으로 올랐다. 제공자별 값의 중앙값으로 보이며 페이지가 모집단을 명시하지 않는다. 같은 기간 외부 플랫폼의 적중률도 오른 만큼 전후 비교에서는 작업 구성과 외부 추세를 함께 통제한다(해석). 에이전트 비중 자체의 변화는 위의 76%와 8% 수치로 본다.
- **절감의 기준을 밝힌다:** 같은 처리량에 필요한 GPU 수가 줄었는지, 같은 GPU에서 처리량이 늘었는지 구분한다.

## 사례

회사가 발표한 운영 구성과 수치는 [[LLM-Inference-Fleet-Cases|LLM 추론 플릿 운영 사례]]로 나눴다. 삼성SDS는 이종 GPU와 NPU 풀에서 위 다섯 수단을 함께 운영하며 라우팅과 오프로딩을 같은 날 적용한 뒤 KV 캐시 적중률 평균이 68.8%에서 86.2%로 올랐다고 밝혔다(측정 조건 미공개). llm-d의 3사 혼합 풀 실험은 접두사 재사용이 높은 합성 부하에서 round robin 대비 처리량 +91%를 보고했는데, 기준선이 포화를 넘어 떨어진 85 QPS 지점의 값이다. 두 수치 모두 그 문서의 측정 조건과 함께 읽는다.

## 면접 체크포인트

- 접두사 친화 라우팅과 부하 분산이 왜 충돌하고, 포화 필터를 왜 함께 두는지 설명할 수 있는가.
- 완성 즉시 내려 쓰는 KV 캐시 계층에서 하위 계층이 상위 계층보다 커야 적중이 느는 이유와, 하위 계층 읽기와 재계산을 비교하는 기준을 말할 수 있는가.
- 여러 테넌트와 모델 판이 KV 캐시를 공유할 때 캐시 키와 저장 경계에 무엇을 넣는지 말할 수 있는가.
- GPU 대여와 회수에서 회수 시간을 무엇이 정하고 학습 진행을 어떻게 지키는지 설명할 수 있는가.
- 여러 최적화를 함께 적용한 전후 비교가 왜 각 수단의 효과를 증명하지 못하는지 말할 수 있는가.

## 출처

- [Tokenomics at Scale: Agentic AI 시대, 토큰 생산성을 높이는 5가지 인프라 전략 — 삼성SDS REAL Summit 2026 세션 브리프](https://image.samsungsds.com/resource/kr/pdf/Session%20Brief_Tokenomics%20at%20Scale_Agentic%20AI%EC%8B%9C%EB%8C%80_%ED%86%A0%ED%81%B0%20%EC%83%9D%EC%82%B0%EC%84%B1%EC%9D%84%20%EB%86%92%EC%9D%B4%EB%8A%94%205%EA%B0%80%EC%A7%80%20%EC%9D%B8%ED%94%84%EB%9D%BC%20%EC%A0%84%EB%9E%B5.pdf) — 2026년 9월 발행. 사례 수치는 운영 사례 문서로 옮기고 발표 자료와 다시 대조
- [llm-d Router — llm-d](https://github.com/llm-d/llm-d-inference-scheduler) — 2026-11-23 README의 구성 대조
- [llm-d Router Architecture — llm-d](https://github.com/llm-d/llm-d-inference-scheduler/blob/main/docs/architecture.md) — 2026-11-23 main의 포화 감지 기본값, 접두사 producer, 점수기 가중치와 picker 대조
- [vLLM, KV Offloading Usage Guide](https://docs.vllm.ai/en/latest/features/kv_offloading_usage/) — 2026-11-23 latest 문서의 계층, CPU 계층 크기 안내, 비동기 전송과 다중 노드 제약 대조
- [vLLM, Automatic Prefix Caching](https://docs.vllm.ai/en/latest/design/prefix_caching.html) — 2026-11-23 블록 해시 구성과 `cache_salt` 대조
- [vLLM, Disaggregated Prefilling](https://docs.vllm.ai/en/latest/features/disagg_prefill/) — 2026-11-23 OffloadingConnector와 LMCache 연동 대조
- [vLLM, MooncakeStoreConnector Usage Guide](https://docs.vllm.ai/en/latest/features/mooncake_store_connector_usage/) — 2026-11-23 공유 KV 캐시 풀, 오프로딩과 인스턴스 간 재사용 대조
- [LMCache — LMCache](https://github.com/LMCache/LMCache) — 2026-11-23 README의 daemon 구조, 저장 계층, 재사용 범위와 CacheBlend 대조
- [Mooncake — kvcache-ai](https://github.com/kvcache-ai/Mooncake) — 2026-11-23 README의 구조, 구성 요소와 vLLM 연동 대조
- [kvcached — ovg-project](https://github.com/ovg-project/kvcached) — 2026-11-23 README의 가상 메모리 구조, 지원 판과 자체 측정 조건 대조
- [PyTorch 2.15, Distributed Checkpoint - torch.distributed.checkpoint](https://docs.pytorch.org/docs/2.15/distributed.checkpoint.html) — 2026-11-23 병렬 저장, load-time resharding과 비동기 저장 대조
- [Kubernetes Documentation, Taints and Tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/) — 2026-11-23 `NoSchedule`과 `NoExecute`의 효과 대조
- [Cache is Crucial — OpenRouter](https://openrouter.ai/data/newsletter/cache-is-crucial) — 2026-10-08 게시. 2026-11-23 사람 토큰을 넘은 날짜와 9월 캐시 비중 대조
- [Tokens rose 37% in October — OpenRouter](https://openrouter.ai/data/october-2026) — 2026년 10월 데이터 요약. 2026-11-23 분류 신호와 기준, 에이전트 토큰 비중, 캐시 적중률 중앙값 대조

## 관련 문서

- [[LLM-Inference-Bottlenecks|LLM 추론 병목]] — 엔진 하나 안의 병목과 라우팅, 과부하 거절
- [[LLM-Inference-Serving-Engines|추론 서빙 엔진의 기능 경계]] — 엔진과 서비스 책임, KV 페이지 소유권
- [[LLM-Prompt-Caching|LLM 프롬프트 캐싱]] — API 제공자의 접두사 캐시와 과금
- [[K8s-GPU-Sharing-and-Quota|Kubernetes GPU 공유와 팀별 할당]] — 큐, 회수와 GPU 분할 격리
- [[GPU-Server-Infrastructure|GPU 서버 인프라]] — 사용률 해석, 노드 장애와 작업 재개
- [[GPU-Inference-Hardware|추론용 GPU 선택]] — KV 캐시 용량과 GPU 밖의 가속기
- [[LLM-Cost-Optimization|LLM 비용 최적화]] — API 사용자 쪽의 비용 레버
- [[AI-Infrastructure-Capital-Cycle|AI 인프라 투자와 자본 순환]] — 설비 가동률과 투자 회수
- [[LLM-Inference-Fleet-Cases|LLM 추론 플릿 운영 사례]] — 회사 발표의 구성, 수치와 측정 조건
- [[Sovereign-AI-Platform|주권형 AI 플랫폼]] — 이종 가속기를 쓰는 이유와 통제 계층
