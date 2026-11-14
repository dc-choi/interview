---
tags: [container, kata-containers, gpu, kubernetes, dra, vfio, isolation, multi-tenant]
status: done
verified_at: 2026-11-14
category: "Infrastructure - 컨테이너"
aliases: ["Kata Containers with GPU", "Kata Containers GPU 격리", "VM 기반 컨테이너 런타임", "GPU Pod VM 격리"]
---

# Kata Containers로 GPU Pod를 VM 경계로 격리하기

여러 사용자가 한 GPU 노드를 나눠 쓰면 컨테이너 사이의 경계가 곧 사용자 사이의 경계가 된다. 일반 컨테이너는 호스트 커널을 공유하므로 컨테이너 런타임이나 GPU 도구의 탈출 취약점 하나가 같은 노드의 다른 사용자와 호스트 전체로 번질 수 있다. Kata Containers는 Pod마다 경량 VM과 게스트 커널을 두어 피해 범위를 그 VM 안으로 묶고, 사용자와 운영자는 Pod spec과 kubectl을 그대로 쓴다. 대가는 VM 부팅 시간, 미리 확보하는 메모리, 장치를 VM에 넘기는 경로의 복잡도다.

이 문서의 구성과 수치는 2026-11-02 공개된 NAVER Engineering Day 발표(HGX 8-GPU 노드, InfiniBand 멀티노드 학습)의 사례이고, 개념과 API는 Kubernetes, Kata, Linux 커널, SPDK, NVIDIA 공식 문서와 대조했다. 발표에서 나온 성능 수치와 내부 수정은 발표 기준이며 다른 환경의 결과를 보장하지 않는다.

## 커널 경계가 필요한 이유

| 공개 취약점 | 영향 | 수정 버전 |
| --- | --- | --- |
| runc CVE-2024-21626(2024-01-31) | 내부에서 새어 나간 파일 디스크립터로 `runc exec` 프로세스의 작업 디렉터리가 호스트 파일시스템에 놓일 수 있다. 권고는 호스트 장악으로 이어질 수 있다고 적는다 | runc 1.1.12 |
| runc CVE-2025-31133, CVE-2025-52565, CVE-2025-52881(2025-11-05) | masked path와 `/dev/console` 마운트 경쟁, procfs 쓰기 우회로 컨테이너를 탈출한다 | runc 1.2.8, 1.3.3, 1.4.0-rc.3 |
| NVIDIA Container Toolkit CVE-2025-23266(2025-07-15, CVSS 9.0) | 컨테이너 초기화 hook이 이미지의 환경 변수를 물려받아 `LD_PRELOAD`로 악성 라이브러리를 높은 권한으로 실행한다. 발견자는 세 줄 Dockerfile로 재현했다 | Container Toolkit 1.17.8, GPU Operator 25.3.2 |

패치로 개별 취약점은 막지만 다음 취약점이 나왔을 때의 피해 범위는 격리 구조가 정한다. Kata에서 사용자 컨테이너가 게스트 root를 얻어도 닿는 범위는 다음과 같다(발표의 위협 모델).

- **메모리:** VM 단위로 나뉜다.
- **GPU:** 장치의 DMA 주소를 IOMMU가 그 VM에 허용한 범위로 변환하고 제한하므로 같은 노드의 다른 VM 메모리에 접근하지 못한다.
- **커널:** 게스트 root는 게스트 커널 안의 권한일 뿐 호스트 커널 권한이 아니다.

사내 동료끼리 노드를 쓰는 환경이면 이 비용 없이 runc로 충분할 수 있다. 불특정 다수에게 GPU 노드를 나눠 주는 서비스처럼 사용자 사이를 서로 믿을 수 없을 때 VM 경계의 비용을 감수한다.

## 동작 구조

Kubernetes는 RuntimeClass로 Pod가 쓸 런타임 설정을 고른다. Pod spec의 `runtimeClassName`이 Kata용 handler를 가리키면 containerd가 Pod마다 `containerd-shim-kata-v2`(Kata runtime, shim)를 띄운다. shim은 설정된 하이퍼바이저(QEMU, Cloud Hypervisor 등, 모두 KVM 기반)로 VM을 부팅하고 VSOCK 위의 ttRPC로 게스트 안 `kata-agent`에 컨테이너 생성을 요청한다. VM에 어떤 장치를 붙이고 CPU와 메모리를 얼마나 줄지는 shim이 하이퍼바이저 실행 인자로 정한다.

