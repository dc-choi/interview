---
tags: [kubernetes, agent, sandbox, gvisor, microvm, checkpoint, gke]
status: done
verified_at: 2026-10-27
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Agent Substrate", "Agent Substrate on GKE", "에이전트 스냅샷 런타임"]
---

# Agent Substrate: 대기 중인 에이전트를 스냅샷으로 내리고 다시 올린다

대화형 에이전트는 모델 응답, 도구 실행과 사용자 입력을 기다리는 시간이 길다. 에이전트마다 Pod를 계속 띄우면 기다리는 동안에도 CPU와 메모리를 점유한다. Pod를 내려 비용을 줄이면 작업 상태를 외부에 저장하고 복구하는 일이 애플리케이션 책임으로 넘어간다. GKE 문서는 Kubernetes가 Pod hibernation을 지원하지 않고, 수많은 유휴 에이전트를 Pod로 유지하면 Pod 한도와 control plane 메모리가 바닥난다고 설명한다.

Agent Substrate는 상태가 있는 에이전트 인스턴스를 미리 띄워 둔 적은 수의 sandbox에 번갈아 올리는 Kubernetes 위의 실행 런타임이다. 2026-10-27 공식 저장소 README와 GKE 문서(2026-10-22 갱신) 대조 기준이다. 실행할 대상이 AI 에이전트일 필요는 없지만, 신뢰하지 않는 코드를 실행하며 대부분 기다리는 에이전트를 주 대상으로 삼는다. 에이전트 SDK가 아니라 표준 OCI 이미지를 받아 실행하는 계층이다.

## Actor와 Worker를 분리한다

| 개념 | 뜻 |
|---|---|
| Actor | 에이전트 하나의 실행 인스턴스 |
| ActorTemplate | 이미지, 환경 변수와 자원을 정한 Actor 생성 설계 |
| Worker | Actor가 실행되는 sandbox |
| WorkerPool | Actor를 받을 수 있도록 미리 시작해 둔 유휴 Worker 묶음 |

1. **라우팅:** 요청이 대상 Actor를 지정한다. 오픈소스 구성에서는 ingress router(`atenet-router`)에 `ate-target-actor` header로 지정한다.
2. **재개:** 대상이 중단 상태면 WorkerPool에서 Worker를 확보하고 Actor의 스냅샷을 복원한다.
3. **실행:** 활성화한 Worker로 요청을 보내 Actor가 작업한다.
4. **중단:** 작업을 마치고 유휴 상태가 되면 메모리와 파일의 새 스냅샷을 저장소에 쓰고 빈 Worker를 풀에 돌려준다.

Actor가 특정 Worker에 묶이지 않으므로 복원할 때마다 실행 위치가 바뀌어도 세션과 작업 환경이 이어진다. README는 pool이 포화되면 router가 503을 반환하는 대신 요청을 대기시킬 수 있다고 설명한다. 이 대기는 클라이언트에 응답 지연으로 나타나므로 재개 지연과 함께 측정한다(운영 제안).

## 격리와 자격 증명의 경계

- **sandbox:** 모든 Actor는 gVisor(`runsc`) 또는 Cloud Hypervisor microVM 안에서 실행하며 일반 Linux 컨테이너만 쓰는 방식은 지원하지 않는다. gVisor 경로의 helper는 `runsc` checkpoint와 restore 명령을 실행한다. GKE 설치에는 Worker용 gVisor 런타임이 포함돼 노드에 GKE Sandbox를 따로 구성하지 않는다.
- **신원:** Actor마다 수명 1시간의 SPIFFE X.509 인증서와 필요할 때 발급하는 Actor JWT로 외부 인증과 egress 인증에 쓸 신원을 구분한다. 같은 이름으로 다시 만든 Actor도 UID로 구별한다.
- **자격 증명:** README는 sandbox 안의 Actor가 신원 인증서와 JWT, API 키나 클라우드 토큰을 직접 갖지 않고, egress gateway(`atenet-egress`)가 승인된 외부 요청에 자격 증명을 주입한다고 설명한다. 함께 설치하는 Kubernetes Secret provider는 비어 있는 기본 거부 정책으로 시작하므로, Actor 그룹(atespace)별로 읽을 수 있는 namespace를 허용하기 전에는 주입되는 Secret이 없다.
- **스냅샷 접근:** 스냅샷 저장소를 읽고 쓰려면 Actor 신원과 노드 감독자(`atelet`) 신원을 함께 검증하며, sandbox 안의 게스트는 저장소에 직접 접근하지 못한다. 보안 문서는 Actor별 토큰 교환을 GCS에는 적용했고 S3에는 향후 계획으로 표시한다. 노드가 침해됐을 때 영향을 그 노드에 있는 Actor로 한정하는 항목은 진행 중이다.
- **배포 경로 차이:** GKE 문서는 Agent Substrate on GKE에서 EgressPolicy 규칙(기본 거부, hostname 규칙, 자격 증명 주입)을 지원하지 않는다고 적는다. 오픈소스 README의 보안 모델이 선택한 배포 경로에서도 동작한다고 가정하지 않고, 허용과 차단 요청을 각각 보내 확인한다(검증 제안).

일반적인 실행 격리 점검은 [[Agent-Execution-Isolation|에이전트 실행 격리]], namespace 사이의 통신 제한은 [[K8s-NetworkPolicy|NetworkPolicy]]를 따른다.

## 스냅샷이 보존하지 않는 것

