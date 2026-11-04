---
tags: [infrastructure, virtualization, vm, hypervisor]
status: done
verified_at: 2026-11-04
category: "Infrastructure - 클라우드 기초"
aliases: ["Virtual Machines and Hypervisors", "가상 머신과 하이퍼바이저", "서버 가상화 기초"]
---

# 가상 머신과 하이퍼바이저

서버 가상화는 물리 호스트의 자원을 여러 가상 머신(VM)에 나누어 제공한다. 각 VM에는 게스트 운영체제와 애플리케이션이 있고, 하이퍼바이저는 자원 할당과 실행 격리를 담당한다. 서버 통합으로 자원 활용도를 높일 수 있지만 물리 용량과 공통 장애 지점은 남는다.

## 가상 자원과 물리 자원은 다르다

게스트에는 가상 CPU, 메모리와 장치가 보인다. 실제 CPU, 메모리와 I/O 자원으로 이어지는 경로는 하이퍼바이저와 가상화 스택이 관리한다. 예를 들어 Hyper-V의 자식 파티션은 가상 장치 요청을 VMBus나 하이퍼바이저를 통해 부모 파티션의 장치로 전달한다.

vCPU 수는 물리 코어의 추가 생산량이 아니다. CPU overcommit은 여러 게스트가 물리 CPU 시간을 나눠 쓰게 하지만, 동시에 부하가 높아지면 필요한 CPU 시간을 얻지 못한다. RHEL 7 Virtualization Deployment and Administration Guide는 부하가 100%에 가까워지면 요청 유실이나 쓸 수 없는 수준의 응답 지연이 생길 수 있고, overcommit 비율이 워크로드에 달려 있으므로 충분한 시험 없이 운영 환경에서 overcommit하지 말라고 안내한다. 그 문서의 특정 비율을 다른 버전과 워크로드의 안전한 기본값으로 옮기지 않는다.

운영 제안: 평균 CPU 사용률뿐 아니라 동시 피크, 메모리 여유와 저장장치 부하를 함께 측정한다. VM 수와 할당 vCPU 합계만으로 수용량을 판정하지 않는다. 호스트 경합은 하이퍼바이저 계층의 CPU Ready([[VDI-Performance-Diagnosis|VDI 성능 진단]])와 게스트 OS가 보고하는 steal 시간([[Metric-Layer-Mismatch|메트릭 측정 레이어의 함정]])을 구분해 함께 본다. CPU Ready는 VM의 CPU 제한으로도 높아지므로 제한 설정도 함께 확인한다.

## Type 1과 Type 2는 실행 계층으로 구분한다

| 구분 | 하드웨어와의 관계 | 공식 설명의 특성 |
|---|---|---|
| Type 1, bare-metal | 하이퍼바이저가 하드웨어 자원을 직접 관리 | 효율, 확장성과 유연성 때문에 기업용 클라우드 데이터센터에서 쓰이지만 설치와 관리가 복잡하다 |
| Type 2, hosted | 호스트 OS 위의 프로그램으로 실행 | 데스크톱 프로그램처럼 설치가 쉽지만 호스트 OS를 거치는 지연이 더해지고 호스트 OS의 안정성에 영향을 받는다 |

Windows 관리 화면이 보인다는 이유만으로 Hyper-V를 Type 2라고 판정하지 않는다. Hyper-V에서는 하이퍼바이저가 프로세서, 인터럽트와 파티션 격리를 맡고, 물리 메모리와 장치에 직접 접근하는 파티션은 관리 스택이 있는 부모 파티션이다. 화면보다 실제 실행 구조를 확인한다.

분류만으로 제품별 성능과 안전성의 우열을 확정하지 않는다. AWS는 KVM을 Type 1에 가까운 하이브리드 하이퍼바이저로 설명한다. 커널과 가상화 기능이 결합한 구현은 단순한 두 계층 그림만으로 설명하기 어렵다.

## 실행 격리와 가용성을 나눈다

게스트를 별도 실행 환경으로 두어도 같은 물리 호스트나 하이퍼바이저의 문제는 여러 VM에 영향을 줄 수 있다. VM별 격리를 물리 장애의 독립성으로 해석하지 않는다.

| 기능 | 목적 | 남는 확인 |
|---|---|---|
| 라이브 마이그레이션 | 실행 중 VM을 다른 호스트로 옮겨 계획된 점검을 돕는다 | 대상 호스트와 네트워크 등 구성 조건, 애플리케이션에서 관측한 영향 |
| 장애 조치 클러스터 | 노드 장애 때 다른 노드가 역할을 인계한다 | 장애 감지, VM 재시작과 애플리케이션 복구에 필요한 시간 |
| 백업과 복원 | 손실된 데이터와 환경을 복구한다 | 복구 시점, 데이터 일관성과 실제 복원 가능성 |