| 항목 | runc 컨테이너 | Kata 컨테이너 | 일반 VM |
| --- | --- | --- | --- |
| 커널 | 호스트 커널 공유 | Pod마다 게스트 커널 | VM마다 게스트 커널 |
| 사용 방식 | 이미지, env, 볼륨, `kubectl logs`와 `exec` | runc와 같다 | VM 이미지와 별도 관리 도구 |
| GPU 드라이버 | 호스트 드라이버 | passthrough한 GPU를 게스트 드라이버가 직접 제어 | 게스트 드라이버 |
| 메모리 | cgroup 상한 | VM 메모리 안에서 게스트 커널이 cgroup 적용. 사전 할당은 기본값이 꺼짐이지만 huge page 구성은 사전 할당을 수반한다 | 하이퍼바이저 설정에 따른다 |
| 시작 시간 | 프로세스 생성 | VM 부팅이 더해진다 | VM 부팅 |

## GPU passthrough: VFIO와 IOMMU

GPU는 디스크나 네트워크처럼 virtio로 가상화하면 성능을 내기 어려워 물리 GPU 전체를 VM 하나에 넘기는 PCI passthrough를 쓴다.

- **VFIO:** 장치를 사용자 공간에 직접 노출하는 커널 프레임워크다. 커널 문서는 장치와 호스트 입장에서 VM이 사용자 공간 드라이버가 된다고 설명한다. 호스트의 GPU를 `vfio-pci`에 바인딩해 호스트 NVIDIA 드라이버가 잡지 않게 하고, 하이퍼바이저가 그 장치를 VM에 넘긴다.
- **IOMMU:** 장치가 쓰는 DMA 주소를 변환하고 허용 범위를 강제한다. Kata 문서는 호스트 커널을 `intel_iommu=on`으로 부팅하라고 안내한다.
- **게스트 드라이버:** GPU는 VM 안의 NVIDIA 드라이버만 제어한다. Kata 기본 게스트 커널에는 GPU 지원이 없어 GPU용 게스트 커널과 드라이버를 넣은 게스트 이미지를 따로 준비한다. 호스트에는 NVIDIA 드라이버를 설치하지 않는다. 이것만으로 GPU 한 장을 VM 하나에 줄 수 있지만, 8장 노드를 여러 크기의 VM으로 나누면 아래 네 문제가 생긴다.

## 문제 1: GPU 조합은 NVLink 파티션을 따라야 한다

NVSwitch로 연결된 HGX 8-GPU 노드에서 GPU를 여러 VM에 나눠 주는 NVIDIA의 방식은 Fabric Manager의 Shared NVSwitch 모델이다. GPU는 PCI passthrough로 각 VM에 넘기고, Fabric Manager가 미리 정의된 파티션 단위로 NVLink를 학습시키고 NVSwitch가 파티션 밖 GPU에 접근하지 못하게 막는다. 파티션 활성화 API는 GPU 목록이 아니라 지원 목록의 파티션 ID만 받는다.

2026-11-14 Fabric Manager 사용자 가이드 기준 HGX H100의 기본 파티션은 15개다(H200, H800, H20도 같다).

| GPU 수 | 파티션 수 | GPU 모듈 ID 조합 |
| --- | --- | --- |
| 8 | 1 | 1~8 |
| 4 | 2 | 1~4, 5~8 |
| 2 | 4 | 1+3, 2+4, 5+7, 6+8 |
| 1 | 8 | 각 모듈(NVLink 없음) |

H100 계열의 2-GPU 파티션은 이웃한 1+2가 아니라 1+3처럼 묶이며, 발표가 설명한 제약도 이 조합이다. 이 조합은 Linux의 PCI 순서가 아니라 NVSwitch 배선으로 정해진다. HGX B200/B300의 기본 표는 1+2, 3+4처럼 이웃한 모듈을 묶으므로 플랫폼마다 표를 확인한다. 전사문은 발표 장비의 GPU 기종을 분명히 알아들을 수 없게 인식해 기종은 확정하지 않는다. 발표가 시험 장비 두 종류를 언급하는 것으로 들려 파티션 예시와 아래 메모리 수치가 서로 다른 기종일 수 있다. 기본 정의는 `SHARED_PARTITION_DEFINITION_FILE`로 바꿀 수 있지만, 스케줄러가 쓸 수 있는 조합은 결국 Fabric Manager가 지원 목록으로 내놓는 파티션이다.

### device plugin의 한계

