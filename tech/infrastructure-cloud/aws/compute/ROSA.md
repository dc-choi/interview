---
tags: [infrastructure, aws, openshift, kubernetes, managed-service]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["ROSA", "Red Hat OpenShift Service on AWS"]
---

# ROSA의 배치 구조와 운영 책임

Red Hat OpenShift Service on AWS(ROSA)는 AWS와 Red Hat이 제공하는 관리형 OpenShift 서비스다. 플랫폼을 관리받아도 애플리케이션과 데이터의 운영 책임은 고객에게 남는다. 아래 구조와 책임은 2026-10-07 공식 문서 기준이다.

## HCP와 Classic

| 구분 | Hosted Control Plane(HCP) | Classic |
| --- | --- | --- |
| Control plane | Red Hat의 AWS 계정에 배치 | 고객 AWS 계정에 배치 |
| Worker node | 고객 AWS 계정에 배치 | 고객 AWS 계정에 배치 |
| 연결 | Worker와 control plane 사이에 AWS PrivateLink 사용 | Worker와 control plane을 고객 VPC에 배치 |
| 플랫폼 구성요소 | 모니터링, 이미지 레지스트리와 ingress controller를 worker에 배치 | 전용 infrastructure node에 배치 |
| 업그레이드 단위 | Control plane과 각 machine pool을 별도로 갱신 가능 | 전체 클러스터를 함께 갱신 |

Control plane의 위치와 운영 주체를 구분한다. Classic이 고객 계정에 있다는 이유로 고객이 모든 플랫폼 관리를 맡는 것은 아니다.

## 고객에게 남는 작업

AWS는 기반 인프라를, Red Hat은 ROSA 플랫폼 운영을 맡는다. 세부 책임은 구성요소와 작업에 따라 공유된다.

- **애플리케이션과 데이터**: 배포, 접근 통제, 보안, 백업과 복구를 고객이 책임진다.
- **변경 관리**: 고객이 업그레이드 일정을 정하고 지원 버전을 유지하며 애플리케이션 호환성을 시험한다.
- **용량**: 고객이 worker 사용량을 관찰하고 확장 전략, autoscaling과 machine pool 크기를 정한다.
- **선택 구성**: 추가 네트워크 연결, 사용자 지정 네트워크 정책과 선택한 애플리케이션 로깅 구성을 고객이 관리한다.

플랫폼 모니터링과 애플리케이션 정상 동작도 별개다. 고객은 애플리케이션 route와 그 뒤 endpoint의 상태를 확인해야 한다.

## OpenShift AI와 GPU 준비 상태

2026-10-10 Red Hat 지원 구성표는 OpenShift AI Self-Managed의 대상에 ROSA HCP와 Classic을 포함한다. ROSA 클러스터의 준비와 OpenShift AI 구성, 모델 실행 준비를 각각 확인한다. 사용할 OpenShift AI와 OpenShift 버전의 조합은 지원표에서 대조한다.

NVIDIA GPU를 사용하는 경우에는 EC2 GPU 노드가 생성됐다는 사실만으로 모델이 GPU를 사용할 수 있다고 판단하지 않는다. Red Hat의 ROSA 안내는 다음 단계를 구분한다.

1. 대상 리전과 가용 영역의 GPU 인스턴스 quota와 용량을 확인한다.
2. GPU machine pool을 만들고 노드 등록을 확인한다.
3. Node Feature Discovery와 NVIDIA GPU Operator를 구성하고 GPU 자원의 노출을 확인한다.
4. 테스트 Pod에서 GPU와 드라이버 동작을 확인한 뒤 OpenShift AI의 hardware profile과 workbench를 검증한다.

이 순서는 해당 NVIDIA 구성의 점검 흐름이며 모든 가속기와 버전에 공통인 설치 명령은 아니다. 일반 worker의 여유 자원도 확인한다. GPU 노드가 있어도 OpenShift AI 구성요소가 스케줄링되지 않으면 대시보드가 준비되지 않을 수 있다. 마지막으로 실제 추론 요청을 보내 응답을 확인하는 것은 별도의 애플리케이션 검증이다.

## 도입 검토

다음은 책임 분담에서 도출한 검토 항목이다.

1. 기존 OpenShift 구성 중 기본 제공 범위와 선택 Operator를 구분한다.
2. 애플리케이션 업그레이드 시험, 데이터 복구 시험과 장애 대응 담당자를 정한다.
3. HCP의 플랫폼 구성요소도 worker 자원을 사용하므로 업무 workload와 함께 용량을 산정한다.

관리형이라는 이유로 추가 구성이나 운영 인력이 불필요하다고 가정하지 않는다. 구매 할인과 지원 계약은 실제 제안서에서 별도로 확인한다.

## 출처

- [Red Hat, Red Hat OpenShift AI: Supported Configurations](https://access.redhat.com/articles/rhoai-supported-configs)
- [Red Hat Cloud Experts, ROSA with NVIDIA GPU workloads and OpenShift AI](https://cloud.redhat.com/experts/rosa/gpu/) — 2026-10-10 지원 대상과 GPU 준비 단계만 부분 대조했다. 실제 클러스터 배포와 추론은 시험하지 않았다.
- [AWS ROSA, ROSA architecture](https://docs.aws.amazon.com/rosa/latest/userguide/rosa-architecture-models.html)
- [AWS ROSA, Overview of responsibilities for ROSA](https://docs.aws.amazon.com/rosa/latest/userguide/rosa-responsibilities.html)
- [ROSA service definition: Cluster backup policy — Red Hat OpenShift Documentation](https://github.com/openshift/openshift-docs/blob/main/modules/rosa-sdpolicy-platform.adoc)

## 관련 문서

- [[EKS|AWS의 관리형 Kubernetes]]
- [[Cloud-Service-Models|서비스 계층과 운영 책임]]
