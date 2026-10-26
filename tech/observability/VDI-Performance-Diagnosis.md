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

## WorkSpaces에서는 접속, 왕복 지연과 자원 소비를 나눈다

2026-10-14 AWS 관리 가이드 대조 기준, `AWS/WorkSpaces`의 지표는 다음처럼 구분한다. 아래 점검은 WorkSpaces에 적용하며 ESXi의 CPU Ready 값을 대신하는 지표 목록은 아니다.

| 지표 | 측정 범위와 해석 |
|---|---|
| `SessionLaunchTime` | 세션을 시작하는 데 걸린 시간, 초 단위 |
| `InSessionLatency` | 클라이언트와 WorkSpace 사이의 왕복 시간, 밀리초 단위 |
| `CPUUsage`, `MemoryUsage` | WorkSpace의 CPU와 메모리 사용 비율 |
| `UDPPacketLossRate` | PCoIP는 클라이언트에서 게이트웨이 방향, DCV는 게이트웨이에서 클라이언트 방향의 손실률 |

`ConnectionAttempt`, `ConnectionSuccess`, `ConnectionFailure`와 `SessionLaunchTime`은 클라이언트 인증 성공 뒤 세션 연결을 시작할 때 발행된다. 이 값이 없다는 사실만으로 인증 이전 단계까지 정상이라고 판단하지 않는다.

조사 적용 예시: 같은 `WorkspaceId`와 시간 구간에서 왕복 지연과 자원 사용률을 비교한다. CPU 사용률이 낮아도 세션 왕복 지연이 높을 수 있으므로 컴퓨트 증설을 바로 결론 내리지 않는다. 프로토콜을 바꿔 비교할 때는 UDP 손실률의 측정 방향도 바뀐다는 점을 기록한다.

## 스토리지 비교에서는 용량과 동시 부하를 분리한다

2026-10-21 공식 문서 대조 기준이다. VDI의 스토리지를 비교할 때 VM에 할당한 논리 용량, 실제 사용량, 클러스터의 raw 물리 용량과 보호 정책을 반영한 usable 용량을 구분한다.

Broadcom의 VVF Trial Capacity 안내는 vSAN이 확보한 raw 물리 용량을 기준으로 삼으며 VM이 실제로 사용한 양과는 별개라고 설명한다. 해당 안내의 코어당 100GiB 조건은 사용자당 저장 공간이 아니다. 초과 시에는 초과분만이 아니라 클러스터 전체 용량에 맞는 라이선스를 요구한다고 명시한다. 이 Trial Capacity 조건을 모든 Horizon 번들이나 vSAN 계약에 적용하지 않고 실제 구독과 라이선스 키를 확인한다.

vSAN ESA 9.1의 effective capacity 설명에서 usable 용량은 시스템 예약과 RAID 중복 오버헤드를 제외한다. 같은 raw 용량인 장비라도 보호 정책과 예약 공간이 다르면 사용자 데이터에 쓸 수 있는 양이 달라진다. 이 용량 지표를 모든 vSAN 버전의 동일한 UI 항목으로 가정하지 않는다.

Omnissa의 Horizon 8 설계 문서는 여러 VM이 동시에 작업하는 I/O storm을 별도로 다룬다. **비교 시험 제안**: 같은 데스크톱 이미지, 동시 사용자 수와 보호 정책을 맞추고 평상시와 동시 시작 부하를 나눠 세션 시작 시간, 저장장치 지연과 처리량을 기록한다. 재구축이나 장애 복구 중의 조건도 별도 시험으로 남긴다. 가격 비율이나 VM 수 하나만으로 성능과 운영 안정성을 판정하지 않는다.

### 스토리지 교체 효과는 시험 조건과 백분위로 확인한다

2026-10-27 Microsoft DiskSpd 문서 대조 기준이다. 같은 VM과 하드웨어를 써도 I/O 크기, 읽기와 쓰기 비율, 동시 요청 수와 캐시 조건이 다르면 결과를 직접 비교하기 어렵다.

| 기록할 조건 | DiskSpd에서 확인할 항목 |
|---|---|
| I/O 패턴 | `-b`의 블록 크기, `-r`의 임의 접근, `-w`의 쓰기 비율 |
| 동시 부하 | `-t`의 대상별 스레드 수, `-o`의 대상별 스레드당 미완료 요청 수 |
| 측정 시간 | `-W`의 준비 구간과 `-d`의 측정 구간을 구분 |
| 캐시와 쓰기 완료 조건 | `-S` 계열 옵션, 소프트웨어 캐시와 write-through 여부 |

`-L`은 지연 통계를 수집하고 읽기, 쓰기와 전체의 백분위 결과를 제공한다. 처리량, 평균 지연과 P99는 따로 기록한다. P99는 측정 I/O의 99%가 그 값 이하라는 의미이며, 처리량 개선 배수를 P99 개선 배수로 바꿔 쓰지 않는다. 표본이 적으면 높은 백분위가 최댓값과 같아질 수 있으므로 측정 시간과 I/O 수를 함께 남긴다. `-Rxml` 결과에는 시험 설정과 시스템 정보도 포함된다.

**적용 제안**: 교체 전후의 같은 시험 설정과 결과를 보존하고, 별도로 다중 사용자 로그인과 업무 동작을 비교한다. DiskSpd의 합성 I/O 결과만으로 전체 VDI 사용자 경험이나 특정 제품의 우위를 확정하지 않는다. 쓰기 시험은 기존 데이터를 덮어쓸 수 있으므로 폐기 가능한 전용 시험 파일과 볼륨에서 수행한다.