device plugin은 장치를 정수 개수로 광고하고 kubelet이 그중에서 고른다. 발표 환경에서 4장을 요청하면 파티션으로 묶을 수 없는 GPU 조합이 배정되어 게스트에서 CUDA 오류가 났다. `GetPreferredAllocation`으로 파티션에 맞는 조합을 추천할 수 있지만 공식 문서도 추천이 실제 배정을 보장하지 않는다고 적는다. 추천이 실패하면 경고 없이 기본 배정으로 넘어갔고, Pod 삭제 때 파티션을 해제하라고 알리는 API도 없었다(발표 기준).

### DRA로 전환

Dynamic Resource Allocation(DRA)의 핵심 기능은 Kubernetes v1.34에서 GA가 되어 기본으로 켜지며, API는 `resource.k8s.io` 그룹의 `v1`이다. PersistentVolumeClaim으로 스토리지를 요청하는 방식과 비슷하게 장치를 요청한다.

| 객체 | 역할 |
| --- | --- |
| ResourceSlice | DRA 드라이버가 노드의 장치와 속성(파티션 ID, PCIe 스위치 등)을 발행한다 |
| DeviceClass | 요청할 수 있는 장치 범주와 선택 조건을 정의한다 |
| ResourceClaim | 장치 요청. 스케줄러가 조건에 맞는 장치를 골라 할당 결과를 기록한다 |
| ResourceClaimTemplate | Pod마다 ResourceClaim을 만들고 Pod 종료 때 지운다 |

노드에서는 kubelet과 드라이버가 gRPC로 협의해 컨테이너 시작 전에 장치를 준비하고 Pod 종료 때 해제한다. 드라이버는 CDI(Container Device Interface)로 장치를 컨테이너에 붙인다.

공개 DRA 드라이버는 이 구성에 맞지 않았다. NVIDIA GPU DRA 드라이버는 호스트 NVIDIA 드라이버로 GPU를 조회하는데 이 환경의 호스트 GPU는 항상 `vfio-pci`에 묶여 있고, NIC용 드라이버도 `vfio-pci`에 묶인 NIC를 대상에서 뺐다. 그래서 GPU 파티션, 연산용 InfiniBand와 스토리지용 InfiniBand를 함께 다루는 자체 드라이버를 만들었다(발표 기준).

- 파티션 하나를 장치 하나로 발행하고, 같은 GPU를 포함한 파티션이 중복 할당되지 않게 구현했다(수단은 발표에서 밝히지 않음).
- 준비 요청에서 Fabric Manager로 파티션을 활성화하고 CDI spec과 NCCL 토폴로지 파일을 만든다. 해제 요청에서 파티션을 비활성화한다.
- 단편화가 덜 생기는 조합을 우선한다.

할당 흐름은 kubelet의 준비 요청, 드라이버의 파티션 활성화와 CDI spec 생성, containerd의 OCI spec에 VFIO 장치 추가, Kata shim의 하이퍼바이저 인자 반영, VM 부팅 순서다. 발표 시점 upstream Kata에는 DRA로 할당한 장치를 VM에 연결하는 경로가 없어 shim이 kubelet에서 DRA 장치를 조회하도록 내부 수정했고 upstream 리뷰를 진행 중이었다. 중복 할당을 막으려고 클러스터에서 device plugin을 제거했다.

## 문제 2: 멀티노드 통신과 로컬 디스크

### GPU와 가까운 InfiniBand NIC

VM의 GPU가 다른 노드와 RDMA로 통신하려면 InfiniBand NIC도 VFIO로 넘긴다. 물리 포트를 그대로 넘기는 PF와 SR-IOV로 나눈 VF를 용도에 따라 쓴다. 문제는 게스트가 어느 NIC가 어느 GPU와 같은 PCIe 스위치에 붙어 있는지 모른다는 점이다. NCCL이 먼 NIC를 고르면 2노드 16 GPU all-reduce 버스 대역폭이 158 GB/s에 그쳤다.

- DRA 드라이버가 노드 조인 때 같은 PCIe 스위치의 GPU와 NIC를 묶어 속성으로 발행하고, 클레임 템플릿이 GPU와 NIC를 함께 요청하면서 같은 묶음의 장치를 받도록 제약을 건다.
- 그 연결 정보로 VM마다 NCCL 토폴로지 XML을 만들어 넘긴다. NCCL은 `NCCL_TOPO_FILE`이 가리키는 XML을 토폴로지 탐지 전에 읽는다.
- 적용 뒤 같은 측정이 620 GB/s로 베어메탈 수준에 가까워졌다(발표 기준).