- **열린 연결:** 데이터베이스 세션이나 MCP 서버 연결 같은 열린 네트워크 연결은 중단할 때 보존되지 않는다. 재개 뒤 다시 연결하는 코드가 필요하다.
- **GPU:** GKE 문서는 Agent Substrate on GKE의 제한으로 Actor 컨테이너에 GPU 장치를 전달하지 않는다고 적는다. `nvidia.com/gpu`를 지정해도 Pod가 GPU 노드에 배치될 뿐이며, 같은 문서는 이 경로의 gVisor가 실행 중인 CUDA context를 스냅샷하지 못한다고도 적는다. gVisor 사용자 가이드는 `runsc checkpoint --cuda-checkpoint-path`로 cuda-checkpoint를 호출해 GPU를 쓰는 컨테이너를 체크포인트하는 기능을 설명하므로(arm64 미지원), 이 제한을 gVisor 전체의 한계로 일반화하지 않는다. GPU 프로세스 상태를 저장하는 방식은 [[GPU-Server-Infrastructure#GPU 체크포인트와 초기화 비용|CUDA 체크포인트]]에서 다룬다.
- **외부 상태:** 스냅샷은 Actor의 메모리와 로컬 파일이다. 외부 데이터베이스나 API에 남긴 변경은 그 시스템의 일관성 규칙을 따른다.

GPU 추론이 필요한 에이전트라면 모델 서빙을 별도 계층에 두고 Actor는 API로 호출하는 구성이 이 제약과 맞는다(운영 추론).

## 성숙도와 공개 수치

- **오픈소스:** README 기준 pre-1.0이며 하위 호환을 보장하지 않고 API와 동작이 크게 바뀔 수 있다. 최신 Kubernetes 안정판과 그 이전 minor 버전을 지원 목표로 한다. 개발 환경은 kind와 GKE 경로를 제공하며, kind quickstart는 PostgreSQL과 rustfs를 함께 설치한다. Linux 호스트에서 sandbox를 약 1,000개 넘게 띄우려면 kernel neighbor table을 키워야 한다.
- **GKE:** 모든 Google Cloud 고객이 평가와 비운영 용도로 쓸 수 있고, 운영 지원은 allowlist 기반 private GA로 신청한다. GKE Standard 1.36(beta flag 사용) 또는 1.37 이상이 필요하며, beta API(`podcertificaterequests`, `clustertrustbundles`), Workload Identity Federation for GKE와 스냅샷용 Cloud Storage를 요구한다. 혼합 CPU 아키텍처 머신 계열(E2 등)은 gVisor 문제로 지원하지 않고, ActorTemplate마다 node selector로 VM 유형 하나를 고정한다. Cloud Shell은 디스크 용량 때문에 설치 환경으로 쓸 수 없다.
- **수치:** README는 400ms 미만 재개, 초당 1,500회 넘는 활성화, 표준 컨테이너 대비 10배 밀도를 제시하고, 데모는 상태가 있는 Actor 약 250개를 물리 Pod 8개에 번갈아 올린다. GKE 문서는 복원을 1초 미만으로 설명한다. 하드웨어, 스냅샷 크기와 부하 조건을 밝히지 않은 벤더 수치이며 재현하지 않았다.

자체 측정에서는 스냅샷 크기, 저장소 위치, 동시 재개 수를 바꿔 가며 재개 지연과 첫 정상 응답까지의 시간을 함께 기록한다(검증 제안).

## 도입 판단

다음은 위 제약에서 도출한 운영 점검안이다.

- 에이전트가 대부분의 시간을 기다리고, 세션 상태를 메모리와 로컬 파일에 두는가?
- 열린 연결과 GPU 상태 없이 재개할 수 있는가?
- 선택한 배포 경로에서 egress 통제와 자격 증명 주입이 실제로 동작하는가?
- pre-1.0 API 변경과 GKE 비운영 지원 범위를 운영 계획이 받아들일 수 있는가?

세션마다 microVM을 쓰는 관리형 런타임과의 비교는 [[Bedrock-AgentCore-Runtime|AgentCore Runtime]], Firecracker 스냅샷 기반 sandbox는 [[AWS-Lambda-MicroVMs|Lambda MicroVMs]]를 참고한다.

## 출처

- [Agent Substrate — agent-substrate](https://github.com/agent-substrate/substrate) — 2026-10-27 README의 구성 요소, 보안 모델, 성숙도와 quickstart 대조
- [Agent Substrate, Security](https://github.com/agent-substrate/substrate/blob/main/docs/security.md) — 2026-10-27 신원, 무자격 증명 sandbox와 스냅샷 접근 항목의 구현 상태 대조
- [Google Kubernetes Engine, About Agent Substrate on GKE](https://docs.cloud.google.com/kubernetes-engine/ai-ml/about-agent-substrate) — 2026-10-22 갱신본의 수명주기, 요구 조건과 제한 대조
- [gVisor, Checkpoint/Restore](https://gvisor.dev/docs/user_guide/checkpoint_restore/) — 2026-10-27 GPU 체크포인트(cuda-checkpoint 연동)와 arm64 제한 대조
- [Agent Substrate - AI 에이전트를 격리하고 대기 자원을 줄이는 Kubernetes 실행 환경 — GeekNews](https://news.hada.io/topic?id=35557) — 2026-10-18 소개 글

## 관련 문서

- [[OpenShell-Agent-Sandbox|OpenShell]] — 다른 샌드박스 런타임의 네트워크 중개와 자격증명 경계

- [[K8s-AI-Workloads|Kubernetes AI 워크로드]]
- [[Agent-Execution-Isolation|에이전트 실행 격리]]
- [[Agent-Runtime-Deployment|에이전트 런타임과 배포]]
- [[Bedrock-AgentCore-Runtime|Bedrock AgentCore Runtime]]
- [[AWS-Lambda-MicroVMs|Lambda MicroVMs]]
- [[GPU-Server-Infrastructure|GPU 서버 인프라]]
