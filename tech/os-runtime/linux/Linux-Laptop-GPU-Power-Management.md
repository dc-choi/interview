---
tags: [linux, gpu, power-management, nvidia, laptop, local-inference]
status: done
verified_at: 2026-11-09
category: "OS&런타임(OS&Runtime)"
aliases: ["Linux Laptop GPU Power Management", "노트북 GPU 전력 관리", "Dynamic Boost", "nvidia-powerd"]
---

# Linux 노트북의 GPU 전력 관리와 OS별 성능 차이

노트북과 통합형 칩에서는 CPU와 GPU가 하나의 전력 예산을 나눠 쓴다. 이 배분은 펌웨어가 주는 정보와 OS 쪽 드라이버나 서비스가 함께 정하므로, 같은 하드웨어라도 OS마다 전력 관리 구성요소가 다르면 GPU 클럭과 추론 속도가 크게 달라질 수 있다. 드라이버가 설치되고 CUDA가 돈다는 사실과 하드웨어 성능을 다 쓴다는 사실은 다르다.

## 전력 배분은 GPU 드라이버 밖의 구성요소에도 달려 있다

NVIDIA Linux 드라이버 README(x86_64 595.84)는 Dynamic Boost를 작업량에 따라 GPU와 CPU의 전력을 관리하는 시스템 전체의 전력 제어기로 설명하고, Linux에서는 `nvidia-powerd` 데몬이 이를 제공한다고 적는다.

- **조건**: Ampere 이상 GPU를 단 노트북, Intel CometLake 이상 또는 AMD Renoir, Cezanne, Rembrandt 이상의 칩셋, 그리고 이 기능을 지원하는 시스템 펌웨어(SBIOS)가 필요하다.
- **확인과 활성화**: root로 `/proc/driver/nvidia/gpus/<PCI 버스 ID>/power`를 읽거나 `nvidia-settings -q DynamicBoostSupport`로 지원 여부를 본다. `nvidia-dbus.conf`를 D-Bus 시스템 설정 폴더에 둔 뒤 `nvidia-powerd.service`를 활성화하고 시작한다.
- **아키텍처 차이**: aarch64용 드라이버 README(610.43.02)의 같은 장은 이 기능을 해당 아키텍처에서 제공하지 않는다고만 적는다.

같은 이름의 기능도 OS, CPU 아키텍처, 드라이버 버전과 펌웨어 지원이 맞아야 동작한다. Windows에서 되는 전력 배분이 Linux에서도 자동으로 된다고 가정하지 않는다.

## WSL은 Windows 호스트 드라이버를 쓴다

NVIDIA CUDA on WSL 가이드(v13.5, 2026-11-02 갱신)는 Windows에 설치한 NVIDIA 드라이버가 필요한 유일한 드라이버이며 WSL 안에 Linux 디스플레이 드라이버를 설치하지 말라고 한다. Windows 호스트의 CUDA 드라이버는 WSL 안에서 `libcuda.so`로 연결되고, Linux 드라이버를 설치하면 호스트에서 연결된 드라이버를 덮어쓴다. 따라서 WSL에서 도는 GPU 작업의 전력 관리는 Windows 호스트 쪽 구성을 따른다고 볼 수 있다(이 문서의 해석).

같은 가이드는 WSL의 제약도 적는다. 관리 메모리(managed memory)를 쓰는 애플리케이션은 성능이 떨어지고 시스템 메모리 사용이 늘 수 있고, CPU와 GPU의 동시 접근을 지원하지 않으며, NVML의 GPU 사용률과 활성 연산 프로세스 조회 같은 일부 질의도 아직 지원하지 않는다. 네이티브 Linux 대신 쓸 때는 이 차이가 작업에 걸리는지 함께 시험한다.

## 사례: RTX Spark 노트북의 Linux 추론 속도

MindStudio가 2026-11-01 공개한 실사용 점검 기준이다. 공급사의 확인이 없는 제3자 측정이며 이 문서에서 재현하지 않았다.