### 로컬 NVMe: virtio-fs에서 SPDK vhost로

| 방식 | 결과(발표 기준) | 제약 |
| --- | --- | --- |
| virtio-fs | 순차 읽기 4.75 GB/s, RAID를 고려하지 않은 호스트의 절반 수준 | Kata의 기본 공유 파일시스템이며 호스트의 FUSE 데몬을 거친다 |
| 디스크 passthrough | 호스트 수준 | VM 수가 물리 디스크 수를 넘을 수 없고 한 디스크를 여러 볼륨으로 나누지 못한다 |
| upstream Kata CSI의 SPDK 경로 | 순차 쓰기 6.5~7 GB/s | 볼륨마다 호스트 파일을 만들고 비동기 I/O로 읽고 쓴다 |
| SPDK lvol + vhost-user-blk(내부 구현) | 순차와 작은 랜덤 I/O 모두 개선 | 폴링 전용 코어가 필요하다 |

SPDK는 NVMe 드라이버를 사용자 공간에서 돌리고 인터럽트 대신 완료를 폴링한다. vhost 대상은 QEMU와 게스트 메모리를 공유하고 제출 큐를 폴링하므로 게스트가 제출 알림을 생략할 수 있어 I/O 제출 때 VM exit를 피한다. 내부 구현은 NVMe 위에 lvolstore를 만들고 PVC마다 lvol 하나를 잘라 vhost-user-blk로 게스트에 붙였다. 공유 메모리 링과 폴링으로 시스템 콜을 줄인다는 점에서 io_uring과 비슷한 발상이다.

SPDK 문서대로 vhost는 지정한 코어를 폴링으로 계속 점유한다. VM 생성이 호스트의 실제 코어 사용을 보지 않아 vCPU가 폴링 코어에 겹치면 I/O 처리와 vCPU 실행이 서로 밀려 VM이 멈췄다. 폴링 코어를 Pod와 vCPU 할당 대상에서 빼서 해결했다(문제 4).

## 문제 3: 큰 VM의 부팅 시간과 NUMA

8 GPU VM이 kubelet의 제한 시간(발표 환경 4분, 어느 설정값인지는 발표에서 밝히지 않음) 안에 부팅하지 못했다. 시간 대부분이 메모리 페이지 매핑이었다(발표 기준).

- **GPU 메모리 영역:** 8장 기준 1.4 TB가 넘는 영역(장당 약 180 GB급 GPU 전제)을 4 KB 페이지로 매핑하면 3억 5천만 개가 넘는다. 호스트의 Transparent Huge Pages를 `always`로 두어 큰 페이지로 매핑했다.
- **게스트 메모리:** 2.6 TB 정도를 4 KB로 매핑하면 약 7억 개다. Pod spec에 `hugepages-1Gi`를 요청해 2,688개로 줄였다. Kubernetes에서 huge page는 노드에 미리 할당해야 하고 요청과 상한이 같아야 하며 overcommit되지 않는다.
- **VM 크기 계산:** 발표 환경에서는 런타임 기본 메모리에 Pod 메모리 값을 더해 VM 크기를 정해 huge page 요청이 VM 크기에 반영되지 않았다(발표 기준). 2026-11-14 upstream main은 동적 경로에서 huge page 상한을 VM 메모리에 더하지만, 부팅 전 정적 sizing 경로는 memory 값만 쓴다. 내부 수정본은 KubeVirt의 방식을 참고해 Pod 요청량을 게스트 전체 메모리로, 컨테이너 상한을 게스트 프로세스의 메모리 상한으로 쓰고 그 차이를 게스트 커널과 페이지 매핑에 쓴다.
- **게스트 NUMA:** 호스트는 2소켓인데 기본 게스트는 NUMA 노드 하나라 GPU와 NIC의 소켓 구분이 사라졌다. shim이 Pod 생성 때 호스트 sysfs를 읽어 게스트에도 NUMA 노드 둘을 만들고 GPU와 NIC를 원래 소켓에 배치하게 했다. GPU 8장의 동시 호스트 메모리 복사가 410 GB/s에서 459 GB/s로 올랐다. 2026-11-14 upstream 설정에도 `enable_numa`(기본 꺼짐)와 `numa_mapping`이 있으며 발표의 수정과 같은지는 확인하지 않았다.

## 문제 4: vCPU 배치

