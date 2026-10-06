---
tags: [observability, vdi, virtualization, performance]
status: done
verified_at: 2026-10-07
category: "관측가능성(Observability)"
aliases: ["VDI 성능 진단"]
---

# VDI 성능 진단

가상 데스크톱이 느리다는 증상은 로그인 지연, 화면 응답 지연, 게스트 내부 처리 지연으로 나눠 확인한다. VM 자원 사용률 하나만으로 원인을 결정하지 않는다.

## 관측 계층

| 계층 | 확인할 신호 |
|---|---|
| 사용자 세션 | 로그인 시간, 화면 응답, 영향을 받은 사용자와 발생 시간 |
| 게스트 OS | CPU 사용률, 메모리와 프로세스별 자원 소비 |
| 하이퍼바이저 | CPU Ready, VM의 CPU 제한과 호스트 경합 |
| 지원 인프라 | 인증, 프로파일, 네트워크와 스토리지의 지연 |

Horizon 로그인은 인증, 프로파일 로딩, 그룹 정책과 스크립트 등 세부 단계로 나눠 볼 수 있다. eG Enterprise의 해당 검사에는 VM의 Horizon Logon Monitor 서비스 같은 수집 전제가 있으므로 값이 없을 때 지연이 없다고 해석하지 않는다.

## CPU Ready와 게스트 CPU는 다른 값이다

CPU Ready는 vCPU가 실행할 준비가 됐지만 물리 CPU에서 실행되지 못한 대기를 나타낸다. 게스트 CPU 사용률과 함께 높다는 사실만으로 VM 내부의 vCPU 부족을 확정할 수 없다.

호스트 경합뿐 아니라 VM에 설정한 CPU 제한도 확인한다. Broadcom의 ESXi 8.x 사례에서는 호스트 전체 사용률이 낮아도 CPU 제한 때문에 높은 Ready와 네트워크 지연이 발생할 수 있다. 자원을 추가하기 전에 제한 설정, 호스트 상황과 게스트 프로세스의 소비를 함께 본다.

eG Enterprise의 게스트 OS 검사는 CPU 소비가 큰 프로세스를 상세 진단할 수 있다. 다만 순간적인 CPU 스파이크는 메트릭에 나타나도 상세 진단 목록에는 잡히지 않을 수 있다. 프로세스 목록에 없다는 이유로 순간 부하를 배제하지 않는다.

## 조사 순서

1. 느린 동작과 시간 범위를 고정한다.
2. 같은 시간의 세션, 게스트, 호스트와 지원 인프라 신호를 맞춘다.
3. 한 사용자만 영향을 받는지, 같은 호스트나 프로파일 경로의 여러 사용자가 함께 느린지 비교한다.
4. 의심 구간의 설정과 변경 이력을 확인하고, 한 원인 가설을 조치 전후의 같은 지표로 검증한다.

이 순서는 조사용 점검 절차다. 상관관계나 자동 진단의 원인 후보가 인과관계의 증명은 아니다. 제품 도입에 따른 비용 절감률이나 모든 장애의 자동 분석을 보장하지 않는다.

## 출처

- [eG Innovations, Horizon User Logon Details - OS Test](https://docs.eginnovations.com/Omnissa-Horizon-Desktop-Group/Horizon-User-Logon-Details-OS-Test.htm)
- [eG Innovations, System Details - OS Test](https://docs.eginnovations.com/Omnissa-Horizon-Desktop-Group/System-Details-OS-Test.htm)
- [High Network Latency and CPU Ready Time on Virtual Appliances with CPU Limits — Broadcom](https://knowledge.broadcom.com/external/article/456240/high-network-latency-and-cpu-ready-time.html)
- [Understanding CPU Usage (%) in Aria Operations/VMware environments — Broadcom](https://knowledge.broadcom.com/external/article/409319/understanding-cpu-usage-in-aria-operati.html) — CPU Ready의 측정 의미

## 관련 문서

- [[Metric-Layer-Mismatch|메트릭 측정 레이어의 함정]]
- [[RED-USE-Method|RED와 USE 방법]]
- [[Network-Separation|망분리와 망연계]]
