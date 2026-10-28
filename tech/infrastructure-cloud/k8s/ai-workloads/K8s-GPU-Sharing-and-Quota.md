---
tags: [kubernetes, gpu, scheduling, quota, fair-share, preemption, mps, run-ai]
status: done
verified_at: 2026-10-27
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Kubernetes GPU Sharing and Quota", "GPU 공유와 팀별 할당", "NVIDIA Run:ai", "KAI Scheduler", "GPU Fractioning Operator"]
---

# Kubernetes GPU 공유와 팀별 할당

여러 팀이 한 GPU 클러스터를 쓰면 두 문제를 함께 다룬다. 팀 사이에 GPU를 어떤 순서와 비율로 나누고 남는 GPU를 누가 쓰는지가 할당 문제다. 한 GPU를 여러 작업이 나눠 쓸 때 메모리와 연산을 어떻게 나누고 서로 얼마나 격리하는지가 공유 문제다. 둘은 다른 계층에서 정해지므로 할당 정책이 있다고 공유 격리까지 해결됐다고 보지 않는다.

| 질문 | 정하는 계층 | 대표 수단 |
|---|---|---|
| 어느 팀이 GPU를 얼마나 보장받고, 남는 GPU를 누가 쓰는가 | 스케줄러의 큐와 공정 분배 | quota, over-quota weight, limit, priority, reclaim |
| 여러 Pod가 함께 떠야 하는 작업을 어떻게 배치하는가 | gang scheduling과 topology 인식 | all-or-nothing 배치, 연결 구조를 고려한 배치 |
| 한 GPU를 나눌 때 메모리와 연산을 어떻게 나누는가 | 노드의 GPU 공유 방식 | MIG, MPS, time-slicing, 메모리 상한 강제 |

NVIDIA Run:ai README는 한 팀이 전용 GPU에서 작업만 돌린다면 기본 Kubernetes 스케줄링으로 충분할 수 있고, 여러 팀이 같은 GPU 자원을 나눠 쓰며 공유, 할당량 집행과 멀티테넌트 거버넌스가 필요할 때 이 계층이 필요하다고 설명한다.

## NVIDIA Run:ai 오픈소스의 구성

2026-10-13 NVIDIA 기술 블로그와 각 저장소 README를 2026-10-27에 대조한 기준이다. NVIDIA는 Run:ai 플랫폼 전체를 오픈소스로 공개했다.

- **플랫폼:** control plane, 클러스터에 설치하는 cluster services, installer, CLI, MCP server를 한 저장소에서 Apache 2.0으로 공개한다. control plane은 연결된 여러 클러스터의 워크로드, 조직 자원, 정책과 설정을 관리하고 cluster services는 각 클러스터에서 GPU를 고려한 스케줄링과 워크로드 관리를 맡는다. Kubernetes나 OpenShift에, 인터넷 연결 환경이나 폐쇄망에 설치할 수 있다. Kubeflow, Ray 같은 도구는 워크로드를 제출하고 Run:ai가 그 GPU 용량을 배분하며, Training Operator, LeaderWorkerSet, Knative와 KServe의 워크로드를 관리 대상으로 통합한다.
- **독립 구성 요소:** KAI Scheduler(GPU를 고려한 Kubernetes 스케줄러, CNCF Sandbox), GPU Fractioning Operator(CUDA의 GPU 분할을 Kubernetes에서 쓰게 하는 operator), KAI Resource Management(프로젝트, 부서와 node pool의 조직 계층), Workload Map(워크로드 구조를 기술하는 계약)이다. Workload Map은 스케줄링, 대기열 관리, 자동 확장과 클러스터 간 전파를 하지 않는다. KAI Resource Management README는 아직 공개 릴리스가 없어 차트와 컨트롤러 이미지를 직접 준비해야 한다고 적는다.
- **배포 조건:** 코드는 오픈소스지만 NGC의 Community Product를 내려받으려면 NVIDIA Software License Agreement와 제품별 약관에 동의해야 한다. 유료 구독은 필요 없고 NVIDIA enterprise support는 포함되지 않는다. 지원이 붙는 상용판은 별도 제품으로 계속 제공되며, Apache 2.0은 NVIDIA와 Run:ai 상표 사용을 허락하지 않는다.