호스트 코어가 남는데도 일부 vCPU 처리량이 절반으로 떨어지거나 게스트 전체가 멈췄다. 멈춘 Pod는 Running이었지만 `exec`에 응답하지 않았고 QEMU의 CPU 사용량은 0이었다. 게스트 vCPU 하나는 호스트의 QEMU 스레드 하나이므로 스레드 배치가 vCPU 성능을 정한다. 게스트가 코어를 온전히 쓰려면 세 조건이 모두 필요했다.

1. **Pod별 전용 CPU:** kubelet CPU manager를 `static` 정책으로 두면 Guaranteed QoS Pod 중 CPU 요청이 정수인 컨테이너가 전용 CPU를 받는다. `reservedSystemCPUs`(구 `--reserved-cpus`)로 지정한 CPU는 전용 할당에서 빠지지만 shared pool에는 남으므로, BestEffort와 Burstable 컨테이너까지 막으려면 `strict-cpu-reservation` 정책 옵션이 필요하다.
2. **vCPU 고정:** Kata의 `enable_vcpus_pinning`을 켜면 vCPU 스레드 수가 sandbox CPUSet의 CPU 수와 같을 때 각 vCPU 스레드를 고정 CPU에 스케줄한다.
3. **예약 코어 제외:** Kata는 호스트 커널과 SPDK 폴링용 예약 코어를 모른다. 제외할 코어 번호를 RuntimeClass 설정으로 받는 옵션을 내부 수정으로 추가했다(발표 기준).

## 사용자가 쓰는 Pod spec

운영자가 RuntimeClass와 장치 조합별 ResourceClaimTemplate을 미리 만들어 두면 사용자는 세 필드만 더한다. 아래 이름은 설명용 예시다.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: train
spec:
  runtimeClassName: kata-gpu            # VM 런타임 선택
  resourceClaims:
    - name: gpus
      resourceClaimTemplateName: gpu-8-with-ib   # GPU 파티션과 가까운 IB NIC 묶음
  containers:
    - name: trainer
      image: example/trainer:latest
      resources:
        claims:
          - name: gpus
        limits:                          # requests를 생략하면 limits와 같아져 Guaranteed가 된다
          cpu: "32"
          memory: 16Gi
          hugepages-1Gi: 1024Gi          # 게스트가 실제로 쓸 메모리
