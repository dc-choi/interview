---
tags: [aws, eks, windows, container, networking]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["EKS Windows 노드", "Windows 컨테이너의 EKS 운영"]
---

# EKS Windows 노드의 배치와 IP 용량

EKS에서는 Linux와 Windows 컨테이너를 같은 클러스터의 서로 다른 OS 노드에서 운영할 수 있다. Windows 애플리케이션을 컨테이너로 옮길 때는 Linux 노드의 지원 기능과 Pod 밀도 계산을 그대로 적용하지 않는다.

## 배치 전에 확인할 지원 경계

2026-10-07 EKS 공식 문서 기준이다.

| 항목 | Windows 노드에서 확인할 조건 |
|---|---|
| 시스템 Pod | CoreDNS처럼 Linux에서 실행되는 구성 요소를 위해 Linux 노드 또는 Linux용 Fargate 실행 환경을 함께 둔다 |
| 실행 방식 | Windows 컨테이너는 EKS Fargate와 EKS Auto Mode에서 지원하지 않는다 |
| 스케줄링 | 혼합 OS 클러스터에서는 `kubernetes.io/os` node selector로 Linux와 Windows workload를 구분한다 |
| 네트워크 | Windows 노드는 ENI 하나를 지원한다. IPv6, custom networking과 Pod별 security group은 지원하지 않는다 |
| IP 관리 | 클러스터 역할의 VPC Resource Controller 권한과 `enable-windows-ipam` 설정을 확인한다 |

일반적인 [[EKS|EKS 개요]]의 IRSA, Pod Identity나 스토리지 선택지도 Windows 지원 여부를 별도로 확인한 뒤 적용한다.

## IP 수와 실제 Pod 수를 구분한다

Secondary IP 모드에서는 인스턴스의 ENI당 IPv4 주소 한도에서 노드 기본 주소 하나를 뺀 만큼 Pod용 주소를 사용할 수 있다. Prefix Delegation은 남은 슬롯마다 `/28` prefix를 할당한다.

AWS의 `c5.large` 예시에서 ENI 주소 슬롯은 10개다. 기본 주소를 제외한 9개 슬롯을 사용하면 secondary IP는 9개, prefix는 최대 144개 주소를 제공한다. 이 수치는 주소 용량이며 실제 Pod 144개 실행을 보장하지 않는다.

실제 배치 상한은 IP 용량, kubelet의 `max-pods`, CPU와 메모리 등에서 함께 결정된다. Windows의 기본 `max-pods`는 110이며, 주소가 늘어도 이 설정과 workload 리소스 요구량을 별도로 확인해야 한다.

## Prefix 전환의 운영 조건

- 서브넷에는 연속된 `/28` 주소 블록이 필요하다. 남은 IP 총수가 충분해도 단편화되면 prefix 할당이 실패할 수 있다.
- warm pool은 Pod 시작을 앞당기지만 사용 전부터 주소를 확보한다. 여유 IP와 시작 지연을 함께 보고 크기를 조정한다.
- secondary IP와 prefix 모드를 바꿀 때는 기존 Pod가 남아 혼합된 상태의 주소 용량을 과신하지 않는다. 새 노드 그룹과 drain을 포함한 전환 절차를 따른다.

도입 검증에서는 이미지 준비부터 Pod 준비 완료까지의 시간, DNS와 서비스 연결, 세션 종료 및 재접속을 실제 workload로 확인한다. 이 항목들은 운영 검토 제안이며 관리형 컨트롤 플레인이 애플리케이션 전환 성공을 보장한다는 뜻은 아니다.

## 출처

- [Amazon EKS, Deploy Windows nodes on EKS clusters](https://docs.aws.amazon.com/eks/latest/userguide/windows-support.html)
- [Amazon EKS Best Practices Guide, Prefix Mode for Windows](https://docs.aws.amazon.com/eks/latest/best-practices/prefix-mode-win.html)

## 관련 문서

- [[EKS|EKS 개요]]
- [[K8s-Resource-Right-Sizing|Pod 리소스와 배치 용량]]
- [[K8s-PDB|자발적 중단과 PDB]]