Hyper-V 라이브 마이그레이션은 실행 중 VM의 호스트 이동 기능이며, Failover Clustering 없이 구성하는 경로도 있다. 이 경로에서는 호스트가 같은 Active Directory 도메인 또는 서로 신뢰하는 도메인에 속해야 하고, 인증 방식으로 Kerberos 제한 위임이나 CredSSP를 정해야 한다. Windows Server 2025부터는 요건을 충족하고 Credential Guard를 미리 끄지 않은 도메인 가입 서버(도메인 컨트롤러 제외)에서 Credential Guard가 기본으로 켜진다. 원본 호스트에서 Credential Guard가 켜진 채 CredSSP 위임을 쓰면 이동이 실패하므로 Kerberos 제한 위임을 쓴다. 이동 트래픽은 암호화되지 않으므로 신뢰하는 네트워크로 분리한다. 호스트가 이미 고장난 뒤 VM을 다시 시작하는 복구와 같지 않다. 설정 문서는 중단을 최소화한다고, 개요 문서는 체감되는 중단 없이 옮긴다고 설명한다. 둘 다 애플리케이션이 겪는 영향을 수치로 보장하지 않으므로 중단 여부와 시간은 실제 서비스에서 검증한다는 운영 기준을 둔다.

## VMware 스냅샷은 독립 백업이 아니다

2026-11-04 확인한 Broadcom의 vSphere ESXi 8.x/ESX 9.x 및 vCenter Server 8.x/9.x 안내에서 스냅샷 파일은 원본 가상 디스크의 변경 기록이며, 스냅샷을 만든 뒤의 변경을 delta 디스크에 저장한다. 원본 디스크가 삭제되면 스냅샷 파일만으로 VM을 복구할 수 없다.

같은 안내는 단일 스냅샷을 72시간 넘게 유지하지 말라고 권고한다. 오래 남길수록 변경 파일이 커져 공간과 성능에 영향을 줄 수 있기 때문이다. 이 시간을 모든 클라우드 스냅샷의 공통 제한으로 일반화하지 않는다. 백업 도구가 만든 스냅샷도 백업 완료 후 정리 여부를 확인한다. 스냅샷 종류별로 백업으로 볼 수 있는지는 [[Backup-Restore|백업과 복원]]의 구분을 따른다.

## 이해 확인과 검증 범위

- VM 네 대에 각각 vCPU를 늘려도 물리 호스트의 처리 능력이 그대로인 이유는 무엇인가?
- 실행 중 이동, 장애 후 재시작과 백업 복원을 어떤 실패 상황에서 각각 사용하는가?
- VMware의 변경 스냅샷만 남겼을 때 원본 디스크 손실을 복구할 수 없는 이유는 무엇인가?

공식 개념 설명과 제품 운영 문서를 대조했다. 실제 VM 생성, 장애 조치와 복원 시험은 수행하지 않았다.

## 출처

- [What is a Hypervisor? — AWS](https://aws.amazon.com/what-is/hypervisor/) — 자원 할당, Type 1/2와 KVM 분류, 공유 하이퍼바이저의 영향 범위.
- [Microsoft Learn, Hyper-V Architecture](https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/architecture) — 파티션, 물리 장치 접근과 가상 장치 경로.
- [Red Hat Enterprise Linux 7, Overcommitting Virtualized CPUs](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/virtualization_deployment_and_administration_guide/sect-overcommitting_with_kvm-overcommitting_virtualized_cpus) — CPU 시간 공유, 높은 부하의 영향과 운영 전 시험. 과거 버전의 비율 권고는 일반화하지 않았다.
- [Microsoft Learn, Live Migration Overview](https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/manage/live-migration-overview)
- [Microsoft Learn, Set up hosts for live migration without Failover Clustering](https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/deploy/set-up-hosts-for-live-migration-without-failover-clustering) — 도메인과 인증 조건, Windows Server 2025의 CredSSP 제한, 이동 네트워크.
- [Microsoft Learn, Credential Guard considerations and known issues](https://learn.microsoft.com/en-us/windows/security/identity-protection/credential-guard/considerations-known-issues) — 원본 호스트의 Credential Guard와 CredSSP 위임에 따른 라이브 마이그레이션 실패 조건.
- [Microsoft Learn, Credential Guard overview](https://learn.microsoft.com/en-us/windows/security/identity-protection/credential-guard/) — Windows Server 2025의 기본 활성화 조건.
- [Microsoft Learn, Failover Clustering](https://learn.microsoft.com/en-us/windows-server/failover-clustering/failover-clustering-overview)
- [Broadcom, Best practices for using VMware snapshots in the vSphere environment](https://knowledge.broadcom.com/external/article/318825/best-practices-for-using-vmware-snapshots.html)
- [YouTube, 동국시스템즈 IT 채널, 가상화란? 서버 한 대가 여러 대가 되는 원리](https://www.youtube.com/watch?v=A6dsy9CTvII) — 2026-10-27 공개(전사 메타데이터 기준) 강의로 이 문서의 계기다. 서버 사용률, 서버 통합 비율과 이동 정지 시간 수치는 일반 기준값으로 채택하지 않았다.

## 관련 문서

- [[Cloud-Service-Models|클라우드 서비스 모델과 운영 책임]]
- [[EC2-Compute|EC2 컴퓨트와 Nitro]]
- [[DR-Strategy|재해복구 전략]]
- [[Backup-Restore|백업과 복원]]
- [[VM-Guest-to-Host-Escape|VM 격리와 게스트 탈출]]
- [[VDI-Performance-Diagnosis|VDI 성능 진단]]