- **환경**: MSI Prestige N16 Flip AI Plus에 Arch 기반 Omarchy를 설치했고 NVIDIA 오픈 커널 드라이버로 GPU 가속까지 동작했다. 커널과 드라이버 버전은 밝히지 않았다.
- **관측**: 전원을 연결하면 Linux의 GPU 클럭이 약 780MHz에 머물렀고 Windows는 약 2.2GHz였다. GPT-OSS-120B 생성 속도는 Windows 초당 65.4토큰, WSL 65.1토큰, 네이티브 Linux 13.9토큰이었으며 실행기와 양자화는 밝히지 않았다. 전원을 뽑으면 Linux도 부하 중 약 1,800MHz로 Windows에 가까운 속도를 냈고, GPU 온도가 40~47°C여서 발열 때문으로 보기 어렵다고 적는다.
- **원인 주장**: 글은 CPU와 GPU의 전력을 나누는 Windows 쪽 구성요소인 NVIDIA Platform Controllers and Framework에 해당하는 기능이 Linux에 없고, 펌웨어의 전력 설정 표가 암호화돼 읽을 수 없다고 본다. Windows에서 이 구성요소를 끄자 초당 약 83토큰이 약 31토큰으로 떨어지고 클럭도 Linux와 같은 786MHz가 됐다고 보고하지만, NVIDIA의 확인이나 근거 문서는 제시하지 않는다.
- **제품 정보**: 2026-11-09 열람한 NVIDIA RTX Spark 사양 페이지는 운영체제로 Windows 11만 적고 Linux 지원은 언급하지 않는다.

## 점검 항목

- 추론 속도를 비교할 때 OS, 드라이버 버전, 전원 연결 여부와 부하 중 GPU 클럭, 전력, 온도를 함께 기록한다.
- 전원 연결과 배터리에서 같은 작업을 돌려 차이가 크고 온도가 낮으면 발열보다 전력 정책을 먼저 의심한다(위 사례에서 쓴 구분).
- 하드웨어 제조사가 해당 OS를 지원 대상으로 밝혔는지 사양 페이지와 드라이버 문서로 확인한다.
- 네이티브 Linux가 꼭 필요하지 않으면 WSL을 중간 경로로 두되, 위 WSL 제약이 작업에 걸리는지 먼저 시험한다.

## 출처

- [Linux on the Nvidia RTX Spark Laptop: What Actually Works — MindStudio](https://www.mindstudio.ai/blog/linux-nvidia-rtx-spark-laptop) — 2026-11-01. 2026-11-09 환경, 클럭과 생성 속도, 원인 주장과 근거 범위 대조
- [NVIDIA, Linux x86_64 Driver README 595.84, Dynamic Boost on Linux](https://download.nvidia.com/XFree86/Linux-x86_64/595.84/README/dynamicboost.html) — 2026-11-09 기능 설명, 조건, 확인과 활성화 절차 대조
- [NVIDIA, Linux aarch64 Driver README 610.43.02, Dynamic Boost on Linux](https://download.nvidia.com/XFree86/Linux-aarch64/610.43.02/README/dynamicboost.html) — 2026-11-09 해당 아키텍처 미제공 문구 확인
- [NVIDIA, CUDA on WSL User Guide](https://docs.nvidia.com/cuda/wsl-user-guide/index.html) — v13.5(2026-11-02 갱신). 2026-11-09 드라이버 구성과 제약 대조
- [NVIDIA, RTX Spark Specifications](https://www.nvidia.com/en-us/products/rtx-spark/specifications/) — 2026-11-09 운영체제 표기 확인

## 관련 문서

- [[AI-Work-Tool-Selection|AI 업무 도구 선택]] — RTX Spark 사양과 로컬 모델 실행 검토
- [[GPU-Inference-Hardware|GPU 추론 하드웨어]] — 전력 한도, 온도와 클럭의 기록
- [[Local-Inference-Deployment-Cases|로컬 추론의 배포 사례]]
- [[Battery-State-of-Charge|배터리 잔량 추정과 시스템 종료]] — 전원 관리
