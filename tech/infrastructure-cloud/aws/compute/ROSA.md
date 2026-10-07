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

## 도입 검토

다음은 책임 분담에서 도출한 검토 항목이다.

1. 기존 OpenShift 구성 중 기본 제공 범위와 선택 Operator를 구분한다.
2. 애플리케이션 업그레이드 시험, 데이터 복구 시험과 장애 대응 담당자를 정한다.
3. HCP의 플랫폼 구성요소도 worker 자원을 사용하므로 업무 workload와 함께 용량을 산정한다.

관리형이라는 이유로 추가 구성이나 운영 인력이 불필요하다고 가정하지 않는다. 구매 할인과 지원 계약은 실제 제안서에서 별도로 확인한다.

## 출처

- [AWS ROSA, ROSA architecture](https://docs.aws.amazon.com/rosa/latest/userguide/rosa-architecture-models.html)
- [AWS ROSA, Overview of responsibilities for ROSA](https://docs.aws.amazon.com/rosa/latest/userguide/rosa-responsibilities.html)
- [ROSA service definition: Cluster backup policy — Red Hat OpenShift Documentation](https://github.com/openshift/openshift-docs/blob/main/modules/rosa-sdpolicy-platform.adoc)

## 관련 문서

- [[EKS|AWS의 관리형 Kubernetes]]
- [[Cloud-Service-Models|서비스 계층과 운영 책임]]