```

## 결과와 트레이드오프

발표 기준으로 NVLink와 InfiniBand 대역폭은 베어메탈과 같은 수준이고 vLLM 추론의 출력 처리량 차이는 1~7% 범위였다. 한 노드의 GPU를 1, 2, 4, 8장 단위로 나눠 여러 사용자가 쓰고, 여러 노드를 InfiniBand로 묶은 학습도 할 수 있다.

- **비용:** VM 부팅 시간, 부팅 때 확보하는 메모리, SPDK 폴링 코어, 노드 수준 huge page 사전 할당.
- **유지 부담:** DRA 장치의 VM 연결, VM 크기 계산, 예약 코어 제외 같은 내부 수정을 upstream에 반영되기 전까지 업그레이드마다 다시 맞춰야 한다(발표 기준, 이후 반영 여부 미확인).
- **격리 범위:** VM 경계는 커널 공유 위험을 줄일 뿐 하이퍼바이저와 Kata 자체의 취약점을 없애지 않는다. Kata의 컨테이너에서 게스트 microVM으로의 권한 상승 취약점(CVE-2026-24834, 권고 기준 호스트 탈출은 아님)과 여러 취약점을 연결해 host 코드 실행에 이른 공격 시험 사례는 [[AI-Training-Environment-Containment|AI 학습 환경의 격리]]에 있다.
- **도입 순서:** 사용자 사이를 믿을 수 있으면 runc와 패치 관리로 충분한지 먼저 본다. VM 경계가 필요하면 하드웨어가 허용하는 GPU 조합과 GPU, NIC, NVMe의 PCIe 토폴로지를 표로 만들고(스케줄러가 모르면 성능 저하나 CUDA 오류로 드러난다), 할당 방식을 정한 뒤 베어메탈과 같은 벤치마크(NCCL all-reduce, fio, 추론 처리량)로 비교한다.

## 출처

- [컨테이너처럼 쓰고, VM처럼 격리하기: kata-containers with GPU — NAVER D2](https://www.youtube.com/watch?v=XQLHhghQ6H4)
- [Kata Containers, Architecture](https://github.com/kata-containers/kata-containers/blob/main/docs/design/architecture/README.md)
- [Kata Containers, Virtualization in Kata Containers](https://github.com/kata-containers/kata-containers/blob/main/docs/design/virtualization.md)
- [Kata Containers, Using NVIDIA GPU device with Kata Containers](https://github.com/kata-containers/kata-containers/blob/main/docs/use-cases/NVIDIA-GPU-passthrough-and-Kata.md)
- [Kata Containers, configuration-qemu.toml.in](https://github.com/kata-containers/kata-containers/blob/main/src/runtime/config/configuration-qemu.toml.in)
- [Kata Containers, sandbox.go](https://github.com/kata-containers/kata-containers/blob/main/src/runtime/virtcontainers/sandbox.go) (Go 런타임의 calculateSandboxMemory, 2026-11-14 main 기준)
- [Kubernetes Documentation, Dynamic Resource Allocation](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/)
- [Kubernetes Documentation, DRA API Objects](https://kubernetes.io/docs/concepts/resource-management/dynamic-resource-allocation/dra-api/)
- [Kubernetes Documentation, How DRA Works](https://kubernetes.io/docs/concepts/resource-management/dynamic-resource-allocation/how-dra-works/)
- [Kubernetes v1.34: DRA has graduated to GA — Kubernetes Blog](https://kubernetes.io/blog/2025/09/01/kubernetes-v1-34-dra-updates/)
- [Kubernetes Documentation, Device Plugins](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/)
- [Kubernetes Documentation, Runtime Class](https://kubernetes.io/docs/concepts/containers/runtime-class/)
- [Kubernetes Documentation, Control CPU Management Policies on the Node](https://kubernetes.io/docs/tasks/administer-cluster/cpu-management-policies/)
- [Kubernetes Documentation, Node Resource Managers](https://kubernetes.io/docs/concepts/policy/node-resource-managers/)
- [Kubernetes Documentation, Manage HugePages](https://kubernetes.io/docs/tasks/manage-hugepages/scheduling-hugepages/)
- [NVIDIA Fabric Manager, Shared NVSwitch Virtualization Model](https://docs.nvidia.com/datacenter/tesla/fabric-manager-user-guide/index.html)
- [Security Bulletin: NVIDIA Container Toolkit - July 2025 — NVIDIA](https://nvidia.custhelp.com/app/answers/detail/a_id/5659)
- [NVIDIAScape - Critical NVIDIA AI Vulnerability: A Three-Line Container Escape in NVIDIA Container Toolkit (CVE-2025-23266) — Wiz](https://www.wiz.io/blog/nvidia-ai-vulnerability-cve-2025-23266-nvidiascape)
- [several container breakouts due to internally leaked fds (GHSA-xr7r-f8xq-vfvv) — opencontainers/runc](https://github.com/opencontainers/runc/security/advisories/GHSA-xr7r-f8xq-vfvv)
- [container escape via "masked path" abuse due to mount race conditions (GHSA-9493-h29p-rfm2) — opencontainers/runc](https://github.com/opencontainers/runc/security/advisories/GHSA-9493-h29p-rfm2)
- [container escape with malicious config due to /dev/console mount and related races (GHSA-qw9x-cqr3-wc7r) — opencontainers/runc](https://github.com/opencontainers/runc/security/advisories/GHSA-qw9x-cqr3-wc7r)
- [container escape and denial of service due to arbitrary write gadgets and procfs write redirects (GHSA-cgrx-mc8f-2prm) — opencontainers/runc](https://github.com/opencontainers/runc/security/advisories/GHSA-cgrx-mc8f-2prm)
- [Linux Kernel Documentation, VFIO - Virtual Function I/O](https://docs.kernel.org/driver-api/vfio.html)
- [NVIDIA NCCL Documentation, Environment Variables](https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/env.html)
- [SPDK Documentation, vhost Target](https://spdk.io/doc/vhost.html)
- [SPDK Documentation, Logical Volumes](https://spdk.io/doc/logical_volumes.html)
- [virtio-fs](https://virtio-fs.gitlab.io/)

## 관련 문서

- [[컨테이너(Container)|컨테이너 인덱스]]
- [[AI-Training-Environment-Containment|AI 학습 환경의 격리]]
- [[Container-Linux-Internals|Linux 컨테이너 내부 구조]]
- [[K8s-GPU-Sharing-and-Quota|Kubernetes GPU 공유와 팀별 할당]]
- [[GPU-Server-Infrastructure|GPU 서버 인프라]]