## KAI Scheduler의 큐와 공정 분배

- **큐 배정:** 워크로드는 큐에 속해야 스케줄된다. Pod나 워크로드에 `kai.scheduler/queue: <큐 이름>` label을 붙이고 scheduler name을 `kai-scheduler`로 지정한다. 설치하면 `default-parent-queue`와 그 아래 leaf인 `default-queue`가 만들어진다. 작업은 leaf 큐에만 넣고, 상위 큐는 자식 큐 사이의 분배 단위로 쓴다.
- **큐 속성:** quota는 보장량, 큐의 priority는 quota를 넘는 몫을 형제 큐 사이에 나누는 순서, over-quota weight는 같은 priority 안에서 초과분을 나누는 비율, limit은 사용량의 상한이다. GPU 단위 1은 GPU 장치 하나다.
- **분배 순서:** 스케줄링 주기마다 먼저 요청 범위 안에서 deserved quota를 위에서 아래로 계층별로 나눈다. 남는 자원은 priority와 weight로 초과 몫의 fair share를 계산하고, 실제 사용량을 그 fair share에 가깝게 맞추도록 작업을 배치한다.
- **큐 사이 회수(reclaim):** fair share보다 적게 받은 큐의 작업은 fair share를 넘은 큐의 작업을, quota보다 적게 받은 큐는 quota를 넘은 큐의 작업을 evict할 수 있다. 회수 대상은 다른 큐의 preemptible 작업이고 두 방식 모두 초과 몫만 회수하므로, 기본 설정에서 보장량 안에서만 쓰는 큐는 다른 큐의 회수 대상이 아니다. alpha 옵션 `queuePriorityInQuotaReclaim`(기본 false)을 켜면 priority가 더 높은 큐가 더 낮은 큐의 보장량 안 자원까지 회수할 수 있다. `reclaimerUtilizationMultiplier`(기본 1.0)를 1보다 크게 하면 회수를 보수적으로 판단한다.
- **큐 안 선점(preemption):** 같은 큐 안에서는 workload priority(`priorityClassName`)가 더 높은 작업이 더 낮은 preemptible 작업을 evict할 수 있다. 큐 경계는 넘지 않지만 큐가 보장량 안에서만 쓰고 있어도 일어난다. 기본 설정에서 priority 값 100 미만은 preemptible, 100 이상은 non-preemptible이며, non-preemptible 작업은 큐의 quota 안에서만 실행되고 선점과 회수 대상에서 빠진다. 기본 클래스는 `train`(50), `build-preemptible`(75), `build`(100), `inference`(125)이고, 클래스를 지정하지 않으면 Deployment와 Knative Service는 `inference`, Kubeflow Notebook은 `build`, 그 밖의 작업은 `train`을 받는다.
- **배치 기능:** 여러 Pod 작업은 메모리 안 사전 시뮬레이션으로 전부 배치하거나 하나도 배치하지 않는다. 과거 사용량과 시간 감쇠를 반영하는 time-based fair share, 설정한 기간 동안 선점과 회수를 막는 min-guaranteed runtime, topology-aware scheduling과 DRA를 지원한다. kube-batch를 바탕으로 만들었고 다른 스케줄러와 함께 설치할 수 있다.