이번 추가 대조는 시험 조건과 결과 해석에 한정한다. 특정 구축 사례의 성능 배수, 계약 비용, 이전 기간과 제품 호환성을 검증한 기록은 아니며 기존 `verified_at`을 유지한다.

### 교체한 계층을 비교 기록에 남긴다

부분 검증(2026-10-27): Horizon을 유지하는 전환에서도 스토리지만 교체한 구성과 하이퍼바이저까지 바꾼 구성은 비교 범위가 다르다. Arcfra의 공개 제품 구성에서는 VDI Essential이 기존 ESXi 아래의 스토리지를 교체하는 경로이고, VDI Standard는 AVE와 Block Storage를 함께 제공하는 경로다. 이 구분을 모든 에디션이나 버전의 호환성 보장으로 확대하지 않는다.

**비교 시험 제안**: 변경 전후의 Horizon, 하이퍼바이저, 스토리지 버전과 관리 포털의 연동 경로를 기록한다. ESXi를 유지한 스토리지 시험 결과를 AVE까지 교체한 환경의 성능 증거로 쓰지 않는다. 동일 조건의 스토리지 I/O 외에도 로그인, 데스크톱 생성, 재접속과 장애 복구를 따로 측정한다.

공급사의 인증 발표는 특정 구축 환경의 무중단 이전이나 성능 배수를 입증하지 않는다. 실제 버전 조합의 호환성 항목과 지원 범위, 장애 접수 경로를 확인한 뒤 전환 시험에 반영한다. 이번 대조는 공개 구성 선택지에 한정하며 개별 인증 버전, 계약 비용과 구축 사례의 성능은 검증하지 않았다. 기존 `verified_at`은 유지한다.

## 조사 순서

1. 느린 동작과 시간 범위를 고정한다.
2. 같은 시간의 세션, 게스트, 호스트와 지원 인프라 신호를 맞춘다.
3. 한 사용자만 영향을 받는지, 같은 호스트나 프로파일 경로의 여러 사용자가 함께 느린지 비교한다.
4. 의심 구간의 설정과 변경 이력을 확인하고, 한 원인 가설을 조치 전후의 같은 지표로 검증한다.

이 순서는 조사용 점검 절차다. 상관관계나 자동 진단의 원인 후보가 인과관계의 증명은 아니다. 제품 도입에 따른 비용 절감률이나 모든 장애의 자동 분석을 보장하지 않는다.

## 출처

- [Modernize the Infrastructure Under Omnissa Horizon - Now Fully Certified — Arcfra](https://www.arcfra.com/blog/arcfra_virtualization_engine_certified_omnissa_horizon) — 2026-10-27 VDI Essential과 Standard의 교체 계층 구분 대조. 인증 세부 조합과 성능, 비용 수치는 채택하지 않음.
- [Microsoft DiskSpd, Command line and parameters](https://github.com/microsoft/diskspd/wiki/Command-line-and-parameters) — 2026-10-27 시험 옵션 대조
- [Microsoft DiskSpd, Customizing tests](https://github.com/microsoft/diskspd/wiki/Customizing-tests) — 측정 구간, 캐시와 쓰기 시험 주의사항
- [Microsoft DiskSpd, Analyzing test results](https://github.com/microsoft/diskspd/wiki/Analyzing-test-results) — 지연 백분위, 표본 수와 XML 결과
- [Broadcom, vSAN license alarm 'vSAN Cluster Claimed Capacity Exceeds Entitlement'](https://knowledge.broadcom.com/external/article/326663/vsan-license-alarm-vsan-cluster-claimed.html) — 2026-10-21 Trial Capacity의 raw 용량 기준과 초과 시 적용 범위 대조
- [Broadcom, vSAN space reporting feature overview](https://knowledge.broadcom.com/external/article/315553) — vSAN ESA 9.1의 usable 용량 정의
- [Omnissa, Storage Bandwidth Considerations](https://docs.omnissa.com/HorizonOverviewDeployment/StorageBandwidthConsiderations) — 동시 I/O 부하. 기존 CPU와 세션 지표 절의 확인일은 유지한다.
- [AWS, Monitor your WorkSpaces using CloudWatch metrics](https://docs.aws.amazon.com/workspaces/latest/adminguide/cloudwatch-metrics.html) — 2026-10-14 WorkSpaces 절만 추가 대조, 기존 Horizon과 ESXi 절의 검증일은 유지
- [eG Innovations, Horizon User Logon Details - OS Test](https://docs.eginnovations.com/Omnissa-Horizon-Desktop-Group/Horizon-User-Logon-Details-OS-Test.htm)
- [eG Innovations, System Details - OS Test](https://docs.eginnovations.com/Omnissa-Horizon-Desktop-Group/System-Details-OS-Test.htm)
- [High Network Latency and CPU Ready Time on Virtual Appliances with CPU Limits — Broadcom](https://knowledge.broadcom.com/external/article/456240/high-network-latency-and-cpu-ready-time.html)
- [Understanding CPU Usage (%) in Aria Operations/VMware environments — Broadcom](https://knowledge.broadcom.com/external/article/409319/understanding-cpu-usage-in-aria-operati.html) — CPU Ready의 측정 의미

## 관련 문서

- [[Metric-Layer-Mismatch|메트릭 측정 레이어의 함정]]
- [[RED-USE-Method|RED와 USE 방법]]
- [[Network-Separation|망분리와 망연계]]