preemptible 작업은 초과 몫으로 돌다가 다른 큐에 회수되거나, 큐가 보장량 안에 있어도 같은 큐의 더 높은 priority 작업에 선점될 수 있다. 이런 작업에는 [[GPU-Server-Infrastructure#장기 분산 학습의 노드 장애와 작업 재개|체크포인트와 재시작 경로]]를 두고, 보장량을 되찾거나 선점할 때 다른 작업의 종료와 재배치 시간이 대기 시간에 더해지는지 측정한다. 중단을 피해야 하는 작업을 non-preemptible 클래스로 두면 quota 안에서만 실행된다는 제약도 함께 계획한다(운영 제안).

## GPU 분할 요청과 실제 격리

KAI Scheduler의 GPU 공유 문서는 설치할 때 클러스터 단위로 고르는 네 가지 모드를 둔다.

| 모드 | GPU 메모리 상한의 런타임 강제 | 요청 annotation |
|---|---|---|
| `Disabled` | 분할 요청을 거절한다 | 없음 |
| `NonMemoryEnforced` (기본) | KAI가 강제하지 않는다. 컨테이너가 요청보다 많은 GPU 메모리를 보고 쓸 수 있다 | `gpu-fraction`, `gpu-memory` |
| `HamiCore` | HAMi-core로 CUDA 메모리를 격리한다 | `gpu-fraction`, `gpu-memory` |
| `NvFractions` | CDI와 NRI를 구성하면 GPU Fractioning 경로로 강제한다 | `nvidia.com/container.<컨테이너>.gpu-memory.request`, `.limit` |

기본 모드에서 분할 요청은 배치 기준일 뿐 메모리 격리가 아니다. KAI Scheduler는 NVIDIA device plugin의 `replicas` 공유 설정을 지원하지 않으므로 위 모드로 대신한다.

GPU Fractioning Operator(API `v1alpha1`)의 동작은 다음과 같다.

- **메모리 상한:** NRI plugin인 fractiond가 컨테이너 프로세스가 시작되기 전에 `NVIDIA_GPU_MEMORY_LIMIT`와 MPS 연결을 주입한다. 각 노드의 mpsd는 프로세스별 GPU 메모리 집계를 켠 MPS control daemon을 실행한다. README는 드라이버가 이 값을 hard cap으로 강제해 컨테이너가 자기 몫을 넘겨 할당하지 못하고, 상한을 넘은 컨테이너는 Kubernetes 메모리 limit을 넘을 때처럼 out-of-memory로 종료된다고 설명한다. 이 종료가 CUDA 할당 오류, 종료 코드와 Kubernetes 종료 사유 가운데 무엇으로 드러나는지는 밝히지 않는다.
- **요청 방식:** request와 limit 가운데 하나만 지정하면 다른 하나도 같은 값이 되고, 값은 1MiB 이상이어야 한다. 분할 컨테이너는 `nvidia.com/gpu`를 요청하지 않고 스케줄러가 장치를 지정한다.
- **연산 공유:** 기본 `time-slicing`은 드라이버가 프로세스를 번갈아 실행한다. 컨테이너에 `gpu-compute.mode: sm-sharing`을 붙이면 공유 MPS server를 통해 SM을 동시에 점유한다. README는 메모리 외의 연산 상한이나 이웃 작업 사이의 장애 격리를 설명하지 않는다. 하드웨어 수준의 메모리와 장애 격리가 필요하면 [[GPU-Server-Infrastructure#Kubernetes와 GPU 공유의 관측 경계|MIG와 time-slicing의 차이]]를 함께 비교한다.
- **전제:** Kubernetes 1.28 이상, NRI를 켠 containerd 2.0 이상이나 NRI를 지원하는 CRI-O, NVIDIA GPU Operator v26.7.0 이상(container toolkit v1.20.1, device plugin v0.20.1 이상), NVIDIA 드라이버 r615 이상(CUDA 13.4)이 필요하다. r615는 짧게 유지되는 브랜치라 GPU Operator v26.7.1이 기본으로 설치하지 않으므로 `driver.version`으로 명시한다.
- **조용한 실패:** `skipGpuStackVersionChecks=true`로 버전 검사를 끄면 메모리 상한을 강제할 수 없는 스택에서도 데몬이 배포되고 Ready가 True가 되며, GPU 메모리에 상한이 걸리지 않은 채 아무것도 보고되지 않는다. GPU Operator의 NRI plugin을 쓰는 클러스터에서 management CDI device를 허용하기 전에는 metricsd가 모든 GPU 값을 0으로 내보내면서 probe를 통과한다.

Pod별 지표 `gpu_fractioning_gpu_memory_used_bytes`와 `gpu_fractioning_gpu_sm_utilization_percent`가 0이면 유휴 상태와 수집 설정 오류를 먼저 구분한다. 배포 뒤에는 상한을 일부러 넘는 시험 컨테이너를 돌려 컨테이너 로그의 CUDA 메모리 할당 오류, 종료 코드, 재시작 횟수와 Kubernetes가 기록한 종료 사유를 함께 확인한다. cgroup 메모리 limit을 넘을 때 보이는 `OOMKilled` 사유가 GPU 메모리 상한 초과에서도 그대로 나타난다고 가정하지 않는다(검증 제안).

## 도입 전 확인

다음은 위 공식 자료에서 도출한 운영 점검안이다.

- 선택한 GPU 공유 모드가 메모리 상한을 실제로 강제하는가, 기본 모드의 배치 기준에 머무는가?
- r615 드라이버의 수명주기와 노드 이미지 갱신 계획이 맞는가?
- 팀별 quota 합과 클러스터 용량, 회수나 선점될 수 있는 preemptible 작업의 재시작 준비를 정했는가?
- Ready 상태와 지표 값만으로 격리와 수집이 정상이라고 판단하지 않는가?

공식 문서와 저장소 README만 대조했으며 클러스터 설치, 회수와 선점, 메모리 상한 초과 동작은 시험하지 않았다.

## 출처

- [NVIDIA Run:ai Is Now Open Source as Part of NVIDIA DSX AI Factory Platform — NVIDIA Technical Blog, Ekin Karabulut, Sam Heywood](https://developer.nvidia.com/blog/nvidia-runai-is-now-open-source-as-part-of-nvidia-dsx-ai-factory-platform/) — 2026-10-13 게시
- [NVIDIA Run:ai — dsx-ai-factory](https://github.com/dsx-ai-factory/run-ai)
- [KAI Scheduler — kai-scheduler](https://github.com/kai-scheduler/KAI-Scheduler)
- [KAI Scheduler, Quick Start](https://github.com/kai-scheduler/KAI-Scheduler/blob/main/docs/quickstart/README.md)
- [KAI Scheduler, Scheduling Queues](https://github.com/kai-scheduler/KAI-Scheduler/blob/main/docs/queues/README.md)
- [KAI Scheduler, Fairness](https://github.com/kai-scheduler/KAI-Scheduler/blob/main/docs/fairness/README.md)
- [KAI Scheduler, Workload Priority](https://github.com/kai-scheduler/KAI-Scheduler/blob/main/docs/priority/README.md)
- [KAI Scheduler, Scheduling Deep Dive](https://github.com/kai-scheduler/KAI-Scheduler/blob/main/docs/scheduling-deep-dive/README.md)
- [KAI Scheduler, GPU Sharing](https://github.com/kai-scheduler/KAI-Scheduler/blob/main/docs/gpu-sharing/README.md)
- [GPU Fractioning Operator — kai-scheduler](https://github.com/kai-scheduler/gpu-fractioning)
- [KAI Resource Management — kai-scheduler](https://github.com/kai-scheduler/kai-resource-management)
- [NVIDIA Run:ai - 여러 팀이 GPU를 나눠 쓰도록 관리하는 Kubernetes 기반 플랫폼 — GeekNews](https://news.hada.io/topic?id=35507) — 2026-10-17 소개 글

## 관련 문서

- [[K8s-AI-Workloads|Kubernetes AI 워크로드]]
- [[GPU-Server-Infrastructure|GPU 서버 인프라]]
- [[K8s-Resource-Right-Sizing|Resource Right-Sizing]]
- [[ECS-GPU-Inference|ECS GPU 추론과 분할 GPU]]
- [[EKS|Amazon EKS]]
